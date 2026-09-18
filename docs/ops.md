# Meridian operations

Single-owner study workspace: Next.js 16 (App Router) on Vercel, Neon Postgres
via `@neondatabase/serverless`, Node 22+. This document covers environment
variables, storage modes, and the deployment checklist.

## Environment variables

Server-only values (never prefixed `NEXT_PUBLIC_`, never sent to the browser):

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Production | Neon Postgres connection string. When set, the workspace, history, and rate limits live in Postgres (`meridian_workspace`, `meridian_history`, `meridian_rate_limits`). |
| `MERIDIAN_PASSWORD_HASH` | Production | `salt:hex` scrypt hash of the owner password. Generate with `pnpm setup:auth`. Format is validated (`32 hex : 128 hex`); anything else disables sign-in. |
| `MERIDIAN_SESSION_SECRET` | Production | HMAC secret for session cookies, at least 32 characters. Generate with `pnpm setup:auth`. |
| `NEXT_PUBLIC_SITE_URL` | Optional | Public deployment URL, used for metadata/links. Safe to expose. |
| `EXA_API_KEY` | Optional | Enables live neural search (`/api/research/*`). Without it the curated library still works. |
| `FIRECRAWL_API_KEY` | Optional | Enables page/document extraction (`/api/research/*`). |

Local-development-only values:

| Variable | Purpose |
| --- | --- |
| `MERIDIAN_DEV_STORAGE` | Set to `true` to force the file-backed dev store even when `NODE_ENV` is not `development`. Ignored when `VERCEL` is set — a dev store can never run on Vercel. |
| `MERIDIAN_DATA_DIR` | Directory for the dev store file (`workspace.json`). Defaults to `.meridian/` in the project root. |

## Storage modes

`serverConfig().storage` (reported by `GET /api/auth/session` and
`GET /api/health`) resolves to one of:

- **`postgres`** — `DATABASE_URL` is set. All reads/writes go to Neon with
  optimistic revisioning (conditional upsert in a single statement) and a
  50-version history. Used in production.
- **`development`** — no `DATABASE_URL`, and `NODE_ENV=development` or
  `MERIDIAN_DEV_STORAGE=true`, and **not** on Vercel. Writes go to
  `$MERIDIAN_DATA_DIR/workspace.json` via serialized atomic rename
  (`tmp` file + `rename`, mode `0600`). Same revision/history semantics as
  Postgres, so local behavior matches production. If no auth is configured in
  this mode, the owner session is implicit for local development only.
- **`unconfigured`** — nothing above applies. All workspace APIs return `503`
  ("Finish the database and sign-in setup"); public pages still render.

## Health and observability

- `GET /api/health/` → `{ ok, status, storage, db, time }`. `status` is
  `ready` (200), `setup-required` (503), or `database-unavailable` (503).
  Unauthenticated by design; it exposes nothing beyond what the session
  endpoint already returns.
- Every API error response includes a `traceId` field and an
  `x-request-id` header; the same id is logged server-side as
  `[meridian:<traceId>]`, so user reports can be matched to logs.
- Research routes are rate limited twice: a durable per-owner bucket in
  Postgres (or the in-memory fallback in dev) and a 30 req/min per-IP token
  bucket. Login is limited to 10 attempts per 15 minutes.

## Local verification

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test            # vitest, includes the PGlite-backed backend suite
pnpm build
pnpm test:api        # boots `next start` with a temp dev store and runs
                     # end-to-end HTTP checks: auth, origin checks, saves,
                     # conflicts, history restore, logout
```

CI (`.github/workflows/ci.yml`) runs exactly these steps on Node 24 with a
frozen lockfile, in this order: lint → typecheck → test → build → test:api.

## Deploy checklist (Vercel)

1. **Database** — add a Neon database via Vercel Storage (or paste the
   connection string) so `DATABASE_URL` is present in Production env vars.
2. **Auth** — run `pnpm setup:auth` locally, then copy the printed
   `MERIDIAN_PASSWORD_HASH` and `MERIDIAN_SESSION_SECRET` into Vercel project
   settings (Production). The password itself is never stored.
3. **Optional research keys** — add `EXA_API_KEY` and `FIRECRAWL_API_KEY` for
   live research. Research route functions allow up to 120s
   (`vercel.json` → `functions.maxDuration`).
4. **Site URL** — set `NEXT_PUBLIC_SITE_URL` to the production domain.
5. **Deploy** — push to `main`. Vercel runs `pnpm build:vercel`
   (`scripts/deploy-build.mjs`), which applies `database/001_workspace.sql`
   idempotently when `DATABASE_URL` is set, then runs `next build`. Migrations
   are additive (`CREATE TABLE IF NOT EXISTS`) and safe to re-run.
6. **Smoke test after deploy** —
   - open `/api/health/` and confirm `{ ok: true, status: "ready", storage: "postgres", db: true }`;
   - sign in at `/login/`, make a small study change, reload, confirm it persists;
   - open the site in an incognito window and confirm public pages render and
     workspace APIs return `401`.

## Rotating credentials

- **Password / session secret**: re-run `pnpm setup:auth`, update both Vercel
  env vars, redeploy. Existing sessions are invalidated by the new secret.
- **Database**: point `DATABASE_URL` at the new instance and redeploy; the
  build migration creates the schema. Export/import study data from Settings
  before switching if you need to carry history across.
