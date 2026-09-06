<?php

namespace App\Http\Middleware;

use App\Domain\Exceptions\DemoWriteLimitExceeded;
use App\Domain\Services\DemoWriteBudgetService;
use Closure;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnforceDemoWriteBudget
{
    public function __construct(private readonly DemoWriteBudgetService $budget) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethodSafe() || ! $request->user()?->isDemo()
            || $request->is('api/v1/auth/demo/reset', 'api/v1/auth/demo/logout', 'api/v1/auth/logout')) {
            return $next($request);
        }

        try {
            return DB::transaction(function () use ($request, $next): Response {
                $this->budget->begin($request->user()->tenant_id);
                $response = $next($request);
                $this->budget->assertWithinLimit();

                if ($response->getStatusCode() >= 400) {
                    throw new HttpResponseException($response);
                }

                return $response;
            });
        } catch (DemoWriteLimitExceeded $exception) {
            return response()->json(['success' => false, 'message' => $exception->getMessage()], 429);
        } catch (HttpResponseException $exception) {
            return $exception->getResponse();
        } finally {
            $this->budget->end();
        }
    }
}
