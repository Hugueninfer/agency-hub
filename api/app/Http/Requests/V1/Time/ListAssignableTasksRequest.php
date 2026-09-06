<?php

namespace App\Http\Requests\V1\Time;

use App\Http\Requests\RequestAbstract;

class ListAssignableTasksRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'project_uuid' => ['sometimes', 'nullable', 'uuid'],
        ];
    }
}
