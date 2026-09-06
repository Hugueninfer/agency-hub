<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConfigResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'app_mode' => $this->resource['app_mode'],
            'demo_available' => $this->resource['demo_available'],
        ];
    }
}
