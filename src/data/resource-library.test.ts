import { describe, expect, it } from "vitest";
import { model } from "./normalize";
import { filterResourceTiers, selectResourcePlan, selectResourceTier } from "./resource-library";

describe("phase-tiered resource library", () => {
  it("creates one roadmap for every learning phase with a single anchor", () => {
    expect(model.resourcePlans).toHaveLength(4);
    for (const plan of model.resourcePlans) {
      const anchors = plan.tiers.find((tier) => tier.id === "anchor")?.resources ?? [];
      expect(anchors).toHaveLength(1);
      expect(plan.tiers.flatMap((tier) => tier.resources).length).toBeGreaterThan(0);
    }
  });

  it("places the intended curriculum spines in the correct phase", () => {
    expect(model.resourcePlans[0].tiers.find((tier) => tier.id === "anchor")?.resources[0]?.name).toContain("CS50P");
    expect(model.resourcePlans[1].tiers.find((tier) => tier.id === "anchor")?.resources[0]?.name).toContain("Kaggle Learn");
    expect(model.resourcePlans[2].tiers.find((tier) => tier.id === "anchor")?.resources[0]?.name).toContain("Zero to Hero");
    expect(model.resourcePlans[3].tiers.find((tier) => tier.id === "anchor")?.resources[0]?.name).toContain("ARENA");
  });

  it("merges source aliases into one actionable card instead of duplicating a resource", () => {
    const phaseOneNames = model.resourcePlans[0].tiers.flatMap((tier) => tier.resources).map((resource) => resource.name);
    expect(phaseOneNames.filter((name) => /cs50p/i.test(name))).toHaveLength(1);
    expect(phaseOneNames.filter((name) => /helsinki.*python|python.*helsinki/i.test(name))).toHaveLength(1);
    expect(phaseOneNames.filter((name) => /3blue1brown.*linear algebra/i.test(name))).toHaveLength(1);
  });

  it("changes the selected phase and displayed resources when a tier filter is applied", () => {
    const deepLearning = selectResourcePlan(model.resourcePlans, "p2");
    expect(deepLearning.title).toBe("Deep Learning Systems");
    const coreTier = selectResourceTier(deepLearning, "core");
    const visible = filterResourceTiers(deepLearning, coreTier);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe("core");
    expect(visible[0].resources.map((resource) => resource.name)).toContain("Fast.ai — Practical Deep Learning");
    expect(selectResourceTier(deepLearning, "unknown")).toBe("all");
  });
});
