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
            'adresse' => 'Avenue des FAR, Tanger',
            'ville' => 'Tanger',
            'telephone' => '+212 522 00 00 00',
            'email' => 'tanger@firasbkacar.com',
            'active' => true,
        ]);
    }
}
