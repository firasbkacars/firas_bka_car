<?php

namespace App\Console\Commands;

use App\Models\Vehicule;
use App\Support\VehicleImage;
use Illuminate\Console\Command;

/**
 * Génère les variantes WebP des photos véhicules déjà stockées sur le volume.
 *
 * À lancer après un déploiement ou après un import massif de photos. Les
 * nouveaux uploads passent par VehiculePhotoController, qui génère déjà les
 * variantes. La commande est idempotente : elle réécrit les variantes à
 * l'identique et peut être relancée sans risque.
 */
class GenererVariantesWebp extends Command
{
    protected $signature = 'vehicules:webp {--vehicule= : Limiter à un identifiant de véhicule}';

    protected $description = 'Génère les variantes WebP (320/640/960/1280) des photos véhicules.';

    public function handle(): int
    {
        if (! VehicleImage::canProcess()) {
            $this->error('GD avec support WebP est requis (imagewebp).');

            return self::FAILURE;
        }

        $query = Vehicule::query()->select(['id', 'photos']);

        if ($this->option('vehicule') !== null) {
            $query->whereKey((int) $this->option('vehicule'));
        }

        $photos = 0;
        $variantes = 0;

        $query->chunkById(50, function ($vehicules) use (&$photos, &$variantes) {
            foreach ($vehicules as $vehicule) {
                foreach ((array) $vehicule->photos as $photo) {
                    if (! is_string($photo) || $photo === '') {
                        continue;
                    }

                    $photos++;
                    $variantes += count(VehicleImage::generate($photo));
                }
            }
        });

        $this->info(sprintf(
            '%d photo(s) traitée(s), %d variante(s) WebP générée(s).',
            $photos,
            $variantes
        ));

        return self::SUCCESS;
    }
}
