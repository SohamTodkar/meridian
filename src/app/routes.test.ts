import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const appRoot = join(process.cwd(), "src", "app");

function sourceFor(route: string) {
  const file = route === "/" ? join(appRoot, "page.tsx") : join(appRoot, route.slice(1), "page.tsx");
  expect(existsSync(file), `expected ${route} route module to exist`).toBe(true);
  return readFileSync(file, "utf8");
}

describe("Meridian route render contracts", () => {
  it("wires the Today route to its supplied dashboard view", () => {
    const page = sourceFor("/");
    expect(page).toContain("TodayView");
    expect(page).toMatch(/export\s+default\s+function/);
  });

  it("wires the Learning Path and Library routes to dedicated views", () => {
    const path = sourceFor("/path");
    const library = sourceFor("/library");
    expect(path).toContain("PathView");
    expect(library).toContain("LibraryView");
    expect(path).toMatch(/export\s+default\s+function/);
    expect(library).toMatch(/export\s+default\s+function/);
  });

  it("wires the Recall route to the local retrieval-practice workspace", () => {
    const recall = sourceFor("/recall");
    expect(recall).toContain("RecallView");
    expect(recall).toMatch(/export\s+default\s+function/);
  });
});
