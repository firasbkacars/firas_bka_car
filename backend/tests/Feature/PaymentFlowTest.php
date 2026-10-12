<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Paiement;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicule;
use App\Services\CmiPaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Tests de regression du parcours de paiement par carte.
 *
 * Chaque test verrouille un correctif precis de la faille historique :
 *  - acompte marque "paye" sans encaissement ;
 *  - webhook reconfirmant un paiement deja confirme (double encaissement) ;
 *  - montant de la passerelle non controle ;
 *  - retour navigateur dont le resultat etait jete ;
 *  - verification permettant d'espionner les transactions d'autrui.
 */
class PaymentFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Toute la suite tourne en mode simule, sans contrat marchand.
        config(['cmi.mode' => 'sandbox']);
    }

    // ------------------------------------------------------------ fixtures

    private function createClient(array $overrides = []): Client
    {
        return Client::create(array_merge([
            'nom_complet' => 'Client Paiement',
            'telephone' => '0611111111',
            'email' => 'paiement@example.com',
            'password' => 'password123',
            'permis_conduire' => 'permis/p.jpg',
            'permis_statut' => 'valide',
        ], $overrides));
    }

    private function createVehicule(array $overrides = []): Vehicule
    {
        return Vehicule::create(array_merge([
            'marque' => 'Renault',
            'modele' => 'Clio',
            'categorie' => 'Citadine',
            'annee' => 2023,
            'transmission' => 'manuelle',
            'carburant' => 'essence',
            'places' => 5,
            'prix_jour' => 500,
            'statut' => 'disponible',
        ], $overrides));
    }

    private function createReservation(Client $client, Vehicule $vehicule, array $overrides = []): Reservation
    {
        return Reservation::create(array_merge([
            'numero' => Reservation::genererNumero(),
            'client_id' => $client->id,
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->addDays(10),
            'date_fin' => now()->addDays(15),
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'prix_total' => 2500,
            'acompte' => 750,
            'statut' => 'confirmee',
            'mode_paiement' => 'cmi',
        ], $overrides));
    }

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => 'password',
            'role' => User::ROLE_ADMIN,
        ]);
    }

    /** Signature HMAC-SHA256 identique a celle de la passerelle. */
    private function sign(array $payload, ?string $secret = null): string
    {
        unset($payload['signature']);
        ksort($payload);

        return hash_hmac(
            'sha256',
            http_build_query($payload),
            (string) ($secret ?? config('cmi.merchant_secret'))
        );
    }

    private function initPaiement(Reservation $reservation): Paiement
    {
        return Paiement::create([
            'reservation_id' => $reservation->id,
            'montant' => $reservation->acompte,
            'methode' => 'cmi',
            'statut' => Paiement::STATUT_EN_ATTENTE,
            'type' => Paiement::TYPE_ACOMPTE,
            'gateway' => 'sandbox',
            'transaction_id' => 'FBC-TEST-'.uniqid(),
        ]);
    }

    // ------------------------------------------------------------- initiation

    public function test_initialize_creates_pending_payment_with_unpredictable_transaction_id(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());

        $response = $this->actingAs($client, 'sanctum')->postJson('/api/client/payments/cmi/initialize', [
            'reservation_id' => $reservation->id,
        ]);

        $response->assertOk()->assertJsonPath('mode', 'sandbox');
        $this->assertNotNull($response->json('payment_url'));
        $tx = $response->json('transaction_id');

        $this->assertDatabaseHas('paiements', [
            'reservation_id' => $reservation->id,
            'transaction_id' => $tx,
            'statut' => Paiement::STATUT_EN_ATTENTE,
            'montant' => $reservation->acompte,
        ]);

        // Un identifiant deriveable (timestamp) permettait de forger des
        // transactions : on impose un UUID.
        $this->assertMatchesRegularExpression('/^FBC-[0-9A-F-]{36}$/', $tx);

        // L'acompte ne doit JAMAIS etre paye a l'initialisation.
        $this->assertDatabaseMissing('paiements', [
            'reservation_id' => $reservation->id,
            'statut' => Paiement::STATUT_PAYE,
        ]);
    }

    public function test_initialize_expires_previous_attempt_instead_of_leaving_two_pending(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());

        $first = $this->actingAs($client, 'sanctum')
            ->postJson('/api/client/payments/cmi/initialize', ['reservation_id' => $reservation->id])
            ->json('transaction_id');

        $second = $this->actingAs($client, 'sanctum')
            ->postJson('/api/client/payments/cmi/initialize', ['reservation_id' => $reservation->id])
            ->json('transaction_id');

        $this->assertNotSame($first, $second);

        $this->assertDatabaseHas('paiements', [
            'transaction_id' => $first,
            'statut' => Paiement::STATUT_EXPIRE,
        ]);
        $this->assertDatabaseHas('paiements', [
            'transaction_id' => $second,
            'statut' => Paiement::STATUT_EN_ATTENTE,
        ]);

        // Une seule ecriture en attente a la fois.
        $this->assertSame(1, Paiement::where('reservation_id', $reservation->id)
            ->enAttente()->count());
    }

    public function test_initialize_refuses_foreign_reservation(): void
    {
        $owner = $this->createClient();
        $intruder = $this->createClient([
            'telephone' => '0622222222',
            'email' => 'intruder@example.com',
        ]);
        $reservation = $this->createReservation($owner, $this->createVehicule());

        $this->actingAs($intruder, 'sanctum')
            ->postJson('/api/client/payments/cmi/initialize', ['reservation_id' => $reservation->id])
            ->assertForbidden();
    }

    // ---------------------------------------------------------------- webhook

    public function test_signed_webhook_confirms_payment(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());
        $paiement = $this->initPaiement($reservation);

        $payload = [
            'order_id' => $paiement->transaction_id,
            'status' => 'captured',
            'amount' => (int) round((float) $paiement->montant * 100),
        ];

        $this->postJson('/api/cmi/webhook', $payload + ['signature' => $this->sign($payload)])
            ->assertOk()
            ->assertJsonPath('processed', true);

        $this->assertDatabaseHas('paiements', [
            'id' => $paiement->id,
            'statut' => Paiement::STATUT_PAYE,
        ]);
        $this->assertNotNull(Paiement::find($paiement->id)->date_paiement);
    }

    public function test_webhook_replay_does_not_double_confirm(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());
        $paiement = $this->initPaiement($reservation);

        $payload = [
            'order_id' => $paiement->transaction_id,
            'status' => 'captured',
            'amount' => (int) round((float) $paiement->montant * 100),
        ];
        $signed = $payload + ['signature' => $this->sign($payload)];

        $this->postJson('/api/cmi/webhook', $signed)->assertOk();

        $firstPaidAt = Paiement::find($paiement->id)->date_paiement;

        // Rejeu du meme webhook (retry reseau de la passerelle).
        $this->postJson('/api/cmi/webhook', $signed)->assertOk();

        $paiement->refresh();

        // Une seule ecriture "paye", aucune duplication ni changement de date.
        $this->assertSame(Paiement::STATUT_PAYE, $paiement->statut);
        $this->assertTrue($firstPaidAt->equalTo($paiement->date_paiement));
        $this->assertSame(1, Paiement::where('reservation_id', $reservation->id)->count());
    }

    public function test_amount_mismatch_is_flagged_suspect_and_never_paid(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());
        $paiement = $this->initPaiement($reservation);

        // La passerelle annonce la moitie du montant du.
        $payload = [
            'order_id' => $paiement->transaction_id,
            'status' => 'captured',
            'amount' => (int) round((float) $paiement->montant * 50),
        ];

        $this->postJson('/api/cmi/webhook', $payload + ['signature' => $this->sign($payload)])
            ->assertStatus(422);

        $paiement->refresh();

        $this->assertSame(Paiement::STATUT_SUSPECT, $paiement->statut);
        $this->assertNull($paiement->date_paiement);
        $this->assertSame('AMOUNT_MISMATCH', $paiement->code_erreur_gateway);

        // Le revenu n'est pas encaisse.
        $this->assertSame(0.0, (float) $reservation->fresh()->acompte_paye);
    }

    public function test_failed_webhook_marks_payment_failed(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());
        $paiement = $this->initPaiement($reservation);

        $payload = [
            'order_id' => $paiement->transaction_id,
            'status' => 'declined',
            'error_code' => '51',
            'error_message' => 'Fonds insuffisants',
        ];

        $this->postJson('/api/cmi/webhook', $payload + ['signature' => $this->sign($payload)])
            ->assertOk();

        $this->assertDatabaseHas('paiements', [
            'id' => $paiement->id,
            'statut' => Paiement::STATUT_ECHOUE,
            'code_erreur_gateway' => '51',
        ]);
        $this->assertSame('confirmee', $reservation->fresh()->statut);
    }

    // ------------------------------------------------------- retour navigateur

    public function test_browser_callback_persists_verified_status(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());
        $paiement = $this->initPaiement($reservation);

        // Le client revient de la page de carte : le paiement doit etre
        // verifie ET enregistre, pas seulement affiche.
        $response = $this->get('/api/cmi/callback?order_id='.$paiement->transaction_id);

        $response->assertRedirectContains('/paiement/retour');

        $this->assertDatabaseHas('paiements', [
            'id' => $paiement->id,
            'statut' => Paiement::STATUT_ECHOUE,
        ]);
    }

    public function test_cancel_marks_pending_payment_cancelled(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());
        $paiement = $this->initPaiement($reservation);

        $this->get('/api/cmi/cancel?order_id='.$paiement->transaction_id)
            ->assertRedirectContains('/paiement/retour')
            // Le statut retourne en URL doit etre un mode Paiement (francais)
            // et non le mot anglais "cancelled", sinon la page de retour
            // affiche "Resultat indisponible".
            ->assertRedirectContains('status=annule');

        $this->assertDatabaseHas('paiements', [
            'id' => $paiement->id,
            'statut' => Paiement::STATUT_ANNULE,
        ]);
    }

    // ------------------------------------------------------------ propriete

    public function test_verify_rejects_transaction_of_another_client(): void
    {
        $owner = $this->createClient();
        $intruder = $this->createClient([
            'telephone' => '0633333333',
            'email' => 'intruder2@example.com',
        ]);
        $reservation = $this->createReservation($owner, $this->createVehicule());
        $paiement = $this->initPaiement($reservation);

        // 404 et non 403 : on ne doit pas reveler l'existence de la transaction.
        $this->actingAs($intruder, 'sanctum')
            ->postJson('/api/client/payments/cmi/verify', [
                'transaction_id' => $paiement->transaction_id,
            ])
            ->assertNotFound();

        $this->actingAs($intruder, 'sanctum')
            ->getJson('/api/client/payments/cmi/status/'.$paiement->transaction_id)
            ->assertNotFound();
    }

    public function test_owner_can_query_own_payment_status(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());
        $paiement = $this->initPaiement($reservation);

        $this->actingAs($client, 'sanctum')
            ->getJson('/api/client/payments/cmi/status/'.$paiement->transaction_id)
            ->assertOk()
            ->assertJsonPath('status', Paiement::STATUT_EN_ATTENTE)
            ->assertJsonPath('statut_affichage', Paiement::STATUT_EN_ATTENTE)
            ->assertJsonPath('paid', false)
            ->assertJsonPath('rembourse_sur', 0)
            ->assertJsonPath('reservation_numero', $reservation->numero);
    }

    // ----------------------------------------------------- parcours sandbox

    public function test_sandbox_page_and_full_success_flow(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());

        $tx = $this->actingAs($client, 'sanctum')
            ->postJson('/api/client/payments/cmi/initialize', ['reservation_id' => $reservation->id])
            ->json('transaction_id');

        // La page simulee est servie.
        $this->get('/paiement/sandbox/'.$tx)->assertOk();

        // Le client choisit "autorise" : la page renvoie vers le meme callback
        // que la production, qui lui-meme renvoie vers la page de retour.
        $callbackUrl = $this->post('/paiement/sandbox/'.$tx, ['scenario' => 'captured'])
            ->assertRedirectContains('/api/cmi/callback')
            ->headers->get('Location');

        $this->get($callbackUrl)->assertRedirectContains('/paiement/retour');

        $this->assertDatabaseHas('paiements', [
            'transaction_id' => $tx,
            'statut' => Paiement::STATUT_PAYE,
            'carte_derniers4' => '4242',
        ]);
        $this->assertSame(
            750.0,
            (float) $reservation->fresh()->acompte_paye
        );
    }

    public function test_sandbox_declined_scenario_marks_payment_failed(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());

        $tx = $this->actingAs($client, 'sanctum')
            ->postJson('/api/client/payments/cmi/initialize', ['reservation_id' => $reservation->id])
            ->json('transaction_id');

        $this->post('/paiement/sandbox/'.$tx, ['scenario' => 'declined'])
            ->assertRedirectContains('/api/cmi/callback');

        // La redirection vers le callback applique le statut verifie.
        $this->get('/api/cmi/callback?order_id='.$tx);

        $this->assertDatabaseHas('paiements', [
            'transaction_id' => $tx,
            'statut' => Paiement::STATUT_ECHOUE,
        ]);
        $this->assertSame(0.0, (float) $reservation->fresh()->acompte_paye);
    }

    public function test_sandbox_is_hidden_in_production_mode(): void
    {
        config(['cmi.mode' => 'production']);

        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());
        $paiement = $this->initPaiement($reservation);

        $this->get('/paiement/sandbox/'.$paiement->transaction_id)->assertNotFound();
    }

    // -------------------------------------------------------- remboursements

    public function test_refund_is_recorded_as_separate_negative_entry(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());
        $paiement = $this->initPaiement($reservation);
        $paiement->update([
            'statut' => Paiement::STATUT_PAYE,
            'date_paiement' => now(),
        ]);

        $admin = $this->createAdmin();
        $service = app(CmiPaymentService::class);

        $result = $service->refund($paiement, 375.0, 'Annulation client', $admin->id);

        $this->assertTrue($result['success']);

        // L'encaissement d'origine conserve son historique comptable.
        $original = Paiement::find($paiement->id);
        $this->assertSame(Paiement::STATUT_PAYE, $original->statut);
        $this->assertNotNull($original->rembourse_le);
        // Le statut "remboursement" est derive, pas ecrit en base.
        $this->assertSame(Paiement::STATUT_REMBOURSE_PARTIEL, $original->statut_affichage);

        // Une ecriture de remboursement distincte a ete creee, liee a la source.
        $this->assertDatabaseHas('paiements', [
            'reservation_id' => $reservation->id,
            'type' => Paiement::TYPE_REMBOURSEMENT,
            'statut' => Paiement::STATUT_PAYE,
            'montant' => 375,
            'paiement_source_id' => $paiement->id,
        ]);

        // Le solde net tombe a 375.
        $this->assertSame(375.0, (float) $reservation->fresh()->acompte_paye);
        $this->assertSame(375.0, (float) $reservation->fresh()->rembourse);
    }

    public function test_full_refund_is_displayed_as_refunded(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());
        $paiement = $this->initPaiement($reservation);
        $paiement->update([
            'statut' => Paiement::STATUT_PAYE,
            'date_paiement' => now(),
        ]);

        app(CmiPaymentService::class)->refund($paiement, 750.0, 'Remboursement integral');

        $this->assertSame(
            Paiement::STATUT_REMBOURSE,
            Paiement::find($paiement->id)->statut_affichage
        );
        $this->assertSame(0.0, (float) $reservation->fresh()->acompte_paye);
    }

    public function test_status_endpoint_surfaces_refunded_state_to_the_client(): void
    {
        // Un paiement rembourse conserve statut='paye' en base (historique
        // comptable). L'UI a besoin du statut derive pour ne pas annoncer
        // "Paiement confirme" a un client deja rembourse.
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());
        $paiement = $this->initPaiement($reservation);
        $paiement->update([
            'statut' => Paiement::STATUT_PAYE,
            'date_paiement' => now(),
        ]);

        app(CmiPaymentService::class)->refund($paiement, 750.0, 'Annulation');

        $this->actingAs($client, 'sanctum')
            ->getJson('/api/client/payments/cmi/status/'.$paiement->transaction_id)
            ->assertOk()
            ->assertJsonPath('status', Paiement::STATUT_PAYE)
            ->assertJsonPath('statut_affichage', Paiement::STATUT_REMBOURSE)
            ->assertJsonPath('rembourse_sur', 750);
    }

    public function test_refund_rejects_non_paid_payment(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());
        $paiement = $this->initPaiement($reservation);

        $result = app(CmiPaymentService::class)->refund($paiement);

        $this->assertFalse($result['success']);
        $this->assertSame(0, Paiement::where('type', Paiement::TYPE_REMBOURSEMENT)->count());
    }

    public function test_revenue_reporting_ignores_refunded_amounts(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());

        Paiement::create([
            'reservation_id' => $reservation->id,
            'montant' => 750,
            'methode' => 'cmi',
            'statut' => Paiement::STATUT_PAYE,
            'type' => Paiement::TYPE_ACOMPTE,
            'date_paiement' => now(),
        ]);
        Paiement::create([
            'reservation_id' => $reservation->id,
            'montant' => 750,
            'methode' => 'cmi',
            'statut' => Paiement::STATUT_PAYE,
            'type' => Paiement::TYPE_REMBOURSEMENT,
            'date_paiement' => now(),
        ]);

        $net = (float) Paiement::net()->value('net');

        // Le remboursement ne doit pas s'ajouter aux revenus : 750 - 750 = 0.
        $this->assertSame(0.0, $net);

        $this->assertSame(
            0.0,
            (float) DB::table('paiements')
                ->where('statut', Paiement::STATUT_PAYE)
                ->sum('montant') - 1500
        );
    }

    // ------------------------------------------------- annulation / refund

    public function test_client_cancellation_refunds_only_what_was_actually_paid(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule(), [
            // Acompte theorique de 750, mais seul 300 a ete encaisse.
            'date_debut' => now()->addDays(10),
        ]);

        Paiement::create([
            'reservation_id' => $reservation->id,
            'montant' => 300,
            'methode' => 'cmi',
            'statut' => Paiement::STATUT_PAYE,
            'type' => Paiement::TYPE_ACOMPTE,
            'gateway' => 'sandbox',
            'date_paiement' => now(),
        ]);

        $this->actingAs($client, 'sanctum')
            ->putJson("/api/client/reservations/{$reservation->id}/annuler")
            ->assertOk()
            ->assertJsonPath('montant_rembourse', 300);

        // L'ecriture est un remboursement, pas un encaissement positif.
        $this->assertDatabaseHas('paiements', [
            'reservation_id' => $reservation->id,
            'type' => Paiement::TYPE_REMBOURSEMENT,
            'montant' => 300,
        ]);
        $this->assertSame(
            0.0,
            (float) Paiement::where('reservation_id', $reservation->id)
                ->where('statut', Paiement::STATUT_PAYE)
                ->selectRaw(Paiement::revenusNetSql('montant').' as net')
                ->value('net')
        );
    }

    public function test_late_cancellation_is_not_refundable(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule(), [
            'date_debut' => now()->addHours(6),
        ]);

        Paiement::create([
            'reservation_id' => $reservation->id,
            'montant' => 750,
            'methode' => 'cmi',
            'statut' => Paiement::STATUT_PAYE,
            'type' => Paiement::TYPE_ACOMPTE,
            'gateway' => 'sandbox',
            'date_paiement' => now(),
        ]);

        $this->actingAs($client, 'sanctum')
            ->putJson("/api/client/reservations/{$reservation->id}/annuler")
            ->assertOk()
            ->assertJsonPath('montant_rembourse', 0);

        $this->assertSame(0, Paiement::where('type', Paiement::TYPE_REMBOURSEMENT)->count());
    }

    public function test_partial_cancellation_refunds_half_of_paid_deposit(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule(), [
            'date_debut' => now()->addHours(36),
        ]);

        Paiement::create([
            'reservation_id' => $reservation->id,
            'montant' => 750,
            'methode' => 'cmi',
            'statut' => Paiement::STATUT_PAYE,
            'type' => Paiement::TYPE_ACOMPTE,
            'gateway' => 'sandbox',
            'date_paiement' => now(),
        ]);

        $this->actingAs($client, 'sanctum')
            ->putJson("/api/client/reservations/{$reservation->id}/annuler")
            ->assertOk()
            ->assertJsonPath('montant_rembourse', 375);
    }

    public function test_admin_cancellation_also_triggers_refund(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());
        $admin = $this->createAdmin();

        Paiement::create([
            'reservation_id' => $reservation->id,
            'montant' => 750,
            'methode' => 'cmi',
            'statut' => Paiement::STATUT_PAYE,
            'type' => Paiement::TYPE_ACOMPTE,
            'gateway' => 'sandbox',
            'date_paiement' => now(),
        ]);

        // Regresion : annuler cote admin ne declarait aucun remboursement.
        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/reservations/{$reservation->id}/annuler", ['motif' => 'Vehicule casse'])
            ->assertOk()
            ->assertJsonPath('montant_rembourse', 750);

        $this->assertDatabaseHas('paiements', [
            'reservation_id' => $reservation->id,
            'type' => Paiement::TYPE_REMBOURSEMENT,
            'montant' => 750,
            'created_by' => $admin->id,
        ]);
        $this->assertDatabaseHas('reservations', [
            'id' => $reservation->id,
            'statut' => 'annulee',
            'montant_rembourse' => 750,
        ]);
    }

    public function test_refund_preview_reports_backend_authoritative_amount(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule(), [
            'date_debut' => now()->addDays(10),
        ]);

        Paiement::create([
            'reservation_id' => $reservation->id,
            'montant' => 500,
            'methode' => 'cmi',
            'statut' => Paiement::STATUT_PAYE,
            'type' => Paiement::TYPE_ACOMPTE,
            'gateway' => 'sandbox',
            'date_paiement' => now(),
        ]);

        $this->actingAs($client, 'sanctum')
            ->getJson("/api/client/reservations/{$reservation->id}/annulation-preview")
            ->assertOk()
            ->assertJsonPath('annulable', true)
            ->assertJsonPath('acompte_paye', 500)
            ->assertJsonPath('montant_rembourse', 500);
    }

    public function test_admin_can_refund_a_confirmed_payment(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());
        $admin = $this->createAdmin();
        $paiement = $this->initPaiement($reservation);
        $paiement->update([
            'statut' => Paiement::STATUT_PAYE,
            'date_paiement' => now(),
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/paiements/{$paiement->id}/rembourser", [
                'montant' => 750,
                'motif' => 'Client insatisfait',
            ])
            ->assertCreated()
            ->assertJsonPath('montant', 750);

        $this->assertSame(
            Paiement::STATUT_REMBOURSE,
            $paiement->fresh()->statut_affichage
        );
        $this->assertSame(0.0, (float) $reservation->fresh()->acompte_paye);
    }

    public function test_admin_cannot_refund_more_than_was_paid(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());
        $admin = $this->createAdmin();
        $paiement = $this->initPaiement($reservation);
        $paiement->update([
            'statut' => Paiement::STATUT_PAYE,
            'date_paiement' => now(),
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/paiements/{$paiement->id}/rembourser", [
                'montant' => 9999,
                'motif' => 'Tentative de fraude',
            ])
            ->assertUnprocessable();

        $this->assertSame(0, Paiement::where('type', Paiement::TYPE_REMBOURSEMENT)->count());
    }

    public function test_dashboard_revenue_is_net_of_refunds(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());

        Paiement::create([
            'reservation_id' => $reservation->id,
            'montant' => 750,
            'methode' => 'cmi',
            'statut' => Paiement::STATUT_PAYE,
            'type' => Paiement::TYPE_ACOMPTE,
            'date_paiement' => now(),
        ]);
        Paiement::create([
            'reservation_id' => $reservation->id,
            'montant' => 250,
            'methode' => 'cmi',
            'statut' => Paiement::STATUT_PAYE,
            'type' => Paiement::TYPE_REMBOURSEMENT,
            'date_paiement' => now(),
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/dashboard/stats');

        $response->assertOk();
        // 750 encaisse - 250 rembourse = 500, et non 1000.
        $this->assertEquals(500.0, (float) $response->json('revenus_mois'));
    }
}
