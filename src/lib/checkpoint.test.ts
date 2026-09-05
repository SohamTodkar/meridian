import { describe, expect, it } from "vitest";
import { model } from "@/data";
import { getInitialMeridianState } from "@/state/store";
import { isPhaseCleared, phaseEvidenceIds } from "@/state/selectors";
import { checkpointEvidence } from "./checkpoint";

describe("visible checkpoint evidence", () => {
  for (const phase of model.phases) {
    it(`can clear and reopen ${phase.id} using only visible groups`, () => {
      const groups = checkpointEvidence(phase);
      expect(new Set(groups.flatMap(group => group.ids))).toEqual(
        new Set(phaseEvidenceIds(phase))
      );
      const state = {
        ...getInitialMeridianState(),
        checks: {} as Record<string, boolean>,
      };
      for (const group of groups)
        for (const id of group.ids) state.checks[id] = true;
      expect(isPhaseCleared(phase, state)).toBe(true);
      for (const id of groups[0].ids) state.checks[id] = false;
      expect(isPhaseCleared(phase, state)).toBe(false);
    });
  }
  it("keeps every backing ID when wording is collapsed", () => {
    const phase = structuredClone(model.phases[0]);
    phase.checkpoint.cockpit.requirements = ["Run Python", "Read a traceback"];
    phase.checkpoint.northstar = ["Run Python without help"];
    const groups = checkpointEvidence(phase);
    expect(groups).toHaveLength(2);
    expect(groups[0].text).toBe("Run Python without help");
    expect(groups[0].ids).toEqual(["p0.checkpoint.requirement.1", "p0.gate.1"]);
  });
});
