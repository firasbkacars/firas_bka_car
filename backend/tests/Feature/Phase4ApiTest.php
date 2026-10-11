<?php

namespace Tests\Feature;

use App\Models\CautionHistory;
use App\Models\Client;
use App\Models\Paiement;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Phase4ApiTest extends TestCase
{
    use RefreshDatabase;

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'admin@firasbkacar.com',
            'password' => 'password',
        ]);
    }

    private function createClient(array $overrides = []): Client
    {
        return Client::create(array_merge([
            'nom_complet' => 'Mohammed Ghanmi',
            'telephone' => '0612345678',
            'email' => 'mohammed@gmail.com',
            'password' => 'password123',
            'permis_conduire' => 'permis/mohammed.jpg',
            'permis_statut' => 'valide',
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
            'montant_caution' => 2000,
            'statut' => 'disponible',
        ], $overrides));
    }

    private function createReservation(Client $client, Vehicule $vehicule, array $overrides = []): Reservation
    {
        return Reservation::create(array_merge([
            'numero' => Reservation::genererNumero(),
            'client_id' => $client->id,
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->addDays(10)->startOfDay(),
            'date_fin' => now()->addDays(15)->startOfDay(),
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'prix_total' => 3000,
            'acompte' => 900,
            'montant_caution' => 2000,
            'caution_statut' => 'bloquee',
            'statut' => 'confirmee',
            'mode_paiement' => 'especes',
        ], $overrides));
    }

    // ------------------------------------------------ C1 : caution bloquee --

    public function test_c1_caution_bloquee_a_la_reservation(): void
    {
        $client = $this->createClient();
        $vehicule = $this->createVehicule();

        $response = $this->actingAs($client, 'sanctum')->postJson('/api/reservations', [
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->addDays(10)->toDateString(),
            'date_fin' => now()->addDays(15)->toDateString(),
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'mode_paiement' => 'especes',
        ]);

        $response->assertStatus(201);
        $this->assertSame('bloquee', $response->json('caution_statut'));
        $this->assertEqualsWithDelta(2000, $response->json('montant_caution'), 0.01);

        $history = CautionHistory::where('reservation_id', $response->json('id'))->first();
        $this->assertNotNull($history);
        $this->assertSame('non_bloquee', $history->ancien_statut);
        $this->assertSame('bloquee', $history->nouveau_statut);
    }

    // ------------------------------------------- C3 : restitution caution --

    public function test_c3_restitution_complete_caution(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $vehicule = $this->createVehicule();
        $reservation = $this->createReservation($client, $vehicule);

        $response = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/reservations/{$reservation->id}/caution", [
                'caution_statut' => 'restituee',
            ]);

        $response->assertOk();
        $this->assertEqualsWithDelta(2000, $response->json('montant_rembourse'), 0.01);

        $paiement = Paiement::where('reservation_id', $reservation->id)
            ->where('type', Paiement::TYPE_REMBOURSEMENT)
            ->first();
        $this->assertNotNull($paiement);
        $this->assertEqualsWithDelta(-2000, $paiement->montant, 0.01);
    }

    public function test_c3_retenue_partielle_requiert_motif_et_montant(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $vehicule = $this->createVehicule();
        $reservation = $this->createReservation($client, $vehicule);

        // Sans motif -> 422
        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/reservations/{$reservation->id}/caution", [
                'caution_statut' => 'retenue_partiellement',
                'montant_retenu' => 500,
            ])->assertStatus(422);

        // Avec motif et montant -> OK
        $response = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/reservations/{$reservation->id}/caution", [
                'caution_statut' => 'retenue_partiellement',
                'montant_retenu' => 500,
                'motif_rejet_caution' => 'Rayure sur la portiere conducteur',
            ]);

        $response->assertOk();
        $this->assertEqualsWithDelta(1500, $response->json('montant_rembourse'), 0.01);
        $this->assertEqualsWithDelta(500, $reservation->fresh()->montant_retenu_caution, 0.01);
    }

    // ------------------------------------------- C4 : historique caution --

    public function test_c4_historique_caution(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $vehicule = $this->createVehicule();
        $reservation = $this->createReservation($client, $vehicule);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/reservations/{$reservation->id}/caution", [
                'caution_statut' => 'restituee',
            ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/reservations/{$reservation->id}/caution-historique");

        $response->assertOk();
        $this->assertNotEmpty($response->json());
        $this->assertSame('restituee', $response->json('0.nouveau_statut'));
    }

    // ------------------------------------------------- PR1 : prolongation --

    public function test_pr1_prolongation_confirmee(): void
    {
        $client = $this->createClient();
        $vehicule = $this->createVehicule();
        $reservation = $this->createReservation($client, $vehicule);

        $response = $this->actingAs($client, 'sanctum')
            ->putJson("/api/client/reservations/{$reservation->id}/prolonger", [
                'date_fin' => now()->addDays(18)->startOfDay()->toDateString(),
            ]);

        $response->assertOk();
        $this->assertSame(3, $response->json('jours_supplementaires'));
        $this->assertEqualsWithDelta(1800, $response->json('prix_supplement'), 0.01);

        // PR3 : complement cree
        $complement = Paiement::where('reservation_id', $reservation->id)
            ->where('type', Paiement::TYPE_COMPLEMENT)
            ->first();
        $this->assertNotNull($complement);
        $this->assertSame('en_attente', $complement->statut);
    }

    // ------------------------------------------------ PR2 : apercu --

    public function test_pr2_apercu_prolongation(): void
    {
        $client = $this->createClient();
        $vehicule = $this->createVehicule();
        $reservation = $this->createReservation($client, $vehicule);

        $response = $this->actingAs($client, 'sanctum')
            ->getJson("/api/client/reservations/{$reservation->id}/prolongation-apercu?date_fin=".now()->addDays(17)->startOfDay()->toDateString());

        $response->assertOk();
        $this->assertTrue($response->json('disponible'));
        $this->assertSame(2, $response->json('jours_supplementaires'));
        $this->assertEqualsWithDelta(1200, $response->json('prix_supplement'), 0.01);
    }

    // -------------------------------------------------- CD2 : validation --

    public function test_cd2_conducteur_additionnel_requiert_permis(): void
    {
        $client = $this->createClient();
        $vehicule = $this->createVehicule();

        // Sans permis -> 422
        $this->actingAs($client, 'sanctum')->postJson('/api/reservations', [
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->addDays(10)->toDateString(),
            'date_fin' => now()->addDays(15)->toDateString(),
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'mode_paiement' => 'especes',
            'conducteur_additionnel_nom' => 'Ahmed Ghanmi',
        ])->assertStatus(422);

        // Avec permis -> OK
        $response = $this->actingAs($client, 'sanctum')->postJson('/api/reservations', [
            'vehicule_id' => $vehicule->id,
            'date_debut' => now()->addDays(10)->toDateString(),
            'date_fin' => now()->addDays(15)->toDateString(),
            'lieu_prise' => 'Tanger',
            'lieu_retour' => 'Tanger',
            'mode_paiement' => 'especes',
            'conducteur_additionnel_nom' => 'Ahmed Ghanmi',
            'conducteur_additionnel_permis' => 'AB123456',
        ]);

        $response->assertStatus(201);
        $this->assertSame('Ahmed Ghanmi', $response->json('conducteur_additionnel_nom'));
        $this->assertSame('AB123456', $response->json('conducteur_additionnel_permis'));
    }

    // ------------------------------------------------ E3 : comparaison --

    public function test_e3_comparaison_etats_lieux(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $vehicule = $this->createVehicule();
        $reservation = $this->createReservation($client, $vehicule);

        $this->actingAs($admin, 'sanctum')->postJson('/api/etats-lieux', [
            'reservation_id' => $reservation->id,
            'type' => 'depart',
            'notes' => 'Vehicule en bon etat',
        ])->assertStatus(201);

        $this->actingAs($admin, 'sanctum')->postJson('/api/etats-lieux', [
            'reservation_id' => $reservation->id,
            'type' => 'retour',
            'notes' => 'Rayure legere',
        ])->assertStatus(201);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/etats-lieux/comparaison?reservation_id={$reservation->id}");

        $response->assertOk();
        $this->assertTrue($response->json('complet'));
        $this->assertSame('depart', $response->json('depart.type'));
        $this->assertSame('retour', $response->json('retour.type'));
    }
}
