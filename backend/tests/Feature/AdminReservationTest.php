<?php

namespace Tests\Feature;

use App\Models\Agence;
use App\Models\Client;
use App\Models\Parametre;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Reservation saisie manuellement par un agent (booking par telephone).
 */
class AdminReservationTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Cache::forget('parametre_taux_acompte');
        Cache::forget('parametre_supplement_conducteur_jour');

        parent::tearDown();
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

    private function createAgence(): Agence
    {
        return Agence::create([
            'nom' => 'FIRAS BKA CAR Tanger',
            'adresse' => '12 Boulevard Mohammed V',
            'ville' => 'Tanger',
            'telephone' => '0612345678',
            'active' => true,
        ]);
    }

    private function createVehicule(array $overrides = []): Vehicule
    {
        $agence = $this->createAgence();

        return Vehicule::create(array_merge([
            'marque' => 'Dacia',
            'modele' => 'Sandero Stepway',
            'categorie' => 'Citadine',
            'annee' => 2024,
            'transmission' => 'manuelle',
            'carburant' => 'essence',
            'places' => 5,
            'puissance' => '100 ch',
            'kilometrage' => 12000,
            'prix_jour' => 350,
            'montant_caution' => 1200,
            'statut' => 'disponible',
            'agence_id' => $agence->id,
        ], $overrides));
    }

    private function createClient(array $overrides = []): Client
    {
        return Client::create(array_merge([
            'nom_complet' => 'Mohammed Ghanmi',
            'telephone' => '0612345678',
            'email' => 'mohammed@gmail.com',
            'password' => 'password123',
        ], $overrides));
    }

    private function payload(Vehicule $vehicule, array $overrides = []): array
    {
        return array_merge([
            'vehicule_id' => $vehicule->id,
            'agence_id' => $vehicule->agence_id,
            'date_debut' => now()->addDays(5)->format('Y-m-d').' 10:00:00',
            'date_fin' => now()->addDays(8)->format('Y-m-d').' 10:00:00',
            'mode_paiement' => 'especes',
        ], $overrides);
    }

    public function test_admin_can_create_reservation_for_existing_client(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $vehicule = $this->createVehicule();

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/reservations-admin', $this->payload($vehicule, [
            'client_id' => $client->id,
            'notes' => 'Reservation prise par telephone',
        ]));

        $response->assertCreated();
        $response->assertJsonPath('client_id', $client->id);
        $response->assertJsonPath('vehicule_id', $vehicule->id);
        $response->assertJsonPath('statut', 'confirmee');

        $this->assertDatabaseHas('reservations', [
            'id' => $response->json('id'),
            'client_id' => $client->id,
            'statut' => 'confirmee',
        ]);

        // Le lieu est derive de l'agence, pas saisi par l'agent.
        $this->assertSame(
            '12 Boulevard Mohammed V, Tanger',
            $response->json('lieu_prise')
        );
    }

    public function test_admin_can_create_reservation_and_client_inline(): void
    {
        $admin = $this->createAdmin();
        $vehicule = $this->createVehicule();

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/reservations-admin', $this->payload($vehicule, [
            'client' => [
                'nom_complet' => 'Nadia Bennani',
                'telephone' => '06 55 44 33 22',
                'email' => 'nadia@example.com',
                'cin' => 'ab-123456',
                'est_etranger' => false,
            ],
        ]));

        $response->assertCreated();

        // Le telephone et le CIN sont normalises avant enregistrement.
        $client = Client::where('telephone', '0655443322')->firstOrFail();
        $this->assertSame('Nadia Bennani', $client->nom_complet);
        $this->assertSame('AB123456', $client->cin);
        $this->assertNull($client->password);
        $this->assertSame($client->id, $response->json('client_id'));

        // Aucune piece justificative n'est exigee pour une saisie agent.
        $this->assertNull($client->permis_conduire);
        $this->assertNull($client->carte_nationale);
    }

    public function test_admin_creation_uses_configured_deposit_and_driver_supplement(): void
    {
        Parametre::set('taux_acompte', '40');
        Parametre::set('supplement_conducteur_jour', '20');

        $admin = $this->createAdmin();
        $client = $this->createClient();
        $vehicule = $this->createVehicule(['prix_jour' => 350]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/reservations-admin', $this->payload($vehicule, [
            'client_id' => $client->id,
            'conducteur_additionnel_nom' => 'Karim Alami',
            'conducteur_additionnel_telephone' => '0611111111',
            'conducteur_additionnel_permis' => 'P-98765',
            'assurance_conducteur_additionnel' => true,
        ]));

        $response->assertCreated();

        // 3 jours x 350 = 1050 ; supplement 3 x 20 = 60 ; total 1110.
        $this->assertEquals(1110, $response->json('prix_total'));
        $this->assertEquals(444, $response->json('acompte'));

        $this->assertDatabaseHas('paiements', [
            'reservation_id' => $response->json('id'),
            'montant' => 444,
            'methode' => 'especes',
            'statut' => 'en_attente',
        ]);
    }

    public function test_admin_creation_rejects_conflict_and_rolls_back_inline_client(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $vehicule = $this->createVehicule();

        Reservation::create([
            'numero' => Reservation::genererNumero(),
            'client_id' => $client->id,
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->addDays(5),
            'date_fin' => now()->addDays(8),
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'prix_total' => 1050,
            'acompte' => 420,
            'statut' => 'confirmee',
            'mode_paiement' => 'especes',
        ]);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/reservations-admin', $this->payload($vehicule, [
            'client' => [
                'nom_complet' => 'Client Conflit',
                'telephone' => '0699999999',
            ],
        ]));

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'Le vehicule n\'est pas disponible pour ces dates');

        // La fiche client creee dans la transaction ne doit pas subsister.
        $this->assertDatabaseMissing('clients', ['telephone' => '0699999999']);
    }

    public function test_admin_creation_accepts_virement_and_wafacash(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();

        foreach (['virement', 'wafacash'] as $mode) {
            $vehicule = $this->createVehicule();

            $response = $this->actingAs($admin, 'sanctum')->postJson('/api/reservations-admin', $this->payload($vehicule, [
                'client_id' => $client->id,
                'mode_paiement' => $mode,
            ]));

            $response->assertCreated();

            $this->assertDatabaseHas('paiements', [
                'reservation_id' => $response->json('id'),
                'methode' => $mode,
                'statut' => 'en_attente',
            ]);
        }
    }

    public function test_client_cannot_use_admin_reservation_endpoint(): void
    {
        $client = $this->createClient();
        $vehicule = $this->createVehicule();

        $this->actingAs($client, 'sanctum')
            ->postJson('/api/reservations-admin', $this->payload($vehicule, [
                'client_id' => $client->id,
            ]))
            ->assertForbidden();
    }

    public function test_admin_creation_requires_a_client_or_new_client_data(): void
    {
        $admin = $this->createAdmin();
        $vehicule = $this->createVehicule();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/reservations-admin', $this->payload($vehicule))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['client_id', 'client']);
    }

    public function test_admin_creation_rejects_both_client_modes(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $vehicule = $this->createVehicule();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/reservations-admin', $this->payload($vehicule, [
                'client_id' => $client->id,
                'client' => [
                    'nom_complet' => 'Autre Client',
                    'telephone' => '0688888888',
                ],
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('client');
    }

    public function test_admin_creation_rejects_past_start_date(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $vehicule = $this->createVehicule();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/reservations-admin', $this->payload($vehicule, [
                'client_id' => $client->id,
                'date_debut' => now()->subDays(2)->format('Y-m-d').' 10:00:00',
                'date_fin' => now()->addDay()->format('Y-m-d').' 10:00:00',
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('date_debut');
    }

    public function test_admin_creation_rejects_duplicate_client_phone(): void
    {
        $admin = $this->createAdmin();
        $existing = $this->createClient();
        $vehicule = $this->createVehicule();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/reservations-admin', $this->payload($vehicule, [
                'client' => [
                    'nom_complet' => 'Doublon',
                    'telephone' => $existing->telephone,
                ],
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('client.telephone');
    }
}
