# Zero-Cost Render Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy Agency Hub on a free Render web service backed by a persistent Aiven MySQL Free database, with no billable Render resources.

**Architecture:** Replace the paid three-service Render Blueprint with one Docker web service on `plan: free`. Supply Aiven TLS MySQL connection values as unsynced Render secrets, retain opportunistic demo cleanup, and explicitly document the free-tier availability and ephemeral-upload limits.

**Tech Stack:** Render Blueprint YAML, Docker, Laravel 13, MySQL 8-compatible Aiven service, Bash validation, PHPUnit, React/Vitest.

**Spec:** `docs/superpowers/specs/2026-09-12-zero-cost-render-design.md`

## Global Constraints

- Do not modify `/home/huguenin/projects/pedro/workflow`, its Railway deployment, or its Git remote.
- Create no paid Render service, disk, cron job, subscription, trial, or payment method.
- Use exactly one Render `web` service with `plan: free`.
- Use Aiven MySQL Free only; stop if the Free plan is unavailable.
- Never commit application keys, passwords, connection URIs, certificates, or other credentials.
- Keep `APP_MODE=combined`, `DEMO_TTL_HOURS=24`, and demo isolation controls unchanged.

---

### Task 1: Enforce a free-only Render blueprint

**Files:**
- Create: `scripts/validate-render-free.sh`
- Modify: `render.yaml`
- Modify: `.env.render.example`

**Interfaces:**
- Consumes: Docker image startup contract in `Dockerfile` and `start.sh`; Aiven MySQL connection fields supplied by the operator.
- Produces: one Render Free web service and a validator that exits non-zero for any billable service shape.

- [ ] **Step 1: Write the failing structural validator**

Create an executable shell script that loads `render.yaml` with Ruby's standard YAML library and asserts all of the following: exactly one service; `type == "web"`; `plan == "free"`; no `disk`; no `pserv`, `cron`, `worker`, or paid plan; and unsynced keys exist for `APP_KEY`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, and `MYSQL_ATTR_SSL_CA`.

```bash
#!/usr/bin/env bash
set -euo pipefail
ruby -ryaml -e '
doc = YAML.safe_load_file("render.yaml", aliases: true)
services = doc.fetch("services")
abort "expected exactly one service" unless services.size == 1
service = services.first
abort "service must be web" unless service["type"] == "web"
abort "service must use free plan" unless service["plan"] == "free"
abort "persistent disk is forbidden" if service.key?("disk")
keys = service.fetch("envVars").filter_map { |item| item["key"] }
required = %w[APP_KEY DB_HOST DB_PORT DB_DATABASE DB_USERNAME DB_PASSWORD MYSQL_ATTR_SSL_CA]
abort "missing unsynced secrets" unless (required - keys).empty?
abort "billable service type present" if services.any? { |item| %w[pserv cron worker].include?(item["type"]) }
' 
```

- [ ] **Step 2: Run the validator and verify it fails**

Run: `bash scripts/validate-render-free.sh`

Expected: FAIL because the current Blueprint contains a paid web plan, private MySQL, disks, and a cron job.

- [ ] **Step 3: Replace the Blueprint with one free web service**

Keep the existing Docker runtime, region, health check, shutdown delay, and environment group. Change the web plan to `free`; remove `disk`; delete the private MySQL and cron services; replace `fromService` database values with `sync: false` entries for the seven secret/connection keys. Keep deployment manual with `autoDeployTrigger: "off"`.

- [ ] **Step 4: Update the example environment contract**

Leave connection values empty and add the Aiven CA path expected inside the container:
\n+```dotenv
DB_HOST=
DB_PORT=3306
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=
MYSQL_ATTR_SSL_CA=/etc/ssl/certs/ca-certificates.crt
```

- [ ] **Step 5: Run focused validation**

Run:

```bash
bash scripts/validate-render-free.sh
docker compose config --quiet
git grep -nE 'plan: (0\.5c|1c|starter|standard)|type: (pserv|cron|worker)|sizeGB:' -- render.yaml
```

Expected: validator and Compose parsing pass; `git grep` returns no matches.

- [ ] **Step 6: Commit**

```bash
git add render.yaml .env.render.example scripts/validate-render-free.sh
git commit -m "ops: make Render deployment free-only"
```

---

### Task 2: Document and verify the free deployment contract

**Files:**
- Modify: `docs/operations/render.md`
- Modify: `README.md`
- Modify: `scripts/validate-render-free.sh`

**Interfaces:**
- Consumes: the free-only Blueprint from Task 1 and existing Laravel demo lifecycle commands.
- Produces: an operator runbook and public README that make cost, limits, secrets, deployment, and rollback unambiguous.

- [ ] **Step 1: Extend the validator with documentation assertions**

Require the runbook to contain `Aiven`, `Free`, `1 GB`, `15 minutes`, `ephemeral`, `no payment method`, `php artisan migrate --force`, and the seven required secret keys. Require the README to identify Agency Hub, the 24-hour demo, Render Free, and Aiven MySQL Free.

