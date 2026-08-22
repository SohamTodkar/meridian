"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * PROMPT BAR — the research composer (adapted from the gallery kit).
 * Real controls, no demo autoplay: @ to attach research sources, / for
 * commands, a depth picker (standard vs. deep) that fires a sweep across
 * the composer when deep mode is armed, dictation through the Web Speech
 * API when the browser offers it, and a send that starts a real turn.
 */

function Icon({ children, size = 15, strokeWidth = 1.8 }: { children: React.ReactNode; size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const GLYPHS: Record<string, React.ReactNode> = {
  globe: <g><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></g>,
  flame: <path d="M12 2c1 4-4 6-4 10a4 4 0 0 0 8 0c0-2-1-3-1-3s3 1 3 5a7 7 0 1 1-14 0C4 8 10 6 12 2z" />,
  book: <g><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></g>,
  file: <g><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></g>,
};

type Source = { key: string; name: string; desc: string; glyph: string };

const SOURCES: Source[] = [
  { key: "web", name: "Web search", desc: "Exa neural discovery", glyph: "globe" },
  { key: "extract", name: "Firecrawl extraction", desc: "Read sources as markdown", glyph: "flame" },
  { key: "library", name: "Library shelf", desc: "Your curated resources", glyph: "book" },
  { key: "journal", name: "Journal notes", desc: "Your local record", glyph: "file" },
];

const COMMANDS = [
  { key: "deep", name: "/deep", desc: "Search + extract in one pass" },
  { key: "standard", name: "/standard", desc: "Fast discovery only" },
  { key: "cite", name: "/cite", desc: "Inline source citations" },
  { key: "summarize", name: "/summarize", desc: "Tighten the answer" },
];

const DEPTHS = [
  { key: "standard", name: "Standard", tag: "Fast" },
  { key: "deep", name: "Deep search", tag: "5× extract" },
];

function parseToken(draft: string): { kind: "at" | "slash"; query: string; start: number } | null {
  const match = /(^|\s)([@/])([\w-]*)$/.exec(draft);
  if (!match) return null;
  return {
    kind: match[2] === "@" ? "at" : "slash",
    query: match[3].toLowerCase(),
    start: match.index + match[1].length,
  };
}

/** Minimal structural types for the Web Speech API (not in lib.dom for all targets). */
interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function PromptBar({
  busy,
  placeholder = "Ask the web something worth verifying…",
  onSend,
}: {
  busy?: boolean;
  placeholder?: string;
  onSend: (text: string, deep: boolean) => void;
}) {
  const [draft, setDraft] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [depthOpen, setDepthOpen] = useState(false);
  const [depth, setDepth] = useState(DEPTHS[0]);
  const [sweep, setSweep] = useState(false);
  const [active, setActive] = useState(0);
  const [engaged, setEngaged] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [rowBox, setRowBox] = useState<{ top: number; height: number } | null>(null);
  const [depthBox, setDepthBox] = useState<{ top: number; height: number } | null>(null);
  const [depthHovered, setDepthHovered] = useState<number | null>(null);
  const [depthMenuLeft, setDepthMenuLeft] = useState(0);
  const [depthMenuBottom, setDepthMenuBottom] = useState(0);
  const [listening, setListening] = useState(false);

  const composerAnchorRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const depthRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const depthRowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const token = dismissed ? null : parseToken(draft);
  const menu: "at" | "slash" | null = plusOpen ? "at" : token?.kind ?? null;
  const query = plusOpen ? "" : token?.query ?? "";

  const rows: { key: string; name: string; desc: string }[] =
    menu === "at"
      ? SOURCES.filter((source) => source.name.toLowerCase().includes(query))
      : menu === "slash"
        ? COMMANDS.filter((command) => command.name.slice(1).startsWith(query))
        : [];

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setActive(0);
      setEngaged(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [menu, query]);

  useLayoutEffect(() => {
    const target = rowRefs.current[active];
    if (target) setRowBox({ top: target.offsetTop, height: target.offsetHeight });
  }, [menu, query, active, rows.length]);

  const depthIndex = DEPTHS.findIndex((entry) => entry.key === depth.key);
  useLayoutEffect(() => {
    if (!depthOpen) return;
    const target = depthRowRefs.current[depthHovered ?? depthIndex];
    if (target) setDepthBox({ top: target.offsetTop, height: target.offsetHeight });
  }, [depthOpen, depthHovered, depthIndex]);

  useLayoutEffect(() => {
    if (!depthOpen || !composerAnchorRef.current || !depthRef.current) return;
    const anchorRect = composerAnchorRef.current.getBoundingClientRect();
    const triggerRect = depthRef.current.getBoundingClientRect();
    setDepthMenuLeft(Math.max(0, Math.min(triggerRect.left - anchorRect.left, anchorRect.width - 176)));
    setDepthMenuBottom(anchorRect.bottom - triggerRect.top + 8);
  }, [depthOpen, expanded, depth.name]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDepthHovered(null));
    return () => cancelAnimationFrame(frame);
  }, [depthOpen]);

  const armSweep = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setSweep(true);
    window.setTimeout(() => setSweep(false), 700);
  };

  const selectDepth = (next: (typeof DEPTHS)[number]) => {
    const wasStandard = depth.key === "standard";
    setDepth(next);
    setDepthOpen(false);
    if (wasStandard && next.key === "deep") armSweep();
  };

  /* Dictation via the Web Speech API where it exists. */
  useEffect(() => {
    if (!listening) return;
    const speechWindow = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecognitionCtor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      const timer = window.setTimeout(() => setListening(false), 0);
      return () => window.clearTimeout(timer);
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setDraft((current) => (current ? `${current.trimEnd()} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.start();
    return () => recognition.stop();
  }, [listening]);

  /* Grow the textarea with wrapped content, controls on their own row. */
  useLayoutEffect(() => {
    const input = inputRef.current;
    const controls = controlsRef.current;
    const measure = measureRef.current;
    const depthButton = depthRef.current;
    if (!input || !controls || !measure || !depthButton) return;

    const fixedControlsWidth = 28 * 3 + depthButton.offsetWidth;
    const inlineGaps = 4 * 4;
    const inlineInputWidth = controls.clientWidth - fixedControlsWidth - inlineGaps;
    const needsFullWidth = draft.includes("\n") || measure.offsetWidth + 8 > inlineInputWidth;
    if (needsFullWidth !== expanded) setExpanded(needsFullWidth);

    input.style.height = "0px";
    const contentHeight = input.scrollHeight;
    input.style.height = `${Math.min(Math.max(contentHeight, 28), 120)}px`;
    input.style.overflowY = contentHeight > 120 ? "auto" : "hidden";
  }, [draft, expanded]);

  useEffect(() => {
    if (!depthOpen && !plusOpen) return;
    const close = (event: PointerEvent) => {
      if (!(event.target as Element).closest("[data-promptbar]")) {
        setDepthOpen(false);
        setPlusOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [depthOpen, plusOpen]);

  const pick = (row: { key: string; name: string }) => {
    if (menu === "slash") {
      if (row.key === "deep") selectDepth(DEPTHS[1]);
      else if (row.key === "standard") selectDepth(DEPTHS[0]);
      else setDraft(`${token ? draft.slice(0, token.start) : draft}${row.name} `);
    } else {
      setDraft(`${token ? draft.slice(0, token.start) : draft}@${row.name} `);
    }
    setPlusOpen(false);
    setDismissed(false);
    inputRef.current?.focus();
  };

  const canSend = draft.trim().length > 0 && !busy;
  const send = () => {
    if (!canSend) return;
    onSend(draft.trim(), depth.key === "deep");
    setDraft("");
    setExpanded(false);
    setPlusOpen(false);
    setDepthOpen(false);
  };

  return (
    <div data-promptbar className="w-full">
      <div ref={composerAnchorRef} className="relative">
        {/* @ / slash menu */}
        {menu && (
          <div
            onMouseLeave={() => setEngaged(false)}
            className="absolute inset-x-0 bottom-full z-30 mb-2 rounded-[10px] p-1 shadow-raised"
            style={{
              backgroundColor: "#0e1012",
              border: "1px solid var(--color-line-strong)",
              boxShadow: "0 12px 32px rgba(0,0,0,.55), 0 2px 8px rgba(0,0,0,.4)",
              animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both",
              transformOrigin: "bottom center",
            }}
            data-lenis-prevent
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-1 rounded-[6px] bg-hover"
              style={{
                top: rowBox?.top ?? 0,
                height: rowBox?.height ?? 0,
                opacity: rowBox && engaged && rows.length > 0 ? 1 : 0,
                transition: "top 220ms cubic-bezier(0.23,1,0.32,1), height 220ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease",
              }}
            />
            {rows.map((row, i) => {
              const source = menu === "at" ? SOURCES.find((entry) => entry.key === row.key) : undefined;
              return (
                <button
                  key={row.key}
                  type="button"
                  ref={(el) => {
                    rowRefs.current[i] = el;
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => {
                    setActive(i);
                    setEngaged(true);
                  }}
                  onClick={() => pick(row)}
                  className="relative z-10 flex h-9 w-full items-center gap-2.5 rounded-[6px] px-2 text-left"
                >
                  {source && (
                    <span className="flex size-5.5 shrink-0 items-center justify-center text-ink-2">
                      <Icon size={15}>{GLYPHS[source.glyph]}</Icon>
                    </span>
                  )}
                  <span className="shrink-0 text-[12.5px] font-medium text-ink">{row.name}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-ink-3">{row.desc}</span>
                </button>
              );
            })}
            {rows.length === 0 && (
              <div className="flex h-9 items-center px-2 text-[12px] text-ink-3">No matches for “{query}”</div>
            )}
            <div className="mt-1 border-t border-line px-2 pt-1.5 pb-1 text-[11px] text-ink-3">
              {menu === "at" ? "Type to search sources" : "Type to search commands"}
            </div>
          </div>
        )}

        {/* depth menu */}
        {depthOpen && (
          <div
            onMouseLeave={() => setDepthHovered(null)}
            className="absolute z-30 w-44 rounded-[10px] p-1 shadow-raised"
            style={{
              left: depthMenuLeft,
              bottom: depthMenuBottom,
              backgroundColor: "#0e1012",
              border: "1px solid var(--color-line-strong)",
              boxShadow: "0 12px 32px rgba(0,0,0,.55), 0 2px 8px rgba(0,0,0,.4)",
              animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both",
              transformOrigin: "bottom left",
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-1 rounded-[6px] bg-hover"
              style={{
                top: depthBox?.top ?? 0,
                height: depthBox?.height ?? 0,
                opacity: depthBox && depthHovered !== null ? 1 : 0,
                transition: "top 220ms cubic-bezier(0.23,1,0.32,1), height 220ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease",
              }}
            />
            {DEPTHS.map((entry, i) => (
              <button
                key={entry.key}
                type="button"
                ref={(el) => {
                  depthRowRefs.current[i] = el;
                }}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setDepthHovered(i)}
                onClick={() => {
                  selectDepth(entry);
                  inputRef.current?.focus();
                }}
                className="relative z-10 flex h-7.5 w-full items-center gap-2 rounded-[6px] px-2 text-left"
              >
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">{entry.name}</span>
                <span className="shrink-0 text-[11px] text-ink-3">{entry.tag}</span>
                <span className={`shrink-0 text-ink ${entry.key === depth.key ? "" : "invisible"}`}>
                  <Icon size={13} strokeWidth={2.5}><path d="M20 6L9 17l-5-5" /></Icon>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* composer */}
        <div
          className={`relative isolate flex flex-col overflow-hidden border border-line bg-surface shadow-card transition-[border-color] duration-150 focus-within:border-line-strong ${
            expanded ? "gap-2.5 p-3.5 rounded-[22px]" : "gap-1.5 p-1.5 rounded-[14px]"
          }`}
        >
          {/* sweep band — fires when deep mode is armed */}
          {sweep && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/2"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(163,184,173,0.22), rgba(201,154,91,0.18), transparent)",
                animation: "sweep-x 640ms cubic-bezier(0.16,1,0.3,1) both",
              }}
            />
          )}
          <span
            ref={measureRef}
            aria-hidden="true"
            className="pointer-events-none absolute invisible whitespace-pre text-[13px] leading-[18px]"
          >
            {draft}
          </span>

          <div
            ref={controlsRef}
            className={`grid items-end gap-x-1 gap-y-1.5 ${
              expanded
                ? "grid-cols-[28px_auto_minmax(0,1fr)_28px_28px]"
                : "grid-cols-[28px_minmax(0,1fr)_auto_28px_28px]"
            }`}
          >
            <button
              type="button"
              aria-label="Add research sources"
              aria-expanded={plusOpen}
              onClick={() => {
                setDepthOpen(false);
                setPlusOpen((current) => !current);
                inputRef.current?.focus();
              }}
              className={`flex size-7 shrink-0 items-center justify-center justify-self-start rounded-[8px] text-ink-3 transition-[background-color,color,transform] duration-150 hover:bg-hover hover:text-ink active:scale-[0.94] ${plusOpen ? "bg-hover text-ink" : ""} ${expanded ? "col-start-1 row-start-2" : "col-start-1 row-start-1"}`}
            >
              <Icon size={16} strokeWidth={2}><path d="M12 5v14M5 12h14" /></Icon>
            </button>

            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setDismissed(false);
                setPlusOpen(false);
              }}
              onKeyDown={(event) => {
                if (menu && rows.length > 0) {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    setEngaged(true);
                    setActive((current) => (current + (event.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length);
                    return;
                  }
                  if ((event.key === "Enter" && !event.shiftKey) || event.key === "Tab") {
                    event.preventDefault();
                    pick(rows[active]);
                    return;
                  }
                }
                if (event.key === "Escape") {
                  setDismissed(true);
                  setPlusOpen(false);
                  setDepthOpen(false);
                  return;
                }
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder={listening ? "Listening…" : placeholder}
              aria-label="Research prompt"
              className={`min-w-0 w-full resize-none bg-transparent px-1 py-[5px] text-[13px] leading-[18px] text-ink outline-none [overflow-wrap:anywhere] placeholder:text-ink-3 ${expanded ? "col-span-full col-start-1 row-start-1 min-h-14 px-2 py-2 text-[14px] leading-5" : "col-start-2 row-start-1 min-h-7"}`}
            />

            {/* depth picker */}
            <button
              ref={depthRef}
              type="button"
              aria-expanded={depthOpen}
              aria-label="Choose search depth"
              onClick={() => {
                setPlusOpen(false);
                setDepthOpen((current) => !current);
              }}
              className={`flex h-7 shrink-0 items-center gap-1 rounded-[8px] px-1.5 text-[12px] font-medium text-ink-2 transition-colors duration-150 hover:bg-hover hover:text-ink ${expanded ? "col-start-2 row-start-2 justify-self-start" : "col-start-3 row-start-1"}`}
            >
              {depth.name}
              <span className="text-ink-3">
                <Icon size={11} strokeWidth={2.4}><path d="M6 9l6 6 6-6" /></Icon>
              </span>
            </button>

            {/* dictation */}
            <button
              type="button"
              aria-label={listening ? "Stop dictation" : "Start dictation"}
              aria-pressed={listening}
              onClick={() => setListening((current) => !current)}
              className={`flex size-7 shrink-0 items-center justify-center rounded-[8px] transition-[background-color,color,transform] duration-150 active:scale-[0.94] ${listening ? "bg-accent-tint text-accent-ink" : "text-ink-3 hover:bg-hover hover:text-ink"} ${expanded ? "col-start-4 row-start-2" : "col-start-4 row-start-1"}`}
            >
              {listening ? (
                <span className="flex h-3.5 items-center gap-[2.5px]">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-[2.5px] rounded-full bg-current"
                      style={{ height: "100%", animation: `eq-bounce 900ms ease-in-out ${i * 150}ms infinite` }}
                    />
                  ))}
                </span>
              ) : (
                <Icon size={15} strokeWidth={2}><g><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" /></g></Icon>
              )}
            </button>

            {/* send */}
            <button
              type="button"
              aria-label="Send research prompt"
              disabled={!canSend}
              onClick={send}
              className={`flex size-7 shrink-0 items-center justify-center rounded-[8px] transition-[background-color,color,transform] duration-200 enabled:active:scale-[0.94] ${expanded ? "col-start-5 row-start-2" : "col-start-5 row-start-1"}`}
              style={{
                background: canSend ? "var(--color-ink)" : "var(--color-line-strong)",
                color: canSend ? "var(--color-canvas)" : "var(--color-ink-2)",
              }}
            >
              <Icon size={16} strokeWidth={2.4}><path d="M12 19V5M5 12l7-7 7 7" /></Icon>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
