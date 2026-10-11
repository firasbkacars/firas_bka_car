<?php

use App\Http\Controllers\CmiSandboxController;
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

    return spaResponse();
});
