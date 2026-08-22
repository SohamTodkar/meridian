"use client";

import { useState, type FormEvent } from "react";

export function SearchGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

export interface SearchBarProps {
  onSearch: (query: string, deep: boolean) => void;
  disabled?: boolean;
  busy?: boolean;
}

export function SearchBar({ onSearch, disabled, busy }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [deep, setDeep] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length >= 2) onSearch(trimmed, deep);
  }

  return (
    <form className="research-bar" onSubmit={submit} role="search">
      <div className="research-query">
        <SearchGlyph />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask the web something worth verifying…"
          aria-label="Research query"
          disabled={disabled}
          minLength={2}
          maxLength={400}
        />
      </div>
      <label className="research-toggle" title="Run Exa search and Firecrawl extraction in one pass">
        <input type="checkbox" checked={deep} onChange={(event) => setDeep(event.target.checked)} />
        Deep search
      </label>
      <button className="button-primary" type="submit" disabled={disabled || busy || query.trim().length < 2}>
        {busy ? "Searching…" : deep ? "Deep search" : "Search"}
      </button>
    </form>
  );
}
