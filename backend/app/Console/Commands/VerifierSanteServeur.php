<?php

namespace App\Console\Commands;

use App\Mail\AlerteSanteServeur;
use App\Support\QueuedMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class VerifierSanteServeur extends Command
{
    protected $signature = 'sante:verifier {--filet=50 : Nombre max de jobs en file avant alerte}';

    protected $description = 'Controle la sante du serveur (stockage, base, file) et previent l admin par email (M3)';

    public function handle(): int
    {
        $problemes = $this->collecterProblemes((int) $this->option('filet'));

        if ($problemes === []) {
            $this->info('Sante serveur : OK');

            return self::SUCCESS;
        }

        foreach ($problemes as $p) {
            $this->warn($p);
        }

        QueuedMail::send(
            config('mail.admin_address'),
            new AlerteSanteServeur($problemes),
            'sante-serveur',
        );

        return self::SUCCESS;
    }

    /** @return string[] */
    private function collecterProblemes(int $filet): array
    {
        $problemes = [];

        try {
            DB::select('select 1');
        } catch (Throwable $e) {
            $problemes[] = 'Base de donnees inaccessible : '.$e->getMessage();
        }

        foreach ([storage_path('framework'), storage_path('app'), storage_path('app/public')] as $dir) {
            if (! is_dir($dir) || ! is_writable($dir)) {
                $problemes[] = 'Dossier non inscriptible : '.$dir;
            }
        }

        try {
            $echecs = (int) DB::table('failed_jobs')->count();
            if ($echecs > 0) {
                $problemes[] = "{$echecs} job(s) en echec dans failed_jobs.";
            }

            $file = (int) DB::table('jobs')->count();
            if ($file > $filet) {
                $problemes[] = "File d attente surchargee : {$file} jobs en attente (seuil {$filet}).";
            }
        } catch (Throwable) {
            // Tables absentes (premiere installation) : pas une alerte.
        }

        return $problemes;
    }
}
