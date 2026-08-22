import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const shell = readFileSync(resolve(process.cwd(), "src/components/app-shell.tsx"), "utf8");

describe("sidebar navigation reachability", () => {
  it("keeps the full navigation rail independently scrollable", () => {
    expect(css).toMatch(/\.rail\s*\{[\s\S]*?overflow-y:\s*auto[\s\S]*?overscroll-behavior:\s*contain/);
  });

  it("keeps the rail wheel-scrollable independently of the smooth-scroll engine", () => {
    expect(shell).toContain('data-lenis-prevent');
  });

  it("retains direct links to the lower navigation sections", () => {
    // The rail register is data-driven; the entries below must stay reachable.
    expect(shell).toContain('{ label: "Portfolio", href: "/portfolio"');
    expect(shell).toContain('{ label: "Library & network", href: "/library"');
  });
});
