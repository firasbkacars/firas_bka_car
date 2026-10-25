<?php

namespace Tests\Feature;

use App\Models\Agence;
use App\Models\Avi;
use App\Models\Client;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * V9 : indices de nouveaute (badges admin / client).
 */
class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    private function createVehicule(array $overrides = []): Vehicule
    {
        return Vehicule::create(array_merge([
            'marque' => 'Dacia',
            'modele' => 'Logan',
            'categorie' => 'Citadine',
            'annee' => 2023,
            'transmission' => 'manuelle',
            'carburant' => 'diesel',
            'places' => 5,
            'prix_jour' => 300,
            'statut' => 'disponible',
        ], $overrides));
    }

    private function createClient(array $overrides = []): Client
    {
        return Client::create(array_merge([
            'nom_complet' => 'Client Notif',
            'telephone' => '0611111111',
            'email' => 'client.notif@example.com',
            'password' => 'password123',
            'permis_conduire' => 'permis/notif.jpg',
            'permis_statut' => 'valide',
            'est_etranger' => false,
            'carte_nationale' => 'documents/carte-nationale/cin.jpg',
            'carte_nationale_statut' => 'valide',
        ], $overrides));
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'admin@firasbkacar.com',
            'password' => 'password',
            'role' => User::ROLE_ADMIN,
        ]);
    }

    private function createReservation(Client $client): Reservation
    {
        $agence = Agence::factory()->create(['ville' => 'Tanger']);
        $vehicule = $this->createVehicule(['agence_id' => $agence->id]);

        $response = $this->actingAs($client, 'sanctum')->postJson('/api/reservations', [
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->addDays(20)->toDateString().' 09:00:00',
            'date_fin' => now()->addDays(23)->toDateString().' 09:00:00',
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'mode_paiement' => 'especes',
        ]);

        $response->assertCreated();

        return Reservation::findOrFail($response->json('id'));
    }

    public function test_admin_counts_reflect_new_activity(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        // Le client initial existe avant les horodatages "vu" : on le
        // retrodate pour qu'il ne compte pas comme nouveau.
        $client->forceFill(['created_at' => now()->subMinutes(10)])->save();

        // Sans horodatage "derniere vue", l'historique est considere vu.
        $this->actingAs($admin, 'sanctum')->getJson('/api/notifications-admin')
            ->assertOk()
            ->assertJsonPath('reservations', 0)
            ->assertJsonPath('clients', 0);

        // L'admin a deja consulte ses listes : horodatages dans le passe.
        $admin->update([
            'reservations_vues_le' => now()->subMinutes(5),
            'clients_vus_le' => now()->subMinutes(5),
        ]);

        // Nouvelle activite : reservation (+ acompte en attente cree par le
        // controleur), nouveau client, message client, avis a moderer.
        $reservation = $this->createReservation($client);
        $this->createClient(['email' => 'nouveau.client@example.com', 'telephone' => '0622222222']);
        $this->actingAs($client, 'sanctum')->postJson('/api/client/messages', [
            'message' => 'Bonjour, une question.',
        ])->assertCreated();
        Avi::create([
            'client_id' => $client->id,
            'vehicule_id' => $reservation->vehicule_id,
            'note' => 5,
            'commentaire' => 'Excellent service',
            'statut' => 'en_attente',
        ]);

        $this->actingAs($admin, 'sanctum')->getJson('/api/notifications-admin')
            ->assertOk()
            ->assertJsonPath('reservations', 1)
            ->assertJsonPath('clients', 1)
            ->assertJsonPath('messages', 1)
            ->assertJsonPath('paiements', 1)
            ->assertJsonPath('avis', 1);

        // Ouvrir les listes remet reservations/clients a zero,
        // le message reste non lu tant qu'un fil n'est pas ouvert.
        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/notifications-admin/reservations-vues')
            ->assertOk();
        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/notifications-admin/clients-vus')
            ->assertOk();

        $this->actingAs($admin, 'sanctum')->getJson('/api/notifications-admin')
            ->assertOk()
            ->assertJsonPath('reservations', 0)
            ->assertJsonPath('clients', 0)
            ->assertJsonPath('messages', 1);

        // Ouvrir le fil de discussion marque le message client comme lu.
        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/messages-admin/{$client->id}")
            ->assertOk();

        $this->actingAs($admin, 'sanctum')->getJson('/api/notifications-admin')
            ->assertOk()
            ->assertJsonPath('messages', 0);
    }

    public function test_client_counts_and_read_flow(): void
    {
        $client = $this->createClient();
        $admin = $this->createAdmin();

        // Un message admin nait NON lu (indice cote client).
        $this->actingAs($admin, 'sanctum')->postJson("/api/messages-admin/{$client->id}", [
            'message' => 'Votre permis est valide.',
        ])->assertCreated();

        $this->assertDatabaseHas('messages', [
            'client_id' => $client->id,
            'from_admin' => true,
            'read_at' => null,
        ]);

        $this->actingAs($client, 'sanctum')->getJson('/api/client/notifications')
            ->assertOk()
            ->assertJsonPath('messages', 1);

        // Le client ouvre sa messagerie : le message est marque lu.
        $this->actingAs($client, 'sanctum')->getJson('/api/client/messages')->assertOk();

        $this->actingAs($client, 'sanctum')->getJson('/api/client/notifications')
            ->assertOk()
            ->assertJsonPath('messages', 0);

        // Reservation modifiee depuis la derniere consultation client.
        $client->update(['reservations_vues_le' => now()->subMinutes(5)]);
        $reservation = $this->createReservation($client);
        $reservation->update(['statut' => 'en_cours']);

        $this->actingAs($client, 'sanctum')->getJson('/api/client/notifications')
            ->assertOk()
            ->assertJsonPath('reservations', 1);

        $this->actingAs($client, 'sanctum')
            ->postJson('/api/client/notifications/reservations-vues')
            ->assertOk();

        $this->actingAs($client, 'sanctum')->getJson('/api/client/notifications')
            ->assertOk()
            ->assertJsonPath('reservations', 0);
    }

    public function test_notifications_endpoints_are_protected(): void
    {
        $client = $this->createClient();
        $admin = $this->createAdmin();

        // Invites : non authentifies.
        $this->getJson('/api/notifications-admin')->assertUnauthorized();
        $this->getJson('/api/client/notifications')->assertUnauthorized();

        // Mauvais role : client sur l'admin, admin sur le client.
        $this->actingAs($client, 'sanctum')->getJson('/api/notifications-admin')->assertForbidden();
        $this->actingAs($client, 'sanctum')
            ->postJson('/api/notifications-admin/reservations-vues')
            ->assertForbidden();
        $this->actingAs($admin, 'sanctum')->getJson('/api/client/notifications')->assertForbidden();
    }
}
