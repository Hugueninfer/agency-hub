<?php

namespace App\Domain\Repositories;

use App\Domain\Traits\Repository\DefaultFilterTrait;
use App\Domain\Traits\Repository\SecurityFilterTrait;
use App\Models\User;

class UserRepository extends BaseRepository
{
    use DefaultFilterTrait;
    use SecurityFilterTrait;

    public function __construct(User $model)
    {
        parent::__construct($model);
    }

    public function model(): string
    {
        return User::class;
    }

    /**
     * @param  list<string>  $uuids
     * @return list<int>
     */
    public function idsForUuidsInTenant(array $uuids, int $tenantId): array
    {
        return $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->whereIn('uuid', $uuids)
            ->pluck('id')
            ->all();
    }
}
