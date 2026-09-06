# Agency Hub on Render

This repository prepares an independent deployment. It does not provision or
modify Render, Workflow, or Railway. Publish only after the final application
and container smoke tests have passed and the deployment has been authorized.

## Topology and environment

`render.yaml` creates the Docker web service `agency-hub`, image-backed private
service `agency-hub-mysql`, and hourly Docker cron `agency-hub-demo-cleanup` in
the same region. Web uploads persist at `/app/storage/app/public` on a 10 GB
disk; MySQL persists separately at `/var/lib/mysql` on a 20 GB disk. MySQL 8.4.6
is pinned by registry digest, as is the PHP image used to build and load the
MySQL PHP extension. Review pinned versions before a future rollout.

This is self-hosted MySQL, **not Render managed Postgres or managed MySQL**.
The operator owns patching, availability, logical backups, retention, capacity,
and restore drills. Neither the database port nor a public database URL is
exposed. `DB_HOST` uses Render's internal host reference; do not copy the
example hostname as a hardcoded production address.

Git auto-deploy is disabled for web and cron. Image services do not support
Git auto-deploy; changing their pinned image requires an explicit deployment.
Keep web and cron on the same reviewed commit. Paid disks and compute are
required. A disk binds a service to one instance and prevents horizontal
scaling; plan for downtime during deployment or maintenance. Cron cannot mount
either disk and performs database-only demo cleanup. It shares the database
cache store so the cleanup lock coordinates with web invocations.

The `.env.render.example` file documents the environment contract; its blank
values are intentional. Never commit real environment files or credentials.
Build context excludes nested environment files and cached application config.

## First deployment and owner bootstrap

1. In the eventual authorized Blueprint setup, confirm the repository, region,
   compute plans, disk sizes, and resource names. Check that names do not collide
   with existing services. Keep Blueprint automatic sync disabled as well as
   service auto-deploy; syncing a Blueprint can apply infrastructure changes.
2. Render generates `MYSQL_PASSWORD` and `MYSQL_ROOT_PASSWORD` once. Both web
   and cron obtain `DB_PASSWORD` from `MYSQL_PASSWORD` through `fromService`;
   do not generate independent passwords for the clients. Keep the root secret
   exclusively on the MySQL service. On an existing disk, changing these env
   values does **not** change database account passwords: rotate with MySQL
   account-management commands, then coordinate client environment updates.
3. Generate a Laravel application key on a trusted local terminal using the
   built image, then paste the complete `base64:...` value into the Blueprint's
   `APP_KEY` prompt (`sync: false`) for `agency-hub`. Save it in your password
   manager. Cron references that same value automatically. Render's
   `generateValue` cannot prepend Laravel's required prefix. Never paste keys
   into source control, issue comments, chat, or deployment logs.

   ```bash
   docker run --rm --entrypoint php agency-hub:local -r 'echo "base64:".base64_encode(random_bytes(32)).PHP_EOL;'
   ```

4. Set `APP_URL`, `ASSET_URL`, `CORS_ALLOWED_ORIGINS`, and
   `SANCTUM_STATEFUL_DOMAINS` to the actual assigned hostname in the environment
   group. Origins include `https://`; Sanctum domains omit the scheme. Keep
   `APP_DEBUG=false`, secure session cookies, HSTS enabled, and API docs off.
5. Wait for MySQL initialization before manually deploying web. Startup caches
   injected config and runs migrations before starting HTTP. Any configuration
   or migration error exits the container. If MySQL was not yet ready, resolve
   readiness and redeploy; do not bypass the failed migration. No production
   seeder runs automatically. Coordinate cron's first run after migrations;
   suspend cron during initial bootstrap or database maintenance if necessary.
6. In the web service's interactive Shell, from `/app`, run:

   ```bash
   php artisan migrate --force
   php artisan agency:account create owner@example.com
   php artisan demo:cleanup --limit=100
   ```

   The account command asks for the password twice with echo disabled and no
   visible-input fallback. It refuses noninteractive input, fewer than 15
   characters, or more than 72 bytes (bcrypt limit). Enter the password only at
   the hidden prompt: never pass it as an argument, environment variable, pipe,
   or shell command. Use a terminal without keystroke/session recording. It
   hashes before persistence, creates a personal tenant, owner role, permission
   grants and navigation in one transaction, and refuses existing emails.
   Change the default workspace/name in Settings after login. It imports no
   fictional projects, default users, or default passwords.
7. Verify HTTPS `/api/health` returns 200 and login persists a secure cookie.
   Verify the cleanup cron Runs page and its next hourly run (UTC). Alert on
   failed deploys, nonzero cron exits, disk capacity and service health.

