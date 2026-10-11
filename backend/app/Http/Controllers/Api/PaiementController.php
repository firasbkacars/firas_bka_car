<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Paiement;
use App\Models\Reservation;
use App\Services\CmiPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;

class PaiementController extends Controller
{
    public function index(Request $request)
    {
        $query = Paiement::with('reservation.client');

        if ($request->has('statut')) {
            $query->where('statut', $request->get('statut'));
        }

        if ($request->has('date_debut')) {
            $query->where('date_paiement', '>=', $request->get('date_debut'));
        }

        if ($request->has('date_fin')) {
            $query->where('date_paiement', '<=', $request->get('date_fin'));
        }

        $paiements = $query->orderBy('created_at', 'desc')->get();

        return response()->json($paiements);
    }

    public function export(Request $request)
    {
        $query = Paiement::with(['reservation.client', 'reservation.vehicule']);

        if ($request->has('statut')) {
            $query->where('statut', $request->get('statut'));
        }

        if ($request->has('date_debut')) {
            $query->where('date_paiement', '>=', $request->get('date_debut'));
        }

        if ($request->has('date_fin')) {
            $query->where('date_paiement', '<=', $request->get('date_fin'));
        }

        $paiements = $query->orderBy('date_paiement', 'asc')->get();

        $format = $request->get('format', 'csv');

        if ($format === 'csv') {
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="paiements_'.now()->format('Y-m-d').'.csv"',
            ];

            $callback = function () use ($paiements) {
                $file = fopen('php://output', 'w');
                fputcsv($file, ['Date', 'Reservation', 'Client', 'Vehicule', 'Montant (DH)', 'Methode', 'Statut']);

                foreach ($paiements as $paiement) {
                    fputcsv($file, [
                        $paiement->date_paiement ? $paiement->date_paiement->format('d/m/Y H:i') : '',
                        $paiement->reservation->numero ?? '',
                        $paiement->reservation->client->nom_complet ?? '',
                        ($paiement->reservation->vehicule->marque ?? '').' '.($paiement->reservation->vehicule->modele ?? ''),
                        $paiement->montant,
                        ucfirst(str_replace('_', ' ', $paiement->methode)),
                        ucfirst(str_replace('_', ' ', $paiement->statut)),
                    ]);
                }

                fclose($file);
            };

            return Response::stream($callback, 200, $headers);
        }

        return response()->json($paiements);
    }

    /**
     * Saisie manuelle d'un encaissement par un admin (especes regles en agence).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'reservation_id' => 'required|exists:reservations,id',
            'montant' => 'required|numeric|min:0.01',
            'methode' => 'required|in:especes,cmi',
            'type' => 'nullable|in:acompte,solde,complement,caution',
            'note_admin' => 'nullable|string|max:500',
        ]);

        $reservation = Reservation::with('paiements')->findOrFail($validated['reservation_id']);

        $type = $validated['type'] ?? Paiement::TYPE_ACOMPTE;

        $paiement = Paiement::create([
            'reservation_id' => $reservation->id,
            'montant' => $validated['montant'],
            'methode' => $validated['methode'],
            'statut' => Paiement::STATUT_PAYE,
            'type' => $type,
            'gateway' => 'manuel',
            'devise' => 'MAD',
            'date_paiement' => now(),
            'note_admin' => $validated['note_admin'] ?? null,
            // Traçabilité : qui a saisi cet encaissement.
            'created_by' => $request->user()?->id,
            'client_ip' => $request->ip(),
        ]);

        $this->syncReservationStatut($reservation);

        return response()->json($paiement->load('reservation'), 201);
    }

    /**
     * POST /api/paiements/{id}/rembourser
     * Remboursement total ou partiel d'un encaissement confirme.
     */
    public function rembourser(Request $request, $id)
    {
        $validated = $request->validate([
            'montant' => 'required|numeric|min:0.01',
            'motif' => 'required|string|max:500',
        ]);

        $paiement = Paiement::with('reservation')->findOrFail($id);

        if ($paiement->type === Paiement::TYPE_REMBOURSEMENT) {
            return response()->json(['message' => 'Cette ecriture est deja un remboursement.'], 422);
        }

        $result = app(CmiPaymentService::class)->refund(
            $paiement,
            (float) $validated['montant'],
            $validated['motif'],
            $request->user()?->id
        );

        if (! ($result['success'] ?? false)) {
            return response()->json(['message' => $result['error'] ?? 'Remboursement impossible.'], 422);
        }

        $this->syncReservationStatut($paiement->reservation);

        return response()->json([
            'message' => 'Remboursement enregistre',
            'remboursement_id' => $result['remboursement_id'],
            'montant' => $result['montant'],
            'paiement' => $paiement->fresh(),
        ], 201);
    }

    /**
     * Recalcule le statut de la reservation apres un encaissement ou un
     * remboursement. Le net (encaisse - rembourse) fait foi.
     */
    private function syncReservationStatut(Reservation $reservation): void
    {
        $net = (float) $reservation->paiements()
            ->payes()
            ->selectRaw(Paiement::revenusNetSql('montant').' as net')
            ->value('net');

        if ($net >= (float) $reservation->prix_total) {
            $reservation->update(['statut' => 'terminee']);
        }
    }

    public function show($id)
    {
        $paiement = Paiement::with('reservation.client')->findOrFail($id);

        return response()->json($paiement);
    }
}
