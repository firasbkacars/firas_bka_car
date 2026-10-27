<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Paiement;
use App\Models\Reservation;
use App\Services\CmiPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

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
                // Le montant est exporte SIGNE : un remboursement figure en
                // negatif, ce qui rend le fichier directement additionnable.
                fputcsv($file, [
                    'Date', 'Reservation', 'Client', 'Vehicule', 'Type',
                    'Montant (DH)', 'Methode', 'Statut', 'Transaction', 'Carte',
                ]);

                foreach ($paiements as $paiement) {
                    fputcsv($file, [
                        $paiement->date_paiement ? $paiement->date_paiement->format('d/m/Y H:i') : '',
                        $paiement->reservation->numero ?? '',
                        $paiement->reservation->client->nom_complet ?? '',
                        trim(($paiement->reservation->vehicule->marque ?? '').' '.($paiement->reservation->vehicule->modele ?? '')),
                        $paiement->type ?? 'acompte',
                        $paiement->montant_signe,
                        $paiement->methode === 'cmi' ? 'Carte bancaire (CMI)' : ucfirst($paiement->methode ?? ''),
                        $paiement->statut_affichage,
                        $paiement->transaction_id ?? '',
                        $paiement->carte_masquee ?? '',
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
            'methode' => ['required', Rule::in(Paiement::METHODES)],
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
     * Valide un justificatif de virement / transfert.
     *
     * Le passage en `paye` est le seul moment ou l'acompte entre dans les
     * encaissements : un recu depose par le client ne vaut jamais paiement.
     */
    public function validerRecu(Request $request, $id)
    {
        $paiement = Paiement::with('reservation')->findOrFail($id);
        $disque = config('filesystems.receipts_disk', 'local');

        if (
            ! $paiement->recu_disponible
            || ! Storage::disk($disque)->exists($paiement->recu_path)
        ) {
            return response()->json([
                'message' => 'Aucun justificatif a valider pour ce paiement.',
            ], 422);
        }

        if ($paiement->statut === Paiement::STATUT_PAYE) {
            return response()->json([
                'message' => 'Ce paiement est deja valide.',
                'paiement' => $paiement,
            ]);
        }

        if ($paiement->statut !== Paiement::STATUT_EN_ATTENTE) {
            return response()->json([
                'message' => 'Ce paiement ne peut plus etre valide.',
            ], 422);
        }

        if ($paiement->reservation->statut === 'annulee') {
            return response()->json([
                'message' => 'La reservation est annulee : le justificatif ne peut pas etre valide.',
            ], 422);
        }

        $paiement->update([
            'statut' => Paiement::STATUT_PAYE,
            'date_paiement' => now(),
            'verifie_le' => now(),
            'note_admin' => trim(
                ($paiement->note_admin ? $paiement->note_admin.' — ' : '')
                .'Recu valide par '.($request->user()?->name ?? 'admin')
            ),
        ]);

        $this->syncReservationStatut($paiement->reservation);

        return response()->json([
            'message' => 'Acompte valide',
            'paiement' => $paiement->fresh(),
            'reservation' => $paiement->reservation->fresh(['paiements']),
        ]);
    }

    /**
     * Telechargement du justificatif par un admin (disque prive).
     */
    public function recu($id)
    {
        $paiement = Paiement::findOrFail($id);
        $disque = config('filesystems.receipts_disk', 'local');

        abort_unless($paiement->recu_disponible, 404, 'Aucun recu trouve.');
        abort_unless(
            Storage::disk($disque)->exists($paiement->recu_path),
            404,
            'Recu introuvable.'
        );

        return Storage::disk($disque)->response(
            $paiement->recu_path,
            $paiement->recu_nom_original ?: 'recu',
            ['Content-Type' => $paiement->recu_mime ?: 'application/octet-stream']
        );
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
