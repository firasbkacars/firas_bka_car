<?php

use App\Http\Middleware\AdminMiddleware;
use App\Http\Middleware\EnsureClient;
use App\Http\Middleware\LogSlowRequests;
use App\Http\Middleware\RedirectToCanonicalHost;
use App\Http\Middleware\SanitizeStrings;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;
use Sentry\Laravel\Integration;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        // Sans cette redirection, une requete API sans token tente de generer
        // route('login') et renvoie 500 au lieu d'un 401 JSON.
        $middleware->redirectGuestsTo(
            fn (Request $request) => $request->is('api/*') ? null : '/client/login'
        );

        $middleware->statefulApi();

        $middleware->api(prepend: [
            HandleCors::class,
            SecurityHeaders::class,
            SanitizeStrings::class,
            LogSlowRequests::class,
        ]);

        $middleware->web(prepend: [
            RedirectToCanonicalHost::class,
            SecurityHeaders::class,
            LogSlowRequests::class,
        ]);

        $middleware->alias([
            'admin' => AdminMiddleware::class,
            'client' => EnsureClient::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // M1 : remonte les exceptions non gerees a Sentry (no-op sans DSN).
        Integration::handles($exceptions);

        $exceptions->shouldRenderJsonWhen(
            fn ($request, $throwable) => $request->is('api/*') || $request->expectsJson()
        );
    })->create();
