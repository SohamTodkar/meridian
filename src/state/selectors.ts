import type { MeridianModel, Phase } from "@/data";
import { getLocalDateKey, getWeekStartKey, isDateKeyInRange, shiftDateKey } from "./date";

export interface SessionProgress {
  currentStep: number;
  completed: boolean;
  completedAt?: string;
}

export interface SessionAttempt {
  schemaVersion: 1;
  sessionId: string;
  currentStep: number;
  proofMode: boolean;
  journal: string;
  confusion: string;
  nextQuestion: string;
  timerSeconds: number;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  sessionId?: string;
  text: string;
  confusion?: string;
  nextQuestion?: string;
}

export type RetrievalPromptStatus = "scheduled" | "snoozed" | "mastered";

export interface RetrievalPrompt {
  schemaVersion: 1;
  id: string;
  sourceJournalId: string;
  sessionId?: string;
  question: string;
  context?: string;
  dueDate: string;
  intervalDays: number;
  repetitions: number;
  status: RetrievalPromptStatus;
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
}

export interface WeeklyDecisions {
  continue: string;
  stop: string;
  start: string;
}

export interface WeeklyReview {
  answers: Record<string, string | boolean>;
  rituals: Record<string, boolean>;
  decisions?: WeeklyDecisions;
  savedAt: string;
}

export type EvidenceKind = "session-proof" | "artifact" | "note" | "link";
export type ProofStatus = "verified" | "captured" | "planned";

export interface EvidenceRecord {
  schemaVersion: 1;
  id: string;
  kind: EvidenceKind;
  title: string;
  note: string;
  url?: string;
  phaseId?: string;
  sessionId?: string;
  resourceId?: string;
  capability?: string;
  proofStatus: ProofStatus;
  createdAt: string;
  updatedAt: string;
}

export type ResourceProgressStatus = "saved" | "active" | "completed" | "paused";

export interface ResourceProgress {
  status: ResourceProgressStatus;
  note?: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TimeEntry {
  id: string;
  date: string;
  seconds: number;
  source: "session" | "manual" | "focus";
  sessionId?: string;
  createdAt: string;
}

export interface DailyLog {
  date: string;
  minutes: number;
  manualMinutes?: number;
  timeEntries?: TimeEntry[];
  touched: boolean;
  habits?: Record<string, boolean>;
  note?: string;
  build?: number;
  study?: number;
  absorb?: number;
  sleep?: number;
}

export interface ProgressionOverride {
  key: string;
  reason: string;
  createdAt: string;
}

export type PlanTaskStatus = "proposed" | "accepted" | "completed" | "deferred" | "dismissed";

export interface PlannedTask {
  id: string;
  kind: "session" | "habit" | "reflection" | "checkpoint" | "retrieval";
  title: string;
  detail: string;
  minutes: number;
  status: PlanTaskStatus;
  reason: string;
  sessionId?: string;
  retrievalPromptId?: string;
  deferredTo?: string;
  completedAt?: string;
}

export interface DailyPlan {
  schemaVersion: 1;
  date: string;
  capacityMinutes: number;
  mode: string;
  generatedAt: string;
  acceptedAt?: string;
  tasks: PlannedTask[];
}

export interface DailyPlanRecommendation {
  date: string;
  capacityMinutes: number;
  mode: string;
  isRestDay: boolean;
  reasons: string[];
  tasks: PlannedTask[];
}

export interface MeridianStateSnapshot {
  checks: Record<string, boolean>;
  sessions: Record<string, SessionProgress>;
  journals: JournalEntry[];
  dailyLogs: Record<string, DailyLog>;
  settings: {
    scheduleMode: string;
    pace?: { weeklyHours?: number; dailyTouchMinutes?: number; sleepFloor?: string; ankiCap?: number; restDay?: string };
    startDate?: string;
    timeZone?: string;
    habitTimes?: Record<string, { from: string; to: string }>;
  };
  reviews?: Record<string, WeeklyReview>;
  portfolio?: { entries: Array<{ id: string; kind: string; title: string; url: string; note: string }> };
  evidence?: EvidenceRecord[];
  resourceStates?: Record<string, ResourceProgress>;
  progressionOverrides?: Record<string, ProgressionOverride>;
  dailyPlans?: Record<string, DailyPlan>;
  retrievalPrompts?: RetrievalPrompt[];
  sessionAttempts?: Record<string, SessionAttempt>;
}

export interface ProgressionRequirement {
  key: string;
  label: string;
}

export interface ProgressionAccess {
  allowed: boolean;
  overridden: boolean;
  requirements: ProgressionRequirement[];
}

export interface ProgressValue {
  completed: number;
  total: number;
  percent: number;
}

export interface LearningProgress extends ProgressValue {
  coverage: ProgressValue;
  evidence: ProgressValue;
  weightedCompleted: number;
  weightedTotal: number;
}

export const CAPABILITY_WEIGHTS = {
  session: 7,
  phaseEvidence: 3,
} as const;

export function progressValue(completed: number, total: number): ProgressValue {
  return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 };
}

