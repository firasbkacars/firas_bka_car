<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginClientRequest;
use App\Http\Requests\RegisterClientRequest;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Password;

class ClientAuthController extends Controller
{
    private const MAX_ATTEMPTS = 5;
    private const LOCKOUT_MINUTES = 15;

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

        $token = $client->createToken('client-token')->plainTextToken;

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
                'message' => 'Trop de tentatives. Reessayez dans ' . self::LOCKOUT_MINUTES . ' minutes.',
                'locked_until' => $ttl,
            ], 429);
        }

        $client = Client::where('email', $email)->first();

        if (!$client || !Hash::check($validated['password'], $client->password)) {
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

        $token = $client->createToken('client-token')->plainTextToken;

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
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté']);
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
            'email' => 'sometimes|email:rfc,dns|max:255',
            'cin' => 'nullable|string|regex:/^[A-Z]{2}\d{6}$/|max:20',
            'adresse' => 'nullable|string|max:255',
        ]);

        $client->update($validated);

        return response()->json($client);
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

        $update = ['permis_statut' => $validated['statut']];
        if ($validated['statut'] === 'rejete') {
            $update['permis_rejet_motif'] = $validated['motif'];
        } else {
            $update['permis_rejet_motif'] = null;
        }

        $client->update($update);

        if ($client->email) {
            try {
                \Illuminate\Support\Facades\Mail::to($client->email)
                    ->send(new \App\Mail\PermisValidation($client, $validated['statut'], $validated['motif'] ?? null));
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Failed to send permis validation email', ['error' => $e->getMessage()]);
            }
        }

        return response()->json([
            'message' => 'Permis ' . ($validated['statut'] === 'valide' ? 'valide' : 'rejete'),
            'client' => $client,
        ]);
    }
}
