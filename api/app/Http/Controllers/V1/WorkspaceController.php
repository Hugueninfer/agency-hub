<?php

namespace App\Http\Controllers\V1;

use App\Domain\Services\RbacService;
use App\Domain\Services\TenantService;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Workspace\UpdateCompanySettingsRequest;
use App\Http\Resources\V1\Rbac\UserSelectResource;
use App\Http\Resources\V1\Workspace\CompanySettingsResource;
use App\Support\Messages\ToastMessage;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class WorkspaceController extends Controller
{
    public function __construct(
        private readonly RbacService $rbacService,
        private readonly TenantService $tenantService,
    ) {}

    /**
     * Lista utilizadores do tenant (para atribuição em tarefas, etc.).
     */
    public function listUsers(Request $request)
    {
        $tenantId = (int) $request->attributes->get('tenant_id');
        $users = $this->rbacService->listUsers($tenantId);

        return $this->buildSuccessResponse(
            ToastMessage::get('workspace.users_listed'),
            UserSelectResource::collection($users),
        );
    }

    /**
     * Retorna as configurações da empresa (cores, logo, link externo).
     */
    public function getSettings(Request $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $settings = $this->tenantService->getSettings($tenantId);

            return $this->buildSuccessResponse(
                ToastMessage::get('workspace.settings_loaded'),
                new CompanySettingsResource($settings),
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    /**
     * Atualiza as configurações da empresa (logo, cores, link externo).
     */
    public function updateSettings(UpdateCompanySettingsRequest $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $settings = $this->tenantService->updateSettings($tenantId, $request->validated());

            return $this->buildSuccessResponse(
                ToastMessage::get('workspace.settings_updated'),
                new CompanySettingsResource($settings),
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }
}
