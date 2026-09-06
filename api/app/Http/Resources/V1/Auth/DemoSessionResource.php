<?php

namespace App\Http\Resources\V1\Auth;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DemoSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'access_token' => $this->resource['token'],
            'expires_at' => $this->resource['expires_at']->toIso8601String(),
        ];
    }
}
