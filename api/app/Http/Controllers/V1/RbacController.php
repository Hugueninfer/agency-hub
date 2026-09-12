<?php

namespace App\Http\Controllers\V1;

use App\Domain\Services\RbacService;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Rbac\AssignRolePermissionsRequest;
use App\Http\Requests\V1\Rbac\AssignUserRoleRequest;
use App\Http\Requests\V1\Rbac\CreateRoleRequest;
use App\Http\Requests\V1\Rbac\CreateUserRequest;
use App\Http\Requests\V1\Rbac\UpdateUserRequest;
use App\Http\Resources\V1\Rbac\PermissionResource;
use App\Http\Resources\V1\Rbac\RoleResource;
use App\Http\Resources\V1\Rbac\UserSelectResource;
use App\Support\Messages\ToastMessage;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class RbacController extends Controller
{
    public function __construct(
        private readonly RbacService $rbacService,
    ) {}

    public function listPermissions()
    {
        $permissions = $this->rbacService->listPermissions();

        return $this->buildSuccessResponse(
            ToastMessage::get('rbac.permission.listed'),
            PermissionResource::collection($permissions),
        );
    }

    public function listRoles(Request $request)
    {
        $tenantId = (int) $request->attributes->get('tenant_id');
        $roles = $this->rbacService->listRoles($tenantId);

        return $this->buildSuccessResponse(
            ToastMessage::get('rbac.role.listed'),
            RoleResource::collection($roles),
        );
    }

    public function listUsers(Request $request)
    {
        $tenantId = (int) $request->attributes->get('tenant_id');
        $users = $this->rbacService->listUsers($tenantId);

        return $this->buildSuccessResponse(
            ToastMessage::get('rbac.user.listed'),
            UserSelectResource::collection($users),
        );
    }

    public function createRole(CreateRoleRequest $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');

            $role = $this->rbacService->createRole($request->validated(), $tenantId);

            return $this->buildSuccessResponse(
                ToastMessage::get('rbac.role.created'),
                new RoleResource($role),
                Response::HTTP_CREATED,
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function assignPermissionsToRole(string $roleUuid, AssignRolePermissionsRequest $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');

            $role = $this->rbacService->assignPermissionsToRole(
                $roleUuid,
                $request->validated('permission_codes'),
                $tenantId,
            );

            return $this->buildSuccessResponse(
                ToastMessage::get('rbac.role.permission_assigned'),
                new RoleResource($role),
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function assignRoleToUser(AssignUserRoleRequest $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');

            $this->rbacService->assignRoleToUser(
                $request->validated('role_uuid'),
                $request->validated('user_uuid'),
                $tenantId,
            );

            return $this->buildSuccessResponse(ToastMessage::get('rbac.user.role_assigned'));
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function createUser(CreateUserRequest $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');

            $user = $this->rbacService->createUser(
                $request->validated(),
                $tenantId,
                $request->file('photo'),
            );

            return $this->buildSuccessResponse(
                ToastMessage::get('rbac.user.created'),
                new UserSelectResource($user),
                Response::HTTP_CREATED,
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function updateUser(string $userUuid, UpdateUserRequest $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $user = $this->rbacService->updateUser(
                $userUuid,
                $request->validated(),
                $tenantId,
                $request->file('photo'),
                (bool) $request->validated('remove_photo', false),
            );

            return $this->buildSuccessResponse(
                ToastMessage::get('rbac.user.updated'),
                new UserSelectResource($user),
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function deleteUser(string $userUuid, Request $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $this->rbacService->deleteUser($userUuid, $tenantId);

            return $this->buildSuccessResponse(ToastMessage::get('rbac.user.deleted'));
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }
}
