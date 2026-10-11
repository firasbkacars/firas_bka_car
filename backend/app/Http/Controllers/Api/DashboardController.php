<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Maintenance;
use App\Models\Paiement;
use App\Models\Reservation;
use App\Models\Vehicule;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats()
    {
        $totalReservations = Reservation::count();
        $vehiculesDisponibles = Vehicule::where('statut', 'disponible')->count();
        $totalClients = Client::count();

        $moisActuel = now()->month;
        $anneeActuelle = (string) now()->year;
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            $revenusMois = Paiement::where('statut', 'paye')
                ->whereRaw("strftime('%m', date_paiement) = ?", [str_pad($moisActuel, 2, '0', STR_PAD_LEFT)])
                ->whereRaw("strftime('%Y', date_paiement) = ?", [$anneeActuelle])
                ->selectRaw(Paiement::revenusNetSql().' as net')
                ->value('net');

            $moisPrecedent = $moisActuel - 1;
            $anneePrecedente = $anneeActuelle;
            if ($moisPrecedent < 1) {
                $moisPrecedent = 12;
                $anneePrecedente = (string) ((int) $anneeActuelle - 1);
            }

            $revenusMoisPrecedent = Paiement::where('statut', 'paye')
                ->whereRaw("strftime('%m', date_paiement) = ?", [str_pad($moisPrecedent, 2, '0', STR_PAD_LEFT)])
                ->whereRaw("strftime('%Y', date_paiement) = ?", [$anneePrecedente])
                ->selectRaw(Paiement::revenusNetSql().' as net')
                ->value('net');
        } else {
            $revenusMois = Paiement::where('statut', 'paye')
                ->whereMonth('date_paiement', $moisActuel)
                ->whereYear('date_paiement', $anneeActuelle)
                ->selectRaw(Paiement::revenusNetSql().' as net')
                ->value('net');

            $moisPrecedent = $moisActuel - 1;
            $anneePrecedente = $anneeActuelle;
            if ($moisPrecedent < 1) {
                $moisPrecedent = 12;
                $anneePrecedente = (string) ((int) $anneeActuelle - 1);
            }

            $revenusMoisPrecedent = Paiement::where('statut', 'paye')
                ->whereMonth('date_paiement', $moisPrecedent)
                ->whereYear('date_paiement', $anneePrecedente)
                ->selectRaw(Paiement::revenusNetSql().' as net')
                ->value('net');
        }

        $revenusMois = (float) ($revenusMois ?? 0);
        $revenusMoisPrecedent = (float) ($revenusMoisPrecedent ?? 0);

        $evolutionRevenus = $revenusMoisPrecedent > 0
            ? round(($revenusMois - $revenusMoisPrecedent) / $revenusMoisPrecedent * 100)
            : ($revenusMois > 0 ? 100 : 0);

        return response()->json([
            'total_reservations' => $totalReservations,
            'vehicules_disponibles' => $vehiculesDisponibles,
            'total_clients' => $totalClients,
            'revenus_mois' => $revenusMois,
            'evolution_revenus' => $evolutionRevenus,
        ]);
    }

    public function reservationsRecentes()
    {
        $reservations = Reservation::with(['client', 'vehicule'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json($reservations);
    }

    public function revenus(Request $request)
    {
        $annee = (string) $request->get('annee', now()->year);
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            $revenus = Paiement::where('statut', 'paye')
                ->whereRaw("strftime('%Y', date_paiement) = ?", [$annee])
                ->select(
                    DB::raw("strftime('%m', date_paiement) as mois"),
                    DB::raw(Paiement::revenusNetSql().' as total')
                )
                ->groupBy('mois')
                ->orderBy('mois')
                ->get();
        } else {
            $revenus = Paiement::where('statut', 'paye')
                ->whereYear('date_paiement', $annee)
                ->select(
                    DB::raw('MONTH(date_paiement) as mois'),
                    DB::raw(Paiement::revenusNetSql().' as total')
                )
                ->groupBy('mois')
                ->orderBy('mois')
                ->get();
        }

        return response()->json($revenus);
    }

    public function repartitionVehicules()
    {
        $repartition = Vehicule::select('statut', DB::raw('count(*) as total'))
            ->groupBy('statut')
            ->get();

        return response()->json($repartition);
    }

    public function rappels()
    {
        $retoursAujourdhui = Reservation::where('date_fin', now()->toDateString())
            ->where('statut', 'en_cours')
            ->with(['client', 'vehicule'])
            ->get();

        $vehiculesMaintenance = Vehicule::where('statut', 'maintenance')->get();

        $maintenancesAVenir = Maintenance::with('vehicule')
            ->where('date_prevue', '<=', now()->addDays(7))
            ->where('statut', '!=', 'terminee')
            ->orderBy('date_prevue', 'asc')
            ->get();

        $maintenancesEnRetard = Maintenance::with('vehicule')
            ->where('date_prevue', '<', now())
            ->where('statut', '!=', 'terminee')
            ->orderBy('date_prevue', 'asc')
            ->get();

        return response()->json([
            'retours_jour' => $retoursAujourdhui,
            'maintenance' => $vehiculesMaintenance,
            'maintenances_a_venir' => $maintenancesAVenir,
            'maintenances_en_retard' => $maintenancesEnRetard,
        ]);
    }

    public function tauxOccupation(Request $request)
    {
        $dateDebut = $request->get('date_debut', now()->subDays(30)->toDateString());
        $dateFin = $request->get('date_fin', now()->toDateString());

        $totalJours = Carbon::parse($dateDebut)->diffInDays(Carbon::parse($dateFin));
        if ($totalJours < 1) {
            $totalJours = 1;
        }

        $vehicules = Vehicule::with(['reservations' => function ($q) use ($dateDebut, $dateFin) {
            $q->where('statut', '!=', 'annulee')
                ->where('date_debut', '<', $dateFin)
                ->where('date_fin', '>', $dateDebut);
        }, 'reservations.paiements'])->get();

        $result = [];

        foreach ($vehicules as $vehicule) {
            $joursLoues = $vehicule->reservations
                ->sum(function ($r) use ($dateDebut, $dateFin) {
                    $debut = max(strtotime($dateDebut), strtotime($r->date_debut));
                    $fin = min(strtotime($dateFin), strtotime($r->date_fin));
                    $jours = ($fin - $debut) / (60 * 60 * 24);

                    return max(0, $jours);
                });

            $tauxOccupation = $totalJours > 0 ? round(($joursLoues / $totalJours) * 100, 1) : 0;

            $revenuTotal = (float) $vehicule->reservations
                ->flatMap->paiements
                ->filter(fn ($p) => $p->statut === Paiement::STATUT_PAYE)
                ->sum(fn ($p) => $p->montant_signe);

            $result[] = [
                'vehicule_id' => $vehicule->id,
                'marque' => $vehicule->marque,
                'modele' => $vehicule->modele,
                'categorie' => $vehicule->categorie,
                'prix_jour' => $vehicule->prix_jour,
                'jours_loues' => round($joursLoues),
                'jours_disponibles' => max(0, $totalJours - round($joursLoues)),
                'taux_occupation' => $tauxOccupation,
                'revenu_total' => round($revenuTotal, 2),
                'statut' => $vehicule->statut,
            ];
        }

        usort($result, fn ($a, $b) => $b['revenu_total'] <=> $a['revenu_total']);

        return response()->json([
            'periode' => ['debut' => $dateDebut, 'fin' => $dateFin, 'total_jours' => $totalJours],
            'vehicules' => $result,
        ]);
    }
}
