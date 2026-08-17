# Learning Intelligence Validation

Meridian’s retrieval, reflection, weekly-decision, and private-analytics capability remains **local-first** and additive to the existing persisted state. Journal records retain their legacy `id`, `date`, `sessionId`, and `text` fields; optional `confusion` and `nextQuestion` fields create one versioned retrieval prompt when a session is completed. Existing journal, Evidence Vault, plan, and backup records continue to load without conversion requirements.

## Automated validation

The full Vitest suite passed with **60 tests across 13 test files**. Coverage confirms deterministic retrieval due ordering and interval progression, due-prompt insertion into capacity-aware daily plans, local heatmap and phase-time derivation, automatic prompt creation from session confusion, retrieval review/snooze/master lifecycle behavior, weekly decision persistence, and the new `/recall` route contract. A controlled rendered-view test additionally verifies an actionable due Recall prompt plus persisted weekly decisions beside the private analytics surface.

## Trusted browser validation

The dedicated browser audit seeded a local-only due prompt and measured time entry, then verified that the Recall workspace rendered the prompt, the learner could complete it with a trusted pointer action, and the record advanced from one to three days with `repetitions: 1`. The recorded execution also confirmed `recallLoaded`, `recalled`, `continueTyped`, `stopTyped`, `startTyped`, `savedReview`, and `analyticsVisible`. The same audit saved the three decision values in the local review record and confirmed the private analytics heading, measured-time-by-phase view, and capability trajectory were visible.

## Build and visual validation

The production build completed successfully, emitted **84 static pages**, and includes `/recall` as a static route. Desktop and 375 px mobile visual reviews found the Recall empty state, metric summary, navigation, weekly decision fields, and analytics layout readable without horizontal overflow. On mobile, the decision and analytics grids stack into a single-column reading order, preserving touchable controls and the existing focus treatment.
