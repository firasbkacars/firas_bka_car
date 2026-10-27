<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Disque des justificatifs d'acompte
    |--------------------------------------------------------------------------
    |
    | Les recus de virement / Wafacash ne doivent jamais etre servis
    | directement par le web. En production Fly, le disque local n'est pas
    | persistant : on utilise le bucket Tigris (S3) prive.
    |
    */

    'receipts_disk' => env('RECEIPT_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            // Tigris (Fly) expose AWS_REGION / BUCKET_NAME /
            // AWS_ENDPOINT_URL_S3. On donne la priorite a ces variables pour
            // qu'une valeur AWS_* vide du .env local ne casse pas le bucket.
            'region' => env('AWS_REGION') ?: env('AWS_DEFAULT_REGION'),
            'bucket' => env('BUCKET_NAME') ?: env('AWS_BUCKET') ?: env('AWS_BUCKET_NAME'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT_URL_S3') ?: env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
            'report' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
