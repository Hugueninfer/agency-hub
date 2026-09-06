<?php

namespace App\Http\Controllers\V1;

use App\Domain\Services\TaskService;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Task\MoveTaskRequest;
use App\Http\Requests\V1\Task\StoreSubtaskRequest;
use App\Http\Requests\V1\Task\StoreTaskCommentRequest;
use App\Http\Requests\V1\Task\StoreTaskRequest;
use App\Http\Requests\V1\Task\UpdateSubtaskRequest;
use App\Http\Requests\V1\Task\UpdateTaskRequest;
use App\Http\Resources\V1\Task\TaskAttachmentResource;
use App\Http\Resources\V1\Task\TaskCommentResource;
use App\Http\Resources\V1\Task\TaskResource;
use App\Http\Resources\V1\Task\TaskSubtaskResource;
use App\Support\Messages\ToastMessage;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class TaskController extends Controller
{
    public function __construct(
        private readonly TaskService $taskService,
    ) {}

    public function indexByProject(Request $request, string $projectUuid)
    {
        $tenantId = (int) $request->attributes->get('tenant_id');
        $tasks = $this->taskService->listTasksForProject($projectUuid, $tenantId);

        return $this->buildSuccessResponse(
            ToastMessage::get('task.listed'),
            TaskResource::collection($tasks),
        );
    }

    public function store(StoreTaskRequest $request, string $projectUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = $request->user()?->id;

            $task = $this->taskService->createTask(
                $request->validated(),
                $projectUuid,
                $tenantId,
                $userId,
            );

            return $this->buildSuccessResponse(
                ToastMessage::get('task.created'),
                new TaskResource($task),
                Response::HTTP_CREATED,
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function show(Request $request, string $taskUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $task = $this->taskService->getTaskByUuid($taskUuid, $tenantId);

            return $this->buildSuccessResponse(
                ToastMessage::get('task.loaded'),
                new TaskResource($task),
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        }
    }

    public function update(UpdateTaskRequest $request, string $taskUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $task = $this->taskService->updateTask($taskUuid, $request->validated(), $tenantId);

            return $this->buildSuccessResponse(
                ToastMessage::get('task.updated'),
                new TaskResource($task),
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function destroy(Request $request, string $taskUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $this->taskService->deleteTask($taskUuid, $tenantId);

            return $this->buildSuccessResponse(ToastMessage::get('task.deleted'));
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        }
    }

    public function move(MoveTaskRequest $request, string $taskUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $data = $request->validated();

            $task = $this->taskService->moveTask(
                $taskUuid,
                $data['board_column'],
                (int) $data['position'],
                $tenantId,
            );

            return $this->buildSuccessResponse(
                ToastMessage::get('task.moved'),
                new TaskResource($task),
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function storeSubtask(StoreSubtaskRequest $request, string $taskUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $sub = $this->taskService->createSubtask($taskUuid, $request->validated(), $tenantId);

            return $this->buildSuccessResponse(
                ToastMessage::get('task.updated'),
                new TaskSubtaskResource($sub),
                Response::HTTP_CREATED,
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        }
    }

    public function updateSubtask(UpdateSubtaskRequest $request, string $taskUuid, string $subtaskUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $sub = $this->taskService->updateSubtask($taskUuid, $subtaskUuid, $request->validated(), $tenantId);

            return $this->buildSuccessResponse(
                ToastMessage::get('task.updated'),
                new TaskSubtaskResource($sub),
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        }
    }

    public function destroySubtask(Request $request, string $taskUuid, string $subtaskUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $this->taskService->deleteSubtask($taskUuid, $subtaskUuid, $tenantId);

            return $this->buildSuccessResponse(ToastMessage::get('task.updated'));
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        }
    }

    public function indexComments(Request $request, string $taskUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $comments = $this->taskService->listComments($taskUuid, $tenantId);

            return $this->buildSuccessResponse(
                ToastMessage::get('task.loaded'),
                TaskCommentResource::collection($comments),
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        }
    }

    public function storeComment(StoreTaskCommentRequest $request, string $taskUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = (int) $request->user()->id;

            $comment = $this->taskService->addComment($taskUuid, $request->validated(), $tenantId, $userId);

            return $this->buildSuccessResponse(
                ToastMessage::get('task.comment'),
                new TaskCommentResource($comment),
                Response::HTTP_CREATED,
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        }
    }

    public function storeAttachment(Request $request, string $taskUuid)
    {
        // Restrict to raster images only. SVG is excluded on purpose: it can carry
        // <script>, which would be a stored-XSS vector if served inline from /storage.
        $request->validate([
            'file' => ['required', 'file', 'image', 'mimes:png,jpg,jpeg,webp,gif', 'max:5120'],
        ]);

        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = (int) $request->user()->id;

            $attachment = $this->taskService->storeAttachment(
                $taskUuid,
                $request->file('file'),
                $tenantId,
                $userId,
            );

            return $this->buildSuccessResponse(
                ToastMessage::get('task.attachment_uploaded'),
                new TaskAttachmentResource($attachment),
                Response::HTTP_CREATED,
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        }
    }

    public function destroyAttachment(Request $request, string $taskUuid, string $attachmentUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $this->taskService->deleteAttachment($taskUuid, $attachmentUuid, $tenantId);

            return $this->buildSuccessResponse(ToastMessage::get('task.attachment_deleted'));
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        }
    }
}
