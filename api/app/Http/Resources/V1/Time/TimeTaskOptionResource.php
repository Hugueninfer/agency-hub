<?php

namespace App\Http\Resources\V1\Time;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TimeTaskOptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'title' => $this->title,
            'project' => [
                'uuid' => $this->whenLoaded('project', fn () => $this->project?->uuid),
                'name' => $this->whenLoaded('project', fn () => $this->project?->name),
            ],
        ];
    }
}
