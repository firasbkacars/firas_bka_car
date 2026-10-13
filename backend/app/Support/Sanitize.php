<?php

namespace App\Support;

/**
 * D3 : nettoyage des entrees texte utilisateur avant stockage.
 * Supprime les balises HTML, les octets nuls et les espaces de debut/fin
 * tout en preservant les retours a la ligne.
 */
class Sanitize
{
    public static function text(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $clean = strip_tags($value);
        $clean = str_replace("\0", '', $clean);
        $clean = trim($clean);
        $clean = preg_replace('/[ \t]{2,}/', ' ', $clean);

        return $clean === '' ? null : $clean;
    }

    /**
     * Parcourt une valeur (scalaire ou tableau) et nettoie toutes les chaines.
     */
    public static function deep(mixed $value): mixed
    {
        if (is_string($value)) {
            return self::text($value);
        }

        if (is_array($value)) {
            return array_map([self::class, 'deep'], $value);
        }

        return $value;
    }
}
