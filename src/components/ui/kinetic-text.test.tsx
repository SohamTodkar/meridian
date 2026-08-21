import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KineticText } from "./kinetic-text";

describe("KineticText", () => {
  it("renders paired visible and rollover glyphs for every character", () => {
    const markup = renderToStaticMarkup(<KineticText>Hi</KineticText>);
    expect(markup.match(/class="kinetic-glyph"/g)).toHaveLength(2);
    expect(markup.match(/<span>H<\/span>/g)).toHaveLength(2);
    expect(markup).toContain("aria-label=\"Hi\"");
  });
});
