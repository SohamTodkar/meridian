# Meridian Enhancement Delivery & Compatibility Contract

## Purpose

This contract merges the two supplied Meridian improvement roadmaps into one delivery sequence. The implementation remains **personal, local-first, and static-export compatible**. It prioritizes trustworthy learning records before recommendation, analytics, or offline convenience features.

## Source-roadmap consolidation

| Consolidated domain | Included outcomes | Delivery dependency |
| --- | --- | --- |
| Learning-data integrity | Local calendar-day semantics, measured time, habits, resilient streaks, and capability-weighted progress | Required before planning and analytics |
| Curriculum integrity | Stable content IDs, prerequisite rules, gate policies, overrides, and generated validation | Required before data migration and expanded curriculum editing |
| Planning and execution | Capacity-aware daily and weekly plans, carry-forward control, active resource workflow, and quick capture | Uses the corrected time and progression data |
| Evidence and reflection | Evidence Vault, proof policies, portfolio derivation, journal editing, confusion capture, weekly decisions | Uses reliable session and artifact state |
| Recall and practice | Scheduled retrieval practice, DSA attempt/revisit records, and a recall workspace | Uses IndexedDB and planning hooks |
| Insight and guidance | Event history, capability trajectory, forecast ranges, workload signals, and concise Today guidance | Uses events produced by completed foundational flows |
| Resilience and quality | IndexedDB persistence, rolling backups, safe merge-import, PWA/offline support, accessibility, command actions, and testing | Protects all completed domains |

## Legacy-data compatibility guarantees

Meridian currently persists a `meridian.v1` Zustand snapshot in browser storage. Existing progress is valuable user data. Every migration must follow these guarantees.

| Existing data | Compatibility guarantee | Migration behavior |
| --- | --- | --- |
| `checks` | Completed curriculum, session-check, gate, and DSA ticks are never silently discarded | Positional IDs are translated through a generated old-to-stable ID map. Unmapped IDs are retained as reviewable orphans. |
| `sessions` | Historical completion and current step state remain visible | Existing `completed` and `completedAt` are copied unchanged; new attempt and proof fields begin empty. |
| `journals` | Entries remain intact and searchable | Original IDs, dates, text, and session links are retained. New fields are optional and additive. |
| `dailyLogs` | Existing time, habits, notes, and metrics remain usable | Logs are normalized into dated time blocks and habit records without changing recorded minute totals. |
| `reviews` and `portfolio` | Existing reflection and portfolio records are retained | Records are copied unchanged, then enriched with optional status and evidence links. |
| `settings` | Current pace mode and overrides remain authoritative | Missing new fields receive safe defaults; existing keys are never overwritten by defaults. |
| JSON exports | Existing exported snapshots remain importable | Import detects legacy versions, runs the same migration pipeline in memory, previews the result, and only writes after confirmation. |

## Non-breaking migration protocol

The persistent store will migrate in a one-way, recoverable sequence. First, Meridian reads the legacy snapshot without deleting it. It then validates and transforms a clone into the versioned repository. It writes the new state only after the transform succeeds and retains a timestamped backup of the source snapshot. A migration marker prevents duplicate imports. The legacy source is retained as a read-only fallback for one release cycle and is removed only after a successful user-visible backup/export verification.

All import and restore operations will be **preview-first**. The user will see counts for added checks, sessions, journals, logs, evidence, and conflicts. Completion ticks merge monotonically; completed sessions retain their earliest completion timestamp; journals and portfolio entries union by ID; measured time is preserved instead of overwritten; conflicts are kept rather than silently selected.

## Delivery quality gates

Every domain is complete only when it has pure-logic tests, persistence/migration tests where applicable, browser validation for its primary user action, and a non-destructive import/export check. New controls must work with keyboard and pointer input, remain usable at mobile width, and respect the application’s quiet black-and-white visual language.

## Deliberate boundaries

The first implementation does not introduce accounts, a server-side personal-data store, hidden AI planning, social comparison, or punitive streak mechanics. Opt-in multi-device synchronization remains a later enhancement and must preserve the same explicit merge and conflict model. Reminder capability is designed as browser-local and opt-in; it must not imply delivery when the application is unavailable.
