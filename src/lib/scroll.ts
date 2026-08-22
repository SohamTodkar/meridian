/**
 * Scroll telemetry store.
 *
 * A tiny framework-external store so animation loops (WebGL uniforms, reading
 * progress bars, the HUD FPS meter) can read scroll state every frame without
 * triggering React re-renders. The smooth-scroll provider writes; everyone
 * else reads or subscribes.
 */

export interface ScrollState {
  /** Document scroll offset in pixels. */
  y: number;
  /** Scroll direction: -1 up, 1 down, 0 idle. */
  direction: 0 | 1 | -1;
  /** Normalised document progress, 0..1. */
  progress: number;
  /** Lenis-style velocity estimate in px/frame, smoothed. */
  velocity: number;
  /** True while the smooth-scroll engine drives the page. */
  smooth: boolean;
}

type Listener = (state: ScrollState) => void;

export const scrollState: ScrollState = {
  y: 0,
  direction: 0,
  progress: 0,
  velocity: 0,
  smooth: false,
};

const listeners = new Set<Listener>();
const cssVarTargets = new Set<HTMLElement>();

/** Measure raw document scroll limits without layout thrash. */
function readDocument() {
  if (typeof document === "undefined") return { y: 0, max: 0 };
  const doc = document.documentElement;
  const max = Math.max(0, doc.scrollHeight - window.innerHeight);
  const y = Math.min(max, Math.max(0, window.scrollY));
  return { y, max };
}

/**
 * Publish a scroll update. Called by the smooth-scroll provider on every
 * Lenis scroll event and by the fallback native listener.
 */
export function publishScroll(y: number, max: number, smooth: boolean) {
  const progress = max <= 0 ? 0 : Math.min(1, Math.max(0, y / max));
  const direction: ScrollState["direction"] = y > scrollState.y + 0.5 ? 1 : y < scrollState.y - 0.5 ? -1 : 0;
  const velocity = scrollState.velocity * 0.82 + (y - scrollState.y) * 0.18;
  scrollState.y = y;
  scrollState.progress = progress;
  scrollState.direction = direction;
  scrollState.velocity = Math.abs(velocity) < 0.01 ? 0 : velocity;
  scrollState.smooth = smooth;
  for (const element of cssVarTargets) element.style.setProperty("--scroll-progress", scrollState.progress.toFixed(4));
  for (const listener of listeners) listener(scrollState);
}

/** One-off re-measure (e.g. after content height changes or route changes). */
export function refreshScroll(smooth: boolean) {
  const { y, max } = readDocument();
  publishScroll(y, max, smooth);
}

export function subscribeScroll(listener: Listener): () => void {
  listeners.add(listener);
  listener(scrollState);
  return () => listeners.delete(listener);
}

/**
 * Keep a `--scroll-progress` custom property in sync on the given element so
 * pure-CSS consumers (progress bars) can animate via transform without JS.
 */
export function bindScrollCssVar(element: HTMLElement): () => void {
  cssVarTargets.add(element);
  element.style.setProperty("--scroll-progress", scrollState.progress.toFixed(4));
  return () => cssVarTargets.delete(element);
}
