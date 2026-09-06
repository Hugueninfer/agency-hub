# Agency Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o repositório público e independente `Hugueninfer/agency-hub`, adicionar demonstrações isoladas com validade de 24 horas e publicar uma nova instalação Docker com MySQL no Render, sem modificar o Workflow ou o Railway.

**Architecture:** O Agency Hub manterá o monólito atual: React compilado e servido pelo container Laravel/Nginx, com MySQL e fila. A autenticação combinada usa cookie HttpOnly para contas pessoais e token opaco com hash persistido para demos; toda identidade resolve um tenant obrigatório antes dos controllers. Cada demo copia uma fixture versionada dentro de uma transação, aplica limites de uso e é removida após expirar.

**Tech Stack:** Laravel 13, PHP 8.4, Sanctum 4, PHPUnit 12, MySQL 8, React 19, Vite 8, Vitest/Testing Library a adicionar, Docker, Nginx, Supervisor e Render Blueprint.

**Spec:** `docs/superpowers/specs/2026-09-06-agency-hub-design.md` — durante a execução, copiar de `/home/huguenin/.codex/visualizations/2026/09/06/01a074ee-f7bb-7ca2-8b70-33f35f90ecc0/agency-hub-design.md` para o novo repositório.

## Global Constraints

- `Hugueninfer/workflow`, seu worktree, histórico, remote, banco e deploy Railway não podem ser modificados.
- O novo repositório será `Hugueninfer/agency-hub`, público e com histórico Git independente.
- O Render usará MySQL 8 novo e exclusivo; nenhum dado será migrado do Railway.
- `APP_MODE=combined`, `DEMO_TTL_HOURS=24`, `DEMO_MAX_ACTIVE=100` e `DEMO_MAX_WRITES=5000` serão os padrões.
- Credenciais pessoais usam cookie HttpOnly; credenciais demo usam Bearer opaco armazenado somente em `sessionStorage` e persistido no servidor apenas como SHA-256.
- Um header `Authorization` presente nunca poderá cair para uma sessão pessoal por cookie.
- Fixtures e screenshots usam somente dados fictícios.
- E-mail, webhooks Fathom e outros efeitos externos ficam bloqueados para tenants demo no backend.
- O deploy automático do Render fica desligado.
- Toda mudança de comportamento começa com teste falhando e termina com teste passando e commit focado.

---

## File map

### Backend — novos arquivos

- `api/app/Models/DemoToken.php`: token demo persistido por hash.
- `api/app/Http/Middleware/AuthenticateWorkspace.php`: precedência explícita entre Bearer demo e cookie pessoal.
- `api/app/Http/Middleware/EnforceDemoWriteBudget.php`: transação e orçamento para mutações demo.
- `api/app/Domain/Services/DemoSessionService.php`: criação, reset, logout e limpeza de demos.
- `api/app/Domain/Services/DemoFixtureService.php`: cópia transacional da fixture com novos IDs e datas relativas.
- `api/app/Domain/Exceptions/DemoCapacityExceeded.php`: falha 429 de capacidade.
- `api/app/Domain/Exceptions/DemoWriteLimitExceeded.php`: falha 429 de orçamento.
- `api/app/Console/Commands/CleanupExpiredDemos.php`: comando idempotente de limpeza.
- `api/app/Http/Controllers/V1/DemoAuthController.php`: endpoints públicos/protegidos de demo.
- `api/app/Http/Controllers/V1/ConfigController.php`: configuração pública mínima.
- `api/app/Http/Resources/V1/Auth/DemoSessionResource.php`: token e expiração.
- `api/app/Http/Resources/V1/ConfigResource.php`: modo e disponibilidade.
- `api/database/fixtures/demo.php`: dados fictícios imutáveis.
- `api/database/migrations/2026_09_06_000001_add_demo_lifecycle_to_tenants_table.php`: lifecycle e orçamento.
- `api/database/migrations/2026_09_06_000002_create_demo_tokens_table.php`: hashes de tokens.
- `api/database/migrations/2026_09_06_000003_cascade_tenant_cleanup.php`: cascatas ausentes.
- `api/tests/Feature/Api/DemoAuthenticationTest.php`: identidade e precedência.
- `api/tests/Feature/Api/DemoIsolationTest.php`: separação entre tenants.
- `api/tests/Feature/Api/DemoLifecycleTest.php`: expiração, reset, logout e cleanup.
- `api/tests/Feature/Api/DemoSafetyTest.php`: orçamento e efeitos externos.
- `api/tests/Unit/DemoFixtureServiceTest.php`: fixture, datas e vínculos.

### Backend — arquivos modificados

- `api/app/Models/Tenant.php`: casts, fillable e relações demo.
- `api/app/Models/User.php`: helper `isDemo()`.
- `api/app/Http/Controllers/V1/AuthController.php`: `is_demo` e `expires_at` em `/me`.
- `api/app/Http/Resources/V1/Auth/UserResource.php`: campos públicos da identidade.
- `api/app/Providers/AppServiceProvider.php`: rate limiter da criação demo.
- `api/bootstrap/app.php`: aliases e pipeline de autenticação.
- `api/routes/api.php`: config e rotas de demo.
- `api/routes/console.php`: agendamento defensivo local.
- `api/config/app.php`: `app_mode`.
- `api/config/services.php`: opções da demo.
- `api/.env.example`: configuração documentada.
- `api/database/seeders/DatabaseSeeder.php`: impedir credenciais padrão fora de `local`/`testing`.
- `api/app/Domain/Services/InvoiceService.php`: bloquear envio demo.
- `api/app/Http/Controllers/V1/FathomWebhookController.php`: bloquear automação demo.

### Frontend — novos arquivos

- `web/src/lib/demoSession.js`: storage e validade da credencial demo.
- `web/src/api/config.js`: configuração pública.
- `web/src/components/auth/DemoEntryCard.jsx`: CTA e estados da demo.
- `web/src/components/DemoBanner.jsx`: aviso persistente.
- `web/src/components/settings/DemoResetCard.jsx`: restauração confirmada.
- `web/src/pages/LoginPage.test.jsx`: fluxos de entrada.
- `web/src/context/AuthProvider.test.jsx`: reload, expiração e logout.
- `web/src/lib/demoSession.test.js`: unidade do storage.

