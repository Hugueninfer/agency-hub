<?php

namespace App\Domain\Repositories;

use App\Domain\Traits\Repository\DefaultFilterTrait;
use App\Models\Permission;

class PermissionRepository extends BaseRepository
{
    use DefaultFilterTrait;

    public function __construct(Permission $model)
    {
        parent::__construct($model);
    }

    public function model(): string
    {
        return Permission::class;
    }
}
