"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * GlideMenu — a container whose hover highlight is a single pill that
 * glides between rows (instead of each row toggling its own background).
 * Rows opt in with `data-row` (or the selector you pass). The pill tracks
 * hover and focus, so keyboard navigation lights the same path.
 */
export default function GlideMenu({
  children,
  className = "",
  highlightClassName = "",
  rowSelector = "[data-row]",
}: {
  children: ReactNode;
  className?: string;
  highlightClassName?: string;
  rowSelector?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ top: number; height: number } | null>(null);
  const [active, setActive] = useState(false);

  const track = (target: EventTarget | null) => {
    const root = containerRef.current;
    if (!root || !target || !(target instanceof Element)) return;
    const row = target.closest(rowSelector);
    if (!row || !root.contains(row)) return;
    setPill({ top: (row as HTMLElement).offsetTop, height: (row as HTMLElement).offsetHeight });
    setActive(true);
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onMouseOver={(event) => track(event.target)}
      onFocus={(event) => track(event.target)}
      onMouseLeave={() => setActive(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setActive(false);
      }}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 z-0 ${highlightClassName}`}
        style={{
          top: pill?.top ?? 0,
          height: pill?.height ?? 0,
          opacity: active && pill ? 1 : 0,
          transition: "top 200ms cubic-bezier(0.23,1,0.32,1), height 200ms cubic-bezier(0.23,1,0.32,1), opacity 130ms ease",
        }}
      />
      {children}
    </div>
  );
}
