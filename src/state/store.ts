"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getLocalDateKey, shiftDateKey } from "./date";
import { meridianStateStorage } from "./persistence";
import { getLearningMinutes, getMeasuredMinutes, nextRetrievalInterval, type DailyLog, type DailyPlan, type EvidenceRecord, type JournalEntry, type MeridianStateSnapshot, type PlanTaskStatus, type ResourceProgress, type ResourceProgressStatus, type RetrievalPrompt, type SessionAttempt, type TimeEntry, type WeeklyDecisions, type WeeklyReview } from "./selectors";

export interface MeridianState extends MeridianStateSnapshot {
  hydrated: boolean;
  breadcrumbs: string[];
  counters: { sessionsStarted: number; sessionsCompleted: number };
  portfolio: { entries: Array<{ id: string; kind: string; title: string; url: string; note: string }> };
  onboardingComplete: boolean;
  timer: { sessionId?: string; running: boolean; seconds: number; recordedSeconds?: number };
  setProgressionOverride: (key: string, reason: string) => void;
  clearProgressionOverride: (key: string) => void;
  setHydrated: (hydrated: boolean) => void;
  completeOnboarding: () => void;
  setScheduleMode: (mode: string) => void;
  toggleCheck: (id: string) => void;
  setSessionStep: (id: string, step: number) => void;
  startSession: (id: string) => void;
  completeSession: (id: string, entry: JournalEntry, evidence?: Omit<EvidenceRecord, "schemaVersion" | "createdAt" | "updatedAt">) => void;
  setHabit: (date: string, id: string, value: boolean) => void;
  setDailyLog: (date: string, minutes: number, note?: string, metrics?: Partial<Pick<DailyLog, "build" | "study" | "absorb" | "sleep">>) => void;
  recordTime: (entry: Omit<TimeEntry, "id" | "createdAt"> & Partial<Pick<TimeEntry, "id" | "createdAt">>) => void;
  setTimer: (timer: MeridianState["timer"]) => void;
  setBreadcrumbs: (breadcrumbs: string[]) => void;
  setSetting: (key: string, value: unknown) => void;
  setReview: (week: string, review: WeeklyReview) => void;
  setWeeklyDecisions: (week: string, decisions: WeeklyDecisions) => void;
  createRetrievalPrompt: (entry: JournalEntry) => void;
  reviewRetrievalPrompt: (id: string, date: string) => void;
  snoozeRetrievalPrompt: (id: string, date: string) => void;
  masterRetrievalPrompt: (id: string) => void;
  saveSessionAttempt: (attempt: Omit<SessionAttempt, "schemaVersion" | "updatedAt">) => void;
  discardSessionAttempt: (sessionId: string) => void;
  setDailyPlan: (plan: DailyPlan) => void;
  setPlanTaskStatus: (date: string, taskId: string, status: PlanTaskStatus, deferredTo?: string) => void;
  addEvidence: (evidence: Omit<EvidenceRecord, "schemaVersion" | "createdAt" | "updatedAt">) => void;
  updateEvidence: (id: string, evidence: Partial<Pick<EvidenceRecord, "kind" | "title" | "note" | "url" | "phaseId" | "sessionId" | "resourceId" | "capability" | "proofStatus">>) => void;
  removeEvidence: (id: string) => void;
  setResourceState: (resourceId: string, status: ResourceProgressStatus, note?: string) => void;
  addPortfolio: (entry: { id: string; kind: string; title: string; url: string; note: string }) => void;
  updatePortfolio: (id: string, entry: Partial<{ kind: string; title: string; url: string; note: string }>) => void;
  removePortfolio: (id: string) => void;
  resetLocalState: () => void;
}

