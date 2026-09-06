<?php

use App\Http\Controllers\V1\AuthController;
use App\Http\Controllers\V1\BoardController;
use App\Http\Controllers\V1\ConfigController;
use App\Http\Controllers\V1\DemoAuthController;
use App\Http\Controllers\V1\FathomWebhookController;
use App\Http\Controllers\V1\InvoiceController;
use App\Http\Controllers\V1\MenuController;
use App\Http\Controllers\V1\NotificationController;
use App\Http\Controllers\V1\ProjectController;
use App\Http\Controllers\V1\RbacController;
use App\Http\Controllers\V1\TaskController;
use App\Http\Controllers\V1\TimeController;
use App\Http\Controllers\V1\WorkspaceController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'ok' => true,
        'service' => 'subforge-api',
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::prefix('v1')->group(function () {
    Route::get('/config', [ConfigController::class, 'show']);
    Route::post('/auth/demo', [DemoAuthController::class, 'create'])->middleware('throttle:demo-create');
    // Public webhook — no Sanctum, authenticated by token in URL + HMAC signature
    Route::post('/webhooks/fathom/{token}', [FathomWebhookController::class, 'handle'])
        ->middleware('throttle:30,1');

    Route::post('/auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:login');

    Route::middleware(['workspace.auth', 'tenant'])->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::get('/projects', [ProjectController::class, 'index'])
            ->middleware('permission:project.read');
        Route::get('/workspace/users', [WorkspaceController::class, 'listUsers'])
            ->middleware('permission:task.update');
        Route::get('/workspace/settings', [WorkspaceController::class, 'getSettings'])
            ->middleware('permission:workspace.settings.read');
        Route::patch('/workspace/settings', [WorkspaceController::class, 'updateSettings'])
            ->middleware('permission:workspace.settings.update');
        Route::get('/workspace/menu', [MenuController::class, 'index']);
        Route::put('/workspace/menu', [MenuController::class, 'update'])
            ->middleware('permission:workspace.settings.update');
        Route::post('/projects', [ProjectController::class, 'store'])
            ->middleware('permission:project.create');
        Route::get('/projects/{uuid}', [ProjectController::class, 'show'])
            ->middleware('permission:project.read');
        Route::patch('/projects/{uuid}', [ProjectController::class, 'update'])
            ->middleware('permission:project.update');
        Route::delete('/projects/{uuid}', [ProjectController::class, 'destroy'])
            ->middleware('permission:project.delete');

        Route::get('/projects/{projectUuid}/tasks', [TaskController::class, 'indexByProject'])
            ->middleware('permission:task.read');
        Route::post('/projects/{projectUuid}/tasks', [TaskController::class, 'store'])
            ->middleware('permission:task.create');
        Route::get('/tasks/{taskUuid}', [TaskController::class, 'show'])
            ->middleware('permission:task.read');
        Route::patch('/tasks/{taskUuid}', [TaskController::class, 'update'])
            ->middleware('permission:task.update');
        Route::delete('/tasks/{taskUuid}', [TaskController::class, 'destroy'])
            ->middleware('permission:task.delete');
        Route::post('/tasks/{taskUuid}/move', [TaskController::class, 'move'])
            ->middleware('permission:task.update');
        Route::post('/tasks/{taskUuid}/subtasks', [TaskController::class, 'storeSubtask'])
            ->middleware('permission:task.update');
        Route::patch('/tasks/{taskUuid}/subtasks/{subtaskUuid}', [TaskController::class, 'updateSubtask'])
            ->middleware('permission:task.update');
        Route::delete('/tasks/{taskUuid}/subtasks/{subtaskUuid}', [TaskController::class, 'destroySubtask'])
            ->middleware('permission:task.update');
        Route::get('/tasks/{taskUuid}/comments', [TaskController::class, 'indexComments'])
            ->middleware('permission:task.read');
        Route::post('/tasks/{taskUuid}/comments', [TaskController::class, 'storeComment'])
            ->middleware('permission:task.update');
        Route::post('/tasks/{taskUuid}/attachments', [TaskController::class, 'storeAttachment'])
            ->middleware('permission:task.update');
        Route::delete('/tasks/{taskUuid}/attachments/{attachmentUuid}', [TaskController::class, 'destroyAttachment'])
            ->middleware('permission:task.update');

        Route::get('/boards', [BoardController::class, 'index'])
            ->middleware('permission:board.read');
        Route::post('/boards', [BoardController::class, 'store'])
            ->middleware('permission:board.create');
        Route::get('/boards/{boardUuid}', [BoardController::class, 'show'])
            ->middleware('permission:board.read');
        Route::patch('/boards/{boardUuid}', [BoardController::class, 'update'])
            ->middleware('permission:board.create');
        Route::delete('/boards/{boardUuid}', [BoardController::class, 'destroy'])
            ->middleware('permission:board.delete');

        Route::get('/invoices', [InvoiceController::class, 'index'])
            ->middleware('permission:invoice.read');
        Route::post('/invoices', [InvoiceController::class, 'store'])
            ->middleware('permission:invoice.create');
        Route::get('/invoices/{invoiceUuid}', [InvoiceController::class, 'show'])
            ->middleware('permission:invoice.read');
        Route::patch('/invoices/{invoiceUuid}', [InvoiceController::class, 'update'])
            ->middleware('permission:invoice.update');
        Route::patch('/invoices/{invoiceUuid}/status', [InvoiceController::class, 'updateStatus'])
            ->middleware('permission:invoice.update');
        Route::post('/invoices/{invoiceUuid}/send', [InvoiceController::class, 'send'])
            ->middleware('permission:invoice.send');

        Route::prefix('time')->group(function () {
            Route::get('/tasks', [TimeController::class, 'listAssignableTasks'])
                ->middleware('permission:time.read');
            Route::get('/sessions/active', [TimeController::class, 'activeSession'])
                ->middleware('permission:time.read');
            Route::post('/sessions/start', [TimeController::class, 'startSession'])
                ->middleware('permission:time.create');
            Route::post('/sessions/stop', [TimeController::class, 'stopSession'])
                ->middleware('permission:time.create');
            Route::get('/entries', [TimeController::class, 'indexEntries'])
                ->middleware('permission:time.read');
            Route::post('/entries', [TimeController::class, 'storeEntry'])
                ->middleware('permission:time.create');
            Route::get('/reports/summary', [TimeController::class, 'reportSummary'])
                ->middleware('permission:time.read');
            Route::get('/reports/export', [TimeController::class, 'exportReport'])
                ->middleware('permission:time.read');
            Route::patch('/entries/{entryUuid}', [TimeController::class, 'updateEntry'])
                ->middleware('permission:time.update_own');
            Route::delete('/entries/{entryUuid}', [TimeController::class, 'destroyEntry'])
                ->middleware('permission:time.delete_own');
        });

        Route::prefix('rbac')->group(function () {
            Route::get('/permissions', [RbacController::class, 'listPermissions'])
                ->middleware('permission:rbac.permission.read');
            Route::get('/roles', [RbacController::class, 'listRoles'])
                ->middleware('permission:rbac.role.read');
            Route::get('/users', [RbacController::class, 'listUsers'])
                ->middleware('permission:rbac.user.read');
            Route::post('/users', [RbacController::class, 'createUser'])
                ->middleware('permission:rbac.user.create');
            Route::patch('/users/{userUuid}', [RbacController::class, 'updateUser'])
                ->middleware('permission:rbac.user.update');
            Route::delete('/users/{userUuid}', [RbacController::class, 'deleteUser'])
                ->middleware('permission:rbac.user.delete');
            Route::post('/roles', [RbacController::class, 'createRole'])
                ->middleware('permission:rbac.role.create');
            Route::post('/roles/{roleUuid}/permissions', [RbacController::class, 'assignPermissionsToRole'])
                ->middleware('permission:rbac.role.assign_permission');
            Route::post('/user-role', [RbacController::class, 'assignRoleToUser'])
                ->middleware('permission:rbac.user.assign_role');
        });

        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationController::class, 'index'])
                ->middleware('permission:notification.view');
            Route::get('/unread-count', [NotificationController::class, 'unreadCount'])
                ->middleware('permission:notification.view');
            Route::patch('/{uuid}/read', [NotificationController::class, 'markAsRead'])
                ->middleware('permission:notification.mark_read');
            Route::patch('/read-all', [NotificationController::class, 'markAllAsRead'])
                ->middleware('permission:notification.mark_read');
            Route::get('/preferences', [NotificationController::class, 'getPreferences'])
                ->middleware('permission:notification.manage_preferences');
            Route::put('/preferences', [NotificationController::class, 'updatePreferences'])
                ->middleware('permission:notification.manage_preferences');
        });
    });
});
