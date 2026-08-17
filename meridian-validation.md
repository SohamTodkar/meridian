# Meridian Validation Notes

- The supplied Meridian Next.js app was adopted as the active application and the prior Northstar client/server routes were removed.
- The release uses Next.js 16.3 with React 19.2.8 and a Webpack production build path.
- The localStorage-backed Meridian shell is loaded client-side to avoid server prerender incompatibilities while preserving local-only state.
- The managed preview runs its verified production server path. It rendered the Today dashboard and first-run welcome layer after restart.
- Mobile checks at 375×812 covered Today, Learning Path, Session Detail, and Library. The responsive rail collapsed to a compact header, the welcome layer remained contained, and the guided session controls were reachable.
- Automated validation passed: 17 Vitest tests and a complete Next.js production build covering all 14 supplied routes.
- A fresh browser session on the primary managed preview rendered the full Today workspace, navigation, next-session action, schedule selector, daily rhythm, and local-only onboarding layer. It did not remain on the opening hydration screen.
