<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VehiculeController extends Controller
{
    public function index(Request $request)
    {
        $query = Vehicule::query();

        if ($request->has('disponibles')) {
            $query->disponibles();
        }

        $query->filtres($request->only([
            'categorie', 'marque', 'transmission', 'carburant', 'prix_min', 'prix_max', 'agence_id',
        ]));

        // Recherche par lieu (formulaire d'accueil) : filtre via l'agence.
        if ($request->filled('ville')) {
            $query->whereHas('agence', function ($q) use ($request) {
                $q->where('ville', $request->get('ville'))->where('active', true);
            });
        }

        // Lien "Vehicules populaires" du footer.
        if ($request->get('populaire')) {
            $query->where('populaire', true);
        }

        // Periode demandee : exclut les vehicules deja reserves sur ce creneau.
        $dateDebut = $request->get('date_debut');
        $dateFin = $request->get('date_fin');
        if ($dateDebut && $dateFin) {
            $query->whereDoesntHave('reservations', function ($q) use ($dateDebut, $dateFin) {
                $q->where('statut', '!=', 'annulee')
                    ->where('date_debut', '<', $dateFin)
                    ->where('date_fin', '>', $dateDebut);
            });
        }

        $tri = $request->get('tri', 'popularite');
        switch ($tri) {
            case 'prix_asc':
                $query->orderBy('prix_jour', 'asc');
                break;
            case 'prix_desc':
                $query->orderBy('prix_jour', 'desc');
                break;
            case 'annee':
                $query->orderBy('annee', 'desc');
                break;
            default:
                $query->orderBy('populaire', 'desc')->orderBy('created_at', 'desc');
        }

        $vehicules = $query->paginate(min(max((int) $request->get('per_page', 20), 1), 100));

        return response()->json($vehicules);
    }

    public function show($id)
    {
        $vehicule = Vehicule::with(['reservations' => function ($q) {
            $q->where('statut', '!=', 'annulee')
                ->select('id', 'vehicule_id', 'date_debut', 'date_fin', 'statut');
        }])->findOrFail($id);

        return response()->json($vehicule);
    }

    public function disponibilite($id, Request $request)
    {
        $vehicule = Vehicule::findOrFail($id);

        $dateDebut = $request->get('date_debut');
        $dateFin = $request->get('date_fin');

        $reservations = $vehicule->reservations()
            ->where('statut', '!=', 'annulee')
            ->when($dateDebut && $dateFin, function ($q) use ($dateDebut, $dateFin) {
                $q->where(function ($q) use ($dateDebut, $dateFin) {
                    $q->whereBetween('date_debut', [$dateDebut, $dateFin])
                        ->orWhereBetween('date_fin', [$dateDebut, $dateFin])
                        ->orWhere(function ($q) use ($dateDebut, $dateFin) {
                            $q->where('date_debut', '<=', $dateDebut)
                                ->where('date_fin', '>=', $dateFin);
                        });
                });
            })
            // Map: date_debut => date_fin (periode reservee)
            ->pluck('date_fin', 'date_debut');

        return response()->json([
            'vehicule_id' => $id,
            'disponible' => $vehicule->statut === 'disponible',
            'reservations' => $reservations,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'marque' => 'required|string|max:255',
            'modele' => 'required|string|max:255',
            'categorie' => 'required|string|max:255',
            'annee' => 'required|integer|min:1990|max:2030',
            'transmission' => 'required|in:automatique,manuelle',
            'carburant' => 'required|in:essence,diesel,hybride',
            'places' => 'required|integer|min:2|max:9',
            'puissance' => 'nullable|string|max:50',
            'kilometrage' => 'nullable|integer|min:0',
            'prix_jour' => 'required|numeric|min:0',
            'montant_caution' => 'nullable|numeric|min:0',
            'statut' => 'in:disponible,en_location,louee,maintenance',
            'photos' => 'nullable|array',
            'equipements' => 'nullable|array',
            'populaire' => 'boolean',
        ]);

        $vehicule = Vehicule::create($validated);

        return response()->json($vehicule, 201);
    }

    public function update(Request $request, $id)
    {
        $vehicule = Vehicule::findOrFail($id);

        $validated = $request->validate([
            'marque' => 'sometimes|string|max:255',
            'modele' => 'sometimes|string|max:255',
            'categorie' => 'sometimes|string|max:255',
            'annee' => 'sometimes|integer|min:1990|max:2030',
            'transmission' => 'sometimes|in:automatique,manuelle',
            'carburant' => 'sometimes|in:essence,diesel,hybride',
            'places' => 'sometimes|integer|min:2|max:9',
            'puissance' => 'nullable|string|max:50',
            'kilometrage' => 'nullable|integer|min:0',
            'prix_jour' => 'sometimes|numeric|min:0',
            'montant_caution' => 'sometimes|numeric|min:0',
            'statut' => 'sometimes|in:disponible,en_location,louee,maintenance',
            'photos' => 'nullable|array',
            'equipements' => 'nullable|array',
            'populaire' => 'boolean',
        ]);

        $vehicule->update($validated);

        return response()->json($vehicule);
    }

    public function destroy($id)
    {
        $vehicule = Vehicule::findOrFail($id);

        if (! empty($vehicule->photos)) {
            foreach ($vehicule->photos as $photo) {
                if (Storage::disk('public')->exists($photo)) {
                    Storage::disk('public')->delete($photo);
                }
            }
        }

        $vehicule->delete();

        return response()->json(['message' => 'Véhicule supprimé']);
    }
}
