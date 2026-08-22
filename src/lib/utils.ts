/** Small shared utilities. */

/** Join conditional class names without pulling in a dependency. */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

/** Clamp a number into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Frame-rate independent exponential smoothing factor. */
export function damp(current: number, target: number, smoothing: number, deltaMs: number): number {
  return lerp(current, target, 1 - Math.pow(smoothing, deltaMs / 16.7));
}

/** Run a callback after the browser is idle (fallback: timeout). */
export function whenIdle(callback: () => void, timeout = 2000): () => void {
  if (typeof window === "undefined") {
    callback();
    return () => {};
  }
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = window.setTimeout(callback, 1);
  return () => window.clearTimeout(handle);
}

/** Human "x minutes read" estimate for a body of text. */
export function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Map a value from one range to another, clamped. */
export function remap(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMax === inMin) return outMin;
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return outMin + (outMax - outMin) * t;
}
