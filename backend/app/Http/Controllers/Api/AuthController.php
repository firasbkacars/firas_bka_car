<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    private const MAX_ATTEMPTS = 5;
    private const LOCKOUT_MINUTES = 15;

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $email = $credentials['email'];
        $ip = $request->ip();

        $lockKey = "login_lock:admin:{$ip}";
        $attemptsKey = "login_attempts:admin:{$ip}";

        if (Cache::has($lockKey)) {
            $ttl = Cache::get($lockKey);
            return response()->json([
                'message' => 'Trop de tentatives. Reessayez dans ' . self::LOCKOUT_MINUTES . ' minutes.',
                'locked_until' => $ttl,
            ], 429);
        }

        if (!Auth::attempt($credentials)) {
            $attempts = Cache::increment($attemptsKey);

            if ($attempts === 1) {
                Cache::put($attemptsKey, 1, now()->addMinutes(self::LOCKOUT_MINUTES));
            }

            Log::warning('Admin login failed', [
                'email' => $email,
                'ip' => $ip,
                'attempts' => $attempts,
            ]);

            if ($attempts >= self::MAX_ATTEMPTS) {
                Cache::put($lockKey, now()->addMinutes(self::LOCKOUT_MINUTES), now()->addMinutes(self::LOCKOUT_MINUTES));
                Cache::forget($attemptsKey);

                Log::warning('Admin account locked', [
                    'email' => $email,
                    'ip' => $ip,
                ]);
            }

            return response()->json(['message' => 'Identifiants incorrects'], 401);
        }

        Cache::forget($attemptsKey);

        $user = Auth::user();
        $token = $user->createToken('admin-token')->plainTextToken;

        Log::info('Admin login successful', [
            'user_id' => $user->id,
            'ip' => $ip,
        ]);

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Deconnecte']);
    }

    public function user(Request $request)
    {
        return response()->json($request->user());
    }
}
