<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\MenuItem;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Cria um tenant isolado + utilizador com papel owner (todas as permissões) para testes multi-tenant.
 *
 * Executar: php artisan db:seed --class=MultiTenantTestSeeder
 */
class MultiTenantTestSeeder extends Seeder
{
    public function run(): void
    {
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

        $tenantEmail = 'multitenant-test@workflow.local';
        $tenant = Tenant::query()->firstOrCreate(
            ['email' => $tenantEmail],
            [
                'uuid'   => (string) Str::uuid(),
                'name'   => 'Multi-Tenant Test Org',
                'status' => 'active',
            ],
        );

        $ownerRole = Role::query()->updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'name'      => 'owner',
            ],
            [
                'uuid'        => (string) Str::uuid(),
                'description' => 'Full access (multi-tenant test)',
            ],
        );

        $ownerRole->permissions()->sync(Permission::query()->pluck('id')->all());

        $userEmail = 'multitenant.admin@test.local';
        $plainPassword = 'password';

        $user = User::query()->updateOrCreate(
            ['email' => $userEmail],
            [
                'uuid'      => (string) Str::uuid(),
                'tenant_id' => $tenant->id,
                'name'      => 'Multi-Tenant Admin',
                'password'  => $plainPassword,
            ],
        );

        if (empty($user->uuid)) {
            $user->uuid = (string) Str::uuid();
            $user->save();
        }

        $user->roles()->sync([$ownerRole->id]);

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

        $this->command?->newLine();
        $this->command?->info('Multi-tenant test data ready:');
        $this->command?->table(
            ['Field', 'Value'],
            [
                ['Tenant name', $tenant->name],
                ['Tenant email', $tenant->email],
                ['Tenant uuid', $tenant->uuid],
                ['User email', $userEmail],
                ['Password', $plainPassword],
                ['Role', 'owner (all permissions)'],
            ],
        );
    }
}
