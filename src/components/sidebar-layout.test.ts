import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  resolve(process.cwd(), "src/app/observatory.css"),
  "utf8"
);
const shell = readFileSync(
  resolve(process.cwd(), "src/components/app-shell.tsx"),
  "utf8"
);

describe("sidebar navigation reachability", () => {
  it("keeps the full navigation rail independently scrollable", () => {
    expect(css).toMatch(/\.obs-sidebar\s*\{[^}]*overflow-y:\s*auto/);
  });

  it("uses native scrolling without an intercepting smooth-scroll engine", () => {
    const layout = readFileSync(
      resolve(process.cwd(), "src/app/layout.tsx"),
      "utf8"
    );
    expect(layout).not.toContain("SmoothScrollProvider");
  });

  it("retains direct links to the lower navigation sections", () => {
    // The nav register is data-driven; the entries below must stay reachable.
    for (const route of ["/portfolio", "/library", "/research", "/focus"]) {
      expect(shell).toMatch(new RegExp(`href:\\s*"${route}"`));
    }
  });
});
