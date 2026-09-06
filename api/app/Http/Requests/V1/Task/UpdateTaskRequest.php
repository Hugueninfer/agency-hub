<?php

namespace App\Http\Requests\V1\Task;

use App\Http\Requests\RequestAbstract;
use App\Models\Task;
use Illuminate\Validation\Rule;

class UpdateTaskRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'           => ['sometimes', 'required', 'string', 'max:200'],
            'description'     => ['nullable', 'string', 'max:20000'],
            'board_column'    => ['sometimes', 'string', Rule::in(Task::boardColumns())],
            'due_date'        => ['nullable', 'date'],
            'position'        => ['sometimes', 'integer', 'min:0'],
            'assignee_uuids'  => ['nullable', 'array'],
            'assignee_uuids.*'=> ['uuid'],
            'project_uuid'    => [
                'sometimes',
                'uuid',
                Rule::exists('projects', 'uuid')->where(fn ($q) => $q->where('tenant_id', $this->user()->tenant_id)),
            ],
        ];
    }
}
