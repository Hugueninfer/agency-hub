<?php

namespace Tests\Feature\Api;

use App\Models\Project;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoLifecycleTest extends TestCase
{
    use RefreshDatabase;

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

        $demo->delete();

        $this->assertDatabaseHas('tenants', ['id' => $personal->id]);
        $this->assertDatabaseMissing('tenants', ['id' => $demo->id]);
        $this->assertDatabaseMissing('users', ['id' => $demoUser->id]);
        $this->assertDatabaseMissing('roles', ['id' => $demoRole->id]);
        $this->assertDatabaseMissing('projects', ['id' => $demoProject->id]);
        $this->assertDatabaseMissing('demo_tokens', ['digest' => $demoToken->digest]);
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
