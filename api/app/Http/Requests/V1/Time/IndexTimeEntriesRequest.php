<?php

namespace App\Http\Requests\V1\Time;

use App\Http\Requests\RequestAbstract;

class IndexTimeEntriesRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'date_from' => ['sometimes', 'nullable', 'date'],
            'date_to' => ['sometimes', 'nullable', 'date', 'after_or_equal:date_from'],
            'user_uuid' => ['sometimes', 'nullable', 'array'],
            'user_uuid.*' => ['uuid'],
            'project_uuid' => ['sometimes', 'nullable', 'array'],
            'project_uuid.*' => ['uuid'],
        ];
    }

    /**
     * @return list<string>|null
     */
    public function userUuids(): ?array
    {
        $v = $this->input('user_uuid');

        return is_array($v) && $v !== [] ? array_values($v) : null;
    }

    /**
     * @return list<string>|null
     */
    public function projectUuids(): ?array
    {
        $v = $this->input('project_uuid');

        return is_array($v) && $v !== [] ? array_values($v) : null;
    }
}
