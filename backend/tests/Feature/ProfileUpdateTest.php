<?php

namespace Tests\Feature;

use App\Models\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regression : la regex du telephone contient une alternative (`\+212|0`).
 * Sous forme de chaine, le `|` etait interprete comme un separateur de
 * regles et Laravel executait preg_match('/^(\+212'), provoquant un 500.
 */
class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    private function createClient(array $overrides = []): Client
    {
        return Client::create(array_merge([
            'nom_complet' => 'Client Test',
            'telephone' => '0612345678',
            'email' => 'client@example.test',
            'password' => 'password123',
            'permis_conduire' => 'permis/client.jpg',
            'permis_statut' => 'valide',
            'est_etranger' => false,
            'carte_nationale' => 'documents/carte-nationale/cin.jpg',
            'carte_nationale_statut' => 'valide',
        ], $overrides));
    }

    public function test_client_can_update_profile_with_moroccan_phone(): void
    {
        $client = $this->createClient();

        $this->actingAs($client, 'sanctum')
            ->putJson('/api/client/profile', [
                'nom_complet' => 'Nouveau Nom',
                'telephone' => '0698765432',
                'email' => 'client@example.test',
                'cin' => 'AB123456',
                'adresse' => 'Tanger',
            ])
            ->assertOk()
            ->assertJsonPath('nom_complet', 'Nouveau Nom')
            ->assertJsonPath('telephone', '0698765432');

        $this->assertDatabaseHas('clients', [
            'id' => $client->id,
            'telephone' => '0698765432',
        ]);
    }

    public function test_client_can_update_profile_with_international_phone(): void
    {
        $client = $this->createClient();

        $this->actingAs($client, 'sanctum')
            ->putJson('/api/client/profile', [
                'telephone' => '+212698765432',
            ])
            ->assertOk()
            ->assertJsonPath('telephone', '+212698765432');
    }

    public function test_invalid_phone_returns_422_instead_of_500(): void
    {
        $client = $this->createClient();

        $this->actingAs($client, 'sanctum')
            ->putJson('/api/client/profile', [
                'telephone' => '12345',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('telephone');
    }

    public function test_profile_update_without_phone_still_works(): void
    {
        $client = $this->createClient();

        $this->actingAs($client, 'sanctum')
            ->putJson('/api/client/profile', [
                'nom_complet' => 'Nom Sans Telephone',
            ])
            ->assertOk()
            ->assertJsonPath('nom_complet', 'Nom Sans Telephone');
    }

    public function test_profile_update_rejects_duplicate_email(): void
    {
        $client = $this->createClient();
        $this->createClient([
            'email' => 'autre@example.test',
            'telephone' => '0655555555',
        ]);

        $this->actingAs($client, 'sanctum')
            ->putJson('/api/client/profile', [
                'email' => 'autre@example.test',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_phone_with_spaces_is_normalized_before_saving(): void
    {
        $client = $this->createClient();

        $this->actingAs($client, 'sanctum')
            ->putJson('/api/client/profile', [
                'telephone' => '06 12 34 56 78',
            ])
            ->assertOk()
            ->assertJsonPath('telephone', '0612345678');

        $this->assertDatabaseHas('clients', [
            'id' => $client->id,
            'telephone' => '0612345678',
        ]);
    }

    public function test_international_phone_variants_are_normalized(): void
    {
        $client = $this->createClient();

        $this->actingAs($client, 'sanctum')
            ->putJson('/api/client/profile', [
                'telephone' => '+212 6 98 76 54 32',
            ])
            ->assertOk()
            ->assertJsonPath('telephone', '+212698765432');

        $this->actingAs($client, 'sanctum')
            ->putJson('/api/client/profile', [
                'telephone' => '00212 6 98 76 54 32',
            ])
            ->assertOk()
            ->assertJsonPath('telephone', '+212698765432');
    }

    public function test_cin_and_passport_are_uppercased_and_stripped(): void
    {
        $client = $this->createClient();

        $this->actingAs($client, 'sanctum')
            ->putJson('/api/client/profile', [
                'cin' => 'ab-123456',
                'passeport' => 'x 123 4567',
            ])
            ->assertOk()
            ->assertJsonPath('cin', 'AB123456')
            ->assertJsonPath('passeport', 'X1234567');
    }

    public function test_registration_normalizes_phone_and_cin(): void
    {
        $response = $this->postJson('/api/client/register', [
            'nom_complet' => 'Nouveau Client',
            'email' => 'nouveau@example.test',
            'telephone' => '06 98 76 54 32',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'cin' => 'ab-123456',
        ]);

        $response->assertCreated()
            ->assertJsonPath('client.telephone', '0698765432')
            ->assertJsonPath('client.cin', 'AB123456');
    }
}
