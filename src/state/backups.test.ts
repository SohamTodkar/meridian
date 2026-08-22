import { describe, expect, it } from "vitest";
import { model } from "@/data";
import { createVerifiedBackup, previewBackup } from "./backups";

const state = {
  checks: { "p0s1.step": true },
  sessions: { p0s1: { currentStep: 1, completed: false } },
  settings: { scheduleMode: "normal" },
  journals: [{ id: "journal-1", date: "2026-08-14", text: "A proof." }],
  evidence: [{ id: "evidence-1" }],
  retrievalPrompts: [{ id: "retrieval-1" }],
};

describe("verified Meridian backups", () => {
  it("creates a deterministic checksummed envelope that previews without mutating state", () => {
    const backup = createVerifiedBackup(state, "2026-08-14T12:00:00.000Z");
    const preview = previewBackup(backup, model);

    expect(preview).toMatchObject({ source: "Meridian", integrity: "verified", matched: 2, summary: { checks: 1, sessions: 1, journals: 1, evidence: 1, retrievalPrompts: 1 } });
    expect(backup.checksum).toMatch(/^fnv1a32:/);
  });

  it("rejects an envelope whose state changes after its checksum is created", () => {
    const backup = createVerifiedBackup(state, "2026-08-14T12:00:00.000Z");
    const altered = { ...backup, state: { ...backup.state, checks: { altered: true } } };

    expect(previewBackup(altered, model)).toBeNull();
  });

  it("continues to preview the previous Meridian v1 format as a legacy import", () => {
    const preview = previewBackup({ version: 1, state }, model);

    expect(preview).toMatchObject({ source: "Meridian", integrity: "legacy", summary: { journals: 1 } });
  });
});