export function weightedCapabilityProgress(completedSessions: number, sessions: number, completedEvidence: number, evidence: number) {
  const weightedCompleted = completedSessions * CAPABILITY_WEIGHTS.session + completedEvidence * CAPABILITY_WEIGHTS.phaseEvidence;
  const weightedTotal = sessions * CAPABILITY_WEIGHTS.session + evidence * CAPABILITY_WEIGHTS.phaseEvidence;
  return {
    ...progressValue(completedSessions + completedEvidence, sessions + evidence),
    weightedCompleted,
    weightedTotal,
    percent: weightedTotal ? Math.round((weightedCompleted / weightedTotal) * 100) : 0,
  };
}

export function getMeasuredMinutes(log?: DailyLog): number {
  if (!log?.timeEntries?.length) return 0;
  return Math.round(log.timeEntries.reduce((sum, entry) => sum + entry.seconds, 0) / 60);
}

export function getLearningMinutes(log?: DailyLog): number {
  if (!log) return 0;
  const measured = getMeasuredMinutes(log);
  const manual = log.manualMinutes ?? (log.timeEntries?.length ? Math.max(0, (log.minutes ?? 0) - measured) : log.minutes ?? 0);
  return Math.max(0, manual) + measured;
}

export function phaseEvidenceIds(phase: Phase): string[] {
  return [
    ...phase.checkpoint.cockpit.requirements.map((_, index) => `${phase.id}.checkpoint.requirement.${index + 1}`),
    ...phase.checkpoint.northstar.map((_, index) => `${phase.id}.gate.${index + 1}`),
  ];
}

export function sessionCheckIds(phase: Phase): string[] {
  return phase.sessions.flatMap((session) => session.checks.map((_, index) => `${session.id}.check.${index + 1}`));
}

export function isPhaseCleared(phase: Phase, state: MeridianStateSnapshot): boolean {
  const ids = phaseEvidenceIds(phase);
  return ids.length > 0 && ids.every((id) => state.checks[id] === true);
}

export const phaseOverrideKey = (phaseId: string) => `phase:${phaseId}`;
export const sessionOverrideKey = (sessionId: string) => `session:${sessionId}`;

export function getPhaseAccess(model: MeridianModel, phase: Phase, state: MeridianStateSnapshot): ProgressionAccess {
  const phaseIndex = model.phases.findIndex((item) => item.id === phase.id);
  if (phaseIndex <= 0) return { allowed: true, overridden: false, requirements: [] };
  if (state.progressionOverrides?.[phaseOverrideKey(phase.id)]) return { allowed: true, overridden: true, requirements: [] };
  const prerequisite = model.phases[phaseIndex - 1];
  if (isPhaseCleared(prerequisite, state)) return { allowed: true, overridden: false, requirements: [] };
  return {
    allowed: false,
    overridden: false,
    requirements: [{ key: phaseOverrideKey(prerequisite.id), label: `Clear Phase ${prerequisite.identity.number + 1}: ${prerequisite.identity.northstarName} checkpoint evidence.` }],
  };
}

export function getSessionAccess(model: MeridianModel, phase: Phase, sessionId: string, state: MeridianStateSnapshot): ProgressionAccess {
  if (state.sessions[sessionId]?.completed) return { allowed: true, overridden: false, requirements: [] };
  if (state.progressionOverrides?.[sessionOverrideKey(sessionId)]) return { allowed: true, overridden: true, requirements: [] };
  const phaseAccess = getPhaseAccess(model, phase, state);
  if (!phaseAccess.allowed) return phaseAccess;
  const index = phase.sessions.findIndex((item) => item.id === sessionId);
  const previous = phase.sessions[index - 1];
  if (index <= 0 || !previous || state.sessions[previous.id]?.completed) return { allowed: true, overridden: phaseAccess.overridden, requirements: [] };
  return {
    allowed: false,
    overridden: false,
    requirements: [{ key: sessionOverrideKey(previous.id), label: `Complete Session ${index}: ${previous.title}.` }],
  };
}

