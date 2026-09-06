<?php

namespace App\Http\Controllers\V1;

use App\Domain\Services\NotificationService;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Notification\UpdateNotificationPreferencesRequest;
use App\Http\Resources\V1\Notification\NotificationPreferenceResource;
use App\Http\Resources\V1\Notification\NotificationResource;
use App\Support\Messages\ToastMessage;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class NotificationController extends Controller
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {}

    public function index(Request $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = (int) $request->user()?->id;

            $perPage = (int) ($request->query('per_page', 20));
            $filter = $request->query('filter'); // null, 'unread'

            $notifications = $this->notificationService->listNotifications($tenantId, $userId, $perPage, $filter);

            return $this->buildSuccessResponse(
                ToastMessage::get('notification.listed'),
                NotificationResource::collection($notifications)->response()->getData(true),
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function unreadCount(Request $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = (int) $request->user()?->id;

            $count = $this->notificationService->getUnreadCount($tenantId, $userId);

            return $this->buildSuccessResponse(
                ToastMessage::get('notification.unread_count'),
                ['count' => $count],
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function markAsRead(Request $request, string $uuid)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = (int) $request->user()?->id;

            $notification = $this->notificationService->markAsRead($uuid, $tenantId, $userId);

            if ($notification === null) {
                return $this->buildErrorResponse('Notification not found.', Response::HTTP_NOT_FOUND);
            }

            return $this->buildSuccessResponse(
                ToastMessage::get('notification.marked_read'),
                new NotificationResource($notification),
            );
        } catch (NotFoundHttpException $exception) {
            return $this->buildErrorResponse($exception->getMessage(), Response::HTTP_NOT_FOUND);
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function markAllAsRead(Request $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = (int) $request->user()?->id;

            $count = $this->notificationService->markAllAsRead($tenantId, $userId);

            return $this->buildSuccessResponse(
                ToastMessage::get('notification.all_read'),
                ['marked_read_count' => $count],
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function getPreferences(Request $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = (int) $request->user()?->id;

            $preferences = $this->notificationService->getPreferences($tenantId, $userId);

            return $this->buildSuccessResponse(
                ToastMessage::get('notification.preferences_loaded'),
                NotificationPreferenceResource::collection($preferences),
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function updatePreferences(UpdateNotificationPreferencesRequest $request)
    {
        try {
            $tenantId = (int) $request->attributes->get('tenant_id');
            $userId = (int) $request->user()?->id;

            $this->notificationService->updatePreferences($tenantId, $userId, $request->validated()['preferences']);

            return $this->buildSuccessResponse(
                ToastMessage::get('notification.preferences_updated'),
            );
        } catch (Throwable $exception) {
            return $this->buildErrorResponse($exception, Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }
}
