<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Impede que a documentação Swagger (UI + JSON) seja exposta em produção.
 * Em produção só é servida quando API_DOCS_ENABLED=true (ex.: atrás de VPN/SSO).
 */
class RestrictApiDocs
{
    public function handle(Request $request, Closure $next): Response
    {
        $isProduction = app()->environment('production');
        $explicitlyEnabled = (bool) env('API_DOCS_ENABLED', false);

        if ($isProduction && ! $explicitlyEnabled) {
            throw new NotFoundHttpException;
        }

        return $next($request);
    }
}
