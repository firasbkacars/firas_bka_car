<?php

namespace App\Console\Commands;

use App\Mail\ContratFournisseurExpiration;
use App\Models\FournisseurContrat;
use App\Support\QueuedMail;
use Illuminate\Console\Command;

class VerifierContratsFournisseurs extends Command
{
    protected $signature = 'fournisseurs:contrats {--delai=30 : Delai de rappel en jours avant expiration}';

    protected $description = 'Previent l admin des contrats fournisseurs qui arrivent a expiration (G5)';

    public function handle(): int
    {
        $delai = max(1, (int) $this->option('delai'));
        $seuil = today()->addDays($delai);

        $contrats = FournisseurContrat::query()
            ->whereNotNull('date_expiration')
            ->whereNull('rappel_envoye_le')
            ->whereDate('date_expiration', '<=', $seuil)
            ->get();

        $destinataire = config('mail.admin_address');
        $envoyes = 0;

        foreach ($contrats as $contrat) {
            if (QueuedMail::send($destinataire, new ContratFournisseurExpiration($contrat), 'expiration-contrat-fournisseur')) {
                $contrat->forceFill(['rappel_envoye_le' => today()])->save();
                $envoyes++;
            }
        }

        $this->info("Rappels de contrats fournisseurs envoyes: {$envoyes}");

        return Command::SUCCESS;
    }
}
