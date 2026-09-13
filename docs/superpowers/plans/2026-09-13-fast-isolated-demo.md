# Fast Isolated Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each 24-hour Agency Hub demo start from the same prepared fixture quickly while keeping every visitor's data isolated, and remove avoidable sequential waits from the dashboard.

**Architecture:** Keep the existing per-tenant demo lifecycle and token contract. Replace row-by-row Eloquent fixture creation with ordered bulk inserts plus UUID-to-ID lookups inside one transaction, then load independent dashboard resources concurrently after the project list is known.

**Tech Stack:** PHP 8.1+, Laravel 10, MySQL/Aiven, React 19, Vitest, Testing Library, Render Docker Web Service.

**Spec:** `docs/superpowers/specs/2026-09-06-agency-hub-design.md`

## Global Constraints

- Every visitor receives an isolated demo tenant; no shared writable public account.
- Demo access expires 24 hours after creation and never falls back to a personal session.
- Fixture writes remain atomic and use fresh UUIDs and dates rebased to the entry time.
- Demo side effects and uploads remain blocked.
- Deployment must stay on the existing no-cost Render and Aiven services.
- The original `workflow` repository must remain untouched.

---

### Task 1: Bound Demo Fixture Database Round Trips

**Files:**
- Modify: `api/tests/Unit/DemoFixtureServiceTest.php`
- Modify: `api/app/Domain/Services/DemoFixtureService.php`

**Interfaces:**
- Consumes: `DemoFixtureService::seed(Tenant $tenant, User $owner, CarbonImmutable $now): void`
- Produces: the same public method and fixture graph, implemented with bounded batched persistence.

- [ ] **Step 1: Write the failing performance-regression test**

Add an integration test that listens only during `seed()`, counts SQL statements, asserts the complete fixture still exists, and requires no more than 40 statements. This catches a return to per-permission, per-task, per-preference, or per-menu inserts.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `cd api && php artisan test tests/Unit/DemoFixtureServiceTest.php --filter=bounded`

Expected: FAIL because the current row-by-row fixture performs more than 40 SQL statements.

- [ ] **Step 3: Implement ordered bulk fixture persistence**

Inside the existing transaction:

1. validate and lock the destination tenant and owner;
2. allocate fresh UUIDs;
3. upsert the global permission catalog once and fetch its ID map once;
4. insert roles, users, projects, tasks, invoices, and their dependent rows in table-sized batches;
5. fetch UUID-to-integer-ID maps only where foreign keys require them;
6. insert pivot rows and leaf collections in batches;
7. JSON-encode Excalidraw payloads and hash generated member passwords explicitly;
8. preserve tenant isolation, rebased dates, notification preferences, and transaction rollback.

- [ ] **Step 4: Run focused backend tests and verify GREEN**

Run: `cd api && php artisan test tests/Unit/DemoFixtureServiceTest.php tests/Feature/Api/DemoAuthenticationTest.php`

Expected: all fixture, lifecycle, capacity, token, rollback, reset, and isolation tests pass.

- [ ] **Step 5: Commit the backend optimization**

```bash
git add api/app/Domain/Services/DemoFixtureService.php api/tests/Unit/DemoFixtureServiceTest.php
git commit -m "perf: seed isolated demos in batches"
```

### Task 2: Parallelize Dashboard Overview Loading

**Files:**
- Create: `web/src/hooks/useWorkspaceOverview.test.jsx`
- Modify: `web/src/hooks/useWorkspaceOverview.js`

**Interfaces:**
- Consumes: the existing API modules and permission flags accepted by `useWorkspaceOverview()`.
- Produces: the same hook result shape, with independent overview requests running concurrently and optional-section failures remaining isolated.

- [ ] **Step 1: Write the failing concurrency test**

Use `renderHook()` with deferred API responses. Resolve projects first, keep task, board, invoice, RBAC, and time promises pending, and assert all permitted independent requests have started before any one of them resolves. Also assert a failed optional RBAC/time request does not discard projects, tasks, boards, or invoices.

- [ ] **Step 2: Run the hook test and verify RED**

Run: `cd web && npm test -- src/hooks/useWorkspaceOverview.test.jsx`

Expected: FAIL because the current hook awaits boards, invoices, users, roles, and time sequentially.

- [ ] **Step 3: Implement concurrent loading**

Fetch projects first because task URLs depend on project UUIDs. Then launch task batches, boards, invoices, users, roles, and time summary together with guarded promises, preserving existing defaults and error semantics. Commit state after the concurrent group settles and keep a single refresh contract.

- [ ] **Step 4: Run frontend tests and verify GREEN**

Run: `cd web && npm test`

Expected: all frontend tests pass, including the new concurrency and partial-failure cases.

- [ ] **Step 5: Commit the dashboard optimization**

```bash
git add web/src/hooks/useWorkspaceOverview.js web/src/hooks/useWorkspaceOverview.test.jsx
git commit -m "perf: load dashboard resources concurrently"
```

### Task 3: Full Verification and Production Validation

**Files:**
- Modify only if verification reveals a regression: the smallest directly responsible source or test file.

**Interfaces:**
- Consumes: the optimized demo endpoint and dashboard hook.
- Produces: a tested commit deployed to the existing `agency-hub` Render service.

- [ ] **Step 1: Run the complete local verification suite**

Run the backend test suite, frontend tests, frontend lint/build, Render free-tier validator, and Docker build/health checks already documented by the project.

- [ ] **Step 2: Review the final diff and security boundaries**

Confirm there are no secrets, the original `workflow` repository is unchanged, bulk inserts retain every `tenant_id`, personal authentication is unchanged, and demo uploads/external effects remain blocked.

- [ ] **Step 3: Push and deploy through the existing workflow**

Push the verified commits to `Hugueninfer/agency-hub`, trigger the existing manual Render deploy, and wait for a healthy deployment. Do not create paid resources or enable automatic billing.

- [ ] **Step 4: Measure production behavior**

Measure cold wake separately from application time. With the service awake, create a demo, verify the 24-hour expiry, load the dashboard and representative pages, mutate and reload data, and confirm a second demo cannot see the first demo's changes.

- [ ] **Step 5: Record the observed outcome**

Report measured demo creation and dashboard times, test totals, deployed commit, live URL, and any remaining Render Free cold-start limitation.
