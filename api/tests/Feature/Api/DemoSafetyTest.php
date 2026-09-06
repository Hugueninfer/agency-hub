<?php

namespace Tests\Feature\Api;

use App\Domain\Services\DemoSessionService;
use App\Events\InvoiceStatusChangedEvent;
use App\Jobs\ProcessFathomMeetingJob;
use App\Listeners\NotificationDispatcher;
use App\Mail\InvoiceSentMail;
use App\Models\DemoToken;
use App\Models\FathomIntegration;
use App\Models\Invoice;
use App\Models\MenuItem;
use App\Models\Notification;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DemoSafetyTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.key' => 'base64:'.base64_encode(str_repeat('a', 32)), 'app.mode' => 'combined', 'services.demo.max_writes' => 5000]);
        $session = app(DemoSessionService::class)->create();
        $this->tenant = DemoToken::findOrFail(hash('sha256', $session['token']))->tenant;
        $this->withToken($session['token']);
    }

    public function test_exhausted_budget_rejects_unsafe_requests_before_domain_mutation(): void
    {
        $this->tenant->update(['demo_write_count' => 5000]);
        $this->postJson('/api/v1/projects', ['name' => 'Cannot create'])->assertStatus(429);
        $this->assertDatabaseMissing('projects', ['name' => 'Cannot create']);
        $this->getJson('/api/v1/projects')->assertOk();
        $this->assertSame(5000, $this->tenant->fresh()->demo_write_count);
    }

    public function test_model_creates_and_updates_count_rows_and_deletion_does_not_refund(): void
    {
        $this->postJson('/api/v1/projects', ['name' => 'Budget project'])->assertSuccessful();
        $project = Project::where('name', 'Budget project')->sole();
        $this->assertSame(1, $this->tenant->fresh()->demo_write_count);
        $this->patchJson('/api/v1/projects/'.$project->uuid, ['name' => 'Renamed'])->assertSuccessful();
        $this->assertSame(2, $this->tenant->fresh()->demo_write_count);
        $this->deleteJson('/api/v1/projects/'.$project->uuid)->assertSuccessful();
        $this->assertSame(2, $this->tenant->fresh()->demo_write_count);
    }

    public function test_invoice_and_each_item_are_charged_and_overflow_rolls_back_every_row(): void
    {
        $payload = [
            'invoice_number' => 'BUDGET-1', 'buyer_email' => 'buyer@example.test',
            'items' => [
                ['description' => 'First', 'quantity' => 1, 'unit_price' => 10, 'unit_type' => 'quantity'],
                ['description' => 'Second', 'quantity' => 1, 'unit_price' => 20, 'unit_type' => 'quantity'],
            ],
        ];
        config(['services.demo.max_writes' => 2]);
        $this->postJson('/api/v1/invoices', $payload)->assertStatus(429);
        $this->assertDatabaseMissing('invoices', ['invoice_number' => 'BUDGET-1']);
        $this->assertDatabaseMissing('invoice_items', ['description' => 'First']);
        $this->assertSame(0, $this->tenant->fresh()->demo_write_count);
        config(['services.demo.max_writes' => 3]);
        $this->postJson('/api/v1/invoices', $payload)->assertSuccessful();
        $this->assertSame(3, $this->tenant->fresh()->demo_write_count);
    }

    public function test_error_responses_roll_back_completed_model_writes_and_counter(): void
    {
        Route::middleware(['api', 'workspace.auth', 'tenant', 'demo.budget'])->post('/api/v1/budget-error', function () {
            Project::create(['tenant_id' => request()->user()->tenant_id, 'name' => 'Must roll back']);

            return response()->json(['success' => false], 422);
        });
        $this->postJson('/api/v1/budget-error')->assertUnprocessable();
        $this->assertDatabaseMissing('projects', ['name' => 'Must roll back']);
        $this->assertSame(0, $this->tenant->fresh()->demo_write_count);
    }

    public function test_bulk_menu_updates_reserve_each_row_and_rollback_partial_changes(): void
    {
        $models = MenuItem::where('tenant_id', $this->tenant->id)->orderBy('id')->take(2)->get();
        $payload = $models->map(fn ($item) => [
            'uuid' => $item->uuid, 'label' => 'Budget '.$item->label,
            'section' => $item->section, 'order' => $item->order, 'is_active' => true,
        ])->all();
        config(['services.demo.max_writes' => 1]);
        $this->putJson('/api/v1/workspace/menu', ['items' => $payload])->assertStatus(429);
        $this->assertSame($models[0]->label, $models[0]->fresh()->label);
        $this->assertSame(0, $this->tenant->fresh()->demo_write_count);
        config(['services.demo.max_writes' => 2]);
        $this->putJson('/api/v1/workspace/menu', ['items' => $payload])->assertSuccessful();
        $this->assertSame(2, $this->tenant->fresh()->demo_write_count);
    }

    public function test_bulk_notification_updates_charge_all_matching_rows(): void
    {
        $user = DemoToken::where('tenant_id', $this->tenant->id)->sole()->user;
        Notification::where('tenant_id', $this->tenant->id)->delete();
        foreach (['First', 'Second'] as $title) {
            Notification::create(['tenant_id' => $this->tenant->id, 'notifiable_id' => $user->id,
                'type' => 'task_assigned', 'title' => $title, 'body' => 'Budget notification']);
        }
        config(['services.demo.max_writes' => 1]);
        $this->patchJson('/api/v1/notifications/read-all')->assertStatus(429);
        $this->assertSame(2, Notification::where('tenant_id', $this->tenant->id)->whereNull('read_at')->count());
        config(['services.demo.max_writes' => 2]);
        $this->patchJson('/api/v1/notifications/read-all')->assertSuccessful();
        $this->assertSame(2, $this->tenant->fresh()->demo_write_count);
    }

    public function test_rbac_user_insert_and_role_pivot_each_consume_a_unit(): void
    {
        $role = Role::where('tenant_id', $this->tenant->id)->where('name', 'owner')->sole();
        $payload = ['name' => 'Budget User', 'email' => 'budget@example.test', 'password' => 'password123', 'role_uuid' => $role->uuid];
        config(['services.demo.max_writes' => 1]);
        $this->postJson('/api/v1/rbac/users', $payload)->assertStatus(429);
        $this->assertDatabaseMissing('users', ['email' => 'budget@example.test']);
        $this->assertSame(0, $this->tenant->fresh()->demo_write_count);
        config(['services.demo.max_writes' => 2]);
        $this->postJson('/api/v1/rbac/users', $payload)->assertSuccessful();
        $this->assertSame(2, $this->tenant->fresh()->demo_write_count);
    }

    public function test_task_assignee_pivot_is_charged_and_identical_sync_has_no_extra_cost(): void
    {
        $user = DemoToken::where('tenant_id', $this->tenant->id)->sole()->user;
        $project = $this->tenant->projects()->firstOrFail();
        $payload = ['title' => 'Budget task', 'assignee_uuids' => [$user->uuid]];
        config(['services.demo.max_writes' => 1]);
        $this->postJson('/api/v1/projects/'.$project->uuid.'/tasks', $payload)->assertStatus(429);
        $this->assertDatabaseMissing('tasks', ['title' => 'Budget task']);
        $this->assertSame(0, $this->tenant->fresh()->demo_write_count);
        config(['services.demo.max_writes' => 10]);
        $this->postJson('/api/v1/projects/'.$project->uuid.'/tasks', $payload)->assertSuccessful();
        $this->assertSame(2, $this->tenant->fresh()->demo_write_count);
        $task = Task::where('tenant_id', $this->tenant->id)->where('title', 'Budget task')->sole();
        $this->patchJson('/api/v1/tasks/'.$task->uuid, $payload)->assertSuccessful();
        $this->assertSame(2, $this->tenant->fresh()->demo_write_count);
    }

    public function test_board_time_settings_and_preferences_share_model_write_accounting(): void
    {
        $user = DemoToken::where('tenant_id', $this->tenant->id)->sole()->user;
        $task = $user->assignedTasks()->firstOrFail();
        $this->postJson('/api/v1/boards', ['name' => 'Budget board'])->assertSuccessful();
        $this->assertSame(1, $this->tenant->fresh()->demo_write_count);
        $this->postJson('/api/v1/time/entries', [
            'task_uuid' => $task->uuid, 'worked_date' => now()->toDateString(), 'duration_minutes' => 30,
        ])->assertSuccessful();
        $this->assertSame(2, $this->tenant->fresh()->demo_write_count);
        $this->patchJson('/api/v1/workspace/settings', ['drive_link_label' => 'Budget drive'])->assertSuccessful();
        $this->assertSame(3, $this->tenant->fresh()->demo_write_count);
        $this->putJson('/api/v1/notifications/preferences', ['preferences' => [
            ['type' => 'task_assigned', 'database_enabled' => false, 'email_enabled' => false],
        ]])->assertSuccessful();
        $this->assertSame(4, $this->tenant->fresh()->demo_write_count);
    }

    public function test_failed_validation_and_another_demo_do_not_consume_this_tenants_budget(): void
    {
        $this->postJson('/api/v1/projects', [])->assertUnprocessable();
        $this->assertSame(0, $this->tenant->fresh()->demo_write_count);
        $other = app(DemoSessionService::class)->create();
        $this->withToken($other['token'])->postJson('/api/v1/projects', ['name' => 'Other demo project'])->assertSuccessful();
        $this->assertSame(0, $this->tenant->fresh()->demo_write_count);
        $otherTenant = DemoToken::findOrFail(hash('sha256', $other['token']))->tenant;
        $this->assertSame(1, $otherTenant->demo_write_count);
    }

    public function test_role_permission_pivot_insertions_are_counted_but_removals_are_not_refunded(): void
    {
        $role = Role::create(['tenant_id' => $this->tenant->id, 'name' => 'Budget role']);
        $payload = ['permission_codes' => ['project.read', 'task.read']];
        config(['services.demo.max_writes' => 1]);
        $this->postJson('/api/v1/rbac/roles/'.$role->uuid.'/permissions', $payload)->assertStatus(429);
        $this->assertSame(0, $role->permissions()->count());
        config(['services.demo.max_writes' => 3]);
        $this->postJson('/api/v1/rbac/roles/'.$role->uuid.'/permissions', $payload)->assertSuccessful();
        $this->assertSame(2, $this->tenant->fresh()->demo_write_count);
        $this->postJson('/api/v1/rbac/roles/'.$role->uuid.'/permissions', ['permission_codes' => ['project.read']])->assertSuccessful();
        $this->assertSame(1, $role->permissions()->count());
        $this->assertSame(2, $this->tenant->fresh()->demo_write_count);
    }

    public function test_demo_users_cannot_send_invoices_or_queue_mail(): void
    {
        Mail::fake();
        $invoice = Invoice::where('tenant_id', $this->tenant->id)
            ->where('status', Invoice::STATUS_DRAFT)
            ->sole();

        $this->postJson('/api/v1/invoices/'.$invoice->uuid.'/send')
            ->assertForbidden();

        Mail::assertNothingSent();
        Mail::assertNothingQueued();
    }

    public function test_demo_fathom_webhooks_are_rejected_without_queueing_a_job(): void
    {
        Queue::fake();
        $project = $this->tenant->projects()->firstOrFail();
        $integration = FathomIntegration::create([
            'tenant_id' => $this->tenant->id,
            'token' => 'demo-fathom-token',
            'webhook_secret' => 'demo-fathom-secret',
            'default_project_uuid' => $project->uuid,
            'default_board_column' => Task::BOARD_TODO,
        ]);
        $payload = [
            'event' => 'call.completed',
            'data' => ['id' => 'demo-meeting-1', 'action_items' => ['Do not create this task']],
        ];
        $body = json_encode($payload, JSON_THROW_ON_ERROR);

        $this->postJson('/api/v1/webhooks/fathom/'.$integration->token, $payload, [
            'X-Fathom-Signature' => 'sha256='.hash_hmac('sha256', $body, $integration->webhook_secret),
        ])->assertForbidden();

        Queue::assertNotPushed(ProcessFathomMeetingJob::class);
    }

    public function test_personal_users_can_still_queue_invoice_delivery(): void
    {
        Mail::fake();
        $this->tenant->update(['kind' => 'personal']);
        $user = DemoToken::where('tenant_id', $this->tenant->id)->sole()->user;
        $invoice = Invoice::where('tenant_id', $this->tenant->id)
            ->where('status', Invoice::STATUS_DRAFT)
            ->sole();
        $this->withoutToken();
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/invoices/'.$invoice->uuid.'/send')
            ->assertOk();

        Mail::assertQueued(InvoiceSentMail::class);
    }

    public function test_demo_notifications_do_not_write_or_queue_email_after_the_request(): void
    {
        Mail::fake();
        $actor = DemoToken::where('tenant_id', $this->tenant->id)->sole()->user;
        $recipient = $this->tenant->users()->whereKeyNot($actor->id)->firstOrFail();
        $invoice = Invoice::where('tenant_id', $this->tenant->id)
            ->where('status', Invoice::STATUS_DRAFT)
            ->sole();

        app(NotificationDispatcher::class)->handle(new InvoiceStatusChangedEvent(
            invoice: $invoice,
            oldStatus: Invoice::STATUS_DRAFT,
            newStatus: Invoice::STATUS_SENT,
            recipient: $recipient,
            actor: $actor,
            tenantId: $this->tenant->id,
        ));

        $this->assertDatabaseMissing('notifications', [
            'tenant_id' => $this->tenant->id,
            'notifiable_id' => $recipient->id,
            'title' => 'Invoice '.$invoice->invoice_number.' status changed to sent',
        ]);
        Mail::assertNothingSent();
        Mail::assertNothingQueued();
    }
}
