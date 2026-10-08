<?php

namespace App\Mail;

use App\Models\Reservation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReservationConfirmation extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Reservation $reservation,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Confirmation de reservation - {$this->reservation->numero}",
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
        $r = $this->reservation;
        $client = $r->client;
        $vehicule = $r->vehicule;

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
                .header p { color: rgba(255,255,255,0.8); margin: 5px 0 0; font-size: 14px; }
                .content { padding: 30px; }
                .section { margin-bottom: 25px; }
                .section-title { font-size: 13px; font-weight: bold; color: #dc2626; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f5f5f5; }
                .info-label { color: #666; font-size: 13px; }
                .info-value { color: #1a1a1a; font-weight: 500; font-size: 13px; }
                .total-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; text-align: center; margin-top: 20px; }
                .total-amount { color: #dc2626; font-size: 28px; font-weight: bold; }
                .footer { background: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #eee; }
                .footer p { color: #999; font-size: 11px; margin: 3px 0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>FIRAS BKA CAR</h1>
                    <p>Confirmation de reservation</p>
                </div>
                <div class='content'>
                    <p style='color: #333; font-size: 15px; margin-bottom: 20px;'>
                        Bonjour <strong>".e($client->nom_complet)."</strong>,
                    </p>
                    <p style='color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 25px;'>
                        Votre reservation a ete confirmee avec succes. Voici les details :
                    </p>

                    <div class='section'>
                        <div class='section-title'>Numero de reservation</div>
                        <p style='text-align: center; font-size: 20px; font-weight: bold; color: #dc2626; margin: 10px 0;'>{$r->numero}</p>
                    </div>

                    <div class='section'>
                        <div class='section-title'>Vehicule reserve</div>
                        <div class='info-row'>
                            <span class='info-label'>Vehicule</span>
                            <span class='info-value'>".e($vehicule->marque).' '.e($vehicule->modele)."</span>
                        </div>
                        <div class='info-row'>
                            <span class='info-label'>Categorie</span>
                            <span class='info-value'>".e($vehicule->categorie)."</span>
                        </div>
                        <div class='info-row'>
                            <span class='info-label'>Transmission</span>
                            <span class='info-value'>".e(ucfirst($vehicule->transmission))."</span>
                        </div>
                    </div>

                    <div class='section'>
                        <div class='section-title'>Dates et lieux</div>
                        <div class='info-row'>
                            <span class='info-label'>Prise en charge</span>
                            <span class='info-value'>{$r->date_debut->format('d/m/Y H:i')}</span>
                        </div>
                        <div class='info-row'>
                            <span class='info-label'>Retour prevu</span>
                            <span class='info-value'>{$r->date_fin->format('d/m/Y H:i')}</span>
                        </div>
                        <div class='info-row'>
                            <span class='info-label'>Lieu de prise</span>
                            <span class='info-value'>".e($r->lieu_prise)."</span>
                        </div>
                        <div class='info-row'>
                            <span class='info-label'>Lieu de retour</span>
                            <span class='info-value'>".e($r->lieu_retour)."</span>
                        </div>
                    </div>

                    <div class='section'>
                        <div class='section-title'>Recapitulatif financier</div>
                        <div class='info-row'>
                            <span class='info-label'>Prix par jour</span>
                            <span class='info-value'>{$vehicule->prix_jour} DH</span>
                        </div>
                        <div class='info-row'>
                            <span class='info-label'>Nombre de jours</span>
                            <span class='info-value'>{$r->date_debut->diffInDays($r->date_fin)}</span>
                        </div>
                        ".($r->remise > 0 ? "
                        <div class='info-row'>
                            <span class='info-label'>Remise (".e($r->code_promo).")</span>
                            <span class='info-value' style='color: #16a34a;'>-{$r->remise} DH</span>
                        </div>
                        " : '')."
                        <div class='total-box'>
                            <p style='color: #666; font-size: 12px; margin: 0 0 5px;'>Montant total</p>
                            <div class='total-amount'>{$r->prix_total} DH</div>
                            <p style='color: #666; font-size: 12px; margin: 5px 0 0;'>Acompte (30%) : {$r->acompte} DH</p>
                        </div>
                    </div>

                    <div class='section'>
                        <div class='section-title'>Mode de paiement</div>
                        <p style='color: #333; font-size: 13px;'>".ucfirst(str_replace('_', ' ', $r->mode_paiement))."</p>
                    </div>
                </div>
                <div class='footer'>
                    <p>Merci pour votre confiance - FIRAS BKA CAR</p>
                    <p>Branes 1, Lot 583N, 01 Rue 50 RDC - Tanger, Maroc</p>
                    <p>Tel: 06 81 18 18 13</p>
                </div>
            </div>
        </body>
        </html>";
    }
}
