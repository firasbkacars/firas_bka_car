<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Services\InvitationClientService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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
            'email' => ['nullable', 'email', 'max:255', Rule::unique('clients', 'email')->ignore($client->id)],
            'cin' => 'nullable|string|max:20',
            'passeport' => 'nullable|string|max:20',
            'est_etranger' => 'sometimes|boolean',
            'adresse' => 'nullable|string|max:255',
        ]);

        $client->update($validated);

        return response()->json($client);
    }

    /**
     * Envoie (ou renvoie) le lien d'activation a un client cree par un agent.
     * L'agent peut ainsi completer l'email depuis la fiche client puis
     * declencher l'invitation sans connaitre le mot de passe du client.
     */
    public function envoyerInvitation($id, InvitationClientService $invitations)
    {
        $client = Client::findOrFail($id);

        if (! empty($client->password)) {
            return response()->json([
                'message' => 'Ce client a deja active son compte.',
            ], 422);
        }

        if (empty($client->email)) {
            return response()->json([
                'message' => "Ajoutez une adresse email a ce client avant de l'inviter.",
            ], 422);
        }

        if (! $invitations->envoyer($client)) {
            return response()->json([
                'message' => "L'envoi de l'invitation n'est pas disponible pour le moment.",
            ], 503);
        }

        return response()->json([
            'message' => 'Invitation envoyee a '.$client->email.'.',
            'client' => $client->fresh(),
        ]);
    }

    public function destroy($id)
    {
        $client = Client::findOrFail($id);
        $client->delete();

        return response()->json(['message' => 'Client supprimé']);
    }
}
