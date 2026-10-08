<?php

namespace App\Services;

use App\Models\Paiement;
use App\Models\Reservation;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CmiPaymentService
{
    private string $merchantKey;

    private string $merchantSecret;

    private string $gatewayUrl;

    private string $statusUrl;

    private string $returnUrl;

    private string $cancelUrl;

    private string $notifyUrl;

    public function __construct()
    {
        $this->merchantKey = config('cmi.merchant_key');
        $this->merchantSecret = config('cmi.merchant_secret');
        $this->gatewayUrl = config('cmi.gateway_url');
        $this->statusUrl = config('cmi.status_url');
        $this->returnUrl = config('cmi.return_url');
        $this->cancelUrl = config('cmi.cancel_url');
        $this->notifyUrl = config('cmi.notify_url');
    }

    public function isConfigured(): bool
    {
        return ! empty($this->merchantKey) && ! empty($this->merchantSecret);
    }

    public function generateTransactionId(Reservation $reservation): string
    {
        return 'FBC-'.$reservation->numero.'-'.time();
    }

    public function createPaymentUrl(Reservation $reservation, float $montant): array
    {
        if (! $this->isConfigured()) {
            throw new \RuntimeException('CMI payment gateway is not configured');
        }

        $transactionId = $this->generateTransactionId($reservation);

        $payload = [
            'merchant_key' => $this->merchantKey,
            'amount' => round($montant * 100),
            'currency' => 'MAD',
            'order_id' => $transactionId,
            'return_url' => $this->returnUrl,
            'cancel_url' => $this->cancelUrl,
            'notify_url' => $this->notifyUrl,
            'metadata' => [
                'reservation_id' => $reservation->id,
                'client_id' => $reservation->client_id,
                'numero' => $reservation->numero,
            ],
        ];

        $signature = $this->generateSignature($payload);
        $payload['signature'] = $signature;

        try {
            $response = Http::timeout(30)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($this->gatewayUrl, $payload);

            if ($response->successful()) {
                $data = $response->json();

                Log::info('CMI payment initiated', [
                    'reservation_id' => $reservation->id,
                    'transaction_id' => $transactionId,
                    'amount' => $montant,
                ]);

                return [
                    'success' => true,
                    'payment_url' => $data['payment_url'] ?? null,
                    'transaction_id' => $transactionId,
                    'iframe_data' => $data['iframe_data'] ?? null,
                ];
            }

            Log::error('CMI payment initiation failed', [
                'reservation_id' => $reservation->id,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'success' => false,
                'error' => $response->json()['message'] ?? 'Erreur lors de l\'initialisation du paiement',
            ];
        } catch (\Exception $e) {
            Log::error('CMI payment exception', [
                'reservation_id' => $reservation->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => 'Impossible de contacter le serveur de paiement',
            ];
        }
    }

    public function verifyPayment(string $transactionId): array
    {
        if (! $this->isConfigured()) {
            throw new \RuntimeException('CMI payment gateway is not configured');
        }

        $payload = [
            'merchant_key' => $this->merchantKey,
            'order_id' => $transactionId,
        ];

        $signature = $this->generateSignature($payload);
        $payload['signature'] = $signature;

        try {
            $response = Http::timeout(15)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($this->statusUrl, $payload);

            if ($response->successful()) {
                $data = $response->json();

                return [
                    'success' => true,
                    'status' => $data['status'] ?? 'unknown',
                    'paid' => ($data['status'] ?? '') === 'captured',
                ];
            }

            return [
                'success' => false,
                'status' => 'error',
                'paid' => false,
            ];
        } catch (\Exception $e) {
            Log::error('CMI payment verification failed', [
                'transaction_id' => $transactionId,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'status' => 'error',
                'paid' => false,
            ];
        }
    }

    public function handleWebhook(array $payload): array
    {
        $transactionId = $payload['order_id'] ?? null;
        $status = $payload['status'] ?? null;

        if (! $transactionId || ! $status) {
            return ['processed' => false, 'reason' => 'missing_fields'];
        }

        $reservation = Reservation::where('numero', 'like', '%'.$transactionId.'%')
            ->orWhere('numero', $transactionId)
            ->first();

        if (! $reservation) {
            $parts = explode('-', $transactionId);
            if (count($parts) >= 3) {
                $numero = $parts[0].'-'.$parts[1].'-'.$parts[2];
                $reservation = Reservation::where('numero', $numero)->first();
            }
        }

        if (! $reservation) {
            Log::warning('CMI webhook: reservation not found', ['transaction_id' => $transactionId]);

            return ['processed' => false, 'reason' => 'reservation_not_found'];
        }

        $paiement = Paiement::where('reservation_id', $reservation->id)
            ->where('methode', 'cmi')
            ->where('statut', 'en_attente')
            ->latest()
            ->first();

        if (! $paiement) {
            $paiement = Paiement::create([
                'reservation_id' => $reservation->id,
                'montant' => $reservation->acompte,
                'methode' => 'cmi',
                'statut' => 'en_attente',
            ]);
        }

        if ($status === 'captured' || $status === 'approved') {
            $paiement->update([
                'statut' => 'paye',
                'date_paiement' => now(),
            ]);

            $totalPaye = $reservation->paiements()->where('statut', 'paye')->sum('montant');
            if ($totalPaye >= $reservation->prix_total) {
                $reservation->update(['statut' => 'terminee']);
            }

            Log::info('CMI payment confirmed', [
                'reservation_id' => $reservation->id,
                'transaction_id' => $transactionId,
                'amount' => $paiement->montant,
            ]);

            return ['processed' => true, 'status' => 'confirmed'];
        } elseif (in_array($status, ['cancelled', 'failed', 'expired'])) {
            $paiement->update(['statut' => 'echoue']);

            Log::info('CMI payment failed/cancelled', [
                'reservation_id' => $reservation->id,
                'transaction_id' => $transactionId,
                'status' => $status,
            ]);

            return ['processed' => true, 'status' => 'failed'];
        }

        return ['processed' => false, 'reason' => 'unknown_status'];
    }

    private function generateSignature(array $data): string
    {
        ksort($data);
        $query = http_build_query($data);

        return hash_hmac('sha256', $query, $this->merchantSecret);
    }

    /**
     * Verifie la signature HMAC d'un webhook CMI recu.
     * Accepte la signature brute ou prefixee par "sha256=".
     */
    public function verifyWebhookSignature(array $payload, string $signature): bool
    {
        if (! $this->isConfigured()) {
            return false;
        }

        $provided = $payload;
        unset($provided['signature']);

        $expected = $this->generateSignature($provided);

        $candidates = [
            $expected,
            'sha256='.$expected,
        ];

        foreach ($candidates as $candidate) {
            if (hash_equals($candidate, $signature)) {
                return true;
            }
        }

        return false;
    }
}
