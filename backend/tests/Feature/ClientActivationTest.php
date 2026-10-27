<?php

namespace Tests\Feature;

use App\Mail\InvitationCompte;
use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Activation du compte client cree par un agent (reservation par telephone).
 *
 * L'agent peut enregistrer un client sans mot de passe : le client recoit un
 * lien a usage unique pour definir son mot de passe et acceder a son espace.
 */
class ClientActivationTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'admin@firasbkacar.com',
            'password' => 'password',
            'role' => User::ROLE_ADMIN,
        ]);
    }

    private function createClient(array $overrides = []): Client
    {
        return Client::create(array_merge([
            'nom_complet' => 'Nadia Bennani',
            'telephone' => '0655443322',
            'email' => 'nadia@example.com',
            'password' => null,
        ], $overrides));
    }

    /** Recupere le token d'activation contenu dans l'email envoye. */
    private function tokenDepuisEmail(): string
    {
        $url = null;

        Mail::assertQueued(InvitationCompte::class, function (InvitationCompte $mail) use (&$url) {
            $url = $mail->activationUrl;

            return true;
        });

        $this->assertNotNull($url, "Aucun email d'invitation n'a ete mis en file.");

        return basename(parse_url($url, PHP_URL_PATH));
    }

    public function test_admin_peut_inviter_un_client_sans_mot_de_passe(): void
    {
        Mail::fake();

        $admin = $this->createAdmin();
        $client = $this->createClient();

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/clients/{$client->id}/invitation");

        $response->assertOk();
        $response->assertJsonPath('client.compte_active', false);

        $client->refresh();
        $this->assertNotNull($client->invitation_token);
        $this->assertTrue($client->invitation_expire_le->isFuture());
        // Le token en base est un hash : le lien recu par email ne doit pas
        // etre rejouable depuis une fuite de la base.
        $this->assertNotSame('', $client->invitation_token);
        $this->assertSame(64, strlen($client->invitation_token));

        Mail::assertQueued(
            InvitationCompte::class,
            fn (InvitationCompte $mail) => $mail->hasTo($client->email)
        );
    }

    public function test_invitation_refusee_si_le_compte_est_deja_actif(): void
    {
        Mail::fake();

        $admin = $this->createAdmin();
        $client = $this->createClient(['password' => 'motdepasse123']);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/clients/{$client->id}/invitation")
            ->assertStatus(422);

        Mail::assertNothingQueued();
    }

    public function test_invitation_refusee_sans_adresse_email(): void
    {
        Mail::fake();

        $admin = $this->createAdmin();
        $client = $this->createClient(['email' => null]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/clients/{$client->id}/invitation")
            ->assertStatus(422)
            ->assertJsonPath('message', "Ajoutez une adresse email a ce client avant de l'inviter.");

        Mail::assertNothingQueued();
    }

    public function test_un_client_ne_peut_pas_envoyer_d_invitation(): void
    {
        Mail::fake();

        $client = $this->createClient();
        $autre = $this->createClient(['telephone' => '0611111111', 'email' => 'autre@example.com']);

        $this->actingAs($client, 'sanctum')
            ->postJson("/api/clients/{$autre->id}/invitation")
            ->assertForbidden();

        Mail::assertNothingQueued();
    }

    public function test_la_demande_d_activation_repond_toujours_de_la_meme_facon(): void
    {
        Mail::fake();

        // Adresse inconnue : meme reponse qu'un compte eligible, pour ne pas
        // reveler l'existence d'un compte client.
        $this->postJson('/api/client/activer', ['email' => 'inconnu@example.com'])
            ->assertOk()
            ->assertJsonPath('message', 'Si un compte est eligible, un email d\'activation vient d\'etre envoye.');

        Mail::assertNothingQueued();

        $client = $this->createClient();

        $this->postJson('/api/client/activer', ['email' => $client->email])
            ->assertOk()
            ->assertJsonPath('message', 'Si un compte est eligible, un email d\'activation vient d\'etre envoye.');

        Mail::assertQueued(InvitationCompte::class);
    }

    public function test_la_demande_d_activation_ignore_un_compte_deja_actif(): void
    {
        Mail::fake();

        $client = $this->createClient(['password' => 'motdepasse123']);

        $this->postJson('/api/client/activer', ['email' => $client->email])
            ->assertOk();

        Mail::assertNothingQueued();
    }

    public function test_un_token_valide_permet_de_definir_le_mot_de_passe(): void
    {
        Mail::fake();

        $client = $this->createClient();

        $this->actingAs($this->createAdmin(), 'sanctum')
            ->postJson("/api/clients/{$client->id}/invitation")
            ->assertOk();

        $token = $this->tokenDepuisEmail();

        // La page publique affiche le titulaire du lien.
        $this->getJson("/api/client/activer/{$token}")
            ->assertOk()
            ->assertJsonPath('nom_complet', 'Nadia Bennani')
            ->assertJsonPath('email', 'nadia@example.com');

        $response = $this->postJson("/api/client/activer/{$token}", [
            'password' => 'NouveauMotDePasse123',
            'password_confirmation' => 'NouveauMotDePasse123',
        ]);

        $response->assertOk();
        $response->assertJsonPath('client.compte_active', true);
        $this->assertNotEmpty($response->json('token'));

        $client->refresh();
        $this->assertTrue(Hash::check('NouveauMotDePasse123', $client->password));
        $this->assertNotNull($client->email_verified_at);
        $this->assertNull($client->invitation_token);
        $this->assertNull($client->invitation_expire_le);
        // Le client cree par l'agent n'avait pas de code de parrainage.
        $this->assertNotNull($client->code_parrainage);

        // Le nouveau mot de passe fonctionne sur le parcours de connexion.
        $this->postJson('/api/client/login', [
            'email' => $client->email,
            'password' => 'NouveauMotDePasse123',
        ])->assertOk();
    }

    public function test_le_token_d_activation_est_a_usage_unique(): void
    {
        Mail::fake();

        $client = $this->createClient();

        $this->actingAs($this->createAdmin(), 'sanctum')
            ->postJson("/api/clients/{$client->id}/invitation")
            ->assertOk();

        $token = $this->tokenDepuisEmail();

        $this->postJson("/api/client/activer/{$token}", [
            'password' => 'NouveauMotDePasse123',
            'password_confirmation' => 'NouveauMotDePasse123',
        ])->assertOk();

        $this->postJson("/api/client/activer/{$token}", [
            'password' => 'AutreMotDePasse123',
            'password_confirmation' => 'AutreMotDePasse123',
        ])->assertStatus(422);
    }

    public function test_un_token_expire_est_refuse(): void
    {
        Mail::fake();

        $client = $this->createClient();

        $this->actingAs($this->createAdmin(), 'sanctum')
            ->postJson("/api/clients/{$client->id}/invitation")
            ->assertOk();

        $token = $this->tokenDepuisEmail();

        $client->forceFill(['invitation_expire_le' => now()->subMinute()])->save();

        $this->getJson("/api/client/activer/{$token}")
            ->assertStatus(422)
            ->assertJsonPath('message', "Ce lien d'activation est invalide ou a expire.");

        $this->postJson("/api/client/activer/{$token}", [
            'password' => 'NouveauMotDePasse123',
            'password_confirmation' => 'NouveauMotDePasse123',
        ])->assertStatus(422);
    }

    public function test_un_token_inconnu_est_refuse(): void
    {
        $this->getJson('/api/client/activer/token-inexistant')
            ->assertStatus(422);
    }

    public function test_le_mot_de_passe_doit_respecter_les_regles(): void
    {
        Mail::fake();

        $client = $this->createClient();

        $this->actingAs($this->createAdmin(), 'sanctum')
            ->postJson("/api/clients/{$client->id}/invitation")
            ->assertOk();

        $token = $this->tokenDepuisEmail();

        $this->postJson("/api/client/activer/{$token}", [
            'password' => 'court',
            'password_confirmation' => 'court',
        ])->assertStatus(422)
            ->assertJsonValidationErrors('password');

        $this->postJson("/api/client/activer/{$token}", [
            'password' => 'NouveauMotDePasse123',
            'password_confirmation' => 'Different123',
        ])->assertStatus(422)
            ->assertJsonValidationErrors('password');

        $this->assertNull($client->fresh()->password);
    }
}
