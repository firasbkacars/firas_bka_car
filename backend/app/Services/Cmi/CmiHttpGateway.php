<?php

namespace App\Services\Cmi;

use App\Models\Reservation;

/**
 * Passerelle reelle (CMI / contrat marchand).
 *
 * Les URLs et credentials proviennent de config('cmi.*').
 * Tant que CMI_MERCHANT_KEY/SECRET sont vides, isConfigured() est faux
 * et aucun appel reseau n'est emis.
 */
class CmiHttpGateway implements CmiGateway
{
    public function mode(): string
    {
        return 'production';
    }

    public function isConfigured(): bool
    {
        return filled(config('cmi.merchant_key'))
            && filled(config('cmi.merchant_secret'));
    }

    public function initiate(Reservation $reservation, float $montant, string $transactionId): array
    {
        $payload = [
            'merchant_key' => config('cmi.merchant_key'),
            'amount' => $this->toMinor($montant),
            'currency' => 'MAD',
            'order_id' => $transactionId,
            'return_url' => config('cmi.return_url'),
            'cancel_url' => config('cmi.cancel_url'),
            'notify_url' => config('cmi.notify_url'),
            'client_ip' => request()->ip(),
        ];

        $payload['signature'] = $this->sign($payload);

        try {
            $response = \Illuminate\Support\Facades\Http::timeout(30)
                ->asForm()
                ->post(config('cmi.gateway_url'), $payload);

            if ($response->successful()) {
                $data = $response->json() ?? [];

                return [
                    'success' => true,
                    'payment_url' => $data['payment_url'] ?? $data['form_url'] ?? null,
                    'iframe_data' => $data['iframe_data'] ?? null,
                    'error' => null,
                ];
            }

            return [
                'success' => false,
                'payment_url' => null,
                'iframe_data' => null,
                'error' => $response->json('message')
                    ?? 'La passerelle a refuse l\'initialisation (HTTP '.$response->status().').',
            ];
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('CMI initiate failed', [
                'transaction_id' => $transactionId,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'payment_url' => null,
                'iframe_data' => null,
                'error' => 'Impossible de contacter le serveur de paiement.',
            ];
        }
    }

    public function status(string $transactionId): array
    {
        $payload = [
            'merchant_key' => config('cmi.merchant_key'),
            'order_id' => $transactionId,
        ];
        $payload['signature'] = $this->sign($payload);

        try {
            $response = \Illuminate\Support\Facades\Http::timeout(15)
                ->asForm()
                ->post(config('cmi.status_url'), $payload);

            if (! $response->successful()) {
                return $this->failure('HTTP_'.$response->status(), 'Reponse invalide de la passerelle.');
            }

            $data = $response->json() ?? [];
            $raw = strtolower((string) ($data['status'] ?? ''));
            $paid = in_array($raw, ['captured', 'approved', 'paid', 'success'], true);

            return [
                'success' => true,
                'status' => $this->normalizeStatus($raw),
                'paid' => $paid,
                'amount' => isset($data['amount']) ? $this->fromMinor($data['amount']) : null,
                'card_brand' => $data['card_brand'] ?? $data['pan'] ?? null,
                'card_last4' => $data['card_last4'] ?? null,
                'error_code' => $paid ? null : ($data['error_code'] ?? $data['response_code'] ?? null),
                'error_message' => $paid ? null : ($data['error_message'] ?? $data['message'] ?? null),
            ];
        } catch (\Throwable $e) {
            return $this->failure('EXCEPTION', $e->getMessage());
        }
    }

    public function refund(string $transactionId, float $montant): array
    {
        $payload = [
            'merchant_key' => config('cmi.merchant_key'),
            'order_id' => $transactionId,
            'amount' => $this->toMinor($montant),
            'operation' => 'refund',
        ];
        $payload['signature'] = $this->sign($payload);

        try {
            $response = \Illuminate\Support\Facades\Http::timeout(30)
                ->asForm()
                ->post(config('cmi.refund_url', config('cmi.gateway_url')), $payload);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'refund_id' => $response->json('refund_id') ?? $response->json('order_id'),
                    'error' => null,
                ];
            }

            return [
                'success' => false,
                'refund_id' => null,
                'error' => $response->json('message') ?? 'Refus de la passerelle.',
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'refund_id' => null,
                'error' => $e->getMessage(),
            ];
        }
    }

    public function verifyWebhookSignature(array $payload, string $signature): bool
    {
        if (! $this->isConfigured()) {
            return false;
        }

        unset($payload['signature']);
        $expected = $this->sign($payload);

        return hash_equals($expected, $signature)
            || hash_equals('sha256='.$expected, $signature);
    }

    // ------------------------------------------------------------- internes

    private function sign(array $data): string
    {
        ksort($data);

        return hash_hmac('sha256', http_build_query($data), config('cmi.merchant_secret'));
    }

    /** Montants en centimes pour la passerelle. */
    private function toMinor(float $amount): int
    {
        return (int) round($amount * 100);
    }

    private function fromMinor($amount): float
    {
        return round(((int) $amount) / 100, 2);
    }

    private function normalizeStatus(string $raw): string
    {
        return match ($raw) {
            'captured', 'approved', 'paid', 'success' => 'captured',
            'cancelled', 'canceled' => 'cancelled',
            'declined', 'refused', 'rejected', 'failed' => 'failed',
            'expired' => 'expired',
            'pending', 'in_progress', 'auth' => 'pending',
            default => $raw === '' ? 'unknown' : $raw,
        };
    }

    private function failure(string $code, string $message): array
    {
        return [
            'success' => false,
            'status' => 'error',
            'paid' => false,
            'amount' => null,
            'card_brand' => null,
            'card_last4' => null,
            'error_code' => $code,
            'error_message' => $message,
        ];
    }
}
