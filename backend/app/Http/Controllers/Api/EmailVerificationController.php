<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\EmailVerification;
use App\Models\Client;
use App\Support\QueuedMail;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EmailVerificationController extends Controller
{
    public function send(Request $request)
    {
        $client = $request->user();

        if ($client->email_verified_at) {
            return response()->json(['message' => 'Email deja verifie']);
        }

        if (! $client->email) {
            return response()->json(['message' => 'Aucun email associe au compte'], 422);
        }

        $token = Str::random(64);
        $client->update(['email_verification_token' => $token]);

        $verificationUrl = url("/api/client/verify-email/{$token}");

        // En file : l'envoi reel a lieu dans le worker. Seul un echec de mise
        // en file est signale au client, une indisponibilite SMTP n'arrete
        // pas la demande.
        $ok = QueuedMail::send(
            $client->email,
            new EmailVerification($client, $verificationUrl),
            'verification-email'
        );

        if (! $ok) {
            return response()->json([
                'message' => "L'envoi de l'email de verification n'est pas disponible pour le moment.",
            ], 503);
        }

        return response()->json(['message' => 'Email de verification envoye']);
    }

    public function verify($token)
    {
        $client = Client::where('email_verification_token', $token)->first();

        if (! $client) {
            return response()->json(['message' => 'Token invalide'], 422);
        }

        $client->update([
            'email_verified_at' => now(),
            'email_verification_token' => null,
        ]);

        return response()->json(['message' => 'Email verifie avec succes']);
    }

    public function status(Request $request)
    {
        $client = $request->user();

        return response()->json([
            'email_verified' => (bool) $client->email_verified_at,
            'email' => $client->email,
        ]);
    }
}
