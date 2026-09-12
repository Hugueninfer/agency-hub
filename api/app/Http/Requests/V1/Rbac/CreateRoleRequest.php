<?php

namespace App\Http\Requests\V1\Rbac;

use App\Http\Requests\RequestAbstract;

class CreateRoleRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }
}
