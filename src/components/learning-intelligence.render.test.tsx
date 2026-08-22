/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stateRef = vi.hoisted(() => ({ current: {} as any }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/state/store", () => ({
  useMeridianStore: Object.assign(() => stateRef.current, { getState: () => stateRef.current }),
}));

import { RecallView, ReviewView } from "./stage3-views";

function state(overrides: Record<string, unknown> = {}) {
  return {
    checks: {}, sessions: {}, journals: [], dailyLogs: {}, dailyPlans: {}, reviews: {}, evidence: [], resourceStates: {}, progressionOverrides: {}, retrievalPrompts: [],
    settings: { scheduleMode: "normal", timeZone: "UTC" },
    ...overrides,
  };
}

describe("rendered learning-intelligence views", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T12:00:00.000Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("renders a due Recall prompt with its local lifecycle controls", () => {
    stateRef.current = state({
      retrievalPrompts: [{ schemaVersion: 1, id: "retrieval.render", sourceJournalId: "journal.render", question: "What makes this proof reliable?", context: "I could run the code but could not explain why the evidence was sufficient.", dueDate: "2026-08-14", intervalDays: 1, repetitions: 0, status: "scheduled", createdAt: "2026-08-13T00:00:00.000Z", updatedAt: "2026-08-13T00:00:00.000Z" }],
    });
    const html = renderToStaticMarkup(<RecallView />);
    expect(html).toContain("Answer before you look.");
    expect(html).toContain("What makes this proof reliable?");
    expect(html).toContain("I recalled it");
    expect(html).toContain("Snooze one day");
  });

  it("renders saved weekly decisions alongside private analytics", () => {
    stateRef.current = state({
      reviews: { "2026-08-10": { answers: {}, rituals: {}, decisions: { continue: "Keep a ten-minute recall floor.", stop: "Stop opening new tabs.", start: "Start Friday evidence summaries." }, savedAt: "2026-08-14T10:00:00.000Z" } },
      dailyLogs: { "2026-08-14": { date: "2026-08-14", minutes: 30, touched: true } },
    });
    const html = renderToStaticMarkup(<ReviewView />);
    expect(html).toContain("Private learning analytics");
    expect(html).toContain("Measured time by phase");
    expect(html).toContain("Capability trajectory");
    expect(html).toContain("Three decisions");
    expect(html).toContain("Keep a ten-minute recall floor.");
  });
});
