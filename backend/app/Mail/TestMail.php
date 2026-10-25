<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Email de diagnostic envoye par `php artisan mail:test`.
 *
 * Il est volontairement synchrone (pas de ShouldQueue) : l'objectif est de
 * remonter immediatement l'erreur SMTP a l'operateur qui configure le compte,
 * au lieu de la laisser dans la file d'attente.
 */
class TestMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $transport = '',
        public string $serveur = '',
        public string $expediteur = '',
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'FIRAS BKA CAR - Test de configuration email',
        );
    }

    public function content(): Content
    {
        $date = now()->format('d/m/Y H:i:s');

        return new Content(
            htmlString: "
                <div style='font-family: Arial, sans-serif; color: #1a1a1a;'>
                    <h2 style='color: #dc2626;'>Configuration email operationnelle</h2>
                    <p>
                        Cet email confirme que FIRAS BKA CAR peut envoyer des messages
                        depuis le compte <strong>".e($this->expediteur).'</strong>.
                    </p>
                    <ul>
                        <li>Transport : '.e($this->transport).'</li>
                        <li>Serveur : '.e($this->serveur)."</li>
                        <li>Date : {$date}</li>
                    </ul>
                    <p style='color: #666; font-size: 12px;'>
                        Message genere par la commande mail:test. Aucune action requise.
                    </p>
                </div>",
        );
    }
}
