<?php

namespace App\Http\Requests\V1\Rbac;

use App\Http\Requests\RequestAbstract;

class AssignRolePermissionsRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'permission_codes' => ['required', 'array', 'min:1'],
            'permission_codes.*' => ['required', 'string', 'max:100'],
        ];
    }
}
