<?php

namespace App\Http\Requests\V1\Task;

use App\Http\Requests\RequestAbstract;

class StoreTaskCommentRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:10000'],
        ];
    }
}