### Frontend — arquivos modificados

- `web/package.json`: Vitest, jsdom e Testing Library.
- `web/vite.config.js`: configuração de testes.
- `web/src/api/client.js`: Bearer demo e 401.
- `web/src/api/auth.js`: create/reset/logout demo.
- `web/src/context/AuthProvider.jsx`: identidade combinada.
- `web/src/lib/authSession.js`: separar estado pessoal de demo.
- `web/src/pages/LoginPage.jsx`: layout e CTA demo.
- `web/src/pages/SettingsMenuPage.jsx`: reset da demo.
- `web/src/App.jsx`: banner no shell autenticado.
- `web/src/index.css`: estados responsivos e acessíveis.

### Entrega e documentação

- `.dockerignore`: excluir segredos e artefatos.
- `.env.render.example`: variáveis do Agency Hub.
- `render.yaml`: serviço web, MySQL privado, disco e cron.
- `Dockerfile`: health/deploy compatíveis com Render.
- `start.sh`: migrations com falha fatal e startup seguro.
- `README.md`: documento de portfólio.
- `README.en.md`: versão inglesa.
- `docs/screenshots/*`: prints reais desktop/mobile.
- `docs/operations/render.md`: provisionamento, backup, rollback e conta pessoal.
- `docs/superpowers/specs/2026-09-06-agency-hub-design.md`: especificação aprovada.
- `docs/superpowers/plans/2026-09-06-agency-hub.md`: este plano.

---

### Task 1: Create the independent Agency Hub repository locally

**Files:**
- Create: `/home/huguenin/projects/pedro/agency-hub/**`
- Create: `docs/superpowers/specs/2026-09-06-agency-hub-design.md`
- Create: `docs/superpowers/plans/2026-09-06-agency-hub.md`
- Modify: `.gitignore`
- Modify: `.dockerignore`
- Delete from new repository only: `api/coverage-out.txt`, `api/phpdbg-out.txt`, `api/test-coverage-full.txt`, `api/coverage-err.txt`, `api/build-out.txt`, `api/build/dbg-exit.txt`, `api/build/dbg-out.txt`, `api/build/dbg-cmd.txt`

**Interfaces:**
- Consumes: source tree at `/home/huguenin/projects/pedro/workflow` and the approved spec/plan artifacts.
- Produces: clean Git repository at `/home/huguenin/projects/pedro/agency-hub` with no shared `.git` state.

- [ ] **Step 1: Capture the immutable baseline of Workflow**

Run:

```bash
git -C /home/huguenin/projects/pedro/workflow status --porcelain=v1
git -C /home/huguenin/projects/pedro/workflow rev-parse HEAD
git -C /home/huguenin/projects/pedro/workflow remote -v
```

Expected: clean status and recorded HEAD/remote for the final non-regression comparison.

- [ ] **Step 2: Copy tracked source without Git metadata**

Use a temporary tar stream built from tracked files only:

```bash
mkdir -p /home/huguenin/projects/pedro/agency-hub
git -C /home/huguenin/projects/pedro/workflow archive HEAD | tar -x -C /home/huguenin/projects/pedro/agency-hub
```

Expected: the new directory contains source files and no `.git` directory.

- [ ] **Step 3: Add the approved design and implementation plan**

Copy the exact approved artifacts into:

```text
docs/superpowers/specs/2026-09-06-agency-hub-design.md
docs/superpowers/plans/2026-09-06-agency-hub.md
```

Use `apply_patch` for both files; do not modify the originals or Workflow.

- [ ] **Step 4: Remove generated diagnostics and harden ignore files**

Delete only the listed generated files from the new directory. Add these exact patterns:

```gitignore
.env
.env.*
!.env.example
!.env.render.example
api/vendor/
api/storage/logs/*.log
api/coverage*.txt
api/phpdbg*.txt
api/build/
web/node_modules/
web/dist/
docs/screenshots/.auth/
```

Add these exact `.dockerignore` patterns:

```dockerignore
.git
.github
.env
.env.*
!.env.example
!.env.render.example
**/node_modules
**/vendor
**/*.log
api/build
api/coverage*.txt
api/phpdbg*.txt
docs/screenshots
```

- [ ] **Step 5: Initialize independent history and verify separation**

Run:

```bash
git -C /home/huguenin/projects/pedro/agency-hub init -b main
git -C /home/huguenin/projects/pedro/agency-hub status --short
git -C /home/huguenin/projects/pedro/agency-hub rev-parse --git-dir
git -C /home/huguenin/projects/pedro/workflow status --porcelain=v1
```

Expected: Agency Hub Git dir is `/home/huguenin/projects/pedro/agency-hub/.git`; Workflow remains at the captured baseline.

- [ ] **Step 6: Scan the new tree for secrets before its first commit**

Run:

```bash
git -C /home/huguenin/projects/pedro/agency-hub grep -nE 'APP_KEY=base64:[A-Za-z0-9+/=]{20,}|DB_PASSWORD=.+|POSTMARK_TOKEN=.+|MAIL_PASSWORD=.+|AWS_SECRET_ACCESS_KEY=.+' -- ':!*.example' || true
git -C /home/huguenin/projects/pedro/agency-hub status --short
```

Expected: no credential matches outside example files.

- [ ] **Step 7: Commit the clean baseline**

```bash
git -C /home/huguenin/projects/pedro/agency-hub add .
git -C /home/huguenin/projects/pedro/agency-hub commit -m "chore: initialize Agency Hub"
```

---

### Task 2: Add demo lifecycle schema and model contracts

**Files:**
- Create: `api/database/migrations/2026_09_06_000001_add_demo_lifecycle_to_tenants_table.php`
- Create: `api/database/migrations/2026_09_06_000002_create_demo_tokens_table.php`
- Create: `api/database/migrations/2026_09_06_000003_cascade_tenant_cleanup.php`
- Create: `api/app/Models/DemoToken.php`
- Modify: `api/app/Models/Tenant.php`
- Modify: `api/app/Models/User.php`
- Test: `api/tests/Feature/Api/DemoLifecycleTest.php`

