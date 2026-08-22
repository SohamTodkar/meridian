"use client";

import { useEffect, useRef, useState } from "react";
import { StreamText } from "@/components/atoms/StreamText";

/**
 * STREAMING TEXT — the summary resolves word by word with the top source
 * cited inline, then the key points surface as a headed list, each point
 * carrying the chip of the source it came from (plus "+n" when other
 * sources corroborate it). Actions and follow-ups unlock once the whole
 * answer has landed.
 */

export type AnswerSource = {
  name: string;
  domain: string;
  href: string;
};

export type AnswerPoint = {
  text: string;
  source: AnswerSource;
  more?: number;
};

const SourceChip = ({ source, more, subtle = false }: { source: AnswerSource; more?: number; subtle?: boolean }) => (
  <a
    href={source.href}
    target="_blank"
    rel="noreferrer"
    className={`inline-flex h-4.5 translate-y-[-1px] items-center gap-1 rounded-[5px] bg-inset px-[3px] align-middle font-mono text-[10.5px] shadow-hairline transition-colors duration-150 hover:bg-hover ${
      subtle ? "text-ink-3 hover:text-ink-2" : "text-ink-2 hover:text-ink"
    }`}
  >
    <span className="flex size-3 items-center justify-center rounded-[3px] bg-accent text-[7px] font-bold text-canvas">
      {source.domain.slice(0, 1).toUpperCase()}
    </span>
    <span>{source.domain}</span>
    {more ? <span className="text-ink-3">+{more}</span> : null}
  </a>
);

export function StreamingText({
  lead,
  citeAfter,
  points,
  sourcesCount,
  followUps,
  onFollowUp,
  onCopy,
  onRetry,
  onSources,
  onSettled,
  fill = true,
}: {
  lead: string;
  citeAfter: number;
  points: AnswerPoint[];
  sourcesCount: number;
  followUps: string[];
  onFollowUp: (query: string) => void;
  onCopy: () => void;
  onRetry: () => void;
  onSources: () => void;
  onSettled?: () => void;
  fill?: boolean;
}) {
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  // Reset when a new answer arrives — adjusted during render, not in an effect.
  const [lastLead, setLastLead] = useState(lead);
  if (lastLead !== lead) {
    setLastLead(lead);
    setDone(false);
  }

  // Announce settlement once per completed stream (done flips false→true).
  useEffect(() => {
    if (done) onSettledRef.current?.();
  }, [done]);

  const settle = () => setDone(true);

  const words = lead.split(/(\s+)/).filter((token) => token.length > 0);
  const citeIndex = Math.min(citeAfter, words.length - 1);
  const before = words.slice(0, citeIndex).join("");
  const after = words.slice(citeIndex).join("");

  // Points cascade after the lead lands; later rows wait for the cascade.
  const cascade = points.length * 130 + 350;

  const actions: Array<{ key: string; label: string; onClick?: () => void }> = [
    { key: "copy", label: copied ? "Copied" : "Copy answer", onClick: () => { onCopy(); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } },
    { key: "retry", label: "Re-run search", onClick: onRetry },
    { key: "save", label: "Keep for later" },
    { key: "share", label: "Share" },
  ];

  return (
    <div className={fill ? "w-full" : "w-full max-w-95"}>
      {/* summary paragraph — streams with the primary source cited inline */}
      <p className="text-[13.5px] leading-[1.65] text-ink">
        {before}
        {points[0]?.source && (
          <span className="mr-1 inline-flex" style={{ animation: "pop-in 250ms cubic-bezier(0.23,1,0.32,1) both" }}>
            <SourceChip source={points[0].source} />
          </span>
        )}
        {!done ? (
          <StreamText text={after} onDone={settle} className="inline" />
        ) : (
          <span className="inline">{after}</span>
        )}
      </p>

      {/* key points — the headed list each source backs */}
      {points.length > 1 && (
        <div
          className="mt-3.5 transition-opacity duration-400"
          style={{ opacity: done ? 1 : 0 }}
        >
          <p className="text-[12px] font-medium text-ink-2" style={{ marginBottom: 2 }}>
            Key points across the sources
          </p>
          <div className="flex flex-col">
            {points.map((point, i) => (
              <div
                key={`${point.source.href}-${i}`}
                className="-mx-1.5 flex items-start gap-2.5 rounded-[7px] border-b border-line px-1.5 py-2"
                style={done ? { animation: `fade-up 350ms cubic-bezier(0.23,1,0.32,1) ${i * 130}ms both` } : { opacity: 0 }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-ink-3)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="mt-[5px] shrink-0"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                </svg>
                <span className="flex-1 text-[13px] leading-[1.55] text-ink-2">{point.text}</span>
                <span className="mt-[2px] shrink-0 whitespace-nowrap">
                  <SourceChip source={point.source} more={point.more} subtle />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* action icons row */}
      <div
        className="mt-2 flex items-center gap-0.5 transition-opacity duration-400"
        style={{ opacity: done ? 1 : 0, pointerEvents: done ? "auto" : "none", transitionDelay: `${cascade}ms` }}
      >
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            aria-label={action.label}
            title={action.label}
            onClick={action.onClick}
            className="flex size-6 items-center justify-center rounded-[6px] text-ink-3 transition-colors duration-100 hover:bg-hover-2 hover:text-ink-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {action.key === "copy" && <g><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></g>}
              {action.key === "retry" && <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />}
              {action.key === "save" && <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />}
              {action.key === "share" && <g><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></g>}
            </svg>
          </button>
        ))}
        <button
          type="button"
          onClick={onSources}
          className="ml-1.5 flex items-center gap-1.5 rounded-[6px] px-1 py-0.5 text-left transition-colors duration-150 hover:bg-hover"
        >
          <span className="flex -space-x-1">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="size-3.5 rounded-full bg-field shadow-[0_0_0_1.5px_var(--color-surface)]"
                style={{ borderLeft: "2px solid var(--color-line-strong)" }}
              />
            ))}
          </span>
          <span className="text-[12px] text-ink-2">{sourcesCount} sources</span>
        </button>
      </div>

      {/* follow-ups */}
      <div
        className="mt-2.5 transition-opacity duration-400"
        style={{ opacity: done ? 1 : 0, pointerEvents: done ? "auto" : "none", transitionDelay: `${cascade}ms` }}
      >
        <p className="text-[12px] font-medium text-ink-2">Follow-ups</p>
        <div className="mt-0.5 flex flex-col">
          {followUps.map((text, i) => (
            <button
              key={text}
              type="button"
              onClick={() => onFollowUp(text)}
              className="-mx-1.5 flex items-center gap-2 rounded-[7px] border-b border-line px-1.5 py-1.5 text-left text-[12.5px] text-ink transition-colors duration-100 hover:bg-hover-2"
              style={done ? { animation: `fade-up 350ms cubic-bezier(0.23,1,0.32,1) ${cascade + i * 90}ms both` } : { opacity: 0 }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M9 10l-5 5 5 5" />
                <path d="M20 4v7a4 4 0 0 1-4 4H4" />
              </svg>
              {text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
