<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Paiement;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReservationApiTest extends TestCase
{
    use RefreshDatabase;

    private function createVehicule(array $overrides = []): Vehicule
    {
        return Vehicule::create(array_merge([
            'marque' => 'BMW',
            'modele' => 'Série 3',
            'categorie' => 'Berline',
            'annee' => 2023,
            'transmission' => 'automatique',
            'carburant' => 'diesel',
            'places' => 5,
            'puissance' => '190 ch',
            'kilometrage' => 15000,
            'prix_jour' => 600,
            'statut' => 'disponible',
        ], $overrides));
    }

    private function createClient(array $overrides = []): Client
    {
        return Client::create(array_merge([
            'nom_complet' => 'Mohammed Ghanmi',
            'telephone' => '0612345678',
            'email' => 'mohammed@gmail.com',
            'password' => 'password123',
            'permis_conduire' => 'permis/mohammed.jpg',
        ], $overrides));
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'admin@firasbkacar.com',
            'password' => 'password',
        ]);
    }

    public function test_vehicule_disponibilite_check(): void
    {
        $vehicule = $this->createVehicule();

        $response = $this->getJson("/api/vehicules/{$vehicule->id}/disponibilite?date_debut=" . now()->addDays(10)->toDateString() . '&date_fin=' . now()->addDays(15)->toDateString());

        $response->assertOk();
        $response->assertJson([
            'vehicule_id' => $vehicule->id,
            'disponible' => true,
        ]);
    }

    public function test_vehicule_non_disponible_when_reserved(): void
    {
        $vehicule = $this->createVehicule();
        $client = $this->createClient();

        $dateDebut = now()->addDays(5);
        $dateFin = now()->addDays(8);

        Reservation::create([
            'numero' => Reservation::genererNumero(),
            'client_id' => $client->id,
            'vehicule_id' => $vehicule->id,
            'date_debut' => $dateDebut,
            'date_fin' => $dateFin,
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'prix_total' => 1800,
            'acompte' => 540,
            'statut' => 'confirmee',
            'mode_paiement' => 'especes',
        ]);

        $response = $this->getJson("/api/vehicules/{$vehicule->id}/disponibilite?date_debut=" . $dateDebut->toDateString() . '&date_fin=' . $dateFin->toDateString());

        $response->assertOk();
        $this->assertNotEmpty($response->json('reservations'));
    }

    public function test_store_reservation_with_auth(): void
    {
        $vehicule = $this->createVehicule();
        $client = $this->createClient();

        $response = $this->actingAs($client, 'sanctum')->postJson('/api/reservations', [
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->addDays(20)->toDateString() . ' 09:00:00',
            'date_fin' => now()->addDays(23)->toDateString() . ' 09:00:00',
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'mode_paiement' => 'especes',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('reservations', [
            'vehicule_id' => $vehicule->id,
            'client_id' => $client->id,
            'statut' => 'confirmee',
        ]);
    }

    public function test_store_reservation_without_permis_fails(): void
    {
        $vehicule = $this->createVehicule();
        $client = $this->createClient(['permis_conduire' => null]);

        $response = $this->actingAs($client, 'sanctum')->postJson('/api/reservations', [
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->addDays(20)->toDateString() . ' 09:00:00',
            'date_fin' => now()->addDays(23)->toDateString() . ' 09:00:00',
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'mode_paiement' => 'especes',
        ]);

        $response->assertStatus(422);
    }

    public function test_reservation_prix_total_calculation(): void
    {
        $vehicule = $this->createVehicule(['prix_jour' => 500]);
        $client = $this->createClient();

        $response = $this->actingAs($client, 'sanctum')->postJson('/api/reservations', [
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->addDays(20)->toDateString() . ' 09:00:00',
            'date_fin' => now()->addDays(25)->toDateString() . ' 09:00:00',
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'mode_paiement' => 'visa',
        ]);

        $response->assertCreated();
        $data = $response->json();
        $this->assertEquals(3000, $data['prix_total']); // 500 * 6 jours
        $this->assertEquals(900, $data['acompte']); // 30% de 3000
    }

    public function test_payment_completes_reservation(): void
    {
        $vehicule = $this->createVehicule(['prix_jour' => 500]);
        $client = $this->createClient();

        $reservation = Reservation::create([
            'numero' => Reservation::genererNumero(),
            'client_id' => $client->id,
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->addDays(20),
            'date_fin' => now()->addDays(25),
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'prix_total' => 3000,
            'acompte' => 900,
            'statut' => 'confirmee',
            'mode_paiement' => 'visa',
        ]);

        Paiement::create([
            'reservation_id' => $reservation->id,
            'montant' => 900,
            'methode' => 'visa',
            'statut' => 'paye',
            'date_paiement' => now(),
        ]);

        $admin = $this->createAdmin();
        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/paiements');

        $response->assertOk();
    }

    public function test_annuler_reservation(): void
    {
        $vehicule = $this->createVehicule();
        $client = $this->createClient();

        $reservation = Reservation::create([
            'numero' => Reservation::genererNumero(),
            'client_id' => $client->id,
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->addDays(20),
            'date_fin' => now()->addDays(23),
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'prix_total' => 1800,
            'acompte' => 540,
            'statut' => 'confirmee',
            'mode_paiement' => 'especes',
        ]);

        $admin = $this->createAdmin();
        $response = $this->actingAs($admin, 'sanctum')->putJson("/api/reservations/{$reservation->id}/annuler");

        $response->assertOk();
        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'statut' => 'annulee',
        ]);
    }

    public function test_list_vehicules_with_filters(): void
    {
        $this->createVehicule(['categorie' => 'Berline', 'marque' => 'BMW']);
        $this->createVehicule(['categorie' => 'SUV', 'marque' => 'Mercedes']);

        $response = $this->getJson('/api/vehicules?categorie=Berline');

        $response->assertOk();
        $data = $response->json();
        $this->assertNotEmpty($data['vehicules']);
    }

    public function test_client_registration(): void
    {
        $response = $this->postJson('/api/client/register', [
            'nom_complet' => 'Test User',
            'email' => 'test@example.com',
            'telephone' => '0612345678',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('clients', ['email' => 'test@example.com']);
    }

    public function test_client_registration_invalid_phone(): void
    {
        $response = $this->postJson('/api/client/register', [
            'nom_complet' => 'Test User',
            'email' => 'test@example.com',
            'telephone' => '12345',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422);
    }

    public function test_admin_login(): void
    {
        $admin = $this->createAdmin();

        $response = $this->postJson('/api/admin/login', [
            'email' => 'admin@firasbkacar.com',
            'password' => 'password',
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['user', 'token']);
    }

    public function test_admin_login_wrong_credentials(): void
    {
        $response = $this->postJson('/api/admin/login', [
            'email' => 'wrong@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401);
    }
}