export function getPhaseProgress(model: MeridianModel, phase: Phase, state: MeridianStateSnapshot): LearningProgress {
  void model;
  const curriculum = phase.curriculum.reduce((sum, section) => sum + section.items.length, 0);
  const sessions = phase.sessions.length;
  const phaseEvidence = phaseEvidenceIds(phase).length;
  const sessionChecks = phase.sessions.reduce((sum, session) => sum + session.checks.length, 0);
  const completedCurriculum = phase.curriculum.reduce(
    (sum, section) => sum + section.items.reduce((itemSum, _, index) => itemSum + (state.checks[`${section.key}.${index + 1}`] ? 1 : 0), 0),
    0,
  );
  const completedSessions = phase.sessions.reduce((sum, session) => sum + (state.sessions[session.id]?.completed ? 1 : 0), 0);
  const completedEvidence = phaseEvidenceIds(phase).filter((id) => state.checks[id]).length;
  const completedSessionChecks = sessionCheckIds(phase).filter((id) => state.checks[id]).length;
  const coverage = progressValue(completedCurriculum, curriculum);
  const evidence = progressValue(completedSessionChecks + completedEvidence, sessionChecks + phaseEvidence);
  const capability = weightedCapabilityProgress(completedSessions, sessions, completedEvidence, phaseEvidence);
  return { ...capability, coverage, evidence };
}

export function getOverallProgress(model: MeridianModel, state: MeridianStateSnapshot): LearningProgress {
  const progress = model.phases.map((phase) => getPhaseProgress(model, phase, state));
  const completed = progress.reduce((sum, item) => sum + item.completed, 0);
  const total = progress.reduce((sum, item) => sum + item.total, 0);
  const weightedCompleted = progress.reduce((sum, item) => sum + item.weightedCompleted, 0);
  const weightedTotal = progress.reduce((sum, item) => sum + item.weightedTotal, 0);
  const capability = {
    ...progressValue(completed, total),
    weightedCompleted,
    weightedTotal,
    percent: weightedTotal ? Math.round((weightedCompleted / weightedTotal) * 100) : 0,
  };
  const coverage = progressValue(
    progress.reduce((sum, item) => sum + item.coverage.completed, 0),
    progress.reduce((sum, item) => sum + item.coverage.total, 0),
  );
  const evidence = progressValue(
    progress.reduce((sum, item) => sum + item.evidence.completed, 0),
    progress.reduce((sum, item) => sum + item.evidence.total, 0),
  );
  return { ...capability, coverage, evidence };
}

export function getActivePhase(model: MeridianModel, state: MeridianStateSnapshot): Phase {
  return model.phases.find((phase) => !isPhaseCleared(phase, state)) ?? model.phases.at(-1)!;
}

export function getNextAction(model: MeridianModel, state: MeridianStateSnapshot): { type: "session" | "checkpoint"; phase: Phase; sessionId?: string } {
  const phase = getActivePhase(model, state);
  const session = phase.sessions.find((item) => !state.sessions[item.id]?.completed);
  return session ? { type: "session", phase, sessionId: session.id } : { type: "checkpoint", phase };
}

