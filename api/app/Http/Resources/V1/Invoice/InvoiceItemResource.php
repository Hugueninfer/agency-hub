<?php

namespace App\Http\Resources\V1\Invoice;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'position' => (int) $this->position,
            'description' => $this->description,
            'unit_type' => $this->unit_type ?? 'quantity',
            'quantity' => (float) $this->quantity,
            'unit_price' => (float) $this->unit_price,
            'tax_percent' => (float) $this->tax_percent,
            'line_total' => (float) $this->line_total,
        ];
    }
}
