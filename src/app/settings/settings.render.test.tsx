import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/state/cloud", () => ({
  useCloudStore: () => ({
    visitor: false,
    storage: "postgres",
    status: "saved",
    revision: 3,
    savedAt: null,
  }),
  downloadWorkspace: vi.fn(),
  hasUnsavedChanges: () => false,
  initializeCloud: vi.fn(),
  saveCloud: vi.fn(),
  signOut: vi.fn(),
}));
import { SettingsView } from "@/components/settings-view";
describe("cloud workspace settings", () => {
  it("offers server recovery and explicit import without destructive reset", () => {
    const html = renderToStaticMarkup(<SettingsView />);
    expect(html).toContain("Your private cloud workspace");
    expect(html).toContain("Recovery history");
    expect(html).toContain("Import backup");
    expect(html).toContain("Find old browser data");
    expect(html).not.toContain("Reset local data");
  });
});
