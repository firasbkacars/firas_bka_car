<?php

namespace Database\Seeders;

use App\Models\Agence;
use Illuminate\Database\Seeder;

class AgenceSeeder extends Seeder
{
    public function run(): void
    {
        Agence::create([
            'nom' => 'FIRAS BKA CAR Tanger',
            'adresse' => 'Lot 583N, Rue 50, Branes 1, Tanger 90060',
            'ville' => 'Tanger',
            'telephone' => '+212 522 00 00 00',
            'email' => 'firasbkacars@gmail.com',
            'active' => true,
        ]);
    }
}
