<?php

namespace App\Http\Resources\V1\Time;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TimeEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'duration_minutes' => (int) $this->duration_minutes,
            'worked_date' => $this->worked_date?->toDateString(),
            'started_at' => $this->started_at?->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'user' => [
                'uuid' => $this->whenLoaded('user', fn () => $this->user?->uuid),
                'name' => $this->whenLoaded('user', fn () => $this->user?->name),
                'email' => $this->whenLoaded('user', fn () => $this->user?->email),
                'photo_url' => $this->whenLoaded('user', function () use ($request) {
                    $path = $this->user?->photo_path;
                    if ($path === null || $path === '') {
                        return null;
                    }

                    return rtrim($request->getSchemeAndHttpHost(), '/').'/storage/'.$path;
                }),
            ],
            'task' => [
                'uuid' => $this->whenLoaded('task', fn () => $this->task?->uuid),
                'title' => $this->whenLoaded('task', fn () => $this->task?->title),
            ],
            'project' => [
                'uuid' => $this->whenLoaded('project', fn () => $this->project?->uuid),
                'name' => $this->whenLoaded('project', fn () => $this->project?->name),
            ],
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
