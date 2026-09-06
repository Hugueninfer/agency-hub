<?php

namespace App\Http\Requests\V1\Rbac;

use App\Http\Requests\RequestAbstract;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = (int) $this->attributes->get('tenant_id');
        $userUuid = (string) $this->route('userUuid');

        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => [
                'required',
                'string',
                'email',
                'max:180',
                Rule::unique('users', 'email')
                    ->where(fn ($query) => $query->where('tenant_id', $tenantId))
                    ->ignore($userUuid, 'uuid'),
            ],
            'role_uuid' => ['required', 'string', 'uuid'],
            'password' => ['nullable', 'string', 'min:8', 'max:255'],
            'photo' => ['nullable', 'image', 'max:5120'],
            'remove_photo' => ['sometimes', 'boolean'],
        ];
    }
}
