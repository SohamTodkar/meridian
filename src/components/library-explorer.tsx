"use client";

import Fuse, { type IFuseOptions } from "fuse.js";
import { ExternalLink, SearchX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { model } from "@/data";
import { useMeridianStore } from "@/state/store";

/**
 * LibraryExplorer — the enhanced content listing (directive §6), adapted to
 * Meridian's collection: every tiered resource across the four phases plus
 * communities, tools and books, unified into one searchable catalogue.
 *
 *  - Fuse.js fuzzy search across name, description and tags
 *  - multi-select tag filters (phase · tier · kind) with instant counts
 *  - sort by relevance / name / rating
 *  - responsive card grid with a clip-path ellipse hover reveal
 *  - infinite scroll via IntersectionObserver (12 per page)
 *  - quiet empty state with a sad little blob and a reset action
 *  - personal resource state (saved/active/completed/paused) stays local
 */

export interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  kind: "resource" | "community" | "tool" | "book";
  phase: string;
  tier: string;
  rating?: number;
  url?: string;
  tags: string[];
}

const PAGE_SIZE = 12;

function buildCatalog(): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (const plan of model.resourcePlans) {
    for (const tier of plan.tiers) {
      for (const resource of tier.resources) {
        entries.push({
          id: resource.id,
          name: resource.name,
          description: resource.why ?? resource.role ?? resource.note ?? "Use as a deliberate part of this phase.",
          kind: "resource",
          phase: plan.phaseLabel,
          tier: tier.label.replace("Tier ", "T"),
          rating: resource.rating,
          url: resource.url,
          tags: [plan.phaseLabel, tier.label, "resource"],
        });
      }
    }
  }
  for (const group of model.library.communities) {
    for (const item of group.items) {
      entries.push({
        id: `community:${item.key}`,
        name: item.name,
        description: item.why,
        kind: "community",
        phase: "Any",
        tier: group.tier,
        url: item.url,
        tags: [group.tier, "community"],
      });
    }
  }
  for (const tool of model.library.tools) {
    entries.push({
      id: `tool:${tool.key}`,
      name: tool.name,
      description: tool.what,
      kind: "tool",
      phase: tool.when,
      tier: "Tooling",
      url: tool.url,
      tags: ["tool", tool.when],
    });
  }
  for (const book of model.library.books) {
    entries.push({
      id: `book:${book.title}`,
      name: book.title,
      description: `${book.author} · ${book.note}`,
      kind: "book",
      phase: book.when,
      tier: "Books",
      rating: book.rating,
      tags: ["book", book.when],
    });
  }
  return entries;
}

