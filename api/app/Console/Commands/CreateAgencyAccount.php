<?php

namespace App\Console\Commands;

use App\Models\MenuItem;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Throwable;

class CreateAgencyAccount extends Command
{
    protected $signature = 'agency:account {action : Supported action: create} {email : New owner email}';

    protected $description = 'Create an empty personal workspace and owner using a hidden password prompt';

    public function handle(): int
    {
        $email = mb_strtolower(trim((string) $this->argument('email')));
        if ($this->argument('action') !== 'create' || strlen($email) > 255 || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Usage: agency:account create owner@example.com');

            return self::FAILURE;
        }

        if (! $this->input->isInteractive()) {
            $this->error('An interactive terminal with hidden input is required.');

            return self::FAILURE;
        }

        try {
            if (User::query()->where('email', $email)->exists()) {
                $this->error('This email already has an account. No changes made.');

                return self::FAILURE;
            }

            // false forbids Symfony's fallback to echoed input on unsupported terminals.
            $password = $this->secret('Password (minimum 15 characters)', false);
            if (! is_string($password) || mb_strlen($password) < 15 || strlen($password) > 72) {
                $this->error('Password must contain at least 15 characters and at most 72 bytes.');

                return self::FAILURE;
            }
            $confirmation = $this->secret('Confirm password', false);
            if (! is_string($confirmation) || ! hash_equals($password, $confirmation)) {
                $this->error('Passwords do not match. No changes made.');

                return self::FAILURE;
            }
            // Only the hash enters persistence or database exception bindings.
            $passwordHash = Hash::make($password);
            unset($password, $confirmation);

            DB::transaction(function () use ($email, $passwordHash): void {
                $tenant = Tenant::query()->create([
                    'name' => 'My Agency', 'email' => $email, 'status' => 'active',
                    'kind' => 'personal', 'expires_at' => null,
                ]);
                $owner = User::query()->create([
                    'tenant_id' => $tenant->id, 'name' => 'Owner',
                    'email' => $email, 'password' => $passwordHash,
                ]);
                $role = Role::query()->create([
                    'tenant_id' => $tenant->id, 'name' => 'owner',
                    'description' => 'Workspace owner with full access',
                ]);

                // Reuse only static permission/menu definitions; no demo records
                // or default-password seeders are loaded into the workspace.
                $catalog = require database_path('fixtures/demo.php');
                $permissionIds = [];
                foreach ($catalog['permissions'] as $code => $name) {
                    $permissionIds[] = Permission::query()->firstOrCreate(['code' => $code], ['name' => $name])->id;
                }
                $role->permissions()->sync($permissionIds);
                $owner->roles()->attach($role);
                foreach ($catalog['menu'] as $item) {
                    MenuItem::query()->create($item + ['tenant_id' => $tenant->id, 'is_active' => true]);
                }
            });
        } catch (Throwable) {
            // Never print/log exception bindings or password input. Transaction
            // rollback also covers a concurrent unique-email collision.
            $this->error('Account creation failed. Check database availability and migrations; no partial account was saved.');

            return self::FAILURE;
        } finally {
            unset($password, $confirmation, $passwordHash);
        }

        $this->info('Owner account and personal workspace created.');

        return self::SUCCESS;
    }
}
