<?php

namespace App\Domain\Services;

use App\Domain\Repositories\ProjectRepository;
use App\Domain\Repositories\TaskAttachmentRepository;
use App\Domain\Repositories\TaskCommentRepository;
use App\Domain\Repositories\TaskRepository;
use App\Domain\Repositories\TaskSubtaskRepository;
use App\Domain\Repositories\UserRepository;
use App\Events\TaskAssignedEvent;
use App\Events\TaskCommentAddedEvent;
use App\Events\TaskCompletedEvent;
use App\Events\TaskMentionEvent;
use App\Events\TaskStatusChangedEvent;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\TaskComment;
use App\Models\TaskSubtask;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class TaskService
{
    public function __construct(
        private readonly TaskRepository $taskRepository,
        private readonly ProjectRepository $projectRepository,
        private readonly TaskSubtaskRepository $taskSubtaskRepository,
        private readonly TaskCommentRepository $taskCommentRepository,
        private readonly TaskAttachmentRepository $taskAttachmentRepository,
        private readonly UserRepository $userRepository,
    ) {}

    /**
     * @return Collection<int, Task>
     */
    public function listTasksForProject(string $projectUuid, int $tenantId): Collection
    {
        $project = $this->getProjectByUuid($projectUuid, $tenantId);

        return $this->taskRepository->listForProjectBoard($tenantId, $project->id);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createTask(array $data, string $projectUuid, int $tenantId, ?int $creatorId): Task
    {
        $project = $this->getProjectByUuid($projectUuid, $tenantId);

        $column = $data['board_column'] ?? Task::BOARD_TODO;
        $this->assertValidBoardColumn($column);

        $position = $this->taskRepository->nextPositionInColumn($tenantId, $project->id, $column);

        /** @var Task $task */
        $task = $this->taskRepository->create([
            'tenant_id' => $tenantId,
            'project_id' => $project->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'board_column' => $column,
            'position' => $position,
            'due_date' => $data['due_date'] ?? null,
            'created_by' => $creatorId,
            'source' => $data['source'] ?? Task::SOURCE_MANUAL,
            'source_metadata' => $data['source_metadata'] ?? null,
        ]);

        if (! empty($data['assignee_uuids']) && is_array($data['assignee_uuids'])) {
            $this->syncAssignees($task, $data['assignee_uuids'], $tenantId);
        }

        // Dispatch assignment notifications
        if (! empty($data['assignee_uuids']) && is_array($data['assignee_uuids'])) {
            $task->load('assignees');
            $this->dispatchTaskAssignedEvents($task, $creatorId, $tenantId);
        }

        return $task->fresh([
            'project:id,uuid,name',
            'assignees:id,uuid,name,email,photo_path',
            'subtasks.assignee:id,uuid,name,photo_path',
            'comments.user:id,uuid,name,email',
            'attachments.uploader:id,uuid,name,email',
        ]);
    }

    public function getTaskByUuid(string $taskUuid, int $tenantId): Task
    {
        /** @var Task|null $task */
        $task = $this->taskRepository
            ->scopeByTenantId($tenantId)
            ->findByField('uuid', $taskUuid)
            ->first();

        if ($task === null) {
            throw new NotFoundHttpException('Task not found.');
        }

        return $task->load([
            'assignees:id,uuid,name,email,photo_path',
            'subtasks.assignee:id,uuid,name,photo_path',
            'comments.user:id,uuid,name,email',
            'attachments.uploader:id,uuid,name,email',
            'creator:id,uuid,name,email',
            'project:id,uuid,name',
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateTask(string $taskUuid, array $data, int $tenantId, ?int $actorId = null): Task
    {
        $task = $this->getTaskByUuid($taskUuid, $tenantId);

        $oldBoardColumn = $task->board_column;

        $projectUuid = null;
        if (array_key_exists('project_uuid', $data)) {
            $projectUuid = $data['project_uuid'];
            unset($data['project_uuid']);
        }

        if (is_string($projectUuid) && $projectUuid !== '') {
            $this->moveTaskToProject($task, $projectUuid, $tenantId);
            $task->refresh();
        }

        $payload = [];
        if (array_key_exists('title', $data)) {
            $payload['title'] = $data['title'];
        }
        if (array_key_exists('description', $data)) {
            $payload['description'] = $data['description'];
        }
        if (array_key_exists('board_column', $data)) {
            $this->assertValidBoardColumn($data['board_column']);
            $payload['board_column'] = $data['board_column'];
        }
        if (array_key_exists('due_date', $data)) {
            $payload['due_date'] = $data['due_date'];
        }
        if (array_key_exists('position', $data) && is_int($data['position'])) {
            $payload['position'] = $data['position'];
        }

        if ($payload !== []) {
            $task->update($payload);
        }

        if (array_key_exists('assignee_uuids', $data) && is_array($data['assignee_uuids'])) {
            $this->syncAssignees($task, $data['assignee_uuids'], $tenantId);
        }

        // Dispatch status change notifications
        if (array_key_exists('board_column', $data) && $oldBoardColumn !== $data['board_column']) {
            $task->load('assignees', 'creator');
            $this->dispatchTaskStatusEvents(
                $task,
                $oldBoardColumn,
                $data['board_column'],
                $actorId,
                $tenantId,
            );
        }

        return $this->getTaskByUuid($task->uuid, $tenantId);
    }

    /**
     * Move task to another project; repacks positions on the old board and appends the card on the new board (same column).
     */
    private function moveTaskToProject(Task $task, string $projectUuid, int $tenantId): void
    {
        $newProject = $this->getProjectByUuid($projectUuid, $tenantId);
        if ($newProject->id === $task->project_id) {
            return;
        }

        DB::transaction(function () use ($task, $newProject, $tenantId): void {
            $oldProjectId = $task->project_id;
            $column = $task->board_column;

            $this->reindexProjectTasksExcluding($tenantId, $oldProjectId, $task->id);

            $newPosition = $this->taskRepository->nextPositionInColumn($tenantId, $newProject->id, $column);

            $task->project_id = $newProject->id;
            $task->position = $newPosition;
            $task->save();
        });
    }

    /**
     * After removing a task from a project board, renumber positions per column so indices stay contiguous.
     *
     * @param  positive-int  $excludeTaskId
     */
    private function reindexProjectTasksExcluding(int $tenantId, int $projectId, int $excludeTaskId): void
    {
        $tasks = $this->taskRepository->listOrderedForProject($tenantId, $projectId)
            ->filter(fn (Task $t) => $t->id !== $excludeTaskId);

        $byColumn = [];
        foreach (Task::boardColumns() as $col) {
            $byColumn[$col] = $tasks->where('board_column', $col)->values()->all();
        }

        $this->persistBoardPositions($byColumn);
    }

    /**
     * Persist board column/position for each task, writing only the rows that actually
     * changed. Avoids a full UPDATE per card on every drag/reindex.
     *
     * @param  array<string, list<Task>>  $byColumn
     */
    private function persistBoardPositions(array $byColumn): void
    {
        foreach (Task::boardColumns() as $col) {
            foreach ($byColumn[$col] as $i => $t) {
                if ($t->board_column === $col && (int) $t->position === $i) {
                    continue; // unchanged — skip the write
                }
                $t->board_column = $col;
                $t->position = $i;
                $t->save();
            }
        }
    }

    public function deleteTask(string $taskUuid, int $tenantId): void
    {
        $task = $this->getTaskByUuid($taskUuid, $tenantId);

        foreach ($this->taskAttachmentRepository->cursorForTask($task->id) as $attachment) {
            Storage::disk('public')->delete($attachment->path);
        }

        $task->delete();
    }

    public function moveTask(string $taskUuid, string $boardColumn, int $position, int $tenantId): Task
    {
        $this->assertValidBoardColumn($boardColumn);

        return DB::transaction(function () use ($taskUuid, $boardColumn, $position, $tenantId): Task {
            $moving = $this->getTaskByUuid($taskUuid, $tenantId);
            $projectId = $moving->project_id;

            $tasks = $this->taskRepository->listOrderedForProject($tenantId, $projectId);

            $byColumn = [];
            foreach (Task::boardColumns() as $col) {
                $byColumn[$col] = $tasks
                    ->where('board_column', $col)
                    ->filter(fn (Task $t) => $t->uuid !== $moving->uuid)
                    ->values()
                    ->all();
            }

            $insert = max(0, min($position, count($byColumn[$boardColumn])));
            array_splice($byColumn[$boardColumn], $insert, 0, [$moving]);

            $this->persistBoardPositions($byColumn);

            return $this->getTaskByUuid($taskUuid, $tenantId);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createSubtask(string $taskUuid, array $data, int $tenantId): TaskSubtask
    {
        $task = $this->getTaskByUuid($taskUuid, $tenantId);
        $next = $this->taskSubtaskRepository->nextPositionForTask($task->id);

        $assigneeId = $this->resolveAssigneeId($data['assignee_uuid'] ?? null, $tenantId);

        $subtask = $this->taskSubtaskRepository->createForTask([
            'task_id' => $task->id,
            'title' => $data['title'],
            'is_done' => (bool) ($data['is_done'] ?? false),
            'position' => $next,
            'assignee_id' => $assigneeId,
        ]);

        return $subtask->load('assignee');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateSubtask(string $taskUuid, string $subtaskUuid, array $data, int $tenantId): TaskSubtask
    {
        $task = $this->getTaskByUuid($taskUuid, $tenantId);

        $sub = $this->taskSubtaskRepository->findByTaskAndUuid($task->id, $subtaskUuid);

        if ($sub === null) {
            throw new NotFoundHttpException('Subtask not found.');
        }

        if (array_key_exists('title', $data)) {
            $sub->title = $data['title'];
        }
        if (array_key_exists('is_done', $data)) {
            $sub->is_done = (bool) $data['is_done'];
        }
        if (array_key_exists('assignee_uuid', $data)) {
            $sub->assignee_id = $this->resolveAssigneeId($data['assignee_uuid'], $tenantId);
        }
        $sub->save();

        return $sub->fresh()->load('assignee');
    }

    public function deleteSubtask(string $taskUuid, string $subtaskUuid, int $tenantId): void
    {
        $task = $this->getTaskByUuid($taskUuid, $tenantId);

        $this->taskSubtaskRepository->deleteByTaskAndUuid($task->id, $subtaskUuid);
    }

    /**
     * @return Collection<int, TaskComment>
     */
    public function listComments(string $taskUuid, int $tenantId): Collection
    {
        $task = $this->getTaskByUuid($taskUuid, $tenantId);

        return $this->taskCommentRepository->listForTask($tenantId, $task->id);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function addComment(string $taskUuid, array $data, int $tenantId, int $userId): TaskComment
    {
        $task = $this->getTaskByUuid($taskUuid, $tenantId);

        $comment = $this->taskCommentRepository->createForTask([
            'task_id' => $task->id,
            'user_id' => $userId,
            'body' => $data['body'],
        ]);

        $comment->load('user');
        $task->load('assignees', 'creator');
        $this->dispatchTaskCommentEvents($task, $comment, $userId, $tenantId);

        return $comment;
    }

    public function storeAttachment(string $taskUuid, UploadedFile $file, int $tenantId, int $userId): TaskAttachment
    {
        $task = $this->getTaskByUuid($taskUuid, $tenantId);

        $path = $file->store('task-attachments', 'public');

        // Derive the MIME from the file contents server-side; getClientMimeType() is
        // attacker-controlled and must not be trusted.
        $mime = $file->getMimeType() ?: 'application/octet-stream';

        $payload = [
            'tenant_id' => $tenantId,
            'task_id' => $task->id,
            'uploaded_by' => $userId,
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime' => $mime,
            'size_bytes' => $file->getSize() ?: 0,
        ];

        return $this->taskAttachmentRepository->createWithAttributes($payload);
    }

    public function deleteAttachment(string $taskUuid, string $attachmentUuid, int $tenantId): void
    {
        $task = $this->getTaskByUuid($taskUuid, $tenantId);

        $attachment = $this->taskAttachmentRepository->findByTaskAndUuid($task->id, $attachmentUuid);

        if ($attachment === null) {
            throw new NotFoundHttpException('Attachment not found.');
        }

        Storage::disk('public')->delete($attachment->path);
        $attachment->delete();
    }

    private function getProjectByUuid(string $uuid, int $tenantId): Project
    {
        /** @var Project|null $project */
        $project = $this->projectRepository
            ->scopeByTenantId($tenantId)
            ->findByField('uuid', $uuid)
            ->first();

        if ($project === null) {
            throw new NotFoundHttpException('Project not found.');
        }

        return $project;
    }

    private function resolveAssigneeId(?string $assigneeUuid, int $tenantId): ?int
    {
        if ($assigneeUuid === null || $assigneeUuid === '') {
            return null;
        }

        $ids = $this->userRepository->idsForUuidsInTenant([$assigneeUuid], $tenantId);

        return $ids[0] ?? null;
    }

    private function assertValidBoardColumn(string $column): void
    {
        if (! in_array($column, Task::boardColumns(), true)) {
            throw ValidationException::withMessages([
                'board_column' => ['Invalid board column.'],
            ]);
        }
    }

    /**
     * @param  list<string>  $assigneeUuids
     */
    private function syncAssignees(Task $task, array $assigneeUuids, int $tenantId): void
    {
        if ($assigneeUuids === []) {
            $task->assignees()->sync([]);

            return;
        }

        $userIds = $this->userRepository->idsForUuidsInTenant($assigneeUuids, $tenantId);

        if (count($userIds) !== count(array_unique($assigneeUuids))) {
            throw ValidationException::withMessages([
                'assignee_uuids' => ['One or more assignees are invalid for this tenant.'],
            ]);
        }

        $task->assignees()->sync($userIds);
    }

    /**
     * Dispatch TaskAssignedEvent for each assignee.
     */
    private function dispatchTaskAssignedEvents(Task $task, ?int $creatorId, int $tenantId): void
    {
        $actor = $creatorId !== null ? User::find($creatorId) : null;
        if ($actor === null) {
            return;
        }

        foreach ($task->assignees as $assignee) {
            Event::dispatch(new TaskAssignedEvent($task, $assignee, $actor, $tenantId));
        }
    }

    /**
     * Dispatch TaskStatusChangedEvent and TaskCompletedEvent for assignees and creator.
     */
    private function dispatchTaskStatusEvents(
        Task $task,
        string $oldColumn,
        string $newColumn,
        ?int $actorId,
        int $tenantId,
    ): void {
        $actor = $actorId !== null ? User::find($actorId) : null;
        if ($actor === null) {
            return;
        }

        /** @var array<int, User> $recipients */
        $recipients = $task->assignees->keyBy('id')->all();
        if ($task->creator !== null) {
            $recipients[$task->creator->id] = $task->creator;
        }

        foreach ($recipients as $recipient) {
            Event::dispatch(
                new TaskStatusChangedEvent($task, $oldColumn, $newColumn, $recipient, $actor, $tenantId),
            );

            if ($newColumn === Task::BOARD_DONE) {
                Event::dispatch(
                    new TaskCompletedEvent($task, $recipient, $actor, $tenantId),
                );
            }
        }
    }

    /**
     * Dispatch TaskCommentAddedEvent for assignees and creator.
     * Dispatch TaskMentionEvent for each @mentioned user.
     */
    private function dispatchTaskCommentEvents(
        Task $task,
        TaskComment $comment,
        int $userId,
        int $tenantId,
    ): void {
        $actor = User::find($userId);
        if ($actor === null) {
            return;
        }

        // Build recipient list (assignees + creator, excluding the comment author)
        /** @var array<int, User> $recipients */
        $recipients = $task->assignees->keyBy('id')->all();
        if ($task->creator !== null) {
            $recipients[$task->creator->id] = $task->creator;
        }
        unset($recipients[$userId]);

        foreach ($recipients as $recipient) {
            Event::dispatch(
                new TaskCommentAddedEvent($task, $comment, $recipient, $actor, $tenantId),
            );
        }

        // Parse @mentions and dispatch mention events
        $mentionedUsers = $this->parseMentions($comment->body, $tenantId);
        foreach ($mentionedUsers as $mentionedUser) {
            if ($mentionedUser->id === $userId) {
                continue; // Don't notify user of self-mention
            }
            Event::dispatch(
                new TaskMentionEvent($task, $comment, $mentionedUser, $actor, $tenantId),
            );
        }
    }

    /**
     * Parse @mentions in text and find matching users in the tenant.
     *
     * @return array<int, User>
     */
    private function parseMentions(string $text, int $tenantId): array
    {
        preg_match_all('/@(\w+(?:\s+\w+)?)/u', $text, $matches);
        $names = array_unique($matches[1]);

        if ($names === []) {
            return [];
        }

        /** @var Collection<int, User> $users */
        $users = User::where('tenant_id', $tenantId)
            ->whereIn('name', $names)
            ->get();

        return $users->keyBy('id')->all();
    }
}
