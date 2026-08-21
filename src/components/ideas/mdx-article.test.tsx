import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MdxArticle } from "./mdx-article";

describe("MdxArticle", () => {
  it("renders MDX headings, callouts, and GitHub-flavored tables as article content", async () => {
    const article = await MdxArticle({ source: "## A useful section\n\n<Callout title=\"Note\">Keep it observable.</Callout>\n\n| Signal | Response |\n| --- | --- |\n| Friction | Simplify |" });
    const markup = renderToStaticMarkup(article);
    expect(markup).toContain("A useful section");
    expect(markup).toContain("Keep it observable.");
    expect(markup).toContain("<table");
  });
});
