<?php

namespace Tests\Feature;

use App\Models\Avi;
use App\Models\Client;
use App\Models\Maintenance;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class Phase7QuickWinsTest extends TestCase
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

    private function createClient(): Client
    {
        return Client::create([
            'nom_complet' => 'Client Quick Wins',
            'telephone' => '0611223344',
            'email' => 'quickwins@example.com',
            'password' => 'password123',
            'permis_statut' => 'valide',
        ]);
    }

    // ------------------------------------------------------------- D3

    public function test_avis_commentaire_is_sanitized_before_storage(): void
    {
        $client = $this->createClient();
        $vehicule = $this->createVehicule();

        $this->actingAs($client, 'sanctum')->postJson('/api/avis', [
            'vehicule_id' => $vehicule->id,
            'note' => 5,
            'commentaire' => "  <script>alert(1)</script><b>Superbe</b> voiture\n\n  propre.  ",
        ])->assertCreated();

        $avi = Avi::first();
        $this->assertSame("alert(1)Superbe voiture\n\n propre.", $avi->commentaire);
        $this->assertStringNotContainsString('<script>', $avi->commentaire);
        $this->assertStringNotContainsString('<b>', $avi->commentaire);
    }

    public function test_password_and_email_are_not_mangled_by_sanitizer(): void
    {
        $this->postJson('/api/client/register', [
            'nom_complet' => 'Test Sanitize',
            'email' => 'sanitize.me@example.com',
            'telephone' => '0655443322',
            'password' => '<b>MotDePasse123</b>',
            'password_confirmation' => '<b>MotDePasse123</b>',
        ])->assertCreated();

        // Le mot de passe est stocke tel que valide (cast bcrypt), l'email brut.
        $this->assertDatabaseHas('clients', ['email' => 'sanitize.me@example.com']);
    }

    // ------------------------------------------------------------- M3

    public function test_sante_verifier_is_quiet_when_healthy(): void
    {
        Mail::fake();

        $this->artisan('sante:verifier')
            ->expectsOutputToContain('OK')
            ->assertExitCode(0);

        Mail::assertNothingSent();
        Mail::assertNothingQueued();
    }

    public function test_sante_verifier_notifies_admin_on_failed_jobs(): void
    {
        Mail::fake();

        DB::table('failed_jobs')->insert([
            'id' => 1,
            'uuid' => 'e2e-failed-job-1',
            'connection' => 'database',
            'queue' => 'default',
            'payload' => '{}',
            'exception' => 'RuntimeException: boom',
            'failed_at' => now(),
        ]);

        $this->artisan('sante:verifier')->assertExitCode(0);

        Mail::assertQueued(\App\Mail\AlerteSanteServeur::class, function ($mail) {
            return str_contains(implode(' ', $mail->problemes), 'failed_jobs')
                && $mail->hasTo(config('mail.from.address'));
        });
    }

    // ------------------------------------------------------------- G3

    public function test_planifier_entretien_projects_overdue_vidange(): void
    {
        $vehicule = $this->createVehicule();
        $vehicule->forceFill(['created_at' => now()->subMonths(8)])->save();

        $this->artisan('vehicules:planifier-entretien')->assertExitCode(0);

        // Vidange (6 mois) : due depuis 2 mois -> creee.
        $this->assertDatabaseHas('maintenances', [
            'vehicule_id' => $vehicule->id,
            'type' => 'Vidange',
            'statut' => 'prevue',
        ]);

        // Controle technique (12 mois) : encore 4 mois -> pas encore.
        $this->assertDatabaseMissing('maintenances', [
            'vehicule_id' => $vehicule->id,
            'type' => 'Controle technique',
        ]);
    }

    public function test_planifier_entretien_does_not_duplicate_existing_plan(): void
    {
        $vehicule = $this->createVehicule();
        $vehicule->forceFill(['created_at' => now()->subMonths(8)])->save();

        Maintenance::create([
            'vehicule_id' => $vehicule->id,
            'type' => 'Vidange',
            'date_prevue' => now()->addDays(10),
            'statut' => 'prevue',
        ]);

        $this->artisan('vehicules:planifier-entretien')->assertExitCode(0);

        $this->assertSame(1, Maintenance::where('vehicule_id', $vehicule->id)
            ->where('type', 'Vidange')->count());
    }

    public function test_planifier_entretien_uses_last_realized_date(): void
    {
        $vehicule = $this->createVehicule();
        $vehicule->forceFill(['created_at' => now()->subYears(3)])->save();

        // Derniere vidange realisee il y a 2 mois : prochaine dans 4 mois, rien a faire.
        Maintenance::create([
            'vehicule_id' => $vehicule->id,
            'type' => 'Vidange',
            'date_prevue' => now()->subMonths(2),
            'date_realisee' => now()->subMonths(2),
            'statut' => 'terminee',
        ]);

        $this->artisan('vehicules:planifier-entretien')->assertExitCode(0);

        $this->assertDatabaseMissing('maintenances', [
            'vehicule_id' => $vehicule->id,
            'type' => 'Vidange',
            'statut' => 'prevue',
        ]);
    }
}
