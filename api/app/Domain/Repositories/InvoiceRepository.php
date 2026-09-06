<?php

namespace App\Domain\Repositories;

use App\Domain\Traits\Repository\DefaultFilterTrait;
use App\Domain\Traits\Repository\SecurityFilterTrait;
use App\Models\Invoice;
use Illuminate\Database\Eloquent\Collection;

class InvoiceRepository extends BaseRepository
{
    use DefaultFilterTrait;
    use SecurityFilterTrait;

    public function __construct(Invoice $model)
    {
        parent::__construct($model);
    }

    public function model(): string
    {
        return Invoice::class;
    }

    /**
     * @return Collection<int, Invoice>
     */
    public function listForTenantWithItems(int $tenantId): Collection
    {
        /** @var Collection<int, Invoice> */
        return $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->with('items')
            ->orderByDesc('updated_at')
            ->get();
    }

    public function findByUuidForTenantWithItems(string $uuid, int $tenantId): ?Invoice
    {
        /** @var Invoice|null */
        return $this->model->newQuery()
            ->where('tenant_id', $tenantId)
            ->where('uuid', $uuid)
            ->with('items')
            ->first();
    }
}
