<?php

return [

    /*
    |--------------------------------------------------------------------------
    | HTTP Strict Transport Security (HSTS)
    |--------------------------------------------------------------------------
    |
    | Ativar apenas quando a API é servida exclusivamente por HTTPS em produção.
    | Requer proxy/load balancer corretos (TrustProxies) para detetar TLS.
    |
    */

    'hsts' => env('SECURITY_HSTS_ENABLED', false),

];
