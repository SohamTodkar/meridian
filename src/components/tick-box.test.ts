import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const control = readFileSync(resolve(process.cwd(), "src/components/tick-box.tsx"), "utf8");
const controlConsumers = ["phase-hub.tsx", "session-runner.tsx", "stage3-views.tsx", "today-view.tsx"].map((file) =>
  readFileSync(resolve(process.cwd(), "src/components", file), "utf8"),
);

describe("shared completion controls", () => {
  it("uses a controlled native checkbox so click, touch, and keyboard toggles share one behavior", () => {
    expect(control).toContain('type="checkbox"');
    expect(control).toContain("checked={checked}");
    expect(control).toContain("onChange={() => onChange()}");
  });

  it("is used by Today, curriculum, session evidence, DSA, first-seven-days, and weekly review flows", () => {
    controlConsumers.forEach((source) => expect(source).toContain("<TickBox"));
    expect(controlConsumers[2]).toContain("FirstSevenDaysView");
    expect(controlConsumers[2]).toContain("Weekly rituals");
  });
});
