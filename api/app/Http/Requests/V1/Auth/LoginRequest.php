<?php

namespace App\Http\Requests\V1\Auth;

use App\Http\Requests\RequestAbstract;

class LoginRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ];
    }
}
