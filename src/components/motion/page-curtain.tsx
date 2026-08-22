"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * PageTransitionCurtain — two-panel wipe between routes.
 *
 * With the App Router the new page is already prefetched (next/link prefetches
 * on hover/viewport), so the curtain plays as the swap settles: the panels
 * cover the viewport with a scaleY wipe, hold the brand mark plus a
 * route-specific loading label, then collapse. A hard 3-second timeout
 * guarantees the overlay can never strand the user if anything stalls, and
 * reduced-motion users skip the theatre entirely.
 */

const ROUTE_LABELS: Array<[prefix: string, label: string]> = [
  ["/session/", "Loading session"],
  ["/path/", "Loading phase"],
  ["/path", "Loading path"],
  ["/library", "Loading library"],
  ["/research", "Opening research desk"],
  ["/journal", "Loading record"],
  ["/recall", "Loading recall"],
  ["/review", "Loading review"],
  ["/portfolio", "Loading evidence"],
  ["/settings", "Loading settings"],
  ["/", "Loading today"],
];

function labelFor(pathname: string): string {
  return ROUTE_LABELS.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "Loading";
}

const WIPE_MS = 460;
const STALL_TIMEOUT_MS = 3000;

export function PageTransitionCurtain() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState("Loading");
  const firstPath = useRef(true);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    if (prefersReducedMotion()) return;

    // Deferred one frame so the wipe paints on the fresh route without a
    // synchronous state cascade inside the effect.
    const start = requestAnimationFrame(() => {
      setLabel(labelFor(pathname));
      setVisible(true);
    });
    timers.current.push(window.setTimeout(() => setVisible(false), WIPE_MS));
    // Stall guard: even if timers are starved, never keep the curtain up.
    timers.current.push(window.setTimeout(() => setVisible(false), STALL_TIMEOUT_MS));

    return () => {
      cancelAnimationFrame(start);
      for (const timer of timers.current) window.clearTimeout(timer);
      timers.current = [];
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="curtain-overlay" aria-hidden="true">
      <div className="curtain-panel curtain-panel-top">
        <div className="curtain-content">
          <div className="curtain-brand">
            <span className="curtain-mark">M</span>
            <span>Meridian</span>
          </div>
          <span className="curtain-label">{label}…</span>
        </div>
      </div>
      <div className="curtain-panel curtain-panel-bottom" />
    </div>
  );
}
