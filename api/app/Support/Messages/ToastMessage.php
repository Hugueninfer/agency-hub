<?php

namespace App\Support\Messages;

class ToastMessage
{
    private const MAP = [
        'common' => [
            'error' => [
                'generic' => 'Something went wrong. Please try again.',
            ],
        ],
        'auth' => [
            'forbidden' => [
                'generic' => 'You do not have permission to perform this action.',
            ],
            'unauthorized' => [
                'generic' => 'User is not authenticated.',
            ],
            'login' => [
                'success' => 'Login successful.',
                'invalid' => 'Invalid email or password.',
            ],
            'me' => [
                'success' => 'Authenticated user loaded successfully.',
            ],
            'logout' => [
                'success' => 'Logout successful.',
            ],
        ],
        'project' => [
            'listed' => 'Projects loaded successfully.',
            'loaded' => 'Project loaded successfully.',
            'created' => 'Project created successfully.',
            'updated' => 'Project updated successfully.',
            'deleted' => 'Project deleted successfully.',
        ],
        'workspace' => [
            'users_listed' => 'Users loaded successfully.',
            'settings_loaded' => 'Company settings loaded successfully.',
            'settings_updated' => 'Company settings updated successfully.',
        ],
        'task' => [
            'listed' => 'Tasks loaded successfully.',
            'loaded' => 'Task loaded successfully.',
            'created' => 'Task created successfully.',
            'updated' => 'Task updated successfully.',
            'deleted' => 'Task deleted successfully.',
            'moved' => 'Task moved successfully.',
            'comment' => 'Comment added successfully.',
            'attachment_uploaded' => 'Image uploaded successfully.',
            'attachment_deleted' => 'Attachment removed successfully.',
        ],
        'board' => [
            'listed' => 'Boards loaded successfully.',
            'loaded' => 'Board loaded successfully.',
            'created' => 'Board created successfully.',
            'updated' => 'Board saved successfully.',
            'deleted' => 'Board deleted successfully.',
        ],
        'invoice' => [
            'listed' => 'Invoices loaded successfully.',
            'loaded' => 'Invoice loaded successfully.',
            'created' => 'Invoice created successfully.',
            'updated' => 'Invoice updated successfully.',
            'status_updated' => 'Invoice status updated successfully.',
            'sent' => 'Invoice sent successfully.',
        ],
        'time' => [
            'tasks_listed' => 'Tasks loaded successfully.',
            'entries_listed' => 'Time entries loaded successfully.',
            'entry_created' => 'Time entry created successfully.',
            'entry_updated' => 'Time entry updated successfully.',
            'entry_deleted' => 'Time entry deleted successfully.',
            'session_active_loaded' => 'Timer state loaded successfully.',
            'session_started' => 'Timer started successfully.',
            'session_stopped' => 'Timer stopped and time entry saved.',
            'report_summary_loaded' => 'Time summary loaded successfully.',
        ],
        'rbac' => [
            'permission' => [
                'listed' => 'Permissions loaded successfully.',
            ],
            'role' => [
                'listed' => 'Roles loaded successfully.',
                'created' => 'Role created successfully.',
                'permission_assigned' => 'Permissions assigned to role successfully.',
            ],
            'user' => [
                'listed' => 'Users loaded successfully.',
                'role_assigned' => 'Role assigned to user successfully.',
                'created' => 'User created successfully.',
                'updated' => 'User updated successfully.',
                'deleted' => 'User deleted successfully.',
            ],
        ],
        'notification' => [
            'listed' => 'Notifications loaded successfully.',
            'unread_count' => 'Unread count loaded.',
            'marked_read' => 'Notification marked as read.',
            'all_read' => 'All notifications marked as read.',
            'preferences_loaded' => 'Notification preferences loaded.',
            'preferences_updated' => 'Notification preferences updated.',
        ],
        'menu' => [
            'listed' => 'Menu loaded successfully.',
            'updated' => 'Menu updated successfully.',
        ],
    ];

    public static function get(string $path): string
    {
        $segments = explode('.', $path);
        $value = self::MAP;

        foreach ($segments as $segment) {
            if (! is_array($value) || ! array_key_exists($segment, $value)) {
                return $path;
            }

            $value = $value[$segment];
        }

        return is_string($value) ? $value : $path;
    }
}
