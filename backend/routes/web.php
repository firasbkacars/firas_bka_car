<?php

use App\Http\Controllers\CmiSandboxController;
use App\Support\Seo;
use Illuminate\Support\Facades\Route;

/**
 * Sert l'SPA React (index.html) pour la racine et les routes internes React
 * Router (/vehicules/123, /admin, /client/profil...).
 * Nécessaire car `php artisan serve` (Docker/Render/Fly) ignore .htaccess.
 *
 * Le HTML initial reçoit les métadonnées de la route (titre, description,
 * canonical, Open Graph) : les crawlers qui n'exécutent pas JavaScript voient
 * au moins ces signaux, et les routes inconnues renvoient un vrai 404.
 */
if (! function_exists('spaResponse')) {
    function spaResponse(?array $resolution = null)
    {
        $resolution ??= Seo::resolve(request()->path());
        $meta = $resolution['meta'];
        $status = $resolution['status'];

        $path = public_path('index.html');

        if (is_file($path)) {
            $html = Seo::injectIntoHtml(
                (string) file_get_contents($path),
                $meta,
                $resolution['content'] ?? null,
                $resolution['data'] ?? null
            );

            $headers = [
                'Content-Type' => 'text/html; charset=UTF-8',
                'Cache-Control' => 'no-cache, must-revalidate',
            ];

            if (! empty($meta['noindex'])) {
                $headers['X-Robots-Tag'] = $meta['robots'];
            }

            return response($html, $status, $headers);
        }

        return view('welcome');
    }
}

Route::get('/', function () {
    return spaResponse();
});

/*
|--------------------------------------------------------------------------
| Sitemap XML
|--------------------------------------------------------------------------
| 13 URLs canoniques : accueil, flotte, 8 fiches véhicules, services,
| à-propos et contact. Le comparateur (contenu mince) et les routes privées
| sont exclus.
*/
Route::get('/sitemap.xml', function () {
    $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";

    foreach (Seo::sitemapUrls() as $url) {
        $xml .= "  <url>\n";
        $xml .= '    <loc>'.htmlspecialchars($url['loc'], ENT_XML1 | ENT_QUOTES, 'UTF-8')."</loc>\n";

        if (! empty($url['lastmod'])) {
            $xml .= '    <lastmod>'.htmlspecialchars($url['lastmod'], ENT_XML1 | ENT_QUOTES, 'UTF-8')."</lastmod>\n";
        }

        $xml .= '    <changefreq>'.$url['changefreq']."</changefreq>\n";
        $xml .= '    <priority>'.$url['priority']."</priority>\n";
        $xml .= "  </url>\n";
    }

    $xml .= '</urlset>';

    return response($xml, 200, [
        'Content-Type' => 'application/xml; charset=UTF-8',
        'Cache-Control' => 'public, max-age=3600',
    ]);
})->name('sitemap');

/*
|--------------------------------------------------------------------------
| Page de paiement simulee (CMI sandbox)
|--------------------------------------------------------------------------
| Doit etre declaree AVANT le fallback SPA, sinon React sert l'index.html.
| Le controleur renvoie 404 quand config('cmi.mode') !== 'sandbox'.
*/
Route::get('/paiement/sandbox/{transactionId}', [CmiSandboxController::class, 'show'])
    ->name('cmi.sandbox.show');
Route::post('/paiement/sandbox/{transactionId}', [CmiSandboxController::class, 'choose'])
    ->name('cmi.sandbox.choose');

Route::fallback(function () {
    if (request()->is('api/*') || request()->expectsJson()) {
        abort(404);
    }

    // Un asset manquant (bundle d'un deploiement precedent encore ouvert dans
    // un onglet) doit renvoyer un vrai 404. Servir index.html avec un 200
    // provoque une erreur MIME opaque : "text/html is not a supported
    // stylesheet MIME type".
    if (request()->is('assets/*') || pathinfo(request()->path(), PATHINFO_EXTENSION) !== '') {
        abort(404);
    }

    // Route inconnue -> 404 réel, véhicule supprimé connu -> 410, route
    // privée -> 200 mais noindex. Le corps reste l'SPA pour que React affiche
    // sa page d'erreur, mais le statut HTTP est correct pour les crawlers.
    return spaResponse(Seo::resolve(request()->path()));
});
