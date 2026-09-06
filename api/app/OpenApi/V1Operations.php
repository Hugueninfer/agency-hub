<?php

namespace App\OpenApi;

use OpenApi\Attributes as OA;

/**
 * Marcadores apenas para documentação OpenAPI (não são rotas reais).
 */
final class V1Operations
{
    #[OA\Get(
        path: '/api/health',
        operationId: 'getHealth',
        summary: 'Health check',
        tags: ['Health'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Serviço ativo',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'ok', type: 'boolean', example: true),
                        new OA\Property(property: 'service', type: 'string', example: 'subforge-api'),
                        new OA\Property(property: 'timestamp', type: 'string', format: 'date-time'),
                    ]
                )
            ),
        ]
    )]
    public function docHealth(): void {}

    #[OA\Post(
        path: '/api/v1/auth/login',
        operationId: 'postAuthLogin',
        summary: 'Login (obter token Sanctum)',
        tags: ['Auth'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'password'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', format: 'email'),
                    new OA\Property(property: 'password', type: 'string', format: 'password'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Autenticado',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string'),
                        new OA\Property(
                            property: 'data',
                            properties: [
                                new OA\Property(property: 'token', type: 'string'),
                                new OA\Property(property: 'user', ref: AuthenticatedUserSchema::class),
                            ],
                            type: 'object',
                        ),
                    ]
                )
            ),
            new OA\Response(
                response: 401,
                description: 'Credenciais inválidas',
                content: new OA\JsonContent(ref: ApiErrorSchema::class)
            ),
            new OA\Response(
                response: 422,
                description: 'Validação falhou',
                content: new OA\JsonContent(ref: ValidationErrorSchema::class)
            ),
        ]
    )]
    public function docAuthLogin(): void {}

    #[OA\Get(
        path: '/api/v1/auth/me',
        operationId: 'getAuthMe',
        summary: 'Utilizador autenticado (com permissões agregadas)',
        security: [['sanctum' => []]],
        tags: ['Auth'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'OK',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string'),
                        new OA\Property(property: 'data', ref: AuthenticatedUserSchema::class),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Não autenticado', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
        ]
    )]
    public function docAuthMe(): void {}

    #[OA\Post(
        path: '/api/v1/auth/logout',
        operationId: 'postAuthLogout',
        summary: 'Logout (revogar token atual)',
        security: [['sanctum' => []]],
        tags: ['Auth'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Logout efetuado',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string'),
                        new OA\Property(property: 'data', type: 'object', nullable: true),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Não autenticado', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
        ]
    )]
    public function docAuthLogout(): void {}

    #[OA\Get(
        path: '/api/v1/projects',
        operationId: 'listProjects',
        summary: 'Listar projetos do tenant',
        description: 'Requer permissão `project.read`.',
        security: [['sanctum' => []]],
        tags: ['Projects'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Lista de projetos',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string'),
                        new OA\Property(
                            property: 'data',
                            type: 'array',
                            items: new OA\Items(ref: ProjectSchema::class),
                        ),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Não autenticado', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 403, description: 'Sem permissão', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
        ]
    )]
    public function docListProjects(): void {}

    #[OA\Post(
        path: '/api/v1/projects',
        operationId: 'createProject',
        summary: 'Criar projeto',
        description: 'Requer permissão `project.create`.',
        security: [['sanctum' => []]],
        tags: ['Projects'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', maxLength: 160),
                    new OA\Property(property: 'description', type: 'string', nullable: true, maxLength: 5000),
                    new OA\Property(property: 'status', type: 'string', enum: ['active', 'archived'], nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Criado',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string'),
                        new OA\Property(property: 'data', ref: ProjectSchema::class),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Não autenticado', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 403, description: 'Sem permissão', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 422, description: 'Validação', content: new OA\JsonContent(ref: ValidationErrorSchema::class)),
        ]
    )]
    public function docCreateProject(): void {}

    #[OA\Get(
        path: '/api/v1/projects/{uuid}',
        operationId: 'getProject',
        summary: 'Detalhe do projeto',
        description: 'Requer permissão `project.read`.',
        security: [['sanctum' => []]],
        tags: ['Projects'],
        parameters: [
            new OA\Parameter(name: 'uuid', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'OK',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string'),
                        new OA\Property(property: 'data', ref: ProjectSchema::class),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Não autenticado', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 403, description: 'Sem permissão', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 404, description: 'Não encontrado', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
        ]
    )]
    public function docGetProject(): void {}

    #[OA\Patch(
        path: '/api/v1/projects/{uuid}',
        operationId: 'patchProject',
        summary: 'Atualizar projeto',
        description: 'Requer permissão `project.update`.',
        security: [['sanctum' => []]],
        tags: ['Projects'],
        parameters: [
            new OA\Parameter(name: 'uuid', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid')),
        ],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'name', type: 'string', maxLength: 160),
                    new OA\Property(property: 'description', type: 'string', nullable: true, maxLength: 5000),
                    new OA\Property(property: 'status', type: 'string', enum: ['active', 'archived'], nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Atualizado',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string'),
                        new OA\Property(property: 'data', ref: ProjectSchema::class),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Não autenticado', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 403, description: 'Sem permissão', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 404, description: 'Não encontrado', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 422, description: 'Validação', content: new OA\JsonContent(ref: ValidationErrorSchema::class)),
        ]
    )]
    public function docPatchProject(): void {}

    #[OA\Delete(
        path: '/api/v1/projects/{uuid}',
        operationId: 'deleteProject',
        summary: 'Eliminar projeto',
        description: 'Requer permissão `project.delete`.',
        security: [['sanctum' => []]],
        tags: ['Projects'],
        parameters: [
            new OA\Parameter(name: 'uuid', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Eliminado',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string'),
                        new OA\Property(property: 'data', type: 'object', nullable: true),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Não autenticado', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 403, description: 'Sem permissão', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 404, description: 'Não encontrado', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
        ]
    )]
    public function docDeleteProject(): void {}

    #[OA\Get(
        path: '/api/v1/rbac/permissions',
        operationId: 'listRbacPermissions',
        summary: 'Listar todas as permissões (catálogo global)',
        description: 'Requer permissão `rbac.permission.read`.',
        security: [['sanctum' => []]],
        tags: ['RBAC'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'OK',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string'),
                        new OA\Property(
                            property: 'data',
                            type: 'array',
                            items: new OA\Items(ref: PermissionSchema::class),
                        ),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Não autenticado', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 403, description: 'Sem permissão', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
        ]
    )]
    public function docListPermissions(): void {}

    #[OA\Get(
        path: '/api/v1/rbac/roles',
        operationId: 'listRbacRoles',
        summary: 'Listar papéis do tenant',
        description: 'Requer permissão `rbac.role.read`.',
        security: [['sanctum' => []]],
        tags: ['RBAC'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'OK — cada papel inclui permissões carregadas',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string'),
                        new OA\Property(
                            property: 'data',
                            type: 'array',
                            items: new OA\Items(ref: RoleSchema::class),
                        ),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Não autenticado', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 403, description: 'Sem permissão', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
        ]
    )]
    public function docListRoles(): void {}

    #[OA\Get(
        path: '/api/v1/rbac/users',
        operationId: 'listRbacUsers',
        summary: 'Listar utilizadores do tenant',
        description: 'Requer permissão `rbac.user.read`.',
        security: [['sanctum' => []]],
        tags: ['RBAC'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'OK',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string'),
                        new OA\Property(
                            property: 'data',
                            type: 'array',
                            items: new OA\Items(ref: UserSummarySchema::class),
                        ),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Não autenticado', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 403, description: 'Sem permissão', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
        ]
    )]
    public function docListUsers(): void {}

    #[OA\Post(
        path: '/api/v1/rbac/roles',
        operationId: 'createRbacRole',
        summary: 'Criar papel no tenant',
        description: 'Requer permissão `rbac.role.create`.',
        security: [['sanctum' => []]],
        tags: ['RBAC'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', maxLength: 80),
                    new OA\Property(property: 'description', type: 'string', nullable: true, maxLength: 255),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Criado',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string'),
                        new OA\Property(property: 'data', ref: RoleSchema::class),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Não autenticado', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 403, description: 'Sem permissão', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 422, description: 'Validação', content: new OA\JsonContent(ref: ValidationErrorSchema::class)),
        ]
    )]
    public function docCreateRole(): void {}

    #[OA\Post(
        path: '/api/v1/rbac/roles/{roleUuid}/permissions',
        operationId: 'assignRbacRolePermissions',
        summary: 'Associar permissões a um papel',
        description: 'Requer permissão `rbac.role.assign_permission`.',
        security: [['sanctum' => []]],
        tags: ['RBAC'],
        parameters: [
            new OA\Parameter(name: 'roleUuid', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['permission_codes'],
                properties: [
                    new OA\Property(
                        property: 'permission_codes',
                        type: 'array',
                        items: new OA\Items(type: 'string', maxLength: 100),
                    ),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'OK',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string'),
                        new OA\Property(property: 'data', ref: RoleSchema::class),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Não autenticado', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 403, description: 'Sem permissão', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 422, description: 'Validação', content: new OA\JsonContent(ref: ValidationErrorSchema::class)),
        ]
    )]
    public function docAssignRolePermissions(): void {}

    #[OA\Post(
        path: '/api/v1/rbac/user-role',
        operationId: 'assignRbacUserRole',
        summary: 'Atribuir papel a um utilizador',
        description: 'Requer permissão `rbac.user.assign_role`.',
        security: [['sanctum' => []]],
        tags: ['RBAC'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['role_uuid', 'user_uuid'],
                properties: [
                    new OA\Property(property: 'role_uuid', type: 'string', format: 'uuid'),
                    new OA\Property(property: 'user_uuid', type: 'string', format: 'uuid'),
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'OK',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(property: 'message', type: 'string'),
                        new OA\Property(property: 'data', type: 'object', nullable: true),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Não autenticado', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 403, description: 'Sem permissão', content: new OA\JsonContent(ref: ApiErrorSchema::class)),
            new OA\Response(response: 422, description: 'Validação', content: new OA\JsonContent(ref: ValidationErrorSchema::class)),
        ]
    )]
    public function docAssignUserRole(): void {}
}
