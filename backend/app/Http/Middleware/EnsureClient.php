<?php

namespace App\Http\Middleware;

use App\Models\Client;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureClient
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() instanceof Client) {
            return response()->json([
                'message' => 'Acces reserve aux clients',
            ], 403);
        }

        return $next($request);
    }
}
