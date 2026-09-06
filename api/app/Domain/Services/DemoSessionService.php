<?php

namespace App\Domain\Services;

use App\Models\DemoToken;
use App\Models\Tenant;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Lifecycle orchestration follows the TenantService persistence convention. */
class DemoSessionService
{
    public function __construct(private readonly DemoFixtureService $fixtures) {}

    /** @return array{token: string, expires_at: CarbonImmutable} */
    public function create(): array
    {
        abort_if(config('app.mode') === 'personal', 404);

        return DB::transaction(function (): array {
            // A stable singleton serializes the empty-table case too. A write
            // acquires SQLite's write lock; FOR UPDATE covers MySQL/PostgreSQL.
            DB::table('demo_capacity_locks')->where('id', 1)->update(['id' => 1]);
            DB::table('demo_capacity_locks')->where('id', 1)->lockForUpdate()->sole();
            $now = CarbonImmutable::now();
            $active = Tenant::where('kind', 'demo')->where('expires_at', '>', $now)->count();
            abort_if($active >= max(0, (int) config('services.demo.max_active')), 429, 'Demo capacity reached. Please try again later.');

            $expiresAt = $now->addHours(max(1, min(48, (int) config('services.demo.ttl_hours'))));
            $tenant = Tenant::create([
                'name' => 'Demo Workspace', 'email' => Str::uuid().'@example.test',
                'status' => 'active', 'kind' => 'demo', 'expires_at' => $expiresAt,
            ]);
            $user = User::create([
                'tenant_id' => $tenant->id, 'name' => 'Demo Owner',
                'email' => 'owner+'.$tenant->uuid.'@example.test', 'password' => Str::random(64),
            ]);
            // The fixture establishes the owner role and its permission graph.
            $this->fixtures->seed($tenant, $user, $now);
            $plain = rtrim(strtr(base64_encode(random_bytes(48)), '+/', '-_'), '=');
            DemoToken::create([
                'digest' => hash('sha256', $plain), 'tenant_id' => $tenant->id,
                'user_id' => $user->id, 'expires_at' => $expiresAt,
            ]);

            return ['token' => $plain, 'expires_at' => $expiresAt];
        }, 3);
    }

    public function reset(User $user): void
    {
        abort_if(config('app.mode') === 'personal', 404);
        DB::transaction(function () use ($user): void {
            $tenant = Tenant::whereKey($user->tenant_id)->lockForUpdate()->firstOrFail();
            abort_unless($tenant->isDemo(), 404);
            abort_unless($tenant->expires_at?->isFuture(), 401);
            $this->fixtures->clear($tenant);
            $tenant->update(['demo_write_count' => 0]);
            $this->fixtures->seed($tenant, $user, CarbonImmutable::now());
        });
    }

    public function logout(string $plainToken): void
    {
        $user = request()->user();
        abort_unless(config('app.mode') !== 'personal' && $user?->isDemo(), 404);
        DemoToken::whereKey(hash('sha256', $plainToken))->where('tenant_id', $user->tenant_id)->delete();
    }
}
