<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Paiement;
use App\Models\Reservation;
use App\Services\CmiPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;

class CmiPaymentController extends Controller
{
    public function __construct(
        private readonly CmiPaymentService $cmiService
    ) {}

    /**
     * POST /api/client/payments/cmi/initialize
     * Ouvre une session de paiement et retourne l'URL vers laquelle
     * rediriger le client.
     */
    public function initialize(Request $request)
    {
        $validated = $request->validate([
            'reservation_id' => 'required|exists:reservations,id',
        ]);

        $client = $request->user();
        $reservation = Reservation::with('paiements')->findOrFail($validated['reservation_id']);

        if ($reservation->client_id !== $client->id) {
            return response()->json(['message' => 'Non autorise'], 403);
        }

        if (! $this->cmiService->isConfigured()) {
            return response()->json([
                'message' => 'Le paiement en ligne n\'est pas encore configure. Veuillez choisir le paiement en especes.',
            ], 422);
        }

        if (! $reservation->estPayableEnLigne) {
            return response()->json(['message' => 'Cette reservation n\'est plus payable en ligne.'], 422);
        }

        if (! $this->cmiService->isSandbox() && $reservation->mode_paiement !== 'cmi') {
            return response()->json([
                'message' => 'Cette reservation a ete creee pour un paiement en especes.',
            ], 422);
        }

        $result = $this->cmiService->initialize($reservation, $request->ip());

        if (! ($result['success'] ?? false)) {
            return response()->json(['message' => $result['error'] ?? 'Initialisation impossible.'], 422);
        }

        // En production, la passerelle peut renvoyer une URL absolue.
        $url = $result['payment_url'];

        if ($url && $this->cmiService->isSandbox()) {
            $url = URL::to($url);
        }

        return response()->json([
            'payment_url' => $url,
            'transaction_id' => $result['transaction_id'],
            'iframe_data' => $result['iframe_data'] ?? null,
            'mode' => $result['mode'],
        ]);
    }

    /**
     * POST /api/client/payments/cmi/verify
     * Verification cote client. Le resultat est PERSISTE, pas seulement retourne.
     */
    public function verify(Request $request)
    {
        $validated = $request->validate([
            'transaction_id' => 'required|string|max:128',
        ]);

        $client = $request->user();
        $paiement = Paiement::where('transaction_id', $validated['transaction_id'])->first();

        if (! $paiement) {
            return response()->json(['status' => 'unknown', 'paid' => false], 404);
        }

        if ($paiement->reservation->client_id !== $client->id) {
            // Ne jamais reveler l'existence d'une transaction d'autrui.
            return response()->json(['status' => 'unknown', 'paid' => false], 404);
        }

        $outcome = $this->cmiService->verifyAndPersist($validated['transaction_id'], 'client_verify');

        $paiement->refresh();

        return response()->json([
            'status' => $paiement->statut,
            'paid' => $paiement->statut === Paiement::STATUT_PAYE,
            'reason' => $outcome['reason'] ?? null,
        ]);
    }

    /**
     * GET /api/client/payments/cmi/status/{transaction_id}
     * Permet a l'UI d'interroger l'etat courant sans forcer une reinterrogation
     * de la passerelle (le statut est deja persiste).
     */
    public function status(Request $request, string $transactionId)
    {
        $client = $request->user();
        $paiement = Paiement::where('transaction_id', $transactionId)->first();

        if (! $paiement || $paiement->reservation->client_id !== $client->id) {
            return response()->json(['status' => 'unknown', 'paid' => false], 404);
        }

        return response()->json([
            'status' => $paiement->statut,
            'statut_affichage' => $paiement->statut_affichage,
            'paid' => $paiement->statut === Paiement::STATUT_PAYE,
            'montant' => (float) $paiement->montant,
            'montant_signe' => (float) $paiement->montant_signe,
            'rembourse_sur' => (float) $paiement->rembourse_sur,
            'date_paiement' => $paiement->date_paiement,
            'carte' => $paiement->carte_masquee,
            'reservation_numero' => $paiement->reservation->numero,
            'reservation_id' => $paiement->reservation_id,
        ]);
    }

    /**
     * POST /api/cmi/webhook — notification asynchrone signee (cote marchand).
     */
    public function webhook(Request $request)
    {
        $payload = $request->all();
        $signature = $request->header('X-Signature')
            ?? $request->header('X-Hub-Signature-256')
            ?? ($payload['signature'] ?? null);

        if (empty($signature) || ! $this->cmiService->gateway()->verifyWebhookSignature($payload, $signature)) {
            Log::warning('Webhook CMI rejete : signature invalide', [
                'transaction_id' => $payload['order_id'] ?? $payload['transaction_id'] ?? null,
            ]);

            return response()->json(['error' => 'Invalid signature'], 403);
        }

        $result = $this->cmiService->handleWebhook($payload);

        return response()->json($result, $result['processed'] ? 200 : 422);
    }

    /**
     * GET /api/cmi/callback — retour navigateur apres paiement.
     *
     * Auparavant le resultat de la verification etait jete et le client
     * redirige sans mise a jour : le paiement restait 'en_attente' pour
     * toujours tant que le webhook n'arrivait pas.
     */
    public function callback(Request $request)
    {
        $transactionId = $request->query('order_id')
            ?? $request->query('transaction_id')
            ?? $request->query('oid');

        $params = ['src' => 'return'];

        if ($transactionId) {
            $outcome = $this->cmiService->verifyAndPersist($transactionId, 'browser_return');
            $params['status'] = $outcome['status'];
            $params['reason'] = $outcome['reason'];
            $params['tx'] = $transactionId;
        } else {
            $params['status'] = 'unknown';
            $params['reason'] = 'missing_transaction_id';
        }

        return redirect('/paiement/retour?'.http_build_query($params));
    }

    /**
     * GET /api/cmi/cancel — abandon du paiement par le client.
     */
    public function cancel(Request $request)
    {
        $transactionId = $request->query('order_id')
            ?? $request->query('transaction_id')
            ?? $request->query('oid');

        if ($transactionId) {
            $paiement = Paiement::where('transaction_id', $transactionId)->first();

            if ($paiement && $paiement->statut === Paiement::STATUT_EN_ATTENTE) {
                $paiement->update([
                    'statut' => Paiement::STATUT_ANNULE,
                    'message_erreur' => 'Abandonne par le client.',
                ]);
            }
        }

        // Le statut doit etre celui des modes Paiement (francais) pour que la
        // page /paiement/retour puisse l'afficher sans alias complementaire.
        return redirect('/paiement/retour?'.http_build_query(array_merge(
            $request->query(),
            ['status' => Paiement::STATUT_ANNULE, 'src' => 'cancel']
        )));
    }
}
