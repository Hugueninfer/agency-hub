<?php

namespace App\Http\Requests\V1\Time;

use App\Http\Requests\RequestAbstract;

class StartTimeSessionRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'task_uuid' => ['required', 'uuid'],
        ];
    }
}
