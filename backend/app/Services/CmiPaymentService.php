<?php

namespace App\Services;

use App\Models\Paiement;
use App\Models\Reservation;
use App\Services\Cmi\CmiGateway;
use App\Services\Cmi\CmiHttpGateway;
use App\Services\Cmi\CmiSandboxGateway;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Orchestrateur du paiement par carte.
 *
 * Responsabilites (et rien d'autre) :
 *  - idempotence : une meme transaction ne doit aboutir qu'une seule fois ;
 *  - verrous pessimistes sur l'ecriture de paiement ;
 *  - controle du montant annonce par la passerelle contre le montant du au centime ;
 *  - application des statuts et mise a jour coherente de la reservation ;
 *  - journalisation exploitable.
 *
 * L'echange reseau pur est delegue a un CmiGateway (production ou sandbox).
 */
class CmiPaymentService
{
    public function __construct(
        private readonly CmiHttpGateway $httpGateway,
        private readonly CmiSandboxGateway $sandboxGateway,
    ) {}

    public function gateway(): CmiGateway
    {
        return $this->sandboxGateway->mode() === (string) config('cmi.mode')
            ? $this->sandboxGateway
            : $this->httpGateway;
    }

    public function mode(): string
    {
        return $this->gateway()->mode();
    }

    public function isSandbox(): bool
    {
        return $this->mode() === 'sandbox';
    }

    public function isConfigured(): bool
    {
        return $this->gateway()->isConfigured();
    }

    // ------------------------------------------------------------ initiation

    /**
     * Identifiant de transaction imprevisible (pas de timestamp).
     * Un ID derivable permettait de deviner/forger des transactions.
     */
    public function newTransactionId(Reservation $reservation): string
    {
        return 'FBC-'.Str::upper(Str::uuid());
    }

    /**
     * Initie un paiement pour une reservation et persiste l'ecriture
     * 'en_attente' qui portera la transaction.
     *
     * @return array{success:bool, payment_url:?string, transaction_id:?string, iframe_data:?string, error:?string, mode:string}
     */
    public function initialize(Reservation $reservation, ?string $clientIp = null): array
    {
        if (! $this->isConfigured()) {
            return $this->error('La passerelle de paiement n\'est pas configuree.');
        }

        $montant = round((float) $reservation->acompte, 2);

        if ($montant <= 0) {
            return $this->error('Aucun acompte a payer pour cette reservation.');
        }

        // Une seule ecriture 'en_attente' par reservation : on la reutilise
        // si le client retente, sinon on en cree une nouvelle.
        $paiement = DB::transaction(function () use ($reservation, $montant, $clientIp) {
            $pending = Paiement::where('reservation_id', $reservation->id)
                ->where('methode', 'cmi')
                ->enAttente()
                ->latest()
                ->lockForUpdate()
                ->first();

            if ($pending) {
                // On repart d'une transaction neuve, la precedente devient 'expire'
                // pour garder la trace des tentatives.
                $pending->update([
                    'statut' => Paiement::STATUT_EXPIRE,
                    'note_admin' => 'Remplacee par une nouvelle tentative.',
                ]);
            }

            return Paiement::create([
                'reservation_id' => $reservation->id,
                'montant' => $montant,
                'methode' => 'cmi',
                'statut' => Paiement::STATUT_EN_ATTENTE,
                'type' => Paiement::TYPE_ACOMPTE,
                'gateway' => $this->mode(),
                'devise' => 'MAD',
                'transaction_id' => $this->newTransactionId($reservation),
                'idempotency_key' => (string) Str::uuid(),
                'client_ip' => $clientIp,
                'initie_le' => now(),
                'tentatives' => 1,
            ]);
        });

        $result = $this->gateway()->initiate($reservation, $montant, $paiement->transaction_id);

        if (! ($result['success'] ?? false)) {
            $paiement->update([
                'statut' => Paiement::STATUT_ECHOUE,
                'message_erreur' => $result['error'] ?? 'Initialisation refusee.',
            ]);

            return $this->error($result['error'] ?? 'Initialisation refusee par la passerelle.');
        }

        Log::info('Paiement initie', [
            'reservation_id' => $reservation->id,
            'paiement_id' => $paiement->id,
            'transaction_id' => $paiement->transaction_id,
            'montant' => $montant,
            'gateway' => $this->mode(),
        ]);

        return [
            'success' => true,
            'payment_url' => $result['payment_url'],
            'transaction_id' => $paiement->transaction_id,
            'iframe_data' => $result['iframe_data'] ?? null,
            'error' => null,
            'mode' => $this->mode(),
        ];
    }

    // ------------------------------------------------- application de statut

    /**
     * Applique un statut de passerelle a une ecriture de paiement.
     *
     * Garde-fous :
     *  1. si le paiement est deja 'paye', on ne reecrit JAMAIS (anti rejeu) ;
     *  2. si le montant annonce par la passerelle differe du montant du,
     *     on marque 'suspect' et on n'encaisse pas ;
     *  3. toute ecriture se fait sous verrou, dans une transaction DB.
     *
     * @return array{applied:bool, already_paid:bool, status:string, reason:?string}
     */
    public function applyGatewayStatus(
        int $paiementId,
        array $statusResult,
        string $source
    ): array {
        return DB::transaction(function () use ($paiementId, $statusResult, $source) {
            $paiement = Paiement::whereKey($paiementId)->lockForUpdate()->first();

            if (! $paiement) {
                return ['applied' => false, 'already_paid' => false, 'status' => 'unknown', 'reason' => 'not_found'];
            }

            // 1) Idempotence stricte.
            if ($paiement->statut === Paiement::STATUT_PAYE) {
                $paiement->update(['verifie_le' => now()]);

                return [
                    'applied' => false,
                    'already_paid' => true,
                    'status' => 'paid',
                    'reason' => 'already_confirmed',
                ];
            }

            // 2) Verification du montant au centime.
            $gatewayAmount = $statusResult['amount'] ?? null;
            if ($gatewayAmount !== null && abs(round((float) $gatewayAmount, 2) - (float) $paiement->montant) > 0.009) {
                $paiement->update([
                    'statut' => Paiement::STATUT_SUSPECT,
                    'verifie_le' => now(),
                    'code_erreur_gateway' => 'AMOUNT_MISMATCH',
                    'message_erreur' => sprintf(
                        'Montant annonce %.2f MAD mais %.2f MAD attendu (source: %s).',
                        (float) $gatewayAmount,
                        (float) $paiement->montant,
                        $source
                    ),
                ]);

                Log::critical('Paiement suspect : montant divergent', [
                    'paiement_id' => $paiement->id,
                    'transaction_id' => $paiement->transaction_id,
                    'montant_attendu' => $paiement->montant,
                    'montant_annonce' => $gatewayAmount,
                    'source' => $source,
                ]);

                return [
                    'applied' => false,
                    'already_paid' => false,
                    'status' => 'suspect',
                    'reason' => 'amount_mismatch',
                ];
            }

            $paiement->increment('tentatives');
            $paiement->verifie_le = now();

            if ($statusResult['paid'] ?? false) {
                $paiement->statut = Paiement::STATUT_PAYE;
                $paiement->date_paiement = now();
                $paiement->code_erreur_gateway = null;
                $paiement->message_erreur = null;

                if (! empty($statusResult['card_brand'])) {
                    $paiement->carte_marque = $statusResult['card_brand'];
                }
                if (! empty($statusResult['card_last4'])) {
                    $paiement->carte_derniers4 = substr((string) $statusResult['card_last4'], -4);
                }
            } else {
                $paiement->statut = $this->mapFailureStatus($statusResult['status'] ?? null);
                $paiement->code_erreur_gateway = $statusResult['error_code'] ?? null;
                $paiement->message_erreur = $statusResult['error_message'] ?? null;
            }

            $paiement->save();

            $this->syncReservationStatut($paiement);

            Log::info('Statut paiement applique', [
                'paiement_id' => $paiement->id,
                'transaction_id' => $paiement->transaction_id,
                'statut' => $paiement->statut,
                'source' => $source,
            ]);

            return [
                'applied' => true,
                'already_paid' => false,
                'status' => $paiement->statut,
                'reason' => null,
            ];
        });
    }

    /**
     * Interroge la passerelle et applique le resultat.
     * Utilise par le retour navigateur (callback) et par la verification client.
     *
     * @return array{applied:bool, already_paid:bool, status:string, reason:?string, paiement_id?:int}
     */
    public function verifyAndPersist(string $transactionId, string $source = 'callback'): array
    {
        $paiement = Paiement::where('transaction_id', $transactionId)->first();

        if (! $paiement) {
            return ['applied' => false, 'already_paid' => false, 'status' => 'unknown', 'reason' => 'not_found'];
        }

        $statusResult = $this->gateway()->status($transactionId);

        $outcome = $this->applyGatewayStatus($paiement->id, $statusResult, $source);

        return $outcome + ['paiement_id' => $paiement->id];
    }

    // ---------------------------------------------------------------- webhook

    /**
     * Traite un webhook signe de la passerelle.
     *
     * @return array{processed:bool, status:?string, reason:?string}
     */
    public function handleWebhook(array $payload): array
    {
        $transactionId = $payload['order_id'] ?? $payload['transaction_id'] ?? null;
        $status = $payload['status'] ?? null;

        if (! $transactionId) {
            return ['processed' => false, 'status' => null, 'reason' => 'missing_transaction_id'];
        }

        $paiement = Paiement::where('transaction_id', $transactionId)->first();

        if (! $paiement) {
            // Repli historique : ancien format FBC-{numero}-{timestamp}.
            $paiement = $this->resolveLegacy($transactionId);
        }

        if (! $paiement) {
            Log::warning('Webhook sans ecriture correspondante', ['transaction_id' => $transactionId]);

            return ['processed' => false, 'status' => null, 'reason' => 'paiement_not_found'];
        }

        // On reconstruit un resultat de statut a partir du webhook lui-meme.
        $statusResult = [
            'success' => true,
            'status' => $this->normalizeWebhookStatus($status),
            'paid' => in_array($status, ['captured', 'approved', 'paid', 'success'], true),
            'amount' => isset($payload['amount']) ? ((float) $payload['amount'] / 100) : null,
            'card_brand' => $payload['card_brand'] ?? null,
            'card_last4' => $payload['card_last4'] ?? null,
            'error_code' => $payload['error_code'] ?? $payload['response_code'] ?? null,
            'error_message' => $payload['error_message'] ?? $payload['message'] ?? null,
        ];

        $outcome = $this->applyGatewayStatus($paiement->id, $statusResult, 'webhook');

        return [
            'processed' => $outcome['applied'] || $outcome['already_paid'],
            'status' => $outcome['status'],
            'reason' => $outcome['reason'],
        ];
    }

    // ------------------------------------------------------------- remboursement

    /**
     * Enregistre un remboursement.
     *
     * Une ecriture de remboursement est NEGATIVE en comptabilite : on la
     * stocke en positif avec type='remboursement' et on l'additionne en
     * negatif via Paiement::scopeNet().
     */
    public function refund(Paiement $paiement, ?float $montant = null, ?string $note = null, ?int $adminId = null): array
    {
        if ($paiement->statut !== Paiement::STATUT_PAYE) {
            return ['success' => false, 'error' => 'Seul un paiement confirme peut etre rembourse.'];
        }

        if ($paiement->type === Paiement::TYPE_REMBOURSEMENT) {
            return ['success' => false, 'error' => 'Cette ecriture est deja un remboursement.'];
        }

        $montant = round($montant ?? (float) $paiement->montant, 2);

        if ($montant <= 0 || $montant > (float) $paiement->montant) {
            return ['success' => false, 'error' => 'Montant de remboursement invalide.'];
        }

        if ($paiement->gateway === 'cmi' && $paiement->transaction_id) {
            $result = $this->gateway()->refund($paiement->transaction_id, $montant);

            if (! ($result['success'] ?? false)) {
                return ['success' => false, 'error' => $result['error'] ?? 'Remboursement refuse par la passerelle.'];
            }
        } else {
            $result = ['refund_id' => 'MANUAL-'.Str::upper(Str::uuid())];
        }

        $remboursement = DB::transaction(function () use ($paiement, $montant, $note, $adminId, $result) {
            $remb = Paiement::create([
                'reservation_id' => $paiement->reservation_id,
                'montant' => $montant,
                'methode' => $paiement->methode,
                'statut' => Paiement::STATUT_PAYE,
                'type' => Paiement::TYPE_REMBOURSEMENT,
                'gateway' => $paiement->gateway,
                'devise' => $paiement->devise ?: 'MAD',
                'date_paiement' => now(),
                'rembourse_le' => now(),
                'rembourse_transaction_id' => $result['refund_id'] ?? null,
                'paiement_source_id' => $paiement->id,
                'reference_externe' => $paiement->transaction_id,
                'note_admin' => $note,
                'created_by' => $adminId,
            ]);

            // L'encaissement d'origine conserve statut='paye' : c'est
            // l'ecriture de remboursement qui compense. On note juste la date
            // pour le suivi. Le statut "rembourse" / "rembourse_partiel" est
            // derive (Paiement::statut_affichage).
            $paiement->update(['rembourse_le' => now()]);

            return $remb;
        });

        Log::info('Remboursement enregistre', [
            'paiement_id' => $paiement->id,
            'remboursement_id' => $remboursement->id,
            'montant' => $montant,
            'admin_id' => $adminId,
        ]);

        return ['success' => true, 'remboursement_id' => $remboursement->id, 'montant' => $montant];
    }

    // -------------------------------------------------------------- internes

    /**
     * Marque terminee la reservation si tout le prix est couvert.
     */
    private function syncReservationStatut(Paiement $paiement): void
    {
        $reservation = $paiement->reservation;

        if (! $reservation || $paiement->type === Paiement::TYPE_REMBOURSEMENT) {
            return;
        }

        $totalPaye = (float) $reservation->paiements()
            ->payes()
            ->encaissements()
            ->sum('montant');

        if ($totalPaye >= (float) $reservation->prix_total) {
            $reservation->update(['statut' => 'terminee']);
        }
    }

    private function mapFailureStatus(?string $gatewayStatus): string
    {
        return match ($gatewayStatus) {
            'cancelled', 'canceled' => Paiement::STATUT_ANNULE,
            'expired' => Paiement::STATUT_EXPIRE,
            default => Paiement::STATUT_ECHOUE,
        };
    }

    private function normalizeWebhookStatus(?string $status): string
    {
        return match (strtolower((string) $status)) {
            'captured', 'approved', 'paid', 'success' => 'captured',
            'cancelled', 'canceled' => 'cancelled',
            'declined', 'refused', 'rejected', 'failed' => 'failed',
            'expired' => 'expired',
            default => 'unknown',
        };
    }

    /** Ancien format : FBC-{numero}-{timestamp}. */
    private function resolveLegacy(string $transactionId): ?Paiement
    {
        $parts = explode('-', $transactionId);

        if (count($parts) < 3) {
            return null;
        }

        $numero = implode('-', array_slice($parts, 0, 3));

        $reservation = Reservation::where('numero', $numero)->first();

        if (! $reservation) {
            return null;
        }

        return Paiement::where('reservation_id', $reservation->id)
            ->where('methode', 'cmi')
            ->enAttente()
            ->latest()
            ->first();
    }

    private function error(string $message): array
    {
        return [
            'success' => false,
            'payment_url' => null,
            'transaction_id' => null,
            'iframe_data' => null,
            'error' => $message,
            'mode' => $this->mode(),
        ];
    }
}
