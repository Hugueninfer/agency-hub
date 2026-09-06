<?php

namespace App\Http\Requests\V1\Task;

use App\Http\Requests\RequestAbstract;
use App\Models\Task;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'           => ['required', 'string', 'max:200'],
            'description'     => ['nullable', 'string', 'max:20000'],
            'board_column'    => ['nullable', 'string', Rule::in(Task::boardColumns())],
            'due_date'        => ['nullable', 'date'],
            'assignee_uuids'  => ['nullable', 'array'],
            'assignee_uuids.*'=> ['uuid'],
        ];
    }
}
