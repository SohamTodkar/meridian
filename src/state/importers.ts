import type { MeridianModel } from "@/data";
import { getLocalDateKey } from "./date";
import type { MeridianStateSnapshot } from "./selectors";

export interface ImportReport {
  source: "Meridian" | "Cockpit" | "Northstar";
  matched: number;
  skipped: number;
  state: Partial<MeridianStateSnapshot>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function importBackup(input: unknown, model: MeridianModel): ImportReport | null {
  if (!isRecord(input)) return null;
  const isMeridian = (input.version === 1 || (input.app === "Meridian" && input.format === "meridian-backup" && input.schemaVersion === 2)) && isRecord(input.state);
  const wrapped = isMeridian && isRecord(input.state) ? input.state : input;
  if (isMeridian && isRecord(wrapped.checks) && isRecord(wrapped.sessions) && isRecord(wrapped.settings)) {
    return { source: "Meridian", matched: Object.keys(wrapped.checks).length + Object.keys(wrapped.sessions).length, skipped: 0, state: wrapped as Partial<MeridianStateSnapshot> };
  }
  const registry = new Set(model.registry.all.map((item) => item.id));
  const source = input.app === "Northstar" ? "Northstar" : input.app === "Cockpit" || input.v === 1 ? "Cockpit" : null;
  if (!source) return null;
  const checks: Record<string, boolean> = {};
  const sessions: MeridianStateSnapshot["sessions"] = {};
  let matched = 0;
  let skipped = 0;
  for (const key of ["checks", "done"]) {
    if (!isRecord(wrapped[key])) continue;
    for (const [id, value] of Object.entries(wrapped[key])) {
      if (registry.has(id)) { checks[id] = Boolean(value); matched += 1; } else skipped += 1;
    }
  }
  const sessionIds = new Set(model.phases.flatMap((phase) => phase.sessions.map((session) => session.id)));
  if (isRecord(wrapped.done)) {
    for (const [id, value] of Object.entries(wrapped.done)) {
      if (sessionIds.has(id) && value) {
        sessions[id] = { currentStep: 0, completed: true, completedAt: new Date().toISOString() };
        matched += 1;
      }
    }
  }
  const journals = Array.isArray(wrapped.journal) ? wrapped.journal.filter(isRecord).map((entry, index) => ({
    id: `legacy-${source.toLowerCase()}-${index}`,
    date: typeof entry.date === "string" ? entry.date : getLocalDateKey(),
    text: typeof entry.text === "string" ? entry.text : typeof entry.evidence === "string" ? entry.evidence : "",
  })).filter((entry) => entry.text) : [];
  return {
    source,
    matched: matched + journals.length,
    skipped,
    state: {
      checks,
      sessions,
      journals,
      settings: {
        scheduleMode: typeof wrapped.scheduleMode === "string" ? wrapped.scheduleMode : typeof wrapped.mode === "string" ? (wrapped.mode === "flex" ? "flexible" : wrapped.mode) : "normal",
      },
    },
  };
}
