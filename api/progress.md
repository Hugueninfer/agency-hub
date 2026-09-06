# Progress Log

## 2026-05-06

### O que foi construido

- Inicializacao de memoria do projeto:
  - `product_plan.md`
  - `decisions.md`
  - `progress.md`
  - `schema.md`
- Definicao de bloqueio de execucao para impedir codigo de feature antes de discovery/schema aprovados.
- Captura parcial de Discovery:
  - ICP inicial definido (empresas com contratante + freelancers)
  - Dor/proposta preliminar registrada (fragmentacao de ferramentas tipo Trello/Miro/Toggl)
  - Restricoes regulatórias registradas (LGPD e regulamentacoes europeias)
- Atualizacao de Discovery:
  - Monetizacao definida como planos em EUR por quantidade de usuarios (seat-based)
  - Proposta de valor consolidada com foco em reducao de "fadiga de ferramentas"
  - Metricas norte adiadas por decisao de produto (pendente definicao)
- Atualizacao de governanca:
  - KPI removido como requisito obrigatorio de desbloqueio
  - Discovery essencial passa a considerar ICP, dor, UVP, monetizacao e restricoes
- Consolidacao de produto:
  - Escopo funcional MVP definido (Dashboard, Kanban, Board, Invoices, Configuracoes, Timesheet)
  - Estrategia de tenancy definida (plataforma fechada com criacao manual de tenant)
  - Stack definida (Next.js + Laravel)
  - Integracoes externas do MVP definidas como nao prioritarias
- Sprint 1 — Parte 1 (Auth + Tenant Context) implementada:
  - Estrutura base da arquitetura criada (Controller/Request/Service/Repository/Resource)
  - `ApiResponseTrait` adicionado ao controller base para respostas padronizadas
  - Auth v1 implementado (`/api/v1/auth/login`, `/api/v1/auth/me`, `/api/v1/auth/logout`)
  - Repository `UserRepository` no padrao Prettus + service `UserAuthService`
  - Models de tenancy adicionados (`Tenant`, `User` com `uuid` e `tenant_id`)
  - Middleware `tenant` criado para garantir contexto de tenant em rotas protegidas
  - Migrations de `tenants` e colunas `uuid`/`tenant_id` em `users` adicionadas
- Sprint 1 — Parte 2 (RBAC Foundation) implementada:
  - Migrations criadas para `roles`, `permissions`, `permission_role` e `role_user`
  - Models `Role` e `Permission` adicionados com relacionamentos
  - Relacionamentos de `roles` adicionados em `User`
  - Repositories `RoleRepository` e `PermissionRepository` adicionados
  - Service `RbacService` criado para regras de RBAC
  - Controller `RbacController` e requests/resources de RBAC implementados
  - Endpoints RBAC v1 adicionados:
    - `GET /api/v1/rbac/permissions`
    - `POST /api/v1/rbac/roles`
    - `POST /api/v1/rbac/roles/{roleUuid}/permissions`
    - `POST /api/v1/rbac/user-role`
  - Seeder atualizado com permissões base e role `owner` por tenant

### Erros encontrados

- Ordem de migrations RBAC inicialmente conflitou por timestamps iguais; corrigido com timestamps sequenciais.
- `uuid` obrigatório com `WithoutModelEvents` exigiu ajuste explícito no seeder; corrigido.

### Resultados de testes

- `migrate:fresh --seed` executado com sucesso após ajustes.
- Endpoint `GET /api/v1/rbac/permissions` validado com token (`success=true`, 6 permissões).

### Proximos passos

1. Smoke test manual end-to-end (login → Projects CRUD → RBAC).
2. Sprint seguinte: tarefas / Kanban ligadas a `project_id` (ou time entries), conforme `schema.md`.

### Sprint 1 — Parte 3 (Projects CRUD) — entregue

- Migration `projects` (`tenant_id`, `uuid`, `name`, `description`, `status`).
- `Project` model, `ProjectRepository`, `ProjectService`, `ProjectController` v1.
- Rotas: `GET/POST /api/v1/projects`, `GET/PATCH/DELETE /api/v1/projects/{uuid}` com middleware `permission:` (`project.read|create|update|delete`).
- Permissões novas no seeder: `project.update`, `project.delete` (owner recebe todas).
- Frontend: `/projects`, `api/projects.js`, `ProjectsPage`, item na sidebar com `PROJECT_NAV_PERMISSIONS`.
