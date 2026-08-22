"use client";

/**
 * Motion foundations: reduced-motion preference, in-view observation, and a
 * shared requestAnimationFrame loop. Everything animated in Meridian goes
 * through these primitives so the reduced-motion contract is enforced in one
 * place and idle tabs stop paying for invisible work.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { refreshScroll, scrollState } from "./scroll";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

/** Non-hook variant for code that runs outside React (canvas engines). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Observe an element and report (and keep reporting) visibility. WebGL
 * canvases use this to pause their render loops offscreen.
 */
export function useInView<T extends HTMLElement>(threshold = 0.05) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => setInView(entries[0]?.isIntersecting ?? true), { threshold });
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

type FrameCallback = (time: number, delta: number) => void;

/**
 * A single shared rAF loop. Multiple consumers (HUD meter, canvas engines)
 * register callbacks; the loop stops entirely when the last one unsubscribes
 * or the document is hidden.
 */
class FrameLoop {
  private callbacks = new Set<FrameCallback>();
  private rafId: number | null = null;
  private lastTime = 0;

  subscribe(callback: FrameCallback): () => void {
    this.callbacks.add(callback);
    this.ensureRunning();
    return () => {
      this.callbacks.delete(callback);
      if (this.callbacks.size === 0 && this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    };
  }

  private ensureRunning() {
    if (this.rafId !== null || typeof window === "undefined") return;
    this.lastTime = performance.now();
    const tick = (time: number) => {
      this.rafId = requestAnimationFrame(tick);
      if (document.hidden) {
        this.lastTime = time;
        return;
      }
      const delta = Math.min(64, time - this.lastTime);
      this.lastTime = time;
      for (const callback of this.callbacks) callback(time, delta);
    };
    this.rafId = requestAnimationFrame(tick);
  }
}

export const frameLoop = new FrameLoop();

/** React binding for the shared frame loop. */
export function useFrame(callback: FrameCallback, active = true): void {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  useEffect(() => {
    if (!active) return;
    return frameLoop.subscribe((time, delta) => callbackRef.current(time, delta));
  }, [active]);
}

/**
 * Route-change settlement helper: after navigation, wait for layout to
 * stabilise, then re-measure document scroll limits.
 */
export function useScrollRemeasureOn(pathname: string) {
  useEffect(() => {
    const frame = requestAnimationFrame(() => refreshScroll(scrollState.smooth));
    const settle = window.setTimeout(() => refreshScroll(scrollState.smooth), 240);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
  }, [pathname]);
}