**Interfaces:**
- Consumes: existing `Tenant`, `User`, Sanctum migrations and MySQL connection.
- Produces: `Tenant::isDemo(): bool`, `Tenant::demoTokens(): HasMany`, `User::isDemo(): bool`, and `DemoToken` with `digest`, `tenant_id`, `user_id`, `expires_at`.

- [ ] **Step 1: Write failing migration/model tests**

Add tests that create a personal tenant and a demo tenant, assert casts, attach a token, delete the demo tenant and assert its token/users/roles/projects disappear while the personal tenant remains.

Core assertions:

```php
$demo = Tenant::factory()->create([
    'kind' => 'demo',
    'expires_at' => now()->addHours(24),
]);

$this->assertTrue($demo->fresh()->isDemo());
$this->assertFalse($personal->fresh()->isDemo());
$this->assertInstanceOf(CarbonInterface::class, $demo->fresh()->expires_at);
```

- [ ] **Step 2: Verify the tests fail before migrations exist**

Run:

```bash
cd api
php artisan test --filter=DemoLifecycleTest
```

Expected: FAIL because `kind`, `expires_at`, `demo_write_count` and `demo_tokens` do not exist.

- [ ] **Step 3: Implement schema with MySQL-safe columns and indexes**

Migration contract:

```php
$table->string('kind', 16)->default('personal')->index();
$table->timestamp('expires_at')->nullable()->index();
$table->unsignedBigInteger('demo_write_count')->default(0);
```

Token table contract:

```php
$table->char('digest', 64)->primary();
$table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
$table->foreignId('user_id')->constrained()->cascadeOnDelete();
$table->timestamp('expires_at')->index();
$table->timestamps();
$table->index(['tenant_id', 'expires_at']);
```

Replace non-cascading tenant FKs on `users` and `roles` with `cascadeOnDelete()`. Verify all remaining domain tables either cascade from `tenants` or cascade through users/tasks.

- [ ] **Step 4: Implement model contracts**

`Tenant::isDemo()` and `User::isDemo()` must use the tenant kind, not email/name conventions:

```php
public function isDemo(): bool
{
    return $this->kind === 'demo';
}
```

`DemoToken` uses `digest` as non-incrementing string primary key, hides `digest`, casts `expires_at` to datetime and defines tenant/user relations.

- [ ] **Step 5: Run migrations and focused tests on MySQL**

Run:

```bash
cd api
php artisan migrate:fresh --env=testing
php artisan test --filter=DemoLifecycleTest
```

Expected: PASS; tenant deletion removes only its graph.

- [ ] **Step 6: Commit schema**

```bash
git add api/app/Models api/database/migrations api/tests/Feature/Api/DemoLifecycleTest.php
git commit -m "feat: add demo tenant lifecycle schema"
```

---

### Task 3: Implement deterministic fictional demo fixtures

**Files:**
- Create: `api/database/fixtures/demo.php`
- Create: `api/app/Domain/Services/DemoFixtureService.php`
- Test: `api/tests/Unit/DemoFixtureServiceTest.php`
- Modify: `api/database/seeders/DatabaseSeeder.php`

**Interfaces:**
- Consumes: `Tenant $tenant`, `User $owner`, `CarbonImmutable $now`.
- Produces: `DemoFixtureService::seed(Tenant $tenant, User $owner, CarbonImmutable $now): void` and `DemoFixtureService::clear(Tenant $tenant): void`.

- [ ] **Step 1: Write failing fixture tests**

Test these exact invariants:

- two seeded tenants have disjoint UUID sets;
- all `tenant_id` values match the destination tenant;
- task/project/user foreign keys stay inside that tenant;
- relative due dates are based on injected `$now`;
- the source array is unchanged after two calls;
- a forced exception midway rolls back the entire graph.

Representative assertions:

```php
$service->seed($firstTenant, $firstOwner, CarbonImmutable::parse('2026-09-06T12:00:00Z'));
$service->seed($secondTenant, $secondOwner, CarbonImmutable::parse('2026-09-07T12:00:00Z'));

$this->assertEmpty(array_intersect(
    Project::whereTenantId($firstTenant->id)->pluck('uuid')->all(),
    Project::whereTenantId($secondTenant->id)->pluck('uuid')->all(),
));
```

- [ ] **Step 2: Verify fixture tests fail**

```bash
cd api
php artisan test --filter=DemoFixtureServiceTest
```

Expected: FAIL because the service and fixture are absent.

- [ ] **Step 3: Define the immutable fixture**

Use stable symbolic keys, not production IDs. The file returns arrays with these minimum records:

- tenant: `Northstar Creative`, `hello@northstar.example`;
- users: `Alex Morgan` owner, `Maya Chen` member, `Leo Martins` member;
- projects: `Aurora Rebrand`, `Nimbus Launch`, `Internal Operations`;
- tasks: at least two in each status `todo`, `development`, `pending`, `done`;
- one checklist and two comments on a highlighted task;
- eight time entries across the current and prior week;
- invoices `INV-2026-001`, `INV-2026-002`, `INV-2026-003` in draft/sent/paid states;
- two boards with valid Excalidraw scene JSON;
- notifications and default preferences;
- complete owner/member roles, permissions and menu configuration.

Emails must end in `.example`; all names, companies, invoice numbers and comments are fictional.

- [ ] **Step 4: Implement transactional key mapping**

`seed()` starts from a deep copied fixture array, generates UUIDs for symbolic keys, rebases dates relative to `$now`, and inserts in FK order inside the caller transaction. It must never read another tenant as a source.

`clear()` deletes domain data in child-first order but preserves the tenant, owner, active demo token and lifecycle fields needed by reset. It removes any secondary fixture users and recreates them during `seed()`.

- [ ] **Step 5: Restrict the legacy DatabaseSeeder**

At the start of `run()` add:

```php
if (! app()->environment(['local', 'testing'])) {
    throw new RuntimeException('DatabaseSeeder is disabled outside local/testing.');
}
```

Keep local developer accounts documented only in `api/README.md`; they must never be invoked by Render startup.

