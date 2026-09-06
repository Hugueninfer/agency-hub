<?php

namespace App\Domain\Repositories;

use App\Models\TimeSession;

class TimeSessionRepository extends BaseRepository
{
    public function __construct(TimeSession $model)
    {
        parent::__construct($model);
    }

    public function model(): string
    {
        return TimeSession::class;
    }

    public function findActiveForUser(int $tenantId, int $userId): ?TimeSession
    {
        /** @var TimeSession|null */
        return $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->with([
                'task:id,uuid,title,project_id',
                'task.project:id,uuid,name',
            ])
            ->first();
    }
}
