<?php

namespace App\Http\Requests\V1\Invoice;

use App\Http\Requests\RequestAbstract;
use App\Models\Invoice;
use Illuminate\Validation\Rule;

class StoreInvoiceRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'invoice_number' => ['required', 'string', 'max:80'],
            'status' => ['nullable', Rule::in(Invoice::statuses())],
            'issue_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'currency' => ['nullable', Rule::in(Invoice::currencies())],
            'seller_name' => ['nullable', 'string', 'max:160'],
            'seller_email' => ['nullable', 'email', 'max:180'],
            'seller_vat_id' => ['nullable', 'string', 'max:80'],
            'seller_address' => ['nullable', 'string'],
            'buyer_name' => ['nullable', 'string', 'max:160'],
            'buyer_email' => ['required', 'email', 'max:180'],
            'buyer_vat_id' => ['nullable', 'string', 'max:80'],
            'buyer_address' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.unit_type' => ['required', Rule::in(['quantity', 'hours'])],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.tax_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }
}
