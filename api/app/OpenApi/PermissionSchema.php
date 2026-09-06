<?php

namespace App\OpenApi;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'Permission',
    properties: [
        new OA\Property(property: 'code', type: 'string', example: 'project.read'),
        new OA\Property(property: 'name', type: 'string'),
        new OA\Property(property: 'description', type: 'string', nullable: true),
    ],
)]
final class PermissionSchema {}
