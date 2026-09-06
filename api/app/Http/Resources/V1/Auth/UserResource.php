<?php

namespace App\Http\Resources\V1\Auth;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $this->resource->loadMissing('roles.permissions');
        $photoUrl = null;
        if ($this->photo_path) {
            $photoUrl = rtrim($request->getSchemeAndHttpHost(), '/').'/storage/'.$this->photo_path;
        }

        $permissionCodes = $this->roles
            ->flatMap(fn ($role) => $role->permissions)
            ->pluck('code')
            ->unique()
            ->values()
            ->all();

        return [
            'uuid' => $this->uuid,
            'is_demo' => $this->resource->isDemo(),
            'expires_at' => $this->tenant?->expires_at?->toIso8601String(),
            'name' => $this->name,
            'email' => $this->email,
            'photo_url' => $photoUrl,
            'permissions' => $permissionCodes,
        ];
    }
}
