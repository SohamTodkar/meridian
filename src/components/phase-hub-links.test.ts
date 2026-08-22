import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/phase-hub.tsx"), "utf8");

describe("phase tab routes", () => {
  it("uses the exported phase id instead of an ungenerated display number", () => {
    expect(source).toContain("href={`/path/${phase.id}?tab=${item}`}");
    expect(source).not.toContain("href={`/path/${phase.identity.number}?tab=${item}`}");
  });
});
