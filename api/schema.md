# Schema Constitution

## Status de aprovacao

- Estado atual: rascunho
- Implementacao de features: bloqueada ate aprovacao explicita

## Invariantes inviolaveis

1. Um tenant nunca pode acessar dados de outro tenant.
2. Toda entidade de dominio sensivel deve estar vinculada a `tenant_id`.
3. Contratos de API sao definidos antes da implementacao.
4. Mudancas de contrato exigem versionamento (`/v2/...`).
5. Dados pessoais devem atender LGPD e regulamentacoes europeias aplicaveis (ex.: GDPR).

## Multi-tenancy

### Estrategia

- Status: definido e aprovado para v1.
- Estrategia: single database com isolamento por `tenant_id` (row partition no nivel da aplicacao).
- Operacao de tenancy: plataforma fechada com criacao manual de tenant por admin da plataforma.

### Regras de isolamento

- Toda query deve filtrar por `tenant_id` quando aplicavel.
- Revisao obrigatoria de isolamento antes de merge.

## Planos e limites

- Modelo comercial definido: planos em EUR por quantidade de usuarios (`seat-based`).
- Definir:
  - nomenclatura dos tiers
  - faixas de usuarios por plano
  - limites por recurso (projetos, membros, armazenamento, automacoes)
  - regras de upgrade, downgrade e cancelamento

## Entidades principais

### Contexto de dominio identificado (preliminar)

- Organizacoes clientes com um contratante principal
- Equipes de freelancers vinculadas ao tenant
- Necessidade de unificar fluxos de tarefa, colaboracao visual e apontamento de tempo
- Proposta de valor central: reduzir fadiga de ferramentas consolidando gestao de tarefas, colaboracao visual, time tracking e faturamento.

### Tenant

- Atributos:
  - `id`, `uuid`
  - `name`
  - `legalName`
  - `taxId`
  - `email`
  - `timezone`
  - `currency` (EUR)
  - `status` (active, suspended, cancelled)
  - `createdAt`, `updatedAt`
- Relacoes:
  - 1:N `users`
  - 1:N `projects`
  - 1:N `clients`
  - 1:1 `subscription`
- Invariantes:
  - Nunca acessa ou referencia dados de outro tenant.

### User

- Atributos:
  - `id`, `uuid`
  - `tenantId`
  - `name`
  - `email`
  - `passwordHash`
  - `status`
  - `lastLoginAt`
  - `createdAt`, `updatedAt`
- Relacoes:
  - N:N `roles`
  - 1:N `taskComments`
  - 1:N `timeEntries`
- Invariantes:
  - `email` unico por tenant.

### Role

- Atributos: `id`, `tenantId`, `name`, `description`
- Relacoes: N:N `permissions`, N:N `users`
- Invariantes: nome unico por tenant.

### Permission

- Atributos: `id`, `code`, `description`
- Relacoes: N:N `roles`

### Project

- Atributos: `id`, `uuid`, `tenantId`, `name`, `description`, `status`
- Relacoes:
  - 1:N `tasks`
  - 1:N `boards`
  - 1:N `timeEntries`
  - N:1 `client`

### Client

- Atributos: `id`, `uuid`, `tenantId`, `name`, `email`, `billingAddress`
- Relacoes:
  - 1:N `projects`
  - 1:N `invoices`

### Task

- Atributos:
  - `id`, `uuid`, `tenantId`, `projectId`
  - `title`, `description`
  - `boardColumn` (kanban: `todo`, `in_progress`, `pendency`, `done`)
  - `position` (ordem dentro da coluna)
  - `dueDate` (opcional)
  - `createdBy` (utilizador opcional)
- Relacoes:
  - N:N `users` como assignees (`task_user`)
  - 1:N `taskComments`
  - 1:N `taskSubtasks`
  - 1:N `taskAttachments` (imagens em armazenamento publico)

### Board

- Atributos: `id`, `uuid`, `tenantId`, `projectId`, `name`, `dataJson`
- Relacoes: N:1 `project`

### TimeEntry

- Atributos:
  - `id`, `uuid`
  - `tenantId`, `projectId`, `clientId`, `userId`
  - `description`
  - `durationMinutes`
  - `entryDate`
- Invariantes:
  - `durationMinutes` maior que 0
  - Usuario so pode registrar no proprio tenant

### Invoice

- Atributos:
  - `id`, `uuid`
  - `tenantId`, `clientId`
  - `invoiceNumber`
  - `issueDate`, `dueDate`
  - `currency` (EUR)
  - `subtotalAmount`, `taxAmount`, `totalAmount`
  - `status` (draft, issued, paid, overdue, cancelled)
- Relacoes:
  - 1:N `invoiceItems`

### Subscription

- Atributos:
  - `id`, `tenantId`
  - `planCode`
  - `seatLimit`
  - `priceEurCents`
  - `billingCycle` (monthly)
  - `status`

### Tenant

- Atributos: a definir
- Relacoes: a definir
- Invariantes: a definir

### User

- Atributos: a definir
- Relacoes: a definir
- Invariantes: a definir

### Subscription

- Atributos: a definir
- Relacoes: a definir
- Invariantes: a definir

### Role / Permission

- Atributos: a definir
- Relacoes: a definir
- Invariantes: a definir

## Contratos de API principais

> Contract-first. Nao implementar endpoint sem request/response definidos.

### Auth

- `POST /api/v1/auth/login`
  - Request: a definir
  - Response: a definir
- `POST /api/v1/auth/refresh`
  - Request: a definir
  - Response: a definir
- `POST /api/v1/auth/logout`
  - Request: a definir
  - Response: a definir

### Tenant e usuarios

- `GET /api/v1/tenants/current`
  - Request: header auth
  - Response: tenant atual + limites do plano
- `GET /api/v1/users`
  - Request: filtros por status e role
  - Response: lista paginada de usuarios do tenant

### Tasks e kanban

- `GET /api/v1/tasks`
  - Request: `projectId`, `status`, `assignedUserId`, paginacao
  - Response: cards por filtro
- `POST /api/v1/tasks`
  - Request: dados do card
  - Response: card criado
- `PATCH /api/v1/tasks/{taskUuid}/status`
  - Request: novo status
  - Response: card atualizado

### Boards

- `GET /api/v1/boards`
  - Request: `projectId`
  - Response: lista de boards
- `POST /api/v1/boards`
  - Request: `projectId`, `name`, `dataJson`
  - Response: board criado
- `DELETE /api/v1/boards/{boardUuid}`
  - Request: sem body
  - Response: confirmacao de exclusao

### Timesheet

- `POST /api/v1/time-entries`
  - Request: `projectId`, `clientId`, `description`, `durationMinutes`, `entryDate`
  - Response: lancamento criado
- `GET /api/v1/time-entries`
  - Request: filtros por usuario, cliente, projeto e periodo
  - Response: lista paginada de lancamentos
- `GET /api/v1/time-entries/reports/by-client`
  - Request: periodo
  - Response: agregado por cliente e por usuario

### Invoices

- `POST /api/v1/invoices`
  - Request: dados de cliente e itens
  - Response: invoice criada
- `GET /api/v1/invoices`
  - Request: filtros por cliente, status e periodo
  - Response: lista paginada

### Billing

- `GET /api/v1/billing/subscription`
  - Request: a definir
  - Response: a definir
- `POST /api/v1/billing/checkout`
  - Request: a definir
  - Response: a definir
- `POST /api/v1/billing/webhooks`
  - Request: a definir
  - Response: a definir
