<?php

namespace App\Domain\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;

class UserAuthService
{
    /**
     * Autenticação via sessão (cookie httpOnly) para SPA — sem token Bearer em JSON.
     *
     * @return array{user: User}
     */
    public function authenticateUser(string $email, string $password): array
    {
        // No "remember me": the session lifetime is the single source of truth.
        // A long-lived remember cookie would bypass SESSION_LIFETIME and the SPA idle policy.
        if (! Auth::guard('web')->attempt(['email' => $email, 'password' => $password])) {
            throw new UnauthorizedHttpException('Bearer', 'Invalid credentials.');
        }

        /** @var User $user */
        $user = Auth::guard('web')->user();
        $user->load(['roles.permissions']);

        return [
            'user' => $user,
        ];
    }

    public function logoutSession(Request $request): void
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
}
