<?php

namespace App\Domain\Services;

use App\Models\Board;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\MenuItem;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\Permission;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\TaskSubtask;
use App\Models\Tenant;
use App\Models\TimeEntry;
use App\Models\User;
use App\Support\Notifications\NotificationType;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

/**
 * Lifecycle graph orchestration intentionally follows TenantService's direct
 * persistence convention; it never uses another workspace as fixture input.
 */
class DemoFixtureService
{
    public function seed(Tenant $tenant, User $owner, CarbonImmutable $now): void
    {
        $fixture = json_decode(json_encode(require database_path('fixtures/demo.php'), JSON_THROW_ON_ERROR), true, 512, JSON_THROW_ON_ERROR);

        DB::transaction(function () use ($tenant, $owner, $now, $fixture): void {
            $destination = Tenant::query()->lockForUpdate()->findOrFail($tenant->id);
            if (! $destination->isDemo() || ! $owner->exists || (int) $owner->tenant_id !== (int) $destination->id) {
                throw new InvalidArgumentException('Demo fixtures require a demo tenant and its own persisted owner.');
            }
            $owner = $destination->users()->whereKey($owner->id)->firstOrFail();
            $destination->update($fixture['tenant']);
            // Allocate fresh UUIDs once per symbolic entity. Integer FK maps follow inserts.
            $uuids = [];
            foreach (['users', 'roles', 'projects', 'tasks', 'comments', 'time_entries', 'invoices', 'boards', 'notifications', 'menu'] as $group) {
                foreach (array_keys($fixture[$group]) as $key) {
                    $uuids[$group.'.'.$key] = (string) Str::uuid();
                }
            }
            $uuids['users.alex'] = $owner->uuid;
            $attributes = fn (string $key): array => ['uuid' => $uuids[$key], 'tenant_id' => $destination->id, 'created_at' => $now, 'updated_at' => $now];

            $permissions = [];
            foreach ($fixture['permissions'] as $code => $name) {
                // Permission definitions are global catalog rows, never tenant data.
                $permissions[$code] = Permission::firstOrCreate(['code' => $code], ['name' => $name])->id;
            }
            $roles = [];
            foreach ($fixture['roles'] as $key => $data) {
                $role = Role::forceCreate($attributes('roles.'.$key) + ['name' => $key, 'description' => $data['description']]);
                $codes = $data['permissions'] === '*' ? array_keys($permissions) : $data['permissions'];
                $role->permissions()->sync(array_map(fn ($code) => $permissions[$code], $codes));
                $roles[$key] = $role;
            }
            $users = [];
            foreach ($fixture['users'] as $key => $data) {
                [$local, $domain] = explode('@', $data['email']);
                $profile = ['name' => $data['name'], 'email' => $local.'+'.$destination->uuid.'@'.$domain];
                if ($key === 'alex') {
                    $owner->update($profile);
                    $user = $owner;
                } else {
                    $user = User::forceCreate($attributes('users.'.$key) + $profile + ['password' => Str::random(64)]);
                }
                $user->roles()->sync([$roles[$data['role']]->id]);
                $users[$key] = $user;
            }
            $projects = [];
            foreach ($fixture['projects'] as $key => $data) {
                $projects[$key] = Project::forceCreate($attributes('projects.'.$key) + $data);
            }
            $columns = ['todo' => Task::BOARD_TODO, 'development' => Task::BOARD_IN_PROGRESS, 'pending' => Task::BOARD_PENDENCY, 'done' => Task::BOARD_DONE];
            $tasks = [];
            foreach ($fixture['tasks'] as $key => $data) {
                $task = Task::forceCreate($attributes('tasks.'.$key) + [
                    'project_id' => $projects[$data['project']]->id, 'created_by' => $owner->id,
                    'title' => $data['title'], 'description' => $data['description'],
                    'board_column' => $columns[$data['status']], 'position' => count($tasks),
                    'due_date' => $now->addDays($data['due_days'])->toDateString(), 'source' => Task::SOURCE_MANUAL,
                ]);
                $task->assignees()->sync(array_map(fn ($key) => $users[$key]->id, $data['assignees']));
                $tasks[$key] = $task;
            }
            foreach (array_values($fixture['checklist']['items']) as $position => $item) {
                TaskSubtask::forceCreate([
                    'uuid' => (string) Str::uuid(), 'task_id' => $tasks[$fixture['checklist']['task']]->id,
                    'title' => $item['title'], 'is_done' => $item['is_done'], 'position' => $position,
                    'assignee_id' => $users[$item['assignee']]->id, 'created_at' => $now, 'updated_at' => $now,
                ]);
            }
            foreach ($fixture['comments'] as $key => $data) {
                TaskComment::forceCreate([
                    'uuid' => $uuids['comments.'.$key], 'task_id' => $tasks[$data['task']]->id,
                    'user_id' => $users[$data['user']]->id, 'body' => $data['body'],
                    'created_at' => $now->subDays($data['days_ago']), 'updated_at' => $now->subDays($data['days_ago']),
                ]);
            }
            foreach ($fixture['time_entries'] as $key => $data) {
                $date = $data['week'] === -1 ? $now->startOfWeek()->subWeek()->addDays(4) : $now->startOfWeek()->addDays(min(4, $now->dayOfWeekIso - 1));
                TimeEntry::forceCreate($attributes('time_entries.'.$key) + [
                    'task_id' => $tasks[$data['task']]->id, 'project_id' => $tasks[$data['task']]->project_id,
                    'user_id' => $users[$data['user']]->id, 'source' => TimeEntry::SOURCE_MANUAL,
                    'worked_date' => $date->toDateString(), 'duration_minutes' => $data['minutes'],
                ]);
            }
            foreach ($fixture['invoices'] as $key => $data) {
                $total = array_sum(array_map(fn ($item) => $item['quantity'] * $item['unit_price'], $data['items']));
                $invoice = Invoice::forceCreate($attributes('invoices.'.$key) + [
                    'invoice_number' => $data['invoice_number'], 'status' => $data['status'],
                    'issue_date' => $now->addDays($data['issue_days'])->toDateString(), 'due_date' => $now->addDays($data['due_days'])->toDateString(),
                    'currency' => 'USD', 'seller_name' => $fixture['tenant']['name'], 'seller_email' => $fixture['tenant']['email'],
                    'buyer_name' => $data['buyer_name'], 'buyer_email' => $data['buyer_email'], 'notes' => $data['notes'],
                    'subtotal_amount' => $total, 'tax_amount' => 0, 'total_amount' => $total,
                    'sent_at' => $data['status'] === 'draft' ? null : $now->addDays($data['issue_days']),
                    'created_by' => $owner->id, 'updated_by' => $owner->id,
                ]);
                foreach (array_values($data['items']) as $position => $item) {
                    InvoiceItem::forceCreate($item + [
                        'uuid' => (string) Str::uuid(), 'tenant_id' => $destination->id, 'invoice_id' => $invoice->id,
                        'position' => $position, 'tax_percent' => 0, 'line_total' => $item['quantity'] * $item['unit_price'],
                        'created_at' => $now, 'updated_at' => $now,
                    ]);
                }
            }
            foreach ($fixture['boards'] as $key => $data) {
                Board::forceCreate($attributes('boards.'.$key) + [
                    'name' => $data['name'], 'created_by' => $users[$data['author']]->id, 'updated_by' => $users[$data['author']]->id,
                    'excalidraw_data' => $this->scene($data['excalidraw_data'], $now),
                ]);
            }
            foreach ($fixture['notifications'] as $key => $data) {
                Notification::forceCreate($attributes('notifications.'.$key) + [
                    'notifiable_id' => $users[$data['user']]->id, 'actor_uuid' => $users[$data['actor']]->uuid,
                    'type' => $data['type'], 'title' => $data['title'], 'body' => $data['body'],
                    'action_url' => '/tasks', 'action_text' => 'View tasks',
                    'read_at' => $data['read'] ? $now->subHour() : null,
                ]);
            }
            foreach ($users as $user) {
                foreach (NotificationType::all() as $type) {
                    NotificationPreference::forceCreate($fixture['preferences'] + ['tenant_id' => $destination->id, 'user_id' => $user->id, 'type' => $type, 'created_at' => $now, 'updated_at' => $now]);
                }
            }
            foreach ($fixture['menu'] as $key => $data) {
                MenuItem::forceCreate($attributes('menu.'.$key) + $data + ['is_active' => true]);
            }
        });
    }

