<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AlerteSanteServeur extends Mailable
{
    use Queueable, SerializesModels;

    /** @param string[] $problemes */
    public function __construct(
        public array $problemes,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Alerte sante serveur - FIRAS BKA CAR ('.count($this->problemes).' probleme(s))',
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
        $items = implode('', array_map(
            fn (string $p) => "<li style='margin:8px 0;color:#374151;'>".e($p).'</li>',
            $this->problemes,
        ));

        return "
        <!DOCTYPE html>
        <html>
        <head><meta charset='utf-8'></head>
        <body style=\"font-family:'Helvetica','Arial',sans-serif;background:#f5f5f5;margin:0;padding:20px;\">
            <div style='max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);'>
                <div style='background:#dc2626;padding:25px;text-align:center;'>
                    <h1 style='color:white;margin:0;font-size:20px;'>Alerte sante serveur</h1>
                </div>
                <div style='padding:25px;'>
                    <p style='color:#374151;'>Le controle de sante planifie a detecte le(s) probleme(s) suivant(s) :</p>
                    <ul style='padding-left:20px;'>{$items}</ul>
                    <p style='color:#6b7280;font-size:13px;margin-top:20px;'>
                        FIRAS BKA CAR - verification automatique quotidienne.
                    </p>
                </div>
            </div>
        </body>
        </html>";
    }
}
