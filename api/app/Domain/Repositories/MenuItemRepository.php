<?php

namespace App\Domain\Repositories;

use App\Domain\Traits\Repository\DefaultFilterTrait;
use App\Domain\Traits\Repository\SecurityFilterTrait;
use App\Models\MenuItem;
use Illuminate\Database\Eloquent\Collection;

class MenuItemRepository extends BaseRepository
{
    use DefaultFilterTrait;
    use SecurityFilterTrait;

    public function __construct(MenuItem $model)
    {
        parent::__construct($model);
    }

    public function model(): string
    {
        return MenuItem::class;
    }

    /**
     * @return Collection<int, MenuItem>
     */
    public function listForTenant(int $tenantId): Collection
    {
        /** @var Collection<int, MenuItem> */
        return $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('section')
            ->orderBy('order')
            ->get();
    }

    /**
     * @return Collection<int, MenuItem>
     */
    public function listAllForTenant(int $tenantId): Collection
    {
        /** @var Collection<int, MenuItem> */
        return $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->orderBy('section')
            ->orderBy('order')
            ->get();
    }
}
