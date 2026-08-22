export type ModeAccent = string;

export interface Profile {
  owner: string;
  age: number;
  stage: string;
  terminalGoal: string;
}

export interface PlanningMode {
  category: "schedule";
  key: string;
  label: string;
  weekly?: number;
  touchMin?: number;
  dsa?: number;
  minutes?: number;
  notes: string[];
}

export interface EnergyMode {
  category: "energy";
  key: string;
  label: string;
  when: string;
  what: string;
  accent: ModeAccent;
}

export interface PaceRule {
  k: string;
  v: string;
  why: string;
}

export interface PaceDoctrine {
  headline: string;
  rules: PaceRule[];
  replaces: string;
}

export interface Habit {
  id: string;
  block: string;
  from: string;
  to: string;
  mode: string;
  label: string;
  detail: string;
  restDay?: boolean;
  star?: boolean;
  anchor?: boolean;
}

export interface Block {
  label: string;
  mode: string;
  note: string;
}

export interface StuckStep {
  n: number;
  label: string;
  detail: string;
}

export interface StuckProtocol {
  trigger: string;
  hardStop: string;
  steps: StuckStep[];
}

export interface AssistantRule {
  verdict: string;
  reasoning: string;
  allowed: string[];
  forbidden: string[];
  after: string;
}

export interface Checkpoint {
  quote: string;
  gate?: string;
  proof: string;
  requirements: string[];
}

export interface ChecklistItem {
  text: string;
  meta?: string;
}

export interface DayItem {
  day: number;
  text: string;
  review?: boolean;
}

export interface TableItem {
  text: string;
  why: string;
}

export interface ProjectItem {
  text: string;
  detail: string;
}

export interface ResourceItem {
  name: string;
  rating: number;
  why: string;
  url?: string;
}

export interface SectionBase {
  key: string;
  title: string;
  note?: string;
}

export interface ChecklistSection extends SectionBase {
  kind: "checklist";
  items: ChecklistItem[];
}

export interface ChecktableSection extends SectionBase {
  kind: "checktable";
  head?: string[];
  items: TableItem[];
}

export interface DaysSection extends SectionBase {
  kind: "days";
  items: DayItem[];
}

export interface VideosSection extends SectionBase {
  kind: "videos";
  items: string[];
}

export interface ProjectsSection extends SectionBase {
  kind: "projects";
  items: ProjectItem[];
}

export interface PapersSection extends SectionBase {
  kind: "papers";
  items: ChecklistItem[];
}

export interface ResourcesSection extends SectionBase {
  kind: "resources";
  items: ResourceItem[];
}

export type CurriculumSection =
  | ChecklistSection
  | ChecktableSection
  | DaysSection
  | VideosSection
  | ProjectsSection
  | PapersSection
  | ResourcesSection;

export interface Session {
  id: string;
  title: string;
  minutes: number;
  outcome: string;
  steps: string[];
  proof: string;
  checks: string[];
  stop: string;
  hint: string;
}

export interface NorthstarResource {
  name: string;
  url: string;
  role: string;
  note: string;
  checked: string;
}

export interface MergedResource {
  id: string;
  name: string;
  rating?: number;
  role?: string;
  note?: string;
  why?: string;
  checked?: string;
  url?: string;
}

export type ResourceTierId = "anchor" | "core" | "support" | "deeper";

export interface TieredResource extends MergedResource {
  tier: ResourceTierId;
  guidance: string;
}

export interface ResourceTier {
  id: ResourceTierId;
  label: string;
  description: string;
  resources: TieredResource[];
}

export interface PhaseResourcePlan {
  phaseId: string;
  phaseLabel: string;
  title: string;
  summary: string;
  primary: string;
  tiers: ResourceTier[];
}

export interface PhaseIdentity {
  number: number;
  cockpitName: string;
  northstarName: string;
  weeks: string;
  typicalRange: string;
  objective: string;
  summary: string;
  promise: string;
  primary: string;
}

export interface DsaSection {
  key: string;
  kind: string;
  title?: string;
  note?: string;
  head?: string[];
  items: Array<Record<string, string>>;
}