const fuseOptions: IFuseOptions<CatalogEntry> = {
  keys: [
    { name: "name", weight: 0.55 },
    { name: "description", weight: 0.25 },
    { name: "tags", weight: 0.2 },
  ],
  threshold: 0.36,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

type SortMode = "relevance" | "name" | "rating";

export function LibraryExplorer({ initialPhase }: { initialPhase?: string }) {
  const catalog = useMemo(() => buildCatalog(), []);
  const resourceStates = useMeridianStore((state) => state.resourceStates);
  const setResourceState = useMeridianStore((store) => store.setResourceState);

  const [query, setQuery] = useState("");
  // Seed with the phase the reader is already studying — the explorer opens
  // on their shelf; clearing the filter reveals the whole library.
  const [activeTags, setActiveTags] = useState<string[]>(initialPhase ? [initialPhase] : []);
  const [sort, setSort] = useState<SortMode>("relevance");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(() => new Fuse(catalog, fuseOptions), [catalog]);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of catalog) {
      for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [catalog]);

  const results = useMemo(() => {
    let base: CatalogEntry[];
    if (query.trim()) {
      base = fuse.search(query.trim(), { limit: 200 }).map((hit) => hit.item);
    } else {
      base = catalog;
    }
    const filtered = activeTags.length
      ? base.filter((entry) => activeTags.every((tag) => entry.tags.includes(tag)))
      : base;
    switch (sort) {
      case "name":
        return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
      case "rating":
        return [...filtered].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name));
      default:
        return filtered;
    }
  }, [catalog, fuse, query, activeTags, sort]);

  // Reset pagination whenever the query or filters change. State adjustment
  // during render is the React-endorsed pattern for derived resets — it
  // re-runs the render immediately instead of cascading an extra effect.
  const filterKey = `${query}|${activeTags.join(",")}|${sort}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

  // Infinite scroll: watch the sentinel, grow the page until everything shows.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + PAGE_SIZE, results.length));
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [results.length]);

  const visible = results.slice(0, visibleCount);
  const hasMore = visibleCount < results.length;

  const toggleTag = (tag: string) => {
    setActiveTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  };

  return (
    <section className="section" aria-labelledby="explorer-heading">
      <div className="section-heading">
        <div>
          <div className="eyebrow">Unified explorer</div>
          <h2 id="explorer-heading" className="section-title">Search everything on the shelf.</h2>
        </div>
        <span className="muted mono" style={{ fontSize: 11 }}>{results.length} of {catalog.length} entries</span>
      </div>
      <p className="hint" style={{ marginBottom: 16 }}>Fuzzy search across every phase resource, community, tool and book. Combine tags to narrow; your personal state on each resource stays on this device.</p>

      <div className="lx-toolbar">
        <div className="lx-search-row">
          <div className="lx-search">
            <SearchGlyph />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search resources, communities, tools, books…"
              aria-label="Search the library"
            />
          </div>
          <label className="sr-only" htmlFor="lx-sort">Sort results</label>
          <select id="lx-sort" className="lx-sort" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
            <option value="relevance">Sort · Relevance</option>
            <option value="name">Sort · Name A–Z</option>
            <option value="rating">Sort · Rating high → low</option>
          </select>
        </div>
        <div className="lx-filters" role="group" aria-label="Filter by tags">
          {allTags.map(([tag, count]) => (
            <button
              key={tag}
              type="button"
              className={`lx-tag ${activeTags.includes(tag) ? "active" : ""}`}
              aria-pressed={activeTags.includes(tag)}
              onClick={() => toggleTag(tag)}
            >
              {tag} <span aria-hidden="true">{count}</span>
            </button>
          ))}
          {activeTags.length > 0 && (
            <button type="button" className="quiet-link" onClick={() => setActiveTags([])}>Clear filters</button>
          )}
        </div>
      </div>

      <div className="lx-grid" role="list" aria-label="Library results">
        {visible.map((entry) => {
          const personal = entry.kind === "resource" ? resourceStates?.[entry.id] : undefined;
          return (
            <article className="lx-card" role="listitem" key={entry.id} aria-label={entry.name}>
              <div className="lx-card-reveal" aria-hidden="true" />
              <div className="lx-card-body">
                <div className="lx-card-topline">
                  <span className="resource-guidance">{entry.kind} · {entry.tier}</span>
                  {entry.rating !== undefined && (
                    <span className="resource-rating" aria-label={`${entry.rating} out of 5 rating`}>
                      {"●".repeat(entry.rating)}<span className="muted">{"·".repeat(5 - entry.rating)}</span>
                    </span>
                  )}
                </div>
                <h3 className="lx-card-title">
                  {entry.url ? (
                    <a href={entry.url} target="_blank" rel="noreferrer">{entry.name} <ExternalLink size={11} style={{ verticalAlign: "middle" }} aria-hidden="true" /></a>
                  ) : (
                    entry.name
                  )}
                </h3>
                <p className="lx-card-copy">{entry.description}</p>
                <div className="lx-card-meta">
                  {entry.phase && <span>{entry.phase}</span>}
                  <span>{entry.tier}</span>
                </div>
                <div className="lx-tags">
                  {entry.tags.map((tag) => <span className="lx-tag-chip" key={tag}>{tag}</span>)}
                </div>
                {entry.kind === "resource" && (
                  <div className="lx-status">
                    <label className="sr-only" htmlFor={`lx-state-${entry.id}`}>Your state for {entry.name}</label>
                    <select
                      id={`lx-state-${entry.id}`}
                      value={personal?.status ?? "saved"}
                      className={personal?.status === "completed" ? "is-completed" : ""}
                      onChange={(event) => setResourceState(entry.id, event.target.value as "saved" | "active" | "completed" | "paused", personal?.note)}
                    >
                      <option value="saved">Saved</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {results.length === 0 && (
        <div className="lx-empty" role="status">
          <svg width="72" height="52" viewBox="0 0 72 52" aria-hidden="true">
            <path d="M14 34 C14 20, 26 12, 38 14 C52 16, 60 24, 58 34 C57 42, 48 46, 36 45 C24 44, 14 42, 14 34 Z" fill="none" stroke="var(--rule-strong)" strokeWidth="1.5" />
            <circle cx="29" cy="28" r="2" fill="var(--faint)" />
            <circle cx="44" cy="27" r="2" fill="var(--faint)" />
            <path d="M30 37 C34 34, 40 34, 43 36" fill="none" stroke="var(--faint)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div>
            <strong>No results found.</strong>
            <p className="hint">Nothing on the shelf matches “{query}”{activeTags.length ? " with those filters" : ""}. Try a shorter word or clear the filters.</p>
          </div>
          <button className="button-secondary" type="button" onClick={() => { setQuery(""); setActiveTags([]); }}>
            <SearchX size={14} /> Reset search
          </button>
        </div>
      )}

      {hasMore && <div className="lx-sentinel" ref={sentinelRef} aria-hidden="true" />}
      {hasMore && <p className="hint" style={{ textAlign: "center" }}>Loading more of {results.length - visibleCount} remaining…</p>}
    </section>
  );
}

function SearchGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}
