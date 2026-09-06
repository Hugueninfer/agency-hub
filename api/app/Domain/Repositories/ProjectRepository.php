<?php

namespace App\Domain\Repositories;

use App\Domain\Traits\Repository\DefaultFilterTrait;
use App\Domain\Traits\Repository\SecurityFilterTrait;
use App\Models\Project;

class ProjectRepository extends BaseRepository
{
    use DefaultFilterTrait;
    use SecurityFilterTrait;

    public function __construct(Project $model)
    {
        parent::__construct($model);
    }

    public function model(): string
    {
        return Project::class;
    }
}