- [ ] **Step 6: Run fixture and existing tests**

```bash
cd api
php artisan test --filter=DemoFixtureServiceTest
php artisan test
```

Expected: all tests PASS.

- [ ] **Step 7: Commit fixture support**

```bash
git add api/database/fixtures api/app/Domain/Services/DemoFixtureService.php api/tests/Unit/DemoFixtureServiceTest.php api/database/seeders/DatabaseSeeder.php
git commit -m "feat: add isolated Agency Hub demo fixture"
```

---

### Task 4: Implement combined personal and demo authentication

**Files:**
- Create: `api/app/Http/Middleware/AuthenticateWorkspace.php`
- Create: `api/app/Domain/Services/DemoSessionService.php`
- Create: `api/app/Http/Controllers/V1/DemoAuthController.php`
- Create: `api/app/Http/Controllers/V1/ConfigController.php`
- Create: `api/app/Http/Resources/V1/Auth/DemoSessionResource.php`
- Create: `api/app/Http/Resources/V1/ConfigResource.php`
- Modify: `api/bootstrap/app.php`
- Modify: `api/routes/api.php`
- Modify: `api/app/Providers/AppServiceProvider.php`
- Modify: `api/app/Http/Resources/V1/Auth/UserResource.php`
- Modify: `api/config/app.php`
- Modify: `api/config/services.php`
- Modify: `api/.env.example`
- Test: `api/tests/Feature/Api/DemoAuthenticationTest.php`

**Interfaces:**
- Consumes: `DemoFixtureService`, `Tenant`, `User`, `DemoToken`.
- Produces: `DemoSessionService::create(): array{token:string, expires_at:CarbonImmutable}`, `reset(User $user): void`, `logout(string $plainToken): void`, plus authenticated request user/tenant resolution.

- [ ] **Step 1: Write failing API tests**

Cover:

```php
$response = $this->postJson('/api/v1/auth/demo');
$response->assertCreated()->assertJsonStructure([
    'success', 'message', 'data' => ['access_token', 'expires_at'],
]);
```

Also assert:

- `/api/v1/config` exposes only `app_mode` and `demo_available`;
- returned plaintext token is absent from `demo_tokens`;
- `hash('sha256', $token)` exists;
- Bearer token resolves the correct user in `/auth/me`;
- invalid Bearer plus a valid personal cookie returns 401;
- expired Bearer plus a valid personal cookie returns 401;
- no Bearer still allows the personal cookie path;
- `APP_MODE=personal` makes demo endpoints return 404.

- [ ] **Step 2: Run the focused tests and confirm failure**

```bash
cd api
php artisan test --filter=DemoAuthenticationTest
```

Expected: FAIL with missing routes/services.

- [ ] **Step 3: Implement configuration and rate limiting**

Environment contract:

```dotenv
APP_MODE=combined
DEMO_TTL_HOURS=24
DEMO_MAX_ACTIVE=100
DEMO_MAX_WRITES=5000
```

Validate `APP_MODE` against `personal`, `demo`, `combined`; clamp TTL to 1–48 hours. Define `RateLimiter::for('demo-create')` as five attempts per minute per IP and twenty per day per IP.

- [ ] **Step 4: Implement token creation**

Within one `DB::transaction`, lock the capacity check, create tenant/user/owner role, call fixture seeding, create 48-byte `random_bytes` token encoded with URL-safe Base64, persist only `hash('sha256', $plainToken)` and return plaintext only in the response.

The endpoint must return 429 when active demo capacity is reached and 404 when the configured mode excludes demos.

- [ ] **Step 5: Implement explicit credential precedence**

`AuthenticateWorkspace` must branch before consulting the personal guard:

```php
$plain = $request->bearerToken();
if ($request->headers->has('Authorization')) {
    abort_unless(is_string($plain) && $plain !== '', 401);
    $token = DemoToken::with(['user.tenant'])
        ->whereKey(hash('sha256', $plain))
        ->where('expires_at', '>', now())
        ->first();
    abort_unless($token?->user?->tenant?->kind === 'demo', 401);
    abort_unless($token->user->tenant->expires_at?->isFuture(), 401);
    Auth::setUser($token->user);
    $request->setUserResolver(fn () => $token->user);
} else {
    $user = Auth::guard('sanctum')->user();
    abort_unless($user !== null, 401);
    $request->setUserResolver(fn () => $user);
}
```

Register as `workspace.auth`. Replace `auth:sanctum` on protected API routes with `workspace.auth`, keeping `tenant` immediately after it.

- [ ] **Step 6: Expose safe identity fields**

`UserResource` returns:

```php
'is_demo' => $this->user->isDemo(),
'expires_at' => $this->user->tenant?->expires_at?->toIso8601String(),
```

Never return token digests, numeric tenant IDs or internal DB credentials.

- [ ] **Step 7: Run auth and regression tests**

```bash
cd api
php artisan test --filter=DemoAuthenticationTest
php artisan test
```

Expected: all tests PASS.

- [ ] **Step 8: Commit authentication**

```bash
git add api/app api/bootstrap/app.php api/routes/api.php api/config api/.env.example api/tests/Feature/Api/DemoAuthenticationTest.php
git commit -m "feat: add secure 24-hour demo authentication"
```

---

### Task 5: Implement reset, logout, expiry cleanup and write limits

**Files:**
- Create: `api/app/Http/Middleware/EnforceDemoWriteBudget.php`
- Create: `api/app/Console/Commands/CleanupExpiredDemos.php`
- Create: `api/app/Domain/Exceptions/DemoCapacityExceeded.php`
- Create: `api/app/Domain/Exceptions/DemoWriteLimitExceeded.php`
- Modify: `api/app/Domain/Services/DemoSessionService.php`
- Modify: `api/app/Http/Controllers/V1/DemoAuthController.php`
- Modify: `api/bootstrap/app.php`
- Modify: `api/routes/api.php`
- Modify: `api/routes/console.php`
- Test: `api/tests/Feature/Api/DemoLifecycleTest.php`
- Test: `api/tests/Feature/Api/DemoSafetyTest.php`

