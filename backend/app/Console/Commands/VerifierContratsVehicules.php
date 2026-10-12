<?php

namespace App\Console\Commands;

use App\Mail\VehiculeContratExpiration;
use App\Models\Vehicule;
use App\Support\QueuedMail;
use Illuminate\Console\Command;

class VerifierContratsVehicules extends Command
{
    protected $signature = 'vehicules:contrats {--delai=30 : Delai de rappel en jours avant expiration}';

    protected $description = 'Previent l admin des assurances et cartes grises de vehicules qui arrivent a expiration (G1/G2)';

    public function handle(): int
    {
        $delai = max(1, (int) $this->option('delai'));
        $seuil = today()->addDays($delai);

        $vehicules = Vehicule::query()
            ->where(function ($q) use ($seuil) {
                $q->where(function ($sub) use ($seuil) {
                    $sub->whereNotNull('date_expiration_assurance')
                        ->whereNull('assurance_rappel_envoye_le')
                        ->whereDate('date_expiration_assurance', '<=', $seuil);
                })->orWhere(function ($sub) use ($seuil) {
                    $sub->whereNotNull('date_expiration_carte_grise')
                        ->whereNull('carte_grise_rappel_envoye_le')
                        ->whereDate('date_expiration_carte_grise', '<=', $seuil);
                });
            })
            ->get();

        $destinataire = config('mail.from.address');
        $envoyes = 0;

        foreach ($vehicules as $vehicule) {
            $contrats = [];
            $marqueurs = [];

            if ($vehicule->date_expiration_assurance !== null
                && $vehicule->assurance_rappel_envoye_le === null
                && $vehicule->date_expiration_assurance->lte($seuil)) {
                $contrats[] = [
                    'libelle' => 'Assurance',
                    'date' => $vehicule->date_expiration_assurance,
                    'jours' => (int) today()->diffInDays($vehicule->date_expiration_assurance, false),
                ];
                $marqueurs['assurance_rappel_envoye_le'] = today();
            }

            if ($vehicule->date_expiration_carte_grise !== null
                && $vehicule->carte_grise_rappel_envoye_le === null
                && $vehicule->date_expiration_carte_grise->lte($seuil)) {
                $contrats[] = [
                    'libelle' => 'Carte grise',
                    'date' => $vehicule->date_expiration_carte_grise,
                    'jours' => (int) today()->diffInDays($vehicule->date_expiration_carte_grise, false),
                ];
                $marqueurs['carte_grise_rappel_envoye_le'] = today();
            }

            if ($contrats === []) {
                continue;
            }

            if (QueuedMail::send($destinataire, new VehiculeContratExpiration($vehicule, $contrats), 'expiration-contrat-vehicule')) {
                $vehicule->forceFill($marqueurs)->save();
                $envoyes++;
            }
        }

        $this->info("Rappels de contrats vehicules envoyes: {$envoyes}");

        return Command::SUCCESS;
    }
}
