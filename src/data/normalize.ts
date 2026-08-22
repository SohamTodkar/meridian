import cockpitRaw from "./raw/cockpit.json";
import northstarRaw from "./raw/northstar.json";
import { buildPhaseResourcePlans } from "./resource-library";
import type {
  CurriculumSection,
  DayItem,
  IdRecord,
  Library,
  MeridianModel,
  MergedResource,
  Phase,
  ResourceItem,
  Session,
} from "./types";

type RawCockpit = typeof cockpitRaw;
type RawNorthstar = typeof northstarRaw;
type RawPhase = RawCockpit["phases"][number];
type RawNorthstarPhase = RawNorthstar["phases"][number];
type RawSection = RawPhase["sections"][number];

const phaseIds = ["p0", "p1", "p2", "p3"] as const;

function sectionItems(section: CurriculumSection): number {
  return section.items.length;
}

function normalizeSection(section: RawSection): CurriculumSection {
  if (section.kind === "checklist" || section.kind === "papers") {
    return { ...section, kind: section.kind, items: section.items } as unknown as CurriculumSection;
  }
  if (section.kind === "checktable") {
    return { ...section, kind: "checktable", items: section.items } as unknown as CurriculumSection;
  }
  if (section.kind === "days") {
    return { ...section, kind: "days", items: section.items as DayItem[] } as unknown as CurriculumSection;
  }
  if (section.kind === "videos") {
    return { ...section, kind: "videos", items: section.items } as unknown as CurriculumSection;
  }
  if (section.kind === "projects") {
    return { ...section, kind: "projects", items: section.items } as unknown as CurriculumSection;
  }
  return { ...section, kind: "resources", items: section.items } as unknown as CurriculumSection;
}

