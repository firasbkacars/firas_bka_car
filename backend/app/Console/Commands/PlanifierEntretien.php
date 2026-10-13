<?php

namespace App\Console\Commands;

use App\Models\Maintenance;
use App\Models\Vehicule;
use Illuminate\Console\Command;

class PlanifierEntretien extends Command
{
    protected $signature = 'vehicules:planifier-entretien {--avance=45 : Creer la maintenance quand elle est a moins de N jours}';

    protected $description = 'Planifie automatiquement les prochaines maintenances (vidange, controle technique, pneus) (G3)';

    /**
     * Intervalles en mois entre deux maintenances du meme type.
     *
     * @var array<string, int>
     */
    private const REGLES = [
        'Vidange' => 6,
        'Controle technique' => 12,
        'Pneus' => 24,
    ];

    public function handle(): int
    {
        $avance = max(1, (int) $this->option('avance'));
        $seuil = now()->addDays($avance);
        $creees = 0;

        foreach (Vehicule::query()->orderBy('id')->cursor() as $vehicule) {
            foreach (self::REGLES as $type => $mois) {
                $dejaPlanifiee = Maintenance::where('vehicule_id', $vehicule->id)
                    ->where('type', $type)
                    ->whereIn('statut', ['prevue', 'en_cours'])
                    ->exists();

                if ($dejaPlanifiee) {
                    continue;
                }

                $derniere = Maintenance::where('vehicule_id', $vehicule->id)
                    ->where('type', $type)
                    ->where('statut', 'terminee')
                    ->orderByDesc('date_realisee')
                    ->orderByDesc('date_prevue')
                    ->first();

                $base = $derniere
                    ? ($derniere->date_realisee ?? $derniere->date_prevue)
                    : ($vehicule->created_at?->toDateString() ?? today());

                $datePrevue = \Illuminate\Support\Carbon::parse($base)->addMonths($mois);

                if ($datePrevue->gt($seuil)) {
                    continue;
                }

                Maintenance::create([
                    'vehicule_id' => $vehicule->id,
                    'type' => $type,
                    'description' => "{$type} (planifiee automatiquement, intervalle de {$mois} mois)",
                    'date_prevue' => $datePrevue->isPast() ? today() : $datePrevue->toDateString(),
                    'cout' => null,
                    'statut' => 'prevue',
                    'notes' => 'Genere par vehicules:planifier-entretien',
                ]);

                $creees++;
            }
        }

        $this->info("Entretiens planifies : {$creees}");

        return self::SUCCESS;
    }
}
