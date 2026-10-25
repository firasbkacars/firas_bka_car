<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

/**
 * Controle automatique des photos de documents d'identite et de permis.
 *
 * Le serveur est l'autorite : meme si le navigateur ou l'application mobile
 * affiche un apercu, aucune photo n'est stockee avant d'avoir passe ces
 * controles. Les seuils sont volontairement tolerants pour ne pas rejeter
 * une photo correcte prise au telephone, mais assez stricts pour refuser les
 * fichiers vides, trompeurs, flous, trop sombres ou illisibles.
 */
class DocumentPhotoVerifier
{
    private const TYPES_ACCEPTES = [
        IMAGETYPE_JPEG,
        IMAGETYPE_PNG,
        IMAGETYPE_WEBP,
    ];

    private const TAILLE_MIN_OCTETS = 10 * 1024;       // 10 Ko

    private const TAILLE_MAX_OCTETS = 5 * 1024 * 1024;  // 5 Mo

    private const COTE_COURT_MIN = 350;

    private const COTE_LONG_MIN = 500;

    private const COTE_MAX = 8000;

    // Une photo de telephone reste sous cette limite ; au-dela, le decodage
    // GD consommerait trop de memoire pour un simple controle de qualite.
    private const PIXELS_MAX = 40_000_000;

    // Une photo de document doit contenir des zones claires et du texte.
    private const LUMINOSITE_MIN = 28.0;

    private const LUMINOSITE_MAX = 246.0;

    private const CONTRASTE_MIN = 8.0;

    // Energie moyenne des aretes : une photo floue ou un aplat descend sous
    // ce seuil. Une photo de document nette le depasse largement.
    private const NETTETE_MIN = 4.0;

    // Secours lorsque GD n'est pas disponible : une image uniforme se
    // compresse trop bien (octets par pixel trop faible).
    private const OCTETS_PAR_PIXEL_MIN = 0.03;

    public function verifier(UploadedFile $file, string $champ): void
    {
        if (! $file->isValid()) {
            $this->refuser($champ, "L'envoi du fichier a echoue. Recommencez avec une photo JPG, PNG ou WebP.");
        }

        $taille = (int) $file->getSize();

        if ($taille <= 0) {
            $this->refuser($champ, 'Le fichier envoye est vide.');
        }

        if ($taille > self::TAILLE_MAX_OCTETS) {
            $this->refuser($champ, 'La photo depasse 5 Mo. Reduisez sa taille avant de recommencer.');
        }

        if ($taille < self::TAILLE_MIN_OCTETS) {
            $this->refuser($champ, 'La photo est trop compressee ou illisible. Envoyez une photo plus nette.');
        }

        $chemin = $file->getRealPath();

        if (! is_string($chemin) || $chemin === '') {
            $this->refuser($champ, "Le fichier envoye n'est pas une image valide. Utilisez une photo JPG, PNG ou WebP.");
        }

        $infos = @getimagesize($chemin);

        if (! $infos || ! isset($infos[0], $infos[1], $infos[2])) {
            $this->refuser($champ, "Le fichier envoye n'est pas une image valide. Utilisez une photo JPG, PNG ou WebP.");
        }

        if (! in_array($infos[2], self::TYPES_ACCEPTES, true)) {
            $this->refuser($champ, 'Format non accepte : envoyez une photo JPG, PNG ou WebP (pas de PDF).');
        }

        $largeur = (int) $infos[0];
        $hauteur = (int) $infos[1];
        $coteCourt = min($largeur, $hauteur);
        $coteLong = max($largeur, $hauteur);

        if ($largeur <= 0 || $hauteur <= 0 || $largeur > self::COTE_MAX || $hauteur > self::COTE_MAX) {
            $this->refuser($champ, 'Les dimensions de la photo sont invalides.');
        }

        if ($largeur * $hauteur > self::PIXELS_MAX) {
            $this->refuser($champ, 'Photo trop grande : utilisez la photo d\'origine sans mode haute resolution (max 40 megapixels).');
        }

        if ($coteCourt < self::COTE_COURT_MIN || $coteLong < self::COTE_LONG_MIN) {
            $this->refuser(
                $champ,
                'Photo trop petite : la resolution minimale est de '.self::COTE_LONG_MIN.' x '.self::COTE_COURT_MIN.' pixels.'
            );
        }

        if (function_exists('imagecreatefromstring')) {
            $this->analyserPixels($chemin, $champ);
        } elseif ($taille / max(1, $largeur * $hauteur) < self::OCTETS_PAR_PIXEL_MIN) {
            // Sans GD, ce ratio reste un bon indicateur d'image uniforme/floue.
            $this->refuser($champ, 'Photo floue ou trop uniforme : cadrez le document entier et reprenez la photo.');
        }
    }

