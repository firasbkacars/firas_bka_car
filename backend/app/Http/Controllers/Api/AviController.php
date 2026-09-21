<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Avi;
use Illuminate\Http\Request;

class AviController extends Controller
{
    public function index(Request $request)
    {
        $query = Avi::with(['client', 'vehicule']);

        if ($request->has('vehicule_id')) {
            $query->where('vehicule_id', $request->get('vehicule_id'));
        }

        $avis = $query->orderBy('created_at', 'desc')->get();

        return response()->json($avis);
    }

    public function vehiculeAvis($vehiculeId)
    {
        $avis = Avi::with('client')
            ->where('vehicule_id', $vehiculeId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($avi) {
                $nomParts = explode(' ', $avi->client->nom_complet);
                $prenom = $nomParts[0] ?? '';
                $initiale = strtoupper(substr($prenom, 0, 1));
                return [
                    'id' => $avi->id,
                    'note' => $avi->note,
                    'commentaire' => $avi->commentaire,
                    'created_at' => $avi->created_at,
                    'client_initiale' => $initiale,
                    'client_prenom' => $prenom,
                ];
            });

        $moyenne = Avi::where('vehicule_id', $vehiculeId)->avg('note');
        $nombre = Avi::where('vehicule_id', $vehiculeId)->count();

        return response()->json([
            'avis' => $avis,
            'moyenne' => round($moyenne, 1),
            'nombre' => $nombre,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id' => ['required', 'exists:clients,id'],
            'vehicule_id' => ['required', 'exists:vehicules,id'],
            'note' => ['required', 'integer', 'min:1', 'max:5'],
            'commentaire' => ['nullable', 'string', 'max:1000'],
        ]);

        $existingAvi = Avi::where('client_id', $validated['client_id'])
            ->where('vehicule_id', $validated['vehicule_id'])
            ->first();

        if ($existingAvi) {
            return response()->json(['message' => 'Vous avez déjà laissé un avis pour ce véhicule'], 422);
        }

        $avi = Avi::create($validated);

        return response()->json($avi->load(['client', 'vehicule']), 201);
    }
}
