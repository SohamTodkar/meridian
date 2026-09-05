# Meridian — your study observatory

A complete personal learning workspace for Soham: a clear AI/ML learning map, focused study sessions, daily habits, notes, evidence, recall, and a server-backed learning record.

The original 65 guided sessions, four phases, curriculum, resources, and study protocols are preserved. The interface and persistence architecture have been rebuilt.

## Start locally

Use Node.js 22.13+ (Node 24 recommended) and pnpm 11.19.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. Development records save on the **server** in `.meridian/workspace.json`, with atomic file replacement and revision checks. They do not live in localStorage or IndexedDB. This development adapter is deliberately unavailable on Vercel; production uses PostgreSQL.

## Deploy on Vercel

### 1. Make the website public — remove the Vercel login wall

In the existing Vercel project, open **Settings → Deployment Protection → Vercel Authentication**. Disable Vercel Authentication for the production site and save. On plans where the available selector is “Standard Protection,” keep preview deployments protected while excluding production, or turn the toggle off if all deployment URLs should be public.

Test the production domain in an incognito window. The page should open without redirecting to `vercel.com/login`.

**This is a Vercel dashboard setting. Source code and `vercel.json` cannot disable it.** No authenticated Vercel connection was available while this rebuild was prepared, so the setting on your existing deployment still needs to be changed.

New visitors open an interactive **visitor preview** of the curriculum. Preview changes stay in memory for that visit. Your real progress, journal, evidence, backups, and paid research endpoints stay private. Use **Owner sign-in** (or `/login/`) to open your saved workspace. Turning off Vercel Authentication does not make your study records public.

Official reference: https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication

### 2. Connect PostgreSQL

1. In Vercel, open the project's Storage tab and add a **Neon Postgres** database through the marketplace.
2. Connect it to the project and ensure its connection string is available as `DATABASE_URL`.
3. Use a separate database/branch for preview environments so previews never write to production study data.

The Neon driver uses HTTP and works with Vercel Functions. The database has one owner document, an optimistic revision number, 50 saved recovery versions, and durable rate-limit buckets. The database credential stays on the server.

### 3. Set up private owner sign-in

Run this on your own computer:

```sh
pnpm setup:auth
```

Choose a password with at least 12 characters. Input is hidden. The script writes a salted scrypt password hash and a random session signing secret to the ignored `.env.local` file; it does not store the password.

Copy these values from `.env.local` into **Vercel → Settings → Environment Variables**:

- `MERIDIAN_PASSWORD_HASH`
- `MERIDIAN_SESSION_SECRET`
- `DATABASE_URL` from Neon
- `NEXT_PUBLIC_SITE_URL` set to your production URL

Keep these out of Git and chat. Do not prefix secrets with `NEXT_PUBLIC_`. Running the auth setup again rotates the session secret, signing out existing sessions.

### 4. Build and deploy

Commit and push the rebuilt source to the repository's `main` branch before redeploying. Vercel builds the GitHub source, so local changes must be pushed first.

Import or reconnect `SohamTodkar/meridian` in Vercel. Next.js is the framework, with the repository root as the Root Directory. The included `vercel.json` uses:

```sh
pnpm install --frozen-lockfile
pnpm build:vercel
```

The deploy build applies the idempotent PostgreSQL migration **before** building the application. Migration failure stops the deployment. No database connection produces a public visitor preview with an owner setup screen; it does not pretend to save study data.

For manual migration after adding `DATABASE_URL` to `.env.local`:

```sh
pnpm db:migrate
```

After deployment: open `/api/health/` to verify database availability, sign in at `/login/`, make a small study change, and reload to confirm it persists.

## The study workflow

