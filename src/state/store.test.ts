import { describe, expect, it } from "vitest";
import { useMeridianStore } from "./store";

describe("review persistence state", () => {
  it("writes ritual selections into the saved review", () => {
    useMeridianStore.setState({ reviews: {} });
    useMeridianStore.getState().setReview("2026-02-09", {
      answers: { shipped: "A proof" },
      rituals: { write: true, rest: true },
      savedAt: "2026-02-12T00:00:00.000Z",
    });
    expect(useMeridianStore.getState().reviews?.["2026-02-09"]?.rituals).toEqual({
      write: true,
      rest: true,
    });
  });

  it("can resolve the fresh-session hydration fallback without changing learning data", () => {
    useMeridianStore.setState({
      hydrated: false,
      checks: { "p0s1.step": true },
      sessions: { p0s1: { currentStep: 1, completed: false } },
    });

    useMeridianStore.getState().setHydrated(true);

    expect(useMeridianStore.getState()).toMatchObject({
      hydrated: true,
      checks: { "p0s1.step": true },
      sessions: { p0s1: { currentStep: 1, completed: false } },
    });
  });

  it("persists each Today task independently instead of sharing one daily completion flag", () => {
    useMeridianStore.setState({ dailyLogs: {} });

    useMeridianStore.getState().setHabit("2026-08-14", "h.deep", true);
    useMeridianStore.getState().setHabit("2026-08-14", "h.anki", true);
    useMeridianStore.getState().setHabit("2026-08-14", "h.deep", false);

    expect(useMeridianStore.getState().dailyLogs["2026-08-14"]).toMatchObject({
      touched: true,
      habits: { "h.deep": false, "h.anki": true },
    });
  });

  it("keeps measured session time separate from a manually entered daily estimate", () => {
    useMeridianStore.setState({ dailyLogs: {} });
    const state = useMeridianStore.getState();
    state.setDailyLog("2026-08-14", 30, "Manual reflection");
    state.recordTime({ date: "2026-08-14", seconds: 1500, source: "session", sessionId: "p0s1" });

    expect(useMeridianStore.getState().dailyLogs["2026-08-14"]).toMatchObject({
      manualMinutes: 30,
      minutes: 55,
      timeEntries: [expect.objectContaining({ source: "session", seconds: 1500 })],
    });
  });

  it("persists a timestamped progression override and can remove it without changing learning records", () => {
    useMeridianStore.setState({ progressionOverrides: {} });
    const state = useMeridianStore.getState();
    state.setProgressionOverride("session:p0s2", "I completed the equivalent exercise already.");
    expect(useMeridianStore.getState().progressionOverrides?.["session:p0s2"]).toMatchObject({ key: "session:p0s2", reason: "I completed the equivalent exercise already." });
    state.clearProgressionOverride("session:p0s2");
    expect(useMeridianStore.getState().progressionOverrides?.["session:p0s2"]).toBeUndefined();
  });

  it("accepts a daily plan and keeps task completion and deliberate deferral distinct", () => {
    useMeridianStore.setState({ dailyPlans: {} });
    const state = useMeridianStore.getState();
    state.setDailyPlan({
      schemaVersion: 1,
      date: "2026-08-14", capacityMinutes: 60, mode: "Normal", generatedAt: "2026-08-14T09:00:00Z", tasks: [
        { id: "habit:h.anki", kind: "habit", title: "Anki", detail: "", minutes: 15, status: "proposed", reason: "retrieval" },
        { id: "session:p0s1", kind: "session", title: "Session", detail: "", minutes: 45, status: "proposed", sessionId: "p0s1", reason: "next" },
      ],
    });
    state.setPlanTaskStatus("2026-08-14", "habit:h.anki", "completed");
    state.setPlanTaskStatus("2026-08-14", "session:p0s1", "deferred", "2026-08-15");

    expect(useMeridianStore.getState().dailyPlans?.["2026-08-14"]).toMatchObject({
      schemaVersion: 1,
      acceptedAt: expect.any(String),
      tasks: [
        expect.objectContaining({ id: "habit:h.anki", status: "completed" }),
        expect.objectContaining({ id: "session:p0s1", status: "deferred", deferredTo: "2026-08-15" }),
      ],
    });
  });

  it("records verified session evidence without replacing the original journal record", () => {
    useMeridianStore.setState({ sessions: {}, journals: [], evidence: [], dailyLogs: {}, dailyPlans: {}, counters: { sessionsStarted: 0, sessionsCompleted: 0 } });
    useMeridianStore.getState().completeSession("p0s1", { id: "p0s1.2026-08-14", date: "2026-08-14", sessionId: "p0s1", text: "The program ran." }, {
      id: "evidence.p0s1.2026-08-14", kind: "session-proof", title: "Program runs", note: "The program ran.", phaseId: "p0", sessionId: "p0s1", capability: "Python", proofStatus: "verified",
    });
    expect(useMeridianStore.getState().journals).toHaveLength(1);
    expect(useMeridianStore.getState().evidence).toEqual([expect.objectContaining({ schemaVersion: 1, proofStatus: "verified", sessionId: "p0s1" })]);
  });

  it("turns a structured session confusion into one local retrieval prompt and advances it after review", () => {
    useMeridianStore.setState({ sessions: {}, journals: [], evidence: [], dailyLogs: {}, dailyPlans: {}, retrievalPrompts: [], counters: { sessionsStarted: 0, sessionsCompleted: 0 } });
    const state = useMeridianStore.getState();
    state.completeSession("p0s1", { id: "p0s1.2026-08-14", date: "2026-08-14", sessionId: "p0s1", text: "The program ran.", confusion: "Why does the loop stop?", nextQuestion: "What condition ends this loop?" });
    expect(useMeridianStore.getState().retrievalPrompts).toEqual([expect.objectContaining({ id: "retrieval.p0s1.2026-08-14", question: "What condition ends this loop?", dueDate: "2026-08-14", status: "scheduled" })]);
    state.reviewRetrievalPrompt("retrieval.p0s1.2026-08-14", "2026-08-14");
    expect(useMeridianStore.getState().retrievalPrompts).toEqual([expect.objectContaining({ repetitions: 1, intervalDays: 3, dueDate: "2026-08-17", status: "scheduled" })]);
    state.snoozeRetrievalPrompt("retrieval.p0s1.2026-08-14", "2026-08-17");
    state.masterRetrievalPrompt("retrieval.p0s1.2026-08-14");
    expect(useMeridianStore.getState().retrievalPrompts).toEqual([expect.objectContaining({ dueDate: "2026-08-18", status: "mastered" })]);
  });

  it("keeps weekly continue, stop, and start decisions beside the saved review", () => {
    useMeridianStore.setState({ reviews: {} });
    useMeridianStore.getState().setWeeklyDecisions("2026-08-10", { continue: "Daily recall", stop: "Opening new tabs", start: "A Friday explainer" });
    expect(useMeridianStore.getState().reviews?.["2026-08-10"]).toMatchObject({ decisions: { continue: "Daily recall", stop: "Opening new tabs", start: "A Friday explainer" } });
  });

  it("can remove and restore evidence without changing its original journal record", () => {
    useMeridianStore.setState({
      journals: [{ id: "p0s1.2026-08-14", date: "2026-08-14", sessionId: "p0s1", text: "The program ran." }],
      evidence: [{ schemaVersion: 1, id: "evidence.p0s1.2026-08-14", kind: "session-proof", title: "Program runs", note: "The program ran.", phaseId: "p0", sessionId: "p0s1", capability: "Python", proofStatus: "verified", createdAt: "2026-08-14T00:00:00.000Z", updatedAt: "2026-08-14T00:00:00.000Z" }],
    });
    const state = useMeridianStore.getState();
    state.removeEvidence("evidence.p0s1.2026-08-14");
    expect(useMeridianStore.getState().evidence).toHaveLength(0);
    expect(useMeridianStore.getState().journals).toEqual([expect.objectContaining({ id: "p0s1.2026-08-14" })]);
    state.addEvidence({ id: "evidence.p0s1.2026-08-14", kind: "session-proof", title: "Program runs", note: "The program ran.", phaseId: "p0", sessionId: "p0s1", capability: "Python", proofStatus: "verified" });
    expect(useMeridianStore.getState().evidence).toEqual([expect.objectContaining({ id: "evidence.p0s1.2026-08-14", proofStatus: "verified" })]);
  });

  it("keeps a personal resource state and note independently from the supplied library data", () => {
    useMeridianStore.setState({ resourceStates: {} });
    useMeridianStore.getState().setResourceState("resource.cs50p", "active", "Complete weeks 1 and 2 this month.");
    expect(useMeridianStore.getState().resourceStates?.["resource.cs50p"]).toMatchObject({ status: "active", note: "Complete weeks 1 and 2 this month.", updatedAt: expect.any(String) });
  });

  it("persists a recoverable session attempt, supports deliberate discard, and clears it after verified completion", () => {
    useMeridianStore.setState({ sessionAttempts: {}, sessions: {}, journals: [], dailyLogs: {}, dailyPlans: {}, counters: { sessionsStarted: 0, sessionsCompleted: 0 } });
    const state = useMeridianStore.getState();
    state.saveSessionAttempt({ sessionId: "p0s1", currentStep: 2, proofMode: true, journal: "The result runs.", confusion: "Scope", nextQuestion: "What is local scope?", timerSeconds: 145 });
    expect(useMeridianStore.getState().sessionAttempts?.p0s1).toMatchObject({ schemaVersion: 1, currentStep: 2, proofMode: true, journal: "The result runs.", timerSeconds: 145, updatedAt: expect.any(String) });
    state.discardSessionAttempt("p0s1");
    expect(useMeridianStore.getState().sessionAttempts?.p0s1).toBeUndefined();
    state.saveSessionAttempt({ sessionId: "p0s1", currentStep: 2, proofMode: true, journal: "The result runs.", confusion: "Scope", nextQuestion: "What is local scope?", timerSeconds: 145 });
    state.completeSession("p0s1", { id: "p0s1.2026-08-14", date: "2026-08-14", sessionId: "p0s1", text: "The result runs." });
    expect(useMeridianStore.getState().sessionAttempts?.p0s1).toBeUndefined();
  });
});
