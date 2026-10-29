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
 * Invitation a activer un compte cree par un agent (reservation telephone).
 */
class InvitationCompte extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Client $client,
        public string $activationUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Activez votre compte - FIRAS BKA CAR',
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
        $client = $this->client;
        $url = e($this->activationUrl);
        $nom = e($client->nom_complet);

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
                .content { padding: 30px; text-align: center; }
                .btn { display: inline-block; background: #dc2626; color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0; }
                .footer { background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #eee; }
                .footer p { color: #999; font-size: 11px; margin: 3px 0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>FIRAS BKA CAR</h1>
                </div>
                <div class='content'>
                    <h2 style='color: #333; margin-bottom: 15px;'>Bonjour {$nom},</h2>
                    <p style='color: #666; font-size: 14px; line-height: 1.6;'>
                        Votre reservation a ete enregistree par notre equipe. Un compte client a ete cree
                        a votre nom pour suivre vos reservations et transmettre vos documents.
                    </p>
                    <p style='color: #666; font-size: 14px; line-height: 1.6;'>
                        Cliquez sur le bouton ci-dessous pour definir votre mot de passe et activer votre compte.
                    </p>
                    <a href='{$url}' class='btn'>Activer mon compte</a>
                    <p style='color: #999; font-size: 12px; margin-top: 20px;'>
                        Ce lien est valable 7 jours et ne peut etre utilise qu'une seule fois.<br>
                        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
                        <a href='{$url}' style='color: #dc2626;'>{$url}</a>
                    </p>
                    <p style='color: #999; font-size: 12px; margin-top: 20px;'>
                        Si vous n'etes pas a l'origine de cette reservation, ignorez simplement cet email.
                    </p>
                </div>
                <div class='footer'>
                    <p>FIRAS BKA CAR - Location de vehicules</p>
                    <p>Tel: +212 603 477 786</p>
                </div>
            </div>
        </body>
        </html>";
    }
}
