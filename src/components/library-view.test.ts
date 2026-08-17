import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const libraryView = readFileSync(resolve(import.meta.dirname, "stage3-views.tsx"), "utf8");

describe("Library & Network roadmap controls", () => {
  it("defaults to the phase-based resource roadmap while retaining the legacy reference tabs", () => {
    expect(libraryView).toContain('params.get("tab") ?? "roadmap"');
    expect(libraryView).toContain('["roadmap", "Resource roadmap"]');
    expect(libraryView).toContain('["communities", "Communities"]');
    expect(libraryView).toContain('["university", "University play"]');
  });

  it("supports a selected phase and tier-specific resource filter in the roadmap URL", () => {
    expect(libraryView).toContain('params.get("phase")');
    expect(libraryView).toContain('selectResourceTier(activePlan, params.get("tier"))');
    expect(libraryView).toContain('className="tier-filter"');
    expect(libraryView).toContain('filterResourceTiers(activePlan, activeTier)');
  });
});
