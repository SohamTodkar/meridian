/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const stateRef = vi.hoisted(() => ({ current: {} as any }));

vi.mock("@/state/store", () => ({
  useMeridianStore: Object.assign(() => stateRef.current, { getState: () => stateRef.current, setState: vi.fn() }),
  getPersistedMeridianState: () => ({}),
}));

vi.mock("@/state/persistence", () => ({ getMeridianPersistenceStatus: () => ({ mode: "indexeddb", migratedLegacy: true }) }));

import SettingsPage from "./page";

describe("rendered persistence settings", () => {
  it("shows IndexedDB health and a non-destructive verified restore entry point", () => {
    stateRef.current = {
      settings: { scheduleMode: "normal", timeZone: "UTC", pace: {} },
      setScheduleMode: vi.fn(), setSetting: vi.fn(), resetLocalState: vi.fn(),
    };

    const html = renderToStaticMarkup(<SettingsPage />);

    expect(html).toContain("IndexedDB active");
    expect(html).toContain("legacy Meridian data was copied once");
    expect(html).toContain("Export verified JSON");
    expect(html).toContain("Preview restore");
    expect(html).toContain("Imports are previewed before anything on this device changes");
  });
});
