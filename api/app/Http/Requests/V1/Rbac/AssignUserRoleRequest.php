<?php

namespace App\Http\Requests\V1\Rbac;

use App\Http\Requests\RequestAbstract;

class AssignUserRoleRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'role_uuid' => ['required', 'uuid'],
            'user_uuid' => ['required', 'uuid'],
        ];
    }
}
