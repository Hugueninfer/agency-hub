<?php

namespace Tests\Unit;

use App\Domain\Services\DemoFixtureService;
use App\Models\Board;
use App\Models\Invoice;
use App\Models\Notification;
use App\Models\Task;
use App\Models\Tenant;
use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Tests\TestCase;

class DemoFixtureServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_seed_uses_a_bounded_number_of_database_round_trips(): void
    {
        [$tenant, $owner] = $this->workspace('bounded');
        DB::flushQueryLog();
        DB::enableQueryLog();

        try {
            app(DemoFixtureService::class)->seed($tenant, $owner, CarbonImmutable::parse('2026-09-06T12:00:00Z'));
            $queryCount = count(DB::getQueryLog());
        } finally {
            DB::disableQueryLog();
        }

        $this->assertSame(3, DB::table('users')->where('tenant_id', $tenant->id)->count());
        $this->assertSame(8, DB::table('tasks')->where('tenant_id', $tenant->id)->count());
        $this->assertLessThanOrEqual(40, $queryCount, "Demo seeding executed {$queryCount} SQL statements.");
    }

    public function test_fixture_is_complete_isolated_rebased_and_does_not_mutate_its_source(): void
    {
        $service = app(DemoFixtureService::class);
        $source = require database_path('fixtures/demo.php');
        [$first, $owner] = $this->workspace('first');
        [$second, $secondOwner] = $this->workspace('second');
        $service->seed($first, $owner, CarbonImmutable::parse('2026-09-06T12:00:00Z'));
        $service->seed($second, $secondOwner, CarbonImmutable::parse('2026-09-07T12:00:00Z'));

        $this->assertSame($source, require database_path('fixtures/demo.php'));
        $tenantTables = ['users', 'roles', 'projects', 'tasks', 'time_entries', 'invoices', 'invoice_items', 'boards', 'notifications', 'menu_items'];
        foreach ($tenantTables as $table) {
            $firstUuids = DB::table($table)->where('tenant_id', $first->id)->pluck('uuid')->all();
            $secondUuids = DB::table($table)->where('tenant_id', $second->id)->pluck('uuid')->all();
            $this->assertNotEmpty($firstUuids, $table);
            $this->assertEmpty(array_intersect($firstUuids, $secondUuids), $table);
            $this->assertSame(0, DB::table($table)->whereNotIn('tenant_id', [$first->id, $second->id])->count(), $table);
        }
        foreach ([$first, $second] as $tenant) {
            $this->assertSame(3, $tenant->users()->count());
            $this->assertSame(3, $tenant->projects()->count());
            foreach (Task::boardColumns() as $status) {
                $this->assertGreaterThanOrEqual(2, Task::whereTenantId($tenant->id)->where('board_column', $status)->count());
            }
            foreach (Task::whereTenantId($tenant->id)->with(['project', 'creator', 'assignees', 'comments.user', 'subtasks.assignee'])->get() as $task) {
                $this->assertSame($tenant->id, $task->project->tenant_id);
                $this->assertSame($tenant->id, $task->creator->tenant_id);
                foreach ($task->assignees as $user) {
                    $this->assertSame($tenant->id, $user->tenant_id);
                }
                foreach ($task->comments as $comment) {
                    $this->assertSame($tenant->id, $comment->user->tenant_id);
                }
                foreach ($task->subtasks as $subtask) {
                    $this->assertSame($tenant->id, $subtask->assignee->tenant_id);
                }
            }
            $entries = DB::table('time_entries')->where('tenant_id', $tenant->id)->get();
            $this->assertCount(8, $entries);
            foreach ($entries as $entry) {
                $this->assertDatabaseHas('users', ['id' => $entry->user_id, 'tenant_id' => $tenant->id]);
                $this->assertDatabaseHas('tasks', ['id' => $entry->task_id, 'project_id' => $entry->project_id, 'tenant_id' => $tenant->id]);
            }
            $this->assertSame(['draft', 'sent', 'paid'], Invoice::whereTenantId($tenant->id)->orderBy('invoice_number')->pluck('status')->all());
            foreach (Invoice::whereTenantId($tenant->id)->with('items')->get() as $invoice) {
                $this->assertNotEmpty($invoice->items);
                $this->assertEquals($invoice->total_amount, $invoice->items->sum('line_total'));
                $this->assertSame($tenant->id, $invoice->creator->tenant_id);
                foreach ($invoice->items as $item) {
                    $this->assertSame($tenant->id, $item->tenant_id);
                    $this->assertContains($item->unit_type, ['hours', 'quantity']);
                }
            }
            $boards = Board::whereTenantId($tenant->id)->get();
            $this->assertCount(2, $boards);
            foreach ($boards as $board) {
                $scene = json_decode(json_encode($board->excalidraw_data, JSON_THROW_ON_ERROR), true, 512, JSON_THROW_ON_ERROR);
                $this->assertSame('excalidraw', $scene['type']);
                $this->assertNotEmpty($scene['elements']);
                $this->assertSame($tenant->id, $board->creator->tenant_id);
            }
            foreach (Notification::whereTenantId($tenant->id)->get() as $notification) {
                $this->assertSame($tenant->id, $notification->notifiable->tenant_id);
                $this->assertDatabaseHas('users', ['uuid' => $notification->actor_uuid, 'tenant_id' => $tenant->id]);
            }
            $this->assertSame(21, DB::table('notification_preferences')->where('tenant_id', $tenant->id)->count());
            $this->assertSame(11, DB::table('menu_items')->where('tenant_id', $tenant->id)->count());
            foreach ($tenant->users()->with('roles')->get() as $user) {
                $this->assertStringEndsWith('.example', $user->email);
                $this->assertTrue($user->hasPermission('task.update'));
                foreach ($user->roles as $role) {
                    $this->assertSame($tenant->id, $role->tenant_id);
                }
                $this->assertSame($user->name === 'Alex Morgan', $user->hasPermission('rbac.user.create'));
            }
        }
        $highlight = Task::whereTenantId($first->id)->where('title', 'Refine Aurora identity concepts')->firstOrFail();
        $this->assertSame('2026-09-08', $highlight->due_date->toDateString());
        $this->assertSame(2, $highlight->comments()->count());
        $this->assertGreaterThanOrEqual(3, $highlight->subtasks()->count());
        $secondHighlight = Task::whereTenantId($second->id)->where('title', $highlight->title)->firstOrFail();
        $this->assertSame('2026-09-09', $secondHighlight->due_date->toDateString());
        $this->assertSame(['2026-08-28', '2026-09-04'], DB::table('time_entries')->where('tenant_id', $first->id)->distinct()->orderBy('worked_date')->pluck('worked_date')->map(fn ($date) => CarbonImmutable::parse($date)->toDateString())->all());
        $this->assertSame(['2026-09-04', '2026-09-07'], DB::table('time_entries')->where('tenant_id', $second->id)->distinct()->orderBy('worked_date')->pluck('worked_date')->map(fn ($date) => CarbonImmutable::parse($date)->toDateString())->all());
    }

    public function test_midway_failure_rolls_back_the_whole_graph(): void
    {
        [$tenant, $owner] = $this->workspace('rollback');
        $failProjectInsert = true;
        DB::listen(function ($query) use (&$failProjectInsert): void {
            $sql = strtolower($query->sql);
            if ($failProjectInsert && str_contains($sql, 'insert into') && str_contains($sql, 'projects')) {
                $failProjectInsert = false;
                throw new RuntimeException('forced fixture failure');
            }
        });
        try {
            app(DemoFixtureService::class)->seed($tenant, $owner, CarbonImmutable::parse('2026-09-06T12:00:00Z'));
            $this->fail('Expected the injected fixture failure.');
        } catch (RuntimeException $exception) {
            $this->assertSame('forced fixture failure', $exception->getMessage());
        }
        $this->assertSame('rollback', $tenant->fresh()->name);
        $this->assertSame('Original owner', $owner->fresh()->name);
        $this->assertSame(1, $tenant->users()->count());
        foreach (['roles', 'permissions', 'projects', 'tasks', 'invoices', 'boards', 'notifications', 'menu_items'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
    }

    public function test_clear_and_reseed_preserve_owner_tokens_lifecycle_and_other_tenants(): void
    {
        $service = app(DemoFixtureService::class);
        [$tenant, $owner] = $this->workspace('reset');
        [$other, $otherOwner] = $this->workspace('untouched');
        $now = CarbonImmutable::parse('2026-09-06T12:00:00Z');
        $service->seed($tenant, $owner, $now);
        $service->seed($other, $otherOwner, $now);
        $token = $tenant->demoTokens()->create(['digest' => hash('sha256', 'reset'), 'user_id' => $owner->id, 'expires_at' => $now->addDay()]);
        $accessToken = $owner->createToken('demo')->accessToken;
        $member = $tenant->users()->where('id', '!=', $owner->id)->firstOrFail();
        $memberToken = $member->createToken('member')->accessToken;
        $member->roles()->sync($owner->roles()->pluck('roles.id')->all());
        $oldTaskUuids = Task::whereTenantId($tenant->id)->pluck('uuid')->all();
        $otherTaskUuids = Task::whereTenantId($other->id)->pluck('uuid')->all();
        $lifecycle = $tenant->fresh()->only(['uuid', 'kind', 'expires_at', 'demo_write_count']);

        $service->clear($tenant);
        $this->assertSame(1, $tenant->users()->count());
        $this->assertDatabaseHas('users', ['id' => $owner->id, 'uuid' => $owner->uuid]);
        $this->assertDatabaseHas('demo_tokens', ['digest' => $token->digest]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $accessToken->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $memberToken->id]);
        foreach (['tasks', 'projects', 'invoices', 'boards', 'roles', 'menu_items', 'notifications', 'notification_preferences', 'time_entries'] as $table) {
            $this->assertSame(0, DB::table($table)->where('tenant_id', $tenant->id)->count(), $table);
        }
        $service->seed($tenant, $owner, $now->addDay());
        $this->assertEquals($lifecycle, $tenant->fresh()->only(array_keys($lifecycle)));
        $this->assertEmpty(array_intersect($oldTaskUuids, Task::whereTenantId($tenant->id)->pluck('uuid')->all()));
        $this->assertSame($otherTaskUuids, Task::whereTenantId($other->id)->pluck('uuid')->all());
        $this->assertSame(3, $tenant->users()->count());
    }

    public function test_seed_rejects_an_owner_from_another_tenant(): void
    {
        [$tenant] = $this->workspace('destination');
        [, $otherOwner] = $this->workspace('source');
        $this->expectException(\InvalidArgumentException::class);
        app(DemoFixtureService::class)->seed($tenant, $otherOwner, CarbonImmutable::now());
    }

    public function test_legacy_seeder_refuses_production(): void
    {
        $this->app->instance('env', 'production');
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('DatabaseSeeder is disabled outside local/testing.');
        (new DatabaseSeeder)->run();
    }

    private function workspace(string $label): array
    {
        $tenant = Tenant::create(['name' => $label, 'email' => $label.'@northstar.example', 'kind' => 'demo', 'expires_at' => '2026-09-08 12:00:00', 'demo_write_count' => 7]);
        $owner = User::create(['tenant_id' => $tenant->id, 'name' => 'Original owner', 'email' => $label.'-owner@northstar.example', 'password' => 'test-password']);

        return [$tenant, $owner];
    }
}