- [ ] **Step 2: Run the validator and verify it fails**

Run: `bash scripts/validate-render-free.sh`

Expected: FAIL because the current runbook and README describe the paid Render topology and the old Workflow/Railway project.

- [ ] **Step 3: Rewrite the operational runbook**

Document: explicit Free-plan selection; absence of payment method; Aiven Free creation; TLS variables; `APP_KEY` generation; initial migration; health check; demo smoke test; cold starts; 750-hour/shared usage constraints; 1 GB database limit; ephemeral personal uploads; credential rotation; rollback; and a hard stop if either provider offers only a trial or paid plan.

- [ ] **Step 4: Replace the public README**

Follow the Orbit-style presentation: concise product pitch, feature grid, 24-hour-demo safety model, stack, local Docker setup, test commands, zero-cost deployment architecture, limitations, security notes, and license/repository links. Omit live-demo and screenshot sections until those artifacts are verified in Task 4.

- [ ] **Step 5: Run documentation and secret checks**

Run:

```bash
bash scripts/validate-render-free.sh
git grep -nE 'APP_KEY=base64:[A-Za-z0-9+/=]{20,}|DB_PASSWORD=.+|AIVEN_TOKEN=.+|MYSQL_ROOT_PASSWORD=.+' -- ':!*.example' || true
git diff --check
```

Expected: validator and diff check pass; secret scan prints nothing.

- [ ] **Step 6: Commit**

```bash
git add README.md docs/operations/render.md scripts/validate-render-free.sh
git commit -m "docs: add free Agency Hub deployment guide"
```

---

### Task 3: Run the release gate and publish configuration

**Files:**
- Modify: `.superpowers/sdd/2026-09-06-agency-hub/progress.md` (local ignored ledger only)

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces: verified commit on `Hugueninfer/agency-hub` without touching Workflow.

- [ ] **Step 1: Run backend and frontend verification**

Run the existing SQLite suite, MySQL suite against the local Compose database, MySQL concurrency test, Pint, frontend Vitest suite, ESLint, and production build using the repository's documented Node 24 runtime.

- [ ] **Step 2: Run infrastructure verification**

Build the production Docker image, start it against local MySQL, wait for `/api/health`, request `/api/v1/config`, start a demo, and verify the returned expiry is approximately 24 hours in the future. Run `scripts/validate-render-free.sh` again.

- [ ] **Step 3: Verify isolation and repository boundaries**

Run the existing demo-isolation checks; confirm `/home/huguenin/projects/pedro/workflow` is clean at `6be943235f39172a471b464f30e60df414367043`; confirm Agency Hub contains no secrets; and confirm its remote is `git@github.com:Hugueninfer/agency-hub.git`.

- [ ] **Step 4: Push the verified commits**

```bash
GIT_SSH_COMMAND='ssh -o IdentitiesOnly=yes -i /home/huguenin/.ssh/id_ed25519_pessoal' git push origin main
```

Expected: remote `main` advances to the verified local HEAD.

---

### Task 4: Provision only free resources and finish the README

**Files:**
- Modify: `README.md`
- Create: `docs/images/login.png`
- Create: `docs/images/dashboard.png`
- Create: `docs/images/projects.png`

**Interfaces:**
- Consumes: public repository, free-only Blueprint/runbook, and verified application image.
- Produces: Aiven MySQL Free database, Render Free web service, live demo URL, authentic screenshots, and final public README.

- [ ] **Step 1: Create Aiven MySQL Free**

Use the official console or MCP. Select the plan labelled `Free` and verify the review screen shows `$0/month` and no payment method requirement before creation. Do not accept a trial. Store connection data only in the Render secret fields.

- [ ] **Step 2: Create the Render Free web service**

Connect `Hugueninfer/agency-hub`, select `main`, verify the service plan is `Free` and that the review screen contains no disk, cron, private service, or charge, then create it. Set `APP_KEY` and Aiven connection secrets without exposing them in logs or Git.

- [ ] **Step 3: Validate the live system**

Verify HTTPS, security headers, `/api/health`, public configuration, personal login behavior, demo creation, tenant isolation, edit/reset/logout, expiry messaging, blocked uploads/external effects, and a cold-start recovery. Confirm the Aiven service still displays `Free` and Render service displays `Free` with no payment method.

- [ ] **Step 4: Capture real screenshots**

At a desktop viewport, capture login, dashboard, and projects screens using only fictional demo data. Save optimized PNG files under `docs/images/` and visually inspect each image for secrets, personal data, clipping, or broken UI.

- [ ] **Step 5: Finalize README claims and links**

Add the verified live URL and relative screenshot links. State the cold-start and ephemeral-upload limitations plainly. Do not include credentials.

- [ ] **Step 6: Run final checks and publish**

Run the structural validator, secret scan, image existence check, README link check, representative backend/frontend suites, `git diff --check`, and Workflow immutability check. Commit and push only after all pass.
