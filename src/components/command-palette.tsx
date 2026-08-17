"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { model } from "@/data";
import { buildPaletteIndex, searchPalette } from "@/state/palette";
import { useMeridianStore } from "@/state/store";
import { ModalPortal } from "./modal-portal";

export function CommandPalette() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const state = useMeridianStore();
  const index = useMemo(() => buildPaletteIndex(model, state), [state]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const results = useMemo(() => searchPalette(index, query), [index, query]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); setQuery(""); }
      if (!open) return;
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
      if (event.key === "ArrowDown") { event.preventDefault(); setCursor((value) => Math.min(value + 1, results.length - 1)); }
      if (event.key === "ArrowUp") { event.preventDefault(); setCursor((value) => Math.max(value - 1, 0)); }
      if (event.key === "Enter" && results[cursor]) { event.preventDefault(); router.push(results[cursor].href); setOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cursor, open, results, router]);
  useEffect(() => { if (open) window.setTimeout(() => input.current?.focus(), 0); }, [open]);
  if (!open) return null;
  return <ModalPortal onClose={() => setOpen(false)} labelledBy="command-palette-title" className="palette-modal"><div className="command-palette">
    <h2 id="command-palette-title" className="sr-only">Command palette</h2>
    <input ref={input} value={query} onChange={(event) => { setQuery(event.target.value); setCursor(0); }} placeholder="Search sessions, curriculum, resources…" aria-label="Search Meridian" />
    <div className="palette-results">{results.length ? results.map((result, index) => <button className={index === cursor ? "palette-result active" : "palette-result"} type="button" key={`${result.group}:${result.id}`} onClick={() => { router.push(result.href); setOpen(false); }}><span>{result.label}</span><small>{result.group}</small></button>) : <p className="empty-state">No matching result.</p>}</div>
    <div className="palette-footer">↑↓ move · Enter open · Esc close</div>
  </div></ModalPortal>;
}
