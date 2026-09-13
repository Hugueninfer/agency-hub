<?php

namespace Tests\Feature\Api;

use App\Domain\Services\DemoFixtureService;
use App\Domain\Services\DemoSessionService;
use App\Models\DemoToken;
use App\Models\Tenant;
use App\Models\User;
use App\Providers\AppServiceProvider;
use Carbon\CarbonImmutable;
use Illuminate\Auth\SessionGuard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DemoAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.key' => 'base64:'.base64_encode(str_repeat('a', 32))]);
        config(['app.mode' => 'combined', 'services.demo.ttl_hours' => 24, 'services.demo.max_active' => 100]);
    }

    public function test_config_exposes_only_public_mode_and_availability(): void
    {
        foreach (['personal' => false, 'demo' => true, 'combined' => true] as $mode => $available) {
            config(['app.mode' => $mode]);
            $this->getJson('/api/v1/config')->assertOk()->assertJsonPath('data', [
                'app_mode' => $mode, 'demo_available' => $available,
            ]);
        }
    }

    public function test_creation_seeds_an_owner_and_returns_only_an_opaque_token_and_expiry(): void
    {
        $this->freezeTime();
        $response = $this->postJson('/api/v1/auth/demo')->assertCreated()
            ->assertJsonStructure(['success', 'message', 'data' => ['access_token', 'expires_at']]);
        $plain = $response->json('data.access_token');
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9_-]{64}$/', $plain);
        $this->assertDatabaseMissing('demo_tokens', ['digest' => $plain]);
        $token = DemoToken::findOrFail(hash('sha256', $plain));
        $this->assertSame(now()->addHours(24)->toIso8601String(), $token->expires_at->toIso8601String());
        $this->assertTrue($token->tenant->expires_at->equalTo($token->expires_at));
        $this->assertSame(1, $token->user->roles()->where('name', 'owner')->count());
        $this->assertSame(3, $token->tenant->projects()->count());
        $this->withToken($plain)->getJson('/api/v1/auth/me')->assertOk()
            ->assertJsonPath('data.uuid', $token->user->uuid)
            ->assertJsonPath('data.is_demo', true)
            ->assertJsonPath('data.expires_at', $response->json('data.expires_at'))
            ->assertJsonMissingPath('data.tenant_id')->assertJsonMissingPath('data.digest');
    }

    public function test_explicit_invalid_or_malformed_credentials_never_fall_back_to_personal_session(): void
    {
        $personal = $this->personalSession();
        $this->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('data.uuid', $personal->uuid);
        foreach (['Bearer invalid', 'Basic invalid', '', 'Bearer'] as $header) {
            $this->withHeader('Authorization', $header)->getJson('/api/v1/auth/me')->assertUnauthorized()
                ->assertJsonPath('success', false);
        }
    }

    public function test_expired_token_and_expired_tenant_never_fall_back_to_personal_session(): void
    {
        $plain = $this->postJson('/api/v1/auth/demo')->assertCreated()->json('data.access_token');
        $token = DemoToken::findOrFail(hash('sha256', $plain));
        $this->personalSession();
        $token->update(['expires_at' => now()->subSecond()]);
        $this->withToken($plain)->getJson('/api/v1/auth/me')->assertUnauthorized();
        $token->update(['expires_at' => now()->addHour()]);
        $token->tenant->update(['expires_at' => now()->subSecond()]);
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_valid_demo_token_overrides_personal_session_without_replacing_it(): void
    {
        $plain = $this->postJson('/api/v1/auth/demo')->assertCreated()->json('data.access_token');
        $demo = DemoToken::findOrFail(hash('sha256', $plain))->user;
        $personal = $this->personalSession();
        $this->withToken($plain)->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('data.uuid', $demo->uuid);
        Auth::forgetGuards();
        $this->withoutHeader('Authorization')->getJson('/api/v1/auth/me')->assertOk()
            ->assertJsonPath('data.uuid', $personal->uuid)->assertJsonPath('data.is_demo', false)
            ->assertJsonPath('data.expires_at', null)->assertJsonMissingPath('data.tenant_id');
    }

    public function test_personal_mode_disables_demo_creation_and_demo_tokens(): void
    {
        $plain = $this->postJson('/api/v1/auth/demo')->assertCreated()->json('data.access_token');
        config(['app.mode' => 'personal']);
        for ($attempt = 0; $attempt < 6; $attempt++) {
            $this->postJson('/api/v1/auth/demo')->assertNotFound();
        }
        $this->withToken($plain)->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_capacity_rejects_creation_without_partial_data_and_ignores_expired_demos(): void
    {
        config(['services.demo.max_active' => 1]);
        $plain = $this->postJson('/api/v1/auth/demo')->assertCreated()->json('data.access_token');
        $this->postJson('/api/v1/auth/demo')->assertStatus(429)->assertJsonPath('success', false);
        $this->assertSame(1, Tenant::where('kind', 'demo')->count());
        $this->assertDatabaseCount('demo_tokens', 1);
        DemoToken::findOrFail(hash('sha256', $plain))->tenant->update(['expires_at' => now()->subSecond()]);
        $this->postJson('/api/v1/auth/demo')->assertCreated();
        $this->assertSame(1, Tenant::where('kind', 'demo')->count());
        $this->assertDatabaseMissing('demo_tokens', ['digest' => hash('sha256', $plain)]);
    }

    public function test_failed_fixture_rolls_back_the_entire_demo_creation(): void
    {
        $counts = [];
        foreach (['tenants', 'users', 'roles', 'projects', 'demo_tokens'] as $table) {
            $counts[$table] = DB::table($table)->count();
        }
        $this->app->bind(DemoFixtureService::class, fn () => new class extends DemoFixtureService
        {
            public function seed(Tenant $tenant, User $owner, CarbonImmutable $now): void
            {
                parent::seed($tenant, $owner, $now);
                throw new \RuntimeException('Fixture failed');
            }
        });
        $this->postJson('/api/v1/auth/demo')->assertStatus(500);
        foreach ($counts as $table => $count) {
            $this->assertDatabaseCount($table, $count);
        }
    }

    public function test_demo_creation_is_limited_to_five_attempts_per_minute(): void
    {
        config(['services.demo.max_active' => 0]);
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/v1/auth/demo')->assertStatus(429)->assertHeaderMissing('Retry-After');
        }
        $this->postJson('/api/v1/auth/demo')->assertStatus(429)->assertHeader('Retry-After')->assertJsonPath('success', false);
    }

    public function test_ttl_is_clamped_to_one_through_forty_eight_hours(): void
    {
        $this->freezeTime();
        foreach ([0 => 1, 99 => 48] as $configured => $hours) {
            config(['services.demo.ttl_hours' => $configured]);
            $this->postJson('/api/v1/auth/demo')->assertCreated()
                ->assertJsonPath('data.expires_at', now()->addHours($hours)->toIso8601String());
        }
    }

    public function test_twenty_attempt_daily_limit_survives_minute_window_changes(): void
    {
        config(['services.demo.max_active' => 0]);
        $this->freezeTime();
        for ($attempt = 0; $attempt < 20; $attempt++) {
            $this->postJson('/api/v1/auth/demo')->assertStatus(429)->assertHeaderMissing('Retry-After');
            $this->travel(61)->seconds();
        }
        $this->postJson('/api/v1/auth/demo')->assertStatus(429)->assertHeader('Retry-After');
    }

    public function test_invalid_app_mode_fails_configuration_validation(): void
    {
        config(['app.mode' => 'invalid']);
        $this->expectException(\InvalidArgumentException::class);
        $this->app->getProvider(AppServiceProvider::class)->boot();
    }

    public function test_demo_service_reset_preserves_token_and_original_expiry(): void
    {
        $plain = $this->postJson('/api/v1/auth/demo')->assertCreated()->json('data.access_token');
        $token = DemoToken::findOrFail(hash('sha256', $plain));
        $tenant = $token->tenant;
        $expiresAt = $tenant->expires_at->toIso8601String();
        $tenant->projects()->firstOrFail()->update(['name' => 'Edited project']);
        $tenant->update(['demo_write_count' => 12]);
        app(DemoSessionService::class)->reset($token->user);
        $this->assertDatabaseMissing('projects', ['tenant_id' => $tenant->id, 'name' => 'Edited project']);
        $this->assertSame(3, $tenant->projects()->count());
        $this->assertSame(0, $tenant->fresh()->demo_write_count);
        $this->assertSame($expiresAt, $tenant->fresh()->expires_at->toIso8601String());
        $this->withToken($plain)->getJson('/api/v1/auth/me')->assertOk();
    }

    public function test_demo_service_logout_is_scoped_to_the_current_tenant_and_digest(): void
    {
        $first = $this->postJson('/api/v1/auth/demo')->assertCreated()->json('data.access_token');
        $second = $this->postJson('/api/v1/auth/demo')->assertCreated()->json('data.access_token');
        $user = DemoToken::findOrFail(hash('sha256', $first))->user;
        $request = Request::create('/api/v1/auth/demo/logout', 'POST');
        $this->app->instance('request', $request);
        $request->setUserResolver(fn () => $user);
        app(DemoSessionService::class)->logout($second);
        $this->assertDatabaseHas('demo_tokens', ['digest' => hash('sha256', $second)]);
        app(DemoSessionService::class)->logout($first);
        $this->assertDatabaseMissing('demo_tokens', ['digest' => hash('sha256', $first)]);
        $this->assertDatabaseHas('demo_tokens', ['digest' => hash('sha256', $second)]);
    }

    private function personalSession(): User
    {
        $tenant = Tenant::create(['name' => 'Personal', 'email' => 'personal@example.test', 'status' => 'active']);
        $user = User::create(['tenant_id' => $tenant->id, 'name' => 'Personal', 'email' => 'personal@example.test', 'password' => 'password']);
        $this->withHeader('Origin', 'http://localhost');
        $this->withSession(['login_web_'.sha1(SessionGuard::class) => $user->id]);
        Auth::forgetGuards();

        return $user;
    }
}
