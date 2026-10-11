<?php

use App\Http\Controllers\Api\AgenceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AviController;
use App\Http\Controllers\Api\ClientAuthController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\CmiPaymentController;
use App\Http\Controllers\Api\CodePromoController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EmailVerificationController;
use App\Http\Controllers\Api\EtatLieuController;
use App\Http\Controllers\Api\FactureController;
use App\Http\Controllers\Api\FavoriController;
use App\Http\Controllers\Api\FideliteController;
use App\Http\Controllers\Api\MaintenanceController;
use App\Http\Controllers\Api\PaiementController;
use App\Http\Controllers\Api\ParametreController;
use App\Http\Controllers\Api\ReservationController;
use App\Http\Controllers\Api\VehiculeController;
use App\Http\Controllers\Api\VehiculePhotoController;
use App\Http\Controllers\Api\WhatsAppController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes publiques (pas d'auth)
|--------------------------------------------------------------------------
*/

Route::post('/admin/login', [AuthController::class, 'login'])
    ->middleware('throttle:30,1');

Route::post('/client/register', [ClientAuthController::class, 'register'])
    ->middleware('throttle:3,1');
Route::post('/client/login', [ClientAuthController::class, 'login'])
    ->middleware('throttle:5,1');

Route::get('/vehicules', [VehiculeController::class, 'index'])
    ->middleware('throttle:60,1');
Route::get('/vehicules/{id}', [VehiculeController::class, 'show'])
    ->middleware('throttle:60,1');
Route::get('/vehicules/{id}/disponibilite', [VehiculeController::class, 'disponibilite'])
    ->middleware('throttle:30,1');
Route::get('/vehicules/{id}/avis', [AviController::class, 'vehiculeAvis'])
    ->middleware('throttle:30,1');

Route::get('/agences', [AgenceController::class, 'indexActive'])
    ->middleware('throttle:60,1');

// Parametres publics (taux d'acompte, delais d'annulation...) utilises
// par la page de finalisation avant authentification.
Route::get('/parametres', [ParametreController::class, 'index'])
    ->middleware('throttle:60,1');

Route::post('/reservations', [ReservationController::class, 'store'])
    ->middleware(['auth:sanctum', 'client', 'throttle:10,1']);

Route::post('/avis', [AviController::class, 'store'])
    ->middleware(['auth:sanctum', 'client', 'throttle:5,1']);

Route::post('/code-promo/verify', [CodePromoController::class, 'verify'])
    ->middleware('throttle:10,1');

Route::post('/contact', [ContactController::class, 'store'])
    ->middleware('throttle:5,1');

Route::post('/cmi/webhook', [CmiPaymentController::class, 'webhook'])
    ->middleware('throttle:30,1');
Route::get('/cmi/callback', [CmiPaymentController::class, 'callback']);
Route::get('/cmi/cancel', [CmiPaymentController::class, 'cancel']);

Route::get('/client/verify-email/{token}', [EmailVerificationController::class, 'verify'])
    ->middleware('throttle:10,1');

/*
|--------------------------------------------------------------------------
| Routes client authentifie
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function () {
    Route::middleware('client')->group(function () {
        // Client auth
        Route::post('/client/logout', [ClientAuthController::class, 'logout']);
        Route::get('/client/profile', [ClientAuthController::class, 'profile']);
        Route::put('/client/profile', [ClientAuthController::class, 'updateProfile']);
        Route::post('/client/permis', [ClientAuthController::class, 'uploadPermis']);
        Route::post('/client/photo', [ClientAuthController::class, 'uploadPhoto']);
        Route::get('/client/reservations', [ReservationController::class, 'mesReservations']);

        // Client favoris (U9)
        Route::get('/client/favoris', [FavoriController::class, 'index']);
        Route::post('/client/favoris', [FavoriController::class, 'toggle']);
        Route::delete('/client/favoris/{vehiculeId}', [FavoriController::class, 'destroy']);

        // Client email verification
        Route::post('/client/send-verification', [EmailVerificationController::class, 'send']);
        Route::get('/client/verification-status', [EmailVerificationController::class, 'status']);

        // Client factures
        Route::get('/client/reservations/{id}/facture', [FactureController::class, 'download']);
        Route::get('/client/reservations/{id}/facture/preview', [FactureController::class, 'preview']);
        Route::get('/client/reservations/{id}/contrat', [FactureController::class, 'downloadContrat']);

        // Client fidelite
        Route::get('/client/fidelite', [FideliteController::class, 'show']);

        // Client annulation
        Route::put('/client/reservations/{id}/annuler', [ReservationController::class, 'annulerParClient']);
        Route::get('/client/reservations/{id}/annulation-preview', [ReservationController::class, 'apercuAnnulation']);

        // Client prolongation
        Route::put('/client/reservations/{id}/prolonger', [ReservationController::class, 'prolonger']);

        // Client CMI payment
        Route::post('/client/payments/cmi/initialize', [CmiPaymentController::class, 'initialize']);
        Route::post('/client/payments/cmi/verify', [CmiPaymentController::class, 'verify']);
        Route::get('/client/payments/cmi/status/{transactionId}', [CmiPaymentController::class, 'status']);
    });

    // Detail reservation (proprietaire ou admin)
    Route::get('/reservations/{numero}', [ReservationController::class, 'show']);
});

/*
|--------------------------------------------------------------------------
| Routes admin (auth:sanctum + admin middleware)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    // Admin auth
    Route::post('/admin/logout', [AuthController::class, 'logout']);
    Route::get('/admin/user', [AuthController::class, 'user']);

    // Admin dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/reservations-recentes', [DashboardController::class, 'reservationsRecentes']);
    Route::get('/dashboard/revenus', [DashboardController::class, 'revenus']);
    Route::get('/dashboard/repartition-vehicules', [DashboardController::class, 'repartitionVehicules']);
    Route::get('/dashboard/rappels', [DashboardController::class, 'rappels']);
    Route::get('/dashboard/taux-occupation', [DashboardController::class, 'tauxOccupation']);

    // Admin CRUD vehicules
    Route::apiResource('vehicules-admin', VehiculeController::class)->except(['index', 'show']);
    Route::post('/vehicules-admin/{id}/photos', [VehiculePhotoController::class, 'upload']);
    Route::delete('/vehicules-admin/{id}/photos', [VehiculePhotoController::class, 'delete']);
    Route::put('/vehicules-admin/{id}/photos/reorder', [VehiculePhotoController::class, 'reorder']);

    // Admin CRUD clients
    Route::apiResource('clients', ClientController::class)->except(['store']);

    // Admin reservations
    Route::apiResource('reservations-admin', ReservationController::class)->except(['store', 'show']);
    Route::get('/reservations', [ReservationController::class, 'index']);
    Route::put('/reservations/{id}/annuler', [ReservationController::class, 'annuler']);
    Route::put('/reservations/{id}/caution', [ReservationController::class, 'updateCaution']);
    Route::put('/reservations-admin/{id}/prolonger', [ReservationController::class, 'prolonger']);

    // Admin paiements
    Route::post('/paiements', [PaiementController::class, 'store'])
        ->middleware('throttle:30,1');
    Route::post('/paiements/{id}/rembourser', [PaiementController::class, 'rembourser'])
        ->middleware('throttle:30,1');
    Route::get('/paiements', [PaiementController::class, 'index']);
    Route::get('/paiements/export', [PaiementController::class, 'export']);
    Route::get('/paiements/{id}', [PaiementController::class, 'show']);

    // Admin avis
    Route::get('/avis', [AviController::class, 'index']);

    // Admin maintenance
    Route::apiResource('maintenances', MaintenanceController::class);
    Route::get('/maintenances-a-venir', [MaintenanceController::class, 'aVenir']);

    // Admin agences
    // NOTE: l'index public GET /agences (indexActive) est deja enregistre plus haut.
    // RouteCollection indexe par methode+URI : un second GET /agences l'ecraserait.
    // L'admin a donc sa propre liste (toutes agences + vehicules_count).
    Route::get('/agences-admin', [AgenceController::class, 'index']);
    Route::apiResource('agences', AgenceController::class)->except(['index']);

    // WhatsApp (admin only)
    Route::post('/whatsapp/send', [WhatsAppController::class, 'sendMessage']);
    Route::get('/whatsapp/conversations', [WhatsAppController::class, 'conversations']);
    Route::get('/whatsapp/conversation/{phone}', [WhatsAppController::class, 'conversation']);

    // Admin - Validation permis
    Route::put('/clients/{id}/permis', [ClientAuthController::class, 'validerPermis']);

    // Admin - Parametres
    // GET /parametres est public (enregistre plus haut) : seul l'ecriture reste admin.
    Route::put('/parametres', [ParametreController::class, 'update']);

    // Admin - Etats des lieux
    Route::get('/etats-lieux', [EtatLieuController::class, 'index']);
    Route::post('/etats-lieux', [EtatLieuController::class, 'store']);
    Route::get('/etats-lieux/{id}', [EtatLieuController::class, 'show']);
    Route::post('/upload/etat-lieu-photo', function (Request $request) {
        $request->validate([
            'photo' => 'required|file|mimes:jpg,jpeg,png|max:10240',
        ]);
        $file = $request->file('photo');
        $path = $file->store('etats-lieux', 'public');

        return response()->json(['url' => '/storage/'.$path]);
    });

    // Admin - Codes promo CRUD
    Route::get('/codes-promo', [CodePromoController::class, 'index']);
    Route::post('/codes-promo', [CodePromoController::class, 'store']);
    Route::put('/codes-promo/{id}', [CodePromoController::class, 'update']);
    Route::delete('/codes-promo/{id}', [CodePromoController::class, 'destroy']);
    Route::get('/codes-promo/{id}/stats', [CodePromoController::class, 'stats']);
});

/*
|--------------------------------------------------------------------------
| Routes publiques (webhook, etc.)
|--------------------------------------------------------------------------
*/

Route::post('/whatsapp/webhook', [WhatsAppController::class, 'webhook']);
Route::get('/whatsapp/webhook', [WhatsAppController::class, 'webhook']);
