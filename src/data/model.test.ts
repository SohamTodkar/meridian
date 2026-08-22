import { describe, expect, it } from "vitest";
import counts from "./raw/counts.json";
import { cockpitCheckableItemCount, model } from "./normalize";

describe("Meridian data model", () => {
  it("has unique stable ids across the complete registry", () => {
    const ids = model.registry.all.map((record) => record.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("preserves the extracted cockpit checkable-item count", () => {
    expect(cockpitCheckableItemCount).toBe(counts.cockpitCheckableItems);
  });

  it("gives every phase a session spine, resources, and checkpoint", () => {
    for (const phase of model.phases) {
      expect(phase.sessions.length).toBeGreaterThan(0);
      expect(phase.resources.length).toBeGreaterThan(0);
      expect(phase.checkpoint.cockpit.quote).not.toBe("");
      expect(phase.checkpoint.cockpit.proof).not.toBe("");
      expect(phase.checkpoint.northstar.length).toBeGreaterThan(0);
    }
  });

  it("normalizes zero-based phase identities as numeric values for stable visible numbering", () => {
    expect(model.phases.map((phase) => phase.identity.number)).toEqual([0, 1, 2, 3]);
  });

  it("has no empty required strings in the normalized learning spine", () => {
    for (const phase of model.phases) {
      for (const session of phase.sessions) {
        for (const value of [
          session.id,
          session.title,
          session.outcome,
          session.proof,
          session.stop,
          session.hint,
          ...session.steps,
          ...session.checks,
        ]) {
          expect(value.trim()).not.toBe("");
        }
      }
      for (const resource of phase.resources) {
        expect(resource.id.trim()).not.toBe("");
        expect(resource.name.trim()).not.toBe("");
      }
    }
  });
});
