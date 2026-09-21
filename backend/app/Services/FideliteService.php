<?php

namespace App\Services;

use App\Models\Client;

class FideliteService
{
    private array $niveaux = [
        'bronze' => ['locations_min' => 0, 'reduction' => 0, 'points_multiplier' => 1],
        'argent' => ['locations_min' => 3, 'reduction' => 5, 'points_multiplier' => 1.5],
        'or' => ['locations_min' => 7, 'reduction' => 10, 'points_multiplier' => 2],
        'platine' => ['locations_min' => 15, 'reduction' => 15, 'points_multiplier' => 3],
    ];

    public function getNiveaux(): array
    {
        return $this->niveaux;
    }

    public function getNiveau(Client $client): string
    {
        $nombreLocations = $client->nombre_locations;

        $niveau = 'bronze';
        foreach ($this->niveaux as $nom => $config) {
            if ($nombreLocations >= $config['locations_min']) {
                $niveau = $nom;
            }
        }

        return $niveau;
    }

    public function getReduction(Client $client): float
    {
        $niveau = $this->getNiveau($client);
        return $this->niveaux[$niveau]['reduction'];
    }

    public function calculerPoints(Client $client, float $montant): int
    {
        $niveau = $this->getNiveau($client);
        $multiplier = $this->niveaux[$niveau]['points_multiplier'];

        return (int) round($montant * $multiplier);
    }

    public function ajouterPoints(Client $client, int $points): void
    {
        $client->update([
            'points_fidelite' => $client->points_fidelite + $points,
        ]);
    }

    public function incrementerLocations(Client $client): void
    {
        $newCount = $client->nombre_locations + 1;
        $newNiveau = $this->getNiveauForCount($newCount);

        $client->update([
            'nombre_locations' => $newCount,
            'niveau_fidelite' => $newNiveau,
        ]);
    }

    private function getNiveauForCount(int $count): string
    {
        $niveau = 'bronze';
        foreach ($this->niveaux as $nom => $config) {
            if ($count >= $config['locations_min']) {
                $niveau = $nom;
            }
        }
        return $niveau;
    }

    public function getNextNiveau(Client $client): ?array
    {
        $currentNiveau = $this->getNiveau($client);
        $currentLocations = $client->nombre_locations;

        $orderedNiveaux = ['bronze', 'argent', 'or', 'platine'];

        foreach ($orderedNiveaux as $nom) {
            if ($this->niveaux[$nom]['locations_min'] > $currentLocations) {
                return [
                    'niveau' => $nom,
                    'locations_restantes' => $this->niveaux[$nom]['locations_min'] - $currentLocations,
                    'reduction' => $this->niveaux[$nom]['reduction'],
                ];
            }
        }

        return null;
    }
}