export interface DsaPhase {
  key: string;
  num: string;
  name: string;
  weeks: string;
  parallel: string;
  intro: string;
  sections: DsaSection[];
  milestone: string;
  proof?: string;
  dormant?: boolean;
}

export interface DsaTrack {
  purpose: string;
  philosophy: string;
  warning: string;
  rules: string[];
  allocation: Array<{ phase: string; weeks: string; time: string; focus: string }>;
  targets: Array<{ milestone: string; count: number; when: string }>;
  phases: DsaPhase[];
}

export interface Phase {
  id: string;
  identity: PhaseIdentity;
  priorities: string[];
  stretch: string[];
  sessions: Session[];
  curriculum: CurriculumSection[];
  resources: MergedResource[];
  checkpoint: {
    cockpit: Checkpoint;
    northstar: string[];
  };
}

export interface Library {
  ratingScale: { stars: number; meaning: string }[];
  communities: CommunityGroup[];
  people: {
    twitter: Person[];
    youtube: Person[];
    newsletters: Person[];
  };
  tools: LibraryEntry[];
  compute: Compute;
  toolcraft: Toolcraft;
  budget: BudgetItem[];
  books: Book[];
  university: University;
  portfolioRules: PortfolioRule[];
  firstSevenDays: FirstSevenDay[];
  trap: string;
}

export interface Community {
  key: string;
  name: string;
  platform: string;
  why: string;
  how: string;
  url?: string;
}
export interface CommunityGroup {
  tier: string;
  urgency: string;
  items: Community[];
}
export interface Person {
  name: string;
  handle?: string;
  by?: string;
  phase?: string;
  why?: string;
  what?: string;
}

export interface PeopleGroups {
  twitter: Person[];
  youtube: Person[];
  newsletters: Person[];
}
export interface LibraryEntry {
  key: string;
  name: string;
  what: string;
  when: string;
  why?: string;
  url?: string;
}
export interface ComputeOption {
  name: string;
  cost: string;
  gives: string;
  when: string;
  note: string;
}
export interface Compute {
  headline: string;
  note: string;
  options: ComputeOption[];
}
export interface ToolcraftItem {
  name: string;
  rating: number;
  why: string;
  url?: string;
}
export interface Toolcraft {
  headline: string;
  note: string;
  items: ToolcraftItem[];
}
export interface UniversityYear {
  year: string;
  focus: string;
  why: string;
}
export interface UniversityPlay {
  key: string;
  text: string;
  detail: string;
}
export interface University {
  years: UniversityYear[];
  plays: UniversityPlay[];
}
export interface BudgetItem {
  item: string;
  cost: string;
  worth: string;
  when: string;
}
export interface Book {
  title: string;
  author: string;
  when: string;
  rating: number;
  note: string;
}
export interface PortfolioRule {
  key: string;
  text: string;
}
export interface FirstSevenDay {
  day: number;
  actions: string[];
}

export interface IdRecord {
  id: string;
  phaseId: string;
  sectionId?: string;
  kind: "curriculum" | "session-check" | "checkpoint-requirement" | "gate" | "dsa";
}

export interface IdRegistry {
  all: IdRecord[];
  byPhase: Array<{ phaseId: string; records: IdRecord[] }>;
  bySection: Array<{ sectionId: string; records: IdRecord[] }>;
}

export interface MeridianModel {
  profile: Profile;
  doctrine: {
    pace: PaceDoctrine;
    metaRules: string[];
    sustainability: unknown;
    streakRecovery: unknown;
    aiAssistant: AssistantRule;
    ankiDiscipline: unknown;
    writingRitual: unknown;
    stuckProtocol: StuckProtocol;
    paperProtocol: unknown;
    fieldDrift: unknown;
    successMarkers: { at: string; evidence: string }[];
  };
  modes: Array<EnergyMode | PlanningMode>;
  habitStack: Habit[];
  blocks: Record<"morning" | "afternoon" | "evening", Block>;
  weeklyRituals: unknown;
  phases: Phase[];
  resourcePlans: PhaseResourcePlan[];
  dsaTrack: DsaTrack;
  library: Library;
  firstSevenDays: FirstSevenDay[];
  safetyNet: {
    cs: string[];
    career: string[];
  };
  registry: IdRegistry;
}
