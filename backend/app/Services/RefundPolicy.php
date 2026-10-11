<?php

namespace App\Services;

use App\Models\Paiement;
use App\Models\Reservation;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Politique d'annulation et de remboursement, en un seul endroit.
 *
 * Etait dupliquee entre ReservationController (backend) et Profil.jsx
 * (frontend) : le client voyait un montant different de celui applique.
 * Le backend fait foi ; le frontend n'affiche qu'une estimation.
 */
class RefundPolicy
{
    public const GRATUIT_HEURES = 48;
    public const PARTIEL_HEURES = 24;
    public const TAUX_PARTIEL = 0.50;

    public const LIBELLE_GRATUIT = 'Annulation gratuite - Remboursement integral de l\'acompte';
    public const LIBELLE_PARTIEL = 'Annulation partielle - Remboursement de 50% de l\'acompte';
    public const LIBELLE_TARDIF = 'Annulation tardive - Acompte non remboursable';

    /**
     * Nombre d'heures entre maintenant et le debut de la reservation.
     * Positif si la location est encore dans le futur, negatif si elle
     * a deja debute.
     */
    public function heuresAvantDebut(Reservation $reservation): float
    {
        return now()->diffInHours(Carbon::parse($reservation->date_debut), false);
    }

    /**
     * Montant remboursable au titre de la politique.
     *
     * Base sur l'acompte DEJA ENCAISSE (pas l'acompte theorique) : on ne peut
     * pas rembourser ce qui n'a jamais ete percu.
     */
    public function montantRemboursable(Reservation $reservation, ?float $heuresAvant = null): float
    {
        $heures = $heuresAvant ?? $this->heuresAvantDebut($reservation);

        $taux = match (true) {
            $heures >= self::GRATUIT_HEURES => 1.0,
            $heures >= self::PARTIEL_HEURES => self::TAUX_PARTIEL,
            default => 0.0,
        };

        $encaisse = $reservation->acompte_paye;

        return round($encaisse * $taux, 2);
    }

    public function libelle(?float $heuresAvant): string
    {
        return match (true) {
            $heuresAvant >= self::GRATUIT_HEURES => self::LIBELLE_GRATUIT,
            $heuresAvant >= self::PARTIEL_HEURES => self::LIBELLE_PARTIEL,
            default => self::LIBELLE_TARDIF,
        };
    }

    /**
     * Applique l'annulation ET le remboursement correspondant.
     *
     * @param  ?int  $adminId  null pour une annulation client.
     * @return array{montant_rembourse: float, politique: string, remboursement_id: ?int}
     */
    public function annuler(Reservation $reservation, ?string $motif = null, ?int $adminId = null): array
    {
        return DB::transaction(function () use ($reservation, $motif, $adminId) {
            $heures = $this->heuresAvantDebut($reservation);
            $montant = $this->montantRemboursable($reservation, $heures);

            $reservation->update([
                'statut' => 'annulee',
                'montant_rembourse' => $montant,
                'politique_annulation' => $this->libelle($heures),
            ]);

            $remboursementId = null;

            if ($montant > 0) {
                $remboursementId = $this->rembourserAcompte($reservation, $montant, $motif, $adminId);
            }

            return [
                'montant_rembourse' => $montant,
                'politique' => $reservation->politique_annulation,
                'remboursement_id' => $remboursementId,
            ];
        });
    }

    /**
     * Cree l'ecriture de remboursement pour l'acompte encaisse.
     *
     * @return ?int
     */
    private function rembourserAcompte(Reservation $reservation, float $montant, ?string $motif, ?int $adminId): ?int
    {
        // On rembourse l'encaissement le plus ancien non rembourse.
        $source = Paiement::where('reservation_id', $reservation->id)
            ->where('methode', 'cmi')
            ->where('statut', Paiement::STATUT_PAYE)
            ->whereNotNull('date_paiement')
            ->whereNull('rembourse_le')
            ->orderBy('date_paiement')
            ->first();

        $restant = round($montant, 2);
        $dernierId = null;

        // Un remboursement ne depasse jamais l'encaissement d'origine :
        // on rembourse plusieurs encaissements si besoin.
        while ($restant > 0.009 && $source) {
            $disponible = max(0, (float) $source->montant - (float) $source->rembourse_sur);
            $part = round(min($restant, $disponible), 2);

            if ($part <= 0.009) {
                $source = $this->suivant($source);

                continue;
            }

            $remb = Paiement::create([
                'reservation_id' => $reservation->id,
                'montant' => $part,
                'methode' => $source->methode,
                'statut' => Paiement::STATUT_PAYE,
                'type' => Paiement::TYPE_REMBOURSEMENT,
                'gateway' => $source->gateway,
                'devise' => $source->devise ?: 'MAD',
                'date_paiement' => now(),
                'rembourse_le' => now(),
                'paiement_source_id' => $source->id,
                'reference_externe' => $source->transaction_id,
                'note_admin' => $motif,
                'created_by' => $adminId,
            ]);

            $source->update(['rembourse_le' => now()]);
            $dernierId = $remb->id;
            $restant = round($restant - $part, 2);
            $source = $this->suivant($source);
        }

        return $dernierId;
    }

    private function suivant(?Paiement $courant): ?Paiement
    {
        if (! $courant) {
            return null;
        }

        return Paiement::where('reservation_id', $courant->reservation_id)
            ->where('methode', 'cmi')
            ->where('statut', Paiement::STATUT_PAYE)
            ->whereNotNull('date_paiement')
            ->whereNull('rembourse_le')
            ->where('id', '>', $courant->id)
            ->orderBy('id')
            ->first();
    }
}
