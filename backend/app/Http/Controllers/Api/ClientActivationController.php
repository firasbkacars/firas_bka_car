<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Services\InvitationClientService;
use Illuminate\Http\Request;

/**
 * Parcours public d'activation d'un compte cree par un agent.
 */
class ClientActivationController extends Controller
{
    public function __construct(private readonly InvitationClientService $invitations) {}

    /**
     * Demande d'un nouveau lien. La reponse est volontairement identique que
     * le compte existe ou non, afin de ne pas exposer la base clients.
     */
    public function demander(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email:rfc', 'max:255'],
        ], [
            'email.required' => "L'adresse email est obligatoire.",
            'email.email' => "L'adresse email n'est pas valide.",
        ]);

        $client = Client::where('email', $validated['email'])->first();

        if ($client && empty($client->password)) {
            $this->invitations->envoyer($client);
        }

        return response()->json([
            'message' => "Si un compte est eligible, un email d'activation vient d'etre envoye.",
        ]);
    }

    /**
     * Verifie le lien avant d'afficher le formulaire de mot de passe.
     */
    public function show(string $token)
    {
        $client = $this->invitations->trouverParToken($token);

        if (! $client) {
            return response()->json([
                'message' => "Ce lien d'activation est invalide ou a expire.",
            ], 422);
        }

        return response()->json([
            'nom_complet' => $client->nom_complet,
            'email' => $client->email,
        ]);
    }

    /**
     * Active le compte et connecte directement le client.
     */
    public function activer(Request $request, string $token)
    {
        $client = $this->invitations->trouverParToken($token);

        if (! $client) {
            return response()->json([
                'message' => "Ce lien d'activation est invalide ou a expire.",
            ], 422);
        }

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'password.required' => 'Le mot de passe est obligatoire.',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caracteres.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
        ]);

        $client = $this->invitations->activer($client, $validated['password']);

        $token = $client->createToken(
            'client-token',
            ['*'],
            now()->addHours(ClientAuthController::TOKEN_TTL_HOURS)
        )->plainTextToken;

        return response()->json([
            'client' => $client,
            'token' => $token,
        ]);
    }
}
