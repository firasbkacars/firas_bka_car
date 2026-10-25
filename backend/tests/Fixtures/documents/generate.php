<?php

// Genere les images de test pour la verification automatique des documents.
// Usage : php -d extension=gd backend/tests/Fixtures/documents/generate.php

$dir = __DIR__;

function documentImage(int $w, int $h, string $mode): GdImage
{
    $im = imagecreatetruecolor($w, $h);

    if ($mode === 'blurry') {
        // Degrade doux : aucune arrete nette, typique d'une photo floue.
        for ($x = 0; $x < $w; $x++) {
            $v = (int) (120 + 60 * sin($x / $w * M_PI));
            $c = imagecolorallocate($im, $v, $v, $v);
            imagefilledrectangle($im, $x, 0, $x, $h, $c);
        }
        imagefilledrectangle($im, (int) ($w * 0.15), (int) ($h * 0.2), (int) ($w * 0.85), (int) ($h * 0.3), imagecolorallocate($im, 160, 160, 160));
        imagefilledrectangle($im, (int) ($w * 0.15), (int) ($h * 0.45), (int) ($w * 0.7), (int) ($h * 0.5), imagecolorallocate($im, 150, 150, 150));
        imagefilter($im, IMG_FILTER_GAUSSIAN_BLUR);
        imagefilter($im, IMG_FILTER_GAUSSIAN_BLUR);
        imagefilter($im, IMG_FILTER_GAUSSIAN_BLUR);

        return $im;
    }

    if ($mode === 'dark') {
        imagefilledrectangle($im, 0, 0, $w, $h, imagecolorallocate($im, 12, 12, 12));
        $gris = imagecolorallocate($im, 28, 28, 28);
        for ($i = 0; $i < 30; $i++) {
            imagefilledrectangle($im, 50, 60 + $i * 20, $w - 80 - ($i % 5) * 30, 66 + $i * 20, $gris);
        }

        return $im;
    }

    // Document lisible : fond clair, texte sombre, cadres et photo.
    imagefilledrectangle($im, 0, 0, $w, $h, imagecolorallocate($im, 243, 243, 238));
    imagefilledrectangle($im, 30, 30, $w - 30, 110, imagecolorallocate($im, 25, 45, 85));
    imagestring($im, 5, 55, 60, 'CARTE NATIONALE D IDENTITE', imagecolorallocate($im, 255, 255, 255));
    imagestring($im, 4, 55, 145, 'NOM : GHANIMI', imagecolorallocate($im, 20, 20, 20));
    imagestring($im, 4, 55, 180, 'PRENOM : MOHAMED', imagecolorallocate($im, 20, 20, 20));
    imagestring($im, 4, 55, 215, 'NE LE : 01/01/1990', imagecolorallocate($im, 20, 20, 20));
    imagestring($im, 4, 55, 250, 'CIN : AB123456', imagecolorallocate($im, 20, 20, 20));
    imagestring($im, 4, 55, 285, 'VALIDITE : 01/01/2030', imagecolorallocate($im, 20, 20, 20));

    // Photo d'identite + texture pour imiter une vraie photo de document.
    imagefilledrectangle($im, $w - 260, 140, $w - 60, 360, imagecolorallocate($im, 110, 140, 170));
    imagefilledellipse($im, $w - 160, 220, 70, 80, imagecolorallocate($im, 210, 175, 145));
    imagefilledrectangle($im, $w - 220, 270, $w - 100, 360, imagecolorallocate($im, 60, 80, 110));

    // Lignes de texte simulees (bruit haute frequence).
    for ($i = 0; $i < 18; $i++) {
        $y = 380 + $i * 20;
        $len = $w - 120 - ($i % 4) * 70;
        for ($x = 55; $x < $len; $x += 7) {
            $g = random_int(20, 70);
            imagefilledrectangle($im, $x, $y, $x + 4, $y + 2, imagecolorallocate($im, $g, $g, $g));
        }
    }

    // Bords et coins (repères de cadrage).
    $noir = imagecolorallocate($im, 30, 30, 30);
    imagerectangle($im, 20, 20, $w - 20, $h - 20, $noir);
    imagerectangle($im, 24, 24, $w - 24, $h - 24, $noir);

    return $im;
}

function save(GdImage $im, string $path, int $quality = 88): void
{
    imagejpeg($im, $path, $quality);
    imagedestroy($im);
}

if (! extension_loaded('gd')) {
    fwrite(STDERR, "GD est requis pour generer les fixtures.\n");
    exit(1);
}

save(documentImage(1200, 800, 'good'), $dir.'/good-document.jpg', 90);
save(documentImage(1200, 800, 'blurry'), $dir.'/blurry-document.jpg', 55);
save(documentImage(1200, 800, 'dark'), $dir.'/dark-document.jpg', 60);
save(documentImage(400, 250, 'good'), $dir.'/tiny-document.jpg', 80);

file_put_contents($dir.'/corrupt-document.jpg', "ceci n'est pas une image\n".str_repeat('x', 2000));
file_put_contents($dir.'/document.pdf', "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n");

foreach (glob($dir.'/*.{jpg,pdf}', GLOB_BRACE) as $file) {
    printf("%-28s %8d octets\n", basename($file), filesize($file));
}
