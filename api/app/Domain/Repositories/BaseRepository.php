<?php

namespace App\Domain\Repositories;

use Closure;
use Illuminate\Database\Eloquent\Builder;
use Prettus\Repository\Eloquent\Repository as PrettusRepository;

abstract class BaseRepository extends PrettusRepository
{
    /**
     * Encapsula escopo no query builder (compatível com traits que usam scopeQuery).
     *
     * @param  Closure(Builder): Builder  $scope
     */
    public function scopeQuery(Closure $scope): static
    {
        $query = $this->query instanceof Builder
            ? $this->query
            : $this->model->newQuery();

        $this->query = $scope($query);

        return $this;
    }
}
