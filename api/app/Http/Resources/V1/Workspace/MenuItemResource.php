<?php

namespace App\Http\Resources\V1\Workspace;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MenuItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'section' => $this->section,
            'label' => $this->label,
            'icon' => $this->icon,
            'route' => $this->route,
            'url' => $this->url,
            'permission' => $this->permission,
            'order' => (int) $this->order,
            'is_active' => (bool) $this->is_active,
            'parent_uuid' => $this->parent?->uuid,
        ];
    }
}
