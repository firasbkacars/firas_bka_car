<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Paiement;
use App\Models\Reservation;
use App\Services\CmiPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CmiPaymentController extends Controller
{
    public function __construct(
        private CmiPaymentService $cmiService
    ) {}

    public function initialize(Request $request)
    {
        $validated = $request->validate([
            'reservation_id' => 'required|exists:reservations,id',
        ]);

        $client = $request->user();
        $reservation = Reservation::findOrFail($validated['reservation_id']);

        if ($reservation->client_id !== $client->id) {
            return response()->json(['message' => 'Non autorise'], 403);
        }

        if (! $this->cmiService->isConfigured()) {
            return response()->json([
                'message' => 'Le paiement en ligne n\'est pas encore configure. Veuillez choisir le paiement en especes.',
            ], 422);
        }

        $paiementExistant = Paiement::where('reservation_id', $reservation->id)
            ->where('methode', 'cmi')
            ->where('statut', 'paye')
            ->exists();

        if ($paiementExistant) {
            return response()->json(['message' => 'Ce paiement deja effectue'], 422);
        }

        $montantAcompte = $reservation->acompte;

        $result = $this->cmiService->createPaymentUrl($reservation, $montantAcompte);

        if ($result['success']) {
            $existingPending = Paiement::where('reservation_id', $reservation->id)
                ->where('methode', 'cmi')
                ->where('statut', 'en_attente')
                ->first();

            if (! $existingPending) {
                Paiement::create([
                    'reservation_id' => $reservation->id,
                    'montant' => $montantAcompte,
                    'methode' => 'cmi',
                    'statut' => 'en_attente',
                ]);
            }

            return response()->json([
                'payment_url' => $result['payment_url'],
                'transaction_id' => $result['transaction_id'],
                'iframe_data' => $result['iframe_data'] ?? null,
            ]);
        }

        return response()->json(['message' => $result['error']], 422);
    }

    public function verify(Request $request)
    {
        $validated = $request->validate([
            'transaction_id' => 'required|string',
        ]);

        $result = $this->cmiService->verifyPayment($validated['transaction_id']);

        return response()->json([
            'status' => $result['status'],
            'paid' => $result['paid'],
        ]);
    }

    public function webhook(Request $request)
    {
        $payload = $request->all();

        Log::info('CMI webhook received', ['payload' => $payload]);

        $signature = $request->header('X-Signature')
            ?? $request->header('X-Hub-Signature-256')
            ?? ($payload['signature'] ?? null);

        if (empty($signature) || ! $this->cmiService->verifyWebhookSignature($payload, $signature)) {
            Log::warning('CMI webhook rejected: invalid or missing signature');

            return response()->json(['error' => 'Invalid signature'], 403);
        }

        $result = $this->cmiService->handleWebhook($payload);

        return response()->json($result);
    }

    public function callback(Request $request)
    {
        $transactionId = $request->query('order_id') ?? $request->query('transaction_id');

        if ($transactionId) {
            $result = $this->cmiService->verifyPayment($transactionId);

            $reservation = Reservation::where('numero', 'like', '%'.$transactionId.'%')->first();

            if ($reservation) {
                return redirect('/client/profil');
            }
        }

        return redirect('/client/profil');
    }

    public function cancel(Request $request)
    {
        return redirect('/client/profil');
    }
}
