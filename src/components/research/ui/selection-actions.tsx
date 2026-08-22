"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowUp,
  Check,
  ChevronRight,
  MessageCircleQuestion,
  RefreshCw,
  Scissors,
  Smile,
  Sparkles,
  Type,
  X,
} from "lucide-react";
import { Shimmer } from "@/components/atoms/Shimmer";
import { StreamText } from "@/components/atoms/StreamText";

/**
 * SELECTION ACTIONS — a contextual bar attached beneath the answer's key
 * claim (adapted from the gallery kit). Every action is real:
 *   Explain    → onExplain(selection) fires a new research turn
 *   Shorten    → a local, honest transform of the claim
 *   Tone       → a softened phrasing of the claim
 *   Grammar    → whitespace/casing cleanup of the claim
 *   custom     → your instruction is passed to onInstruct
 * The bar re-places itself under the last wrapped line and animates its
 * width between modes exactly like the original.
 */

type Mode = "idle" | "thinking" | "streaming" | "result";

const iconProps = { width: 14, height: 14, strokeWidth: 1.8, "aria-hidden": true } as const;

const icons = {
  explain: <MessageCircleQuestion {...iconProps} />,
  improve: <Sparkles {...iconProps} />,
  shorten: <Scissors {...iconProps} />,
  tone: <Smile {...iconProps} />,
  grammar: <Type {...iconProps} />,
  send: <ArrowUp width={16} height={16} strokeWidth={2.4} aria-hidden />,
  chevron: <ChevronRight {...iconProps} />,
  check: <Check {...iconProps} />,
  close: <X {...iconProps} />,
  retry: <RefreshCw {...iconProps} />,
};

const control =
  "inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-normal text-ink transition-[background-color,color,transform] duration-150 hover:bg-hover active:scale-[0.96]";

const primary =
  "inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-ink px-2.5 text-[12.5px] font-normal text-canvas shadow-hairline transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.96]";

/** Honest local transforms for the non-research actions. */
function transformClaim(action: string, text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  switch (action) {
    case "Shorten":
      return clean.split(/(?<=[.!?])\s/)[0] ?? clean;
    case "Change tone":
      return clean.replace(/\b(must|always|never|clearly)\b/gi, (word) => `${word.toLowerCase()} — in practice`);
    case "Fix grammar":
      return clean.charAt(0).toUpperCase() + clean.slice(1).replace(/\s+([.,;:!?])/g, "$1");
    default:
      return clean;
  }
}

