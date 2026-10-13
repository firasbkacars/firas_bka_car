<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FournisseurContrat;
use Illuminate\Http\Request;

/** G5 : CRUD admin des contrats fournisseurs. */
class FournisseurContratController extends Controller
{
    public function index(Request $request)
    {
        $query = FournisseurContrat::with('vehicule')->orderBy('date_expiration', 'asc');

        if ($request->filled('expirant_dans')) {
            $query->whereNotNull('date_expiration')
                ->whereDate('date_expiration', '<=', today()->addDays((int) $request->get('expirant_dans')));
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'titre' => 'required|string|max:255',
            'fournisseur' => 'required|string|max:255',
            'reference' => 'nullable|string|max:255',
            'date_debut' => 'required|date',
            'date_expiration' => 'nullable|date|after_or_equal:date_debut',
            'montant' => 'nullable|numeric|min:0',
            'vehicule_id' => 'nullable|integer|exists:vehicules,id',
            'notes' => 'nullable|string|max:2000',
        ]);

        return response()->json(FournisseurContrat::create($validated), 201);
    }

    public function show($id)
    {
        return response()->json(FournisseurContrat::with('vehicule')->findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $contrat = FournisseurContrat::findOrFail($id);

        $validated = $request->validate([
            'titre' => 'sometimes|string|max:255',
            'fournisseur' => 'sometimes|string|max:255',
            'reference' => 'nullable|string|max:255',
            'date_debut' => 'sometimes|date',
            'date_expiration' => 'nullable|date',
            'montant' => 'nullable|numeric|min:0',
            'vehicule_id' => 'nullable|integer|exists:vehicules,id',
            'notes' => 'nullable|string|max:2000',
        ]);

        $contrat->update($validated);

        return response()->json($contrat);
    }

    public function destroy($id)
    {
        FournisseurContrat::findOrFail($id)->delete();

        return response()->json(['message' => 'Contrat supprime']);
    }
}
