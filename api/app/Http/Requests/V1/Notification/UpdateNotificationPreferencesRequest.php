<?php

namespace App\Http\Requests\V1\Notification;

use App\Http\Requests\RequestAbstract;
use App\Support\Notifications\NotificationType;
use Illuminate\Validation\Rule;

class UpdateNotificationPreferencesRequest extends RequestAbstract
{
    public function rules(): array
    {
        return [
            'preferences' => ['required', 'array'],
            'preferences.*.type' => ['required', 'string', Rule::in(NotificationType::all())],
            'preferences.*.database_enabled' => ['sometimes', 'boolean'],
            'preferences.*.email_enabled' => ['sometimes', 'boolean'],
        ];
    }
}
