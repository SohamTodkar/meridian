import Fuse from "fuse.js";
import type { IdeaSummary } from "./ideas";

export type ArchiveFilters = { query: string; tags: string[]; sort: "newest" | "oldest" };

export function filterIdeas(ideas: IdeaSummary[], { query, tags, sort }: ArchiveFilters) {
  const searched = query.trim() ? new Fuse(ideas, { keys: ["title", "description", "tags"], threshold: 0.34 }).search(query).map((result) => result.item) : ideas;
  return searched.filter((idea) => tags.every((tag) => idea.tags.includes(tag))).sort((a, b) => sort === "newest" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
}
