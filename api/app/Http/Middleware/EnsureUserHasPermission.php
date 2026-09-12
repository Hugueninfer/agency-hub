<?php

namespace App\Http\Middleware;

use App\Support\Messages\ToastMessage;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasPermission
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if ($user === null || ! $user->hasPermission($permission)) {
            return response()->json([
                'success' => false,
                'message' => ToastMessage::get('auth.forbidden.generic'),
            ], 403);
        }

        return $next($request);
    }
}
