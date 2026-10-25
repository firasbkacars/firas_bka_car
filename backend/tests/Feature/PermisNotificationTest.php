<?php

namespace Tests\Feature;

use App\Mail\AdminReservationCancelled;
use App\Mail\PermisExpirationReminder;
use App\Models\Client;
use App\Models\Favori;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PermisNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function createClient(array $overrides = []): Client
    {
        return Client::create(array_merge([
            'nom_complet' => 'Mohammed Ghanmi',
            'telephone' => '0612345678',
            'email' => 'mohammed@gmail.com',
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

    private function createReservation(Client $client, Vehicule $vehicule, array $overrides = []): Reservation
    {
        return Reservation::create(array_merge([
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

    /** N6 : l'admin est prevenu quand un client annule. */
    public function test_client_cancellation_notifies_admin(): void
    {
        Mail::fake();

        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());

        $response = $this->actingAs($client, 'sanctum')
            ->putJson("/api/client/reservations/{$reservation->id}/annuler");

        $response->assertOk();
        Mail::assertQueued(AdminReservationCancelled::class);
    }

    /** P1 : la date d'expiration se saisit depuis le profil client. */
    public function test_client_can_set_permis_expiration_date(): void
    {
        $client = $this->createClient(['permis_statut' => 'valide']);

        $response = $this->actingAs($client, 'sanctum')->putJson('/api/client/profile', [
            'date_expiration_permis' => '2030-06-30',
        ]);

        $response->assertOk();
        $this->assertSame(
            '2030-06-30',
            $client->fresh()->date_expiration_permis->format('Y-m-d')
        );
    }

    /**
     * Faille de contournement : un permis expire ne peut pas etre prolonge
     * silencieusement via le profil, il redevient a valider.
     */
    public function test_changing_expiration_reopens_validation_for_expired_permis(): void
    {
        $client = $this->createClient([
            'permis_statut' => 'expire',
            'date_expiration_permis' => now()->subDay()->toDateString(),
            'permis_rappel_envoye_le' => now()->subDays(20)->toDateString(),
        ]);

        $this->actingAs($client, 'sanctum')->putJson('/api/client/profile', [
            'date_expiration_permis' => now()->addYear()->toDateString(),
        ])->assertOk();

        $client->refresh();
        $this->assertSame('en_attente', $client->permis_statut);
        $this->assertNull($client->permis_rappel_envoye_le);
    }

    /** P2 : reservation bloquee si le permis est expire, meme statut 'valide'. */
    public function test_reservation_is_blocked_when_permis_expired(): void
    {
        $client = $this->createClient([
            'permis_statut' => 'valide',
            'date_expiration_permis' => now()->subDay()->toDateString(),
        ]);
        $vehicule = $this->createVehicule();

        $this->actingAs($client, 'sanctum')->postJson('/api/reservations', [
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->addDays(20)->toDateString().' 09:00:00',
            'date_fin' => now()->addDays(23)->toDateString().' 09:00:00',
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'mode_paiement' => 'especes',
        ])->assertStatus(422);
    }

    /** P2 : un permis dont la date est passee ne peut pas etre valide par l'admin. */
    public function test_admin_cannot_validate_an_expired_permis(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient([
            'permis_statut' => 'en_attente',
            'date_expiration_permis' => now()->subDay()->toDateString(),
        ]);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/clients/{$client->id}/permis", ['statut' => 'valide'])
            ->assertStatus(422);
    }

    /** P2 : la commande bascule le statut et evite les doublons de rappel. */
    public function test_permis_check_command_expires_and_reminds_once(): void
    {
        Mail::fake();

        $expire = $this->createClient([
            'permis_statut' => 'valide',
            'date_expiration_permis' => now()->subDay()->toDateString(),
        ]);
        $bientot = $this->createClient([
            'permis_statut' => 'valide',
            'date_expiration_permis' => now()->addDays(10)->toDateString(),
        ]);

        $this->artisan('permis:verifier')->assertSuccessful();

        $this->assertSame('expire', $expire->fresh()->permis_statut);
        $this->assertSame('valide', $bientot->fresh()->permis_statut);
        Mail::assertQueued(PermisExpirationReminder::class, 1);

        // Deuxieme execution le lendemain : pas de second rappel.
        $this->artisan('permis:verifier')->assertSuccessful();

        Mail::assertQueued(PermisExpirationReminder::class, 1);
        $this->assertNotNull($bientot->fresh()->permis_rappel_envoye_le);
    }

    /** P3 : les permis lointains ne sont pas premunis. */
    public function test_permis_far_from_expiration_gets_no_reminder(): void
    {
        Mail::fake();

        $this->createClient([
            'permis_statut' => 'valide',
            'date_expiration_permis' => now()->addYear()->toDateString(),
        ]);

        $this->artisan('permis:verifier')->assertSuccessful();

        Mail::assertNothingQueued();
    }

    /** U5 : la photo de profil s'upload sur le disque public. */
    public function test_client_can_upload_profile_photo(): void
    {
        Storage::fake('public');

        $client = $this->createClient();

        $response = $this->actingAs($client, 'sanctum')->post('/api/client/photo', [
            'photo' => $this->fakeJpeg(),
        ], ['Accept' => 'application/json']);

        $response->assertOk();
        $path = $response->json('photo_profil');
        $this->assertNotEmpty($path);
        Storage::disk('public')->assertExists($path);
        $this->assertNotNull($client->fresh()->photo_profil);
    }

    public function test_profile_photo_rejects_non_image(): void
    {
        Storage::fake('public');

        $client = $this->createClient();

        $this->actingAs($client, 'sanctum')->post('/api/client/photo', [
            'photo' => UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertStatus(422);
    }

    /**
     * Les tests tournent sans extension GD : on fournit un vrai (minime)
     * fichier JPEG plutot que UploadedFile::fake()->image().
     */
    private function fakeJpeg(): UploadedFile
    {
        $jpeg = "\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xFF\xD9";

        return UploadedFile::fake()->createWithContent('moi.jpg', $jpeg);
    }

    /** U9 : ajout, liste et retrait des favoris. */
    public function test_client_can_toggle_and_list_favorites(): void
    {
        $client = $this->createClient();
        $vehicule = $this->createVehicule();

        $this->actingAs($client, 'sanctum')
            ->postJson('/api/client/favoris', ['vehicule_id' => $vehicule->id])
            ->assertCreated()
            ->assertJson(['favori' => true]);

        $liste = $this->actingAs($client, 'sanctum')->getJson('/api/client/favoris');
        $liste->assertOk();
        $this->assertCount(1, $liste->json());
        $this->assertSame($vehicule->id, $liste->json('0.vehicule.id'));

        // Un second appel retire le favori (bascule).
        $this->actingAs($client, 'sanctum')
            ->postJson('/api/client/favoris', ['vehicule_id' => $vehicule->id])
            ->assertOk()
            ->assertJson(['favori' => false]);

        $this->assertCount(0, $this->actingAs($client, 'sanctum')->getJson('/api/client/favoris')->json());
    }

    public function test_favorites_require_authentication(): void
    {
        $vehicule = $this->createVehicule();

        $this->postJson('/api/client/favoris', ['vehicule_id' => $vehicule->id])->assertUnauthorized();
        $this->getJson('/api/client/favoris')->assertUnauthorized();

        $this->assertSame(0, Favori::count());
    }

    public function test_favorites_reject_unknown_vehicle(): void
    {
        $client = $this->createClient();

        $this->actingAs($client, 'sanctum')
            ->postJson('/api/client/favoris', ['vehicule_id' => 999999])
            ->assertStatus(422);
    }
}
