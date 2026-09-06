<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

abstract class ApiTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    protected function ownerUser(): User
    {
        return User::query()->where('email', 'test@example.com')->firstOrFail();
    }

    protected function memberUser(): User
    {
        return User::query()->where('email', 'member@example.com')->firstOrFail();
    }

    protected function sanctumAsOwner(): User
    {
        $user = $this->ownerUser();
        Sanctum::actingAs($user);

        return $user;
    }

    protected function sanctumAsMember(): User
    {
        $user = $this->memberUser();
        Sanctum::actingAs($user);

        return $user;
    }
}
