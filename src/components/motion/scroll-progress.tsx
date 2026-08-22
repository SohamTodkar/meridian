"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { bindScrollCssVar, subscribeScroll } from "@/lib/scroll";
import { cn } from "@/lib/utils";

/**
 * ScrollProgress — reading-progress bar driven purely by the scroll store's
 * CSS variable. The bar never re-renders; it scales on the compositor via
 * transform: scaleX(var(--scroll-progress)).
 */
export function ScrollProgress({ className = "" }: { className?: string }) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unbind = bindScrollCssVar(document.documentElement);
    // Also bind on the bar itself for good measure.
    const unbindBar = barRef.current ? bindScrollCssVar(barRef.current) : () => {};
    return () => {
      unbind();
      unbindBar();
    };
  }, []);

  return (
    <div className={cn("reading-progress", className)} aria-hidden="true">
      <div className="reading-progress-bar" ref={barRef} />
    </div>
  );
}

/**
 * Reveal — scroll-triggered entrance for sections. One-shot IntersectionObserver
 * adds `.is-visible`; the CSS transition is opacity/transform only and is
 * neutralised under prefers-reduced-motion.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
  id,
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "article";
  id?: string;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      element?.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          element.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      id={id}
      aria-labelledby={labelledBy}
      className={cn("reveal", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

/**
 * ScrollDriver — invisible helper for scroll-bound vector drawing (the Rive
 * line-art path). It mirrors document scroll progress onto a CSS variable on
 * its subtree so stroke-dashoffset can be computed in pure CSS.
 */
export function ScrollDriver({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const paint = (progress: number) => element.style.setProperty("--draw-progress", progress.toFixed(4));
    paint(0);
    const unsubscribe = subscribeScroll(({ progress }) => paint(progress));
    return unsubscribe;
  }, []);
  return <div ref={ref}>{children}</div>;
}
