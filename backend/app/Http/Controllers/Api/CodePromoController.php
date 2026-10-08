<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CodePromo;
use App\Models\Reservation;
use Illuminate\Http\Request;

class CodePromoController extends Controller
{
    public function verify(Request $request)
    {
        $request->validate([
            'code' => 'required|string|max:50',
            'montant' => 'required|numeric|min:0',
        ]);

        $codePromo = CodePromo::where('code', strtoupper($request->code))->first();

        if (! $codePromo || ! $codePromo->isValid()) {
            return response()->json([
                'valid' => false,
                'message' => 'Code promo invalide ou expire',
            ], 422);
        }

        $remise = $codePromo->calculateDiscount($request->montant);
        $nouveauMontant = max(0, $request->montant - $remise);

        return response()->json([
            'valid' => true,
            'code' => $codePromo->code,
            'type' => $codePromo->type,
            'valeur' => $codePromo->valeur,
            'remise' => round($remise, 2),
            'montant_original' => $request->montant,
            'nouveau_montant' => round($nouveauMontant, 2),
            'message' => $codePromo->type === 'pourcentage'
                ? "Remise de {$codePromo->valeur}% appliquee"
                : "Remise de {$codePromo->valeur} DH appliquee",
        ]);
    }

    public function index()
    {
        $codes = CodePromo::orderBy('created_at', 'desc')->get();

        return response()->json($codes);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:code_promos,code',
            'type' => 'required|in:pourcentage,montant_fixe',
            'valeur' => 'required|numeric|min:0',
            'date_expiration' => 'required|date|after:now',
            'usage_max' => 'required|integer|min:1',
            'actif' => 'boolean',
        ]);

        $validated['code'] = strtoupper($validated['code']);
        $validated['usage_actuel'] = 0;

        $code = CodePromo::create($validated);

        return response()->json($code, 201);
    }

    public function update(Request $request, $id)
    {
        $code = CodePromo::findOrFail($id);

        $validated = $request->validate([
            'code' => 'sometimes|string|max:50|unique:code_promos,code,'.$id,
            'type' => 'sometimes|in:pourcentage,montant_fixe',
            'valeur' => 'sometimes|numeric|min:0',
            'date_expiration' => 'sometimes|date',
            'usage_max' => 'sometimes|integer|min:1',
            'actif' => 'sometimes|boolean',
        ]);

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper($validated['code']);
        }

        $code->update($validated);

        return response()->json($code);
    }

    public function destroy($id)
    {
        $code = CodePromo::findOrFail($id);
        $code->delete();

        return response()->json(['message' => 'Code promo supprime']);
    }

    public function stats($id)
    {
        $code = CodePromo::findOrFail($id);

        $reservations = Reservation::where('code_promo', $code->code)->get();

        $totalRemise = $reservations->sum('remise');
        $nombreUtilisations = $reservations->count();

        return response()->json([
            'code' => $code,
            'nombre_utilisations' => $nombreUtilisations,
            'total_remise' => $totalRemise,
        ]);
    }
}
