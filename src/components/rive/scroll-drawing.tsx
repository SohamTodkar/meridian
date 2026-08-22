"use client";

import { ScrollDriver } from "@/components/motion/scroll-progress";

/**
 * ScrollDrawing — a scroll-bound vector line drawing (directive §5's
 * scroll-bound drawing, expressed as pure SVG so it works offline, before
 * WASM, and under reduced motion). The stroke draws itself as the page
 * scrolls: stroke-dashoffset is computed from the --draw-progress variable
 * the scroll store maintains, so the drawing costs zero JavaScript per frame
 * and animates on the compositor.
 *
 * The motif is the product's own metaphor: the learner's path — a line that
 * climbs through four stations (the four phases) and arrives.
 */
export function ScrollDrawing({ className = "" }: { className?: string }) {
  return (
    <ScrollDriver>
      <div className={className}>
        <svg className="rive-draw" viewBox="0 0 420 120" role="img" aria-label="A line being drawn as you scroll, climbing through the four phases">
          <path className="draw-ground" d="M10 104 C 60 96, 90 88, 130 76 S 210 52, 260 44 S 360 30, 410 14" />
          <path
            className="draw-path"
            pathLength={1}
            d="M10 104 C 60 96, 90 88, 130 76 S 210 52, 260 44 S 360 30, 410 14"
          />
          {[
            [130, 76],
            [210, 57],
            [290, 41],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.6" fill="var(--rule-strong)" />
          ))}
          <circle cx="410" cy="14" r="4" fill="none" stroke="var(--bone)" strokeWidth="1.2" />
        </svg>
        <p className="rive-note" style={{ marginTop: 8 }}>scroll-bound drawing · {`--draw-progress`}</p>
      </div>
    </ScrollDriver>
  );
}
