<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BlockDemoUploads
{
    public function handle(Request $request, Closure $next): Response
    {
        // Uploaded files are not transactional. Reject before controllers,
        // validation or write-budget handling can reach persistent storage.
        if ($request->user()?->isDemo() && $request->allFiles() !== []) {
            return response()->json([
                'success' => false,
                'message' => 'Uploads are disabled in demonstrations.',
            ], 403);
        }

        return $next($request);
    }
}
