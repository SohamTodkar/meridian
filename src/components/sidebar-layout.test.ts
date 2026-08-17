import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const shell = readFileSync(resolve(process.cwd(), "src/components/app-shell.tsx"), "utf8");

describe("sidebar navigation reachability", () => {
  it("keeps the full navigation rail independently scrollable", () => {
    expect(css).toMatch(/\.rail\s*\{[\s\S]*?overflow-y:\s*auto[\s\S]*?overscroll-behavior:\s*contain/);
  });

  it("retains direct links to the lower navigation sections", () => {
    expect(shell).toContain('href="/library"');
    expect(shell).toContain('href="/portfolio"');
  });
});
