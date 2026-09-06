<?php

namespace App\Http\Requests\V1\Workspace;

use App\Http\Requests\RequestAbstract;

class UpdateMenuRequest extends RequestAbstract
{
    public function rules(): array
    {
        return [
            'items' => ['required', 'array'],
            'items.*.uuid' => ['sometimes', 'string', 'max:36'],
            'items.*.section' => ['required', 'string', 'in:main,settings'],
            'items.*.label' => ['required', 'string', 'max:100'],
            'items.*.icon' => ['sometimes', 'nullable', 'string', 'max:50'],
            'items.*.route' => ['sometimes', 'nullable', 'string', 'max:200'],
            'items.*.url' => ['sometimes', 'nullable', 'string', 'max:500'],
            'items.*.permission' => ['sometimes', 'nullable', 'string', 'max:100'],
            'items.*.order' => ['required', 'integer', 'min:0'],
            'items.*.is_active' => ['sometimes', 'boolean'],
            'items.*.parent_uuid' => ['sometimes', 'nullable', 'string', 'max:36'],
        ];
    }
}
