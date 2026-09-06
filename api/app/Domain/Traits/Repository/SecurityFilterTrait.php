<?php

namespace App\Domain\Traits\Repository;

trait SecurityFilterTrait
{
    public function scopeByTenantId(int $tenantId): self
    {
        $this->scopeQuery(fn ($query) => $query->where('tenant_id', $tenantId));

        return $this;
    }
}