function resourceKey(resource: { name: string; url?: string }): string {
  const name = resource.name.trim().toLowerCase();
  if (name.includes("cs50p")) return "cs50p";
  if (name.includes("helsinki") && name.includes("python")) return "helsinki-python-mooc";
  if (name.includes("kaggle learn")) return "kaggle-learn";
  if (name.includes("zero to hero")) return "zero-to-hero";
  if (name.includes("arena")) return "arena";
  if (name.includes("pytorch") && name.includes("tutorial")) return "pytorch-tutorials";
  if (name.includes("3blue1brown") && name.includes("linear algebra")) return "3blue1brown-linear-algebra";
  return name.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function resourcesFor(cockpit: RawPhase, northstar: RawNorthstarPhase): MergedResource[] {
  const merged = new Map<string, MergedResource>();
  const cockpitResources = cockpit.sections.find((section) => section.kind === "resources");
  for (const resource of (cockpitResources?.items ?? []) as ResourceItem[]) {
    merged.set(resourceKey(resource), {
      id: `resource.${resourceKey(resource).replace(/[^a-z0-9]+/g, "-")}`,
      name: resource.name,
      rating: resource.rating,
      why: resource.why,
      url: resource.url,
    });
  }
  for (const resource of northstar.resources) {
    const key = resourceKey(resource);
    const existing = merged.get(key);
    merged.set(key, {
      id: existing?.id ?? `resource.${key.replace(/[^a-z0-9]+/g, "-")}`,
      name: existing?.name ?? resource.name,
      rating: existing?.rating,
      role: resource.role,
      note: resource.note,
      checked: resource.checked,
      why: existing?.why,
      url: existing?.url ?? resource.url,
    });
  }
  return [...merged.values()];
}

function normalizeSession(session: RawNorthstarPhase["sessions"][number]): Session {
  return {
    id: session.id,
    title: session.title,
    minutes: session.min,
    outcome: session.outcome,
    steps: session.steps,
    proof: session.proof,
    checks: session.checks,
    stop: session.stop,
    hint: session.hint,
  };
}

function addRecord(
  registry: IdRegistryBuilder,
  record: IdRecord,
): void {
  registry.all.push(record);
  let phaseGroup = registry.byPhase.find((group) => group.phaseId === record.phaseId);
  if (!phaseGroup) {
    phaseGroup = { phaseId: record.phaseId, records: [] };
    registry.byPhase.push(phaseGroup);
  }
  phaseGroup.records.push(record);
  if (record.sectionId) {
    let sectionGroup = registry.bySection.find((group) => group.sectionId === record.sectionId);
    if (!sectionGroup) {
      sectionGroup = { sectionId: record.sectionId, records: [] };
      registry.bySection.push(sectionGroup);
    }
    sectionGroup.records.push(record);
  }
}

interface IdRegistryBuilder {
  all: IdRecord[];
  byPhase: Array<{ phaseId: string; records: IdRecord[] }>;
  bySection: Array<{ sectionId: string; records: IdRecord[] }>;
}

function buildRegistry(phases: Phase[]): MeridianModel["registry"] {
  const registry: IdRegistryBuilder = { all: [], byPhase: [], bySection: [] };
  for (const phase of phases) {
    for (const section of phase.curriculum) {
      section.items.forEach((_, index) => {
        const id = `${section.key}.${index + 1}`;
        addRecord(registry, { id, phaseId: phase.id, sectionId: section.key, kind: "curriculum" });
      });
    }
    for (const session of phase.sessions) {
      session.checks.forEach((_, index) =>
        addRecord(registry, {
          id: `${session.id}.check.${index + 1}`,
          phaseId: phase.id,
          kind: "session-check",
        }),
      );
    }
    phase.checkpoint.cockpit.requirements.forEach((_, index) =>
      addRecord(registry, {
        id: `${phase.id}.checkpoint.requirement.${index + 1}`,
        phaseId: phase.id,
        kind: "checkpoint-requirement",
      }),
    );
    phase.checkpoint.northstar.forEach((_, index) =>
      addRecord(registry, {
        id: `${phase.id}.gate.${index + 1}`,
        phaseId: phase.id,
        kind: "gate",
      }),
    );
  }
  for (const dsaPhase of cockpitRaw.dsa.phases) {
    for (const section of dsaPhase.sections) {
      section.items.forEach((_, index) => addRecord(registry, {
        id: `dsa.${dsaPhase.key}.${section.key}.${index + 1}`,
        phaseId: `dsa.${dsaPhase.key}`,
        sectionId: section.key,
        kind: "dsa",
      }));
    }
  }
  return registry;
}

function phaseFor(id: (typeof phaseIds)[number]): Phase {
  const cockpit = cockpitRaw.phases.find((phase) => phase.key === id);
  const northstar = northstarRaw.phases.find((phase) => phase.id === id);
  if (!cockpit || !northstar) throw new Error(`Missing phase ${id}`);
  return {
    id,
    identity: {
      number: Number(northstar.number),
      cockpitName: cockpit.name,
      northstarName: northstar.name,
      weeks: cockpit.weeks,
      typicalRange: northstar.range,
      objective: cockpit.objective,
      summary: northstar.summary,
      promise: northstar.promise,
      primary: northstar.primary,
    },
    priorities: northstar.priorities,
    stretch: northstar.stretch,
    sessions: northstar.sessions.map(normalizeSession),
    curriculum: cockpit.sections.map((section) => normalizeSection(section)),
    resources: resourcesFor(cockpit, northstar),
    checkpoint: { cockpit: cockpit.milestone, northstar: northstar.gates },
  };
}

export const model: MeridianModel = {
  profile: cockpitRaw.meta,
  doctrine: {
    pace: cockpitRaw.paceDoctrine,
    metaRules: cockpitRaw.metaRules,
    sustainability: cockpitRaw.sustainability,
    streakRecovery: cockpitRaw.streakRecovery,
    aiAssistant: cockpitRaw.aiAssistantRule,
    ankiDiscipline: cockpitRaw.ankiDiscipline,
    writingRitual: cockpitRaw.writingRitual,
    stuckProtocol: cockpitRaw.stuckProtocol,
    paperProtocol: cockpitRaw.paperProtocol,
    fieldDrift: cockpitRaw.fieldDrift,
    successMarkers: cockpitRaw.successMarkers,
  },
  modes: [
    ...cockpitRaw.modes.map((mode) => ({
      category: "energy" as const,
      ...mode,
    })),
    ...cockpitRaw.scheduleModes.map((mode) => {
      const northstarKey = mode.key === "break" ? "vacation" : mode.key;
      const northstar = northstarRaw.modes[northstarKey as keyof typeof northstarRaw.modes];
      return {
        category: "schedule" as const,
        key: mode.key,
        label: mode.key === "exam" ? "Exam" : mode.label,
        weekly: mode.weekly,
        touchMin: mode.touchMin,
        dsa: mode.dsa,
        minutes: northstar?.minutes,
        notes: [mode.note, ...(northstar ? [northstar.note] : [])],
      };
    }),
    ...Object.entries(northstarRaw.modes)
      .filter(([key]) => key !== "vacation" && !cockpitRaw.scheduleModes.some((mode) => mode.key === key))
      .map(([key, mode]) => ({
        category: "schedule" as const,
        key,
        label: mode.label,
        minutes: mode.minutes,
        notes: [mode.note],
      })),
  ],
  habitStack: cockpitRaw.habitStack,
  blocks: cockpitRaw.blocks,
  weeklyRituals: cockpitRaw.weeklyRituals,
  phases: phaseIds.map(phaseFor),
  resourcePlans: buildPhaseResourcePlans(phaseIds.map(phaseFor)),
  dsaTrack: cockpitRaw.dsa as unknown as MeridianModel["dsaTrack"],
  library: cockpitRaw.library as unknown as Library,
  firstSevenDays: cockpitRaw.library.firstSevenDays,
  safetyNet: northstarRaw.safetyNet,
  registry: buildRegistry(phaseIds.map(phaseFor)),
};

export const cockpitCheckableItemCount = model.phases.reduce(
  (count, phase) => count + phase.curriculum.reduce((sum, section) => sum + sectionItems(section), 0),
  0,
);
