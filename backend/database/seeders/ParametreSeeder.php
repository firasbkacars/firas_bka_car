<?php

namespace Database\Seeders;

use App\Models\Parametre;
use Illuminate\Database\Seeder;

class ParametreSeeder extends Seeder
{
    public function run(): void
    {
        Parametre::set('taux_acompte', '30', 'Pourcentage d\'acompte requis pour une reservation');
        Parametre::set('supplement_conducteur_jour', '50', 'Supplement par jour pour conducteur additionnel (DH)');
        Parametre::set('delai_annulation_gratuit', '48', 'Heures avant debut pour annulation gratuite');
        Parametre::set('delai_annulation_partielle', '24', 'Heures avant debut pour remboursement partiel (50%)');
        Parametre::set('penalite_retard_pourcentage', '50', 'Pourcentage de penalite par jour de retard');
    }
}
