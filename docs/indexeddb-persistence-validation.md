# IndexedDB Persistence and Restore Validation

Meridian now uses a version-two, **IndexedDB-first** persistence adapter while retaining localStorage only as a resilience fallback. The adapter reads an existing `meridian.v1` snapshot once when IndexedDB is empty, copies that exact snapshot to the browser database, marks the migration, and subsequently prefers the newer IndexedDB record. No server-side learning data or account record is involved.

## Automated validation

The full suite passed with **66 tests across 16 files**. New coverage verifies that a legacy localStorage snapshot copies exactly once, later IndexedDB data is not overwritten by stale localStorage, and an unavailable IndexedDB implementation keeps writes in the localStorage fallback. Separate backup tests confirm deterministic version-two envelopes, checksum mismatch rejection, and continued compatibility with Meridian version-one imports. A rendered Settings test also verifies the IndexedDB status, verification copy, and non-destructive restore entry controls.

## Trusted browser validation

The dedicated browser audit began with a legacy `meridian.v1` localStorage record and a cleared `meridian.local` IndexedDB database. It confirmed the application displayed the completed migration, wrote a version-two IndexedDB snapshot containing the legacy check, previewed a checksummed restore without changing saved data, cancelled that preview without side effects, then re-opened and confirmed the restore. The final IndexedDB snapshot contained the verified replacement check and journal record.

## Build and visual validation

The static production build completed successfully with **84 pages**. Desktop and 375 px mobile Settings reviews confirmed the persistence-health status, verification explanation, export action, preview action, and reset controls remain readable without horizontal overflow. The mobile layout retains a single-column, touch-friendly flow while keeping the important data-resilience status visually distinct.
