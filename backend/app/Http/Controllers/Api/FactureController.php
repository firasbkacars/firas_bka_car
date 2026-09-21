<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Reservation;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class FactureController extends Controller
{
    public function download($reservationId, Request $request)
    {
        $client = $request->user();

        $reservation = Reservation::with(['client', 'vehicule'])
            ->where('id', $reservationId)
            ->where('client_id', $client->id)
            ->firstOrFail();

        $pdf = Pdf::loadView('pdf.facture', ['reservation' => $reservation]);

        return $pdf->download('facture-' . $reservation->numero . '.pdf');
    }

    public function preview($reservationId, Request $request)
    {
        $client = $request->user();

        $reservation = Reservation::with(['client', 'vehicule'])
            ->where('id', $reservationId)
            ->where('client_id', $client->id)
            ->firstOrFail();

        $pdf = Pdf::loadView('pdf.facture', ['reservation' => $reservation]);

        return $pdf->inline('facture-' . $reservation->numero . '.pdf');
    }

    public function downloadContrat($reservationId, Request $request)
    {
        $user = $request->user();

        $reservation = Reservation::with(['client', 'vehicule'])
            ->where('id', $reservationId)
            ->firstOrFail();

        if ($user instanceof User) {
            // Admin can access any contract
        } elseif ($user->id === $reservation->client_id) {
            // Owner can access their own contract
        } else {
            abort(403);
        }

        $pdf = Pdf::loadView('pdf.contrat', ['reservation' => $reservation]);

        return $pdf->download('contrat-location-' . $reservation->numero . '.pdf');
    }
}
