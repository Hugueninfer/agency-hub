# Agency Hub: zero-cost Render deployment

This runbook documents a no-cost, short-lived Agency Hub deployment. It does not create provider resources, publish a URL, or claim that a live demo exists.

## Cost contract and hard stop

Use **Render Free** for the one Docker web service in `render.yaml`; select the Free plan explicitly. Do not add a disk, worker, cron, or paid database. Render Free requires **no payment method** for this contract.

Create an **Aiven MySQL Free** service, not a trial. Confirm its displayed plan is Free, that it has a **1 GB** database limit, and download its connection and TLS details. Hard stop: do not deploy if Render or Aiven presents only a trial or paid plan, asks for a payment method, or changes these no-cost terms. Obtain an approved replacement design first.

The application is subject to Render Free shared usage and its 750-hour monthly allowance. Expect cold starts after inactivity; a request can take about **15 minutes** to become responsive in the worst case. The service is not an availability commitment. Aiven capacity is also limited by the 1 GB ceiling; monitor usage and delete disposable demo data before it reaches the limit.

## Before deployment

1. Review `render.yaml` and keep its only service on `plan: free`. Create the Render Blueprint without enabling a paid add-on or a persistent disk.
2. In Aiven, create the MySQL Free service in a suitable region. Copy its host, port, database, username, password, and CA certificate details into the provider's protected secret fields. Do not put those values in Git, tickets, chat, shell history, or this document.
3. Generate an application key on a trusted local machine from the built image:

   ```bash
   docker build -t agency-hub:local .
   docker run --rm --entrypoint php agency-hub:local -r 'echo "base64:".base64_encode(random_bytes(32)).PHP_EOL;'
   ```

   Store the resulting value in a password manager and enter it only as a protected Render secret. It must retain its `base64:` prefix.

4. In Render, enter these seven protected, unsynced secret keys exactly once:

   | Key | Value source |
   | --- | --- |
   | `APP_KEY` | generated Laravel application key |
   | `DB_HOST` | Aiven host |
   | `DB_PORT` | Aiven MySQL port |
   | `DB_DATABASE` | Aiven database name |
   | `DB_USERNAME` | Aiven username |
   | `DB_PASSWORD` | Aiven password |
   | `MYSQL_ATTR_SSL_CA` | Aiven CA certificate path available to the container |

   TLS is required: keep `DB_CONNECTION=mysql` and configure `MYSQL_ATTR_SSL_CA` with Aiven's CA material. Do not disable certificate verification to work around a connection failure; correct the CA path or certificate instead. Set `APP_URL`, `ASSET_URL`, CORS origins, and Sanctum domains only after Render assigns the actual service hostname.

## First deploy and smoke test

1. Deploy the Blueprint and wait through any cold start. A failure or timeout is a reason to inspect deployment logs and configuration, not to change plans.
2. When the web service shell is available, run the initial migration once:

   ```bash
   php artisan migrate --force
   ```

   Do not run `migrate:fresh` against Aiven. It destroys data.
3. Request `/api/health` over the assigned HTTPS origin and require HTTP 200. Then create one demo through the normal UI or API flow, confirm it can sign in, and verify the 24-hour cleanup behavior is understood. Do not publish credentials or a response body.
4. Record the Render deploy ID, commit, migration state, and Aiven service identifier in the operator's secure change record. No public live-demo link or screenshot is authorized until separately verified.

## Limits, data handling, and operations

- Demo workspaces expire after 24 hours. They are disposable, not backups.
- Render Free has shared capacity, the 750-hour limit, and cold starts. Do not use this setup for production availability, scheduled jobs, or timely cleanup guarantees.
- Render's local filesystem is **ephemeral**. Personal uploads, logos, and attachments can disappear during a redeploy, restart, or replacement; tell users not to rely on them. Do not attach a paid persistent disk to preserve them under this contract.
- Check the Aiven console for database size before import-heavy work. Keep below the 1 GB Free limit and remove expired demo data when necessary.
- Rotate `APP_KEY` only with a planned session invalidation. For database credentials, create or rotate the Aiven credential, update the protected Render secrets together, redeploy, verify the health check, then revoke the old credential. Never rotate by committing an `.env` file.

## Rollback

For an application-only regression, select the last known-good Render deploy from deploy history, preserve the seven secret values, and recheck `/api/health` and a fresh demo login. Do not assume a rollback reverses database migrations.

If a migration is incompatible, stop and obtain an approved Aiven recovery point. Restore only a tested backup to an approved target, deploy the matching application revision, then validate health and tenant access before reopening the demo. A restore loses writes after that backup; do not proceed without explicit approval. The ephemeral Render filesystem cannot be rolled back or recovered.

## Local verification

The local Compose setup is separate from providers and contains only disposable development data:

```bash
docker compose up -d --build
docker compose exec app php artisan migrate --force
curl --fail http://127.0.0.1:8080/api/health
docker compose stop
```

Run the validator before requesting any authorized deployment:

```bash
bash scripts/validate-render-free.sh
```
