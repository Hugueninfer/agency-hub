<?php

namespace App\Http\Resources\V1\Time;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TimeActiveSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $task = $this->task;

        return [
            'started_at' => $this->started_at?->toIso8601String(),
            'task' => $task === null ? null : [
                'uuid' => $task->uuid,
                'title' => $task->title,
                'project' => [
                    'uuid' => $task->project?->uuid,
                    'name' => $task->project?->name,
                ],
            ],
        ];
    }
}
