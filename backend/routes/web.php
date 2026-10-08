<?php

use Illuminate\Support\Facades\Route;

/**
 * Sert l'SPA React (index.html) pour la racine et toutes les routes
 * internes React Router (/vehicules/123, /admin, /client/profil...).
 * Nécessaire car `php artisan serve` (Docker/Render/Fly) ignore .htaccess.
 */
if (! function_exists('spaResponse')) {
    function spaResponse()
    {
        $path = public_path('index.html');

        if (is_file($path)) {
            return response(file_get_contents($path), 200, [
                'Content-Type' => 'text/html; charset=UTF-8',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
            ]);
        }

        return view('welcome');
    }
}

Route::get('/', function () {
    return spaResponse();
});

Route::fallback(function () {
    if (request()->is('api/*') || request()->expectsJson()) {
        abort(404);
    }

    return spaResponse();
});
