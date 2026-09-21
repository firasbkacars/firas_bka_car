<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EtatLieu;
use Illuminate\Http\Request;

class EtatLieuController extends Controller
{
    public function index(Request $request)
    {
        $query = EtatLieu::with(['reservation.client', 'reservation.vehicule', 'agent']);

        if ($request->has('reservation_id')) {
            $query->where('reservation_id', $request->get('reservation_id'));
        }

        if ($request->has('type')) {
            $query->where('type', $request->get('type'));
        }

        $etats = $query->orderBy('created_at', 'desc')->get();
        return response()->json($etats);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'reservation_id' => 'required|exists:reservations,id',
            'type' => 'required|in:depart,retour',
            'photos' => 'nullable|array',
            'notes' => 'nullable|string|max:2000',
        ]);

        $validated['agent_id'] = $request->user()->id;

        $etat = EtatLieu::create($validated);

        return response()->json($etat->load(['reservation.client', 'reservation.vehicule']), 201);
    }

    public function show($id)
    {
        $etat = EtatLieu::with(['reservation.client', 'reservation.vehicule', 'agent'])->findOrFail($id);
        return response()->json($etat);
    }
}
