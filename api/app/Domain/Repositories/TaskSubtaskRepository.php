<?php

namespace App\Domain\Repositories;

use App\Domain\Traits\Repository\DefaultFilterTrait;
use App\Domain\Traits\Repository\SecurityFilterTrait;
use App\Models\TaskSubtask;

class TaskSubtaskRepository extends BaseRepository
{
    use DefaultFilterTrait;
    use SecurityFilterTrait;

    public function __construct(TaskSubtask $model)
    {
        parent::__construct($model);
    }

    public function model(): string
    {
        return TaskSubtask::class;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createForTask(array $attributes): TaskSubtask
    {
        /** @var TaskSubtask */
        return $this->model->newQuery()->create($attributes);
    }

    public function findByTaskAndUuid(int $taskId, string $subtaskUuid): ?TaskSubtask
    {
        /** @var TaskSubtask|null */
        return $this->model->newQuery()
            ->where('task_id', $taskId)
            ->where('uuid', $subtaskUuid)
            ->first();
    }

    public function deleteByTaskAndUuid(int $taskId, string $subtaskUuid): void
    {
        $this->model->newQuery()
            ->where('task_id', $taskId)
            ->where('uuid', $subtaskUuid)
            ->delete();
    }

    public function nextPositionForTask(int $taskId): int
    {
        $max = $this->model->newQuery()->where('task_id', $taskId)->max('position');

        return $max === null ? 0 : ((int) $max) + 1;
    }
}
