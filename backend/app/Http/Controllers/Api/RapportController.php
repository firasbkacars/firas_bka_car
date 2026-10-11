<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Paiement;
use App\Models\Reservation;
use App\Models\Vehicule;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Rapports avances (Phase 5) : synthese, remboursements, previsions
 * et export PDF. Les indicateurs d'occupation/revenus par vehicule
 * restent dans DashboardController::tauxOccupation.
 */
class RapportController extends Controller
{
    /**
     * R4/R5/R6/R7 + F2 : top vehicules, clients fideles, taux
     * d'annulation, duree moyenne et detail par mode de paiement.
     */
    public function synthese(Request $request)
    {
        $dateDebut = $request->get('date_debut', now()->subMonths(6)->startOfMonth()->toDateString());
        $dateFin = $request->get('date_fin', now()->toDateString());

        $base = Reservation::whereBetween('created_at', [$dateDebut, $dateFin.' 23:59:59']);

        $reservations = (clone $base)->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN statut = ? THEN 1 ELSE 0 END) as annulees,
                SUM(CASE WHEN statut != ? THEN 1 ELSE 0 END) as traitees
            ', ['annulee', 'annulee'])->first();

        $tauxAnnulation = $reservations->total > 0
            ? round($reservations->annulees / $reservations->total * 100, 1)
            : 0;

        // R7 : duree moyenne des locations (en jours), sur sqlite et mysql.
        $dureeMoyenne = null;
        if (DB::getDriverName() === 'sqlite') {
            $dureeMoyenne = (clone $base)
                ->where('statut', '!=', 'annulee')
                ->selectRaw('AVG(julianday(date_fin) - julianday(date_debut)) as moyenne')
                ->value('moyenne');
        } else {
            $dureeMoyenne = (clone $base)
                ->where('statut', '!=', 'annulee')
                ->selectRaw('AVG(DATEDIFF(day, date_debut, date_fin)) as moyenne')
                ->value('moyenne');
        }

        // R4 : vehicules les plus demandes sur la periode.
        $topVehicules = (clone $base)
            ->where('statut', '!=', 'annulee')
            ->select('vehicule_id', DB::raw('COUNT(*) as reservations'))
            ->groupBy('vehicule_id')
            ->orderByDesc('reservations')
            ->limit(5)
            ->with('vehicule')
            ->get()
            ->map(fn ($row) => [
                'vehicule_id' => $row->vehicule_id,
                'marque' => $row->vehicule?->marque,
                'modele' => $row->vehicule?->modele,
                'reservations' => (int) $row->reservations,
            ]);

        // R5 : clients les plus fideles (nb de reservations + depenses).
        $topClients = (clone $base)
            ->where('statut', '!=', 'annulee')
            ->select('client_id', DB::raw('COUNT(*) as reservations'), DB::raw('SUM(prix_total) as depenses'))
            ->groupBy('client_id')
            ->orderByDesc('reservations')
            ->limit(5)
            ->with('client')
            ->get()
            ->map(fn ($row) => [
                'client_id' => $row->client_id,
                'nom' => $row->client?->nom_complet,
                'reservations' => (int) $row->reservations,
                'depenses' => round((float) $row->depenses, 2),
            ]);

        // F2 : encaissements par mode de paiement sur la periode.
        $parMethode = Paiement::payes()
            ->whereBetween('date_paiement', [$dateDebut, $dateFin.' 23:59:59'])
            ->encaissements()
            ->select('methode', DB::raw('SUM(montant) as total'), DB::raw('COUNT(*) as operations'))
            ->groupBy('methode')
            ->get()
            ->map(fn ($row) => [
                'methode' => $row->methode,
                'total' => round((float) $row->total, 2),
                'operations' => (int) $row->operations,
            ]);

        return response()->json([
            'periode' => ['debut' => $dateDebut, 'fin' => $dateFin],
            'total_reservations' => (int) $reservations->total,
            'reservations_annulees' => (int) $reservations->annulees,
            'taux_annulation' => $tauxAnnulation,
            'duree_moyenne_jours' => $dureeMoyenne !== null ? round((float) $dureeMoyenne, 1) : null,
            'top_vehicules' => $topVehicules,
            'top_clients' => $topClients,
            'paiements_par_methode' => $parMethode,
        ]);
    }

    /**
     * F3 : suivi des remboursements (statuts et montants).
     */
    public function remboursements(Request $request)
    {
        $dateDebut = $request->get('date_debut', now()->subMonths(6)->startOfMonth()->toDateString());
        $dateFin = $request->get('date_fin', now()->toDateString());

        $remboursements = Paiement::query()
            ->where('type', Paiement::TYPE_REMBOURSEMENT)
            ->whereBetween('created_at', [$dateDebut, $dateFin.' 23:59:59'])
            ->with('reservation.client')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'montant' => round(abs((float) $p->montant), 2),
                'statut' => $p->statut,
                'methode' => $p->methode,
                'date' => optional($p->rembourse_le ?? $p->created_at)->format('d/m/Y'),
                'reservation_numero' => $p->reservation?->numero,
                'client' => $p->reservation?->client?->nom_complet,
            ]);

        $totaux = [
            'rembourse' => round((float) Paiement::query()
                ->where('type', Paiement::TYPE_REMBOURSEMENT)
                ->where('statut', Paiement::STATUT_REMBOURSE)
                ->whereBetween('created_at', [$dateDebut, $dateFin.' 23:59:59'])
                ->sum(DB::raw('ABS(montant)')), 2),
            'en_attente' => round((float) Paiement::query()
                ->where('type', Paiement::TYPE_REMBOURSEMENT)
                ->where('statut', Paiement::STATUT_REMBOURSE_PARTIEL)
                ->whereBetween('created_at', [$dateDebut, $dateFin.' 23:59:59'])
                ->sum(DB::raw('ABS(montant)')), 2),
        ];

        return response()->json([
            'periode' => ['debut' => $dateDebut, 'fin' => $dateFin],
            'totaux' => $totaux,
            'remboursements' => $remboursements,
        ]);
    }

    /**
     * F4 : previsionnel de revenus (cumul des acomptes encaisses +
     * reservations en attente de solde).
     */
    public function previsions()
    {
        $encaisse = (float) Paiement::payes()
            ->encaissements()
            ->where('date_paiement', '<=', now())
            ->sum('montant');

        $attendu = (float) Reservation::whereIn('statut', ['confirmee', 'en_cours'])
            ->sum('prix_total');

        $soldeRestant = max(0, $attendu - $encaisse);

        return response()->json([
            'encaisse' => round($encaisse, 2),
            'attendu' => round($attendu, 2),
            'solde_restant' => round($soldeRestant, 2),
            'reservations_ouvertes' => Reservation::whereIn('statut', ['confirmee', 'en_cours'])->count(),
        ]);
    }

    /**
     * R8 : export PDF de la synthese (memes données que synthese()).
     */
    public function exportPdf(Request $request)
    {
        $data = json_decode($this->synthese($request)->getContent(), true);

        $pdf = Pdf::loadView('pdf.rapport', ['rapport' => $data]);

        return $pdf->download('rapport-'.now()->format('Y-m-d').'.pdf');
    }
}
