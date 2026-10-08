<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContactMessage extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public array $data
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[Contact] '.($this->data['sujet'] ?? 'Nouveau message'),
        );
    }

    public function content(): Content
    {
        $nom = htmlspecialchars($this->data['nom'] ?? '', ENT_QUOTES);
        $contact = htmlspecialchars($this->data['contact'] ?? '', ENT_QUOTES);
        $sujet = htmlspecialchars($this->data['sujet'] ?? '', ENT_QUOTES);
        $message = nl2br(htmlspecialchars($this->data['message'] ?? '', ENT_QUOTES));

        return new Content(
            htmlString: <<<HTML
            <div style="font-family: sans-serif; line-height: 1.6; color: #111;">
                <h2>Nouveau message depuis le site FIRAS BKA CAR</h2>
                <p><strong>Nom :</strong> {$nom}</p>
                <p><strong>Contact :</strong> {$contact}</p>
                <p><strong>Sujet :</strong> {$sujet}</p>
                <p><strong>Message :</strong></p>
                <p>{$message}</p>
            </div>
            HTML,
        );
    }
}
