<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $clients = Client::with('reservations')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($clients);
    }

    public function show($id)
    {
        $client = Client::with(['reservations.vehicule', 'avis'])->findOrFail($id);

        return response()->json($client);
    }

    public function update(Request $request, $id)
    {
        $client = Client::findOrFail($id);

        $validated = $request->validate([
            'nom_complet' => 'sometimes|string|max:255',
            'telephone' => 'sometimes|string|max:20',
            'email' => 'nullable|email|max:255',
            'cin' => 'nullable|string|max:20',
            'passeport' => 'nullable|string|max:20',
            'est_etranger' => 'sometimes|boolean',
            'adresse' => 'nullable|string|max:255',
        ]);

        $client->update($validated);

        return response()->json($client);
    }

    public function destroy($id)
    {
        $client = Client::findOrFail($id);
        $client->delete();

        return response()->json(['message' => 'Client supprimé']);
    }
}
