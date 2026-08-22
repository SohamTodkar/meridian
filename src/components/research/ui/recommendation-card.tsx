"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/atoms/Button";

/**
 * RECOMMENDATION CARD — the card holds its shape; "Alternatives" opens a
 * drawer of the other options; picking one promotes it; the primary action
 * confirms (adapted from the gallery kit; options are live next-steps).
 */

export type CardOption = {
  key: string;
  body: ReactNode;
  short: string;
  signal: number;
  tone: string;
  label: string;
  cta: string;
  ctaVariant: "primary" | "secondary" | "accent" | "success";
};

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" }) {
  return (
    <span
      className={`mx-0.5 inline-flex items-center rounded-full px-1.5 py-0 align-middle text-[12px] font-medium ${
        tone === "green" ? "bg-green-tint text-green" : "bg-field text-ink-2"
      }`}
      style={{
        boxShadow: tone === "green" ? "0 0 0 1px rgba(139,167,154,.28)" : "var(--shadow-hairline)",
      }}
    >
      {children}
    </span>
  );
}

function Meter({ signal, tone }: { signal: number; tone: string }) {
  return (
    <span className="flex items-end gap-0.5" aria-hidden>
      {[0, 1, 2].map((bar) => (
        <span
          key={bar}
          className="w-1 rounded-full transition-colors duration-300"
          style={{ height: 10, background: bar < signal ? tone : "var(--color-line-strong)" }}
        />
      ))}
    </span>
  );
}

export function RecommendationCard({
  question,
  options,
  onConfirm,
}: {
  question: string;
  options: CardOption[];
  onConfirm: (option: CardOption) => void;
}) {
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState<string | null>(null);

  const active = options[selected];
  const others = options.map((option, index) => ({ option, index })).filter(({ index }) => index !== selected);

  return (
    <div className="w-full max-w-95 overflow-hidden rounded-card bg-surface shadow-card">
      <div className="primitive-card-pad">
        <span className="text-[14px] font-medium text-ink">{question}</span>
        <p
          key={active.key}
          className="mt-1.5 min-h-12 text-[13px] leading-relaxed text-ink-2"
          style={{ animation: "fade-in 180ms ease-out both" }}
        >
          {active.body}
        </p>
      </div>

      {/* alternatives drawer */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-line bg-surface px-2 py-2" data-lenis-prevent>
            <p className="px-1.5 pb-1 text-[11px] font-medium text-ink-3">Other options</p>
            {others.map(({ option, index }) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setSelected(index);
                  setAccepted(null);
                }}
                className="flex w-full items-center gap-2.5 rounded-control px-1.5 py-1.5 text-left transition-colors duration-100 hover:bg-hover"
              >
                <Meter signal={option.signal} tone={option.tone} />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{option.short}</span>
                <span className="shrink-0 text-[11px] text-ink-3">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="primitive-card-footer flex items-center justify-between gap-3 bg-surface">
        <span className="flex items-center gap-2">
          <Meter signal={active.signal} tone={active.tone} />
          <span className="text-[12.5px] font-medium text-ink-2">{active.label}</span>
        </span>

        <span className="-mr-0.5 flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            className="px-2.5 text-[12.5px]"
          >
            Alternatives
          </Button>
          <Button
            variant={accepted === active.key ? "success" : active.ctaVariant}
            size="sm"
            onClick={() => {
              setAccepted(active.key);
              onConfirm(active);
            }}
            className="text-[12.5px]"
          >
            {accepted === active.key ? "Accepted" : active.cta}
          </Button>
        </span>
      </div>
    </div>
  );
}

export { Pill };
