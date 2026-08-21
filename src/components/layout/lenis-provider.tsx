"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { useIdeasUi } from "@/state/ideas-ui";

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const setScrollProgress = useIdeasUi((state) => state.setScrollProgress);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.82, touchMultiplier: 1 });
    let frame = 0;
    const raf = (time: number) => { lenis.raf(time); frame = requestAnimationFrame(raf); };
    const update = ({ progress }: { progress: number }) => {
      const clamped = Math.max(0, Math.min(1, progress));
      document.documentElement.style.setProperty("--scroll-progress", String(clamped));
      setScrollProgress(clamped);
    };
    lenis.on("scroll", update);
    frame = requestAnimationFrame(raf);
    return () => { cancelAnimationFrame(frame); lenis.off("scroll", update); lenis.destroy(); };
  }, [setScrollProgress]);

  return <>{children}</>;
}
