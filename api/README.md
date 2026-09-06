# Workflow API

API REST em **Laravel** para o produto Workflow: projetos, tarefas, quadros, faturas, tempo e RBAC multi-tenant, com autenticação **Laravel Sanctum** (sessão SPA via cookie + CSRF).

## Requisitos

- **PHP** 8.3+
- **Composer** 2.x
- **Node.js** e npm (opcional mas recomendado: scripts `dev` e assets Vite do skeleton Laravel)
- **Extensões PHP** habituais do Laravel (openssl, pdo, mbstring, tokenizer, xml, ctype, json, fileinfo, etc.)

## Configuração rápida

```bash
cd workflow-api
composer install
cp .env.example .env
php artisan key:generate
```

Por defeito o `.env.example` usa **SQLite** (`DB_CONNECTION=sqlite`). Garanta o ficheiro da base de dados:

```bash
touch database/database.sqlite
php artisan migrate
```

Dados de desenvolvimento (tenant de exemplo, utilizadores `test@example.com` e `member@example.com` com palavra-passe `password`, permissões e papéis):

```bash
php artisan db:seed
```

Ou use o script Composer que inclui migrate (e opcionalmente npm):

```bash
composer run setup
```

## Variáveis de ambiente relevantes

| Variável | Notas |
|----------|--------|
| `APP_URL` | URL pública da API (ex. `http://127.0.0.1:8000`). |
| `DB_*` | SQLite por defeito; descomente e configure MySQL/PostgreSQL em produção. |
| `CORS_ALLOWED_ORIGINS` | Origens do frontend (ex. `http://localhost:5173`) quando há credenciais/cookies entre domínios. |
| `SANCTUM_STATEFUL_DOMAINS` | Hosts do SPA que enviam cookies de sessão (ver documentação Sanctum). |
| `SESSION_DRIVER` | `database` no exemplo; requer migrações aplicadas. |
| `QUEUE_CONNECTION` | `database` no exemplo; para filas em produção considere Redis. |
| `L5_SWAGGER_GENERATE_ALWAYS` | Em local pode ser `true`; em produção prefira `false` e gere docs com `composer run swagger`. |

## Executar em desenvolvimento

Servidor HTTP, fila, logs (Pail) e Vite em paralelo:

```bash
composer run dev
```

Apenas a API (por defeito em `http://127.0.0.1:8000`):

```bash
php artisan serve
```

## Rotas e documentação

- Prefixo das rotas REST: **`/api`** (ex.: `POST /api/v1/auth/login`).
- **Health check**: `GET /api/health` — JSON com `ok`, `service`, `timestamp`.
- **OpenAPI / Swagger UI** (darkaonline/l5-swagger): após gerar documentação, a UI fica em **`/api/documentation`** (configurável em `config/l5-swagger.php`).

Gerar/atualizar o JSON OpenAPI:

```bash
composer run swagger
# ou: php artisan l5-swagger:generate
```

## Testes

```bash
composer run test
# ou: php artisan test
```

## Arquitetura (resumo)

Fluxo: **Controller** → **Service** → **Repository** (Prettus) → **Model**; respostas JSON padronizadas com **JsonResource** e trait de resposta da API.

Mais detalhes para agentes e contribuidores: [`AGENTS.md`](AGENTS.md).

## Integração com o frontend (`workflow-web`)

O SPA deve obter cookie de sessão Sanctum (`GET /sanctum/csrf-cookie`), enviar `X-XSRF-TOKEN` em pedidos mutáveis e usar `credentials: 'include'`. O Vite do `workflow-web` pode fazer proxy de `/api` e `/sanctum` para esta API em `http://127.0.0.1:8000`.

## Licença

MIT (herança do skeleton Laravel; ajuste conforme a política do repositório).
