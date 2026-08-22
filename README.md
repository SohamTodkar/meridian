# Meridian

Meridian is a local-first learning path: **one useful action, an honest
proof, and a record that stays on this device.** It combines the source
curriculum (65 guided sessions across four capability-gated phases), guided
sessions with evidence checks, an adaptive daily plan, weekly review,
journal, evidence vault, spaced recall, the DSA parallel track, a curated
library — and, new in this release, a 3D shader-driven home, a unified
searchable library explorer, and an optional **Research desk** powered by
Exa + Firecrawl.

The philosophy is unchanged: no accounts, no tracking, no personal data
leaving the machine. Learning records live in this browser (IndexedDB with a
localStorage fallback) and export/import as verified JSON envelopes.

## Quick start (Windows)

The simplest option remains double-clicking `start.cmd` if you have one, or:

```bat
cd northstar-hq
pnpm install
pnpm dev
```

Then open <http://localhost:3000>. For a production run:

```bat
pnpm build
pnpm start
```

Everything installs and runs from the D: drive — dependencies resolve through
pnpm with the store pinned to `D:\pnpm-store` via `.npmrc` in this folder.

> Node/npm alternative: `npm install` and `npm run dev` work too; pnpm is
> what this repo is pinned with (`pnpm-lock.yaml`).

## Deploy on Vercel

The repo is Vercel-ready as-is — Next.js is auto-detected, `pnpm` is picked
up from `pnpm-lock.yaml`, and `pnpm build` is the build command. One step is
yours to do:

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Add the environment variables (Project → Settings → Environment
   Variables) so the Research desk works in production:
   - `EXA_API_KEY` — from <https://dashboard.exa.ai/api-keys>
   - `FIRECRAWL_API_KEY` — from <https://firecrawl.dev>
3. Deploy. Without the keys every learning feature still works — only the
   research desk returns its configuration notice.

Node 20.9+ is pinned via `engines` in `package.json`. Learning data is
browser-local by design, so nothing else needs provisioning.

## What ships in this release

### The rebuilt presentation engine

| System | Where | What it does |
| --- | --- | --- |
| Scroll telemetry | `src/lib/scroll.ts`, `src/lib/motion.ts` | One external store feeds `--scroll-progress` to CSS, the canvases and the HUD — zero React re-renders per frame |
| Smooth scrolling | `src/components/motion/smooth-scroll.tsx` | Lenis, disabled under `prefers-reduced-motion`, native keyboard/selection untouched, pauses while modals are open, smooth in-page anchors |
| Kinetic typography | `src/components/motion/kinetic-text.tsx` | Per-character roll with 0.02 s stagger, hover or scroll-triggered, aria-safe |
| Page transitions | `src/components/motion/page-curtain.tsx` | Two-panel transform-only wipe with a route-specific loading label and a 3 s stall guard |
| WebGL hero | `src/components/webgl/` | Multi-layer parallax through a depth map, alpha-map cutout, roughness-modulated directional lighting, contact shadow, a glTF PBR overlay revealed by a simplex-noise fluid-blob mask (rendered to a 256² target), astrolabe rings and phase beacons |
| Phase geometry | `src/components/webgl/phase-geometry-viewer.tsx` | Scroll-bound quaternion rotation, drag inspection, per-phase solids |
| Library explorer | `src/components/library-explorer.tsx` | Fuse.js fuzzy search over every resource/community/tool/book, multi-tag filters, three sort modes, card grid with clip-path ellipse hover reveal, infinite scroll, quiet empty state |
| Command palette | `src/components/command-palette.tsx` | Fuse.js fuzzy matching across sessions, curriculum, resources and routes |
| Session detail | `src/components/session-runner.tsx` | Reading-progress bar, sticky section TOC with scrollspy, Web Share API (clipboard fallback) |
| Rive + scroll drawing | `src/components/rive/` | Lazy WASM vector animations and a compositor-driven scroll-bound line drawing |
| Easter eggs & HUD | `src/components/easter-eggs-and-hud.tsx` | Styled console banner, F1 telemetry HUD with *measured* FPS/scroll/storage/GPU numbers, Konami-code confetti, hotkeys |
| SEO | `src/app/layout.tsx`, `sitemap.ts`, `robots.ts` | Per-route metadata, Open Graph, JSON-LD (`WebApplication`), sitemap and robots |

### The Research desk (Exa + Firecrawl)

`/research` in the sidebar runs the combined pipeline:

```
query → Exa neural search (top sources)
      → Firecrawl extraction (markdown + metadata, per URL, parallel)
      → rendered in the Meridian interface
```

- API routes: `POST /api/research/search` (10 min cache),
  `/scrape` (1 h cache), `/combined` (uncached by design), `/parse`
  (hosted documents; local-file upload is deliberately not exposed — Meridian
  never uploads your files).
- Security: keys live in `.env.local` on the server only; every input is
  Zod-validated; each IP is rate-limited to 30 requests/minute
  (`src/lib/rate-limit.ts`); errors carry trace IDs.
- Privacy boundary: the research desk sends **only the query you type** to
  public-web services. Your learning record never leaves the device, with or
  without keys.

To enable it:

```bat
copy .env.local.example .env.local
:: then edit .env.local with your keys and restart (pnpm dev)
```

## Assets

All heavy assets are local under `public/assets/` (no CDN):
`textures/` (base, depth, alpha, roughness, normal — generated),
`models/meridian-knot.glb` (generated), `rive/meridian-orb.riv`.
Regenerate the procedural ones any time with `pnpm assets`.

## Keyboard shortcuts

- `Ctrl/Cmd + K` — command palette (`↑↓` move, `Enter` open, `Esc` close)
- `F1` or `?` — telemetry HUD (live measured numbers)
- `Ctrl/Cmd + Shift + L` — jump to the daily log
- ↑ ↑ ↓ ↓ ← → ← → B A — you know what to do

## Your data and backups

Progress is stored by your browser on this device. Use
**Settings → Portable state → Export JSON** regularly, and
**Preview restore** to import a backup (Meridian, Operations Cockpit, and
Northstar/Guided Learning exports are all supported as legacy imports;
every restore is previewed before anything changes).

## Tests

```bat
pnpm test        # 87 tests: curriculum invariants, state, persistence,
                 # render contracts, rate limiting, caches, scroll store
pnpm typecheck   # strict TypeScript
pnpm lint        # ESLint
```

## Project layout

```
src/
  app/            routes, API handlers, sitemap/robots, global styles
  components/
    motion/       smooth scroll, curtain, kinetic text, progress, reveal
    webgl/        engine, shaders, textures, hero, phase geometry
    rive/         lazy Rive frame + scroll-bound drawing
    research/     research desk UI
    …             shell, views, palette, HUD
  lib/            scroll store, motion, performance, env, rate limit,
                  caches, Exa/Firecrawl services
  data/           curriculum model + resource library (unchanged, tested)
  state/          local-first store, persistence, selectors (unchanged)
public/assets/    generated textures, glb model, rive file
scripts/          asset generator (node scripts/generate-assets.mjs)
```
