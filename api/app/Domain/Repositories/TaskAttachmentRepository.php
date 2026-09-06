<?php

namespace App\Domain\Repositories;

use App\Domain\Traits\Repository\DefaultFilterTrait;
use App\Domain\Traits\Repository\SecurityFilterTrait;
use App\Models\TaskAttachment;
use Illuminate\Support\LazyCollection;

class TaskAttachmentRepository extends BaseRepository
{
    use DefaultFilterTrait;
    use SecurityFilterTrait;

    public function __construct(TaskAttachment $model)
    {
        parent::__construct($model);
    }

    public function model(): string
    {
        return TaskAttachment::class;
    }

    /**
     * @return LazyCollection<int, TaskAttachment>
     */
    public function cursorForTask(int $taskId): LazyCollection
    {
        return $this->model->newQuery()->where('task_id', $taskId)->cursor();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createWithAttributes(array $attributes): TaskAttachment
    {
        /** @var TaskAttachment */
        return $this->model->newQuery()->create($attributes)->load('uploader:id,uuid,name,email');
    }

    public function findByTaskAndUuid(int $taskId, string $attachmentUuid): ?TaskAttachment
    {
        /** @var TaskAttachment|null */
        return $this->model->newQuery()
            ->where('task_id', $taskId)
            ->where('uuid', $attachmentUuid)
            ->first();
    }
}
