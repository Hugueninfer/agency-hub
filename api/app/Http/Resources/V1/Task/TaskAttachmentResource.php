<?php

namespace App\Http\Resources\V1\Task;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskAttachmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $url = rtrim($request->getSchemeAndHttpHost(), '/').'/storage/'.$this->path;

        return [
            'uuid'           => $this->uuid,
            'url'            => $url,
            'original_name'  => $this->original_name,
            'mime'           => $this->mime,
            'size_bytes'     => (int) $this->size_bytes,
            'created_at'     => $this->created_at?->toIso8601String(),
            'uploaded_by'    => $this->whenLoaded('uploader', fn () => [
                'uuid'  => $this->uploader->uuid,
                'name'  => $this->uploader->name,
                'email' => $this->uploader->email,
            ]),
        ];
    }
}
