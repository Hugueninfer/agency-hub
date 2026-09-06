<?php

namespace App\Http\Requests\V1\Task;

use App\Http\Requests\RequestAbstract;

class StoreSubtaskRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'         => ['required', 'string', 'max:200'],
            'is_done'       => ['sometimes', 'boolean'],
            'assignee_uuid' => ['sometimes', 'nullable', 'string', 'uuid'],
        ];
    }
}
