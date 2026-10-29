<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Redirige le sous-domaine www vers le domaine canonique.
 *
 * Les jetons d'authentification vivent dans localStorage : deux origines
 * (www et apex) impliquent donc deux sessions distinctes. On garde une seule
 * origine pour eviter une deconnexion apparente d'une page a l'autre.
 */
class RedirectToCanonicalHost
{
    public function handle(Request $request, Closure $next): Response
    {
        $canonical = config('app.canonical_host');
        $host = $request->getHost();

        if (
            is_string($canonical) && $canonical !== ''
            && $host === 'www.'.$canonical
            && in_array($request->method(), ['GET', 'HEAD'], true)
        ) {
            return redirect()->away('https://'.$canonical.$request->getRequestUri(), 301);
        }

        return $next($request);
    }
}
