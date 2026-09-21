<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VehiculePhotoController extends Controller
{
    public function upload(Request $request, $vehiculeId)
    {
        $vehicule = Vehicule::findOrFail($vehiculeId);

        $request->validate([
            'photos' => 'required|array|max:8',
            'photos.*' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $paths = [];
        foreach ($request->file('photos') as $file) {
            $path = $file->store('vehicules', 'public');
            $paths[] = $path;
        }

        $existing = $vehicule->photos ?? [];
        $vehicule->photos = array_merge($existing, $paths);
        $vehicule->save();

        return response()->json([
            'photos' => $vehicule->photos,
            'message' => count($paths) . ' photo(s) ajoutée(s)',
        ]);
    }

    public function delete(Request $request, $vehiculeId)
    {
        $vehicule = Vehicule::findOrFail($vehiculeId);

        $validated = $request->validate([
            'photo_path' => 'required|string',
        ]);

        $photos = $vehicule->photos ?? [];
        $key = array_search($validated['photo_path'], $photos);

        if ($key === false) {
            return response()->json(['message' => 'Photo introuvable'], 404);
        }

        if (Storage::disk('public')->exists($validated['photo_path'])) {
            Storage::disk('public')->delete($validated['photo_path']);
        }

        array_splice($photos, $key, 1);
        $vehicule->photos = $photos;
        $vehicule->save();

        return response()->json([
            'photos' => $vehicule->photos,
            'message' => 'Photo supprimée',
        ]);
    }

    public function reorder(Request $request, $vehiculeId)
    {
        $vehicule = Vehicule::findOrFail($vehiculeId);

        $validated = $request->validate([
            'photos' => 'required|array',
            'photos.*' => 'string',
        ]);

        $vehicule->photos = $validated['photos'];
        $vehicule->save();

        return response()->json([
            'photos' => $vehicule->photos,
            'message' => 'Ordre mis à jour',
        ]);
    }
}