- **Overview:** next session, adaptive daily plan, real study statistics, recall queue, and a quick daily reflection.
- **Learning map:** interactive four-phase trajectory, every session, search within a phase, capability progress, resources, and checkpoints. Later phases can be inspected on the map; prerequisite checks protect their study sequence.
- **Guided sessions:** step-by-step exercises, hints, a wall-clock timer, resumable drafts, evidence checks, and reflection. Completion updates the learning map, journal, evidence vault, and recall queue.
- **Focus room:** 25/50/90-minute blocks (or a custom default in Settings), pause/resume, fullscreen, optional locally synthesized brown noise, and automatic time recording. Time uses wall-clock deltas so throttled background tabs do not slow the timer. Timers pause on leaving a guided session; standalone focus blocks are recorded when leaving the focus room.
- **Daily rhythm:** morning, afternoon, and evening habit checklists, adjustable times, and the original study field guide.
- **Library:** curated phase resources, tier filters, course search, status tracking, personal notes, communities, tools, and books.
- **Research:** curated library search works immediately. Optional web research discovers sources with Exa, extracts pages with Firecrawl, displays original source text, and saves chosen sources to the evidence vault. Extracts are clearly labeled source material, not fabricated AI summaries.
- **Journal, recall, review, evidence, DSA:** the original working tools share the new visual system and server persistence.

Press **Ctrl/Cmd + K** to find sessions, resources, pages, and actions. Motion respects system accessibility preferences and the “Keep things still” setting.

## Optional live research

Add `EXA_API_KEY` and `FIRECRAWL_API_KEY` to the server environment. Both are required for the combined web pipeline. Without them, the curated library remains fully usable. External credentials are not included and the live services cannot be verified without your keys.

Only authenticated owners can call research endpoints. Inputs are validated and bounded. Rate limits are stored in PostgreSQL, shared across serverless instances. Upstream calls have timeouts and partial extraction failures leave discovered source links usable.

## Saving and recovery

Changes save after a short debounce, with a visible save indicator. A save is confirmed only after the server accepts it. If the network fails, your edits remain in the open tab and a recovery banner offers retry and export. Keep that tab open until saving succeeds or download its backup.

Concurrent edits use optimistic revision checks. A stale tab cannot silently replace a newer saved version: export its edits, then load the server version. On returning to a clean tab, Meridian checks for newer server data. Concurrent writes are intentionally resolved explicitly rather than automatically merging potentially conflicting study records.

**Settings → Recovery history** lists recent versions. Restoring creates a new version, retaining the previous one within the 50-version retention window. These snapshots supplement your exports and database-provider backups; they are not long-term unlimited archives.

**Settings → Export backup** creates a checksummed JSON backup. **Import backup** previews the contents before replacing your record. **Find old browser data** reads the prior Meridian's storage only after you request it. Because browser storage is origin-specific, this works when opening the new app at the same original domain/browser. Otherwise import an export from the old site. No old browser records are automatically uploaded.

## Verification and pipelines

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:api
```

The GitHub Actions workflow runs all of these for pushes to `main` and pull requests. `test:api` starts a production server on port 3108 using an isolated temporary development database and randomly generated test credentials. It verifies public routes, private API boundaries, login, save, stale-write rejection, invalid input, recovery versions, restore, and logout, then removes its test data. It never accesses your real database.

Database integration tests execute the real SQL migration and queries against PGlite (PostgreSQL compiled to WASM), including revision conflicts and durable rate limits. Vercel/Neon connectivity and paid research still require deployment-environment validation.

Vercel's native Git integration provides deployment previews and production deployments. Enable branch protection on GitHub to require “Meridian checks / verify” before merging. Workflow and Vercel configuration are included; they run only after the code is pushed and the Vercel project is connected.

## Project map

```text
src/app/                 Next.js pages, styling, and route handlers
src/components/          Observatory shell, dashboard, map, focus, study tools
src/state/cloud.ts       Server-authoritative save and conflict coordination
src/state/store.ts       Learning actions and state (no browser persistence)
src/state/persistence.ts Explicit legacy browser import adapter
src/lib/server/          Authentication, validation, database, integration tests
src/data/                Preserved curriculum and resource library
database/                Versioned PostgreSQL migration
scripts/                 Authentication setup, migration, deployment, HTTP tests
.github/workflows/       CI verification pipeline
public/assets/           Original black-hole artwork and existing assets
```

Design and generated-asset provenance are recorded in `docs/observatory-design.md`.