**Interfaces:**
- Consumes: authenticated demo user and bearer token.
- Produces: `POST /auth/demo/reset`, `POST /auth/demo/logout`, `demo:cleanup --limit=100`, and atomic per-request write budget.

- [ ] **Step 1: Write failing lifecycle tests**

Assert:

- reset restores only the caller fixture and does not extend expiration;
- personal user receives 404 for reset/logout demo endpoints;
- logout deletes only the presented digest;
- expired token returns 401 before controller execution;
- cleanup deletes expired tenants and preserves active/personal tenants;
- two concurrent cleanup attempts do not double-process;
- unsafe request at exhausted budget returns 429 and does not mutate domain data.

- [ ] **Step 2: Verify the tests fail**

```bash
cd api
php artisan test --filter='DemoLifecycleTest|DemoSafetyTest'
```

Expected: FAIL for absent endpoints, command and middleware.

- [ ] **Step 3: Implement reset and logout**

`reset()` locks the tenant row, confirms `kind=demo` and active expiry, clears domain records, resets `demo_write_count` to zero and reseeds within one transaction. It preserves the active token and original `expires_at`.

`logout()` hashes the presented Bearer token and deletes only the row matching both digest and authenticated tenant.

- [ ] **Step 4: Implement atomic write-budget middleware**

For unsafe methods and demo tenants, wrap the downstream request in `DB::transaction`. Atomically reserve one write operation:

```php
$updated = Tenant::query()
    ->whereKey($tenant->id)
    ->where('kind', 'demo')
    ->where('demo_write_count', '<', config('services.demo.max_writes'))
    ->increment('demo_write_count');

throw_if($updated !== 1, DemoWriteLimitExceeded::class);
```

If downstream returns status 400 or greater, roll back the reservation and any domain mutation by throwing an internal response-carrying exception and returning its response outside the transaction. Exclude `/auth/demo/reset` and `/auth/demo/logout` from budget consumption.

- [ ] **Step 5: Implement idempotent batched cleanup**

`demo:cleanup --limit=100` obtains MySQL named lock `GET_LOCK('agency-hub-demo-cleanup', 0)`, selects expired demo tenant IDs ordered by expiration with the provided limit, deletes each tenant in a short transaction, reports the count and always calls `RELEASE_LOCK`.

Register a daily fallback schedule in `routes/console.php`:

```php
Schedule::command('demo:cleanup --limit=100')->hourly()->withoutOverlapping();
```

The Render Cron Job remains the production trigger; this schedule supports environments that run `schedule:work`.

- [ ] **Step 6: Run lifecycle, safety and full backend tests**

```bash
cd api
php artisan test --filter='DemoLifecycleTest|DemoSafetyTest'
php artisan test
```

Expected: all tests PASS.

- [ ] **Step 7: Commit lifecycle operations**

```bash
git add api/app api/bootstrap/app.php api/routes api/tests/Feature/Api/DemoLifecycleTest.php api/tests/Feature/Api/DemoSafetyTest.php
git commit -m "feat: enforce demo lifecycle and usage limits"
```

---

### Task 6: Block external side effects for demo tenants

**Files:**
- Modify: `api/app/Domain/Services/InvoiceService.php`
- Modify: `api/app/Http/Controllers/V1/FathomWebhookController.php`
- Modify: `api/app/Jobs/ProcessFathomMeetingJob.php`
- Test: `api/tests/Feature/Api/DemoSafetyTest.php`

**Interfaces:**
- Consumes: `User::isDemo()` and tenant context.
- Produces: deterministic 403 response before mail/webhook/provider side effects.

- [ ] **Step 1: Add failing side-effect tests**

Use `Mail::fake()` and `Queue::fake()`. Authenticate as demo, call invoice send, assert 403 and `Mail::assertNothingSent()`. Call a demo-bound Fathom flow, assert no job or outbound request is dispatched. Repeat invoice send as personal user and assert the existing behavior still occurs.

- [ ] **Step 2: Verify the tests fail**

```bash
cd api
php artisan test --filter=DemoSafetyTest
```

Expected: FAIL because demo currently reaches external-effect code.

- [ ] **Step 3: Add backend guards at service boundaries**

Before queueing mail or processing integration data:

```php
if ($actor->isDemo()) {
    abort(403, 'External actions are disabled in demonstrations.');
}
```

Do not rely on hidden frontend buttons. Keep invoice creation/editing available; block only delivery and live integration effects.

- [ ] **Step 4: Run safety and complete backend tests**

```bash
cd api
php artisan test --filter=DemoSafetyTest
php artisan test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit safety boundaries**

```bash
git add api/app/Domain/Services/InvoiceService.php api/app/Http/Controllers/V1/FathomWebhookController.php api/app/Jobs/ProcessFathomMeetingJob.php api/tests/Feature/Api/DemoSafetyTest.php
git commit -m "fix: prevent external effects from demo tenants"
```

---

### Task 7: Add frontend test infrastructure and demo credential storage

**Files:**
- Modify: `web/package.json`
- Modify: `web/vite.config.js`
- Create: `web/src/test/setup.js`
- Create: `web/src/lib/demoSession.js`
- Create: `web/src/lib/demoSession.test.js`
- Modify: `web/src/api/client.js`
- Modify: `web/src/api/auth.js`
- Create: `web/src/api/config.js`

**Interfaces:**
- Produces: `loadDemoSession()`, `saveDemoSession(session)`, `clearDemoSession()`, `hasDemoIntent()`, and API calls `createDemo()`, `resetDemo()`, `logoutDemo()`.
- Storage shape: `{ accessToken: string, expiresAt: string }` under `agency-hub.demo` in `sessionStorage`.

- [ ] **Step 1: Install exact test dependencies**

```bash
cd web
npm install --save-dev vitest@latest jsdom@latest @testing-library/react@latest @testing-library/jest-dom@latest @testing-library/user-event@latest
```

Add scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Write failing storage tests**

Test valid load, malformed JSON removal, expired token removal, explicit clear and tab-scoped sessionStorage. Mock `Date.now()` for deterministic expiration.

```js
saveDemoSession({ accessToken: "secret", expiresAt: "2099-01-01T00:00:00Z" });
expect(loadDemoSession()).toEqual({
  accessToken: "secret",
  expiresAt: "2099-01-01T00:00:00Z",
});
```

- [ ] **Step 3: Confirm failure**

```bash
cd web
npm test -- src/lib/demoSession.test.js
```

Expected: FAIL because the module is absent.

- [ ] **Step 4: Implement strict session storage**

Reject missing strings, invalid dates and expiration at or before current time. Never write the token to localStorage, cookies, console output, URLs or error messages.

- [ ] **Step 5: Add Bearer handling to the HTTP client**

When a valid demo session exists, set:

```js
headers.set("Authorization", `Bearer ${demo.accessToken}`);
```

For demo requests use `credentials: "omit"`; for personal requests retain `credentials: "include"` and CSRF behavior. On 401 clear only the active identity state and dispatch `api:unauthorized` with `{ detail: { wasDemo: true } }` when applicable.

- [ ] **Step 6: Implement auth/config API functions**

Use the existing response envelope and exact routes:

```js
export const createDemo = () => apiRequest("/api/v1/auth/demo", { method: "POST", json: {}, skipAuthEvent: true });
export const resetDemo = () => apiRequest("/api/v1/auth/demo/reset", { method: "POST", json: {} });
export const logoutDemo = () => apiRequest("/api/v1/auth/demo/logout", { method: "POST", json: {} });
```

- [ ] **Step 7: Run unit tests, lint and build**

```bash
cd web
npm test -- src/lib/demoSession.test.js
npm run lint
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 8: Commit client identity support**

