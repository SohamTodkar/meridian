# Observatory validation

Validated on September 5, 2026 on Windows with Node.js 24 and pnpm 11.19.

## Automated checks

- Production Vercel build: successful; 93 prerendered pages generated, with dynamic API routes.
- TypeScript: passes.
- ESLint: passes without warnings.
- Vitest: 110 tests across 22 files pass.
- Production HTTP integration: 37 checks pass against an isolated server and temporary database.

The database suite runs the real migration and queries against PGlite PostgreSQL, covering atomic writes, competing revisions, history, restoration, and durable rate limits. Cloud coordination tests cover edits during an in-flight save, edits during a background refresh, conflicts, and public preview isolation. HTTP checks cover public pages, private API authentication, login/logout, bounded validation, same-origin enforcement (including Next's hostname normalization), persistence, recovery history, and restoration.

## Browser checks

The production application was exercised with an isolated study record, separate from the default development workspace:

- Accepted a daily plan and saved a reflection.
- Walked through all five steps of the first Python session.
- Verified completion remains disabled until all evidence checks are selected.
- Completed the session and confirmed that the next session unlocks.
- Restarted the server and verified that the journal and evidence persisted.
- Confirmed the generated recall question can be rescheduled.
- Started, paused, resumed, and finished a focus block: exactly one 77-second record was saved, together with the focus intention.
- Searched curated research, saved a source to evidence, used keyboard search to open Settings, and loaded recovery history.
- Inspected the dashboard, learning map, phase selection, focus room, and mobile navigation at desktop and phone widths.
- Verified a failed save retains the current edits and succeeds through the Retry save action.

## Deployment checks still requiring account setup

No live deployment has been made, no GitHub workflow has been run remotely, and no production Vercel access setting has been changed. The existing site remains as deployed until the source is pushed and redeployed.

Neon provisioning, environment values, Vercel production-domain access, and actual cross-device connectivity require the owner's account setup. Exa and Firecrawl live calls require API keys; curated research works without them. Follow the deployment checklist in the README, then verify `/api/health/`, owner sign-in, a saved change after reload, and public access in an incognito window.
