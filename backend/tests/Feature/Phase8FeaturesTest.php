<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\FournisseurContrat;
use App\Models\Message;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class Phase8FeaturesTest extends TestCase
{
    use RefreshDatabase;

    private function createVehicule(array $overrides = []): Vehicule
    {
        return Vehicule::create(array_merge([
            'marque' => 'Dacia',
            'modele' => 'Duster',
            'categorie' => 'SUV',
            'annee' => 2023,
            'transmission' => 'manuelle',
            'carburant' => 'diesel',
            'places' => 5,
            'prix_jour' => 400,
            'statut' => 'disponible',
        ], $overrides));
    }

    private function createClient(array $overrides = []): Client
    {
        return Client::create(array_merge([
            'nom_complet' => 'Client Phase 8',
            'telephone' => '0611223344',
            'email' => 'phase8@example.com',
            'password' => 'password123',
            'permis_statut' => 'valide',
        ], $overrides));
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'admin.p8@example.com',
            'password' => 'password123',
            'role' => 'admin',
        ]);
    }

    // ------------------------------------------------------------- V2

    public function test_register_with_valid_parrainage_code_links_and_rewards_both(): void
    {
        $parrain = $this->createClient();
        \app(\App\Services\ParrainageService::class)->genererCode($parrain);

        $this->postJson('/api/client/register', [
            'nom_complet' => 'Filleul Test',
            'email' => 'filleul@example.com',
            'telephone' => '0699887766',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'code_parrainage' => $parrain->code_parrainage,
        ])->assertCreated();

        $filleul = Client::where('email', 'filleul@example.com')->first();
        $this->assertSame($parrain->id, $filleul->parrain_id);
        $this->assertNotNull($filleul->code_parrainage);
        $this->assertSame(\App\Services\ParrainageService::POINTS_INSCRIPTION, $filleul->fresh()->points_fidelite);
        $this->assertSame(\App\Services\ParrainageService::POINTS_INSCRIPTION, $parrain->fresh()->points_fidelite);
    }

    public function test_register_with_invalid_parrainage_code_fails(): void
    {
        $this->postJson('/api/client/register', [
            'nom_complet' => 'Filleul Test',
            'email' => 'filleul2@example.com',
            'telephone' => '0699887755',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'code_parrainage' => 'INEXISTANT',
        ])->assertStatus(422);
    }

    public function test_parrainage_stats_endpoint_generates_code_and_counts(): void
    {
        $parrain = $this->createClient();
        \app(\App\Services\ParrainageService::class)->genererCode($parrain);

        $filleul = $this->createClient(['email' => 'f2@example.com', 'telephone' => '0611001100']);
        $filleul->update(['parrain_id' => $parrain->id, 'parrain_recompense' => true]);

        $response = $this->actingAs($parrain, 'sanctum')->getJson('/api/client/parrainage');
        $response->assertOk();
        $this->assertSame($parrain->code_parrainage, $response->json('code_parrainage'));
        $this->assertSame(1, $response->json('nombre_filleuls'));
        $this->assertSame(\App\Services\ParrainageService::POINTS_INSCRIPTION
            + \App\Services\ParrainageService::POINTS_PREMIERE_LOCATION, $response->json('points_totaux'));
    }

    // ------------------------------------------------------------- G4

    public function test_kilometrage_alert_command_notifies_once(): void
    {
        Mail::fake();

        $v = $this->createVehicule(['kilometrage' => 120000, 'kilometrage_alerte' => 100000]);

        $this->artisan('vehicules:kilometrage')->assertExitCode(0);

        $this->assertNotNull($v->fresh()->km_alerte_le);
        Mail::assertQueued(\App\Mail\AlerteKilometrage::class);

        // Deuxieme execution : deja alerte, rien de plus.
        $v->fresh()->forceFill(['km_alerte_le' => null])->save();
        Mail::fake();
        $this->artisan('vehicules:kilometrage')->assertExitCode(0);
        // Seuil deja depasse mais marqueur remis a null : re-alerte volontaire.
        Mail::assertQueued(\App\Mail\AlerteKilometrage::class);
    }

    public function test_kilometrage_alert_skips_vehicles_under_threshold(): void
    {
        Mail::fake();

        $this->createVehicule(['kilometrage' => 50000, 'kilometrage_alerte' => 100000]);

        $this->artisan('vehicules:kilometrage')->assertExitCode(0);

        Mail::assertNothingQueued();
    }

    // ------------------------------------------------------------- V6

    public function test_admin_can_set_vehicle_coordinates(): void
    {
        $admin = $this->createAdmin();
        $v = $this->createVehicule();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/vehicules-admin/{$v->id}", [
                'latitude' => 33.5731,
                'longitude' => -7.5898,
            ])
            ->assertOk();

        $this->assertSame('33.5731000', (string) $v->fresh()->latitude);
        $this->assertSame('-7.5898000', (string) $v->fresh()->longitude);
    }

    public function test_public_vehicle_payload_includes_coordinates(): void
    {
        $v = $this->createVehicule(['latitude' => 33.5731, 'longitude' => -7.5898]);

        $response = $this->getJson("/api/vehicules/{$v->id}");

        $response->assertOk();
        $this->assertNotNull($response->json('latitude'));
        $this->assertNotNull($response->json('longitude'));
    }

    // ------------------------------------------------------------- V9

    public function test_new_avis_goes_to_moderation_and_is_hidden_from_public(): void
    {
        $client = $this->createClient();
        $v = $this->createVehicule();

        $this->actingAs($client, 'sanctum')->postJson('/api/avis', [
            'vehicule_id' => $v->id,
            'note' => 4,
            'commentaire' => 'Tres bien',
        ])->assertCreated();

        $public = $this->getJson("/api/vehicules/{$v->id}/avis");
        $public->assertOk();
        $this->assertSame(0, $public->json('nombre'));

        $admin = $this->createAdmin();
        $avisId = \App\Models\Avi::first()->id;

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/avis/{$avisId}/moderation", ['statut' => 'publie'])
            ->assertOk();

        $public = $this->getJson("/api/vehicules/{$v->id}/avis");
        $this->assertSame(1, $public->json('nombre'));
    }

    // ------------------------------------------------------------- G5

    public function test_fournisseur_contract_crud_and_expiration_rappel(): void
    {
        Mail::fake();
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/contrats-fournisseurs', [
            'titre' => 'Assurance flotte',
            'fournisseur' => 'Wafa Assurance',
            'date_debut' => today()->subMonths(11)->toDateString(),
            'date_expiration' => today()->addDays(10)->toDateString(),
            'montant' => 12000,
        ])->assertCreated();

        $contratId = $response->json('id');

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/contrats-fournisseurs/{$contratId}", ['montant' => 13000])
            ->assertOk();
        $this->assertSame('13000.00', (string) FournisseurContrat::find($contratId)->montant);

        $this->artisan('fournisseurs:contrats')->assertExitCode(0);
        Mail::assertQueued(\App\Mail\ContratFournisseurExpiration::class);
        $this->assertNotNull(FournisseurContrat::find($contratId)->rappel_envoye_le);

        // Deuxieme passage : deja envoye.
        Mail::fake();
        $this->artisan('fournisseurs:contrats')->assertExitCode(0);
        Mail::assertNothingQueued();

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/contrats-fournisseurs/{$contratId}")
            ->assertOk();
        $this->assertDatabaseMissing('contrats_fournisseurs', ['id' => $contratId]);
    }

    // ------------------------------------------------------------- V8

    public function test_client_can_send_and_admin_can_reply(): void
    {
        $client = $this->createClient();
        $admin = $this->createAdmin();

        $this->actingAs($client, 'sanctum')->postJson('/api/client/messages', [
            'message' => 'Bonjour, question sur le permis.',
        ])->assertCreated();

        $threads = $this->actingAs($admin, 'sanctum')->getJson('/api/messages-admin');
        $threads->assertOk();
        $this->assertNotEmpty($threads->json());
        $this->assertSame('Client Phase 8', $threads->json()[0]['nom_complet']);

        $this->actingAs($admin, 'sanctum')->postJson("/api/messages-admin/{$client->id}", [
            'message' => 'Bonjour, envoyez votre permis.',
        ])->assertCreated();

        $fil = $this->actingAs($client, 'sanctum')->getJson('/api/client/messages');
        $fil->assertOk();
        $this->assertCount(2, $fil->json());
        $this->assertTrue($fil->json()[1]['from_admin']);
        $this->assertNotNull($fil->json()[1]['read_at']);
    }

    // ------------------------------------------------------------- M2

    public function test_response_time_header_is_present(): void
    {
        $response = $this->getJson('/api/vehicules');

        $response->assertOk();
        $this->assertTrue($response->headers->has('X-Response-Time'));
    }
}