function weekdayForDateKey(date: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function planningMode(model: MeridianModel, state: MeridianStateSnapshot) {
  return model.modes.find((item) => item.category === "schedule" && item.key === state.settings.scheduleMode);
}

export function getDailyCapacity(model: MeridianModel, state: MeridianStateSnapshot, date: string): { minutes: number; isRestDay: boolean; mode: string; reason: string } {
  const mode = planningMode(model, state);
  const weeklyHours = state.settings.pace?.weeklyHours ?? (mode?.category === "schedule" ? mode.weekly : undefined) ?? 0;
  const touchMinutes = state.settings.pace?.dailyTouchMinutes ?? (mode?.category === "schedule" ? mode.touchMin : undefined) ?? 20;
  const isRestDay = weekdayForDateKey(date) === (state.settings.pace?.restDay ?? "Sunday");
  const minutes = isRestDay ? touchMinutes : Math.max(touchMinutes, Math.round((weeklyHours * 60) / 6));
  return {
    minutes,
    isRestDay,
    mode: mode?.label ?? "Personal pace",
    reason: isRestDay ? "Rest-day floor: keep the learning identity alive without using catch-up volume." : `Six-day allocation from the ${mode?.label ?? "personal"} weekly target.`,
  };
}

export function getDailyPlanRecommendation(model: MeridianModel, state: MeridianStateSnapshot, date: string): DailyPlanRecommendation {
  const capacity = getDailyCapacity(model, state, date);
  const deferred = Object.entries(state.dailyPlans ?? {})
    .filter(([sourceDate]) => sourceDate < date)
    .flatMap(([, plan]) => plan.tasks.filter((task) => task.status === "deferred" && task.deferredTo === date));
  const reasons = [capacity.reason];
  const tasks: PlannedTask[] = deferred.map((task) => ({ ...task, status: "proposed", deferredTo: undefined, reason: `Carried forward from a deliberate deferral: ${task.reason}` }));
  const claimed = tasks.reduce((sum, task) => sum + task.minutes, 0);
  const duePrompts = getDueRetrievalPrompts(state, date).slice(0, 3);
  const retrievalMinutes = Math.min(15, capacity.minutes);
  if (duePrompts.length) {
    duePrompts.forEach((prompt) => tasks.push({ id: `retrieval:${prompt.id}`, kind: "retrieval", title: "Retrieve without notes", detail: prompt.question, minutes: Math.max(1, Math.floor(retrievalMinutes / duePrompts.length)), status: "proposed", reason: `Due retrieval from ${prompt.dueDate}. Answer first, then check your original context.`, retrievalPromptId: prompt.id }));
    reasons.push(`${duePrompts.length} local retrieval prompt${duePrompts.length === 1 ? " is" : "s are"} due before new material.`);
  } else if (!tasks.some((task) => task.id === "habit:h.anki")) {
    tasks.push({ id: "habit:h.anki", kind: "habit", title: "Anki spaced repetition", detail: "Reviews only. Keep retrieval alive.", minutes: retrievalMinutes, status: "proposed", reason: "Daily retrieval floor protects retention." });
  }
  if (!capacity.isRestDay) {
    const next = getNextAction(model, state);
    const available = Math.max(0, capacity.minutes - claimed - retrievalMinutes);
    if (next.type === "session" && next.sessionId && available > 0) {
      const session = next.phase.sessions.find((item) => item.id === next.sessionId);
      if (session && !tasks.some((task) => task.sessionId === session.id)) {
        tasks.push({ id: `session:${session.id}`, kind: "session", title: session.title, detail: session.outcome, minutes: Math.min(session.minutes, available), status: "proposed", sessionId: session.id, reason: `Next unlocked session in Phase ${next.phase.identity.number + 1}; this is the smallest useful forward move.` });
      }
    } else if (next.type === "checkpoint" && available > 0) {
      tasks.push({ id: "checkpoint:active", kind: "checkpoint", title: "Phase checkpoint evidence", detail: "Convert completed work into the proof that opens the next phase.", minutes: Math.max(10, available), status: "proposed", reason: "All active sessions are complete; checkpoint evidence is the blocking next action." });
    }
  }
  if (!tasks.some((task) => task.id === "reflection:daily")) {
    tasks.push({ id: "reflection:daily", kind: "reflection", title: "Daily learning capture", detail: "Write one honest line: evidence, confusion, or next question.", minutes: 5, status: "proposed", reason: "A short record preserves the signal for the weekly review." });
  }
  return { date, capacityMinutes: capacity.minutes, mode: capacity.mode, isRestDay: capacity.isRestDay, reasons, tasks };
}

export function getWeeklyPlanSummary(state: MeridianStateSnapshot, weekStart: string): { plannedMinutes: number; completedMinutes: number; deferredTasks: number } {
  const weekEnd = shiftDateKey(weekStart, 6);
  const plans = Object.values(state.dailyPlans ?? {}).filter((plan) => isDateKeyInRange(plan.date, weekStart, weekEnd));
  return {
    plannedMinutes: plans.reduce((sum, plan) => sum + plan.tasks.filter((task) => task.status !== "dismissed").reduce((taskSum, task) => taskSum + task.minutes, 0), 0),
    completedMinutes: plans.reduce((sum, plan) => sum + plan.tasks.filter((task) => task.status === "completed").reduce((taskSum, task) => taskSum + task.minutes, 0), 0),
    deferredTasks: plans.reduce((sum, plan) => sum + plan.tasks.filter((task) => task.status === "deferred").length, 0),
  };
}

export function getStreak(state: MeridianStateSnapshot, today = new Date()): number {
  const timeZone = state.settings.timeZone;
  let streak = 0;
  let cursor = getLocalDateKey(today, timeZone);
  if (!state.dailyLogs[cursor]?.touched) cursor = shiftDateKey(cursor, -1);
  while (state.dailyLogs[cursor]?.touched) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

export function getWeekMinutes(state: MeridianStateSnapshot, today = new Date()): number {
  const end = getLocalDateKey(today, state.settings.timeZone);
  const start = getWeekStartKey(today, state.settings.timeZone);
  return Object.values(state.dailyLogs)
    .filter((log) => isDateKeyInRange(log.date, start, end))
    .reduce((sum, log) => sum + getLearningMinutes(log), 0);
}

export function getReviewWeekKey(date = new Date(), timeZone?: string): string {
  return getWeekStartKey(date, timeZone);
}

export function orderJournalEntries(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => `${b.date}-${b.id}`.localeCompare(`${a.date}-${a.id}`));
}

export function reviewCounts(review: { answers: Record<string, string | boolean>; rituals: Record<string, boolean> }): { answers: number; rituals: number } {
  return {
    answers: Object.values(review.answers).filter(Boolean).length,
    rituals: Object.values(review.rituals).filter(Boolean).length,
  };
}

export function getDsaProgress(state: MeridianStateSnapshot, ids: string[]): ProgressValue {
  return progressValue(ids.filter((id) => state.checks[id]).length, ids.length);
}

const RETRIEVAL_INTERVALS = [1, 3, 7, 14, 30] as const;

export function nextRetrievalInterval(repetitions: number): number {
  return RETRIEVAL_INTERVALS[Math.min(Math.max(repetitions, 0), RETRIEVAL_INTERVALS.length - 1)];
}

export function getDueRetrievalPrompts(state: MeridianStateSnapshot, date: string): RetrievalPrompt[] {
  return (state.retrievalPrompts ?? [])
    .filter((prompt) => prompt.status !== "mastered" && prompt.dueDate <= date)
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate) || left.createdAt.localeCompare(right.createdAt));
}

