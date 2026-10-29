<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Redirige les hôtes secondaires vers le domaine canonique.
 *
 * Les jetons d'authentification vivent dans localStorage : deux origines
 * (www, fly.dev, apex) impliquent donc deux sessions distinctes. On garde une
 * seule origine pour éviter une déconnexion apparente d'une page à l'autre et
 * pour éviter le contenu dupliqué dans les moteurs de recherche.
 */
class RedirectToCanonicalHost
{
    public function handle(Request $request, Closure $next): Response
    {
        $canonical = config('app.canonical_host');
        $host = $request->getHost();

        if (! is_string($canonical) || $canonical === '' || $host === $canonical) {
            return $next($request);
        }

        $isWww = $host === 'www.'.$canonical;
        $isPlatformHost = str_ends_with($host, '.fly.dev')
            || str_ends_with($host, '.onrender.com');

        if (
            ($isWww || $isPlatformHost)
            && in_array($request->method(), ['GET', 'HEAD'], true)
        ) {
            return redirect()->away('https://'.$canonical.$request->getRequestUri(), 301);
        }

        return $next($request);
    }
}
