<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * M2 : monitoring performance leger (sans dependance externe).
 * Mesure la duree de chaque requete, l'expose en en-tete X-Response-Time
 * et journalise un warning au-dela du seuil config('app.slow_request_ms').
 * New Relic reste compatible : si l'extension PHP est presente, elle
 * mesure elle-meme les memes requetes.
 */
class LogSlowRequests
{
    public function handle(Request $request, Closure $next): Response
    {
        $start = hrtime(true);

        /** @var Response $response */
        $response = $next($request);

        $ms = (hrtime(true) - $start) / 1e6;
        $response->headers->set('X-Response-Time', round($ms, 1).' ms');

        $seuil = (float) config('app.slow_request_ms', 500);

        if ($ms >= $seuil && ! $request->is('up')) {
            Log::warning('Requete lente', [
                'method' => $request->method(),
                'path' => $request->path(),
                'ms' => round($ms, 1),
                'status' => $response->getStatusCode(),
            ]);
        }

        return $response;
    }
}
