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
