<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Paiement;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RapportApiTest extends TestCase
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
            'mode_paiement' => 'especes',
        ], $overrides));
    }

    public function test_synthese_requires_admin(): void
    {
        $this->getJson('/api/rapports/synthese')->assertStatus(401);

        $client = $this->createClient();
        $this->actingAs($client, 'sanctum')->getJson('/api/rapports/synthese')->assertStatus(403);
    }

    public function test_synthese_returns_indicators(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $vehicule = $this->createVehicule();

        $this->createReservation($client, $vehicule);
        $this->createReservation($client, $vehicule, ['statut' => 'annulee']);
        $this->createReservation($client, $vehicule, ['statut' => 'terminee']);

        Paiement::create([
            'reservation_id' => Reservation::first()->id,
            'montant' => 750,
            'methode' => 'especes',
            'statut' => Paiement::STATUT_PAYE,
            'type' => Paiement::TYPE_ACOMPTE,
            'date_paiement' => now(),
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/rapports/synthese');

        $response->assertOk();
        $response->assertJsonStructure([
            'periode', 'total_reservations', 'reservations_annulees',
            'taux_annulation', 'duree_moyenne_jours', 'top_vehicules',
            'top_clients', 'paiements_par_methode',
        ]);

        $this->assertSame(3, $response->json('total_reservations'));
        $this->assertSame(1, $response->json('reservations_annulees'));
        $this->assertEqualsWithDelta(33.3, $response->json('taux_annulation'), 0.1);
        $this->assertEqualsWithDelta(5.0, $response->json('duree_moyenne_jours'), 0.1);

        $this->assertCount(1, $response->json('top_vehicules'));
        $this->assertSame(2, $response->json('top_vehicules.0.reservations'));

        $this->assertCount(1, $response->json('top_clients'));
        $this->assertSame('Mohammed Ghanmi', $response->json('top_clients.0.nom'));

        $this->assertCount(1, $response->json('paiements_par_methode'));
        $this->assertSame('especes', $response->json('paiements_par_methode.0.methode'));
        $this->assertEqualsWithDelta(750.0, $response->json('paiements_par_methode.0.total'), 0.01);
    }

    public function test_remboursements_lists_refunds(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $vehicule = $this->createVehicule();
        $reservation = $this->createReservation($client, $vehicule, ['statut' => 'annulee']);

        Paiement::create([
            'reservation_id' => $reservation->id,
            'montant' => -500,
            'methode' => 'especes',
            'statut' => Paiement::STATUT_REMBOURSE,
            'type' => Paiement::TYPE_REMBOURSEMENT,
            'rembourse_le' => now(),
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/rapports/remboursements');

        $response->assertOk();
        $this->assertCount(1, $response->json('remboursements'));
        $this->assertEqualsWithDelta(500.0, $response->json('totaux.rembourse'), 0.01);
        $this->assertSame($reservation->numero, $response->json('remboursements.0.reservation_numero'));
    }

    public function test_previsions_returns_totals(): void
    {
        $admin = $this->createAdmin();
        $client = $this->createClient();
        $vehicule = $this->createVehicule();
        $reservation = $this->createReservation($client, $vehicule, ['statut' => 'confirmee']);

        Paiement::create([
            'reservation_id' => $reservation->id,
            'montant' => 750,
            'methode' => 'especes',
            'statut' => Paiement::STATUT_PAYE,
            'type' => Paiement::TYPE_ACOMPTE,
            'date_paiement' => now(),
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/rapports/previsions');

        $response->assertOk();
        $this->assertEqualsWithDelta(750.0, $response->json('encaisse'), 0.01);
        $this->assertEqualsWithDelta(2500.0, $response->json('attendu'), 0.01);
        $this->assertEqualsWithDelta(1750.0, $response->json('solde_restant'), 0.01);
        $this->assertSame(1, $response->json('reservations_ouvertes'));
    }

    public function test_export_pdf_downloads_file(): void
    {
        $admin = $this->createAdmin();
        $this->createClient();
        $this->createVehicule();

        $response = $this->actingAs($admin, 'sanctum')->get('/api/rapports/export-pdf');

        $response->assertOk();
        $this->assertStringContainsString('pdf', $response->headers->get('content-type'));
    }
}
