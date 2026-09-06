<?php

namespace App\Domain\Repositories;

use App\Domain\Traits\Repository\DefaultFilterTrait;
use App\Domain\Traits\Repository\SecurityFilterTrait;
use App\Models\Board;

class BoardRepository extends BaseRepository
{
    use DefaultFilterTrait;
    use SecurityFilterTrait;

    public function __construct(Board $model)
    {
        parent::__construct($model);
    }

    public function model(): string
    {
        return Board::class;
    }
}
