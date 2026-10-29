<?php

namespace App\Http\Middleware;

use App\Support\Seo;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Empêche l'indexation des espaces privés et transactionnels.
 *
 * Le middleware couvre toutes les réponses (SPA, page de paiement sandbox,
 * redirections) alors que l'injection HTML ne s'applique qu'à l'index.html.
 * On ne met volontairement pas de Disallow dans robots.txt : les moteurs
 * doivent pouvoir lire le noindex avant que l'URL soit bloquée.
 */
class NoIndexPrivateRoutes
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (Seo::isPrivatePath($request->path())) {
            $response->headers->set('X-Robots-Tag', 'noindex, nofollow');
        }

        return $response;
    }
}
