<?php

namespace App\Http\Requests\V1\Board;

use App\Http\Requests\RequestAbstract;

class UpdateBoardRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:160'],
            'excalidraw_data' => ['sometimes', 'nullable', 'array'],
        ];
    }
}
