<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\MenuItem;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $tenant = Tenant::query()->firstOrCreate(
            ['email' => 'tenant@Formulax.local'],
            [
                'uuid'   => (string) \Illuminate\Support\Str::uuid(),
                'name'   => 'FormulaX Tenant',
                'status' => 'active',
            ],
        );

        $user = User::query()->updateOrCreate([
            'email' => 'test@example.com',
        ], [
            'uuid'      => (string) Str::uuid(),
            'tenant_id' => $tenant->id,
            'name'      => 'Test User',
            'password'  => 'password',
        ]);

        if (empty($user->uuid)) {
            $user->uuid = (string) Str::uuid();
            $user->save();
        }

        $permissions = [
            ['code' => 'rbac.permission.read', 'name' => 'List permissions'],
            ['code' => 'rbac.role.read', 'name' => 'List roles'],
            ['code' => 'rbac.user.read', 'name' => 'List users'],
            ['code' => 'rbac.user.create', 'name' => 'Create users'],
            ['code' => 'rbac.user.update', 'name' => 'Update users'],
            ['code' => 'rbac.user.delete', 'name' => 'Delete users'],
            ['code' => 'rbac.role.create', 'name' => 'Create role'],
            ['code' => 'rbac.role.assign_permission', 'name' => 'Assign permissions to role'],
            ['code' => 'rbac.user.assign_role', 'name' => 'Assign role to user'],
            ['code' => 'project.read', 'name' => 'Read projects'],
            ['code' => 'project.create', 'name' => 'Create projects'],
            ['code' => 'project.update', 'name' => 'Update projects'],
            ['code' => 'project.delete', 'name' => 'Delete projects'],
            ['code' => 'task.read', 'name' => 'Read tasks'],
            ['code' => 'task.create', 'name' => 'Create tasks'],
            ['code' => 'task.update', 'name' => 'Update tasks'],
            ['code' => 'task.delete', 'name' => 'Delete tasks'],
            ['code' => 'board.read', 'name' => 'Read boards'],
            ['code' => 'board.create', 'name' => 'Create boards'],
            ['code' => 'board.delete', 'name' => 'Delete boards'],
            ['code' => 'invoice.read', 'name' => 'Read invoices'],
            ['code' => 'invoice.create', 'name' => 'Create invoices'],
            ['code' => 'invoice.update', 'name' => 'Update invoices'],
            ['code' => 'invoice.send', 'name' => 'Send invoices'],
            ['code' => 'time.read', 'name' => 'Read time entries and reports'],
            ['code' => 'time.create', 'name' => 'Start timer and create time entries'],
            ['code' => 'time.update_own', 'name' => 'Update own time entries'],
            ['code' => 'time.delete_own', 'name' => 'Delete own time entries'],
            ['code' => 'notification.view', 'name' => 'View notifications'],
            ['code' => 'notification.mark_read', 'name' => 'Mark notifications as read'],
            ['code' => 'notification.manage_preferences', 'name' => 'Manage notification preferences'],
            ['code' => 'workspace.settings.read', 'name' => 'View company settings'],
            ['code' => 'workspace.settings.update', 'name' => 'Update company settings'],
        ];

        foreach ($permissions as $permission) {
            Permission::query()->updateOrCreate(
                ['code' => $permission['code']],
                [
                    'name'        => $permission['name'],
                    'description' => null,
                ],
            );
        }

        $ownerRole = Role::query()->updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name'      => 'owner',
            ],
            [
                'uuid'        => (string) Str::uuid(),
                'description' => 'Tenant owner role',
            ],
        );

        $memberRole = Role::query()->updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name'      => 'member',
            ],
            [
                'uuid'        => (string) Str::uuid(),
                'description' => 'Limited workspace access (no RBAC)',
            ],
        );

        $ownerRole->permissions()->sync(Permission::query()->pluck('id')->all());

        $memberPermissionCodes = [
            'project.read',
            'project.create',
            'task.read',
            'task.create',
            'task.update',
            'board.read',
            'board.create',
            'invoice.read',
            'invoice.create',
            'time.read',
            'time.create',
            'time.update_own',
            'time.delete_own',
            'notification.view',
            'notification.mark_read',
            'notification.manage_preferences',
            'workspace.settings.read',
        ];
        $memberPermissionIds = Permission::query()
            ->whereIn('code', $memberPermissionCodes)
            ->pluck('id')
            ->all();
        $memberRole->permissions()->sync($memberPermissionIds);

        $user->roles()->syncWithoutDetaching([$ownerRole->id]);

        $memberUser = User::query()->updateOrCreate(
            ['email' => 'member@example.com'],
            [
                'uuid'      => (string) Str::uuid(),
                'tenant_id' => $tenant->id,
                'name'      => 'Member User',
                'password'  => 'password',
            ],
        );

        if (empty($memberUser->uuid)) {
            $memberUser->uuid = (string) Str::uuid();
            $memberUser->save();
        }

        $memberUser->roles()->sync([$memberRole->id]);

        // Default menu items
        $menuItems = [
            ['section' => 'main', 'label' => 'Dashboard', 'icon' => 'dashboard', 'route' => '/', 'order' => 0],
            ['section' => 'main', 'label' => 'Projects', 'icon' => 'projects', 'route' => '/projects', 'permission' => 'project.read', 'order' => 1],
            ['section' => 'main', 'label' => 'Hours', 'icon' => 'clock', 'route' => '/hours', 'permission' => 'time.read', 'order' => 2],
            ['section' => 'main', 'label' => 'Invoices', 'icon' => 'invoice', 'route' => '/invoices', 'permission' => 'invoice.read', 'order' => 3],
            ['section' => 'main', 'label' => 'Tasks', 'icon' => 'tasks', 'route' => '/tasks', 'permission' => 'task.read', 'order' => 4],
            ['section' => 'main', 'label' => 'Boards', 'icon' => 'board', 'route' => '/boards', 'permission' => 'board.read', 'order' => 5],
            ['section' => 'main', 'label' => 'Notifications', 'icon' => 'bell', 'route' => '/notifications', 'permission' => 'notification.view', 'order' => 6],
            ['section' => 'settings', 'label' => 'Users', 'icon' => 'users', 'route' => '/settings/users', 'permission' => 'rbac.user.create', 'order' => 0],
            ['section' => 'settings', 'label' => 'Roles & Permissions', 'icon' => 'shield', 'route' => '/rbac', 'permission' => 'rbac.role.read', 'order' => 1],
            ['section' => 'settings', 'label' => 'Company', 'icon' => 'building', 'route' => '/settings/company', 'permission' => 'workspace.settings.read', 'order' => 2],
            ['section' => 'settings', 'label' => 'Menu', 'icon' => 'gear', 'route' => '/settings/menu', 'permission' => 'workspace.settings.read', 'order' => 3],
        ];

        foreach ($menuItems as $item) {
            MenuItem::query()->firstOrCreate(
                ['tenant_id' => $tenant->id, 'label' => $item['label'], 'section' => $item['section']],
                [
                    'uuid' => (string) Str::uuid(),
                    'icon' => $item['icon'],
                    'route' => $item['route'] ?? null,
                    'permission' => $item['permission'] ?? null,
                    'order' => $item['order'],
                    'is_active' => true,
                ],
            );
        }
    }
}
