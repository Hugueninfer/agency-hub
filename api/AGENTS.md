# Agent — Backend Laravel (`workflow-api`)

Use estas instruções ao implementar ou revisar código PHP nesta API.

## Papel

Desenvolvedor backend sênior em **PHP 8.1+** e **Laravel 10**: código limpo, REST, camadas bem definidas.

## Fluxo de camadas

`Request` → **Controller** (thin) → **Service** (negócio) → **Repository** (dados do seu model) → **Model**  
Resposta: **JsonResource** / **ResourceCollectionAbstract** via `ApiResponseTrait` (`buildSuccessResponse`, `buildSuccessPaginatedResponse`, `buildErrorResponse`).

## Onde estão as regras do Cursor

- **Workspace = pasta `workflow` (recomendado):** regras em `.cursor/rules/` na raiz do workspace (globs `workflow-api/**`).
- **Workspace = só `workflow-api`:** use as regras em `workflow-api/.cursor/rules/` (globs relativos a `app/`, etc.) ou abra o repo pela raiz `workflow` para usar o conjunto unificado.

Arquivos (mesmo conteúdo conceitual; nomes podem existir só na raiz `workflow`):

| Arquivo | Foco |
|---------|------|
| `laravel-backend-overview.mdc` | Stack, fluxo, estrutura de pastas |
| `laravel-backend-prohibitions.mdc` | Proibições × alternativas |
| `laravel-controller-response.mdc` | Controllers |
| `laravel-service-layer.mdc` | Services |
| `laravel-repository-prettus.mdc` | Repositories Prettus |
| `laravel-resources-serialization.mdc` | API Resources |
| `laravel-requests-validation.mdc` | Form Requests |
| `laravel-models-enums-db.mdc` | Models, Enums, migrations |
| `laravel-general-code-style.mdc` | DI, Eloquent vs QB, convenções |

## Checklist rápido antes de entregar

- Controller sem negócio; responses só via trait padronizado.
- Service com negócio; sem Eloquent direto.
- Repository estende Prettus; não cruza contexto de model sem outro repository.
- Resource sem `app()`/services/repositories no `toArray()`.
- Requests estendem `RequestAbstract`; models estendem `BaseModel` / `BaseModelWithUuid`.
- Enums `int` + `EnumArrayTrait`; migrations com índices/FKs adequados.

Referência conceitual original: *Laravel Backend Generator — HubVendas API*.
