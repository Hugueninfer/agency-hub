<?php

namespace Tests\Feature;

use App\Models\MenuItem;
use App\Models\Permission;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CreateAgencyAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_a_personal_owner_with_hashed_password_and_permissions(): void
    {
        $tenantCount = Tenant::query()->count();
        $this->artisan('agency:account create owner@example.com')
            ->expectsQuestion('Password (minimum 15 characters)', 'a long private password')
            ->expectsQuestion('Confirm password', 'a long private password')
            ->expectsOutput('Owner account and personal workspace created.')
            ->assertSuccessful();

        $owner = User::query()->where('email', 'owner@example.com')->firstOrFail();
        $this->assertTrue(Hash::check('a long private password', $owner->password));
        $this->assertSame('personal', $owner->tenant->kind);
        $this->assertNull($owner->tenant->expires_at);
        $this->assertSame('owner', $owner->roles()->sole()->name);
        $this->assertEquals($owner->tenant_id, $owner->roles()->sole()->tenant_id);
        $this->assertTrue($owner->hasPermission('rbac.user.create'));
        $this->assertGreaterThan(0, MenuItem::query()->where('tenant_id', $owner->tenant_id)->count());
        $this->assertDatabaseCount('projects', 0);

        $this->artisan('agency:account create owner@example.com')->assertFailed();
        $this->assertDatabaseCount('tenants', $tenantCount + 1);
        $this->assertDatabaseCount('users', 1);
    }

    public function test_short_password_is_rejected_before_creating_any_records(): void
    {
        $tenantCount = Tenant::query()->count();
        $this->artisan('agency:account create owner@example.com')
            ->expectsQuestion('Password (minimum 15 characters)', 'fourteen-chars')
            ->expectsOutput('Password must contain at least 15 characters and at most 72 bytes.')
            ->assertFailed();

        $this->assertDatabaseCount('tenants', $tenantCount);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_password_confirmation_must_match(): void
    {
        $tenantCount = Tenant::query()->count();
        $this->artisan('agency:account create owner@example.com')
            ->expectsQuestion('Password (minimum 15 characters)', 'a long private password')
            ->expectsQuestion('Confirm password', 'a different private password')
            ->assertFailed();

        $this->assertDatabaseCount('tenants', $tenantCount);
    }

    public function test_noninteractive_invocation_and_invalid_email_are_rejected(): void
    {
        $this->artisan('agency:account create owner@example.com --no-interaction')->assertFailed();
        $this->artisan('agency:account create invalid-email')->assertFailed();
        $this->assertDatabaseCount('users', 0);
    }

    public function test_failure_rolls_back_the_entire_account_graph(): void
    {
        $tenantCount = Tenant::query()->count();
        Permission::creating(static function (): void {
            throw new \RuntimeException('Simulated provisioning failure');
        });
        try {
            $this->artisan('agency:account create owner@example.com')
                ->expectsQuestion('Password (minimum 15 characters)', 'a long private password')
                ->expectsQuestion('Confirm password', 'a long private password')
                ->assertFailed();
        } finally {
            Permission::flushEventListeners();
        }

        $this->assertDatabaseCount('tenants', $tenantCount);
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('roles', 0);
    }
}
