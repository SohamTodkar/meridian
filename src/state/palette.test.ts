import { describe, expect, it } from "vitest";
import { model } from "@/data";
import { buildPaletteIndex, searchPalette } from "./palette";
import { importBackup } from "./importers";

describe("command palette", () => {
  it("ranks an exact session title before fuzzy matches", () => {
    const index = buildPaletteIndex(model);
    const title = model.phases[0].sessions[0].title;
    const results = searchPalette(index, title);
    expect(results[0].label).toBe(title);
  });

  it("offers direct resume and backup actions when a local attempt exists", () => {
    const index = buildPaletteIndex(model, { sessions: {}, sessionAttempts: {
      p0s1: { schemaVersion: 1, sessionId: "p0s1", currentStep: 1, proofMode: false, journal: "Draft", confusion: "", nextQuestion: "", timerSeconds: 20, updatedAt: "2026-08-14T10:00:00.000Z" },
    } });
    expect(index).toContainEqual(expect.objectContaining({ id: "resume", href: "/session/p0s1" }));
    expect(index).toContainEqual(expect.objectContaining({ id: "backup", href: "/settings#portable-state" }));
    expect(index).toContainEqual(expect.objectContaining({ id: "capture-evidence", href: "/portfolio#capture" }));
  });
});

describe("legacy import", () => {
  it("maps registered checks and reports unknown ids as skipped", () => {
    const known = model.registry.all[0].id;
    const result = importBackup({ app: "Cockpit", v: 1, checks: { [known]: true, "old.unknown": true }, scheduleMode: "normal" }, model);
    expect(result?.source).toBe("Cockpit");
    expect(result?.matched).toBe(1);
    expect(result?.skipped).toBe(1);
    expect(result?.state.checks?.[known]).toBe(true);
  });

  it("rejects valid JSON with no recognized backup identity", () => {
    expect(importBackup({ hello: "world" }, model)).toBeNull();
    expect(importBackup({ version: 1, state: { hello: "world" } }, model)).toBeNull();
  });
});
