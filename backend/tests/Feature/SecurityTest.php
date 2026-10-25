<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Maintenance;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    private function createClient(array $overrides = []): Client
    {
        return Client::create(array_merge([
            'nom_complet' => 'Client Secu',
            'telephone' => '0611111111',
            'email' => 'secu@example.com',
            'password' => 'password123',
            'permis_conduire' => 'permis/secu.jpg',
            'permis_statut' => 'valide',
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

    private function createVehicule(): Vehicule
    {
        return Vehicule::create([
            'marque' => 'BMW',
            'modele' => 'Serie 3',
            'categorie' => 'Berline',
            'annee' => 2023,
            'transmission' => 'automatique',
            'carburant' => 'diesel',
            'places' => 5,
            'prix_jour' => 500,
            'statut' => 'disponible',
        ]);
    }

    private function createReservation(Client $client, Vehicule $vehicule): Reservation
    {
        return Reservation::create([
            'numero' => Reservation::genererNumero(),
            'client_id' => $client->id,
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->addDays(10),
            'date_fin' => now()->addDays(15),
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'prix_total' => 2500,
            'acompte' => 750,
            'statut' => 'confirmee',
            'mode_paiement' => 'especes',
        ]);
    }

    public function test_client_cannot_create_payment(): void
    {
        $client = $this->createClient();
        $vehicule = $this->createVehicule();
        $reservation = $this->createReservation($client, $vehicule);

        $response = $this->actingAs($client, 'sanctum')->postJson('/api/paiements', [
            'reservation_id' => $reservation->id,
            'montant' => 9999,
            'methode' => 'especes',
        ]);

        $response->assertForbidden();
    }

    public function test_admin_can_create_payment(): void
    {
        $client = $this->createClient();
        $vehicule = $this->createVehicule();
        $reservation = $this->createReservation($client, $vehicule);
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/paiements', [
            'reservation_id' => $reservation->id,
            'montant' => 100,
            'methode' => 'especes',
        ]);

        $response->assertCreated();
    }

    public function test_client_cannot_prolong_someone_elses_reservation(): void
    {
        $owner = $this->createClient();
        $intruder = $this->createClient([
            'telephone' => '0622222222',
            'email' => 'intruder@example.com',
        ]);
        $vehicule = $this->createVehicule();
        $reservation = $this->createReservation($owner, $vehicule);

        $response = $this->actingAs($intruder, 'sanctum')->putJson(
            "/api/client/reservations/{$reservation->id}/prolonger",
            ['date_fin' => now()->addDays(20)->toDateString()]
        );

        $response->assertNotFound();
    }

    public function test_client_can_prolong_own_reservation(): void
    {
        $client = $this->createClient();
        $vehicule = $this->createVehicule();
        $reservation = $this->createReservation($client, $vehicule);

        $response = $this->actingAs($client, 'sanctum')->putJson(
            "/api/client/reservations/{$reservation->id}/prolonger",
            ['date_fin' => now()->addDays(20)->toDateString()]
        );

        $response->assertOk();
    }

    public function test_avis_uses_authenticated_client_not_payload(): void
    {
        $author = $this->createClient();
        $victim = $this->createClient([
            'telephone' => '0633333333',
            'email' => 'victim@example.com',
        ]);
        $vehicule = $this->createVehicule();

        $response = $this->actingAs($author, 'sanctum')->postJson('/api/avis', [
            'client_id' => $victim->id,
            'vehicule_id' => $vehicule->id,
            'note' => 5,
            'commentaire' => 'Top',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('avis', [
            'vehicule_id' => $vehicule->id,
            'client_id' => $author->id,
        ]);
        $this->assertDatabaseMissing('avis', [
            'vehicule_id' => $vehicule->id,
            'client_id' => $victim->id,
        ]);
    }

    public function test_cmi_webhook_rejects_unsigned_payload(): void
    {
        $client = $this->createClient();
        $vehicule = $this->createVehicule();
        $reservation = $this->createReservation($client, $vehicule);

        $response = $this->postJson('/api/cmi/webhook', [
            'order_id' => 'FBC-'.$reservation->numero.'-123',
            'status' => 'captured',
        ]);

        $response->assertForbidden();

        $this->assertDatabaseMissing('paiements', [
            'reservation_id' => $reservation->id,
            'statut' => 'paye',
        ]);
        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'statut' => 'confirmee',
        ]);
    }

    public function test_contact_endpoint_requires_valid_payload(): void
    {
        $this->postJson('/api/contact', [])->assertUnprocessable();

        $this->postJson('/api/contact', [
            'nom' => 'Jean Test',
            'contact' => '0612345678',
            'sujet' => 'Demande',
            'message' => 'Bonjour, je souhaite reserver une voiture.',
        ])->assertCreated();
    }

    public function test_home_serves_spa_index_html(): void
    {
        $response = $this->get('/');

        $response->assertOk();
        $this->assertStringContainsString('<div id="root">', $response->getContent());
    }

    public function test_unknown_api_route_returns_404_json(): void
    {
        $this->getJson('/api/does-not-exist')->assertNotFound();
    }

    public function test_maintenances_a_venir_filters_upcoming_only(): void
    {
        $vehicule = $this->createVehicule();
        $admin = $this->createAdmin();

        Maintenance::create([
            'vehicule_id' => $vehicule->id,
            'type' => 'vidange',
            'date_prevue' => now()->addDays(3),
            'statut' => 'prevue',
        ]);

        Maintenance::create([
            'vehicule_id' => $vehicule->id,
            'type' => 'pneus',
            'date_prevue' => now()->subDays(30),
            'date_realisee' => now()->subDays(30),
            'statut' => 'terminee',
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/maintenances-a-venir');

        $response->assertOk();
        $this->assertCount(1, $response->json());
    }

    private function createEmploye(array $overrides = []): User
    {
        return User::create(array_merge([
            'name' => 'Employe',
            'email' => 'employe@example.com',
            'password' => 'password',
            'role' => User::ROLE_EMPLOYE,
        ], $overrides));
    }

    public function test_employe_cannot_access_admin_routes(): void
    {
        $employe = $this->createEmploye();

        $this->actingAs($employe, 'sanctum')->getJson('/api/admin/user')->assertForbidden();
        $this->actingAs($employe, 'sanctum')->getJson('/api/dashboard/stats')->assertForbidden();
    }

    public function test_admin_can_access_admin_routes(): void
    {
        $admin = $this->createAdmin();

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/user')->assertOk();
    }

    public function test_client_cannot_access_admin_routes(): void
    {
        $client = $this->createClient();

        $this->actingAs($client, 'sanctum')->getJson('/api/admin/user')->assertForbidden();
    }

    public function test_admin_token_is_issued_with_eight_hours_expiry(): void
    {
        $this->createAdmin();

        $response = $this->postJson('/api/admin/login', [
            'email' => 'admin@example.com',
            'password' => 'password',
        ]);

        $response->assertOk();

        $token = PersonalAccessToken::sole();
        $this->assertEqualsWithDelta(
            now()->addHours(8)->getTimestamp(),
            $token->expires_at->getTimestamp(),
            5
        );
    }

    public function test_client_token_is_issued_with_twenty_four_hours_expiry(): void
    {
        $client = $this->createClient();

        $response = $this->postJson('/api/client/login', [
            'email' => 'secu@example.com',
            'password' => 'password123',
        ]);

        $response->assertOk();

        $token = PersonalAccessToken::sole();
        $this->assertEqualsWithDelta(
            now()->addHours(24)->getTimestamp(),
            $token->expires_at->getTimestamp(),
            5
        );
    }

    public function test_expired_token_is_rejected(): void
    {
        $admin = $this->createAdmin();
        $plain = $admin->createToken('admin-token', ['*'], now()->subMinute())->plainTextToken;

        $this->withToken($plain)->getJson('/api/admin/user')->assertUnauthorized();
    }

    public function test_unauthenticated_api_request_returns_json_401_without_accept_header(): void
    {
        $this->get('/api/client/notifications')
            ->assertUnauthorized()
            ->assertJson(['message' => 'Unauthenticated.']);
    }
}