    private function analyserPixels(string $chemin, string $champ): void
    {
        // GD decode l'image entiere avant de pouvoir la reduire. On elargit
        // donc le budget memoire pour la duree de la requete : sans cela une
        // photo 48 MP peut provoquer une erreur fatale au lieu d'un refus clair.
        @ini_set('memory_limit', '512M');

        $contenu = @file_get_contents($chemin);
        $source = $contenu === false ? false : @imagecreatefromstring($contenu);

        if (! $source) {
            $this->refuser($champ, "Le fichier envoye n'est pas une image valide. Utilisez une photo JPG, PNG ou WebP.");
        }

        $largeur = imagesx($source);
        $hauteur = imagesy($source);
        $echelle = min(1.0, 900 / max($largeur, $hauteur));
        $nouvelleLargeur = max(1, (int) round($largeur * $echelle));
        $nouvelleHauteur = max(1, (int) round($hauteur * $echelle));

        $redimensionnee = imagecreatetruecolor($nouvelleLargeur, $nouvelleHauteur);
        imagecopyresampled(
            $redimensionnee,
            $source,
            0,
            0,
            0,
            0,
            $nouvelleLargeur,
            $nouvelleHauteur,
            $largeur,
            $hauteur
        );

        $pas = max(1, (int) ceil(max($nouvelleLargeur, $nouvelleHauteur) / 450));
        $lignePrecedente = [];
        $somme = 0.0;
        $sommeCarres = 0.0;
        $sommeAretes = 0.0;
        $nombre = 0;
        $nombreAretes = 0;

        for ($y = 0; $y < $nouvelleHauteur; $y += $pas) {
            $precedentX = null;

            for ($x = 0; $x < $nouvelleLargeur; $x += $pas) {
                $couleur = imagecolorat($redimensionnee, $x, $y);
                $rouge = ($couleur >> 16) & 0xFF;
                $vert = ($couleur >> 8) & 0xFF;
                $bleu = $couleur & 0xFF;
                $luminosite = 0.299 * $rouge + 0.587 * $vert + 0.114 * $bleu;

                $somme += $luminosite;
                $sommeCarres += $luminosite * $luminosite;
                $nombre++;

                if ($precedentX !== null) {
                    $sommeAretes += abs($luminosite - $precedentX);
                    $nombreAretes++;
                }

                if (isset($lignePrecedente[$x])) {
                    $sommeAretes += abs($luminosite - $lignePrecedente[$x]);
                    $nombreAretes++;
                }

                $precedentX = $luminosite;
                $lignePrecedente[$x] = $luminosite;
            }
        }

        $luminositeMoyenne = $nombre > 0 ? $somme / $nombre : 0.0;
        $variance = $nombre > 0 ? max(0.0, ($sommeCarres / $nombre) - ($luminositeMoyenne ** 2)) : 0.0;
        $contraste = sqrt($variance);
        $nettete = $nombreAretes > 0 ? $sommeAretes / $nombreAretes : 0.0;

        // L'ordre des messages compte : une photo sombre est aussi peu
        // contrastee, on veut guider l'utilisateur vers la bonne correction.
        if ($luminositeMoyenne < self::LUMINOSITE_MIN) {
            $this->refuser($champ, 'Photo trop sombre : reprenez la photo dans un endroit bien eclaire, sans ombre sur le document.');
        }

        if ($luminositeMoyenne > self::LUMINOSITE_MAX) {
            $this->refuser($champ, 'Photo trop claire ou surexposee : evitez les reflets et reprenez la photo.');
        }

        if ($contraste < self::CONTRASTE_MIN) {
            $this->refuser($champ, 'Photo trop uniforme : le document doit etre visible en entier, avec un fond contrastant.');
        }

        if ($nettete < self::NETTETE_MIN) {
            $this->refuser($champ, 'Photo floue : stabilisez l\'appareil, approchez-vous et reprenez la photo.');
        }
    }

    private function refuser(string $champ, string $message): never
    {
        throw ValidationException::withMessages([
            $champ => [$message],
        ]);
    }
}
