import { describe, expect, it } from "vitest";
import { model } from "@/data";
import {
  getActivePhase,
  getDsaProgress,
  getDailyCapacity,
  getDailyPlanRecommendation,
  getDueRetrievalPrompts,
  getLearningHeatmap,
  getLearningMinutes,
  getPhaseTimeBreakdown,
  getPhaseAccess,
  getSessionAccess,
  getNextAction,
  getOverallProgress,
  getPhaseProgress,
  getReviewWeekKey,
  getStreak,
  getWeeklyPlanSummary,
  orderJournalEntries,
  nextRetrievalInterval,
  reviewCounts,
  CAPABILITY_WEIGHTS,
  weightedCapabilityProgress,
  type MeridianStateSnapshot,
} from "./selectors";

function fixture(overrides: Partial<MeridianStateSnapshot> = {}): MeridianStateSnapshot {
  return {
    checks: {},
    sessions: {},
    journals: [],
    dailyLogs: {},
    settings: { scheduleMode: "normal" },
    ...overrides,
  };
}

describe("derived progress selectors", () => {
  it("keeps curriculum coverage, evidence, and capability progress distinct", () => {
    const phase = model.phases[0];
    const firstSection = phase.curriculum[0];
    const session = phase.sessions[0];
    const state = fixture({
      checks: { [`${firstSection.key}.1`]: true },
      sessions: { [session.id]: { currentStep: 0, completed: true } },
    });
    state.checks[`${session.id}.check.1`] = true;
    state.checks[`${session.id}.check.2`] = true;
    state.checks[`${session.id}.check.3`] = true;
    const progress = getPhaseProgress(model, phase, state);
    expect(progress.completed).toBe(1);
    expect(progress.percent).toBe(Math.round((CAPABILITY_WEIGHTS.session / progress.weightedTotal) * 100));
    expect(progress.coverage).toMatchObject({ completed: 1 });
    expect(progress.evidence).toMatchObject({ completed: 3 });
    expect(progress.total).toBeGreaterThan(progress.completed);
    expect(getOverallProgress(model, state)).toMatchObject({
      completed: 1,
      percent: Math.round((1 / getOverallProgress(model, state).total) * 100),
    });
  });

  it("advances the active phase only after all capability evidence is checked", () => {
    const first = model.phases[0];
    const evidence = [
      ...first.checkpoint.cockpit.requirements.map((_, index) => [`p0.checkpoint.requirement.${index + 1}`, true]),
      ...first.checkpoint.northstar.map((_, index) => [`p0.gate.${index + 1}`, true]),
    ];
    const state = fixture({ checks: Object.fromEntries(evidence) });
    expect(getActivePhase(model, state).id).toBe("p1");
  });

  it("requires the preceding phase or a deliberate phase override before opening a later phase", () => {
    const phase = model.phases[1];
    expect(getPhaseAccess(model, phase, fixture())).toMatchObject({ allowed: false, requirements: [{ key: "phase:p0" }] });
    expect(getPhaseAccess(model, phase, fixture({ progressionOverrides: { "phase:p1": { key: "phase:p1", reason: "already studied", createdAt: "2026-02-12T12:00:00Z" } } }))).toMatchObject({ allowed: true, overridden: true });
  });

  it("requires a prior guided session unless the target session has an explicit override", () => {
    const phase = model.phases[0];
    expect(getSessionAccess(model, phase, phase.sessions[1].id, fixture())).toMatchObject({ allowed: false, requirements: [{ key: `session:${phase.sessions[0].id}` }] });
    expect(getSessionAccess(model, phase, phase.sessions[1].id, fixture({ sessions: { [phase.sessions[0].id]: { currentStep: 0, completed: true } } }))).toMatchObject({ allowed: true });
  });

  it("weights completed sessions more than checkpoint evidence while retaining transparent item counts", () => {
    const progress = weightedCapabilityProgress(1, 2, 1, 2);
    expect(progress).toMatchObject({ completed: 2, total: 4, weightedCompleted: 10, weightedTotal: 20, percent: 50 });
    expect(weightedCapabilityProgress(1, 2, 0, 2).percent).toBe(35);
  });

  it("selects the first incomplete session in the active phase", () => {
    const phase = model.phases[0];
    const state = fixture({
      sessions: { [phase.sessions[0].id]: { currentStep: 2, completed: true } },
    });
    expect(getNextAction(model, state)).toMatchObject({ type: "session", sessionId: phase.sessions[1].id });
  });

  it("creates a transparent daily plan from the next unlocked session and an explicit capacity", () => {
    const state = fixture({ settings: { scheduleMode: "normal", pace: { weeklyHours: 6, dailyTouchMinutes: 15, restDay: "Sunday" } } });
    const capacity = getDailyCapacity(model, state, "2026-02-11");
    const plan = getDailyPlanRecommendation(model, state, "2026-02-11");
    expect(capacity).toMatchObject({ minutes: 60, isRestDay: false });
    expect(plan.tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "habit:h.anki", kind: "habit", minutes: 15 }),
      expect.objectContaining({ id: "session:p0s1", kind: "session" }),
    ]));
    expect(plan.reasons[0]).toContain("Six-day allocation");
  });

  it("keeps rest-day planning deliberately small while retaining retrieval and reflection", () => {
    const state = fixture({ settings: { scheduleMode: "normal", pace: { weeklyHours: 12, dailyTouchMinutes: 12, restDay: "Sunday" } } });
    const plan = getDailyPlanRecommendation(model, state, "2026-02-15");
    expect(plan).toMatchObject({ capacityMinutes: 12, isRestDay: true });
    expect(plan.tasks.map((task) => task.kind)).toEqual(expect.arrayContaining(["habit", "reflection"]));
    expect(plan.tasks.some((task) => task.kind === "session")).toBe(false);
  });

  it("prioritizes due local retrieval prompts over generic review in daily planning", () => {
    const state = fixture({
      settings: { scheduleMode: "normal", pace: { weeklyHours: 6, dailyTouchMinutes: 15, restDay: "Sunday" } },
      retrievalPrompts: [{ schemaVersion: 1, id: "retrieval.confusion", sourceJournalId: "journal.confusion", question: "Why does a loop terminate?", dueDate: "2026-02-11", intervalDays: 1, repetitions: 0, status: "scheduled", createdAt: "2026-02-10T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z" }],
    });
    const plan = getDailyPlanRecommendation(model, state, "2026-02-11");
    expect(plan.tasks).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "retrieval", retrievalPromptId: "retrieval.confusion" })]));
    expect(plan.tasks.some((task) => task.id === "habit:h.anki")).toBe(false);
  });

  it("carries intentionally deferred work into tomorrow without inventing duplicate task identities", () => {
    const state = fixture({
      dailyPlans: {
        "2026-02-11": {
          schemaVersion: 1,
          date: "2026-02-11", capacityMinutes: 60, mode: "Normal", generatedAt: "2026-02-11T09:00:00Z", tasks: [
            { id: "reflection:daily", kind: "reflection", title: "Capture", detail: "", minutes: 5, status: "deferred", deferredTo: "2026-02-12", reason: "protect focus" },
          ],
        },
      },
    });
    const plan = getDailyPlanRecommendation(model, state, "2026-02-12");
    expect(plan.tasks.filter((task) => task.id === "reflection:daily")).toHaveLength(1);
    expect(plan.tasks.find((task) => task.id === "reflection:daily")).toMatchObject({ status: "proposed" });
  });

  it("summarizes accepted weekly plans separately from completed plan minutes", () => {
    const state = fixture({
      dailyPlans: {
        "2026-02-09": { schemaVersion: 1, date: "2026-02-09", capacityMinutes: 60, mode: "Normal", generatedAt: "", tasks: [
          { id: "a", kind: "habit", title: "A", detail: "", minutes: 15, status: "completed", reason: "" },
          { id: "b", kind: "session", title: "B", detail: "", minutes: 45, status: "deferred", deferredTo: "2026-02-10", reason: "" },
        ] },
      },
    });
    expect(getWeeklyPlanSummary(state, "2026-02-09")).toEqual({ plannedMinutes: 60, completedMinutes: 15, deferredTasks: 1 });
  });

  it("counts consecutive touched days backwards from today", () => {
    const state = fixture({
      dailyLogs: {
        "2026-02-10": { date: "2026-02-10", minutes: 20, touched: true },
        "2026-02-11": { date: "2026-02-11", minutes: 30, touched: true },
        "2026-02-12": { date: "2026-02-12", minutes: 60, touched: true },
      },
    });
    expect(getStreak(state, new Date("2026-02-12T12:00:00Z"))).toBe(3);
  });

  it("does not reset a streak merely because the current calendar day has not started yet", () => {
    const state = fixture({
      dailyLogs: {
        "2026-02-10": { date: "2026-02-10", minutes: 20, touched: true },
        "2026-02-11": { date: "2026-02-11", minutes: 30, touched: true },
      },
    });
    expect(getStreak(state, new Date("2026-02-12T12:00:00Z"))).toBe(2);
  });

  it("does not double-count a persisted timer entry when a log is rehydrated", () => {
    expect(getLearningMinutes({
      date: "2026-02-12",
      minutes: 60,
      touched: true,
      timeEntries: [{ id: "timer", date: "2026-02-12", seconds: 3600, source: "session", createdAt: "2026-02-12T12:00:00Z" }],
    })).toBe(60);
  });

  it("calculates DSA progress from registry-style ids", () => {
    const ids = ["dsa.d1.d1.topics.1", "dsa.d1.d1.topics.2"];
    expect(getDsaProgress(fixture({ checks: { [ids[0]]: true } }), ids)).toEqual({ completed: 1, total: 2, percent: 50 });
  });

  it("keys weekly reviews by the Monday of the current week", () => {
    expect(getReviewWeekKey(new Date("2026-02-12T12:00:00Z"))).toBe("2026-02-09");
    expect(getReviewWeekKey(new Date("2026-02-15T12:00:00Z"))).toBe("2026-02-09");
  });

  it("orders due retrieval prompts and advances deterministic retrieval intervals", () => {
    const state = fixture({ retrievalPrompts: [
      { schemaVersion: 1, id: "late", sourceJournalId: "a", question: "Late", dueDate: "2026-02-09", intervalDays: 1, repetitions: 0, status: "scheduled", createdAt: "2026-02-09T00:00:00Z", updatedAt: "2026-02-09T00:00:00Z" },
      { schemaVersion: 1, id: "today", sourceJournalId: "b", question: "Today", dueDate: "2026-02-11", intervalDays: 1, repetitions: 0, status: "snoozed", createdAt: "2026-02-10T00:00:00Z", updatedAt: "2026-02-10T00:00:00Z" },
      { schemaVersion: 1, id: "done", sourceJournalId: "c", question: "Mastered", dueDate: "2026-02-01", intervalDays: 30, repetitions: 5, status: "mastered", createdAt: "2026-02-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
    ] });
    expect(getDueRetrievalPrompts(state, "2026-02-11").map((prompt) => prompt.id)).toEqual(["late", "today"]);
    expect([nextRetrievalInterval(0), nextRetrievalInterval(1), nextRetrievalInterval(4), nextRetrievalInterval(12)]).toEqual([1, 3, 30, 30]);
  });

  it("keeps private heatmap and phase-time analytics derived from local records", () => {
    const session = model.phases[0].sessions[0];
    const state = fixture({ dailyLogs: { "2026-02-11": { date: "2026-02-11", minutes: 25, touched: true, timeEntries: [{ id: "timer", date: "2026-02-11", seconds: 1500, source: "session", sessionId: session.id, createdAt: "2026-02-11T10:00:00Z" }] } } });
    expect(getLearningHeatmap(state, "2026-02-12", 2)).toEqual([{ date: "2026-02-11", minutes: 25, touched: true }, { date: "2026-02-12", minutes: 0, touched: false }]);
    expect(getPhaseTimeBreakdown(model, state)[0]).toMatchObject({ phaseId: model.phases[0].id, minutes: 25 });
  });

  it("orders journal entries newest first", () => {
    const entries = orderJournalEntries([
      { id: "a", date: "2026-02-09", text: "older" },
      { id: "b", date: "2026-02-12", text: "newer" },
    ]);
    expect(entries.map((entry) => entry.id)).toEqual(["b", "a"]);
  });

  it("counts saved review answers and rituals", () => {
    expect(reviewCounts({ answers: { shipped: "proof", empty: "" }, rituals: { write: true, rest: false } })).toEqual({ answers: 1, rituals: 1 });
  });
});