    public function clear(Tenant $tenant): void
    {
        DB::transaction(function () use ($tenant): void {
            $destination = Tenant::query()->lockForUpdate()->findOrFail($tenant->id);
            if (! $destination->isDemo()) {
                throw new InvalidArgumentException('Only demo tenants can clear a demo fixture.');
            }
            // The session owner is authoritative when fixture roles were edited.
            $ownerIds = $destination->demoTokens()->pluck('user_id')->unique()->all();
            if ($ownerIds === []) {
                $ownerIds = $destination->users()->whereHas('roles', fn ($query) => $query->where('roles.tenant_id', $destination->id)->where('name', 'owner'))->pluck('users.id')->all();
            }
            if ($ownerIds === []) {
                throw new RuntimeException('Cannot clear a demo workspace without an identifiable owner.');
            }
            $taskIds = DB::table('tasks')->where('tenant_id', $destination->id)->pluck('id');
            foreach (['task_attachments', 'task_comments', 'task_subtasks', 'task_user'] as $table) {
                DB::table($table)->whereIn('task_id', $taskIds)->delete();
            }
            foreach (['time_sessions', 'time_entries', 'invoice_items', 'invoices', 'notifications', 'notification_preferences', 'boards', 'tasks', 'projects', 'menu_items', 'fathom_processed_events', 'fathom_integrations', 'roles'] as $table) {
                DB::table($table)->where('tenant_id', $destination->id)->delete();
            }
            $destination->users()->whereNotIn('id', $ownerIds)->get()->each(function (User $user): void {
                $user->tokens()->delete();
                $user->delete();
            });
        });
    }

    private function scene(array $scene, CarbonImmutable $now): array
    {
        foreach ($scene['elements'] as $index => $element) {
            $scene['elements'][$index]['id'] = (string) Str::uuid();
            $scene['elements'][$index]['updated'] = $now->getTimestampMs();
        }
        $scene['files'] = (object) [];

        return $scene;
    }
}
