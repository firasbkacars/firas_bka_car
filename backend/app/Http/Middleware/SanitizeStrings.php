<?php

namespace App\Http\Middleware;

use App\Support\Sanitize;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * D3 : assainit toutes les chaines de texte recues par l'API.
 * Les mots de passe et emails sont exclus (valides tels quels par les regles).
 */
class SanitizeStrings
{
    private const EXCLUDED = ['password', 'password_confirmation', 'email'];

    public function handle(Request $request, Closure $next): Response
    {
        $cleaned = [];

        foreach ($request->input() as $key => $value) {
            if (in_array($key, self::EXCLUDED, true)) {
                continue;
            }

            $cleaned[$key] = Sanitize::deep($value);
        }

        if ($cleaned !== []) {
            $request->merge($cleaned);
        }

        return $next($request);
    }
}
