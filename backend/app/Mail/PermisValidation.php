<?php

namespace App\Mail;

use App\Models\Client;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PermisValidation extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Client $client,
        public string $statut,
        public ?string $motif = null,
    ) {}

    public function envelope(): Envelope
    {
        $statutText = $this->statut === 'valide' ? 'valide' : 'rejete';

        return new Envelope(
            subject: "Votre permis a ete {$statutText} - FIRAS BKA CAR",
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
        $isValide = $this->statut === 'valide';
        $color = $isValide ? '#16a34a' : '#dc2626';
        $bgColor = $isValide ? '#f0fdf4' : '#fef2f2';
        $borderColor = $isValide ? '#bbf7d0' : '#fecaca';
        $statutText = $isValide ? 'valide' : 'rejete';

        $motifHtml = '';
        if (! $isValide && $this->motif) {
            $motifHtml = "
            <div style='background: {$bgColor}; border: 1px solid {$borderColor}; border-radius: 8px; padding: 15px; margin: 15px 0;'>
                <p style='color: #666; font-size: 12px; margin: 0 0 5px;'>Motif du rejet :</p>
                <p style='color: {$color}; font-size: 14px; margin: 0; font-weight: 500;'>".e($this->motif).'</p>
            </div>';
        }

        $message = $isValide
            ? 'Votre permis de conduire a ete valide avec succes. Vous pouvez maintenant effectuer des reservations.'
            : 'Votre permis de conduire a ete rejete. Vous ne pourrez pas effectuer de reservations tant que votre permis n\'est pas valide.';

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <style>
                body { font-family: 'Helvetica', 'Arial', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { background: {$color}; padding: 25px; text-align: center; }
                .header h1 { color: white; margin: 0; font-size: 20px; }
                .content { padding: 25px; }
                .footer { background: #f9fafb; padding: 15px 25px; text-align: center; border-top: 1px solid #eee; }
                .footer p { color: #999; font-size: 10px; margin: 2px 0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>FIRAS BKA CAR</h1>
                </div>
                <div class='content'>
                    <h2 style='color: #333; margin-bottom: 15px;'>Bonjour ".e($client->nom_complet)."</h2>
                    <p style='color: #666; font-size: 14px; line-height: 1.6;'>{$message}</p>
                    {$motifHtml}
                    <p style='color: #999; font-size: 12px; margin-top: 20px;'>
                        Statut : <strong style='color: {$color};'>{$statutText}</strong>
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
