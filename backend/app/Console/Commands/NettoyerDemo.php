<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class NettoyerDemo extends Command
{
    protected $signature = 'demo:nettoyer {--force : Lancer sans confirmation interactive}';

    protected $description = 'Purge les donnees de demo et de test (reservations, clients, avis, paiements, messages...) en conservant vehicules, agences, users et parametres';

    /**
     * Tables purgees : donnees metier de demo/test puis tables techniques.
     * Conservees : vehicules, agences, users, parametres, migrations.
     */
    private const TABLES = [
        // Transactionnel / demo / test (enfants d'abord).
        'etats_lieux',
        'caution_histories',
        'paiements',
        'reservations',
        'avis',
        'favoris',
        'messages',
        'whats_app_messages',
        'clients',
        'maintenances',
        'codes_promo',
        'contrats_fournisseurs',
        // Technique : files d'attente, sessions, jetons, cache.
        'jobs',
        'job_batches',
        'failed_jobs',
        'sessions',
        'personal_access_tokens',
        'password_reset_tokens',
        'cache',
        'cache_locks',
    ];

    public function handle(): int
    {
        if (! $this->option('force') && ! $this->confirm('Supprimer toutes les donnees de demo/test ? (vehicules, agences, users et parametres seront conserves)')) {
            $this->info('Annule.');

            return Command::SUCCESS;
        }

        Schema::disableForeignKeyConstraints();

        foreach (self::TABLES as $table) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            DB::table($table)->truncate();
            $this->line("Videe : {$table}");
        }

        // Repart d'une base saine pour les badges de nouveautes admin :
        // au prochain chargement, seuls les elements crees apres seront signales.
        DB::table('users')->update([
            'reservations_vues_le' => null,
            'clients_vus_le' => null,
        ]);

        Schema::enableForeignKeyConstraints();

        $this->info('Nettoyage termine. Conserves : vehicules, agences, users, parametres.');

        return Command::SUCCESS;
    }
}
