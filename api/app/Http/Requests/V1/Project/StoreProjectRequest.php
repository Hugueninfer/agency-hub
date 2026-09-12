<?php

namespace App\Http\Requests\V1\Project;

use App\Http\Requests\RequestAbstract;

class StoreProjectRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['nullable', 'string', 'in:active,archived'],
        ];
    }
}
