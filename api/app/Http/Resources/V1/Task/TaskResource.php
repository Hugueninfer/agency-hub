<?php

namespace App\Http\Resources\V1\Task;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid'          => $this->uuid,
            'title'         => $this->title,
            'description'   => $this->description,
            'board_column'  => $this->board_column,
            'position'      => (int) $this->position,
            'due_date'      => $this->due_date?->format('Y-m-d'),
            'created_at'    => $this->created_at?->toIso8601String(),
            'updated_at'    => $this->updated_at?->toIso8601String(),
            'project'       => $this->whenLoaded('project', fn () => [
                'uuid' => $this->project->uuid,
                'name' => $this->project->name,
            ]),
            'creator'       => $this->whenLoaded('creator', fn () => $this->creator ? [
                'uuid'  => $this->creator->uuid,
                'name'  => $this->creator->name,
                'email' => $this->creator->email,
            ] : null),
            'assignees'     => $this->whenLoaded('assignees', function () {
                return $this->assignees->map(fn ($u) => [
                    'uuid'  => $u->uuid,
                    'name'  => $u->name,
                    'email' => $u->email,
                    'photo_url' => $u->photo_path ? rtrim(request()->getSchemeAndHttpHost(), '/').'/storage/'.$u->photo_path : null,
                ])->values()->all();
            }),
            'subtasks'      => TaskSubtaskResource::collection($this->whenLoaded('subtasks')),
            'comments'      => TaskCommentResource::collection($this->whenLoaded('comments')),
            'attachments'   => TaskAttachmentResource::collection($this->whenLoaded('attachments')),
            'source'            => $this->source,
            'source_metadata'   => $this->source_metadata,
            // Lightweight counts for board cards (avoid shipping full threads).
            'comments_count'    => $this->whenCounted('comments'),
            'attachments_count' => $this->whenCounted('attachments'),
        ];
    }
}
