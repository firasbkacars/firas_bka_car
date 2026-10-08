<?php

namespace App\Mail;

use App\Models\Reservation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReservationReminder extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Reservation $reservation,
        public string $type, // '24h' or 'jour'
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->type === '24h'
            ? "Rappel : Votre vehicule {$this->reservation->vehicule->marque} {$this->reservation->vehicule->modele} est attendu demain"
            : 'Rappel : Jour de retour de votre vehicule';

        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: $this->buildHtml(),
        );
    }

    private function buildHtml(): string
    {
        $r = $this->reservation;
        $client = $r->client;
        $vehicule = $r->vehicule;

        $message = $this->type === '24h'
            ? 'Nous vous informons que votre vehicule sera disponible des demain.'
            : "Nous vous rappelons que aujourd'hui est le jour du retour de votre vehicule.";

        $dateInfo = $this->type === '24h'
            ? $r->date_debut->format('d/m/Y H:i')
            : $r->date_fin->format('d/m/Y H:i');

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <style>
                body { font-family: 'Helvetica', 'Arial', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { background: #dc2626; padding: 30px; text-align: center; }
                .header h1 { color: white; margin: 0; font-size: 24px; }
                .header p { color: rgba(255,255,255,0.8); margin: 5px 0 0; font-size: 14px; }
                .content { padding: 30px; }
                .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f5f5f5; }
                .info-label { color: #666; font-size: 13px; }
                .info-value { color: #1a1a1a; font-weight: 500; font-size: 13px; }
                .highlight-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0; }
                .footer { background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #eee; }
                .footer p { color: #999; font-size: 11px; margin: 3px 0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>FIRAS BKA CAR</h1>
                    <p>Rappel de reservation</p>
                </div>
                <div class='content'>
                    <p style='color: #333; font-size: 15px; margin-bottom: 20px;'>
                        Bonjour <strong>".e($client->nom_complet)."</strong>,
                    </p>
                    <p style='color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 25px;'>
                        {$message}
                    </p>

                    <div class='highlight-box'>
                        <p style='color: #dc2626; font-size: 18px; font-weight: bold; margin: 0;'>".e($vehicule->marque).' '.e($vehicule->modele)."</p>
                        <p style='color: #666; font-size: 13px; margin: 5px 0 0;'>Reservation {$r->numero}</p>
                    </div>

                    <div class='info-row'>
                        <span class='info-label'>Date prevue</span>
                        <span class='info-value'>{$dateInfo}</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>Lieu</span>
                        <span class='info-value'>".e($this->type === '24h' ? $r->lieu_prise : $r->lieu_retour)."</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>Statut</span>
                        <span class='info-value'>".ucfirst(str_replace('_', ' ', $r->statut))."</span>
                    </div>
                </div>
                <div class='footer'>
                    <p>Merci pour votre confiance - FIRAS BKA CAR</p>
                    <p>Branes 1, Lot 583N, 01 Rue 50 RDC - Tanger, Maroc</p>
                    <p>Tel: 06 81 18 18 13</p>
                </div>
            </div>
        </body>
        </html>";
    }
}
