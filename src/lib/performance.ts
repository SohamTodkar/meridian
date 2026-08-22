/**
 * Live runtime telemetry for the F1 HUD. Real measurements only — the HUD
 * never displays invented numbers.
 */

import { frameLoop } from "./motion";

export interface RuntimeTelemetry {
  fps: number;
  frameJitter: number;
  webglRenderer: string | null;
  storageMode: string;
  storageUsageBytes: number | null;
  storageQuotaBytes: number | null;
  hardwareConcurrency: number | null;
  deviceMemoryGB: number | null;
  offline: boolean;
  smoothScroll: boolean;
  reducedMotion: boolean;
}

let webglRendererName: string | null = null;

/** Detect the GPU renderer string once; used by the HUD and diagnostics. */
export function detectWebglRenderer(): string | null {
  if (webglRendererName !== null) return webglRendererName;
  if (typeof document === "undefined") return null;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return (webglRendererName = "unavailable");
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    webglRendererName = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "masked";
    const lose = gl.getExtension("WEBGL_lose_context");
    lose?.loseContext();
    return webglRendererName;
  } catch {
    return (webglRendererName = "unavailable");
  }
}

class FpsMeter {
  fps = 60;
  jitter = 0;
  private frames = 0;
  private windowStart = 0;
  private lastDelta = 16.7;
  private unsubscribe: (() => void) | null = null;
  private listeners = new Set<() => void>();

  start() {
    this.unsubscribe?.();
    this.frames = 0;
    this.windowStart = performance.now();
    this.unsubscribe = frameLoop.subscribe((time) => {
      this.frames += 1;
      const delta = time - (this.windowStart + this.frames * 16.7 - 16.7);
      this.jitter = Math.abs(delta - this.lastDelta);
      this.lastDelta = delta;
      const elapsed = time - this.windowStart;
      if (elapsed >= 500) {
        this.fps = Math.round((this.frames * 1000) / elapsed);
        this.frames = 0;
        this.windowStart = time;
        for (const listener of this.listeners) listener();
      }
    });
  }

  stop() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  onUpdate(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const fpsMeter = new FpsMeter();

export async function readStorageEstimate(): Promise<{ usage: number | null; quota: number | null }> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return { usage: null, quota: null };
  try {
    const estimate = await navigator.storage.estimate();
    return { usage: estimate.usage ?? null, quota: estimate.quota ?? null };
  } catch {
    return { usage: null, quota: null };
  }
}

/** Format bytes into the HUD's compact notation. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
