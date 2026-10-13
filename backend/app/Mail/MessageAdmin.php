<?php

namespace App\Mail;

use App\Models\Client;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MessageAdmin extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Client $client, public string $contenu) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Nouveau message de {$this->client->nom_complet}",
        );
    }

    public function content(): Content
    {
        $contenu = e($this->contenu);
        $nom = e($this->client->nom_complet);
        $email = e($this->client->email);

        return new Content(
            htmlString: <<<HTML
            <p><strong>{$nom}</strong> ({$email}) vous a envoye un message :</p>
            <blockquote>{$contenu}</blockquote>
            HTML,
        );
    }
}
