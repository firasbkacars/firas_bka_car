<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

/**
 * Variantes WebP des photos véhicules.
 *
 * Les photos sont stockées en JPEG/PNG sur le disque public. Pour chaque
 * largeur utile, un WebP est généré à côté du fichier source
 * (`vehicules/dacia-duster-640.webp`). Le frontend expose ces variantes via
 * `<picture>` + `srcset` et retombe sur l'image d'origine si un navigateur ou
 * un fichier ne suit pas.
 */
class VehicleImage
{
    /** Largeurs générées : cartes mobiles, cartes desktop, fiche, retina. */
    public const WIDTHS = [320, 640, 960, 1280];

    public const QUALITY = 78;

    /**
     * Génère les variantes manquantes d'une photo.
     *
     * @return array<int, string> chemins des variantes créées
     */
    public static function generate(string $path): array
    {
        if (! self::canProcess()) {
            return [];
        }

        $disk = Storage::disk('public');

        if (! $disk->exists($path)) {
            return [];
        }

        $source = $disk->path($path);
        $info = @getimagesize($source);

        if ($info === false) {
            return [];
        }

        [$width, $height, $type] = $info;
        $image = self::load($source, $type);

        if ($image === null) {
            return [];
        }

        $created = [];

        foreach (self::WIDTHS as $target) {
            if ($target > $width) {
                continue;
            }

            $variantPath = self::variantPath($path, $target);
            $variantHeight = max(1, (int) round($height * $target / $width));

            $canvas = @imagecreatetruecolor($target, $variantHeight);

            if ($canvas === false) {
                continue;
            }

            // Préserve la transparence des PNG sources.
            imagealphablending($canvas, false);
            imagesavealpha($canvas, true);
            $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
            imagefilledrectangle($canvas, 0, 0, $target, $variantHeight, $transparent);

            imagecopyresampled(
                $canvas,
                $image,
                0,
                0,
                0,
                0,
                $target,
                $variantHeight,
                $width,
                $height
            );

            if (@imagewebp($canvas, $disk->path($variantPath), self::QUALITY)) {
                $created[] = $variantPath;
            }

            imagedestroy($canvas);
        }

        imagedestroy($image);

        return $created;
    }

    /**
     * Supprime les variantes associées à une photo.
     *
     * @return array<int, string> chemins supprimés
     */
    public static function deleteVariants(string $path): array
    {
        $disk = Storage::disk('public');
        $deleted = [];

        foreach (self::WIDTHS as $width) {
            $variant = self::variantPath($path, $width);

            if ($disk->exists($variant)) {
                $disk->delete($variant);
                $deleted[] = $variant;
            }
        }

        return $deleted;
    }

    public static function variantPath(string $path, int $width): string
    {
        $extension = pathinfo($path, PATHINFO_EXTENSION);
        $base = $extension === '' ? $path : substr($path, 0, -strlen($extension) - 1);

        return $base.'-'.$width.'.webp';
    }

    /**
     * GD avec support WebP est présent en production. En local, la génération
     * est simplement ignorée : les images d'origine restent servies.
     */
    public static function canProcess(): bool
    {
        return function_exists('imagewebp')
            && function_exists('imagecreatetruecolor')
            && function_exists('imagecreatefromjpeg');
    }

    private static function load(string $source, int $type): mixed
    {
        return match ($type) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($source) ?: null,
            IMAGETYPE_PNG => @imagecreatefrompng($source) ?: null,
            IMAGETYPE_WEBP => function_exists('imagecreatefromwebp')
                ? (@imagecreatefromwebp($source) ?: null)
                : null,
            default => null,
        };
    }
}
