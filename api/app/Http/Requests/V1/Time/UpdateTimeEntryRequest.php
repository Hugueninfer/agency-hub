<?php

namespace App\Http\Requests\V1\Time;

use App\Http\Requests\RequestAbstract;

class UpdateTimeEntryRequest extends RequestAbstract
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'worked_date.before_or_equal' => 'Worked date cannot be in the future.',
        ];
    }

    public function rules(): array
    {
        return [
            'task_uuid' => ['sometimes', 'nullable', 'uuid'],
            'worked_date' => ['sometimes', 'nullable', 'date', 'before_or_equal:today'],
            'duration_minutes' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'hours' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'minutes' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:59'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if (! $this->hasAny(['duration_minutes', 'hours', 'minutes'])) {
                return;
            }

            $durationMinutes = $this->input('duration_minutes');
            $hours = $this->input('hours');
            $minutes = $this->input('minutes');

            $hasDuration = ($durationMinutes !== null && $durationMinutes !== '')
                || ($hours !== null && $hours !== '')
                || ($minutes !== null && $minutes !== '');

            if (! $hasDuration) {
                $validator->errors()->add('duration_minutes', 'Provide duration_minutes or hours and/or minutes.');
            }
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function validatedPayload(): array
    {
        return $this->validated();
    }
}
