<?php

namespace App\Http\Resources\V1\Task;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskSubtaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid'     => $this->uuid,
            'title'    => $this->title,
            'is_done'  => (bool) $this->is_done,
            'position' => (int) $this->position,
            'assignee' => $this->whenLoaded('assignee', fn () => $this->assignee ? [
                'uuid'      => $this->assignee->uuid,
                'name'      => $this->assignee->name,
                'photo_url' => $this->assignee->photo_path
                    ? rtrim(request()->getSchemeAndHttpHost(), '/').'/storage/'.$this->assignee->photo_path
                    : null,
            ] : null),
        ];
    }
}
