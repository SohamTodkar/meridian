"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Reveal — the signature entrance: a quiet fade, a small rise, and a blur
 * that lifts as the element scrolls into view. One-shot, compositor-only
 * properties (opacity / transform / filter), and fully neutralised when the
 * user prefers reduced motion (content renders plainly, no initial hiding).
 *
 * The rendered tag stays semantic so layout CSS keeps working: pass the same
 * className the plain element would have had.
 */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds to wait after entering the viewport (stagger siblings). */
  delay?: number;
  /** Rise distance in pixels. */
  y?: number;
  as?: "div" | "section" | "article" | "aside";
  id?: string;
  label?: string;
  labelledBy?: string;
  style?: CSSProperties;
}

export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 18,
  as = "div",
  id,
  label,
  labelledBy,
  style,
}: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    const Tag = as;
    return (
      <Tag
        id={id}
        aria-label={label}
        aria-labelledby={labelledBy}
        className={cn("mv-reveal", className)}
        style={style}
      >
        {children}
      </Tag>
    );
  }
  const M = motion[as] as typeof motion.div;
  return (
    <M
      id={id}
      aria-label={label}
      aria-labelledby={labelledBy}
      className={cn("mv-reveal", className)}
      style={style}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -48px 0px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </M>
  );
}
