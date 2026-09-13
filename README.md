# Agency Hub

Agency Hub is a collaborative workspace for agencies to organize clients, projects, tasks, notes, and documents in one focused place.

## Built for the daily agency loop

| Plan work | Keep clients aligned | Protect the demo |
| --- | --- | --- |
| Project boards, task flow, notes, and shared context | Client-facing workspaces and role-aware access | Every demo workspace is a 24-hour demo with disposable data |

## 24-hour demo safety model

The demo is intentionally temporary: credentials stop working after 24 hours, and expired rows are deleted opportunistically rather than at a guaranteed instant. For this demo, demo uploads are blocked. Personal-account uploads are ephemeral, so do not use the demo for production records, sensitive material, or irreplaceable files. The demo may be unavailable while a free service cold-starts.

## Stack

- Laravel 13 / **PHP 8.4 runtime** API with Sanctum (package compatibility requires PHP ^8.3)
- React and Vite web client
- MySQL 8 for relational application data
- Docker and Docker Compose for repeatable local setup

## Local Docker setup

```bash
docker compose up -d --build
docker compose exec app php artisan migrate --force
curl --fail http://127.0.0.1:8080/api/health
```

Stop the local stack when finished:

```bash
docker compose stop
```

## Tests

```bash
bash scripts/test-validate-render-free.sh
bash scripts/validate-render-free.sh
cd api && composer install
cd api && php artisan test
cd web && npm test
```

## Zero-cost deployment architecture

The documented demo architecture uses one **Render Free** Docker web service and **Aiven MySQL Free** for its managed database. Provider secrets are entered only in their protected configuration screens; `render.yaml` declares their names but never their values. See the [free deployment runbook](docs/operations/render.md) before creating anything.

## Limitations and security

Free services use shared capacity, can cold-start, and are not a production availability or backup solution. Render storage is ephemeral, while the Aiven Free database has a 1 GB limit. Use TLS for MySQL, keep `APP_KEY` and database credentials outside the repository, rotate credentials deliberately, and stop if either provider offers only a trial or paid plan.

## License and repository

This project is distributed under the MIT license declared in [`api/composer.json`](api/composer.json). Source is hosted at [github.com/Hugueninfer/agency-hub](https://github.com/Hugueninfer/agency-hub), with [issues](https://github.com/Hugueninfer/agency-hub/issues).
