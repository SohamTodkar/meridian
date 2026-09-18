"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * CountUp — an integer that sweeps from zero to its value the first time it
 * scrolls into view. Under reduced motion the final value renders instantly.
 */
export function CountUp({
  value,
  duration = 1.15,
  className = "",
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -32px 0px" });
  const reduce = useReducedMotion();
  // Reduced-motion users get the settled value on the first render; the
  // effect below only runs for the animated path.
  const [display, setDisplay] = useState(0);
  const shown = reduce ? value : display;

  useEffect(() => {
    if (reduce) return;
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: latest => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduce]);

  return (
    <span ref={ref} className={cn("mv-count-up", className)}>
      {shown}
    </span>
  );
}
