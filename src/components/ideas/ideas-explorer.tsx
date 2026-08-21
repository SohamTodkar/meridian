"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KineticText } from "@/components/ui/kinetic-text";
import { RiveCanvas } from "@/components/ui/rive-canvas";
import { filterIdeas } from "@/lib/archive";
import { IdeaCard } from "./idea-card";
import type { IdeaSummary } from "@/lib/ideas";

const PAGE_SIZE = 3;
type SortOrder = "newest" | "oldest";

export function IdeasExplorer({ ideas }: { ideas: IdeaSummary[] }) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>(() => searchParams.get("tag") ? [searchParams.get("tag") as string] : []);
  const [sort, setSort] = useState<SortOrder>("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sentinel = useRef<HTMLDivElement>(null);
  const tags = useMemo(() => [...new Set(ideas.flatMap((idea) => idea.tags))].sort(), [ideas]);
  const filtered = useMemo(() => filterIdeas(ideas, { query, tags: activeTags, sort }), [activeTags, ideas, query, sort]);

  useEffect(() => {
    const target = sentinel.current;
    if (!target || visible >= filtered.length) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) setVisible((count) => Math.min(count + PAGE_SIZE, filtered.length)); }, { rootMargin: "240px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [filtered.length, visible]);

  function toggleTag(tag: string) {
    setVisible(PAGE_SIZE);
    setActiveTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  }

  function updateSearch(value: string) { setVisible(PAGE_SIZE); setQuery(value); }
  function updateSort(value: SortOrder) { setVisible(PAGE_SIZE); setSort(value); }

  return <section className="ideas-explorer"><div className="ideas-heading"><div><p className="eyebrow">Archive / {String(ideas.length).padStart(2, "0")} signals</p><KineticText as="h1">Ideas</KineticText><p>Small, visible experiments in systems, interfaces, and the work of paying attention.</p></div><RiveCanvas label="Animated vector sketch" /></div><div className="ideas-controls"><label className="search-control"><Search size={17} aria-hidden="true" /><span className="sr-only">Search ideas</span><input value={query} onChange={(event) => updateSearch(event.target.value)} placeholder="Search ideas" type="search" /></label><div className="filter-control" aria-label="Filter ideas"><span><SlidersHorizontal size={15} /> Tags</span>{tags.map((tag) => <button className={activeTags.includes(tag) ? "is-selected" : ""} type="button" key={tag} onClick={() => toggleTag(tag)} aria-pressed={activeTags.includes(tag)}>{tag}</button>)}</div><div className="sort-control" aria-label="Sort ideas"><button className={sort === "newest" ? "is-selected" : ""} type="button" onClick={() => updateSort("newest")}>Newest</button><button className={sort === "oldest" ? "is-selected" : ""} type="button" onClick={() => updateSort("oldest")}>Oldest</button></div></div>{filtered.length ? <><div className="ideas-grid">{filtered.slice(0, visible).map((idea) => <IdeaCard key={idea.slug} idea={idea} />)}</div><div ref={sentinel} className="load-sentinel">{visible < filtered.length ? "Loading more ideas…" : "End of field notes"}</div></> : <div className="empty-ideas"><RiveCanvas label="Animated empty-state illustration" /><h2>No ideas found</h2><p>Try clearing a tag or looking for a different phrase.</p><button type="button" onClick={() => { setVisible(PAGE_SIZE); setQuery(""); setActiveTags([]); }}>Reset filters</button></div>}</section>;
}