```bash
git add web/package.json web/package-lock.json web/vite.config.js web/src/test web/src/lib/demoSession.js web/src/lib/demoSession.test.js web/src/api
git commit -m "test: add frontend demo session foundation"
```

---

### Task 8: Build the combined login, demo banner and reset experience

**Files:**
- Create: `web/src/components/auth/DemoEntryCard.jsx`
- Create: `web/src/components/DemoBanner.jsx`
- Create: `web/src/components/settings/DemoResetCard.jsx`
- Modify: `web/src/context/AuthProvider.jsx`
- Modify: `web/src/lib/authSession.js`
- Modify: `web/src/pages/LoginPage.jsx`
- Modify: `web/src/pages/SettingsMenuPage.jsx`
- Modify: `web/src/App.jsx`
- Modify: `web/src/index.css`
- Test: `web/src/pages/LoginPage.test.jsx`
- Test: `web/src/context/AuthProvider.test.jsx`

**Interfaces:**
- Consumes: Task 7 demo storage/API functions and `/auth/me` fields `is_demo`, `expires_at`.
- Produces: auth context members `identityKind`, `startDemo()`, `resetDemo()`, identity-aware `logout()`.

- [ ] **Step 1: Write failing interaction tests**

Cover:

- personal form submits `login(email,password)`;
- demo CTA works with empty personal fields;
- CTA disables immediately and one double click creates one request;
- successful demo stores the token, fetches `/me` and navigates to `/`;
- reload restores a valid demo;
- expired demo clears storage and returns to `/login` with a message;
- banner/reset render only for `is_demo=true`;
- demo logout calls demo endpoint; personal logout calls personal endpoint.

- [ ] **Step 2: Confirm the UI tests fail**

```bash
cd web
npm test -- src/pages/LoginPage.test.jsx src/context/AuthProvider.test.jsx
```

Expected: FAIL because combined identity functions/components are absent.

- [ ] **Step 3: Refactor AuthProvider around explicit identity kind**

Use `identityKind: "personal" | "demo" | null`. `startDemo()` creates and saves the demo session before fetching `/me`; if `/me` fails, clear the token. `login()` clears demo state before personal CSRF/login. `logout()` snapshots identity kind, clears local state first, then calls the matching remote endpoint best-effort.

- [ ] **Step 4: Build the login layout**

Keep existing design tokens. Desktop uses a split card with product statement and two distinct actions; mobile stacks them. Required copy:

```text
Agency Hub
Projetos, tarefas, horas e faturamento em um só workspace.

Entrar na minha conta
Use seu acesso pessoal ao workspace.

Experimentar demonstração
Sem cadastro. Dados fictícios em um espaço exclusivo por 24 horas.
```

Errors use `role="alert"`; progress uses `aria-busy`; buttons retain visible keyboard focus.

- [ ] **Step 5: Add banner and reset**

Banner copy:

```text
Demonstração · seus dados fictícios ficam neste espaço por 24 horas.
```

Reset confirmation states that all current demo changes will be replaced and only this demo is affected. After success, refetch `/auth/me` and invalidate page data by reloading route state once.

- [ ] **Step 6: Run frontend verification**

