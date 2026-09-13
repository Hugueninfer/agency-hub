<?php

namespace App\Domain\Services;

use App\Models\Task;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Notifications\NotificationType;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
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
            $idsFor = function (string $table, string $group) use ($fixture, $uuids): array {
                $keysByUuid = [];
                foreach (array_keys($fixture[$group]) as $key) {
                    $keysByUuid[$uuids[$group.'.'.$key]] = $key;
                }
                $idsByUuid = DB::table($table)->whereIn('uuid', array_keys($keysByUuid))->pluck('id', 'uuid');
                $ids = [];
                foreach ($keysByUuid as $uuid => $key) {
                    $id = $idsByUuid->get($uuid);
                    if ($id === null) {
                        throw new RuntimeException("Missing {$group} fixture row {$key} after batch insert.");
                    }
                    $ids[$key] = (int) $id;
                }

                return $ids;
            };

            // Permission definitions are a global catalog. Ignore existing codes just
            // like firstOrCreate did, but create every missing definition in one trip.
            $permissionRows = [];
            foreach ($fixture['permissions'] as $code => $name) {
                $permissionRows[] = ['code' => $code, 'name' => $name, 'description' => null, 'created_at' => $now, 'updated_at' => $now];
            }
            DB::table('permissions')->insertOrIgnore($permissionRows);
            $permissions = DB::table('permissions')->whereIn('code', array_keys($fixture['permissions']))->pluck('id', 'code')->map(fn ($id) => (int) $id)->all();

            $roleRows = [];
            foreach ($fixture['roles'] as $key => $data) {
                $roleRows[] = $attributes('roles.'.$key) + ['name' => $key, 'description' => $data['description']];
            }
            DB::table('roles')->insert($roleRows);
            $roles = $idsFor('roles', 'roles');
            $permissionRoleRows = [];
            foreach ($fixture['roles'] as $key => $data) {
                $codes = $data['permissions'] === '*' ? array_keys($permissions) : $data['permissions'];
                foreach ($codes as $code) {
                    $permissionRoleRows[] = ['role_id' => $roles[$key], 'permission_id' => $permissions[$code]];
                }
            }
            DB::table('permission_role')->insert($permissionRoleRows);

            $userRows = [];
            foreach ($fixture['users'] as $key => $data) {
                [$local, $domain] = explode('@', $data['email']);
                $profile = ['name' => $data['name'], 'email' => $local.'+'.$destination->uuid.'@'.$domain];
                if ($key === 'alex') {
                    DB::table('users')->where('id', $owner->id)->update($profile + ['updated_at' => $now]);

                    continue;
                }
                $userRows[] = $attributes('users.'.$key) + $profile + [
                    'password' => Hash::make(Str::random(64)),
                    'email_verified_at' => null,
                    'remember_token' => null,
                    'photo_path' => null,
                ];
            }
            DB::table('users')->insert($userRows);
            $users = $idsFor('users', 'users');
            $roleUserRows = [];
            foreach ($fixture['users'] as $key => $data) {
                $roleUserRows[] = ['role_id' => $roles[$data['role']], 'user_id' => $users[$key]];
            }
            DB::table('role_user')->insert($roleUserRows);

            $projectRows = [];
            foreach ($fixture['projects'] as $key => $data) {
                $projectRows[] = $attributes('projects.'.$key) + $data;
            }
            DB::table('projects')->insert($projectRows);
            $projects = $idsFor('projects', 'projects');

            $columns = ['todo' => Task::BOARD_TODO, 'development' => Task::BOARD_IN_PROGRESS, 'pending' => Task::BOARD_PENDENCY, 'done' => Task::BOARD_DONE];
            $taskRows = [];
            $position = 0;
            foreach ($fixture['tasks'] as $key => $data) {
                $taskRows[] = $attributes('tasks.'.$key) + [
                    'project_id' => $projects[$data['project']], 'created_by' => $owner->id,
                    'title' => $data['title'], 'description' => $data['description'],
                    'board_column' => $columns[$data['status']], 'position' => $position,
                    'due_date' => $now->addDays($data['due_days'])->toDateString(),
                    'source' => Task::SOURCE_MANUAL, 'source_metadata' => null,
                ];
                $position++;
            }
            DB::table('tasks')->insert($taskRows);
            $tasks = $idsFor('tasks', 'tasks');
            $taskUserRows = [];
            foreach ($fixture['tasks'] as $key => $data) {
                foreach ($data['assignees'] as $assignee) {
                    $taskUserRows[] = ['task_id' => $tasks[$key], 'user_id' => $users[$assignee], 'created_at' => $now, 'updated_at' => $now];
                }
            }
            DB::table('task_user')->insert($taskUserRows);

            $subtaskRows = [];
            foreach (array_values($fixture['checklist']['items']) as $position => $item) {
                $subtaskRows[] = [
                    'uuid' => (string) Str::uuid(), 'task_id' => $tasks[$fixture['checklist']['task']],
                    'title' => $item['title'], 'is_done' => $item['is_done'], 'position' => $position,
                    'assignee_id' => $users[$item['assignee']], 'created_at' => $now, 'updated_at' => $now,
                ];
            }
            DB::table('task_subtasks')->insert($subtaskRows);

            $commentRows = [];
            foreach ($fixture['comments'] as $key => $data) {
                $commentRows[] = [
                    'uuid' => $uuids['comments.'.$key], 'task_id' => $tasks[$data['task']],
                    'user_id' => $users[$data['user']], 'body' => $data['body'],
                    'created_at' => $now->subDays($data['days_ago']), 'updated_at' => $now->subDays($data['days_ago']),
                ];
            }
            DB::table('task_comments')->insert($commentRows);

            $timeEntryRows = [];
            foreach ($fixture['time_entries'] as $key => $data) {
                $date = $data['week'] === -1 ? $now->startOfWeek()->subWeek()->addDays(4) : $now->startOfWeek()->addDays(min(4, $now->dayOfWeekIso - 1));
                $timeEntryRows[] = $attributes('time_entries.'.$key) + [
                    'task_id' => $tasks[$data['task']], 'project_id' => $projects[$fixture['tasks'][$data['task']]['project']],
                    'user_id' => $users[$data['user']], 'source' => 'manual',
                    'started_at' => null, 'ended_at' => null,
                    'worked_date' => $date->toDateString(), 'duration_minutes' => $data['minutes'],
                ];
            }
            DB::table('time_entries')->insert($timeEntryRows);

            $invoiceRows = [];
            foreach ($fixture['invoices'] as $key => $data) {
                $total = array_sum(array_map(fn ($item) => $item['quantity'] * $item['unit_price'], $data['items']));
                $invoiceRows[] = $attributes('invoices.'.$key) + [
                    'invoice_number' => $data['invoice_number'], 'status' => $data['status'],
                    'issue_date' => $now->addDays($data['issue_days'])->toDateString(), 'due_date' => $now->addDays($data['due_days'])->toDateString(),
                    'currency' => 'USD', 'seller_name' => $fixture['tenant']['name'], 'seller_email' => $fixture['tenant']['email'],
                    'seller_vat_id' => null, 'seller_address' => null,
                    'buyer_name' => $data['buyer_name'], 'buyer_email' => $data['buyer_email'], 'notes' => $data['notes'],
                    'buyer_vat_id' => null, 'buyer_address' => null,
                    'subtotal_amount' => $total, 'tax_amount' => 0, 'total_amount' => $total,
                    'sent_at' => $data['status'] === 'draft' ? null : $now->addDays($data['issue_days']),
                    'created_by' => $owner->id, 'updated_by' => $owner->id,
                ];
            }
            DB::table('invoices')->insert($invoiceRows);
            $invoices = $idsFor('invoices', 'invoices');
            $invoiceItemRows = [];
            foreach ($fixture['invoices'] as $key => $data) {
                foreach (array_values($data['items']) as $position => $item) {
                    $invoiceItemRows[] = $item + [
                        'uuid' => (string) Str::uuid(), 'tenant_id' => $destination->id, 'invoice_id' => $invoices[$key],
                        'position' => $position, 'tax_percent' => 0, 'line_total' => $item['quantity'] * $item['unit_price'],
                        'created_at' => $now, 'updated_at' => $now,
                    ];
                }
            }
            DB::table('invoice_items')->insert($invoiceItemRows);

            $boardRows = [];
            foreach ($fixture['boards'] as $key => $data) {
                $boardRows[] = $attributes('boards.'.$key) + [
                    'name' => $data['name'], 'created_by' => $users[$data['author']], 'updated_by' => $users[$data['author']],
                    'excalidraw_data' => json_encode($this->scene($data['excalidraw_data'], $now), JSON_THROW_ON_ERROR),
                ];
            }
            DB::table('boards')->insert($boardRows);

            $notificationRows = [];
            foreach ($fixture['notifications'] as $key => $data) {
                $notificationRows[] = $attributes('notifications.'.$key) + [
                    'notifiable_id' => $users[$data['user']], 'actor_uuid' => $uuids['users.'.$data['actor']],
                    'type' => $data['type'], 'title' => $data['title'], 'body' => $data['body'],
                    'action_url' => '/tasks', 'action_text' => 'View tasks',
                    'read_at' => $data['read'] ? $now->subHour() : null,
                ];
            }
            DB::table('notifications')->insert($notificationRows);

            $preferenceRows = [];
            foreach ($users as $userId) {
                foreach (NotificationType::all() as $type) {
                    $preferenceRows[] = $fixture['preferences'] + ['tenant_id' => $destination->id, 'user_id' => $userId, 'type' => $type, 'created_at' => $now, 'updated_at' => $now];
                }
            }
            DB::table('notification_preferences')->insert($preferenceRows);

            $menuRows = [];
            foreach ($fixture['menu'] as $key => $data) {
                $menuRows[] = $attributes('menu.'.$key) + $data + ['parent_id' => null, 'url' => null, 'is_active' => true];
            }
            DB::table('menu_items')->insert($menuRows);
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
