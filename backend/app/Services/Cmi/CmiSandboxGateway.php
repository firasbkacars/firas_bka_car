<?php

namespace App\Services\Cmi;

use App\Models\Reservation;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Passerelle simulee : permet de tester l'integralite du parcours de paiement
 * (initiation, page de carte, retour navigateur, webhook, idempotence,
 * verification de montant, remboursement) SANS contrat marchand.
 *
 * Aucune donnee bancaire reelle n'est manipulee. La "page de carte" est une
 * vue locale qui laisse choisir le scenario (autorise, refuse, abandonne,
 * montant divergent...). Le resultat est mis en cache sous la cle
 * cmi:sandbox:{transaction_id}.
 *
 * Actif quand config('cmi.mode') === 'sandbox' (voir config/cmi.php).
 */
class CmiSandboxGateway implements CmiGateway
{
    public const CACHE_PREFIX = 'cmi:sandbox:';

    /** Scenarios proposes sur la page de paiement simulee. */
    public const SCENARIOS = [
        'captured' => ['label' => 'Autorise (capture)', 'status' => 'captured', 'paid' => true],
        'declined' => ['label' => 'Refuse par la banque', 'status' => 'failed', 'paid' => false],
        'cancelled' => ['label' => 'Abandon par le client', 'status' => 'cancelled', 'paid' => false],
        'expired' => ['label' => 'Session expiree', 'status' => 'expired', 'paid' => false],
        'amount_mismatch' => ['label' => 'Autorise mais montant divergent', 'status' => 'captured', 'paid' => true],
    ];

    public function mode(): string
    {
        return 'sandbox';
    }

    public function isConfigured(): bool
    {
        return true;
    }

    public function initiate(Reservation $reservation, float $montant, string $transactionId): array
    {
        // Etat initial : aucun choix effectue.
        Cache::put(self::CACHE_PREFIX.$transactionId, [
            'status' => 'pending',
            'paid' => false,
            'amount' => $montant,
            'card_brand' => null,
            'card_last4' => null,
            'chosen' => null,
        ], now()->addHour());

        return [
            'success' => true,
            'payment_url' => '/paiement/sandbox/'.$transactionId,
            'iframe_data' => null,
            'error' => null,
        ];
    }

    public function status(string $transactionId): array
    {
        $state = Cache::get(self::CACHE_PREFIX.$transactionId);

        if (! is_array($state)) {
            return [
                'success' => false,
                'status' => 'unknown',
                'paid' => false,
                'amount' => null,
                'card_brand' => null,
                'card_last4' => null,
                'error_code' => 'SANDBOX_SESSION_MISSING',
                'error_message' => 'Session de paiement inconnue ou expiree.',
            ];
        }

        return [
            'success' => true,
            'status' => $state['status'],
            'paid' => (bool) $state['paid'],
            'amount' => $state['amount'] ?? null,
            'card_brand' => $state['card_brand'] ?? null,
            'card_last4' => $state['card_last4'] ?? null,
            'error_code' => ($state['paid'] ?? false) ? null : ($state['error_code'] ?? 'SANDBOX_'.$state['status']),
            'error_message' => $state['paid'] ?? false ? null : ($state['error_message'] ?? 'Paiement simule non autorise.'),
        ];
    }

    public function refund(string $transactionId, float $montant): array
    {
        return [
            'success' => true,
            'refund_id' => 'SBX-REF-'.Str::upper(Str::random(12)),
            'error' => null,
        ];
    }

    public function verifyWebhookSignature(array $payload, string $signature): bool
    {
        // Meme algorithme que CmiHttpGateway : ksort puis http_build_query,
        // HMAC-SHA256. Le secret par defaut permet d'exercer le meme code de
        // verification sans contrat marchand.
        unset($payload['signature']);
        ksort($payload);

        $expected = hash_hmac(
            'sha256',
            http_build_query($payload),
            (string) config('cmi.merchant_secret', 'sandbox-secret')
        );

        return hash_equals($expected, $signature) || hash_equals('sha256='.$expected, $signature);
    }

    // ------------------------------------------------------------- outillage

    /** Enregistre le scenario choisi sur la page de paiement simulee. */
    public static function choose(string $transactionId, string $scenario, float $expectedAmount): ?array
    {
        $meta = self::SCENARIOS[$scenario] ?? null;

        if (! $meta) {
            return null;
        }

        $state = [
            'status' => $meta['status'],
            'paid' => $meta['paid'],
            'amount' => $expectedAmount,
            'card_brand' => 'visa',
            'card_last4' => '4242',
            'chosen' => $scenario,
        ];

        if ($scenario === 'amount_mismatch') {
            // Autorise, mais la passerelle annonce un autre montant.
            $state['amount'] = round($expectedAmount / 2, 2);
        }

        if (! $meta['paid']) {
            $state['error_code'] = 'SANDBOX_'.strtoupper($scenario);
            $state['error_message'] = 'Paiement simule non autorise ('.$meta['label'].').';
        }

        Cache::put(self::CACHE_PREFIX.$transactionId, $state, now()->addHour());

        return $state;
    }

    public static function read(string $transactionId): ?array
    {
        $state = Cache::get(self::CACHE_PREFIX.$transactionId);

        return is_array($state) ? $state : null;
    }
}
