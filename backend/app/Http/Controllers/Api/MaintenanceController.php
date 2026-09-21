<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Maintenance;
use Illuminate\Http\Request;

class MaintenanceController extends Controller
{
    public function index(Request $request)
    {
        $query = Maintenance::with('vehicule');

        if ($request->has('vehicule_id')) {
            $query->where('vehicule_id', $request->get('vehicule_id'));
        }

        if ($request->has('statut')) {
            $query->where('statut', $request->get('statut'));
        }

        if ($request->has('a_venir')) {
            $query->aVenir();
        }

        $maintenances = $query->orderBy('date_prevue', 'asc')->get();

        return response()->json($maintenances);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicule_id' => 'required|exists:vehicules,id',
            'type' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'date_prevue' => 'required|date',
            'date_realisee' => 'nullable|date',
            'cout' => 'nullable|numeric|min:0',
            'statut' => 'required|in:prevue,en_cours,terminee',
            'notes' => 'nullable|string|max:1000',
        ]);

        $maintenance = Maintenance::create($validated);

        return response()->json($maintenance->load('vehicule'), 201);
    }

    public function show($id)
    {
        $maintenance = Maintenance::with('vehicule')->findOrFail($id);

        return response()->json($maintenance);
    }

    public function update(Request $request, $id)
    {
        $maintenance = Maintenance::findOrFail($id);

        $validated = $request->validate([
            'type' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'date_prevue' => 'sometimes|date',
            'date_realisee' => 'nullable|date',
            'cout' => 'nullable|numeric|min:0',
            'statut' => 'sometimes|in:prevue,en_cours,terminee',
            'notes' => 'nullable|string|max:1000',
        ]);

        $maintenance->update($validated);

        return response()->json($maintenance->load('vehicule'));
    }

    public function destroy($id)
    {
        $maintenance = Maintenance::findOrFail($id);
        $maintenance->delete();

        return response()->json(['message' => 'Maintenance supprimee']);
    }
}
