<?php

namespace App\OpenApi;

use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'ValidationError',
    properties: [
        new OA\Property(property: 'success', type: 'boolean', example: false),
        new OA\Property(property: 'message', type: 'string', example: 'Validation failed.'),
        new OA\Property(
            property: 'errors',
            description: 'Chaves de campo e lista de mensagens Laravel',
            type: 'object',
            example: ['email' => ['The email field is required.']],
        ),
    ]
)]
final class ValidationErrorSchema {}
