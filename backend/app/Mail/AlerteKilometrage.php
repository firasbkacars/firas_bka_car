<?php

namespace App\Mail;

use App\Models\Vehicule;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AlerteKilometrage extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Vehicule $vehicule) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Alerte kilometrage : {$this->vehicule->marque} {$this->vehicule->modele}",
        );
    }

    public function content(): Content
    {
        $marque = e($this->vehicule->marque);
        $modele = e($this->vehicule->modele);
        $km = e((string) $this->vehicule->kilometrage);
        $seuil = e((string) $this->vehicule->kilometrage_alerte);

        return new Content(
            htmlString: <<<HTML
            <p>Le vehicule <strong>{$marque} {$modele}</strong>
            a atteint <strong>{$km} km</strong>, superieur au seuil
            de <strong>{$seuil} km</strong>.</p>
            <p>Un entretien ou une verification est recommande.</p>
            HTML,
        );
    }
}
