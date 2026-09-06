<?php

namespace App\OpenApi;

use OpenApi\Attributes as OA;

#[OA\OpenApi(
    openapi: '3.0.0',
    info: new OA\Info(
        title: 'Workflow API',
        version: '1.0.0',
        description: <<<'MD'
REST API v1 do motor workflow.

- **Autenticação**: Laravel Sanctum (`Authorization: Bearer <token>`), obtido em `POST /api/v1/auth/login`.
- **Multi-tenant**: contexto do tenant vem do utilizador após autenticação (middleware `tenant`).
- **RBAC**: várias rotas exigem permissões explícitas (403 se faltar permissão).
MD
    ),
    servers: [
        new OA\Server(
            url: 'http://localhost:8000',
            description: 'Local — substitui pelo teu `APP_URL`.'
        ),
    ],
    tags: [
        new OA\Tag(name: 'Health', description: 'Disponibilidade do serviço'),
        new OA\Tag(name: 'Auth', description: 'Login e sessão (Sanctum)'),
        new OA\Tag(name: 'Projects', description: 'Gestão de projetos (`project.*`)'),
        new OA\Tag(name: 'RBAC', description: 'Papéis e permissões (`rbac.*`)'),
    ],
)]
#[OA\SecurityScheme(
    securityScheme: 'sanctum',
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'opaque',
    description: 'Token Sanctum devolvido em `POST /api/v1/auth/login` (campo `data.token`).',
)]
final class ApiSpecification {}
