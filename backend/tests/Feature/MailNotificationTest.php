<?php

namespace Tests\Feature;

use App\Mail\AdminNewReservation;
use App\Mail\ContactMessage;
use App\Mail\TestMail;
use App\Models\Client;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Les notifications internes doivent partir vers MAIL_ADMIN_ADDRESS, et non
 * vers l'expediteur. Un changement de MAIL_FROM_ADDRESS ne doit jamais
 * detourner les alertes de l'agence.
 */
class MailNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'mail.admin_address' => 'agence@example.test',
            'mail.from.address' => 'expediteur@example.test',
        ]);
    }

    private function createVehicule(): Vehicule
    {
        return Vehicule::create([
            'marque' => 'Dacia',
            'modele' => 'Duster',
            'categorie' => 'SUV',
            'annee' => 2024,
            'transmission' => 'manuelle',
            'carburant' => 'diesel',
            'places' => 5,
            'puissance' => '115 ch',
            'kilometrage' => 12000,
            'prix_jour' => 400,
            'statut' => 'disponible',
        ]);
    }

    private function createClient(): Client
    {
        return Client::create([
            'nom_complet' => 'Client Test',
            'telephone' => '0612345678',
            'email' => 'client@example.test',
            'password' => 'password123',
            'permis_conduire' => 'permis/client.jpg',
            'permis_statut' => 'valide',
            'est_etranger' => false,
            'carte_nationale' => 'documents/carte-nationale/cin.jpg',
            'carte_nationale_statut' => 'valide',
        ]);
    }

    public function test_nouvelle_reservation_notifie_l_adresse_admin(): void
    {
        Mail::fake();

        $vehicule = $this->createVehicule();
        $client = $this->createClient();

        $this->actingAs($client, 'sanctum')->postJson('/api/reservations', [
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->addDays(20)->toDateString().' 09:00:00',
            'date_fin' => now()->addDays(23)->toDateString().' 09:00:00',
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'mode_paiement' => 'especes',
        ])->assertCreated();

        Mail::assertQueued(
            AdminNewReservation::class,
            fn (AdminNewReservation $mail) => $mail->hasTo('agence@example.test')
        );
    }

    public function test_message_de_contact_notifie_l_adresse_admin(): void
    {
        Mail::fake();

        $this->postJson('/api/contact', [
            'nom' => 'Jean Dupont',
            'contact' => 'jean@example.test',
            'sujet' => 'Disponibilite',
            'message' => 'Bonjour, le Duster est-il libre la semaine prochaine ?',
        ])->assertCreated();

        Mail::assertQueued(
            ContactMessage::class,
            fn (ContactMessage $mail) => $mail->hasTo('agence@example.test')
        );
    }

    public function test_commande_mail_test_envoie_vers_l_adresse_admin(): void
    {
        Mail::fake();

        $this->artisan('mail:test')->assertSuccessful();

        Mail::assertSent(
            TestMail::class,
            fn (TestMail $mail) => $mail->hasTo('agence@example.test')
        );
    }

    public function test_commande_mail_test_accepte_un_destinataire_explicite(): void
    {
        Mail::fake();

        $this->artisan('mail:test', ['destinataire' => 'autre@example.test'])->assertSuccessful();

        Mail::assertSent(
            TestMail::class,
            fn (TestMail $mail) => $mail->hasTo('autre@example.test')
        );
    }

    public function test_commande_mail_test_refuse_une_adresse_invalide(): void
    {
        Mail::fake();

        $this->artisan('mail:test', ['destinataire' => 'pas-un-email'])->assertFailed();

        Mail::assertNothingSent();
    }
}
