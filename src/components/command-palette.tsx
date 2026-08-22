"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Fuse, { type IFuseOptions } from "fuse.js";
import { model } from "@/data";
import { buildPaletteIndex } from "@/state/palette";
import { useMeridianStore } from "@/state/store";
import { ModalPortal } from "./modal-portal";

/**
 * Command palette with Fuse.js fuzzy search (directive §6): typo-tolerant
 * matching over every session, curriculum item, resource, route and command,
 * with the original keyboard contract intact (↑↓ · Enter · Esc).
 */

const fuseOptions: IFuseOptions<{ id: string; label: string; group: string; href: string }> = {
  keys: [
    { name: "label", weight: 0.75 },
    { name: "group", weight: 0.25 },
  ],
  threshold: 0.38,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

export function CommandPalette() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const sessions = useMeridianStore((state) => state.sessions);
  const sessionAttempts = useMeridianStore((state) => state.sessionAttempts);
  const hydrated = useMeridianStore((state) => state.hydrated);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const index = useMemo(
    () => buildPaletteIndex(model, { sessions, sessionAttempts }),
    [sessions, sessionAttempts],
  );
  const fuse = useMemo(() => new Fuse(index, fuseOptions), [index]);

  const results = useMemo(() => {
    if (!query.trim()) return index.filter((item) => item.group === "Command" || item.group === "Routes" || item.group === "Action").slice(0, 12);
    return fuse.search(query.trim(), { limit: 24 }).map((hit) => hit.item);
  }, [fuse, index, query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        setQuery("");
        setCursor(0);
      }
      if (!open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCursor((value) => Math.min(value + 1, results.length - 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setCursor((value) => Math.max(value - 1, 0));
      }
      if (event.key === "Enter" && results[cursor]) {
        event.preventDefault();
        router.push(results[cursor].href);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cursor, open, results, router]);

  useEffect(() => {
    if (open) window.setTimeout(() => input.current?.focus(), 0);
  }, [open]);

  if (!hydrated || !open) return null;
  return (
    <ModalPortal onClose={() => setOpen(false)} labelledBy="command-palette-title" className="palette-modal">
      <div className="command-palette">
        <h2 id="command-palette-title" className="sr-only">Command palette</h2>
        <input
          ref={input}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
          }}
          placeholder="Search sessions, curriculum, resources…"
          aria-label="Search Meridian"
          aria-controls="palette-results-list"
        />
        <div className="palette-results" id="palette-results-list" role="listbox" aria-label="Search results" data-lenis-prevent>
          {results.length ? (
            results.map((result, index) => (
              <button
                className={index === cursor ? "palette-result active" : "palette-result"}
                type="button"
                role="option"
                aria-selected={index === cursor}
                key={`${result.group}:${result.id}`}
                onMouseEnter={() => setCursor(index)}
                onClick={() => {
                  router.push(result.href);
                  setOpen(false);
                }}
              >
                <span>{result.label}</span>
                <small>{result.group}</small>
              </button>
            ))
          ) : (
            <p className="empty-state">No matching result.</p>
          )}
        </div>
        <div className="palette-footer">↑↓ move · Enter open · Esc close</div>
      </div>
    </ModalPortal>
  );
}
