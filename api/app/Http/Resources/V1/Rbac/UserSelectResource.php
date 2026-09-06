<?php

namespace App\Http\Resources\V1\Rbac;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserSelectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $photoUrl = null;
        if ($this->photo_path) {
            $photoUrl = rtrim($request->getSchemeAndHttpHost(), '/').'/storage/'.$this->photo_path;
        }

        return [
            'uuid'  => $this->uuid,
            'name'  => $this->name,
            'email' => $this->email,
            'photo_url' => $photoUrl,
            'roles' => $this->whenLoaded('roles', function () {
                return $this->roles->map(fn ($role) => [
                    'uuid' => $role->uuid,
                    'name' => $role->name,
                ])->values();
            }, []),
        ];
    }
}
