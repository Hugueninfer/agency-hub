<?php

namespace App\Http\Controllers\V1;

use App\Domain\Services\DemoSessionService;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\Auth\DemoSessionResource;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

class DemoAuthController extends Controller
{
    public function __construct(private readonly DemoSessionService $sessions) {}

    public function create(): JsonResponse
    {
        try {
            return $this->buildSuccessResponse('Demo workspace created.', new DemoSessionResource($this->sessions->create()), 201);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, $exception instanceof HttpExceptionInterface ? $exception->getStatusCode() : 500);
        }
    }
}
