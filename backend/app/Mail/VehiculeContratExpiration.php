<?php

namespace App\Mail;

use App\Models\Vehicule;
use Carbon\CarbonInterface;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * G1/G2 : rappel admin avant l'expiration de l'assurance ou de la carte
 * grise d'un vehicule. Un seul envoi par contrat et par expiration
 * (assurance_rappel_envoye_le / carte_grise_rappel_envoye_le).
 */
class VehiculeContratExpiration extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param  array<int, array{libelle: string, date: CarbonInterface, jours: int}>  $contrats
     */
    public function __construct(
        public Vehicule $vehicule,
        public array $contrats,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Contrat vehicule a renouveler - '.$this->vehicule->marque.' '.$this->vehicule->modele,
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
        $v = $this->vehicule;
        $titre = e($v->marque.' '.$v->modele);
        $lignes = '';

        foreach ($this->contrats as $contrat) {
            $jours = (int) $contrat['jours'];
            $statut = $jours < 0
                ? 'Expire depuis '.abs($jours).' jour(s)'
                : ($jours === 0 ? 'Expire aujourd\'hui' : 'Expire dans '.$jours.' jour(s)');

            $lignes .= "
                    <tr>
                        <td style='padding:10px;border-bottom:1px solid #eee;'>".e($contrat['libelle'])."</td>
                        <td style='padding:10px;border-bottom:1px solid #eee;'>".e($contrat['date']->format('d/m/Y'))."</td>
                        <td style='padding:10px;border-bottom:1px solid #eee;color:".($jours <= 0 ? '#b91c1c' : '#b45309').";'>".e($statut).'</td>
                    </tr>';
        }

        $adminUrl = e(config('app.url')).'/admin/vehicules';

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='utf-8'>
            <style>
                body { font-family: 'Helvetica', 'Arial', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { background: #b45309; padding: 25px; text-align: center; }
                .header h1 { color: white; margin: 0; font-size: 20px; }
                .header p { color: rgba(255,255,255,0.85); margin: 5px 0 0; font-size: 13px; }
                .content { padding: 25px; }
                .content p { color: #444; font-size: 14px; line-height: 1.6; }
                table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 14px; }
                th { background: #fef3c7; color: #92400e; text-align: left; padding: 10px; }
                .button { display: block; width: 100%; box-sizing: border-box; text-align: center; background: #b45309; color: white; text-decoration: none; padding: 12px; border-radius: 8px; font-weight: bold; margin-top: 18px; }
                .footer { background: #f9fafb; padding: 15px 25px; text-align: center; border-top: 1px solid #eee; }
                .footer p { color: #999; font-size: 10px; margin: 2px 0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>FIRAS BKA CAR</h1>
                    <p>Suivi des contrats flotte</p>
                </div>
                <div class='content'>
                    <p>Bonjour,</p>
                    <p>Le vehicule <strong>{$titre}</strong> a un contrat a renouveler :</p>
                    <table>
                        <tr><th>Contrat</th><th>Expiration</th><th>Statut</th></tr>
                        {$lignes}
                    </table>
                    <p>Tant que le contrat est expire, ce vehicule est retire du catalogue public et ne peut plus etre reserve.</p>
                    <a class='button' href='{$adminUrl}'>Mettre a jour le vehicule</a>
                </div>
                <div class='footer'>
                    <p>FIRAS BKA CAR</p>
                </div>
            </div>
        </body>
        </html>";
    }
}
