"use client";

import { useState } from "react";

/**
 * RESEARCH HISTORY — the chat panel pattern from the gallery kit, made
 * local-first real: tabs over your recent queries and saved sources, both
 * persisted in this browser (localStorage — nothing leaves the device).
 * Picking an entry re-runs it. The composer at the bottom filters.
 */

export interface HistoryEntry {
  query: string;
  at: string;
  deep: boolean;
}

export interface SavedSource {
  name: string;
  domain: string;
  href: string;
}

function Entry({
  label,
  sub,
  time,
  body,
  onClick,
  resolving,
}: {
  label: string;
  sub: string;
  time: string;
  body: string;
  onClick?: () => void;
  resolving?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-1.5 rounded-[6px] px-1.5 py-2 text-left transition-colors duration-100 hover:bg-hover"
      style={{
        animation: "fade-up 400ms cubic-bezier(0.23,1,0.32,1) both",
        opacity: resolving ? 0.55 : 1,
      }}
    >
      <span className="flex items-center gap-1 text-[12px] leading-[1.3]">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-ink-2">{sub}</span>
        <span className="text-ink">· {time}</span>
      </span>
      <span className="line-clamp-2 text-[13px] leading-normal text-ink-2">{body}</span>
    </button>
  );
}

export function ResearchHistory({
  queries,
  sources,
  onPick,
}: {
  queries: HistoryEntry[];
  sources: SavedSource[];
  onPick: (query: string, deep: boolean) => void;
}) {
  const [tab, setTab] = useState<"Queries" | "Sources">("Queries");
  const [filter, setFilter] = useState("");

  const visibleQueries = queries.filter((entry) => entry.query.toLowerCase().includes(filter.toLowerCase()));
  const visibleSources = sources.filter(
    (source) => source.name.toLowerCase().includes(filter.toLowerCase()) || source.domain.includes(filter.toLowerCase()),
  );

  return (
    <div className="flex h-[300px] w-full max-w-95 flex-col self-start overflow-hidden rounded-[14px] bg-surface shadow-card">
      {/* header — tabs */}
      <div className="flex shrink-0 items-center justify-between border-b border-line p-1.5">
        <div className="flex items-center">
          {(["Queries", "Sources"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={tab === item}
              onClick={() => setTab(item)}
              className={`rounded-[6px] px-2 py-[3px] text-[13px] text-ink transition-[background-color,opacity] duration-100 ${tab === item ? "bg-field" : "opacity-50 hover:opacity-75"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <span className="pr-1 text-[11px] text-ink-3 tabular-nums">
          {tab === "Queries" ? visibleQueries.length : visibleSources.length} local
        </span>
      </div>

      {/* list */}
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 pt-1.5 pb-1" data-lenis-prevent>
        {tab === "Queries" ? (
          visibleQueries.length > 0 ? (
            visibleQueries.slice(0, 12).map((entry) => (
              <Entry
                key={entry.at + entry.query}
                label={entry.deep ? "Deep search" : "Search"}
                sub=""
                time={entry.at}
                body={entry.query}
                onClick={() => onPick(entry.query, entry.deep)}
              />
            ))
          ) : (
            <p className="px-2 py-6 text-center text-[12.5px] text-ink-3">Your searches land here — kept on this device only.</p>
          )
        ) : visibleSources.length > 0 ? (
          visibleSources.slice(0, 12).map((source) => (
            <a
              key={source.href}
              href={source.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-[6px] px-1.5 py-2 text-[12.5px] text-ink transition-colors duration-100 hover:bg-hover"
            >
              <span className="flex size-4 shrink-0 items-center justify-center rounded-[4px] bg-accent text-[8px] font-bold text-canvas">
                {source.domain.slice(0, 1).toUpperCase()}
              </span>
              <span className="animated-underline min-w-0 flex-1 truncate">{source.name}</span>
              <span className="ml-auto shrink-0 font-mono text-[10.5px] text-ink-3">{source.domain}</span>
            </a>
          ))
        ) : (
          <p className="px-2 py-6 text-center text-[12.5px] text-ink-3">Sources you save from answers appear here.</p>
        )}
      </div>

      {/* filter */}
      <div className="mt-auto shrink-0 p-1.5">
        <div className="flex cursor-text flex-col rounded-control border border-line bg-field p-2 transition-[border-color] duration-150 focus-within:border-line-strong">
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder={`Filter ${tab.toLowerCase()}…`}
            aria-label={`Filter ${tab.toLowerCase()}`}
            className="min-h-4.5 bg-transparent text-[13px] leading-[1.4] text-ink outline-none placeholder:text-ink-3"
          />
        </div>
      </div>
    </div>
  );
}
