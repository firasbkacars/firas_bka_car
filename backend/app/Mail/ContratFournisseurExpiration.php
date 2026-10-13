<?php

namespace App\Mail;

use App\Models\FournisseurContrat;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContratFournisseurExpiration extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public FournisseurContrat $contrat) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Contrat fournisseur expirant : {$this->contrat->titre}",
        );
    }

    public function content(): Content
    {
        $titre = e($this->contrat->titre);
        $fournisseur = e($this->contrat->fournisseur);
        $expiration = $this->contrat->date_expiration->isoFormat('DD/MM/YYYY');
        $jours = $this->contrat->joursAvantExpiration();

        $phrase = $jours >= 0
            ? "Le contrat expire dans <strong>{$jours} jour(s)</strong> (le {$expiration})."
            : "Le contrat a expire le <strong>{$expiration}</strong>.";

        return new Content(
            htmlString: <<<HTML
            <p>Le contrat <strong>{$titre}</strong> avec <strong>{$fournisseur}</strong> arrive a echeance.</p>
            <p>{$phrase}</p>
            HTML,
        );
    }
}
