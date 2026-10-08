<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Paiement;
use App\Models\Reservation;
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

    public function store(Request $request)
    {
        $validated = $request->validate([
            'reservation_id' => 'required|exists:reservations,id',
            'montant' => 'required|numeric|min:0',
            'methode' => 'required|in:especes,visa,mastercard,cmi',
        ]);

        $paiement = Paiement::create([
            ...$validated,
            'statut' => 'paye',
            'date_paiement' => now(),
        ]);

        $reservation = Reservation::find($validated['reservation_id']);
        $totalPaye = $reservation->paiements()->where('statut', 'paye')->sum('montant');

        if ($totalPaye >= $reservation->prix_total) {
            $reservation->update(['statut' => 'terminee']);
        }

        return response()->json($paiement->load('reservation'), 201);
    }

    public function show($id)
    {
        $paiement = Paiement::with('reservation.client')->findOrFail($id);

        return response()->json($paiement);
    }
}
