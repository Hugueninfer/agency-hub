<?php

namespace App\Http\Controllers\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ConfigResource;
use Illuminate\Http\JsonResponse;

class ConfigController extends Controller
{
    public function show(): JsonResponse
    {
        return $this->buildSuccessResponse('Application configuration.', new ConfigResource([
            'app_mode' => config('app.mode'),
            'demo_available' => in_array(config('app.mode'), ['demo', 'combined'], true),
        ]));
    }
}