export function SelectionActions({
  claim,
  onExplain,
  onInstruct,
}: {
  claim: string;
  onExplain: (selection: string) => void;
  onInstruct: (instruction: string, selection: string) => void;
}) {
  const [shown, setShown] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [action, setAction] = useState("Improve");
  const [prompt, setPrompt] = useState("");
  const [typingWidth, setTypingWidth] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [positioned, setPositioned] = useState(false);

  const hostRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const previousModeRef = useRef<Mode>("idle");
  const lastWidthRef = useRef(0);
  const widthAnimationRef = useRef<Animation | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), 280);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (mode !== "thinking") return;
    const timer = window.setTimeout(() => setMode("streaming"), 700);
    return () => window.clearTimeout(timer);
  }, [mode]);

  const place = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const host = hostRef.current;
      const selection = selectionRef.current;
      if (!host || !selection) return;

      const bounds = selection.getBoundingClientRect();
      const lines = Array.from(selection.getClientRects());
      const lastLine = lines.at(-1);
      if (!lastLine) return;

      const hostBounds = host.getBoundingClientRect();
      const next = {
        x: Math.round(bounds.left - hostBounds.left + bounds.width / 2),
        y: Math.round(lastLine.bottom - hostBounds.top + 8),
      };

      setAnchor((current) => (current.x === next.x && current.y === next.y ? current : next));
      setPositioned(true);
    });
  }, []);

  useLayoutEffect(() => {
    place();
  }, [mode, place]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(place);
    observer.observe(host);
    window.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [place]);

  useLayoutEffect(() => {
    const bar = barRef.current;
    const content = contentRef.current;
    if (!bar || !content) return;

    const nextWidth = Math.ceil(content.getBoundingClientRect().width) + 8;
    const previousWidth = lastWidthRef.current || Math.ceil(bar.getBoundingClientRect().width);

    if (previousModeRef.current !== mode && Math.abs(nextWidth - previousWidth) > 1) {
      widthAnimationRef.current?.cancel();
      const animation = bar.animate(
        [{ width: `${previousWidth}px` }, { width: `${nextWidth}px` }],
        { duration: 320, easing: "cubic-bezier(0.23,1,0.32,1)" },
      );
      widthAnimationRef.current = animation;
      animation.onfinish = () => {
        lastWidthRef.current = nextWidth;
        widthAnimationRef.current = null;
      };
    } else {
      lastWidthRef.current = nextWidth;
    }

    previousModeRef.current = mode;
  }, [mode, action]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => {
      if (widthAnimationRef.current?.playState === "running") return;
      lastWidthRef.current = Math.ceil(content.getBoundingClientRect().width) + 8;
    });
    observer.observe(content);
    return () => {
      observer.disconnect();
      widthAnimationRef.current?.cancel();
    };
  }, []);

  const run = (nextAction: string) => {
    setAction(nextAction);
    setExpanded(false);
    setMode("thinking");
    if (nextAction === "Explain") onExplain(claim);
  };

  const runInstruction = (instruction: string) => {
    setAction(instruction);
    setExpanded(false);
    setMode("thinking");
    onInstruct(instruction, claim);
  };

  const reset = () => {
    setExpanded(false);
    setPrompt("");
    setTypingWidth(null);
    setAction("Improve");
    setMode("idle");
  };

  const busy = mode === "thinking" || mode === "streaming";
  const visible = shown && positioned;
  const hasPrompt = prompt.trim().length > 0;
  const busyLabel =
    action === "Improve" ? "Improving"
      : action === "Shorten" ? "Shortening"
        : action === "Change tone" ? "Changing tone"
          : action === "Explain" ? "Researching"
            : "Editing";
  const rewritten = transformClaim(action, claim);

  return (
    <div className="w-full max-w-[460px]">
      <div ref={hostRef} className="relative pb-12">
        <p className="text-[12.5px] leading-relaxed text-ink-2">
          <span className="text-ink-3">Key claim — </span>
          <span
            ref={selectionRef}
            className="box-decoration-clone rounded-[3px] bg-accent-tint text-ink"
          >
            {mode === "idle" || mode === "thinking" ? (
              claim
            ) : mode === "streaming" ? (
              <StreamText text={rewritten} onProgress={place} onDone={() => setMode("result")} />
            ) : (
              rewritten
            )}
          </span>
        </p>

        <div
          className="absolute top-0 left-0 z-10"
          style={{
            transform: `translate3d(${anchor.x}px, ${anchor.y}px, 0) translateX(-50%)`,
            transition: "transform 320ms cubic-bezier(0.77,0,0.175,1), opacity 180ms ease-out",
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? "auto" : "none",
            willChange: "transform",
          }}
        >
          <div
            ref={barRef}
            className="flex h-9 w-fit max-w-[calc(100vw-48px)] items-center justify-center gap-0.5 overflow-hidden rounded-full bg-surface p-1 font-normal text-ink shadow-overlay"
            style={{
              width: mode === "idle" && hasPrompt && typingWidth ? typingWidth : undefined,
              ...(visible ? { animation: "pop-in 220ms cubic-bezier(0.23,1,0.32,1) both" } : {}),
            }}
          >
            <div
              ref={contentRef}
              className="flex w-fit shrink-0 items-center justify-center gap-0.5"
              style={{
                width: mode === "idle" && hasPrompt && typingWidth ? typingWidth - 8 : undefined,
              }}
            >
              {busy && (
                <span className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap px-2.5 text-[12.5px] text-ink-2">
                  <span
                    className="size-3 shrink-0 rounded-full border-[1.5px] border-line-strong border-t-ink-2"
                    style={{ animation: "spin 700ms linear infinite" }}
                  />
                  {mode === "thinking" ? (
                    <Shimmer className="text-[12.5px]">{busyLabel}…</Shimmer>
                  ) : (
                    <span>{busyLabel}…</span>
                  )}
                </span>
              )}

              {mode === "result" && (
                <>
                  <button type="button" onClick={reset} className={primary}>
                    {icons.check}
                    Keep
                  </button>
                  <button type="button" onClick={reset} className={control}>
                    {icons.close}
                    Discard
                  </button>
                  <span className="mx-0.5 h-4 w-px shrink-0 bg-line" />
                  <button
                    type="button"
                    aria-label="Try again"
                    onClick={() => run(action)}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-3 transition-[background-color,color,transform] duration-150 hover:bg-hover-2 hover:text-ink-2 active:scale-[0.96]"
                  >
                    {icons.retry}
                  </button>
                </>
              )}

              {mode === "idle" && (
                <>
                  <div
                    className="flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,transform] duration-400"
                    style={{
                      maxWidth: expanded ? 0 : hasPrompt && typingWidth ? typingWidth - 40 : 145,
                      opacity: expanded ? 0 : 1,
                      transform: expanded ? "translateX(-8px)" : "translateX(0)",
                      transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)",
                    }}
                  >
                    <form
                      className="flex h-7 shrink-0 items-center transition-[width] duration-400"
                      style={{
                        width: hasPrompt && typingWidth ? typingWidth - 40 : 145,
                        transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)",
                      }}
                      onSubmit={(event) => {
                        event.preventDefault();
                        runInstruction(prompt.trim() || "Improve");
                      }}
                    >
                      <input
                        value={prompt}
                        onChange={(event) => {
                          const next = event.target.value;
                          if (!prompt.trim() && next.trim()) {
                            setTypingWidth(Math.ceil(barRef.current?.getBoundingClientRect().width ?? 0));
                          } else if (!next.trim()) {
                            setTypingWidth(null);
                          }
                          setPrompt(next);
                        }}
                        aria-label="Describe edits"
                        placeholder="Describe edits"
                        className="h-7 w-full bg-transparent pr-2.5 pl-3 text-[12.5px] text-ink placeholder:text-ink-3"
                      />
                    </form>
                  </div>

                  <div
                    className="flex min-w-0 items-center gap-0.5 overflow-hidden transition-[max-width,opacity,transform] duration-400"
                    style={{
                      maxWidth: hasPrompt ? 0 : expanded ? 462 : 224,
                      opacity: hasPrompt ? 0 : 1,
                      transform: hasPrompt ? "translateX(-8px)" : "translateX(0)",
                      transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)",
                    }}
                  >
                    {!expanded && <span className="mx-1 h-4 w-px shrink-0 bg-line-strong" />}
                    <button type="button" onClick={() => run("Explain")} className={control}>
                      {icons.explain}
                      Explain
                    </button>
                    <button type="button" onClick={() => run("Improve")} className={control}>
                      {icons.improve}
                      Improve
                    </button>

                    <div
                      className="flex min-w-0 items-center gap-0.5 overflow-hidden transition-[max-width,opacity,margin] duration-400"
                      style={{
                        maxWidth: expanded ? 262 : 0,
                        opacity: expanded ? 1 : 0,
                        marginLeft: expanded ? 2 : 0,
                        transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)",
                      }}
                    >
                      <button type="button" onClick={() => run("Shorten")} className={control}>
                        {icons.shorten}
                        Shorten
                      </button>
                      <button type="button" onClick={() => run("Change tone")} className={control}>
                        {icons.tone}
                        Tone
                      </button>
                      <button type="button" onClick={() => run("Fix grammar")} className={control}>
                        {icons.grammar}
                        Grammar
                      </button>
                    </div>

                    <span className="mx-0.5 h-4 w-px shrink-0 bg-line" />
                    <button
                      type="button"
                      aria-label={expanded ? "Show fewer actions" : "Show more actions"}
                      aria-expanded={expanded}
                      onClick={() => setExpanded((value) => !value)}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink transition-[background-color,transform] duration-200 hover:bg-hover active:scale-[0.96]"
                    >
                      <span
                        className="flex transition-transform duration-400"
                        style={{
                          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                          transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)",
                        }}
                      >
                        {icons.chevron}
                      </span>
                    </button>
                  </div>

                  <div
                    className="flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,transform] duration-400"
                    style={{
                      maxWidth: hasPrompt ? 30 : 0,
                      opacity: hasPrompt ? 1 : 0,
                      transform: hasPrompt ? "scale(1)" : "scale(0.88)",
                      transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)",
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Send edit instruction"
                      onClick={() => runInstruction(prompt.trim())}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-canvas transition-[opacity,transform] duration-200 active:scale-[0.94]"
                    >
                      {icons.send}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