```bash
cd web
npm test
npm run lint
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit combined UI**

```bash
git add web/src web/package.json web/package-lock.json web/vite.config.js
git commit -m "feat: add 24-hour Agency Hub demo experience"
```

---

### Task 9: Prepare safe Docker and Render infrastructure

**Files:**
- Create: `.env.render.example`
- Create: `render.yaml`
- Create: `docs/operations/render.md`
- Modify: `Dockerfile`
- Modify: `start.sh`
- Modify: `nginx.conf`
- Modify: `supervisord.conf`
- Modify: `api/config/session.php`
- Test: container health and startup checks.

**Interfaces:**
- Consumes: application image, MySQL host/credentials and demo cleanup command.
- Produces: `agency-hub` web service, `agency-hub-mysql` private service, `agency-hub-demo-cleanup` cron and persistent disks.

- [ ] **Step 1: Write failing infrastructure checks**

Run before changing files:

```bash
test -f render.yaml
rg 'APP_MODE.*combined' render.yaml
rg 'demo:cleanup' render.yaml
docker build -t agency-hub:plan .
```

Expected: file checks FAIL because the Agency Hub blueprint does not exist; record whether the baseline image builds.

- [ ] **Step 2: Fix startup failure semantics**

Remove `|| echo "[start] Migrate skipped"`; a failed production migration must stop startup. Keep config cache after environment injection. Add an application health check that proves PHP and routing are live without touching authenticated data.

Remove the duplicate `CMD ["/start.sh"]` from the Dockerfile. Pin MySQL-compatible PHP extensions already used by the app. Ensure Supervisor treats PHP-FPM, Nginx and queue worker failures as service failures.

- [ ] **Step 3: Create exact Render environment contract**

`.env.render.example` documents names only:

```dotenv
APP_NAME=Agency Hub
APP_ENV=production
APP_DEBUG=false
APP_KEY=
APP_MODE=combined
APP_URL=https://agency-hub.onrender.com
ASSET_URL=https://agency-hub.onrender.com
DB_CONNECTION=mysql
DB_HOST=agency-hub-mysql
DB_PORT=3306
DB_DATABASE=agency_hub
DB_USERNAME=agency_hub
DB_PASSWORD=
SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
SECURITY_HSTS_ENABLED=true
CORS_ALLOWED_ORIGINS=https://agency-hub.onrender.com
SANCTUM_STATEFUL_DOMAINS=agency-hub.onrender.com
QUEUE_CONNECTION=database
FILESYSTEM_DISK=public
DEMO_TTL_HOURS=24
DEMO_MAX_ACTIVE=100
DEMO_MAX_WRITES=5000
API_DOCS_ENABLED=false
```

- [ ] **Step 4: Create Render Blueprint**

Define:

- Docker web service `agency-hub`, health `/api/health`, `autoDeployTrigger: off`, persistent disk at `/app/storage/app/public`;
- image-backed private service `agency-hub-mysql` using immutable MySQL 8 image tag and disk at `/var/lib/mysql`;
- Docker cron `agency-hub-demo-cleanup` running `php artisan demo:cleanup --limit=100` hourly;
- generated secrets for `APP_KEY`, `DB_PASSWORD`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` where Blueprint supports generation; otherwise `sync: false` with exact dashboard instructions;
- shared internal DB host only, never a public database URL.

- [ ] **Step 5: Document bootstrap, backup and rollback**

The runbook includes exact commands:

```bash
php artisan migrate --force
php artisan agency:account create owner@example.com
php artisan demo:cleanup --limit=100
mysqldump --single-transaction --routines --triggers -h "$DB_HOST" -u "$DB_USERNAME" -p "$DB_DATABASE" > agency-hub.sql
mysql -h "$DB_HOST" -u "$DB_USERNAME" -p "$DB_DATABASE" < agency-hub.sql
```

The account command must prompt for a password without echo and refuse passwords shorter than 15 characters. Document that disk snapshots are not logical MySQL backups.

- [ ] **Step 6: Build and smoke-test locally**

```bash
docker build -t agency-hub:local .
docker compose up -d --build
docker compose exec app php artisan migrate:fresh --force
curl --fail http://127.0.0.1:8080/api/health
curl --fail -X POST http://127.0.0.1:8080/api/v1/auth/demo -H 'Accept: application/json'
docker compose logs --no-color app
```

Expected: health 200, demo 201, no secrets or plaintext demo token in server logs. Stop services without deleting volumes until inspection is complete.

- [ ] **Step 7: Commit infrastructure**

```bash
git add .env.render.example render.yaml docs/operations Dockerfile start.sh nginx.conf supervisord.conf api/config/session.php
git commit -m "ops: prepare independent Render deployment"
```

---

### Task 10: Run the full security and quality gate

**Files:**
- Modify only files implicated by failing checks.
- Test: all backend, frontend, Docker and tenant-boundary checks.

**Interfaces:**
- Consumes: completed local Agency Hub implementation.
- Produces: evidence that the build is safe to publish.

- [ ] **Step 1: Verify backend quality**

```bash
cd api
php artisan config:clear
php artisan route:list --path=api/v1
php artisan test
vendor/bin/pint --test
composer audit
```

Expected: all tests/checks pass; route list shows demo creation public and reset/logout protected by workspace authentication.

- [ ] **Step 2: Verify frontend quality**

```bash
cd web
npm ci
npm test
npm run lint
npm run build
npm audit --omit=dev
```

Expected: exit 0; any audit exception must be documented with package, advisory and why no safe upgrade exists before publication.

- [ ] **Step 3: Verify secrets and repository contents**

```bash
git grep -nE 'APP_KEY=base64:[A-Za-z0-9+/=]{20,}|DB_PASSWORD=.+|POSTMARK_TOKEN=.+|MAIL_PASSWORD=.+|AWS_SECRET_ACCESS_KEY=.+' -- ':!*.example' || true
git ls-files | rg '(^|/)(\.env$|.*\.pem$|.*\.key$|id_rsa|credentials|secrets?)' && exit 1 || true
git status --short
```

Expected: no secrets, private keys, real `.env` files or uncommitted build artifacts.

- [ ] **Step 4: Run adversarial tenant checks**

Use test-created demo A, demo B and personal user. For every resource family—project, task, board, time entry, invoice, notification—attempt show/update/delete using foreign UUIDs. Expected: 404 or 403 with no data difference in the foreign tenant. Verify invalid Bearer never authenticates the personal cookie.

- [ ] **Step 5: Rebuild the production image**

```bash
docker build --no-cache -t agency-hub:release .
docker image inspect agency-hub:release --format '{{json .Config.Env}}'
```

Expected: build succeeds and image configuration contains no secrets.

- [ ] **Step 6: Verify Workflow remains untouched**

Repeat Task 1 baseline commands. Expected: identical Workflow HEAD/remote and clean status.

- [ ] **Step 7: Commit only necessary verification fixes**

```bash
git add -A
git commit -m "test: complete Agency Hub release quality gate"
```

Skip the commit if verification required no file changes.

---

### Task 11: Create and publish the GitHub repository

**Files:**
- Modify: Git metadata only in Agency Hub.

**Interfaces:**
- Consumes: verified local `main` branch.
- Produces: public `https://github.com/Hugueninfer/agency-hub` with no connection to Workflow.

- [ ] **Step 1: Inspect GitHub authentication without exposing tokens**

Use the authenticated GitHub browser session or GitHub CLI if present. Do not print token/environment values. Confirm the owner is `Hugueninfer` and that `agency-hub` does not already exist.

- [ ] **Step 2: Create the public empty repository**

