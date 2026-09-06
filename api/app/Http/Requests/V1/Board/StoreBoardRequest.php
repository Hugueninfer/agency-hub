<?php

namespace App\Http\Requests\V1\Board;

use App\Http\Requests\RequestAbstract;

class StoreBoardRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'excalidraw_data' => ['nullable', 'array'],
        ];
    }
}
