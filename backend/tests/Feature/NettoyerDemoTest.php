<?php

namespace Tests\Feature;

use App\Models\Agence;
use App\Models\Client;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class NettoyerDemoTest extends TestCase
{
    use RefreshDatabase;

    private function createVehicule(array $overrides = []): Vehicule
    {
        return Vehicule::create(array_merge([
            'marque' => 'BMW',
            'modele' => 'Serie 3',
            'categorie' => 'Berline',
            'annee' => 2023,
            'transmission' => 'automatique',
            'carburant' => 'diesel',
            'places' => 5,
            'prix_jour' => 600,
            'statut' => 'disponible',
        ], $overrides));
    }

    private function createClient(array $overrides = []): Client
    {
        return Client::create(array_merge([
            'nom_complet' => 'Client Demo',
            'telephone' => '0612345678',
            'email' => 'demo@example.com',
            'password' => 'password123',
        ], $overrides));
    }

    public function test_nettoyage_purge_les_donnees_demo_et_conserve_le_catalogue(): void
    {
        $admin = User::factory()->admin()->create();

        // Badges admin : marques comme vus avant le nettoyage.
        DB::table('users')->where('id', $admin->id)->update([
            'reservations_vues_le' => now(),
            'clients_vus_le' => now(),
        ]);

        $agence = Agence::factory()->create();
        $vehicule = $this->createVehicule(['agence_id' => $agence->id]);
        $client = $this->createClient();

        $reservationId = DB::table('reservations')->insertGetId([
            'numero' => 'RES-DEMO-1',
            'client_id' => $client->id,
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->toDateTimeString(),
            'date_fin' => now()->addDays(3)->toDateTimeString(),
            'prix_total' => 1800,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('paiements')->insert([
            'reservation_id' => $reservationId,
            'montant' => 540,
            'methode' => 'especes',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('avis')->insert([
            'client_id' => $client->id,
            'vehicule_id' => $vehicule->id,
            'note' => 5,
            'commentaire' => 'Tres bien',
            'statut' => 'en_attente',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('messages')->insert([
            'client_id' => $client->id,
            'message' => 'Bonjour',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->artisan('demo:nettoyer', ['--force' => true])->assertSuccessful();

        // Donnees de demo/test supprimees.
        $this->assertDatabaseCount('reservations', 0);
        $this->assertDatabaseCount('paiements', 0);
        $this->assertDatabaseCount('avis', 0);
        $this->assertDatabaseCount('messages', 0);
        $this->assertDatabaseCount('clients', 0);
        $this->assertDatabaseCount('etats_lieux', 0);

        // Catalogue et administration conserves.
        $this->assertDatabaseCount('vehicules', 1);
        $this->assertDatabaseCount('agences', 1);
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseHas('vehicules', ['marque' => 'BMW', 'agence_id' => $agence->id]);

        // Badges admin remis a zero.
        $this->assertNull($admin->fresh()->reservations_vues_le);
        $this->assertNull($admin->fresh()->clients_vus_le);
    }

    public function test_sans_force_la_commande_demande_confirmation(): void
    {
        $this->createClient();

        $this->artisan('demo:nettoyer')
            ->expectsConfirmation('Supprimer toutes les donnees de demo/test ? (vehicules, agences, users et parametres seront conserves)', 'no')
            ->assertSuccessful();

        $this->assertDatabaseCount('clients', 1);
    }
}
