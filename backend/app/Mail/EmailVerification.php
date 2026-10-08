<?php

namespace App\Mail;

use App\Models\Client;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EmailVerification extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Client $client,
        public string $verificationUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Verifier votre email - FIRAS BKA CAR',
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
        $url = $this->verificationUrl;

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
                    <h2 style='color: #333; margin-bottom: 15px;'>Bienvenue ".e($client->nom_complet)." !</h2>
                    <p style='color: #666; font-size: 14px; line-height: 1.6;'>
                        Merci pour votre inscription. Veuillez cliquer sur le bouton ci-dessous pour verifier votre adresse email.
                    </p>
                    <a href='{$url}' class='btn'>Verifier mon email</a>
                    <p style='color: #999; font-size: 12px; margin-top: 20px;'>
                        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
                        <a href='{$url}' style='color: #dc2626;'>{$url}</a>
                    </p>
                </div>
                <div class='footer'>
                    <p>FIRAS BKA CAR - Location de vehicules</p>
                    <p>Tel: 06 81 18 18 13</p>
                </div>
            </div>
        </body>
        </html>";
    }
}
