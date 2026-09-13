<?php

namespace Tests\Feature\Api;

use App\Domain\Services\DemoSessionService;
use App\Domain\Services\TenantService;
use App\Models\DemoToken;
use App\Models\Project;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Auth\SessionGuard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DemoLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.key' => 'base64:'.base64_encode(str_repeat('a', 32)), 'app.mode' => 'combined']);
    }

    public function test_reset_restores_only_caller_fixture_without_extending_expiry_or_consuming_budget(): void
    {
        $session = app(DemoSessionService::class)->create();
        $token = DemoToken::findOrFail(hash('sha256', $session['token']));
        $expiresAt = $token->tenant->expires_at->toIso8601String();
        $other = app(DemoSessionService::class)->create();
        $otherTenant = DemoToken::findOrFail(hash('sha256', $other['token']))->tenant;
        $otherProject = $otherTenant->projects()->firstOrFail();
        $otherProject->update(['name' => 'Keep other edit']);
        $token->tenant->projects()->firstOrFail()->update(['name' => 'Reset this edit']);
        $token->tenant->update(['demo_write_count' => 5000]);

        $this->withToken($session['token'])->postJson('/api/v1/auth/demo/reset')->assertOk();

        $this->assertDatabaseMissing('projects', ['tenant_id' => $token->tenant_id, 'name' => 'Reset this edit']);
        $this->assertSame('Keep other edit', $otherProject->fresh()->name);
        $this->assertSame(3, $token->tenant->projects()->count());
        $this->assertSame(0, $token->tenant->fresh()->demo_write_count);
        $this->assertSame($expiresAt, $token->tenant->fresh()->expires_at->toIso8601String());
        $this->getJson('/api/v1/auth/me')->assertOk();
    }

    public function test_demo_logout_deletes_only_presented_digest_and_keeps_other_sessions(): void
    {
        $session = app(DemoSessionService::class)->create();
        $token = DemoToken::findOrFail(hash('sha256', $session['token']));
        $token->tenant->demoTokens()->create([
            'digest' => hash('sha256', 'second-token'), 'user_id' => $token->user_id,
            'expires_at' => $session['expires_at'],
        ]);
        $token->tenant->update(['demo_write_count' => 5000]);

        $this->withToken($session['token'])->postJson('/api/v1/auth/demo/logout')->assertOk();

        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->withToken('second-token')->getJson('/api/v1/auth/me')->assertOk();
        $this->assertDatabaseHas('tenants', ['id' => $token->tenant_id, 'demo_write_count' => 5000]);
    }

    public function test_personal_user_cannot_call_demo_lifecycle_endpoints(): void
    {
        $this->actingAs($this->createUser($this->createTenant()), 'web');
        $this->postJson('/api/v1/auth/demo/reset')->assertNotFound();
        $this->postJson('/api/v1/auth/demo/logout')->assertNotFound();
    }

    public function test_generic_demo_logout_preserves_accompanying_personal_cookie(): void
    {
        $session = app(DemoSessionService::class)->create();
        DemoToken::findOrFail(hash('sha256', $session['token']))->tenant->update(['demo_write_count' => 5000]);
        $personal = $this->createUser($this->createTenant());
        $this->withHeader('Origin', 'http://localhost');
        $this->withSession(['login_web_'.sha1(SessionGuard::class) => $personal->id]);
        Auth::forgetGuards();

        $this->withToken($session['token'])->postJson('/api/v1/auth/logout')->assertOk();

        $this->assertDatabaseMissing('demo_tokens', ['digest' => hash('sha256', $session['token'])]);
        Auth::forgetGuards();
        $this->withoutHeader('Authorization')->getJson('/api/v1/auth/me')->assertOk()
            ->assertJsonPath('data.uuid', $personal->uuid);
    }

    public function test_expired_credentials_cannot_execute_reset(): void
    {
        $session = app(DemoSessionService::class)->create();
        $token = DemoToken::findOrFail(hash('sha256', $session['token']));
        $project = $token->tenant->projects()->firstOrFail();
        $project->update(['name' => 'Preserve expired data']);
        $token->update(['expires_at' => now()->subSecond()]);
        $this->withToken($session['token'])->postJson('/api/v1/auth/demo/reset')->assertUnauthorized();
        $this->assertSame('Preserve expired data', $project->fresh()->name);
    }

    public function test_cleanup_is_batched_idempotent_and_preserves_active_and_personal_tenants(): void
    {
        $originalCount = Tenant::count();
        $oldest = $this->createTenant(['kind' => 'demo', 'expires_at' => now()->subHours(2)]);
        $newer = $this->createTenant(['kind' => 'demo', 'expires_at' => now()->subHour()]);
        $active = $this->createTenant(['kind' => 'demo', 'expires_at' => now()->addHour()]);
        $personal = $this->createTenant(['expires_at' => now()->subDay()]);
        $user = $this->createUser($oldest);
        $pat = $user->createToken('cleanup')->accessToken;

        $this->artisan('demo:cleanup', ['--limit' => 1])->assertSuccessful();
        $this->assertDatabaseMissing('tenants', ['id' => $oldest->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $pat->id]);
        $this->assertDatabaseHas('tenants', ['id' => $newer->id]);
        $this->artisan('demo:cleanup')->assertSuccessful();
        $this->artisan('demo:cleanup')->assertSuccessful();
        $this->assertDatabaseMissing('tenants', ['id' => $newer->id]);
        $this->assertDatabaseCount('tenants', $originalCount + 2);
        $this->assertDatabaseHas('tenants', ['id' => $active->id]);
        $this->assertDatabaseHas('tenants', ['id' => $personal->id]);
    }

    public function test_cleanup_does_no_work_while_another_cleanup_holds_the_lock(): void
    {
        $expired = $this->createTenant(['kind' => 'demo', 'expires_at' => now()->subHour()]);
        $mysql = DB::connection()->getDriverName() === 'mysql';
        $lock = $mysql ? null : Cache::lock('agency-hub-demo-cleanup', 300);
        $connection = null;
        if ($mysql) {
            config(['database.connections.cleanup_lock_test' => config('database.connections.'.config('database.default'))]);
            $connection = DB::connection('cleanup_lock_test');
            $this->assertSame(1, (int) $connection->selectOne("SELECT GET_LOCK('agency-hub-demo-cleanup', 0) AS acquired")->acquired);
        } else {
            $this->assertTrue($lock->get());
        }
        try {
            $this->artisan('demo:cleanup')->assertSuccessful();
            $this->assertDatabaseHas('tenants', ['id' => $expired->id]);
            app(DemoSessionService::class)->create();
            $this->assertDatabaseHas('tenants', ['id' => $expired->id]);
        } finally {
            if ($connection !== null) {
                $connection->selectOne("SELECT RELEASE_LOCK('agency-hub-demo-cleanup')");
                DB::purge('cleanup_lock_test');
            } else {
                $lock->release();
            }
        }
        $this->artisan('demo:cleanup')->assertSuccessful();
        $this->assertDatabaseMissing('tenants', ['id' => $expired->id]);
    }

    public function test_creation_cleans_only_a_bounded_batch_of_expired_demos(): void
    {
        $expired = [];
        for ($i = 0; $i < 7; $i++) {
            $expired[] = $this->createTenant(['kind' => 'demo', 'expires_at' => now()->subHours(8 - $i)])->id;
        }
        $personal = $this->createTenant(['expires_at' => now()->subDay()]);
        $active = $this->createTenant(['kind' => 'demo', 'expires_at' => now()->addHour()]);

        app(DemoSessionService::class)->create();

        $this->assertSame(array_slice($expired, 5), Tenant::whereIn('id', $expired)->orderBy('id')->pluck('id')->all());
        $this->assertDatabaseHas('tenants', ['id' => $personal->id]);
        $this->assertDatabaseHas('tenants', ['id' => $active->id]);
    }

    public function test_tenant_kind_defines_demo_status_and_lifecycle_casts(): void
    {
        $personal = $this->createTenant();
        $demo = $this->createTenant([
            'kind' => 'demo',
            'expires_at' => now()->addHours(24),
        ]);
        $demoUser = $this->createUser($demo);

        $this->assertTrue($demo->fresh()->isDemo());
        $this->assertFalse($personal->fresh()->isDemo());
        $this->assertInstanceOf(CarbonInterface::class, $demo->fresh()->expires_at);
        $this->assertSame(0, $demo->fresh()->demo_write_count);
        $this->assertTrue($demoUser->fresh()->isDemo());
    }

    public function test_deleting_a_demo_tenant_cascades_its_graph_without_deleting_personal_tenant(): void
    {
        $personal = $this->createTenant();
        $personalUser = $this->createUser($personal);
        $personalProject = Project::query()->create([
            'tenant_id' => $personal->id,
            'name' => 'Personal Project',
        ]);
        $personalAccessToken = $personalUser->createToken('personal lifecycle')->accessToken;
        $demo = $this->createTenant(['kind' => 'demo']);
        $demoUser = $this->createUser($demo);
        $demoRole = Role::query()->create([
            'tenant_id' => $demo->id,
            'name' => 'demo-owner',
        ]);
        $demoProject = Project::query()->create([
            'tenant_id' => $demo->id,
            'name' => 'Demo Project',
        ]);
        $demoToken = $demo->demoTokens()->create([
            'digest' => hash('sha256', 'demo-token'),
            'user_id' => $demoUser->id,
            'expires_at' => now()->addHours(24),
        ]);
        $demoAccessToken = $demoUser->createToken('demo lifecycle')->accessToken;

        app(TenantService::class)->deleteForLifecycle($demo);

        $this->assertDatabaseHas('tenants', ['id' => $personal->id]);
        $this->assertDatabaseHas('users', ['id' => $personalUser->id]);
        $this->assertDatabaseHas('projects', ['id' => $personalProject->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $personalAccessToken->id]);
        $this->assertDatabaseMissing('tenants', ['id' => $demo->id]);
        $this->assertDatabaseMissing('users', ['id' => $demoUser->id]);
        $this->assertDatabaseMissing('roles', ['id' => $demoRole->id]);
        $this->assertDatabaseMissing('projects', ['id' => $demoProject->id]);
        $this->assertDatabaseMissing('demo_tokens', ['digest' => $demoToken->digest]);
        $this->assertArrayNotHasKey('digest', $demoToken->toArray());
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $demoAccessToken->id]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function createTenant(array $attributes = []): Tenant
    {
        return Tenant::query()->forceCreate(array_merge([
            'name' => 'Lifecycle Tenant',
            'email' => fake()->unique()->safeEmail(),
            'status' => 'active',
        ], $attributes));
    }

    private function createUser(Tenant $tenant): User
    {
        return User::query()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Demo User',
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password',
        ]);
    }
}
