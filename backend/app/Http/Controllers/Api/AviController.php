<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Avi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AviController extends Controller
{
    public function index(Request $request)
    {
        $query = Avi::with(['client', 'vehicule']);

        if ($request->has('vehicule_id')) {
            $query->where('vehicule_id', $request->get('vehicule_id'));
        }

        if ($request->filled('statut')) {
            $query->where('statut', $request->get('statut'));
        }

        $avis = $query->orderBy('created_at', 'desc')->get();

        return response()->json($avis);
    }

    public function vehiculeAvis($vehiculeId)
    {
        // V9 : seuls les avis publies sont visibles publiquement.
        $base = Avi::where('vehicule_id', $vehiculeId)->where('statut', 'publie');

        $avis = (clone $base)->with('client')
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
                    'photo_chemin' => $avi->photo_chemin ? '/storage/'.$avi->photo_chemin : null,
                    'created_at' => $avi->created_at,
                    'client_initiale' => $initiale,
                    'client_prenom' => $prenom,
                ];
            });

        $moyenne = (clone $base)->avg('note');
        $nombre = (clone $base)->count();

        return response()->json([
            'avis' => $avis,
            'moyenne' => round($moyenne ?? 0, 1),
            'nombre' => $nombre,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'vehicule_id' => ['required', 'exists:vehicules,id'],
            'note' => ['required', 'integer', 'min:1', 'max:5'],
            'commentaire' => ['nullable', 'string', 'max:1000'],
            'photo' => ['nullable', 'image', 'max:2048'],
        ]);

        // L'identite vient toujours du token, jamais du payload client (anti-impersonation).
        $validated['client_id'] = $request->user()->id;

        $existingAvi = Avi::where('client_id', $validated['client_id'])
            ->where('vehicule_id', $validated['vehicule_id'])
            ->first();

        if ($existingAvi) {
            return response()->json(['message' => 'Vous avez déjà laissé un avis pour ce véhicule'], 422);
        }

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('avis', 'public');
        }

        // V9 : les nouveaux avis passent en moderation avant publication.
        $avi = Avi::create([
            'client_id' => $validated['client_id'],
            'vehicule_id' => $validated['vehicule_id'],
            'note' => $validated['note'],
            'commentaire' => $validated['commentaire'] ?? null,
            'photo_chemin' => $photoPath,
            'statut' => 'en_attente',
        ]);

        return response()->json($avi->load(['client', 'vehicule']), 201);
    }

    /** V9 : moderation admin (publier / rejeter). */
    public function moderer(Request $request, $id)
    {
        $validated = $request->validate([
            'statut' => 'required|in:publie,rejete',
            'motif' => 'nullable|string|max:500',
        ]);

        $avi = Avi::findOrFail($id);
        $avi->update(['statut' => $validated['statut']]);

        return response()->json($avi);
    }
}
