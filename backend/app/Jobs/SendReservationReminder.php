<?php

namespace App\Jobs;

use App\Mail\ReservationReminder;
use App\Models\Reservation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class SendReservationReminder implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(
        public int $reservationId,
        public string $type, // '24h' or 'jour'
    ) {}

    public function handle(): void
    {
        $reservation = Reservation::with(['client', 'vehicule'])->find($this->reservationId);

        if (!$reservation || !$reservation->client->email) {
            return;
        }

        if (!in_array($reservation->statut, ['confirmee', 'en_cours'])) {
            return;
        }

        Mail::to($reservation->client->email)
            ->send(new ReservationReminder($reservation, $this->type));
    }
}
