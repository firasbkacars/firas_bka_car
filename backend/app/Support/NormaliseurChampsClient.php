<?php

namespace App\Support;

/**
 * Normalise les donnees d'identite saisies par les clients avant validation.
 *
 * Les utilisateurs ecrivent souvent leur telephone avec des espaces
 * (06 12 34 56 78), leur CIN en minuscules ou avec un tiret. Sans cette
 * normalisation, une saisie parfaitement legitime produisait un 422 peu
 * comprehensible.
 */
class NormaliseurChampsClient
{
    public static function telephone(mixed $valeur): mixed
    {
        if (! is_string($valeur)) {
            return $valeur;
        }

        $telephone = preg_replace('~[\s.\-()/]~', '', trim($valeur)) ?? '';

        if (str_starts_with($telephone, '00212')) {
            $telephone = '+212'.substr($telephone, 5);
        } elseif (preg_match('/^212[5-7]\d{8}$/', $telephone)) {
            $telephone = '+'.$telephone;
        }

        return $telephone;
    }

    public static function pieceIdentite(mixed $valeur): mixed
    {
        if (! is_string($valeur)) {
            return $valeur;
        }

        $piece = preg_replace('/[^A-Za-z0-9]/', '', trim($valeur)) ?? '';
        $piece = strtoupper($piece);

        return $piece === '' ? null : $piece;
    }
}
