<?php

namespace App\Mail;

use App\Models\Client;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * P3 : rappel envoye au client avant l'expiration de son permis.
 * Un seul envoi par expiration (marqueur permis_rappel_envoye_le).
 */
class PermisExpirationReminder extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Client $client,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Votre permis de conduire arrive a expiration',
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
        $c = $this->client;
        $expiration = $c->date_expiration_permis?->format('d/m/Y') ?? 'inconnue';
        $jours = $c->date_expiration_permis
            ? (int) now()->startOfDay()->diffInDays($c->date_expiration_permis->startOfDay(), false)
            : 0;

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
                .content p { color: #444; font-size: 14px; line-height: 1.6; }
                .highlight { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 8px; padding: 14px; font-size: 15px; text-align: center; margin: 18px 0; }
                .button { display: block; width: 100%; box-sizing: border-box; text-align: center; background: #dc2626; color: white; text-decoration: none; padding: 12px; border-radius: 8px; font-weight: bold; margin-top: 18px; }
                .footer { background: #f9fafb; padding: 15px 25px; text-align: center; border-top: 1px solid #eee; }
                .footer p { color: #999; font-size: 10px; margin: 2px 0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>FIRAS BKA CAR</h1>
                    <p>Permis de conduire</p>
                </div>
                <div class='content'>
                    <p>Bonjour ".e($c->nom_complet).",</p>
                    <p>Votre permis de conduire expire le <strong>{$expiration}</strong>.</p>
                    <div class='highlight'>
                        ".($jours > 0 ? "Plus que {$jours} jour(s)." : "Il expire aujourd'hui.")."
                        <br><small>Une fois expire, vous ne pourrez plus reserver de vehicule.</small>
                    </div>
                    <p>Pour continuer a louer, mettez a jour la date de validite de votre permis depuis votre profil et faites le verifier par un agent.</p>
                    <a class='button' href='".e(config('app.url'))."/client/profil'>Mettre a jour mon permis</a>
                </div>
                <div class='footer'>
                    <p>FIRAS BKA CAR</p>
                </div>
            </div>
        </body>
        </html>";
    }
}
