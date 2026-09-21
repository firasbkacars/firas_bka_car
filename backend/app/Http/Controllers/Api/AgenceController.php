<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agence;
use Illuminate\Http\Request;

class AgenceController extends Controller
{
    public function index()
    {
        $agences = Agence::withCount('vehicules')->orderBy('nom')->get();
        return response()->json($agences);
    }

    public function indexActive()
    {
        $agences = Agence::where('active', true)->orderBy('nom')->get();
        return response()->json($agences);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'adresse' => 'required|string|max:255',
            'ville' => 'required|string|max:255',
            'telephone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'active' => 'boolean',
        ]);

        $agence = Agence::create($validated);

        return response()->json($agence, 201);
    }

    public function show($id)
    {
        $agence = Agence::withCount('vehicules')->findOrFail($id);
        return response()->json($agence);
    }

    public function update(Request $request, $id)
    {
        $agence = Agence::findOrFail($id);

        $validated = $request->validate([
            'nom' => 'sometimes|string|max:255',
            'adresse' => 'sometimes|string|max:255',
            'ville' => 'sometimes|string|max:255',
            'telephone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'active' => 'boolean',
        ]);

        $agence->update($validated);

        return response()->json($agence);
    }

    public function destroy($id)
    {
        $agence = Agence::findOrFail($id);

        if ($agence->vehicules()->count() > 0) {
            return response()->json([
                'message' => 'Impossible de supprimer cette agence. Des vehicules y sont rattaches.'
            ], 422);
        }

        $agence->delete();

        return response()->json(['message' => 'Agence supprimee']);
    }
}
