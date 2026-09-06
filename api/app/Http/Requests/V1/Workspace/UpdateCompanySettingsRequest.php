<?php

namespace App\Http\Requests\V1\Workspace;

use App\Http\Requests\RequestAbstract;

class UpdateCompanySettingsRequest extends RequestAbstract
{
    public function rules(): array
    {
        return [
            'logo' => ['sometimes', 'image', 'mimes:png,jpg,jpeg,svg,webp', 'max:2048'],
            'remove_logo' => ['sometimes', 'boolean'],
            'drive_link' => ['sometimes', 'nullable', 'url', 'max:500'],
            'drive_link_label' => ['sometimes', 'string', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'logo.max' => 'The logo must not be larger than 2MB.',
        ];
    }
}
