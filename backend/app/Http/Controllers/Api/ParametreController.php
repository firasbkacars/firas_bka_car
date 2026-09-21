<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Parametre;
use Illuminate\Http\Request;

class ParametreController extends Controller
{
    public function index()
    {
        $parametres = Parametre::all();
        return response()->json($parametres);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'parametres' => 'required|array',
            'parametres.*.cle' => 'required|string|max:255',
            'parametres.*.valeur' => 'required|string',
            'parametres.*.description' => 'nullable|string|max:255',
        ]);

        foreach ($validated['parametres'] as $p) {
            Parametre::set($p['cle'], $p['valeur'], $p['description'] ?? null);
        }

        return response()->json(['message' => 'Parametres mis a jour']);
    }
}
