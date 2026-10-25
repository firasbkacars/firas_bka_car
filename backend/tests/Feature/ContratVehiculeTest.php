<?php

namespace Tests\Feature;

use App\Mail\VehiculeContratExpiration;
use App\Models\Client;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ContratVehiculeTest extends TestCase
{
    use RefreshDatabase;

    private function createClient(array $overrides = []): Client
    {
        return Client::create(array_merge([
            'nom_complet' => 'Client Contrats',
            'telephone' => '0611111111',
            'email' => 'contrats@example.com',
            'password' => 'password123',
            'permis_conduire' => 'permis/contrats.jpg',
            'permis_statut' => 'valide',
            'est_etranger' => false,
            'carte_nationale' => 'documents/carte-nationale/cin.jpg',
            'carte_nationale_statut' => 'valide',
        ], $overrides));
    }

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
            'prix_jour' => 500,
            'statut' => 'disponible',
        ], $overrides));
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => 'password',
            'role' => User::ROLE_ADMIN,
        ]);
    }

    private function nom(Vehicule $v): string
    {
        return $v->marque.' '.$v->modele;
    }

    public function test_public_catalogue_hides_vehicle_with_expired_insurance(): void
    {
        $this->createVehicule(['marque' => 'Expiree', 'date_expiration_assurance' => today()->subDay()]);
        $this->createVehicule(['marque' => 'Valide', 'date_expiration_assurance' => today()->addDays(90)]);

        $response = $this->getJson('/api/vehicules');

        $response->assertOk();
        $marques = collect($response->json('data'))->pluck('marque');
        $this->assertContains('Valide', $marques);
        $this->assertNotContains('Expiree', $marques);
    }

    public function test_public_catalogue_hides_vehicle_with_expired_carte_grise(): void
    {
        $this->createVehicule(['marque' => 'Grise', 'date_expiration_carte_grise' => today()->subDay()]);

        $marques = collect($this->getJson('/api/vehicules')->json('data'))->pluck('marque');

        $this->assertNotContains('Grise', $marques);
    }

    public function test_admin_catalogue_keeps_vehicle_with_expired_contract(): void
    {
        $this->createVehicule(['marque' => 'Expiree', 'date_expiration_assurance' => today()->subDay()]);
        $admin = $this->createAdmin();

        $marques = collect(
            $this->actingAs($admin, 'sanctum')->getJson('/api/vehicules-admin')->json('data')
        )->pluck('marque');

        $this->assertContains('Expiree', $marques);
    }

    public function test_client_catalogue_still_hides_expired_contracts(): void
    {
        $this->createVehicule(['marque' => 'Expiree', 'date_expiration_assurance' => today()->subDay()]);
        $client = $this->createClient();

        $marques = collect(
            $this->actingAs($client, 'sanctum')->getJson('/api/vehicules')->json('data')
        )->pluck('marque');

        $this->assertNotContains('Expiree', $marques);
    }

    public function test_vehicle_without_contract_dates_stays_public(): void
    {
        $this->createVehicule(['marque' => 'SansContrat']);

        $marques = collect($this->getJson('/api/vehicules')->json('data'))->pluck('marque');

        $this->assertContains('SansContrat', $marques);
    }

    public function test_vehicle_is_rentable_until_the_end_of_its_expiry_day(): void
    {
        $v = $this->createVehicule(['date_expiration_assurance' => today()]);

        $this->assertFalse($v->fresh()->contratExpire());

        $v->update(['date_expiration_assurance' => today()->addDay()]);
        $this->assertFalse($v->fresh()->contratExpire());

        $v->update(['date_expiration_assurance' => today()->subDay()]);
        $this->assertTrue($v->fresh()->contratExpire());
    }

    public function test_disponibilite_is_false_when_a_contract_expired(): void
    {
        $v = $this->createVehicule(['date_expiration_carte_grise' => today()->subDays(3)]);

        $response = $this->getJson("/api/vehicules/{$v->id}/disponibilite");

        $response->assertOk();
        $response->assertJson([
            'disponible' => false,
            'contrat_expire' => true,
        ]);
    }

    public function test_reservation_is_refused_when_a_contract_expired(): void
    {
        $client = $this->createClient();
        $v = $this->createVehicule(['date_expiration_assurance' => today()->subDay()]);

        $response = $this->actingAs($client, 'sanctum')->postJson('/api/reservations', [
            'vehicule_id' => $v->id,
            'date_debut' => now()->addDays(5)->toDateString(),
            'date_fin' => now()->addDays(8)->toDateString(),
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'mode_paiement' => 'especes',
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('assurance', strtolower($response->json('message')));
        $this->assertDatabaseCount('reservations', 0);
    }

    public function test_dashboard_rappels_lists_expired_and_expiring_contracts(): void
    {
        $this->createVehicule(['marque' => 'Expiree', 'date_expiration_assurance' => today()->subDay()]);
        $this->createVehicule(['marque' => 'Bientot', 'date_expiration_carte_grise' => today()->addDays(10)]);
        $this->createVehicule(['marque' => 'Loin', 'date_expiration_assurance' => today()->addYear()]);
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/dashboard/rappels');

        $response->assertOk();
        $this->assertSame(['Expiree'], collect($response->json('contrats_expires'))->pluck('marque')->all());
        $this->assertSame(['Bientot'], collect($response->json('contrats_expirants'))->pluck('marque')->all());
    }

    public function test_contract_reminder_is_sent_once_per_contract(): void
    {
        Mail::fake();

        $this->createVehicule([
            'date_expiration_assurance' => today()->addDays(10),
            'date_expiration_carte_grise' => today()->addDays(5),
        ]);

        $this->artisan('vehicules:contrats')->assertSuccessful();
        Mail::assertQueued(VehiculeContratExpiration::class);

        $vehicule = Vehicule::sole();
        $this->assertNotNull($vehicule->assurance_rappel_envoye_le);
        $this->assertNotNull($vehicule->carte_grise_rappel_envoye_le);

        Mail::fake();
        $this->artisan('vehicules:contrats')->assertSuccessful();
        Mail::assertNothingQueued();
    }
}
