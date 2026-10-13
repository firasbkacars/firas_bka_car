<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Les taches sont cadencees par schedule:work (voir Dockerfile) : sans lui,
// ces envois ne partent jamais en production.
Schedule::command('reservations:reminders')->dailyAt('08:00')->withoutOverlapping();
Schedule::command('permis:verifier')->dailyAt('07:00')->withoutOverlapping();
Schedule::command('vehicules:contrats')->dailyAt('06:30')->withoutOverlapping();

// M3 : sante serveur (stockage, base, file) -> email admin si probleme.
Schedule::command('sante:verifier')->dailyAt('05:30')->withoutOverlapping();

// G3 : projection des prochaines maintenances (vidange, CT, pneus).
Schedule::command('vehicules:planifier-entretien')->weeklyOn(1, '06:00')->withoutOverlapping();
