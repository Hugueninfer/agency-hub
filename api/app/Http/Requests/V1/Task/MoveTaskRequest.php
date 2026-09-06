<?php

namespace App\Http\Requests\V1\Task;

use App\Http\Requests\RequestAbstract;
use App\Models\Task;
use Illuminate\Validation\Rule;

class MoveTaskRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'board_column' => ['required', 'string', Rule::in(Task::boardColumns())],
            'position'     => ['required', 'integer', 'min:0'],
        ];
    }
}
