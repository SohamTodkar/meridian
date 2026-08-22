import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const search = vi.hoisted(() => ({ value: "tab=roadmap&phase=p0" }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search.value),
}));

import { LibraryView } from "./stage3-views";

function renderLibrary(query: string): string {
  search.value = query;
  return renderToStaticMarkup(<LibraryView />);
}

describe("rendered Library & Network behavior", () => {
  it("renders the selected phase and only its selected Core tier resources", () => {
    const html = renderLibrary("tab=roadmap&phase=p2&tier=core");

    expect(html).toContain("Phase 3 · Deep Learning Systems");
    expect(html).toContain("Fast.ai — Practical Deep Learning");
    expect(html).toContain("Attention Is All You Need");
    expect(html).toContain("Tier 2 · Core companion");
    expect(html).not.toContain("Harvard CS50P");
    expect(html).not.toContain("Tier 1 · Anchor</div><p>The one structured spine");
  });

  it("renders the legacy Communities tab rather than the roadmap when the tab URL changes", () => {
    const html = renderLibrary("tab=communities");

    expect(html).toContain("Communities");
    expect(html).toContain("Trap");
    expect(html.match(/<summary>/g)).toHaveLength(4);
    expect(html).not.toContain("Your curriculum shelf");
  });
});
