<?php

namespace App\Domain\Repositories;

use App\Domain\Traits\Repository\DefaultFilterTrait;
use App\Domain\Traits\Repository\SecurityFilterTrait;
use App\Models\Task;
use Illuminate\Database\Eloquent\Collection;

class TaskRepository extends BaseRepository
{
    use DefaultFilterTrait;
    use SecurityFilterTrait;

    public function __construct(Task $model)
    {
        parent::__construct($model);
    }

    public function model(): string
    {
        return Task::class;
    }

    /**
     * @return Collection<int, Task>
     */
    public function listForProjectBoard(int $tenantId, int $projectId): Collection
    {
        // Board cards only need counts for comments/attachments; the full threads are
        // loaded on demand by the task detail (show) endpoint. Counting here avoids
        // hydrating every comment/attachment row (and their users) for the whole board.
        /** @var Collection<int, Task> */
        return $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->where('project_id', $projectId)
            ->with([
                'project:id,uuid,name',
                'assignees:id,uuid,name,email,photo_path',
                'subtasks.assignee:id,uuid,name,photo_path',
            ])
            ->withCount(['comments', 'attachments'])
            ->orderBy('board_column')
            ->orderBy('position')
            ->get();
    }

    /**
     * @return Collection<int, Task>
     */
    public function listOrderedForProject(int $tenantId, int $projectId): Collection
    {
        /** @var Collection<int, Task> */
        return $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->where('project_id', $projectId)
            ->orderBy('board_column')
            ->orderBy('position')
            ->get();
    }

    public function nextPositionInColumn(int $tenantId, int $projectId, string $boardColumn): int
    {
        $max = $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->where('project_id', $projectId)
            ->where('board_column', $boardColumn)
            ->max('position');

        return $max === null ? 0 : ((int) $max) + 1;
    }

    public function findByUuidForTenant(string $uuid, int $tenantId): ?Task
    {
        /** @var Task|null */
        return $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->where('uuid', $uuid)
            ->first();
    }

    /**
     * Tarefas em que o utilizador é assignee (workspace Kanban).
     *
     * @return Collection<int, Task>
     */
    public function listAssignableForUser(int $tenantId, int $userId, ?int $projectId = null): Collection
    {
        /** @var Collection<int, Task> */
        return $this->model->newQuery()
            ->where('tasks.tenant_id', $tenantId)
            ->whereHas('assignees', function ($query) use ($userId): void {
                $query->where('users.id', $userId);
            })
            ->when($projectId !== null, fn ($q) => $q->where('tasks.project_id', $projectId))
            ->with(['project:id,uuid,name'])
            ->orderBy('title')
            ->get();
    }
}