export function getUpcomingRetrievalPrompts(state: MeridianStateSnapshot, date: string): RetrievalPrompt[] {
  return (state.retrievalPrompts ?? [])
    .filter((prompt) => prompt.status !== "mastered" && prompt.dueDate > date)
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));
}

export function getLearningHeatmap(state: MeridianStateSnapshot, endDate: string, days = 28): Array<{ date: string; minutes: number; touched: boolean }> {
  return Array.from({ length: days }, (_, index) => {
    const date = shiftDateKey(endDate, index - days + 1);
    const log = state.dailyLogs[date];
    return { date, minutes: getLearningMinutes(log), touched: Boolean(log?.touched) };
  });
}

export function getPhaseTimeBreakdown(model: MeridianModel, state: MeridianStateSnapshot): Array<{ phaseId: string; label: string; minutes: number }> {
  const sessionToPhase = new Map(model.phases.flatMap((phase) => phase.sessions.map((session) => [session.id, phase] as const)));
  const minutes = new Map(model.phases.map((phase) => [phase.id, 0]));
  for (const log of Object.values(state.dailyLogs)) {
    for (const entry of log.timeEntries ?? []) {
      const phase = entry.sessionId ? sessionToPhase.get(entry.sessionId) : undefined;
      if (phase) minutes.set(phase.id, (minutes.get(phase.id) ?? 0) + Math.round(entry.seconds / 60));
    }
  }
  return model.phases.map((phase) => ({ phaseId: phase.id, label: `Phase ${phase.identity.number + 1}`, minutes: minutes.get(phase.id) ?? 0 }));
}

export function getCapabilityTrajectory(model: MeridianModel, state: MeridianStateSnapshot): Array<{ phaseId: string; label: string; percent: number }> {
  return model.phases.map((phase) => ({ phaseId: phase.id, label: `P${phase.identity.number + 1}`, percent: getPhaseProgress(model, phase, state).percent }));
}
