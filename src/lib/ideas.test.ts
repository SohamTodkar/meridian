import { describe, expect, it } from "vitest";
import { getIdeaBySlug, toPlainText } from "./ideas";

describe("toPlainText", () => {
  it("keeps article copy while stripping MDX presentation characters", () => {
    expect(toPlainText("## A *working* idea\n\n<Callout>Keep it small.</Callout>")).toContain("A working idea");
    expect(toPlainText("## A *working* idea\n\n<Callout>Keep it small.</Callout>")).toContain("Keep it small.");
  });

  it("loads MDX detail content with generated headings for the article route", async () => {
    const idea = await getIdeaBySlug("notes-on-interface-tension");
    expect(idea?.content).toContain("<CodeBlock");
    expect(idea?.headings.map((heading) => heading.id)).toEqual(["calm-is-not-the-absence-of-movement", "make-the-affordance-earn-its-attention"]);
  });
});
