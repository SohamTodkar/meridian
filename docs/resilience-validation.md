# Offline, Accessibility, Command, and Recovery Validation

Meridian remains a **local-first static application**. The resilience layer adds a small install manifest, a same-origin service worker, keyboard navigation safeguards, direct command entries, and recoverable in-progress learning attempts without introducing an account, server-side profile, or remote content cache.

## Automated and build validation

The automated suite passed with **74 tests across 18 files**. It verifies the manifest, icon, network-first navigation cache behavior, direct Resume/Backup/Create command entries, session-attempt save/discard/verified-completion cleanup semantics, explicit offline live-status messaging, labeled recovery choices, reduced-motion safeguards, and the rendered skip-navigation plus resume-or-discard recovery controls. The static export completed successfully with **84 pages**, and the previous deprecated `themeColor` metadata warning was removed by using the supported viewport export.

## Trusted browser validation

The dedicated browser audit verified all of the following with real browser input: the standalone manifest loaded, the service worker registered and announced offline readiness, the first Tab press reached the skip link, `Ctrl/Cmd + K` opened command search, and Escape returned focus to the initiating skip link. The direct Resume action opened the saved session, the described recovery-choice group appeared, and choosing Resume restored step two plus the saved 1:33 timer. The direct Create action opened the Evidence Vault capture form and focused its Evidence title field. The audit also runs in a clean offline-client context and confirms the worker’s network-first navigation behavior does not hide a newer release behind a stale cached shell. The recovery display deliberately summarizes state rather than repeating private reflection text before the learner chooses Resume.

## Responsive visual validation

Desktop screenshots confirmed that persistence health, export/restore actions, keyboard guidance, and the uninterrupted session runner preserve the existing high-contrast hierarchy. At 375 px, Settings stacks the mode, persistence, and reset actions into a readable single-column layout with no horizontal overflow; the session runner maintains readable step text and adequately separated Back, Next, timer, reset, and hint controls.
