<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Paiement;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Parcours "Paiement de l'acompte" par virement ou Wafacash / Cash Plus.
 *
 * Le recu depose par le client est un justificatif, jamais un encaissement :
 * seul un admin peut le valider. Ces tests verrouillent aussi l'absence de
 * coordonnees bancaires inventees et la confidentialite du fichier.
 */
class AcomptePaymentTest extends TestCase
{
    use RefreshDatabase;

    private function createClient(array $overrides = []): Client
    {
        return Client::create(array_merge([
            'nom_complet' => 'Client Acompte',
            'telephone' => '0612345678',
            'email' => 'acompte@example.com',
            'password' => 'password123',
            'permis_conduire' => 'permis/p.jpg',
            'permis_statut' => 'valide',
        ], $overrides));
    }

    private function createVehicule(): Vehicule
    {
        return Vehicule::create([
            'marque' => 'Dacia',
            'modele' => 'Duster',
            'categorie' => 'SUV',
            'annee' => 2023,
            'transmission' => 'manuelle',
            'carburant' => 'diesel',
            'places' => 5,
            'prix_jour' => 500,
            'statut' => 'disponible',
        ]);
    }

    private function createReservation(Client $client, array $overrides = []): Reservation
    {
        return Reservation::create(array_merge([
            'numero' => Reservation::genererNumero(),
            'client_id' => $client->id,
            'vehicule_id' => $this->createVehicule()->id,
            'date_debut' => now()->addDays(10),
            'date_fin' => now()->addDays(15),
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'prix_total' => 2500,
            'acompte' => 750,
            'statut' => 'confirmee',
            'mode_paiement' => 'especes',
        ], $overrides));
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Admin Acompte',
            'email' => 'admin-acompte@example.com',
            'password' => 'password',
            'role' => User::ROLE_ADMIN,
        ]);
    }

    private function createPendingPayment(Reservation $reservation, string $methode = 'especes'): Paiement
    {
        $donnees = [
            'reservation_id' => $reservation->id,
            'montant' => $reservation->acompte,
            'methode' => $methode,
            'statut' => Paiement::STATUT_EN_ATTENTE,
            'type' => Paiement::TYPE_ACOMPTE,
        ];

        if ($methode === Paiement::METHODE_CMI) {
            $donnees['transaction_id'] = 'FBC-CMI-'.uniqid();
            $donnees['gateway'] = 'sandbox';
        }

        return Paiement::create($donnees);
    }

    private function uploadReceipt(Client $client, Reservation $reservation, array $overrides = [])
    {
        return $this->actingAs($client, 'sanctum')->post(
            "/api/client/reservations/{$reservation->numero}/acompte/recu",
            array_merge([
                'recu' => UploadedFile::fake()->create('recu-virement.jpg', 120, 'image/jpeg'),
                'methode' => 'virement',
            ], $overrides),
            ['Accept' => 'application/json']
        );
    }

    // ------------------------------------------------------------- lecture

    public function test_acompte_endpoint_requires_a_client_session(): void
    {
        $reservation = $this->createReservation($this->createClient());

        $this->getJson("/api/client/reservations/{$reservation->numero}/acompte")
            ->assertUnauthorized();
    }

    public function test_client_cannot_read_another_clients_deposit(): void
    {
        $owner = $this->createClient();
        $intruder = $this->createClient([
            'telephone' => '0622222222',
            'email' => 'intrus@example.com',
        ]);
        $reservation = $this->createReservation($owner);

        // 404 et non 403 : ne pas reveler l'existence de la reservation.
        $this->actingAs($intruder, 'sanctum')
            ->getJson("/api/client/reservations/{$reservation->numero}/acompte")
            ->assertNotFound();
    }

    public function test_show_returns_real_amounts_and_no_fake_bank_details(): void
    {
        config([
            'entreprise.rib' => null,
            'entreprise.banque' => null,
            'entreprise.beneficiaire' => null,
            'entreprise.gerant' => null,
            'entreprise.cin_gerant' => null,
            'entreprise.telephone_transfert' => null,
        ]);

        $client = $this->createClient();
        $reservation = $this->createReservation($client);
        $this->createPendingPayment($reservation);

        $response = $this->actingAs($client, 'sanctum')
            ->getJson("/api/client/reservations/{$reservation->numero}/acompte")
            ->assertOk()
            ->assertJsonPath('reservation.numero', $reservation->numero)
            ->assertJsonPath('reservation.prix_total', 2500)
            ->assertJsonPath('reservation.acompte', 750)
            ->assertJsonPath('reservation.acompte_restant', 750)
            ->assertJsonPath('reservation.reste_apres_acompte', 1750)
            ->assertJsonPath('reservation.taux_acompte', 30)
            ->assertJsonPath('coordonnees.virement.disponible', false)
            ->assertJsonPath('coordonnees.wafacash.disponible', false)
            ->assertJsonPath('coordonnees.virement.rib', null)
            ->assertJsonPath('coordonnees.wafacash.telephone', null);

        // Aucun placeholder du mockup ne doit fuiter dans la reponse.
        $this->assertStringNotContainsString('000 000 0000000000000000', $response->getContent());
        $this->assertStringNotContainsString('[Nom de la banque]', $response->getContent());
        $this->assertStringNotContainsString('XX000000', $response->getContent());
    }

    public function test_show_exposes_only_configured_coordinates(): void
    {
        config([
            'entreprise.banque' => 'Banque Test',
            'entreprise.rib' => '011 780 0000000000000000 12',
            'entreprise.beneficiaire' => 'FIRAS BKA CAR SARL',
            'entreprise.gerant' => 'Gerant Test',
            'entreprise.cin_gerant' => 'AB123456',
            'entreprise.telephone_transfert' => '0600000000',
        ]);

        $client = $this->createClient();
        $reservation = $this->createReservation($client);

        $this->actingAs($client, 'sanctum')
            ->getJson("/api/client/reservations/{$reservation->numero}/acompte")
            ->assertOk()
            ->assertJsonPath('coordonnees.virement.disponible', true)
            ->assertJsonPath('coordonnees.virement.banque', 'Banque Test')
            ->assertJsonPath('coordonnees.virement.rib', '011 780 0000000000000000 12')
            ->assertJsonPath('coordonnees.wafacash.disponible', true)
            ->assertJsonPath('coordonnees.wafacash.cin', 'AB123456');
    }

    // ------------------------------------------------------------- depot

    public function test_receipt_is_stored_privately_and_does_not_validate_payment(): void
    {
        Storage::fake('local');
        Storage::fake('public');

        $client = $this->createClient();
        $reservation = $this->createReservation($client);
        $paiement = $this->createPendingPayment($reservation);

        $response = $this->uploadReceipt($client, $reservation)
            ->assertCreated()
            ->assertJsonPath('acompte.recu.methode', 'virement')
            ->assertJsonPath('acompte.recu.statut', Paiement::STATUT_EN_ATTENTE)
            ->assertJsonPath('acompte.reservation.acompte_paye', 0);

        $paiement->refresh();

        $this->assertSame(Paiement::METHODE_VIREMENT, $paiement->methode);
        $this->assertSame(Paiement::METHODE_VIREMENT, $paiement->gateway);
        $this->assertSame(Paiement::STATUT_EN_ATTENTE, $paiement->statut);
        $this->assertNull($paiement->date_paiement);
        $this->assertNotNull($paiement->recu_path);
        $this->assertSame('recu-virement.jpg', $paiement->recu_nom_original);
        Storage::disk('local')->assertExists($paiement->recu_path);
        Storage::disk('public')->assertMissing($paiement->recu_path);

        // Le chemin disque reste prive, meme dans la reponse du client.
        $this->assertStringNotContainsString('recu_path', $response->getContent());
        $this->assertSame(0.0, (float) $reservation->fresh()->acompte_paye);
    }

    public function test_receipts_follow_the_configured_disk(): void
    {
        Storage::fake('recus');
        config(['filesystems.receipts_disk' => 'recus']);

        $client = $this->createClient();
        $reservation = $this->createReservation($client);
        $this->createPendingPayment($reservation);

        $this->uploadReceipt($client, $reservation)->assertCreated();

        $paiement = Paiement::where('reservation_id', $reservation->id)
            ->where('methode', Paiement::METHODE_VIREMENT)
            ->firstOrFail();

        Storage::disk('recus')->assertExists($paiement->recu_path);
        Storage::disk('local')->assertMissing($paiement->recu_path);
    }

    public function test_uploading_a_receipt_preserves_a_pending_cmi_payment(): void
    {
        Storage::fake('local');

        $client = $this->createClient();
        $reservation = $this->createReservation($client);
        $cmi = $this->createPendingPayment($reservation, 'cmi');

        $this->uploadReceipt($client, $reservation, ['methode' => 'wafacash'])
            ->assertCreated();

        $cmi->refresh();
        $this->assertSame(Paiement::STATUT_EN_ATTENTE, $cmi->statut);
        $this->assertSame(Paiement::METHODE_CMI, $cmi->methode);
        $this->assertNotNull($cmi->transaction_id);

        $virement = Paiement::where('reservation_id', $reservation->id)
            ->where('methode', Paiement::METHODE_WAFACASH)
            ->first();

        $this->assertNotNull($virement);
        $this->assertSame(Paiement::STATUT_EN_ATTENTE, $virement->statut);
        $this->assertSame(2, Paiement::where('reservation_id', $reservation->id)->count());
    }

    public function test_upload_rejects_an_unsupported_file(): void
    {
        Storage::fake('local');

        $client = $this->createClient();
        $reservation = $this->createReservation($client);
        $this->createPendingPayment($reservation);

        $this->uploadReceipt($client, $reservation, [
            'recu' => UploadedFile::fake()->create('recu.txt', 10, 'text/plain'),
        ])->assertUnprocessable();

        $this->assertDatabaseMissing('paiements', [
            'reservation_id' => $reservation->id,
            'methode' => Paiement::METHODE_VIREMENT,
        ]);
    }

    public function test_client_cannot_upload_to_another_clients_reservation(): void
    {
        Storage::fake('local');

        $owner = $this->createClient();
        $intruder = $this->createClient([
            'telephone' => '0633333333',
            'email' => 'intrus2@example.com',
        ]);
        $reservation = $this->createReservation($owner);
        $this->createPendingPayment($reservation);

        $this->uploadReceipt($intruder, $reservation)->assertNotFound();

        $this->assertSame(0, Paiement::whereNotNull('recu_path')->count());
    }

    public function test_cancelled_reservation_rejects_a_receipt(): void
    {
        Storage::fake('local');

        $client = $this->createClient();
        $reservation = $this->createReservation($client, ['statut' => 'annulee']);
        $this->createPendingPayment($reservation);

        $this->uploadReceipt($client, $reservation)
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'Cette reservation est annulee : aucun acompte ne peut etre envoye.'
            );

        $this->assertSame(0, Paiement::whereNotNull('recu_path')->count());
    }

    public function test_upload_is_refused_when_deposit_is_already_paid(): void
    {
        Storage::fake('local');

        $client = $this->createClient();
        $reservation = $this->createReservation($client);
        Paiement::create([
            'reservation_id' => $reservation->id,
            'montant' => 750,
            'methode' => Paiement::METHODE_VIREMENT,
            'statut' => Paiement::STATUT_PAYE,
            'type' => Paiement::TYPE_ACOMPTE,
            'date_paiement' => now(),
        ]);

        $this->uploadReceipt($client, $reservation)
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Votre acompte est deja regle.');
    }

    // --------------------------------------------------------- validation

    public function test_admin_validation_marks_deposit_paid_and_enables_download(): void
    {
        Storage::fake('local');

        $client = $this->createClient();
        $reservation = $this->createReservation($client);
        $this->createPendingPayment($reservation);
        $this->uploadReceipt($client, $reservation)->assertCreated();

        $paiement = Paiement::where('reservation_id', $reservation->id)
            ->where('methode', Paiement::METHODE_VIREMENT)
            ->firstOrFail();
        $admin = $this->createAdmin();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/paiements/{$paiement->id}/valider-recu")
            ->assertOk()
            ->assertJsonPath('message', 'Acompte valide');

        $paiement->refresh();
        $this->assertSame(Paiement::STATUT_PAYE, $paiement->statut);
        $this->assertNotNull($paiement->date_paiement);
        $this->assertNotNull($paiement->verifie_le);
        $this->assertSame(750.0, (float) $reservation->fresh()->acompte_paye);

        // Le client proprietaire peut relire son justificatif.
        $this->actingAs($client, 'sanctum')
            ->get("/api/client/reservations/{$reservation->numero}/acompte/recu")
            ->assertOk();

        // Un autre client ne le peut pas.
        $intruder = $this->createClient([
            'telephone' => '0644444444',
            'email' => 'intrus3@example.com',
        ]);
        $this->actingAs($intruder, 'sanctum')
            ->get("/api/client/reservations/{$reservation->numero}/acompte/recu")
            ->assertNotFound();

        // L'admin peut telecharger le fichier depuis le disque prive.
        $this->actingAs($admin, 'sanctum')
            ->get("/api/paiements/{$paiement->id}/recu")
            ->assertOk();
    }

    public function test_admin_cannot_validate_a_payment_without_receipt(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client);
        $paiement = $this->createPendingPayment($reservation, Paiement::METHODE_VIREMENT);
        $admin = $this->createAdmin();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/paiements/{$paiement->id}/valider-recu")
            ->assertUnprocessable();

        $this->assertSame(Paiement::STATUT_EN_ATTENTE, $paiement->fresh()->statut);
    }

    public function test_admin_cannot_validate_a_receipt_whose_file_is_missing(): void
    {
        Storage::fake('local');

        $client = $this->createClient();
        $reservation = $this->createReservation($client);
        $this->createPendingPayment($reservation);
        $this->uploadReceipt($client, $reservation)->assertCreated();

        $paiement = Paiement::where('reservation_id', $reservation->id)
            ->where('methode', Paiement::METHODE_VIREMENT)
            ->firstOrFail();

        Storage::disk('local')->delete($paiement->recu_path);

        $this->actingAs($this->createAdmin(), 'sanctum')
            ->putJson("/api/paiements/{$paiement->id}/valider-recu")
            ->assertUnprocessable();

        $this->assertSame(Paiement::STATUT_EN_ATTENTE, $paiement->fresh()->statut);
    }

    public function test_client_cannot_validate_his_own_receipt(): void
    {
        Storage::fake('local');

        $client = $this->createClient();
        $reservation = $this->createReservation($client);
        $this->createPendingPayment($reservation);
        $this->uploadReceipt($client, $reservation)->assertCreated();

        $paiement = Paiement::where('reservation_id', $reservation->id)
            ->where('methode', Paiement::METHODE_VIREMENT)
            ->firstOrFail();

        $this->actingAs($client, 'sanctum')
            ->putJson("/api/paiements/{$paiement->id}/valider-recu")
            ->assertForbidden();

        $this->assertSame(Paiement::STATUT_EN_ATTENTE, $paiement->fresh()->statut);
    }

    public function test_validated_transfer_deposit_is_refundable(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, [
            'date_debut' => now()->addDays(10),
        ]);

        Paiement::create([
            'reservation_id' => $reservation->id,
            'montant' => 750,
            'methode' => Paiement::METHODE_VIREMENT,
            'statut' => Paiement::STATUT_PAYE,
            'type' => Paiement::TYPE_ACOMPTE,
            'date_paiement' => now(),
        ]);

        $this->actingAs($client, 'sanctum')
            ->putJson("/api/client/reservations/{$reservation->id}/annuler")
            ->assertOk()
            ->assertJsonPath('montant_rembourse', 750);

        $this->assertDatabaseHas('paiements', [
            'reservation_id' => $reservation->id,
            'type' => Paiement::TYPE_REMBOURSEMENT,
            'montant' => 750,
        ]);
        $this->assertSame(0.0, (float) $reservation->fresh()->acompte_paye);
    }
}
