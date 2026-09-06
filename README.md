# Workflow — Monorepo

Monorepo para deploy no Railway. Combina:

- **api/** — Laravel (PHP 8.3 + Sanctum)
- **web/** — React (Vite)

## Deploy no Railway

### 1. Push no GitHub

```bash
git init
git add .
git commit -m "initial"
gh repo create workflow --private --push
```

### 2. Railway

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo → selecionar `workflow`
2. Railway detecta o `Dockerfile` e builda sozinho
3. **New → Database → Add MySQL**
4. No service do Laravel, adicionar variáveis:

| Variável | Valor |
|---|---|
| `APP_KEY` | rodar `php artisan key:generate --show` e colar |
| `APP_URL` | `https://workflow.up.railway.app` |
| `QUEUE_CONNECTION` | `sync` |
| `SESSION_DRIVER` | `cookie` |

5. **(opcional)** Adicionar Volume em Settings → Volumes → `/app/storage/app/public` (logos persistentes)

### 3. Primeiro deploy

Railway builda e sobe. No startup roda `php artisan migrate`.

Acessar `https://workflow.up.railway.app` — login pronto.
