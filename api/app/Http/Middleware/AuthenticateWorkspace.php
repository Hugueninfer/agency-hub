<?php

namespace App\Http\Middleware;

use App\Models\DemoToken;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateWorkspace
{
    public function handle(Request $request, Closure $next): Response
    {
        // An explicit credential must succeed on its own, even with a valid cookie.
        if ($request->headers->has('Authorization')) {
            $plain = $request->bearerToken();
            if (config('app.mode') === 'personal' || ! is_string($plain) || $plain === '') {
                throw new AuthenticationException;
            }

            $token = DemoToken::with('user.tenant')
                ->whereKey(hash('sha256', $plain))
                ->where('expires_at', '>', now())
                ->first();
            $user = $token?->user;
            if ($user?->tenant?->kind !== 'demo'
                || ! $user->tenant->expires_at?->isFuture()
                || (int) $token->tenant_id !== (int) $user->tenant_id) {
                throw new AuthenticationException;
            }

            // Use Sanctum's request guard so the personal web session stays intact.
            Auth::shouldUse('sanctum');
            Auth::setUser($user);
        } else {
            $user = Auth::guard('sanctum')->user();
            if ($user === null || $user->isDemo()) {
                throw new AuthenticationException;
            }
        }

        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
