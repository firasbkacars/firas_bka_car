<?php

namespace App\Console\Commands;

use App\Mail\PermisExpirationReminder;
use App\Models\Client;
use App\Support\QueuedMail;
use Illuminate\Console\Command;

class VerifierExpirationPerm extends Command
{
    protected $signature = 'permis:verifier {--delai=30 : Delai de rappel en jours avant expiration}';

    protected $description = 'Marque les permis expires et previent les clients avant expiration (P2/P3)';

    public function handle(): int
    {
        $delai = max(1, (int) $this->option('delai'));

        // P2 : un permis passe en 'expire' des que la date est depassee.
        // Il peut etre remis en 'en_attente' par le client (nouvelle date),
        // ce qui impose une revalidation par un agent.
        $expire = Client::where('permis_statut', 'valide')
            ->whereNotNull('date_expiration_permis')
            ->whereDate('date_expiration_permis', '<=', now()->toDateString())
            ->update(['permis_statut' => 'expire']);

        $this->info("Permis expires: {$expire}");

        // P3 : un seul rappel par expiration (permis_rappel_envoye_le).
        $seuil = now()->addDays($delai)->toDateString();

        $aPrevenir = Client::whereNotNull('date_expiration_permis')
            ->whereNull('permis_rappel_envoye_le')
            ->whereDate('date_expiration_permis', '>', now()->toDateString())
            ->whereDate('date_expiration_permis', '<=', $seuil)
            ->whereNotNull('email')
            ->get();

        $envoyes = 0;
        foreach ($aPrevenir as $client) {
            // Un client dont le permis est deja rejete n'a pas besoin du rappel.
            if ($client->permis_statut === 'rejete') {
                continue;
            }

            if (QueuedMail::send($client->email, new PermisExpirationReminder($client), 'expiration-permis')) {
                $client->forceFill(['permis_rappel_envoye_le' => now()->toDateString()])->save();
                $envoyes++;
            }
        }

        $this->info("Rappels d'expiration envoyes: {$envoyes}");

        return Command::SUCCESS;
    }
}
