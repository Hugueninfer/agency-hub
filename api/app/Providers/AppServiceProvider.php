<?php

namespace App\Providers;

use App\Domain\Services\DemoWriteBudgetService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->scoped(DemoWriteBudgetService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        foreach (['creating', 'updating'] as $event) {
            Event::listen('eloquent.'.$event.': App\\Models\\*', function (string $event, array $models): void {
                app(DemoWriteBudgetService::class)->reserve();
            });
        }

        if (! in_array(config('app.mode'), ['personal', 'demo', 'combined'], true)) {
            throw new \InvalidArgumentException('APP_MODE must be personal, demo, or combined.');
        }

        RateLimiter::for('demo-create', function (Request $request) {
            if (config('app.mode') === 'personal') {
                return Limit::none();
            }
            $response = fn (Request $request, array $headers) => response()->json([
                'success' => false,
                'message' => 'Too many demo attempts. Please try again later.',
            ], 429, $headers);

            return [
                Limit::perMinute(5)->by('minute:'.$request->ip())->response($response),
                Limit::perDay(20)->by('day:'.$request->ip())->response($response),
            ];
        });

        RateLimiter::for('login', function (Request $request) {
            $email = mb_strtolower((string) $request->input('email', ''));

            return Limit::perMinute(5)->by($request->ip().':'.$email);
        });
    }
}
