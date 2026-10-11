<?php

namespace App\Jobs;

use App\Mail\ReservationConfirmation;
use App\Models\Reservation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendReservationConfirmation implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 60;

    public function __construct(
        public int $reservationId,
    ) {}

    public function handle(): void
    {
        $reservation = Reservation::with(['client', 'vehicule'])->find($this->reservationId);

        if (! $reservation || ! $reservation->client->email) {
            return;
        }

        Mail::to($reservation->client->email)
            ->send(new ReservationConfirmation($reservation));
    }

    /** Journalise l'echec definitif sans faire remonter d'exception. */
    public function failed(?\Throwable $e): void
    {
        Log::error('Confirmation de reservation non envoyee', [
            'reservation_id' => $this->reservationId,
            'error' => $e?->getMessage(),
        ]);
    }
}
