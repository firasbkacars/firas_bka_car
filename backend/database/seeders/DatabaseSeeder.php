<?php

namespace Database\Seeders;

use App\Models\Agence;
use App\Models\Client;
use App\Models\CodePromo;
use App\Models\Maintenance;
use App\Models\Paiement;
use App\Models\Reservation;
use App\Models\User;
use App\Models\Vehicule;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Admin',
            'email' => 'admin@firasbkacar.com',
            'password' => Hash::make('password'),
        ]);

        $this->call(AgenceSeeder::class);
        $this->call(ParametreSeeder::class);

        $agence = Agence::first();

        $vehicules = [
            [
                'marque' => 'Dacia', 'modele' => 'Duster',
                'description' => 'SUV polyvalent et robuste, pensé pour les routes marocaines. Grand espace bagages, garde au sol généreuse et consommation sobre. Parfait pour les escapades en famille ou les longs trajets.',
                'categorie' => 'SUV',
                'annee' => 2023, 'transmission' => 'manuelle', 'carburant' => 'diesel',
                'places' => 5, 'puissance' => '115 ch', 'kilometrage' => 28000,
                'prix_jour' => 400, 'statut' => 'disponible', 'populaire' => true,
                'photos' => ['vehicules/dacia-duster.png'],
                'equipements' => ['Climatisation', 'Bluetooth', 'Caméra de recul', 'GPS', 'Barres de toit'],
            ],
            [
                'marque' => 'Dacia', 'modele' => 'Logan',
                'description' => 'Berline familiale au meilleur rapport qualité-prix du marché. Coffre volumineux, sièges confortables et entretien économique. Le choix malin pour une location simple et sans surprise.',
                'categorie' => 'Berline',
                'annee' => 2022, 'transmission' => 'manuelle', 'carburant' => 'essence',
                'places' => 5, 'puissance' => '90 ch', 'kilometrage' => 41000,
                'prix_jour' => 300, 'statut' => 'disponible', 'populaire' => false,
                'photos' => ['vehicules/dacia-logan.png'],
                'equipements' => ['Climatisation', 'Bluetooth', 'Vitres électriques', 'Direction assistée'],
            ],
            [
                'marque' => 'SEAT', 'modele' => 'Ibiza FR',
                'description' => 'Citadine sportive et nerveuse, finition FR généreuse. Tenue de route précise et look affirmé. Idéale pour évoluer en ville et profiter des routes côtières autour de Tanger.',
                'categorie' => 'Compacte',
                'annee' => 2023, 'transmission' => 'manuelle', 'carburant' => 'essence',
                'places' => 5, 'puissance' => '115 ch', 'kilometrage' => 19000,
                'prix_jour' => 350, 'statut' => 'disponible', 'populaire' => true,
                'photos' => ['vehicules/seat-ibiza-fr.png'],
                'equipements' => ['Climatisation', 'Bluetooth', 'Caméra de recul', 'Sièges sport', 'Jantes alliage'],
            ],
            [
                'marque' => 'Volkswagen', 'modele' => 'T-Roc R-Line',
                'description' => 'SUV compact premium avec finition R-Line distinctive. Posture dynamique, habitacle soigné et équipements de sécurité complets. Le compromis idéal entre confort, style et polyvalence.',
                'categorie' => 'SUV',
                'annee' => 2023, 'transmission' => 'automatique', 'carburant' => 'essence',
                'places' => 5, 'puissance' => '150 ch', 'kilometrage' => 15000,
                'prix_jour' => 550, 'statut' => 'disponible', 'populaire' => false,
                'photos' => ['vehicules/vw-t-roc-r-line.png'],
                'equipements' => ['Climatisation', 'Bluetooth', 'Caméra de recul', 'GPS', 'Sièges cuir', 'Démarrage sans clé'],
            ],
        ];

        foreach ($vehicules as $v) {
            Vehicule::create([...$v, 'agence_id' => $agence->id]);
        }

        $clients = [
            ['nom_complet' => 'Mohammed Ghanmi', 'telephone' => '0612345678', 'email' => 'mohammed@gmail.com', 'cin' => 'AB123456', 'adresse' => 'Tanger, Maroc', 'password' => 'password', 'permis_conduire' => 'permis/mohammed.jpg'],
            ['nom_complet' => 'Sara K.', 'telephone' => '0698765432', 'email' => 'sara@gmail.com', 'cin' => 'CD789012', 'adresse' => 'Tanger, Maroc', 'password' => 'password', 'permis_conduire' => 'permis/sara.jpg'],
            ['nom_complet' => 'Ahmed B.', 'telephone' => '0654321098', 'email' => 'ahmed@gmail.com', 'cin' => 'EF345678', 'adresse' => 'Tanger, Maroc', 'password' => 'password', 'permis_conduire' => null],
            ['nom_complet' => 'Youssef M.', 'telephone' => '0678901234', 'email' => 'youssef@gmail.com', 'cin' => 'GH901234', 'adresse' => 'Tanger, Maroc', 'password' => 'password', 'permis_conduire' => 'permis/youssef.jpg'],
            ['nom_complet' => 'Fatima Z.', 'telephone' => '0645678901', 'email' => 'fatima@gmail.com', 'cin' => 'IJ567890', 'adresse' => 'Tanger, Maroc', 'password' => 'password', 'permis_conduire' => null],
        ];

        foreach ($clients as $c) {
            Client::create($c);
        }

        $now = now();

        $reservationsData = [
            ['client_id' => 1, 'vehicule_id' => 1, 'days_offset_start' => -5, 'duration' => 3, 'statut' => 'terminee', 'paiement_paye' => true],
            ['client_id' => 2, 'vehicule_id' => 3, 'days_offset_start' => -2, 'duration' => 5, 'statut' => 'en_cours', 'paiement_paye' => true],
            ['client_id' => 3, 'vehicule_id' => 2, 'days_offset_start' => 0, 'duration' => 2, 'statut' => 'confirmee', 'paiement_paye' => false],
            ['client_id' => 4, 'vehicule_id' => 4, 'days_offset_start' => -15, 'duration' => 3, 'statut' => 'terminee', 'paiement_paye' => true],
            ['client_id' => 5, 'vehicule_id' => 1, 'days_offset_start' => 1, 'duration' => 4, 'statut' => 'annulee', 'paiement_paye' => false],
            ['client_id' => 1, 'vehicule_id' => 3, 'days_offset_start' => -20, 'duration' => 2, 'statut' => 'terminee', 'paiement_paye' => true],
            ['client_id' => 2, 'vehicule_id' => 4, 'days_offset_start' => -12, 'duration' => 4, 'statut' => 'terminee', 'paiement_paye' => true],
            ['client_id' => 3, 'vehicule_id' => 2, 'days_offset_start' => -8, 'duration' => 3, 'statut' => 'terminee', 'paiement_paye' => true],
            ['client_id' => 4, 'vehicule_id' => 1, 'days_offset_start' => -25, 'duration' => 5, 'statut' => 'terminee', 'paiement_paye' => true],
            ['client_id' => 5, 'vehicule_id' => 3, 'days_offset_start' => -3, 'duration' => 2, 'statut' => 'confirmee', 'paiement_paye' => true],
            ['client_id' => 1, 'vehicule_id' => 2, 'days_offset_start' => -30, 'duration' => 3, 'statut' => 'terminee', 'paiement_paye' => true],
            ['client_id' => 2, 'vehicule_id' => 4, 'days_offset_start' => -18, 'duration' => 2, 'statut' => 'terminee', 'paiement_paye' => true],
            ['client_id' => 3, 'vehicule_id' => 1, 'days_offset_start' => -10, 'duration' => 3, 'statut' => 'terminee', 'paiement_paye' => true],
            ['client_id' => 4, 'vehicule_id' => 3, 'days_offset_start' => -1, 'duration' => 2, 'statut' => 'confirmee', 'paiement_paye' => true],
            ['client_id' => 5, 'vehicule_id' => 2, 'days_offset_start' => -22, 'duration' => 4, 'statut' => 'terminee', 'paiement_paye' => true],
        ];

        foreach ($reservationsData as $rd) {
            $vehicule = Vehicule::find($rd['vehicule_id']);
            $dateDebut = $now->copy()->addDays($rd['days_offset_start'])->setTime(9, 0);
            $dateFin = $dateDebut->copy()->addDays($rd['duration']);
            $jours = max(1, $dateDebut->diffInDays($dateFin));
            $prixTotal = $vehicule->prix_jour * $jours;
            $acompte = round($prixTotal * 0.30);

            $reservation = Reservation::create([
                'numero' => Reservation::genererNumero(),
                'client_id' => $rd['client_id'],
                'vehicule_id' => $rd['vehicule_id'],
                'agence_id' => $agence->id,
                'date_debut' => $dateDebut->format('Y-m-d H:i:s'),
                'date_fin' => $dateFin->format('Y-m-d H:i:s'),
                'lieu_prise' => 'Tanger',
                'lieu_retour' => 'Tanger',
                'prix_total' => $prixTotal,
                'acompte' => $acompte,
                'statut' => $rd['statut'],
                'mode_paiement' => 'especes',
            ]);

            if ($rd['paiement_paye']) {
                $paiementDate = $rd['statut'] === 'terminee'
                    ? $dateDebut->copy()->addDay()
                    : $now->copy()->addDays($rd['days_offset_start'] + 1);

                Paiement::create([
                    'reservation_id' => $reservation->id,
                    'montant' => $acompte,
                    'methode' => 'especes',
                    'statut' => 'paye',
                    'date_paiement' => $paiementDate->format('Y-m-d H:i:s'),
                ]);

                if ($rd['statut'] === 'terminee') {
                    $solde = $prixTotal - $acompte;
                    $soldeDate = $dateFin->copy()->subDay();
                    Paiement::create([
                        'reservation_id' => $reservation->id,
                        'montant' => $solde,
                        'methode' => 'especes',
                        'statut' => 'paye',
                        'date_paiement' => $soldeDate->format('Y-m-d H:i:s'),
                    ]);
                }
            } else {
                Paiement::create([
                    'reservation_id' => $reservation->id,
                    'montant' => $acompte,
                    'methode' => 'especes',
                    'statut' => 'en_attente',
                    'date_paiement' => null,
                ]);
            }
        }

        CodePromo::create([
            'code' => 'BIENVENUE10',
            'type' => 'pourcentage',
            'valeur' => 10,
            'date_expiration' => now()->addMonths(3),
            'usage_max' => 50,
            'usage_actuel' => 0,
            'actif' => true,
        ]);

        CodePromo::create([
            'code' => 'ETE2026',
            'type' => 'montant_fixe',
            'valeur' => 100,
            'date_expiration' => now()->addMonths(2),
            'usage_max' => 20,
            'usage_actuel' => 0,
            'actif' => true,
        ]);

        CodePromo::create([
            'code' => 'FIDELITE15',
            'type' => 'pourcentage',
            'valeur' => 15,
            'date_expiration' => now()->addYear(),
            'usage_max' => 100,
            'usage_actuel' => 0,
            'actif' => true,
        ]);

        Maintenance::create([
            'vehicule_id' => 1,
            'type' => 'Vidange',
            'description' => 'Vidange moteur et changement filtre',
            'date_prevue' => now()->addDays(5),
            'cout' => 350,
            'statut' => 'prevue',
            'notes' => 'Vidange standard recommandee',
        ]);

        Maintenance::create([
            'vehicule_id' => 2,
            'type' => 'Controle technique',
            'description' => 'Controle technique annuel',
            'date_prevue' => now()->addDays(15),
            'cout' => 200,
            'statut' => 'prevue',
            'notes' => '',
        ]);

        Maintenance::create([
            'vehicule_id' => 4,
            'type' => 'Pneus',
            'description' => 'Remplacement pneus avant',
            'date_prevue' => now()->subDays(2),
            'cout' => 1200,
            'statut' => 'en_cours',
            'notes' => 'Pneus usures',
        ]);
    }
}
