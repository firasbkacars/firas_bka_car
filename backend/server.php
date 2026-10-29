<?php

/**
 * Routeur du serveur PHP intégré (`php artisan serve`).
 *
 * Laravel utilise ce fichier s'il existe à la racine du backend. Le serveur
 * intégré ignore les en-têtes posés par le script quand on retourne `false` :
 * on sert donc les fichiers statiques nous-mêmes pour appliquer le cache et
 * répondre aux requêtes conditionnelles (ETag / Last-Modified -> 304).
 */

$publicPath = getcwd();

$uri = urldecode(
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? ''
);

if ($uri !== '/' && file_exists($publicPath.$uri) && is_file($publicPath.$uri)) {
    $extension = strtolower(pathinfo($uri, PATHINFO_EXTENSION));

    $mimes = [
        'js' => 'text/javascript; charset=UTF-8',
        'css' => 'text/css; charset=UTF-8',
        'map' => 'application/json',
        'json' => 'application/json',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        'avif' => 'image/avif',
        'gif' => 'image/gif',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'otf' => 'font/otf',
        'eot' => 'application/vnd.ms-fontobject',
    ];

    $cacheable = isset($mimes[$extension]);
    $fichier = $publicPath.$uri;

    // Les fichiers non statiques (index.php, robots.txt, vérification Google)
    // restent gérés par le serveur PHP : on ne sert jamais de source PHP.
    if (! $cacheable) {
        return false;
    }

    $mtime = (int) filemtime($fichier);
    $size = (int) filesize($fichier);
    $etag = '"'.dechex($mtime).'-'.dechex($size).'"';

    if (str_starts_with($uri, '/assets/') || str_starts_with($uri, '/build/')) {
        // Noms de fichiers hashés par Vite : le contenu ne change jamais
        // pour une URL donnée.
        header('Cache-Control: public, max-age=31536000, immutable');
    } elseif (str_starts_with($uri, '/storage/')) {
        // Photos de véhicules et justificatifs publics : 7 jours.
        header('Cache-Control: public, max-age=604800');
    } else {
        // Logo, hero, favicon, polices : 30 jours.
        header('Cache-Control: public, max-age=2592000');
    }

    header('ETag: '.$etag);
    header('Last-Modified: '.gmdate('D, d M Y H:i:s', $mtime).' GMT');

    $ifNoneMatch = trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '', " \t\"");
    $ifModifiedSince = $_SERVER['HTTP_IF_MODIFIED_SINCE'] ?? '';

    if (
        $ifNoneMatch === trim($etag, '"')
        || ($ifNoneMatch === '' && $ifModifiedSince !== '' && strtotime($ifModifiedSince) >= $mtime)
    ) {
        http_response_code(304);
        exit;
    }

    header('Content-Type: '.$mimes[$extension]);
    header('Content-Length: '.filesize($fichier));

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') {
        readfile($fichier);
    }

    exit;
}

$formattedDateTime = date('D M j H:i:s Y');

$requestMethod = $_SERVER['REQUEST_METHOD'];
$remoteAddress = $_SERVER['REMOTE_ADDR'].':'.$_SERVER['REMOTE_PORT'];

file_put_contents('php://stdout', "[$formattedDateTime] $remoteAddress [$requestMethod] URI: $uri\n");

require_once $publicPath.'/index.php';
