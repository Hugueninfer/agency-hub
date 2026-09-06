<?php

namespace App\Http\Controllers\V1;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessFathomMeetingJob;
use App\Models\FathomIntegration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class FathomWebhookController extends Controller
{
    public function handle(Request $request, string $token): JsonResponse
    {
        $integration = FathomIntegration::where('token', $token)->first();

        if ($integration === null) {
            return response()->json(['error' => 'Not found.'], Response::HTTP_NOT_FOUND);
        }

        if (! $this->signatureIsValid($request, $integration->webhook_secret)) {
            return response()->json(['error' => 'Invalid signature.'], Response::HTTP_UNAUTHORIZED);
        }

        $payload = $request->json()->all();

        // Only process completed calls that carry action items
        if (($payload['event'] ?? '') !== 'call.completed') {
            return response()->json(['ok' => true, 'skipped' => true]);
        }

        ProcessFathomMeetingJob::dispatch($integration->tenant_id, $integration->default_project_uuid, $integration->default_board_column, $payload['data'] ?? []);

        return response()->json(['ok' => true], Response::HTTP_ACCEPTED);
    }

    private function signatureIsValid(Request $request, string $secret): bool
    {
        $header = $request->header('X-Fathom-Signature', '');

        // Header format: "sha256=<hex>"
        if (! str_starts_with($header, 'sha256=')) {
            return false;
        }

        $received = substr($header, 7);
        $expected = hash_hmac('sha256', $request->getContent(), $secret);

        return hash_equals($expected, $received);
    }
}