const initialState = {
  checks: {},
  sessions: {},
  journals: [],
  dailyLogs: {},
  settings: { scheduleMode: "normal", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  hydrated: false,
  breadcrumbs: [],
  counters: { sessionsStarted: 0, sessionsCompleted: 0 },
  portfolio: { entries: [] },
  evidence: [],
  resourceStates: {},
  onboardingComplete: false,
  timer: { running: false, seconds: 0, recordedSeconds: 0 },
  reviews: {},
  progressionOverrides: {},
  dailyPlans: {},
  retrievalPrompts: [],
  sessionAttempts: {},
};

export function getPersistedMeridianState(state: MeridianState): Record<string, unknown> {
  return {
    checks: state.checks,
    sessions: state.sessions,
    journals: state.journals,
    dailyLogs: state.dailyLogs,
    settings: state.settings,
    breadcrumbs: state.breadcrumbs,
    counters: state.counters,
    portfolio: state.portfolio,
    evidence: state.evidence,
    resourceStates: state.resourceStates,
    onboardingComplete: state.onboardingComplete,
    timer: state.timer,
    reviews: state.reviews,
    progressionOverrides: state.progressionOverrides,
    dailyPlans: state.dailyPlans,
    retrievalPrompts: state.retrievalPrompts,
    sessionAttempts: state.sessionAttempts,
  };
}

export const useMeridianStore = create<MeridianState>()(
  persist(
    (set) => ({
      ...initialState,
      setHydrated: (hydrated) => set({ hydrated }),
      completeOnboarding: () => set({ onboardingComplete: true }),
      setScheduleMode: (scheduleMode) => set((state) => ({ settings: { ...state.settings, scheduleMode } })),
      toggleCheck: (id) =>
        set((state) => ({ checks: { ...state.checks, [id]: !state.checks[id] } })),
      setSessionStep: (id, currentStep) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [id]: { currentStep, completed: state.sessions[id]?.completed ?? false },
          },
        })),
      startSession: (id) =>
        set((state) => ({
          counters: { ...state.counters, sessionsStarted: state.counters.sessionsStarted + 1 },
          sessions: {
            ...state.sessions,
            [id]: { currentStep: state.sessions[id]?.currentStep ?? 0, completed: false },
          },
        })),
      completeSession: (id, entry, evidence) =>
        set((state) => {
          const now = new Date().toISOString();
          const proof = evidence ? { schemaVersion: 1 as const, ...evidence, createdAt: now, updatedAt: now } : undefined;
          return {
          sessions: {
            ...state.sessions,
            [id]: { ...(state.sessions[id] ?? { currentStep: 0 }), completed: true, completedAt: entry.date },
          },
          sessionAttempts: Object.fromEntries(Object.entries(state.sessionAttempts ?? {}).filter(([sessionId]) => sessionId !== id)),
          journals: [...state.journals.filter((item) => item.id !== entry.id), entry],
          retrievalPrompts: entry.confusion?.trim() || entry.nextQuestion?.trim() ? (() => {
            const question = entry.nextQuestion?.trim() || `Can I now explain: ${entry.confusion?.trim()}?`;
            const prompt: RetrievalPrompt = {
              schemaVersion: 1,
              id: `retrieval.${entry.id}`,
              sourceJournalId: entry.id,
              sessionId: entry.sessionId,
              question,
              context: entry.confusion?.trim() || undefined,
              dueDate: entry.date,
              intervalDays: 1,
              repetitions: 0,
              status: "scheduled",
              createdAt: now,
              updatedAt: now,
            };
            return [...(state.retrievalPrompts ?? []).filter((item) => item.id !== prompt.id), prompt];
          })() : state.retrievalPrompts,
          evidence: proof ? [...(state.evidence ?? []).filter((item) => item.id !== proof.id), proof] : state.evidence,
          counters: { ...state.counters, sessionsCompleted: state.counters.sessionsCompleted + 1 },
          dailyLogs: {
            ...state.dailyLogs,
            [entry.date]: {
              ...state.dailyLogs[entry.date],
              date: entry.date,
              minutes: state.dailyLogs[entry.date]?.minutes ?? 0,
              touched: true,
            },
          },
          dailyPlans: Object.fromEntries(Object.entries(state.dailyPlans ?? {}).map(([date, plan]) => [date, {
            ...plan,
            tasks: plan.tasks.map((task) => task.sessionId === id ? { ...task, status: "completed" as const, completedAt: entry.date } : task),
          }])),
        };
        }),
      setHabit: (date, id, value) =>
        set((state) => {
          const previous = state.dailyLogs[date] ?? { date, minutes: 0, touched: false };
          const habits = { ...(previous.habits ?? {}), [id]: value };
          return {
            dailyLogs: {
              ...state.dailyLogs,
              [date]: {
                ...previous,
                habits,
                touched: previous.touched || value || Object.values(habits).some(Boolean),
              },
            },
            dailyPlans: state.dailyPlans?.[date] ? {
              ...state.dailyPlans,
              [date]: {
                ...state.dailyPlans[date],
                tasks: state.dailyPlans[date].tasks.map((task) => task.id === `habit:${id}` ? { ...task, status: value ? "completed" as const : "accepted" as const, completedAt: value ? new Date().toISOString() : undefined } : task),
              },
            } : state.dailyPlans,
          };
        }),
      setDailyLog: (date, minutes, note, metrics) =>
        set((state) => {
          const previous = state.dailyLogs[date] ?? { date, minutes: 0, touched: false };
          const manualMinutes = Math.max(0, minutes);
          return {
            dailyLogs: {
              ...state.dailyLogs,
              [date]: {
                ...previous,
                date,
                manualMinutes,
                minutes: manualMinutes + getMeasuredMinutes(previous),
                touched: Boolean(previous.touched) || manualMinutes > 0 || Boolean(note) || Object.values(previous.habits ?? {}).some(Boolean),
                note,
                ...metrics,
              },
            },
          };
        }),
      recordTime: (entry) =>
        set((state) => {
          const previous = state.dailyLogs[entry.date] ?? { date: entry.date, minutes: 0, touched: false };
          const normalized: TimeEntry = {
            id: entry.id ?? `${entry.source}.${entry.sessionId ?? "general"}.${entry.date}.${Date.now()}`,
            createdAt: entry.createdAt ?? new Date().toISOString(),
            ...entry,
          };
          const timeEntries = [...(previous.timeEntries ?? []).filter((item) => item.id !== normalized.id), normalized];
          const next = { ...previous, timeEntries };
          return {
            dailyLogs: {
              ...state.dailyLogs,
              [entry.date]: {
                ...next,
                minutes: getLearningMinutes(next),
                touched: true,
              },
            },
          };
        }),
      setTimer: (timer) => set({ timer }),
      setProgressionOverride: (key, reason) => set((state) => ({
        progressionOverrides: {
          ...(state.progressionOverrides ?? {}),
          [key]: { key, reason: reason.trim(), createdAt: new Date().toISOString() },
        },
      })),
      clearProgressionOverride: (key) => set((state) => {
        const { [key]: _removed, ...progressionOverrides } = state.progressionOverrides ?? {};
        void _removed;
        return { progressionOverrides };
      }),
      setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),
      setSetting: (key, value) => set((state) => ({ settings: { ...state.settings, [key]: value } })),
      setReview: (week, review) =>
        set((state) => ({
          reviews: {
            ...(state.reviews ?? {}),
            [week]: {
              ...review,
              answers: { ...review.answers },
              rituals: { ...review.rituals },
            },
          },
        })),
      setWeeklyDecisions: (week, decisions) => set((state) => ({
        reviews: {
          ...(state.reviews ?? {}),
          [week]: {
            answers: state.reviews?.[week]?.answers ?? {},
            rituals: state.reviews?.[week]?.rituals ?? {},
            savedAt: new Date().toISOString(),
            decisions: {
              continue: decisions.continue.trim(),
              stop: decisions.stop.trim(),
              start: decisions.start.trim(),
            },
          },
        },
      })),
      createRetrievalPrompt: (entry) => set((state) => {
        const question = entry.nextQuestion?.trim() || (entry.confusion?.trim() ? `Can I now explain: ${entry.confusion.trim()}?` : "");
        if (!question) return {};
        const now = new Date().toISOString();
        const prompt: RetrievalPrompt = {
          schemaVersion: 1,
          id: `retrieval.${entry.id}`,
          sourceJournalId: entry.id,
          sessionId: entry.sessionId,
          question,
          context: entry.confusion?.trim() || undefined,
          dueDate: entry.date,
          intervalDays: 1,
          repetitions: 0,
          status: "scheduled",
          createdAt: now,
          updatedAt: now,
        };
        return { retrievalPrompts: [...(state.retrievalPrompts ?? []).filter((item) => item.id !== prompt.id), prompt] };
      }),
      reviewRetrievalPrompt: (id, date) => set((state) => ({
        retrievalPrompts: (state.retrievalPrompts ?? []).map((prompt) => {
          if (prompt.id !== id || prompt.status === "mastered") return prompt;
          const repetitions = prompt.repetitions + 1;
          const intervalDays = nextRetrievalInterval(repetitions);
          return { ...prompt, repetitions, intervalDays, dueDate: shiftDateKey(date, intervalDays), status: "scheduled" as const, lastReviewedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        }),
      })),
      snoozeRetrievalPrompt: (id, date) => set((state) => ({
        retrievalPrompts: (state.retrievalPrompts ?? []).map((prompt) => prompt.id === id && prompt.status !== "mastered" ? { ...prompt, dueDate: shiftDateKey(date, 1), status: "snoozed" as const, updatedAt: new Date().toISOString() } : prompt),
      })),
      masterRetrievalPrompt: (id) => set((state) => ({
        retrievalPrompts: (state.retrievalPrompts ?? []).map((prompt) => prompt.id === id ? { ...prompt, status: "mastered" as const, updatedAt: new Date().toISOString() } : prompt),
      })),
      saveSessionAttempt: (attempt) => set((state) => ({
        sessionAttempts: {
          ...(state.sessionAttempts ?? {}),
          [attempt.sessionId]: { schemaVersion: 1, ...attempt, updatedAt: new Date().toISOString() },
        },
      })),
      discardSessionAttempt: (sessionId) => set((state) => ({
        sessionAttempts: Object.fromEntries(Object.entries(state.sessionAttempts ?? {}).filter(([id]) => id !== sessionId)),
      })),
      setDailyPlan: (plan) => set((state) => ({
        dailyPlans: {
          ...(state.dailyPlans ?? {}),
          [plan.date]: {
            ...plan,
            acceptedAt: plan.acceptedAt ?? new Date().toISOString(),
            tasks: plan.tasks.map((task) => task.status === "proposed" ? { ...task, status: "accepted" as const } : task),
          },
        },
      })),
      setPlanTaskStatus: (date, taskId, status, deferredTo) => set((state) => {
        const plan = state.dailyPlans?.[date];
        if (!plan) return {};
        return {
          dailyPlans: {
            ...state.dailyPlans,
            [date]: {
              ...plan,
              tasks: plan.tasks.map((task) => task.id === taskId ? {
                ...task,
                status,
                deferredTo: status === "deferred" ? deferredTo : undefined,
                completedAt: status === "completed" ? new Date().toISOString() : undefined,
              } : task),
            },
          },
        };
      }),
      addEvidence: (evidence) => set((state) => {
        const now = new Date().toISOString();
        const item: EvidenceRecord = { schemaVersion: 1, ...evidence, createdAt: now, updatedAt: now };
        return { evidence: [...(state.evidence ?? []).filter((current) => current.id !== item.id), item] };
      }),
      updateEvidence: (id, evidence) => set((state) => ({
        evidence: (state.evidence ?? []).map((item) => item.id === id ? { ...item, ...evidence, updatedAt: new Date().toISOString() } : item),
      })),
      removeEvidence: (id) => set((state) => ({ evidence: (state.evidence ?? []).filter((item) => item.id !== id) })),
      setResourceState: (resourceId, status, note) => set((state) => {
        const now = new Date().toISOString();
        const previous = state.resourceStates?.[resourceId];
        const value: ResourceProgress = { status, note: note?.trim() || undefined, updatedAt: now, completedAt: status === "completed" ? previous?.completedAt ?? now : undefined };
        return { resourceStates: { ...(state.resourceStates ?? {}), [resourceId]: value } };
      }),
      addPortfolio: (entry) => set((state) => ({ portfolio: { entries: [...(state.portfolio?.entries ?? []), entry] } })),
      updatePortfolio: (id, entry) => set((state) => ({ portfolio: { entries: (state.portfolio?.entries ?? []).map((item) => item.id === id ? { ...item, ...entry } : item) } })),
      removePortfolio: (id) => set((state) => ({ portfolio: { entries: (state.portfolio?.entries ?? []).filter((item) => item.id !== id) } })),
      resetLocalState: () => set({ ...initialState, hydrated: true }),
    }),
    {
      name: "meridian.v1",
      version: 2,
      storage: createJSONStorage(() => meridianStateStorage),
      skipHydration: true,
      migrate: (persisted) => ({ ...initialState, ...(persisted as Partial<MeridianState>) }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
      partialize: getPersistedMeridianState,
    },
  ),
);

export function rehydrateMeridian(): void {
  void useMeridianStore.persist.rehydrate();
}

export function touchToday(minutes: number): void {
  const state = useMeridianStore.getState();
  const date = getLocalDateKey(new Date(), state.settings.timeZone);
  state.setDailyLog(date, minutes, state.dailyLogs[date]?.note);
}
