"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * KineticText — the roll-effect typography engine.
 *
 * The text is split into words, then characters. Every character lives in an
 * overflow-hidden wrapper holding two stacked glyphs: the primary and a
 * duplicate parked below the fold. On hover (or on first entering the
 * viewport, when `trigger="view"`) both glyphs translate by -100% with a
 * per-character stagger, producing the roll. Only `transform` animates.
 *
 * Accessibility: the readable text is exposed once via aria-label; the
 * duplicated glyph stream is hidden from assistive technology.
 */

export interface KineticTextProps {
  children: string;
  as?: "h1" | "h2" | "h3" | "span" | "div" | "p";
  className?: string;
  /** hover = roll while hovered · view = roll once when scrolled into view. */
  trigger?: "hover" | "view";
  /** Seconds between successive characters (directive default: 0.02). */
  stagger?: number;
}

interface CharPlan {
  key: string;
  char: string;
  delay: number;
}

export function KineticText({
  children,
  as = "span",
  className = "",
  trigger = "hover",
  stagger = 0.02,
}: KineticTextProps) {
  const Component = as as ElementType;
  const wrapRef = useRef<HTMLElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [played, setPlayed] = useState(false);
  const text = typeof children === "string" ? children : "";

  // Word-aware character plan: spaces break the stagger chain naturally and
  // keep words unbreakable during the roll.
  const words: Array<Array<CharPlan>> = [];
  let charIndex = 0;
  for (const word of text.split(" ")) {
    const chars: CharPlan[] = [];
    for (const char of Array.from(word)) {
      chars.push({ key: `c${charIndex}`, char, delay: charIndex * stagger });
      charIndex += 1;
    }
    words.push(chars);
  }

  useEffect(() => {
    if (trigger !== "view" || prefersReducedMotion()) return;
    const element = wrapRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setPlayed(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPlayed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [trigger]);

  const active = trigger === "view" ? played : hovered;

  return (
    <Component
      ref={wrapRef}
      className={cn("kinetic-text-wrap", active && (trigger === "view" ? "is-played" : "is-hovered"), className)}
      aria-label={text}
      role="text"
      {...(trigger === "hover"
        ? {
            onMouseEnter: () => setHovered(true),
            onMouseLeave: () => setHovered(false),
            onFocus: () => setHovered(true),
            onBlur: () => setHovered(false),
          }
        : {})}
    >
      {words.map((chars, wordIndex) => (
        <span className="kinetic-word" key={`w${wordIndex}`} aria-hidden="true">
          {chars.map(({ key, char, delay }) => (
            <span className="kinetic-char-wrapper" key={key}>
              <span className="kinetic-char primary" style={{ transitionDelay: `${delay}s` }}>
                {char}
              </span>
              <span className="kinetic-char secondary" style={{ transitionDelay: `${delay}s` }}>
                {char}
              </span>
            </span>
          ))}
          {wordIndex < words.length - 1 && <span className="kinetic-space">{" "}</span>}
        </span>
      ))}
    </Component>
  );
}
