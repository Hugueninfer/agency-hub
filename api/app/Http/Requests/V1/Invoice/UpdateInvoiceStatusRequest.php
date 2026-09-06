<?php

namespace App\Http\Requests\V1\Invoice;

use App\Http\Requests\RequestAbstract;
use App\Models\Invoice;
use Illuminate\Validation\Rule;

class UpdateInvoiceStatusRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(Invoice::statuses())],
        ];
    }
}
