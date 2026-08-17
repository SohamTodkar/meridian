import { describe, expect, it } from "vitest";
import { getLocalDateKey, getWeekStartKey, shiftDateKey } from "./date";

describe("local learning-date helpers", () => {
  it("derives a calendar key in the selected timezone instead of UTC", () => {
    const instant = new Date("2026-08-14T00:30:00.000Z");
    expect(getLocalDateKey(instant, "America/Los_Angeles")).toBe("2026-08-13");
    expect(getLocalDateKey(instant, "Asia/Kolkata")).toBe("2026-08-14");
  });

  it("moves date keys across month and year boundaries without timezone drift", () => {
    expect(shiftDateKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDateKey("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("uses the local Monday for weekly planning and reporting", () => {
    expect(getWeekStartKey(new Date("2026-08-16T23:30:00.000Z"), "Asia/Kolkata")).toBe("2026-08-17");
  });
});
