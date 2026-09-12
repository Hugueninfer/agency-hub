<?php

namespace App\Http\Controllers\V1;

use App\Domain\Services\TimeEntryService;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Time\IndexTimeEntriesRequest;
use App\Http\Requests\V1\Time\ListAssignableTasksRequest;
use App\Http\Requests\V1\Time\StartTimeSessionRequest;
use App\Http\Requests\V1\Time\StoreTimeEntryRequest;
use App\Http\Requests\V1\Time\TimeReportSummaryRequest;
use App\Http\Requests\V1\Time\UpdateTimeEntryRequest;
use App\Http\Resources\V1\Time\TimeActiveSessionResource;
use App\Http\Resources\V1\Time\TimeEntryResource;
use App\Http\Resources\V1\Time\TimeTaskOptionResource;
use App\Support\Messages\ToastMessage;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class TimeController extends Controller
{
    public function __construct(
        private readonly TimeEntryService $timeEntryService,
    ) {}

    public function listAssignableTasks(ListAssignableTasksRequest $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = (int) $request->user()?->id;
            $validated = $request->validated();
            $projectUuid = $validated['project_uuid'] ?? null;

            $tasks = $this->timeEntryService->listAssignableTasks(
                $tenantId,
                $userId,
                is_string($projectUuid) ? $projectUuid : null,
            );

            return $this->buildSuccessResponse(
                ToastMessage::get('time.tasks_listed'),
                TimeTaskOptionResource::collection($tasks),
            );
        } catch (ValidationException $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_BAD_REQUEST);
        }
    }

    public function activeSession(Request $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = (int) $request->user()?->id;
            $session = $this->timeEntryService->getActiveSession($tenantId, $userId);

            if ($session === null) {
                return $this->buildSuccessResponse(
                    ToastMessage::get('time.session_active_loaded'),
                    ['active' => false, 'session' => null],
                );
            }

            return $this->buildSuccessResponse(
                ToastMessage::get('time.session_active_loaded'),
                [
                    'active' => true,
                    'session' => (new TimeActiveSessionResource($session))->resolve(),
                ],
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_BAD_REQUEST);
        }
    }

    public function startSession(StartTimeSessionRequest $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = (int) $request->user()?->id;
            $session = $this->timeEntryService->startTimer(
                $tenantId,
                $userId,
                (string) $request->validated('task_uuid'),
            );
            $session->load([
                'task:id,uuid,title,project_id',
                'task.project:id,uuid,name',
            ]);

            return $this->buildSuccessResponse(
                ToastMessage::get('time.session_started'),
                (new TimeActiveSessionResource($session))->resolve(),
                Response::HTTP_CREATED,
            );
        } catch (ValidationException $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_BAD_REQUEST);
        }
    }

    public function stopSession(Request $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = (int) $request->user()?->id;
            $entry = $this->timeEntryService->stopTimer($tenantId, $userId);

            return $this->buildSuccessResponse(
                ToastMessage::get('time.session_stopped'),
                new TimeEntryResource($entry),
            );
        } catch (ValidationException $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_BAD_REQUEST);
        }
    }

    public function indexEntries(IndexTimeEntriesRequest $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $validated = $request->validated();
            $perPage = (int) ($validated['per_page'] ?? 25);
            $paginator = $this->timeEntryService->listEntries(
                $tenantId,
                $perPage,
                $request->userUuids(),
                $request->projectUuids(),
                $validated['date_from'] ?? null,
                $validated['date_to'] ?? null,
            );

            return $this->buildSuccessResponse(
                ToastMessage::get('time.entries_listed'),
                [
                    'items' => TimeEntryResource::collection($paginator->items())->resolve(),
                    'meta' => [
                        'current_page' => $paginator->currentPage(),
                        'last_page' => $paginator->lastPage(),
                        'per_page' => $paginator->perPage(),
                        'total' => $paginator->total(),
                    ],
                ],
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_BAD_REQUEST);
        }
    }

    public function storeEntry(StoreTimeEntryRequest $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = (int) $request->user()?->id;
            $entry = $this->timeEntryService->createManualEntry(
                $request->validatedPayload(),
                $tenantId,
                $userId,
            );

            return $this->buildSuccessResponse(
                ToastMessage::get('time.entry_created'),
                new TimeEntryResource($entry),
                Response::HTTP_CREATED,
            );
        } catch (ValidationException $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_BAD_REQUEST);
        }
    }

    public function updateEntry(UpdateTimeEntryRequest $request, string $entryUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = (int) $request->user()?->id;
            $entry = $this->timeEntryService->updateOwnEntry(
                $entryUuid,
                $request->validatedPayload(),
                $tenantId,
                $userId,
            );

            return $this->buildSuccessResponse(
                ToastMessage::get('time.entry_updated'),
                new TimeEntryResource($entry),
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_NOT_FOUND);
        } catch (ValidationException $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_BAD_REQUEST);
        }
    }

    public function destroyEntry(Request $request, string $entryUuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = (int) $request->user()?->id;
            $this->timeEntryService->deleteOwnEntry($entryUuid, $tenantId, $userId);

            return $this->buildSuccessResponse(
                ToastMessage::get('time.entry_deleted'),
                null,
                Response::HTTP_OK,
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_NOT_FOUND);
        } catch (ValidationException $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
                'errors' => $exception->errors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_BAD_REQUEST);
        }
    }

    public function reportSummary(TimeReportSummaryRequest $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $validated = $request->validated();
            $summary = $this->timeEntryService->reportSummary(
                $tenantId,
                $request->userUuids(),
                $request->projectUuids(),
                $validated['date_from'] ?? null,
                $validated['date_to'] ?? null,
            );

            return $this->buildSuccessResponse(
                ToastMessage::get('time.report_summary_loaded'),
                $summary,
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_BAD_REQUEST);
        }
    }

    public function exportReport(TimeReportSummaryRequest $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $validated = $request->validated();

            $filePath = $this->timeEntryService->exportXlsx(
                $tenantId,
                $request->userUuids(),
                $request->projectUuids(),
                $validated['date_from'] ?? null,
                $validated['date_to'] ?? null,
            );

            $dateFrom = $validated['date_from'] ?? 'all';
            $dateTo = $validated['date_to'] ?? 'all';
            $filename = "time-report_{$dateFrom}_{$dateTo}.xlsx";

            return response()->download($filePath, $filename)->deleteFileAfterSend(true);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_BAD_REQUEST);
        }
    }
}
