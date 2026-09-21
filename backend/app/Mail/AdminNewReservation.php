<?php

namespace App\Mail;

use App\Models\Reservation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminNewReservation extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Reservation $reservation,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Nouvelle reservation - {$this->reservation->numero}",
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

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <style>
                body { font-family: 'Helvetica', 'Arial', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { background: #dc2626; padding: 25px; text-align: center; }
                .header h1 { color: white; margin: 0; font-size: 20px; }
                .header p { color: rgba(255,255,255,0.8); margin: 5px 0 0; font-size: 13px; }
                .content { padding: 25px; }
                .section { margin-bottom: 20px; }
                .section-title { font-size: 12px; font-weight: bold; color: #dc2626; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
                .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f5f5f5; }
                .info-label { color: #666; font-size: 12px; }
                .info-value { color: #1a1a1a; font-weight: 500; font-size: 12px; }
                .footer { background: #f9fafb; padding: 15px 25px; text-align: center; border-top: 1px solid #eee; }
                .footer p { color: #999; font-size: 10px; margin: 2px 0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>FIRAS BKA CAR</h1>
                    <p>Nouvelle reservation recue</p>
                </div>
                <div class='content'>
                    <div class='section'>
                        <div class='section-title'>Numero</div>
                        <p style='text-align: center; font-size: 18px; font-weight: bold; color: #dc2626;'>{$r->numero}</p>
                    </div>

                    <div class='section'>
                        <div class='section-title'>Client</div>
                        <div class='info-row'>
                            <span class='info-label'>Nom</span>
                            <span class='info-value'>".e($client->nom_complet)."</span>
                        </div>
                        <div class='info-row'>
                            <span class='info-label'>Email</span>
                            <span class='info-value'>".e($client->email)."</span>
                        </div>
                        <div class='info-row'>
                            <span class='info-label'>Telephone</span>
                            <span class='info-value'>".e($client->telephone)."</span>
                        </div>
                    </div>

                    <div class='section'>
                        <div class='section-title'>Vehicule</div>
                        <div class='info-row'>
                            <span class='info-label'>Vehicule</span>
                            <span class='info-value'>".e($vehicule->marque).' '.e($vehicule->modele)."</span>
                        </div>
                        <div class='info-row'>
                            <span class='info-label'>Dates</span>
                            <span class='info-value'>{$r->date_debut->format('d/m')} - {$r->date_fin->format('d/m/Y')}</span>
                        </div>
                        <div class='info-row'>
                            <span class='info-label'>Montant total</span>
                            <span class='info-value'>{$r->prix_total} DH</span>
                        </div>
                        <div class='info-row'>
                            <span class='info-label'>Acompte</span>
                            <span class='info-value'>{$r->acompte} DH</span>
                        </div>
                    </div>
                </div>
                <div class='footer'>
                    <p>FIRAS BKA CAR - Admin</p>
                </div>
            </div>
        </body>
        </html>";
    }
}
