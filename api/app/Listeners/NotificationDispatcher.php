<?php

namespace App\Listeners;

use App\Domain\Repositories\NotificationPreferenceRepository;
use App\Domain\Repositories\NotificationRepository;
use App\Events\InvoiceStatusChangedEvent;
use App\Events\ProjectUpdatedEvent;
use App\Events\TaskAssignedEvent;
use App\Events\TaskCommentAddedEvent;
use App\Events\TaskCompletedEvent;
use App\Events\TaskMentionEvent;
use App\Events\TaskStatusChangedEvent;
use App\Mail\NotificationMail;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Notifications\NotificationType;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Mail;

class NotificationDispatcher implements ShouldQueue
{
    use InteractsWithQueue;

    public function __construct(
        private readonly NotificationRepository $notificationRepository,
        private readonly NotificationPreferenceRepository $preferenceRepository,
    ) {}

    public function handle(
        TaskAssignedEvent|TaskCommentAddedEvent|TaskMentionEvent
        |TaskStatusChangedEvent|TaskCompletedEvent
        |InvoiceStatusChangedEvent|ProjectUpdatedEvent $event,
    ): void {
        if (Tenant::query()->whereKey($event->tenantId)->where('kind', 'demo')->exists()) {
            return;
        }

        $type = $this->resolveType($event);
        $recipient = $this->resolveRecipient($event);
        $actor = $this->resolveActor($event);

        // Don't notify user of their own actions
        if ($recipient !== null && $actor !== null && $recipient->id === $actor->id) {
            return;
        }

        if ($recipient === null) {
            return;
        }

        $prefs = $this->preferenceRepository->getPreference(
            $event->tenantId,
            $recipient->id,
            $type,
        );

        $databaseEnabled = $prefs?->database_enabled ?? true;
        $emailEnabled = $prefs?->email_enabled ?? true;

        $title = $this->buildTitle($event, $type);
        $body = $this->buildBody($event, $type);
        $actionUrl = $this->buildActionUrl($event);
        $actionText = $this->buildActionText($event);

        if ($databaseEnabled) {
            $this->notificationRepository->create([
                'tenant_id' => $event->tenantId,
                'notifiable_id' => $recipient->id,
                'type' => $type,
                'title' => $title,
                'body' => $body,
                'action_url' => $actionUrl,
                'action_text' => $actionText,
                'actor_uuid' => $actor?->uuid,
            ]);
        }

        if ($emailEnabled && $recipient->email) {
            Mail::to($recipient->email)->queue(
                new NotificationMail(
                    type: $type,
                    title: $title,
                    body: $body,
                    actionUrl: $actionUrl,
                    actionText: $actionText,
                ),
            );
        }
    }

    private function resolveType(object $event): string
    {
        return match ($event::class) {
            TaskAssignedEvent::class => NotificationType::TASK_ASSIGNED,
            TaskCommentAddedEvent::class => NotificationType::TASK_COMMENT_ADDED,
            TaskMentionEvent::class => NotificationType::TASK_MENTIONED,
            TaskStatusChangedEvent::class => NotificationType::TASK_STATUS_CHANGED,
            TaskCompletedEvent::class => NotificationType::TASK_COMPLETED,
            InvoiceStatusChangedEvent::class => NotificationType::INVOICE_STATUS_CHANGED,
            ProjectUpdatedEvent::class => NotificationType::PROJECT_UPDATED,
            default => 'unknown',
        };
    }

    private function resolveRecipient(object $event): ?User
    {
        return match ($event::class) {
            TaskAssignedEvent::class => $event->assignee,
            TaskCommentAddedEvent::class => $event->recipient,
            TaskMentionEvent::class => $event->mentionedUser,
            TaskStatusChangedEvent::class => $event->recipient,
            TaskCompletedEvent::class => $event->recipient,
            InvoiceStatusChangedEvent::class => $event->recipient,
            ProjectUpdatedEvent::class => $event->recipient,
            default => null,
        };
    }

    private function resolveActor(object $event): ?User
    {
        return $event->actor ?? null;
    }

    private function buildTitle(object $event, string $type): string
    {
        return match ($type) {
            NotificationType::TASK_ASSIGNED => sprintf(
                'You were assigned to "%s"',
                $event->task->title,
            ),
            NotificationType::TASK_COMMENT_ADDED => sprintf(
                'New comment on "%s"',
                $event->task->title,
            ),
            NotificationType::TASK_MENTIONED => sprintf(
                '%s mentioned you in "%s"',
                $event->actor->name,
                $event->task->title,
            ),
            NotificationType::TASK_STATUS_CHANGED => sprintf(
                '"%s" moved from %s to %s',
                $event->task->title,
                str_replace('_', ' ', $event->oldStatus),
                str_replace('_', ' ', $event->newStatus),
            ),
            NotificationType::TASK_COMPLETED => sprintf(
                '"%s" was completed',
                $event->task->title,
            ),
            NotificationType::INVOICE_STATUS_CHANGED => sprintf(
                'Invoice %s status changed to %s',
                $event->invoice->invoice_number,
                $event->newStatus,
            ),
            NotificationType::PROJECT_UPDATED => sprintf(
                '"%s" was updated',
                $event->project->name,
            ),
            default => 'Notification',
        };
    }

    private function buildBody(object $event, string $type): ?string
    {
        return match ($type) {
            NotificationType::TASK_COMMENT_ADDED => mb_substr($event->comment->body, 0, 200),
            NotificationType::TASK_MENTIONED => mb_substr($event->comment->body, 0, 200),
            default => null,
        };
    }

    private function buildActionUrl(object $event): ?string
    {
        return match ($event::class) {
            TaskAssignedEvent::class,
            TaskCommentAddedEvent::class,
            TaskMentionEvent::class,
            TaskStatusChangedEvent::class,
            TaskCompletedEvent::class => '/tasks',
            InvoiceStatusChangedEvent::class => '/invoices',
            ProjectUpdatedEvent::class => '/projects',
            default => null,
        };
    }

    private function buildActionText(object $event): ?string
    {
        return match ($event::class) {
            TaskAssignedEvent::class => 'View Task',
            TaskCommentAddedEvent::class => 'View Comment',
            TaskMentionEvent::class => 'View Comment',
            TaskStatusChangedEvent::class => 'View Task',
            TaskCompletedEvent::class => 'View Task',
            InvoiceStatusChangedEvent::class => 'View Invoice',
            ProjectUpdatedEvent::class => 'View Project',
            default => null,
        };
    }
}
