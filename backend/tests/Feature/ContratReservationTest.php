<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContratReservationTest extends TestCase
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

    private function createAdmin(): User
    {
        return User::create([
            'name' => 'Admin',
            'email' => 'admin@firasbkacar.com',
            'password' => 'password',
            'role' => User::ROLE_ADMIN,
        ]);
    }

    public function test_chaque_reservation_recoit_un_numero_de_contrat_unique(): void
    {
        $client = $this->createClient();
        $vehicule = $this->createVehicule();

        $premiere = $this->createReservation($client, $vehicule);
        $seconde = $this->createReservation($client, $vehicule);

        $this->assertSame('CTR-'.$premiere->numero, $premiere->numero_contrat);
        $this->assertSame('CTR-'.$seconde->numero, $seconde->numero_contrat);
        $this->assertNotSame($premiere->numero_contrat, $seconde->numero_contrat);
    }

    public function test_admin_peut_imprimer_le_contrat(): void
    {
        $admin = $this->createAdmin();
        $reservation = $this->createReservation($this->createClient(), $this->createVehicule());

        $response = $this->actingAs($admin, 'sanctum')
            ->get("/api/reservations-admin/{$reservation->id}/contrat/preview");

        $response->assertOk();
        $this->assertStringContainsString('pdf', $response->headers->get('content-type'));
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_admin_peut_telecharger_le_contrat(): void
    {
        $admin = $this->createAdmin();
        $reservation = $this->createReservation($this->createClient(), $this->createVehicule());

        $response = $this->actingAs($admin, 'sanctum')
            ->get("/api/reservations-admin/{$reservation->id}/contrat");

        $response->assertOk();
        $this->assertStringContainsString('pdf', $response->headers->get('content-type'));
        $this->assertStringContainsString(
            'contrat-location-'.$reservation->numero_contrat.'.pdf',
            (string) $response->headers->get('content-disposition')
        );
    }

    public function test_client_peut_telecharger_son_propre_contrat(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());

        $response = $this->actingAs($client, 'sanctum')
            ->get("/api/client/reservations/{$reservation->id}/contrat");

        $response->assertOk();
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_client_ne_peut_pas_telecharger_le_contrat_d_un_autre_client(): void
    {
        $proprietaire = $this->createClient();
        $autre = $this->createClient(['email' => 'autre@example.com']);
        $reservation = $this->createReservation($proprietaire, $this->createVehicule());

        $this->actingAs($autre, 'sanctum')
            ->get("/api/client/reservations/{$reservation->id}/contrat")
            ->assertForbidden();
    }

    public function test_un_client_ne_peut_pas_utiliser_la_route_admin_du_contrat(): void
    {
        $client = $this->createClient();
        $reservation = $this->createReservation($client, $this->createVehicule());

        $this->actingAs($client, 'sanctum')
            ->get("/api/reservations-admin/{$reservation->id}/contrat/preview")
            ->assertForbidden();
    }

    public function test_template_contrat_conserve_les_marges_dimpression(): void
    {
        $reservation = $this->createReservation($this->createClient(), $this->createVehicule());
        $reservation->load(['client', 'vehicule', 'agence', 'paiements']);

        $html = view('pdf.contrat', ['reservation' => $reservation])->render();

        // DomPDF applique le style @page au cadre racine. Un reset
        // `* { margin: 0 }` ecrase ces marges et imprime le contrat bord a
        // bord, avec le texte coupe a droite. Cette regression a deja eu lieu.
        $this->assertStringContainsString('@page { margin:', $html);
        $this->assertDoesNotMatchRegularExpression('/^\s*\*\s*\{\s*margin\s*:/m', $html);
    }
}
