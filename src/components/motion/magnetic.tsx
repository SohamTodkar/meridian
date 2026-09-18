"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Magnetic — a gentle gravitational hover. The wrapped element leans toward
 * the pointer (spring-damped transform only) and settles back on leave.
 * Disabled entirely under prefers-reduced-motion and harmless on touch
 * (no pointermove → no offset).
 */
export function Magnetic({
  children,
  className = "",
  strength = 0.32,
}: {
  children: ReactNode;
  className?: string;
  /** Fraction of the pointer offset applied to the element (0..1). */
  strength?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 180, damping: 14, mass: 0.25 });
  const springY = useSpring(y, { stiffness: 180, damping: 14, mass: 0.25 });

  if (reduce) {
    return <div className={cn("mv-magnetic", className)}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={cn("mv-magnetic", className)}
      style={{ x: springX, y: springY }}
      onPointerMove={event => {
        const box = ref.current?.getBoundingClientRect();
        if (!box) return;
        x.set((event.clientX - (box.left + box.width / 2)) * strength);
        y.set((event.clientY - (box.top + box.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}
