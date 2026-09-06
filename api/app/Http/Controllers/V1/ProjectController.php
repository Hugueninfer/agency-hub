<?php

namespace App\Http\Controllers\V1;

use App\Domain\Services\ProjectService;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Project\StoreProjectRequest;
use App\Http\Requests\V1\Project\UpdateProjectRequest;
use App\Http\Resources\V1\Project\ProjectResource;
use App\Support\Messages\ToastMessage;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class ProjectController extends Controller
{
    public function __construct(
        private readonly ProjectService $projectService,
    ) {}

    public function index(Request $request)
    {
        $tenantId = (int) $request->attributes->get('tenant_id');
        $projects = $this->projectService->listProjects($tenantId);

        return $this->buildSuccessResponse(
            ToastMessage::get('project.listed'),
            ProjectResource::collection($projects),
        );
    }

    public function store(StoreProjectRequest $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $project = $this->projectService->createProject($request->validated(), $tenantId);

            return $this->buildSuccessResponse(
                ToastMessage::get('project.created'),
                new ProjectResource($project),
                Response::HTTP_CREATED,
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function show(Request $request, string $uuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $project = $this->projectService->getProjectByUuid($uuid, $tenantId);

            return $this->buildSuccessResponse(
                ToastMessage::get('project.loaded'),
                new ProjectResource($project),
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        }
    }

    public function update(UpdateProjectRequest $request, string $uuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = $request->user()?->id;
            $project = $this->projectService->updateProject($uuid, $request->validated(), $tenantId, $userId);

            return $this->buildSuccessResponse(
                ToastMessage::get('project.updated'),
                new ProjectResource($project),
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function destroy(Request $request, string $uuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $this->projectService->deleteProject($uuid, $tenantId);

            return $this->buildSuccessResponse(ToastMessage::get('project.deleted'));
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }
}
