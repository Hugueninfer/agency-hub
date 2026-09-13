<?php

return [
    // Empty means untrusted; Render explicitly sets '*'. Comma-separated
    // proxy IPs/CIDRs may be used when the ingress addresses are fixed.
    'proxies' => env('TRUSTED_PROXIES', ''),
];
