<?php

namespace App\Domain\Repositories;

use App\Domain\Traits\Repository\DefaultFilterTrait;
use App\Domain\Traits\Repository\SecurityFilterTrait;
use App\Models\TaskComment;
use Illuminate\Database\Eloquent\Collection;

class TaskCommentRepository extends BaseRepository
{
    use DefaultFilterTrait;
    use SecurityFilterTrait;

    public function __construct(TaskComment $model)
    {
        parent::__construct($model);
    }

    public function model(): string
    {
        return TaskComment::class;
    }

    /**
     * @return Collection<int, TaskComment>
     */
    public function listForTask(int $tenantId, int $taskId): Collection
    {
        /** @var Collection<int, TaskComment> */
        return $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->where('task_id', $taskId)
            ->with('user:id,uuid,name,email')
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createForTask(array $attributes): TaskComment
    {
        /** @var TaskComment */
        return $this->model->newQuery()->create($attributes)->load('user:id,uuid,name,email');
    }
}