The health route executes PHP and Laravel routing without authenticated data;
it is a liveness check, not a database readiness check. Supervisor escalates
unexpected PHP-FPM, Nginx, or worker exits to a nonzero container exit. The
worker's normal hourly recycle remains restartable. A failed startup stops
before HTTP becomes available.

## Mandatory logical backup and restore

Take a logical dump **before each release or migration**, and at least daily
on a schedule owned by the operator. Keep encrypted copies outside the service
and its disk, with dated filenames and an agreed retention policy. Verify dump
completion and periodically restore into an isolated database. Back up uploads
separately along with a secure copy of the application key. Disk snapshots are
**not logical MySQL backups**; restoring a raw database disk snapshot is not a
substitute for a tested dump/restore procedure.

Run these commands from a trusted shell on Render's private network that has
the MySQL 8 client tools (for example the MySQL service Shell). The PHP web image
does not include them. Set `DB_HOST`, `DB_USERNAME`, and `DB_DATABASE` to the
internal host, `agency_hub`, and `agency_hub`; type the database password only
at the `-p` prompt. A consistent online dump assumes InnoDB and no concurrent
DDL; pause migrations and coordinate writes for a matched uploads/database
recovery point. Never use a password immediately after `-p`.

```bash
umask 077
mysqldump --single-transaction --routines --triggers -h "$DB_HOST" -u "$DB_USERNAME" -p "$DB_DATABASE" > agency-hub.sql
```

Check the command's exit status and the file before exporting the encrypted
backup to approved off-service storage. MySQL 8 may require
`--no-tablespaces --set-gtid-purged=OFF` for a limited backup account. If routines
exist, ensure the backup account can read their definitions (`SHOW_ROUTINE`)
and has `SELECT`, `SHOW VIEW`, and `TRIGGER` rights as appropriate. Perform the
dump with a dedicated backup principal or the root account in the private
MySQL shell when the application account lacks required privileges. Do not
grant global backup/admin privileges to the web application.

Restore only into a confirmed empty recovery database or an explicitly
approved replacement target. Stop web/worker writes and suspend cron first;
retain the current database and upload backups before replacing anything.

```bash
mysql -h "$DB_HOST" -u "$DB_USERNAME" -p "$DB_DATABASE" < agency-hub.sql
```

Confirm successful import, migration state, record counts, personal login,
tenant isolation, and uploads before reconnecting traffic and re-enabling cron.
Do not expose MySQL publicly to move backups; use approved private-network
access and transfer procedures.

## Rollback

Record the release commit, web/cron deploy IDs, MySQL image digest, migration
state, and backup timestamp before release. For a code-only regression with a
backward-compatible schema, use Render's deploy history to roll web back to
the last known good deploy and deploy the matching cron revision. Preserve
the application key and disks. Recheck health, login and cleanup.

For an incompatible schema/data change, enter maintenance, stop workers,
suspend cron, take a current backup, and restore a tested pre-release logical
backup into a separate recovery database. Pair it with the matching uploads
backup and application revision, then switch the internal DB configuration.
Never blindly run `migrate:rollback`, `migrate:fresh`, downgrade MySQL against
its existing data directory, or delete a disk. Restoring a prior backup loses
writes since that backup; obtain explicit approval for that recovery point.

## Local verification (deferred to final testing)

Compose is local-only: published HTTP is bound to loopback and credentials are
public development defaults. Database has no published port. Use only the
isolated `agency-hub` Compose project; do not substitute a production env file.

```bash
docker build -t agency-hub:local .
docker compose up -d --build
docker compose exec app php artisan migrate:fresh --force
curl --fail http://127.0.0.1:8080/api/health
curl --fail -X POST http://127.0.0.1:8080/api/v1/auth/demo -H 'Accept: application/json'
docker compose logs --no-color app
docker compose stop
```

`migrate:fresh` is destructive and is only for this disposable local database.
Expected: health 200, demo 201, and no secrets or plaintext demo bearer token
in server logs. The demo response itself contains a credential: do not publish
the curl output. Also verify failed migrations prevent HTTP startup, process
failure exits the container, and secure cookie behavior through HTTPS. Stop
services without deleting volumes until inspection is complete. Run the focused
`CreateAgencyAccountTest` in the final backend test pass.

References checked for this Blueprint:
[Blueprint schema](https://render.com/docs/blueprint-spec),
[MySQL deployment](https://render.com/docs/deploy-mysql),
[cron jobs and disk limits](https://render.com/docs/cronjobs).
