<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Favori;
use Illuminate\Http\Request;

class FavoriController extends Controller
{
    public function index(Request $request)
    {
        $favoris = Favori::with('vehicule')
            ->where('client_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($favoris);
    }

    /**
     * Ajoute ou retire un vehicule des favoris (bouton coeur).
     */
    public function toggle(Request $request)
    {
        $validated = $request->validate([
            'vehicule_id' => 'required|integer|exists:vehicules,id',
        ]);

        $clientId = $request->user()->id;
        $vehiculeId = (int) $validated['vehicule_id'];

        $existant = Favori::where('client_id', $clientId)
            ->where('vehicule_id', $vehiculeId)
            ->first();

        if ($existant) {
            $existant->delete();

            return response()->json(['favori' => false]);
        }

        Favori::create([
            'client_id' => $clientId,
            'vehicule_id' => $vehiculeId,
        ]);

        return response()->json(['favori' => true], 201);
    }

    public function destroy(Request $request, $vehiculeId)
    {
        $supprime = Favori::where('client_id', $request->user()->id)
            ->where('vehicule_id', $vehiculeId)
            ->delete();

        if (! $supprime) {
            return response()->json(['message' => 'Ce vehicule n\'est pas dans vos favoris'], 404);
        }

        return response()->json(['favori' => false]);
    }
}
