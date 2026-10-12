<?php

namespace Tests\Feature;

use App\Models\Agence;
use App\Models\Client;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgenceApiTest extends TestCase
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
            'nom_complet' => 'Mohammed Ghanmi',
            'telephone' => '0612345678',
            'email' => 'mohammed@gmail.com',
            'password' => 'password123',
            'permis_conduire' => 'permis/mohammed.jpg',
            'permis_statut' => 'valide',
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

    public function test_public_agence_list_exposes_only_active_agences(): void
    {
        $active = Agence::factory()->create();
        Agence::factory()->inactive()->create();

        $response = $this->getJson('/api/agences');

        $response->assertOk();
        $this->assertCount(1, $response->json());
        $this->assertSame($active->id, $response->json('0.id'));
    }

    public function test_admin_can_create_and_update_agence(): void
    {
        $admin = $this->createAdmin();

        $create = $this->actingAs($admin, 'sanctum')->postJson('/api/agences', [
            'nom' => 'FIRAS BKA CAR Rabat',
            'adresse' => '12 Avenue Hassan II',
            'ville' => 'Rabat',
            'telephone' => '0537000000',
            'active' => true,
        ]);

        $create->assertCreated();
        $this->assertDatabaseHas('agences', ['nom' => 'FIRAS BKA CAR Rabat', 'ville' => 'Rabat']);

        $update = $this->actingAs($admin, 'sanctum')->putJson("/api/agences/{$create->json('id')}", [
            'ville' => 'SalÃ©',
        ]);

        $update->assertOk();
        $this->assertDatabaseHas('agences', ['id' => $create->json('id'), 'ville' => 'SalÃ©']);
    }

    public function test_client_cannot_manage_agences(): void
    {
        $client = $this->createClient();
        $agence = Agence::factory()->create();

        $this->actingAs($client, 'sanctum')
            ->postJson('/api/agences', ['nom' => 'X', 'adresse' => 'Y', 'ville' => 'Z'])
            ->assertForbidden();

        $this->actingAs($client, 'sanctum')
            ->putJson("/api/agences/{$agence->id}", ['nom' => 'Hacked'])
            ->assertForbidden();
    }

    public function test_agence_with_vehicules_cannot_be_deleted(): void
    {
        $admin = $this->createAdmin();
        $agence = Agence::factory()->create();
        $this->createVehicule(['agence_id' => $agence->id]);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/agences/{$agence->id}")
            ->assertStatus(422);

        $this->assertDatabaseHas('agences', ['id' => $agence->id]);
    }

    public function test_admin_can_delete_unused_agence(): void
    {
        $admin = $this->createAdmin();
        $agence = Agence::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/agences/{$agence->id}")
            ->assertOk();

        $this->assertDatabaseMissing('agences', ['id' => $agence->id]);
    }

    public function test_admin_can_assign_agence_to_vehicule(): void
    {
        $admin = $this->createAdmin();
        $agence = Agence::factory()->create();
        $vehicule = $this->createVehicule();

        $this->actingAs($admin, 'sanctum')->putJson("/api/vehicules-admin/{$vehicule->id}", [
            'agence_id' => $agence->id,
        ])->assertOk();

        $this->assertDatabaseHas('vehicules', ['id' => $vehicule->id, 'agence_id' => $agence->id]);
    }

    public function test_vehicule_show_includes_agence(): void
    {
        $agence = Agence::factory()->create();
        $vehicule = $this->createVehicule(['agence_id' => $agence->id]);

        $response = $this->getJson("/api/vehicules/{$vehicule->id}");

        $response->assertOk();
        $this->assertSame($agence->id, $response->json('agence.id'));
    }

    public function test_vehicules_can_be_filtered_by_agence(): void
    {
        $agenceA = Agence::factory()->create();
        $agenceB = Agence::factory()->create();
        $chezA = $this->createVehicule(['agence_id' => $agenceA->id]);
        $this->createVehicule(['agence_id' => $agenceB->id]);

        $response = $this->getJson("/api/vehicules?agence_id={$agenceA->id}");

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($chezA->id));
        $this->assertCount(1, $ids);
    }

    public function test_reservation_defaults_to_vehicule_agence_and_derives_lieu(): void
    {
        $client = $this->createClient();
        $agence = Agence::factory()->create([
            'adresse' => 'Lot 583N Rue 50',
            'ville' => 'Tanger',
        ]);
        $vehicule = $this->createVehicule(['agence_id' => $agence->id]);

        $response = $this->actingAs($client, 'sanctum')->postJson('/api/reservations', [
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->addDays(20)->toDateString().' 09:00:00',
            'date_fin' => now()->addDays(23)->toDateString().' 09:00:00',
            'lieu_prise' => 'Nimporte',
            'lieu_retour' => 'Nimporte',
            'mode_paiement' => 'especes',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('reservations', [
            'id' => $response->json('id'),
            'agence_id' => $agence->id,
        ]);
        $this->assertSame('Lot 583N Rue 50, Tanger', $response->json('lieu_prise'));
        $this->assertSame('Lot 583N Rue 50, Tanger', $response->json('lieu_retour'));
    }

    public function test_reservation_rejects_inactive_agence(): void
    {
        $client = $this->createClient();
        $agence = Agence::factory()->inactive()->create();
        $vehicule = $this->createVehicule();

        $this->actingAs($client, 'sanctum')->postJson('/api/reservations', [
            'vehicule_id' => $vehicule->id,
            'agence_id' => $agence->id,
            'date_debut' => now()->addDays(20)->toDateString().' 09:00:00',
            'date_fin' => now()->addDays(23)->toDateString().' 09:00:00',
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'mode_paiement' => 'especes',
        ])->assertStatus(422)->assertJsonValidationErrors('agence_id');
    }

    public function test_client_reservation_list_includes_agence(): void
    {
        $client = $this->createClient();
        $agence = Agence::factory()->create();
        $vehicule = $this->createVehicule(['agence_id' => $agence->id]);

        $this->actingAs($client, 'sanctum')->postJson('/api/reservations', [
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->addDays(20)->toDateString().' 09:00:00',
            'date_fin' => now()->addDays(23)->toDateString().' 09:00:00',
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'mode_paiement' => 'especes',
        ])->assertCreated();

        $response = $this->actingAs($client, 'sanctum')->getJson('/api/client/reservations');

        $response->assertOk();
        $this->assertSame($agence->id, $response->json('0.agence.id'));
    }
}
