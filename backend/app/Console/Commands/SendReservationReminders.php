<?php

namespace App\Console\Commands;

use App\Jobs\SendReservationReminder;
use App\Models\Reservation;
use Illuminate\Console\Command;

class SendReservationReminders extends Command
{
    protected $signature = 'reservations:reminders';
    protected $description = 'Send reservation reminders (24h before pickup and day of return)';

    public function handle(): int
    {
        $tomorrow = now()->addDay()->startOfDay();
        $tomorrowEnd = now()->addDay()->endOfDay();

        $reservationsTomorrow = Reservation::with(['client', 'vehicule'])
            ->where('date_debut', '>=', $tomorrow)
            ->where('date_debut', '<=', $tomorrowEnd)
            ->whereIn('statut', ['confirmee', 'en_cours'])
            ->get();

        foreach ($reservationsTomorrow as $reservation) {
            SendReservationReminder::dispatch($reservation->id, '24h');
        }

        $this->info("Sent {$reservationsTomorrow->count()} 24h reminders");

        $todayStart = now()->startOfDay();
        $todayEnd = now()->endOfDay();

        $reservationsToday = Reservation::with(['client', 'vehicule'])
            ->where('date_fin', '>=', $todayStart)
            ->where('date_fin', '<=', $todayEnd)
            ->where('statut', 'en_cours')
            ->get();

        foreach ($reservationsToday as $reservation) {
            SendReservationReminder::dispatch($reservation->id, 'jour');
        }

        $this->info("Sent {$reservationsToday->count()} day-of-return reminders");

        return Command::SUCCESS;
    }
}
