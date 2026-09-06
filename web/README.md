# Workflow Web

Frontend **React 19** (Vite) para o Workflow: interface para a API Laravel (`workflow-api`), com autenticação baseada em **Sanctum** (cookies de sessão + CSRF).

## Stack

- **React** 19 e **React Router** 7
- **Vite** 8
- **Tailwind CSS** 3
- **@hello-pangea/dnd** — arrastar e largar
- **@excalidraw/excalidraw** — desenho/diagramas
- **dompurify** — sanitização de HTML

## Requisitos

- **Node.js** 20+ (recomendado LTS)
- **npm** (ou compatível)

## Configuração

```bash
cd workflow-web
npm install
cp .env.example .env
```

O ficheiro `.env` pode ficar só com `VITE_API_BASE_URL` vazio em desenvolvimento quando usa o **proxy do Vite** (ver abaixo).

## Desenvolvimento

```bash
npm run dev
```

Por defeito o Vite expõe a app (tipicamente `http://localhost:5173`) e encaminha:

- `/api/*` → `http://127.0.0.1:8000`
- `/sanctum/*` → `http://127.0.0.1:8000`

Arranque o **workflow-api** na porta 8000 (`php artisan serve` ou `composer run dev` na pasta da API) para que login e pedidos autenticados funcionem.

### API noutro host ou porta (CORS)

Se o frontend não partilhar a mesma origem que a API e **não** usar o proxy, defina a URL base absoluta da API:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Nesse cenário configure também `CORS_ALLOWED_ORIGINS` (e Sanctum stateful domains, se aplicável) no backend.

O cliente HTTP está em `src/api/client.js`: envia `Accept`/`Content-Type` JSON, `credentials: 'include'` e o header **`X-XSRF-TOKEN`** a partir do cookie `XSRF-TOKEN` nos métodos mutáveis.

## Scripts npm

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento Vite com HMR |
| `npm run build` | Build de produção para `dist/` |
| `npm run preview` | Servir o build localmente |
| `npm run lint` | ESLint |

## Resposta da API

O cliente espera envelopes do tipo `{ success, message, data?, errors? }` da `workflow-api`; erros lançam `ApiError` com `status` e `errors` de validação quando existirem.

## Licença

Defina conforme o repositório (o `package.json` usa `"private": true`).
