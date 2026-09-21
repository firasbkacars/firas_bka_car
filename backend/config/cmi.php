<?php

return [
    'merchant_key' => env('CMI_MERCHANT_KEY', ''),
    'merchant_secret' => env('CMI_MERCHANT_SECRET', ''),
    'return_url' => env('CMI_RETURN_URL', ''),
    'cancel_url' => env('CMI_CANCEL_URL', ''),
    'notify_url' => env('CMI_NOTIFY_URL', ''),
    'gateway_url' => env('CMI_GATEWAY_URL', 'https://pay.cmi.co.ma/api/payment/init'),
    'status_url' => env('CMI_STATUS_URL', 'https://pay.cmi.co.ma/api/payment/status'),
];
