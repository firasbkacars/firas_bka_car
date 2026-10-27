<?php

namespace Database\Seeders;

use App\Models\Agence;
use App\Models\Vehicule;
use Illuminate\Database\Seeder;

/**
 * Catalogue de vehicules de demonstration.
 *
 * Rejouable sans doublon : chaque vehicule est identifie par son couple
 * marque/modele. Relancer ce seeder met a jour les fiches existantes au lieu
 * de les dupliquer, ce qui preserve les reservations deja rattachees.
 *
 * Usage : php artisan db:seed --class=VehiculeSeeder
 *
 * Les visuels sont stockes dans storage/app/public/vehicules (cf. photos)
 * et servis via /storage/vehicules/... par le lien storage:link.
 */
class VehiculeSeeder extends Seeder
{
    /**
     * Photos disponibles dans img/ (photo1.jpg et photo2.jpg ne sont pas des
     * visuels de catalogue : gros plans non identifies, volontairement exclus).
     */
    private const VEHICULES = [
        [
            'marque' => 'Dacia', 'modele' => 'Duster',
            'description' => 'SUV polyvalent et robuste, pensé pour les routes marocaines. Grand espace bagages, garde au sol généreuse et consommation sobre. Parfait pour les escapades en famille ou les longs trajets.',
            'categorie' => 'SUV',
            'annee' => 2023, 'transmission' => 'manuelle', 'carburant' => 'diesel',
            'places' => 5, 'puissance' => '115 ch', 'kilometrage' => 28000,
            'prix_jour' => 400, 'statut' => 'disponible', 'populaire' => true,
            'photos' => ['vehicules/dacia-duster.jpg'],
            'equipements' => ['Climatisation', 'Bluetooth', 'Caméra de recul', 'GPS', 'Barres de toit'],
        ],
        [
            'marque' => 'Dacia', 'modele' => 'Logan',
            'description' => 'Berline familiale au meilleur rapport qualité-prix du marché. Coffre volumineux, sièges confortables et entretien économique. Le choix malin pour une location simple et sans surprise.',
            'categorie' => 'Berline',
            'annee' => 2022, 'transmission' => 'manuelle', 'carburant' => 'essence',
            'places' => 5, 'puissance' => '90 ch', 'kilometrage' => 41000,
            'prix_jour' => 300, 'statut' => 'disponible', 'populaire' => false,
            'photos' => ['vehicules/dacia-logan.jpg'],
            'equipements' => ['Climatisation', 'Bluetooth', 'Vitres électriques', 'Direction assistée'],
        ],
        [
            'marque' => 'Dacia', 'modele' => 'Sandero Stepway',
            'description' => 'Crossover citadin au look baroudeur : garde au sol surélevée, barres de toit et équipements modernes. Coffre généreux, consommation contenue et confort rassurant pour explorer Tanger et ses environs sans se ruiner.',
            'categorie' => 'Citadine',
            'annee' => 2024, 'transmission' => 'manuelle', 'carburant' => 'essence',
            'places' => 5, 'puissance' => '100 ch', 'kilometrage' => 12000,
            'prix_jour' => 350, 'statut' => 'disponible', 'populaire' => true,
            'photos' => ['vehicules/dacia-sandero-stepway.jpg'],
            'equipements' => ['Climatisation', 'Bluetooth', 'Caméra de recul', 'Régulateur de vitesse', 'Apple CarPlay / Android Auto', 'Barres de toit'],
        ],
        [
            'marque' => 'SEAT', 'modele' => 'Ibiza FR',
            'description' => 'Citadine sportive et nerveuse, finition FR généreuse. Tenue de route précise et look affirmé. Idéale pour évoluer en ville et profiter des routes côtières autour de Tanger.',
            'categorie' => 'Compacte',
            'annee' => 2023, 'transmission' => 'manuelle', 'carburant' => 'essence',
            'places' => 5, 'puissance' => '115 ch', 'kilometrage' => 19000,
            'prix_jour' => 350, 'statut' => 'disponible', 'populaire' => true,
            'photos' => ['vehicules/seat-ibiza-fr.jpg'],
            'equipements' => ['Climatisation', 'Bluetooth', 'Caméra de recul', 'Sièges sport', 'Jantes alliage'],
        ],
        [
            'marque' => 'Volkswagen', 'modele' => 'T-Roc R-Line',
            'description' => 'SUV compact premium avec finition R-Line distinctive. Posture dynamique, habitacle soigné et équipements de sécurité complets. Le compromis idéal entre confort, style et polyvalence.',
            'categorie' => 'SUV',
            'annee' => 2023, 'transmission' => 'automatique', 'carburant' => 'essence',
            'places' => 5, 'puissance' => '150 ch', 'kilometrage' => 15000,
            'prix_jour' => 550, 'statut' => 'disponible', 'populaire' => false,
            'photos' => ['vehicules/vw-t-roc-r-line.jpg'],
            'equipements' => ['Climatisation', 'Bluetooth', 'Caméra de recul', 'GPS', 'Sièges cuir', 'Démarrage sans clé'],
        ],
        [
            'marque' => 'Renault', 'modele' => 'Clio',
            'description' => 'Citadine moderne et polyvalente, cinquième génération au design affirmé. Moteur essence sobre et agréable en ville comme sur autoroute. Écran tactile, aides à la conduite et coffre généreux pour sa catégorie : le compromis idéal entre confort et budget maîtrisé.',
            'categorie' => 'Citadine',
            'annee' => 2024, 'transmission' => 'manuelle', 'carburant' => 'essence',
            'places' => 5, 'puissance' => '90 ch', 'kilometrage' => 12000,
            'prix_jour' => 320, 'statut' => 'disponible', 'populaire' => true,
            'photos' => ['vehicules/renault-clio-1.jpg', 'vehicules/renault-clio-2.jpg'],
            'equipements' => ['Climatisation', 'Bluetooth', 'Écran tactile', 'Caméra de recul', 'Régulateur de vitesse', 'Apple CarPlay / Android Auto'],
        ],
        [
            'marque' => 'Volkswagen', 'modele' => 'Golf',
            'description' => 'La référence des compactes, dans sa huitième génération. Finition soignée, châssis rigoureux et boîte automatique DSG pour des trajets fluides. Habitacle silencieux et technologies embarquées complètes, aussi à l\'aise en déplacement professionnel qu\'en virée en famille.',
            'categorie' => 'Compacte',
            'annee' => 2023, 'transmission' => 'automatique', 'carburant' => 'essence',
            'places' => 5, 'puissance' => '150 ch', 'kilometrage' => 25000,
            'prix_jour' => 500, 'statut' => 'disponible', 'populaire' => false,
            'photos' => ['vehicules/vw-golf.jpg'],
            'equipements' => ['Boîte DSG', 'Climatisation bi-zone', 'GPS', 'Caméra de recul', 'Sièges chauffants', 'Démarrage sans clé'],
        ],
        [
            'marque' => 'Opel', 'modele' => 'Corsa',
            'description' => 'Citadine agile et bien équipée, idéale pour se faufiler dans Tanger et se garer sans effort. Consommation contenue, poste de conduite clair et équipements modernes dès la finition de série. Un choix économique et confortable pour les courts séjours.',
            'categorie' => 'Citadine',
            'annee' => 2023, 'transmission' => 'manuelle', 'carburant' => 'essence',
            'places' => 5, 'puissance' => '100 ch', 'kilometrage' => 21000,
            'prix_jour' => 280, 'statut' => 'disponible', 'populaire' => true,
            'photos' => ['vehicules/opel-corsa.jpg'],
            'equipements' => ['Climatisation', 'Bluetooth', 'Écran tactile', 'Caméra de recul', 'Régulateur de vitesse'],
        ],
        [
            'marque' => 'Peugeot', 'modele' => '208 GT',
            'description' => 'Compacte au caractère affirmé, finition GT avec i-Cockpit 3D et sellerie spécifique. Boîte automatique EAT8, moteur essence vif et tenue de route rassurante. Le style français associé au plaisir de conduite, pour ceux qui veulent une voiture qui se remarque.',
            'categorie' => 'Compacte',
            'annee' => 2023, 'transmission' => 'automatique', 'carburant' => 'essence',
            'places' => 5, 'puissance' => '130 ch', 'kilometrage' => 18000,
            'prix_jour' => 380, 'statut' => 'disponible', 'populaire' => true,
            'photos' => ['vehicules/peugeot-208-gt.jpg'],
            'equipements' => ['Boîte EAT8', 'i-Cockpit 3D', 'Climatisation automatique', 'GPS', 'Caméra de recul', 'Sièges chauffants'],
        ],
    ];

    public function run(): void
    {
        $agence = Agence::first();

        if (! $agence) {
            $this->command?->error('Aucune agence : lancez AgenceSeeder avant VehiculeSeeder.');

            return;
        }

        foreach (self::VEHICULES as $vehicule) {
            Vehicule::updateOrCreate(
                ['marque' => $vehicule['marque'], 'modele' => $vehicule['modele']],
                [...$vehicule, 'agence_id' => $agence->id],
            );
        }

        $this->command?->info(count(self::VEHICULES).' véhicules de démonstration en base.');
    }
}
