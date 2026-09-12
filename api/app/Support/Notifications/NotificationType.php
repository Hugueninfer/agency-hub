<?php

namespace App\Support\Notifications;

class NotificationType
{
    const TASK_ASSIGNED = 'task_assigned';

    const TASK_COMMENT_ADDED = 'task_comment_added';

    const TASK_MENTIONED = 'task_mentioned';

    const TASK_STATUS_CHANGED = 'task_status_changed';

    const TASK_COMPLETED = 'task_completed';

    const PROJECT_UPDATED = 'project_updated';

    const INVOICE_STATUS_CHANGED = 'invoice_status_changed';

    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return [
            self::TASK_ASSIGNED,
            self::TASK_COMMENT_ADDED,
            self::TASK_MENTIONED,
            self::TASK_STATUS_CHANGED,
            self::TASK_COMPLETED,
            self::PROJECT_UPDATED,
            self::INVOICE_STATUS_CHANGED,
        ];
    }

    public static function label(string $type): string
    {
        return match ($type) {
            self::TASK_ASSIGNED => 'Task Assigned',
            self::TASK_COMMENT_ADDED => 'New Comment',
            self::TASK_MENTIONED => 'Mentioned in Comment',
            self::TASK_STATUS_CHANGED => 'Task Status Changed',
            self::TASK_COMPLETED => 'Task Completed',
            self::PROJECT_UPDATED => 'Project Updated',
            self::INVOICE_STATUS_CHANGED => 'Invoice Status Changed',
            default => ucfirst(str_replace('_', ' ', $type)),
        };
    }
}
