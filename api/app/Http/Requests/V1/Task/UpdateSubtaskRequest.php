<?php

namespace App\Http\Requests\V1\Task;

use App\Http\Requests\RequestAbstract;

class UpdateSubtaskRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:200'],
            'is_done' => ['sometimes', 'boolean'],
            'assignee_uuid' => ['sometimes', 'nullable', 'string', 'uuid'],
        ];
    }
}
