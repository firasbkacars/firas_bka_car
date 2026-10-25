<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class FactureController extends Controller
{
    public function download($reservationId, Request $request)
    {
        $client = $request->user();

        $reservation = Reservation::with(['client', 'vehicule', 'paiements'])
            ->where('id', $reservationId)
            ->where('client_id', $client->id)
            ->firstOrFail();

        $pdf = Pdf::loadView('pdf.facture', ['reservation' => $reservation]);

        return $pdf->download('facture-'.$reservation->numero.'.pdf');
    }

    public function preview($reservationId, Request $request)
    {
        $client = $request->user();

        $reservation = Reservation::with(['client', 'vehicule', 'paiements'])
            ->where('id', $reservationId)
            ->where('client_id', $client->id)
            ->firstOrFail();

        $pdf = Pdf::loadView('pdf.facture', ['reservation' => $reservation]);

        return $pdf->stream('facture-'.$reservation->numero.'.pdf');
    }

    public function downloadContrat($reservationId, Request $request)
    {
        $reservation = $this->reservationContratAutorisee($reservationId, $request->user());

        return $this->contratPdf($reservation)
            ->download($this->nomFichierContrat($reservation));
    }

    public function previewContrat($reservationId, Request $request)
    {
        $reservation = $this->reservationContratAutorisee($reservationId, $request->user());

        return $this->contratPdf($reservation)
            ->stream($this->nomFichierContrat($reservation));
    }

    /**
     * L'admin imprime le contrat depuis la fiche reservation pour le
     * faire cacheter et signer lors de la remise du vehicule.
     */
    public function adminContrat($reservationId)
    {
        $reservation = $this->reservationContrat($reservationId);

        return $this->contratPdf($reservation)
            ->download($this->nomFichierContrat($reservation));
    }

    public function adminContratPreview($reservationId)
    {
        $reservation = $this->reservationContrat($reservationId);

        return $this->contratPdf($reservation)
            ->stream($this->nomFichierContrat($reservation));
    }

    private function reservationContrat(int $reservationId): Reservation
    {
        return Reservation::with(['client', 'vehicule', 'agence', 'paiements'])
            ->findOrFail($reservationId);
    }

    private function reservationContratAutorisee(int $reservationId, $user): Reservation
    {
        $reservation = $this->reservationContrat($reservationId);

        if ($user instanceof User) {
            return $reservation;
        }

        if ($user && $user->id === $reservation->client_id) {
            return $reservation;
        }

        abort(403);
    }

    private function contratPdf(Reservation $reservation)
    {
        return Pdf::loadView('pdf.contrat', ['reservation' => $reservation]);
    }

    private function nomFichierContrat(Reservation $reservation): string
    {
        $numero = $reservation->numero_contrat ?: 'CTR-'.$reservation->numero;

        return 'contrat-location-'.$numero.'.pdf';
    }
}
