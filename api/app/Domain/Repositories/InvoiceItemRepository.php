<?php

namespace App\Domain\Repositories;

use App\Domain\Traits\Repository\DefaultFilterTrait;
use App\Domain\Traits\Repository\SecurityFilterTrait;
use App\Models\InvoiceItem;

class InvoiceItemRepository extends BaseRepository
{
    use DefaultFilterTrait;
    use SecurityFilterTrait;

    public function __construct(InvoiceItem $model)
    {
        parent::__construct($model);
    }

    public function model(): string
    {
        return InvoiceItem::class;
    }

    public function deleteAllForInvoice(int $invoiceId): void
    {
        $this->model->newQuery()->where('invoice_id', $invoiceId)->delete();
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    public function insertMany(array $rows): void
    {
        foreach ($rows as $row) {
            $this->model->newQuery()->create($row);
        }
    }
}
