<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginClientRequest;
use App\Http\Requests\RegisterClientRequest;
use App\Mail\PermisValidation;
use App\Models\Client;
use App\Support\QueuedMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\PersonalAccessToken;

class ClientAuthController extends Controller
{
    private const MAX_ATTEMPTS = 5;

    private const LOCKOUT_MINUTES = 15;

    /** A4 : duree de vie d'un token client. */
    public const TOKEN_TTL_HOURS = 24;

    public function register(RegisterClientRequest $request)
    {
        $validated = $request->validated();

        $client = Client::create([
            'nom_complet' => $validated['nom_complet'],
            'email' => $validated['email'],
            'telephone' => $validated['telephone'],
            'password' => $validated['password'],
            'cin' => $validated['cin'] ?? null,
            'adresse' => $validated['adresse'] ?? null,
        ]);

        $token = $client->createToken('client-token', ['*'], now()->addHours(self::TOKEN_TTL_HOURS))->plainTextToken;

        return response()->json([
            'client' => $client,
            'token' => $token,
        ], 201);
    }

    public function login(LoginClientRequest $request)
    {
        $validated = $request->validated();
        $email = $validated['email'];
        $ip = $request->ip();

        $lockKey = "login_lock:client:{$ip}";
        $attemptsKey = "login_attempts:client:{$ip}";

        if (Cache::has($lockKey)) {
            $ttl = Cache::get($lockKey);

            return response()->json([
                'message' => 'Trop de tentatives. Reessayez dans '.self::LOCKOUT_MINUTES.' minutes.',
                'locked_until' => $ttl,
            ], 429);
        }

        $client = Client::where('email', $email)->first();

        if (! $client || ! Hash::check($validated['password'], $client->password)) {
            $attempts = Cache::increment($attemptsKey);

            if ($attempts === 1) {
                Cache::put($attemptsKey, 1, now()->addMinutes(self::LOCKOUT_MINUTES));
            }

            Log::warning('Client login failed', [
                'email' => $email,
                'ip' => $ip,
                'attempts' => $attempts,
            ]);

            if ($attempts >= self::MAX_ATTEMPTS) {
                Cache::put($lockKey, now()->addMinutes(self::LOCKOUT_MINUTES), now()->addMinutes(self::LOCKOUT_MINUTES));
                Cache::forget($attemptsKey);

                Log::warning('Client account locked', [
                    'email' => $email,
                    'ip' => $ip,
                ]);
            }

            return response()->json(['message' => 'Identifiants incorrects'], 401);
        }

        Cache::forget($attemptsKey);

        $token = $client->createToken('client-token', ['*'], now()->addHours(self::TOKEN_TTL_HOURS))->plainTextToken;

        Log::info('Client login successful', [
            'client_id' => $client->id,
            'ip' => $ip,
        ]);

        return response()->json([
            'client' => $client,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $token = $request->user()->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return response()->json(['message' => 'DÃ©connectÃ©']);
    }

    public function profile(Request $request)
    {
        return response()->json($request->user());
    }

    public function updateProfile(Request $request)
    {
        $client = $request->user();

        $validated = $request->validate([
            'nom_complet' => 'sometimes|string|max:255|min:2',
            'telephone' => 'sometimes|string|regex:/^(\+212|0)[5-7]\d{8}$/',
            'email' => 'sometimes|email:rfc|max:255|unique:clients,email,'.$client->id,
            'cin' => 'nullable|string|regex:/^[A-Z]{1,2}\d{4,6}$/|max:20',
            'adresse' => 'nullable|string|max:255',
            'date_expiration_permis' => 'nullable|date',
        ]);

        $attributes = $validated;

        if (array_key_exists('date_expiration_permis', $validated)) {
            $nouvelle = $validated['date_expiration_permis'];
            $actuelle = $client->date_expiration_permis?->format('Y-m-d');

            if ($nouvelle !== $actuelle) {
                // Une nouvelle date re-ouvre le cycle de validation : sans
                // cela, un client pourrait prolonger lui-meme un permis expire.
                $attributes['permis_rappel_envoye_le'] = null;

                if ($client->permis_statut === 'expire') {
                    $attributes['permis_statut'] = 'en_attente';
                    $attributes['permis_rejet_motif'] = null;
                }
            }
        }

        $client->update($attributes);

        return response()->json($client);
    }

    public function uploadPhoto(Request $request)
    {
        $request->validate([
            'photo' => 'required|file|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        $client = $request->user();

        if ($client->photo_profil && \Storage::disk('public')->exists($client->photo_profil)) {
            \Storage::disk('public')->delete($client->photo_profil);
        }

        $path = $request->file('photo')->store('photos', 'public');

        $client->update(['photo_profil' => $path]);

        return response()->json([
            'message' => 'Photo de profil mise a jour',
            'photo_profil' => $path,
        ]);
    }

    public function uploadPermis(Request $request)
    {
        $request->validate([
            'permis_conduire' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        $client = $request->user();

        if ($client->permis_conduire && \Storage::disk('public')->exists($client->permis_conduire)) {
            \Storage::disk('public')->delete($client->permis_conduire);
        }

        $file = $request->file('permis_conduire');
        $path = $file->store('permis', 'public');

        $client->update([
            'permis_conduire' => $path,
            'permis_statut' => 'en_attente',
            'permis_rejet_motif' => null,
        ]);

        return response()->json([
            'message' => 'Permis uploade avec succes',
            'permis_conduire' => $path,
        ]);
    }

    public function validerPermis(Request $request, $id)
    {
        $validated = $request->validate([
            'statut' => 'required|in:valide,rejete',
            'motif' => 'nullable|string|max:500',
        ]);

        $client = Client::findOrFail($id);

        // Un permis dont la date est depassee ne peut pas etre (re)valide :
        // le client doit d'abord corriger son profil.
        if ($validated['statut'] === 'valide' && $client->permisExpire()) {
            return response()->json([
                'message' => 'Impossible de valider : la date d\'expiration du permis est depassee. Le client doit mettre a jour son profil.',
            ], 422);
        }

        $update = ['permis_statut' => $validated['statut']];
        if ($validated['statut'] === 'rejete') {
            $update['permis_rejet_motif'] = $validated['motif'];
        } else {
            $update['permis_rejet_motif'] = null;
        }

        $client->update($update);

        if ($client->email) {
            QueuedMail::send(
                $client->email,
                new PermisValidation($client, $validated['statut'], $validated['motif'] ?? null),
                'validation-permis'
            );
        }

        return response()->json([
            'message' => 'Permis '.($validated['statut'] === 'valide' ? 'valide' : 'rejete'),
            'client' => $client,
        ]);
    }
}
