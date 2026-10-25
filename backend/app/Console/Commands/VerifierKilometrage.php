<?php

namespace App\Console\Commands;

use App\Mail\AlerteKilometrage;
use App\Models\Vehicule;
use App\Support\QueuedMail;
use Illuminate\Console\Command;

class VerifierKilometrage extends Command
{
    protected $signature = 'vehicules:kilometrage';

    protected $description = 'Alerte l admin lorsque un vehicule depasse son seuil de kilometrage (G4)';

    public function handle(): int
    {
        $vehicules = Vehicule::query()
            ->whereNotNull('kilometrage_alerte')
            ->whereNull('km_alerte_le')
            ->whereColumn('kilometrage', '>=', 'kilometrage_alerte')
            ->get();

        $destinataire = config('mail.admin_address');
        $envoyes = 0;

        foreach ($vehicules as $vehicule) {
            if (QueuedMail::send($destinataire, new AlerteKilometrage($vehicule), 'alerte-kilometrage')) {
                $vehicule->forceFill(['km_alerte_le' => today()])->save();
                $envoyes++;
            }
        }

        $this->info("Alertes kilometrage envoyees: {$envoyes}");

        return Command::SUCCESS;
    }
}
