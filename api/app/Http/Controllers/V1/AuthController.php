<?php

namespace App\Http\Controllers\V1;

use App\Domain\Services\DemoSessionService;
use App\Domain\Services\UserAuthService;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Auth\LoginRequest;
use App\Http\Resources\V1\Auth\UserResource;
use App\Support\Messages\ToastMessage;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class AuthController extends Controller
{
    public function __construct(
        private readonly UserAuthService $userAuthService,
        private readonly DemoSessionService $demoSessions,
    ) {}

    public function login(LoginRequest $request)
    {
        try {
            $payload = $this->userAuthService->authenticateUser(
                $request->validated('email'),
                $request->validated('password'),
            );

            return $this->buildSuccessResponse(ToastMessage::get('auth.login.success'), [
                'user' => new UserResource($payload['user']),
            ]);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse(ToastMessage::get('auth.login.invalid'), Response::HTTP_UNAUTHORIZED);
        }
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $user->loadMissing('roles.permissions');

        return $this->buildSuccessResponse(
            ToastMessage::get('auth.me.success'),
            new UserResource($user),
        );
    }

    public function logout(Request $request)
    {
        if ($request->user()->isDemo()) {
            $this->demoSessions->logout($request->bearerToken() ?? '');
        } else {
            $this->userAuthService->logoutSession($request);
        }

        return $this->buildSuccessResponse(ToastMessage::get('auth.logout.success'));
    }
}
