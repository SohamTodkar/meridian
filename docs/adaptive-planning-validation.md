# Adaptive Planning Validation

Meridian now creates a versioned local daily-plan record with an explicit capacity, mode, timestamp, proposed task list, acceptance timestamp, and per-task state. Recommendations are deterministic: they preserve deliberately deferred work, reserve an Anki retrieval floor, select only the next unlocked guided session or checkpoint action, and finish with a short learning capture. The recommendation explains the weekly-mode capacity rule instead of presenting an opaque schedule.

The Today workspace visibly separates the **65-minute proposed plan** from the **210-minute available capacity** and states that unused time is intentionally unassigned. The weekly review now provides a local plan ledger that compares planned task minutes, completed plan minutes, and deliberate deferrals without treating deferral as debt.

Trusted browser interaction validation accepted a plan, completed the Anki task, deferred the session to the following day, and opened the weekly ledger. The resulting local record retained an acceptance time, a completed habit, an explicit deferred task, and the rendered ledger showed the corresponding planned, completed, and deferred values. The full suite passed with **49 tests**, and the static production build generated all **83 pages**.
