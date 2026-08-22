import type { MergedResource, Phase, PhaseResourcePlan, ResourceTier, ResourceTierId, TieredResource } from "./types";

export type ResourceTierFilter = "all" | ResourceTierId;

const tierDefinitions: Array<Omit<ResourceTier, "resources">> = [
  {
    id: "anchor",
    label: "Tier 1 · Anchor",
    description: "The one structured spine to follow before adding anything else.",
  },
  {
    id: "core",
    label: "Tier 2 · Core companion",
    description: "Use alongside the anchor when it directly strengthens the current phase goal.",
  },
  {
    id: "support",
    label: "Tier 3 · Reference & reinforcement",
    description: "Open for a targeted gap, a second explanation, or deliberate practice—not as a second syllabus.",
  },
  {
    id: "deeper",
    label: "Tier 4 · Later depth",
    description: "Keep in reserve until the core proof is solid or curiosity has a concrete question behind it.",
  },
];

function resourceKey(resource: Pick<MergedResource, "name">): string {
  const name = resource.name.toLowerCase();
  if (name.includes("cs50p")) return "cs50p";
  if (name.includes("helsinki") && name.includes("python")) return "helsinki-python-mooc";
  if (name.includes("kaggle learn")) return "kaggle-learn";
  if (name.includes("zero to hero") || name.includes("neural networks: zero to hero")) return "zero-to-hero";
  if (name.includes("arena")) return "arena";
  if (name.includes("pytorch") && name.includes("tutorial")) return "pytorch-tutorials";
  if (name.includes("3blue1brown") && name.includes("linear algebra")) return "3blue1brown-linear-algebra";
  return name.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function tierFor(resource: MergedResource): ResourceTierId {
  const role = (resource.role ?? "").trim().toLowerCase();
  if (["primary", "primary course", "primary practical sequence", "technical backbone", "anchor"].includes(role)) return "anchor";
  if ((resource.rating ?? 0) >= 5) return "core";
  if ((resource.rating ?? 0) >= 4 || role.includes("backup") || role.includes("reference") || role.includes("intuition")) return "support";
  return "deeper";
}

function guidanceFor(resource: MergedResource, tier: ResourceTierId): string {
  if (resource.role) return resource.role;
  if (tier === "core") return "Core companion";
  if (tier === "support") return "Targeted support";
  return "Later depth";
}

function dedupeResources(resources: MergedResource[]): MergedResource[] {
  const deduped = new Map<string, MergedResource>();
  for (const resource of resources) {
    const key = resourceKey(resource);
    const earlier = deduped.get(key);
    deduped.set(key, earlier ? { ...resource, ...earlier, url: earlier.url ?? resource.url, role: earlier.role ?? resource.role, note: earlier.note ?? resource.note } : resource);
  }
  return [...deduped.values()];
}

function tierResources(resources: MergedResource[], id: ResourceTierId): TieredResource[] {
  return dedupeResources(resources)
    .filter((resource) => tierFor(resource) === id)
    .map((resource) => ({ ...resource, tier: id, guidance: guidanceFor(resource, id) }));
}

export function buildPhaseResourcePlans(phases: Phase[]): PhaseResourcePlan[] {
  return phases.map((phase, index) => ({
    phaseId: phase.id,
    phaseLabel: `Phase ${index + 1}`,
    title: phase.identity.northstarName,
    summary: phase.identity.summary,
    primary: phase.identity.primary,
    tiers: tierDefinitions.map((tier) => ({ ...tier, resources: tierResources(phase.resources, tier.id) })),
  }));
}

export function selectResourcePlan(plans: PhaseResourcePlan[], phaseId: string | null): PhaseResourcePlan {
  return plans.find((plan) => plan.phaseId === phaseId) ?? plans[0];
}

export function selectResourceTier(plan: PhaseResourcePlan, requestedTier: string | null): ResourceTierFilter {
  const tier = requestedTier ?? "all";
  return tier === "all" || plan.tiers.some((item) => item.id === tier) ? tier as ResourceTierFilter : "all";
}

export function filterResourceTiers(plan: PhaseResourcePlan, tier: ResourceTierFilter): ResourceTier[] {
  return plan.tiers.filter((item) => item.resources.length && (tier === "all" || item.id === tier));
}
