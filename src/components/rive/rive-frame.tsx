"use client";

import { useEffect, useState } from "react";
import { useRive } from "@rive-app/react-canvas";
import { ASSET_PATHS } from "@/lib/assets";

/**
 * RiveFrame — asynchronous vector animation stage (directive §5).
 *
 * The .riv binary loads lazily: the WASM runtime and the asset are only
 * fetched when a RiveFrame actually mounts, so the initial page paint never
 * waits on Rive. While loading (or if the runtime is unavailable offline)
 * the frame shows a quiet placeholder. A scroll-progress numeric input is
 * bound automatically when the loaded state machine exposes one
 * (the setNumberState-style binding from the directive).
 */

export function RiveFrame({
  src = ASSET_PATHS.rive,
  stateMachine = "idle",
  label = "rive animation",
  scrollBound = false,
}: {
  src?: string;
  stateMachine?: string;
  label?: string;
  scrollBound?: boolean;
}) {
  const { rive, RiveComponent } = useRive({
    src,
    autoplay: true,
    shouldDisableRiveListeners: true,
  });
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  // The hook hands us the runtime once initialised; treat a living runtime as
  // ready, and flip to failed if nothing arrives in time (offline first run).
  useEffect(() => {
    if (rive) {
      const frame = requestAnimationFrame(() => setStatus("ready"));
      return () => cancelAnimationFrame(frame);
    }
    const timeout = window.setTimeout(() => setStatus("failed"), 8000);
    return () => window.clearTimeout(timeout);
  }, [rive]);

  // Scroll binding: feed document scroll progress (0..1) into the first
  // number input the state machine exposes, if any.
  useEffect(() => {
    if (!scrollBound || !rive || status !== "ready") return;
    let input: { value: number } | null = null;
    try {
      const inputs = rive.stateMachineInputs(stateMachine) ?? [];
      const candidate = inputs.find((item) => /scroll|progress/i.test(item.name)) ?? inputs.find((item) => typeof item.value === "number");
      if (candidate && typeof candidate.value === "number") input = candidate as unknown as { value: number };
    } catch {
      input = null;
    }
    if (!input) return;

    let rafId = 0;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const doc = document.documentElement;
        const max = Math.max(0, doc.scrollHeight - window.innerHeight);
        input!.value = max > 0 ? window.scrollY / max : 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
    };
  }, [rive, scrollBound, stateMachine, status]);

  return (
    <div className="rive-frame" role="img" aria-label={label}>
      {status !== "failed" && RiveComponent ? (
        <RiveComponent style={{ width: "100%", height: "100%" }} aria-label={label} />
      ) : (
        <div className="webgl-fallback">vector stage offline</div>
      )}
      <span className="rive-note" aria-hidden="true">
        {status === "ready" ? "rive · wasm" : status === "loading" ? "rive · loading" : "rive · unavailable"}
      </span>
    </div>
  );
}