Create `Hugueninfer/agency-hub` with no generated README, license or `.gitignore`, because these already exist locally.

- [ ] **Step 3: Attach the new remote and verify the exact target**

```bash
git remote add origin git@github.com:Hugueninfer/agency-hub.git
git remote -v
git branch --show-current
```

Expected: only Agency Hub remote and `main` branch. Abort if any remote contains `/workflow`.

- [ ] **Step 4: Push the verified baseline**

```bash
git push -u origin main
```

Expected: remote main is created successfully.

- [ ] **Step 5: Verify public contents**

Open the repository logged out or through the public API. Confirm README visibility, absence of secret files and correct repository name.

---

### Task 12: Provision Render without touching Railway

**Files:**
- No repository file changes unless deployment exposes a reproducible configuration bug.

**Interfaces:**
- Consumes: public GitHub repo and `render.yaml`.
- Produces: independent Render services and public Agency Hub URL.

- [ ] **Step 1: Record Railway as an excluded target**

Before opening Render, record the Railway project URL/service identifiers read-only if visible. Do not open edit/settings actions in Railway. All subsequent provider actions must target Render only.

- [ ] **Step 2: Create the Render Blueprint from Agency Hub**

Connect `Hugueninfer/agency-hub`, review every proposed service and confirm names begin with `agency-hub`. Reject the operation if any environment value refers to Railway or Workflow database hosts.

- [ ] **Step 3: Generate and set secrets**

Generate independent values for `APP_KEY`, MySQL application password and root password. Store them only in Render secret fields. Set the final Render hostname in `APP_URL`, `ASSET_URL`, `CORS_ALLOWED_ORIGINS` and `SANCTUM_STATEFUL_DOMAINS`.

- [ ] **Step 4: Deploy database before application**

Wait for the MySQL private service to become healthy. Verify its internal host is not publicly reachable. Then allow the web service and cleanup cron to deploy.

- [ ] **Step 5: Validate migrations and health**

Inspect logs for successful migrations, Nginx, PHP-FPM and queue worker startup. Request:

```text
GET /api/health -> 200
GET /api/v1/config -> app_mode=combined, demo_available=true
POST /api/v1/auth/demo -> 201
```

Do not include returned tokens in notes or screenshots.

- [ ] **Step 6: Create the private personal account**

Run the documented interactive account command in the Render shell. Use a non-demo email selected by the owner and a unique password of at least 15 characters. Never put credentials in Git, README or command history.

- [ ] **Step 7: Run published smoke tests**

Validate personal login, demo creation, project/task edits, timer, invoice editing, board saving, reset, logout and an artificially expired demo. Confirm email send/Fathom are blocked for demo. Confirm a second browser session cannot access the first demo UUIDs.

- [ ] **Step 8: Confirm Railway remains operational**

Perform only its existing public health/login-page read check. Do not submit credentials or mutate data. Compare the Workflow Git baseline again.

---

### Task 13: Capture real screenshots and write the portfolio README

**Files:**
- Create: `docs/screenshots/login-desktop.webp`
- Create: `docs/screenshots/dashboard-desktop.webp`
- Create: `docs/screenshots/projects-desktop.webp`
- Create: `docs/screenshots/tasks-desktop.webp`
- Create: `docs/screenshots/board-desktop.webp`
- Create: `docs/screenshots/hours-desktop.webp`
- Create: `docs/screenshots/invoices-desktop.webp`
- Create: `docs/screenshots/dashboard-mobile.webp`
- Create: `docs/screenshots/tasks-mobile.webp`
- Modify: `README.md`
- Create: `README.en.md`

**Interfaces:**
- Consumes: validated public demo with fictional fixture.
- Produces: Orbit-style Portuguese/English portfolio documentation with real clickable screenshots.

- [ ] **Step 1: Create a fresh disposable demo for capture**

Use the public CTA in a new private browser window. Confirm every visible name, email, company and invoice belongs to the approved fictional fixture. Never capture browser chrome containing tokens or provider dashboards.

- [ ] **Step 2: Capture deterministic desktop screens**

Use viewport 1440×1000, hide password managers/extensions and capture the listed screens. For board and task images, use the prepared highlighted records so the gallery tells a coherent story.

- [ ] **Step 3: Capture deterministic mobile screens**

Use viewport 390×844. Capture dashboard and Kanban navigation with no clipped controls or personal browser UI.

- [ ] **Step 4: Optimize images without changing content**

Convert to WebP with visually lossless quality, strip metadata and keep each file reasonably sized. Verify every optimized image visually against the source before discarding temporary captures.

- [ ] **Step 5: Write the Portuguese README**

Use this exact section order:

1. hero: Agency Hub, tagline, modules, demo/API/Docker/gallery links and stack;
2. sobre o projeto;
3. navegar pelo README;
4. experimentar em cinco minutos;
5. galeria com linked images and factual captions;
6. funcionalidades;
7. decisões de engenharia;
8. arquitetura e tecnologias with Mermaid;
9. como a demonstração funciona with sequence diagram;
10. Docker and local development;
11. Render configuration and deployment;
12. tests, security, operations and backups;
13. repository structure, documentation and current limits.

State the real capture date and that all displayed records are fictional. Do not claim features not verified in the published build.

- [ ] **Step 6: Write the English README**

Translate meaning, not code identifiers. Keep both READMEs structurally equivalent and link each language at the top.

- [ ] **Step 7: Verify all README links and images**

```bash
rg -o 'docs/screenshots/[^)> ]+' README.md README.en.md | sort -u
find docs/screenshots -type f -maxdepth 1 -print | sort
```

Open both rendered READMEs on GitHub and test demo, API, Docker anchors, gallery expansion and language links.

- [ ] **Step 8: Commit and publish documentation**

```bash
git add README.md README.en.md docs/screenshots
git commit -m "docs: present Agency Hub with live product gallery"
git push origin main
```

- [ ] **Step 9: Final end-to-end verification**

Confirm GitHub is public, Render demo works in a signed-out browser, screenshots load, no secrets are present, auto deploy is disabled, Railway is unchanged and the new MySQL contains only Agency Hub data.

