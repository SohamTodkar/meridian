import { describe, expect, it } from "vitest";
import { filterIdeas } from "./archive";

const ideas = [
  { slug: "one", title: "Quiet interface", description: "Motion practice", tags: ["Design", "Practice"], status: "Published" as const, date: "2026-08-01", readingTime: "2 min read" },
  { slug: "two", title: "Research signal", description: "A small experiment", tags: ["Research"], status: "Exploring" as const, date: "2026-07-01", readingTime: "1 min read" },
];

describe("filterIdeas", () => {
  it("combines fuzzy search, tag selection, and chronological ordering", () => {
    expect(filterIdeas(ideas, { query: "interfase", tags: ["Design"], sort: "newest" }).map((idea) => idea.slug)).toEqual(["one"]);
    expect(filterIdeas(ideas, { query: "", tags: [], sort: "oldest" }).map((idea) => idea.slug)).toEqual(["two", "one"]);
  });
});
