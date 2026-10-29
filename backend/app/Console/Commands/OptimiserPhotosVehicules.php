<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * Recompresse les photos JPEG des véhicules stockées sur le volume.
 *
 * Les photos uploadées depuis l'admin peuvent peser 250 Ko ou plus. Sur mobile,
 * plusieurs vignettes suffisent à dégrader le LCP. La commande réduit la largeur
 * à 1280 px et réencode en JPEG progressif de qualité 78. Elle ne réécrit un
 * fichier que si le résultat est plus léger, donc elle est sans risque à
 * relancer.
 */
class OptimiserPhotosVehicules extends Command
{
    protected $signature = 'vehicules:optimiser-photos
        {--dry-run : Affiche les gains sans réécrire les fichiers}
        {--max-width=1280 : Largeur maximale en pixels}
        {--quality=78 : Qualité JPEG (40-95)}
        {--seuil=120 : Poids en Ko en dessous duquel un fichier déjà assez étroit est ignoré}';

    protected $description = 'Réduit le poids des photos JPEG des véhicules (volume de production).';

    public function handle(): int
    {
        if (! function_exists('imagecreatefromjpeg') || ! function_exists('imagescale')) {
            $this->error('L’extension GD avec support JPEG est requise.');

            return self::FAILURE;
        }

        $dossier = storage_path('app/public/vehicules');

        if (! is_dir($dossier)) {
            $this->error("Dossier introuvable : {$dossier}");

            return self::FAILURE;
        }

        $maxWidth = max(640, (int) $this->option('max-width'));
        $qualite = min(95, max(40, (int) $this->option('quality')));
        $seuil = max(0, (int) $this->option('seuil')) * 1024;
        $dryRun = (bool) $this->option('dry-run');

        $fichiers = glob($dossier.'/*.{jpg,jpeg,JPG,JPEG}', GLOB_BRACE) ?: [];
        sort($fichiers);

        if ($fichiers === []) {
            $this->info('Aucune photo JPEG à traiter.');

            return self::SUCCESS;
        }

        $lignes = [];
        $gagnes = 0;

        foreach ($fichiers as $fichier) {
            $avant = (int) filesize($fichier);
            $dimensions = @getimagesize($fichier);

            if ($dimensions === false) {
                $this->warn('Ignoré (image illisible) : '.basename($fichier));

                continue;
            }

            [$largeur, $hauteur] = $dimensions;

            if ($largeur <= $maxWidth && $avant <= $seuil) {
                continue;
            }

            $image = @imagecreatefromjpeg($fichier);

            if ($image === false) {
                $this->warn('Ignoré (JPEG non décodable) : '.basename($fichier));

                continue;
            }

            if ($largeur > $maxWidth) {
                $redimensionnee = imagescale($image, $maxWidth, -1, IMG_BICUBIC);

                if ($redimensionnee !== false) {
                    imagedestroy($image);
                    $image = $redimensionnee;
                }
            }

            imageinterlace($image, true);

            if ($dryRun) {
                imagedestroy($image);
                $lignes[] = [basename($fichier), $this->ko($avant), '—', 'simulation'];

                continue;
            }

            $temporaire = $fichier.'.tmp';

            if (! @imagejpeg($image, $temporaire, $qualite)) {
                imagedestroy($image);
                @unlink($temporaire);
                $this->warn('Échec de l’encodage : '.basename($fichier));

                continue;
            }

            imagedestroy($image);

            $apres = (int) filesize($temporaire);

            // Une photo déjà bien compressée ne doit pas être dégradée.
            if ($apres >= $avant) {
                @unlink($temporaire);
                continue;
            }

            if (! @rename($temporaire, $fichier)) {
                @unlink($temporaire);
                $this->warn('Échec du remplacement : '.basename($fichier));

                continue;
            }

            clearstatcache(true, $fichier);
            $gagnes += $avant - $apres;
            $lignes[] = [
                basename($fichier),
                $this->ko($avant),
                $this->ko($apres),
                '-'.round((1 - $apres / $avant) * 100).' %',
            ];
        }

        if ($lignes !== []) {
            $this->table(['Fichier', 'Avant', 'Après', 'Gain'], $lignes);
        }

        if ($dryRun) {
            $this->info('Mode simulation : aucun fichier modifié.');
        } else {
            $this->info(sprintf(
                '%d photo(s) optimisée(s), %s économisés.',
                count($lignes),
                $this->ko($gagnes)
            ));
        }

        return self::SUCCESS;
    }

    private function ko(int $octets): string
    {
        return round($octets / 1024).' Ko';
    }
}
