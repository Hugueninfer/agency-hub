<?php

namespace App\Domain\Traits\Repository;

trait DefaultFilterTrait
{
    public function applyExactFilter(string $field, mixed $value): self
    {
        if ($value !== null) {
            $this->scopeQuery(fn ($query) => $query->where($field, $value));
        }

        return $this;
    }
}
