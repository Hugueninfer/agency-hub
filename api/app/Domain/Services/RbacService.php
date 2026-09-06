<?php

namespace App\Domain\Services;

use App\Domain\Repositories\PermissionRepository;
use App\Domain\Repositories\RoleRepository;
use App\Domain\Repositories\UserRepository;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Models\Role;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class RbacService
{
    public function __construct(
        private readonly RoleRepository $roleRepository,
        private readonly PermissionRepository $permissionRepository,
        private readonly UserRepository $userRepository,
    ) {}

    public function listPermissions(): mixed
    {
        return $this->permissionRepository->all();
    }

    public function listRoles(int $tenantId): mixed
    {
        return $this->roleRepository
            ->scopeByTenantId($tenantId)
            ->with(['permissions'])
            ->all();
    }

    public function listUsers(int $tenantId): mixed
    {
        return $this->userRepository
            ->scopeByTenantId($tenantId)
            ->with(['roles:id,uuid,name'])
            ->all();
    }

    public function createRole(array $attributes, int $tenantId): Role
    {
        /** @var Role $role */
        $role = $this->roleRepository->create([
            'tenant_id'    => $tenantId,
            'name'         => $attributes['name'],
            'description'  => $attributes['description'] ?? null,
        ]);

        return $role;
    }

    public function assignPermissionsToRole(string $roleUuid, array $permissionCodes, int $tenantId): Role
    {
        /** @var Role|null $role */
        $role = $this->roleRepository
            ->scopeByTenantId($tenantId)
            ->findByField('uuid', $roleUuid)
            ->first();

        if (!$role) {
            throw new NotFoundHttpException('Role not found.');
        }

        $permissionIds = $this->permissionRepository
            ->scopeQuery(fn ($query) => $query->whereIn('code', $permissionCodes))
            ->all(['id'])
            ->pluck('id')
            ->all();

        app(DemoWriteBudgetService::class)->sync($role->permissions(), $permissionIds);
        $role->load('permissions');

        return $role;
    }

    public function assignRoleToUser(string $roleUuid, string $userUuid, int $tenantId): void
    {
        /** @var Role|null $role */
        $role = $this->roleRepository
            ->scopeByTenantId($tenantId)
            ->findByField('uuid', $roleUuid)
            ->first();

        if (!$role) {
            throw new NotFoundHttpException('Role not found.');
        }

        $user = $this->userRepository
            ->scopeByTenantId($tenantId)
            ->findByField('uuid', $userUuid)
            ->first();

        if (!$user) {
            throw new NotFoundHttpException('User not found.');
        }

        app(DemoWriteBudgetService::class)->sync($user->roles(), [$role->id], false);
    }

    public function createUser(array $attributes, int $tenantId, ?UploadedFile $photo = null): User
    {
        /** @var Role|null $role */
        $role = $this->roleRepository
            ->scopeByTenantId($tenantId)
            ->findByField('uuid', $attributes['role_uuid'])
            ->first();

        if (!$role) {
            throw new NotFoundHttpException('Role not found.');
        }

        return DB::transaction(function () use ($attributes, $tenantId, $photo, $role) {
            $photoPath = $photo ? $photo->store('user-photos', 'public') : null;

            /** @var User $user */
            $user = $this->userRepository->create([
                'uuid' => (string) Str::uuid(),
                'tenant_id' => $tenantId,
                'name' => $attributes['name'],
                'email' => $attributes['email'],
                'password' => $attributes['password'],
                'photo_path' => $photoPath,
            ]);

            app(DemoWriteBudgetService::class)->sync($user->roles(), [$role->id], false);

            return $user;
        });
    }

    public function updateUser(
        string $userUuid,
        array $attributes,
        int $tenantId,
        ?UploadedFile $photo = null,
        bool $removePhoto = false,
    ): User
    {
        $user = $this->userRepository
            ->scopeByTenantId($tenantId)
            ->findByField('uuid', $userUuid)
            ->first();

        if (!$user) {
            throw new NotFoundHttpException('User not found.');
        }

        /** @var Role|null $role */
        $role = $this->roleRepository
            ->scopeByTenantId($tenantId)
            ->findByField('uuid', $attributes['role_uuid'])
            ->first();

        if (!$role) {
            throw new NotFoundHttpException('Role not found.');
        }

        return DB::transaction(function () use ($user, $attributes, $role, $photo, $removePhoto) {
            $payload = [
                'name' => $attributes['name'],
                'email' => $attributes['email'],
            ];
            if (!empty($attributes['password'])) {
                $payload['password'] = $attributes['password'];
            }
            if ($removePhoto && !empty($user->photo_path)) {
                Storage::disk('public')->delete($user->photo_path);
                $payload['photo_path'] = null;
            }
            if ($photo) {
                if (!empty($user->photo_path)) {
                    Storage::disk('public')->delete($user->photo_path);
                }
                $payload['photo_path'] = $photo->store('user-photos', 'public');
            }

            $this->userRepository->update($payload, $user->id);
            app(DemoWriteBudgetService::class)->sync($user->roles(), [$role->id]);
            $user->load('roles:id,uuid,name');

            return $user->refresh();
        });
    }

    public function deleteUser(string $userUuid, int $tenantId): void
    {
        $user = $this->userRepository
            ->scopeByTenantId($tenantId)
            ->findByField('uuid', $userUuid)
            ->first();

        if (!$user) {
            throw new NotFoundHttpException('User not found.');
        }

        DB::transaction(function () use ($user) {
            if (!empty($user->photo_path)) {
                Storage::disk('public')->delete($user->photo_path);
            }
            $user->roles()->detach();
            $this->userRepository->delete($user->id);
        });
    }
}
