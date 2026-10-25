<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class IdentityDocumentsTest extends TestCase
{
    use RefreshDatabase;

    private function fixture(string $name): UploadedFile
    {
        $path = base_path('tests/Fixtures/documents/'.$name);

        return UploadedFile::fake()->createWithContent($name, file_get_contents($path));
    }

    private function createClient(array $overrides = []): Client
    {
        return Client::create(array_merge([
            'nom_complet' => 'Mohammed Ghanmi',
            'telephone' => '0612345678',
            'email' => 'mohammed@example.com',
            'password' => 'password123',
            'permis_conduire' => 'permis/mohammed.jpg',
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
            'prix_jour' => 600,
            'statut' => 'disponible',
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

    private function reservationPayload(Vehicule $vehicule): array
    {
        return [
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->addDays(20)->toDateString().' 09:00:00',
            'date_fin' => now()->addDays(23)->toDateString().' 09:00:00',
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'mode_paiement' => 'especes',
        ];
    }

    public function test_registration_records_foreign_nationality_and_passport_number(): void
    {
        $response = $this->postJson('/api/client/register', [
            'nom_complet' => 'John Doe',
            'email' => 'john@example.com',
            'telephone' => '0612345678',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'est_etranger' => true,
            'passeport' => 'X1234567',
        ]);

        $response->assertCreated();
        $this->assertTrue((bool) $response->json('client.est_etranger'));
        $this->assertSame('X1234567', $response->json('client.passeport'));
    }

    public function test_registration_defaults_to_moroccan_nationality(): void
    {
        $response = $this->postJson('/api/client/register', [
            'nom_complet' => 'Mohammed Ghanmi',
            'email' => 'mohammed@example.com',
            'telephone' => '0612345678',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated();
        $this->assertFalse((bool) $response->json('client.est_etranger'));
    }

    public function test_profile_can_update_nationality_and_passport_number(): void
    {
        $client = $this->createClient();

        $this->actingAs($client, 'sanctum')->putJson('/api/client/profile', [
            'est_etranger' => true,
            'passeport' => 'X7654321',
        ])->assertOk()
            ->assertJsonPath('est_etranger', true)
            ->assertJsonPath('passeport', 'X7654321');
    }

    public function test_moroccan_client_can_upload_carte_nationale_photo(): void
    {
        Storage::fake('public');

        $client = $this->createClient([
            'carte_nationale' => null,
            'carte_nationale_statut' => 'en_attente',
        ]);

        $response = $this->actingAs($client, 'sanctum')->post('/api/client/carte-nationale', [
            'carte_nationale' => $this->fixture('good-document.jpg'),
        ], ['Accept' => 'application/json']);

        $response->assertOk()
            ->assertJsonPath('carte_nationale_statut', 'en_attente');

        $path = $response->json('carte_nationale');
        $this->assertNotEmpty($path);
        Storage::disk('public')->assertExists($path);

        $client->refresh();
        $this->assertSame($path, $client->carte_nationale);
        $this->assertSame('en_attente', $client->carte_nationale_statut);
        $this->assertNull($client->carte_nationale_rejet_motif);
    }

    public function test_foreign_client_can_upload_passeport_photo(): void
    {
        Storage::fake('public');

        $client = $this->createClient([
            'est_etranger' => true,
            'carte_nationale' => null,
            'carte_nationale_statut' => 'en_attente',
        ]);

        $response = $this->actingAs($client, 'sanctum')->post('/api/client/passeport', [
            'passeport_document' => $this->fixture('good-document.jpg'),
        ], ['Accept' => 'application/json']);

        $response->assertOk()
            ->assertJsonPath('passeport_statut', 'en_attente');

        $path = $response->json('passeport_document');
        $this->assertNotEmpty($path);
        Storage::disk('public')->assertExists($path);
        $this->assertSame($path, $client->fresh()->passeport_document);
    }

    public function test_upload_rejects_pdf_for_identity_document(): void
    {
        Storage::fake('public');
        $client = $this->createClient();

        $this->actingAs($client, 'sanctum')->post('/api/client/carte-nationale', [
            'carte_nationale' => $this->fixture('document.pdf'),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('carte_nationale');
    }

    public function test_upload_rejects_corrupt_image(): void
    {
        Storage::fake('public');
        $client = $this->createClient();

        $this->actingAs($client, 'sanctum')->post('/api/client/carte-nationale', [
            'carte_nationale' => $this->fixture('corrupt-document.jpg'),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('carte_nationale');
    }

    public function test_permis_upload_accepts_a_good_photo(): void
    {
        Storage::fake('public');
        $client = $this->createClient([
            'permis_conduire' => null,
            'permis_statut' => 'en_attente',
        ]);

        $response = $this->actingAs($client, 'sanctum')->post('/api/client/permis', [
            'permis_conduire' => $this->fixture('good-document.jpg'),
        ], ['Accept' => 'application/json']);

        $response->assertOk()
            ->assertJsonPath('permis_statut', 'en_attente');

        $path = $response->json('permis_conduire');
        $this->assertNotEmpty($path);
        Storage::disk('public')->assertExists($path);
        $this->assertSame($path, $client->fresh()->permis_conduire);
    }

    public function test_permis_upload_rejects_pdf(): void
    {
        Storage::fake('public');
        $client = $this->createClient();

        $this->actingAs($client, 'sanctum')->post('/api/client/permis', [
            'permis_conduire' => $this->fixture('document.pdf'),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('permis_conduire');
    }

    public function test_permis_upload_rejects_blurry_photo(): void
    {
        Storage::fake('public');
        $client = $this->createClient();

        $response = $this->actingAs($client, 'sanctum')->post('/api/client/permis', [
            'permis_conduire' => $this->fixture('blurry-document.jpg'),
        ], ['Accept' => 'application/json']);

        $response->assertStatus(422)->assertJsonValidationErrors('permis_conduire');
        $message = strtolower($response->json('errors.permis_conduire.0'));
        $this->assertTrue(
            str_contains($message, 'floue') || str_contains($message, 'nette') || str_contains($message, 'uniforme'),
            'Le message doit expliquer que la photo du permis est floue ou de mauvaise qualite.'
        );
    }

    public function test_upload_rejects_low_resolution_photo(): void
    {
        Storage::fake('public');
        $client = $this->createClient(['carte_nationale' => null]);

        $this->actingAs($client, 'sanctum')->post('/api/client/carte-nationale', [
            'carte_nationale' => $this->fixture('tiny-document.jpg'),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('carte_nationale');

        $this->assertNull($client->fresh()->carte_nationale);
    }

    public function test_upload_rejects_blurry_photo(): void
    {
        Storage::fake('public');
        $client = $this->createClient();

        $response = $this->actingAs($client, 'sanctum')->post('/api/client/carte-nationale', [
            'carte_nationale' => $this->fixture('blurry-document.jpg'),
        ], ['Accept' => 'application/json']);

        $response->assertStatus(422)->assertJsonValidationErrors('carte_nationale');
        $message = strtolower($response->json('errors.carte_nationale.0'));
        $this->assertTrue(
            str_contains($message, 'floue') || str_contains($message, 'nette') || str_contains($message, 'uniforme'),
            'Le message doit expliquer que la photo est floue ou de mauvaise qualite.'
        );
    }

    public function test_upload_rejects_dark_photo(): void
    {
        if (! extension_loaded('gd')) {
            $this->markTestSkipped('GD est requis pour analyser la luminosite de la photo.');
        }

        Storage::fake('public');
        $client = $this->createClient();

        $response = $this->actingAs($client, 'sanctum')->post('/api/client/carte-nationale', [
            'carte_nationale' => $this->fixture('dark-document.jpg'),
        ], ['Accept' => 'application/json']);

        $response->assertStatus(422)->assertJsonValidationErrors('carte_nationale');
        $this->assertStringContainsString('sombre', strtolower($response->json('errors.carte_nationale.0')));
    }

    public function test_upload_rejects_oversized_photo(): void
    {
        Storage::fake('public');
        $client = $this->createClient();

        $this->actingAs($client, 'sanctum')->post('/api/client/carte-nationale', [
            'carte_nationale' => UploadedFile::fake()->create('cin.jpg', 6000, 'image/jpeg'),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('carte_nationale');
    }

    public function test_uploading_a_new_identity_document_resets_validation_and_deletes_previous_file(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('documents/carte-nationale/ancienne.jpg', 'ancienne');

        $client = $this->createClient([
            'carte_nationale' => 'documents/carte-nationale/ancienne.jpg',
            'carte_nationale_statut' => 'valide',
        ]);

        $this->actingAs($client, 'sanctum')->post('/api/client/carte-nationale', [
            'carte_nationale' => $this->fixture('good-document.jpg'),
        ], ['Accept' => 'application/json'])->assertOk();

        Storage::disk('public')->assertMissing('documents/carte-nationale/ancienne.jpg');
        $client->refresh();
        $this->assertSame('en_attente', $client->carte_nationale_statut);
        $this->assertNotSame('documents/carte-nationale/ancienne.jpg', $client->carte_nationale);
    }

    public function test_reservation_is_blocked_when_moroccan_has_no_carte_nationale(): void
    {
        $client = $this->createClient(['carte_nationale' => null]);
        $vehicule = $this->createVehicule();

        $response = $this->actingAs($client, 'sanctum')
            ->postJson('/api/reservations', $this->reservationPayload($vehicule));

        $response->assertStatus(422);
        $this->assertStringContainsString('carte nationale', strtolower($response->json('message')));
    }

    public function test_reservation_is_blocked_when_carte_nationale_is_not_validated(): void
    {
        $client = $this->createClient(['carte_nationale_statut' => 'en_attente']);
        $vehicule = $this->createVehicule();

        $response = $this->actingAs($client, 'sanctum')
            ->postJson('/api/reservations', $this->reservationPayload($vehicule));

        $response->assertStatus(422);
        $this->assertStringContainsString('carte nationale', strtolower($response->json('message')));
    }

    public function test_reservation_is_blocked_when_foreigner_has_no_passeport(): void
    {
        $client = $this->createClient([
            'est_etranger' => true,
            'passeport_document' => null,
            'passeport_statut' => 'en_attente',
        ]);
        $vehicule = $this->createVehicule();

        $response = $this->actingAs($client, 'sanctum')
            ->postJson('/api/reservations', $this->reservationPayload($vehicule));

        $response->assertStatus(422);
        $this->assertStringContainsString('passeport', strtolower($response->json('message')));
    }

    public function test_reservation_is_blocked_when_passeport_is_not_validated(): void
    {
        $client = $this->createClient([
            'est_etranger' => true,
            'passeport_document' => 'documents/passeport/passeport.jpg',
            'passeport_statut' => 'rejete',
        ]);
        $vehicule = $this->createVehicule();

        $response = $this->actingAs($client, 'sanctum')
            ->postJson('/api/reservations', $this->reservationPayload($vehicule));

        $response->assertStatus(422);
        $this->assertStringContainsString('passeport', strtolower($response->json('message')));
    }

    public function test_moroccan_client_does_not_need_a_passeport(): void
    {
        $client = $this->createClient([
            'est_etranger' => false,
            'passeport_document' => null,
            'passeport_statut' => 'en_attente',
        ]);
        $vehicule = $this->createVehicule();

        $this->actingAs($client, 'sanctum')
            ->postJson('/api/reservations', $this->reservationPayload($vehicule))
            ->assertCreated();
    }

    public function test_foreign_client_does_not_need_a_carte_nationale(): void
    {
        $client = $this->createClient([
            'est_etranger' => true,
            'carte_nationale' => null,
            'carte_nationale_statut' => 'en_attente',
            'passeport_document' => 'documents/passeport/passeport.jpg',
            'passeport_statut' => 'valide',
        ]);
        $vehicule = $this->createVehicule();

        $this->actingAs($client, 'sanctum')
            ->postJson('/api/reservations', $this->reservationPayload($vehicule))
            ->assertCreated();
    }

    public function test_admin_can_validate_and_reject_an_identity_document(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient(['carte_nationale_statut' => 'en_attente']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/clients/{$client->id}/documents/carte-nationale", [
                'statut' => 'valide',
            ])->assertOk();

        $client->refresh();
        $this->assertSame('valide', $client->carte_nationale_statut);
        $this->assertNull($client->carte_nationale_rejet_motif);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/clients/{$client->id}/documents/carte-nationale", [
                'statut' => 'rejete',
                'motif' => 'Photo floue, illisible',
            ])->assertOk();

        $client->refresh();
        $this->assertSame('rejete', $client->carte_nationale_statut);
        $this->assertSame('Photo floue, illisible', $client->carte_nationale_rejet_motif);
    }

    public function test_admin_rejection_of_identity_document_requires_a_motif(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/clients/{$client->id}/documents/carte-nationale", [
                'statut' => 'rejete',
            ])->assertStatus(422)
            ->assertJsonValidationErrors('motif');
    }

    public function test_admin_cannot_validate_a_missing_identity_document(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient(['carte_nationale' => null]);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/clients/{$client->id}/documents/carte-nationale", [
                'statut' => 'valide',
            ])->assertStatus(422);
    }

    public function test_admin_cannot_validate_an_unknown_document_type(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/clients/{$client->id}/documents/acte-naissance", [
                'statut' => 'valide',
            ])->assertStatus(422);
    }

    public function test_upload_requires_authentication(): void
    {
        Storage::fake('public');

        $this->post('/api/client/carte-nationale', [
            'carte_nationale' => $this->fixture('good-document.jpg'),
        ], ['Accept' => 'application/json'])->assertUnauthorized();
    }
}
