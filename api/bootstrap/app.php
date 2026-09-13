<?php

use App\Http\Middleware\AuthenticateWorkspace;
use App\Http\Middleware\BlockDemoUploads;
use App\Http\Middleware\EnforceDemoWriteBudget;
use App\Http\Middleware\EnsureTenantContext;
use App\Http\Middleware\EnsureUserHasPermission;
use App\Http\Middleware\SecurityHeaders;
use App\Support\Messages\ToastMessage;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->redirectGuestsTo(null);

        $middleware->statefulApi();
        $middleware->trustProxies(headers: Request::HEADER_X_FORWARDED_FOR
            | Request::HEADER_X_FORWARDED_HOST
            | Request::HEADER_X_FORWARDED_PORT
            | Request::HEADER_X_FORWARDED_PROTO);

        $middleware->alias([
            'workspace.auth' => AuthenticateWorkspace::class,
            'tenant' => EnsureTenantContext::class,
            'demo.uploads' => BlockDemoUploads::class,
            'demo.budget' => EnforceDemoWriteBudget::class,
            'permission' => EnsureUserHasPermission::class,
        ]);

        $middleware->appendToGroup('api', [
            SecurityHeaders::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (AuthenticationException $exception, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => ToastMessage::get('auth.unauthorized.generic'),
                ], 401);
            }
        });
    })->create();
