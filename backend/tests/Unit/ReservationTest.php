<?php

namespace Tests\Unit;

use App\Models\Client;
use App\Models\Reservation;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReservationTest extends TestCase
{
    use RefreshDatabase;

    public function test_generer_numero_format(): void
    {
        $numero = Reservation::genererNumero();

        $this->assertMatchesRegularExpression('/^FBC-\d{6}-\d{5}$/', $numero);
        $this->assertStringStartsWith('FBC-'.now()->format('ymd'), $numero);
    }

    public function test_generer_numero_uniqueness(): void
    {
        $client = Client::create([
            'nom_complet' => 'Test Uniqueness',
            'telephone' => '0600000001',
            'password' => 'password123',
        ]);

        $vehicule = Vehicule::create([
            'marque' => 'Renault',
            'modele' => 'Clio',
            'categorie' => 'Citadine',
            'annee' => 2024,
            'transmission' => 'manuelle',
            'carburant' => 'essence',
            'places' => 5,
            'prix_jour' => 300,
            'statut' => 'disponible',
        ]);

        $numeros = [];

        for ($i = 0; $i < 10; $i++) {
            $numero = Reservation::genererNumero();
            $numeros[] = $numero;

            Reservation::create([
                'numero' => $numero,
                'client_id' => $client->id,
                'vehicule_id' => $vehicule->id,
                'date_debut' => now()->addDays($i + 1),
                'date_fin' => now()->addDays($i + 2),
                'prix_total' => 0,
                'acompte' => 0,
                'statut' => 'annulee',
                'mode_paiement' => 'especes',
            ]);
        }

        $this->assertCount(10, array_unique($numeros));
    }

    public function test_prix_total_calculation(): void
    {
        $prixJour = 600;
        $jours = 3;
        $prixTotal = $prixJour * $jours;

        $this->assertEquals(1800, $prixTotal);
    }

    public function test_acompte_calculation(): void
    {
        $prixTotal = 1800;
        $acompte = $prixTotal * 0.30;

        $this->assertEquals(540, $acompte);
    }

    public function test_prix_single_day(): void
    {
        $prixJour = 500;
        $jours = 1;
        $prixTotal = $prixJour * $jours;

        $this->assertEquals(500, $prixTotal);
    }
}
