<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Mode d'operation
    |--------------------------------------------------------------------------
    |
    | 'production' : echange reel avec la passerelle (contrat marchand requis).
    | 'sandbox'    : passerelle simulee. Aucune donnee bancaire reelle, aucun
    |                contrat requis. Permet de valider l'integralite du parcours
    |                (initiation, page de carte, retour, webhook, idempotence,
    |                verification de montant, remboursement) en local ou en
    |                preproduction.
    |
    | En sandbox, merchant_key/secret ne sont plus requis.
    |
    */
    'mode' => env('CMI_MODE', 'sandbox'),

    'merchant_key' => env('CMI_MERCHANT_KEY', ''),
    'merchant_secret' => env('CMI_MERCHANT_SECRET', 'sandbox-secret'),

    'return_url' => env('CMI_RETURN_URL', env('APP_URL').'/api/cmi/callback'),
    'cancel_url' => env('CMI_CANCEL_URL', env('APP_URL').'/api/cmi/cancel'),
    'notify_url' => env('CMI_NOTIFY_URL', env('APP_URL').'/api/cmi/webhook'),

    'gateway_url' => env('CMI_GATEWAY_URL', 'https://pay.cmi.co.ma/api/payment/init'),
    'status_url' => env('CMI_STATUS_URL', 'https://pay.cmi.co.ma/api/payment/status'),
    'refund_url' => env('CMI_REFUND_URL', 'https://pay.cmi.co.ma/api/payment/refund'),
];
