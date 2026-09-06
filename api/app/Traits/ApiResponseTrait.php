<?php

namespace App\Traits;

use App\Support\Messages\ToastMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

trait ApiResponseTrait
{
    protected function buildSuccessResponse(string $message, mixed $data = null, int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    protected function buildSuccessPaginatedResponse(string $message, mixed $data, int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    protected function buildErrorResponse(Throwable|string $error, int $status = 400): JsonResponse
    {
        if (is_string($error)) {
            return response()->json([
                'success' => false,
                'message' => $error,
            ], $status);
        }

        // Only exceptions whose message is intentionally user-facing may be exposed.
        $isSafe = $error instanceof ValidationException
            || $error instanceof HttpExceptionInterface;

        if (! $isSafe) {
            // Internal/unexpected error: log the real cause, never leak it to the client.
            Log::error('Unhandled API exception', [
                'exception' => $error::class,
                'message' => $error->getMessage(),
            ]);
        }

        $payload = [
            'success' => false,
            'message' => $isSafe ? $error->getMessage() : ToastMessage::get('common.error.generic'),
        ];

        if ($error instanceof ValidationException) {
            $payload['errors'] = $error->errors();
        }

        return response()->json($payload, $status);
    }
}
