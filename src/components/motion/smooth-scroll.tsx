"use client";

import Lenis from "lenis";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { publishScroll, refreshScroll } from "@/lib/scroll";

/**
 * SmoothScrollProvider — the Lenis integration, rebuilt.
 *
 * Contract (directive §2 + §8):
 *  - Disabled entirely when the user prefers reduced motion; native scrolling
 *    then feeds the same scroll store so every consumer keeps working.
 *  - Keyboard behaviour (Space, arrows, Home/End, PgUp/PgDn), find-in-page and
 *    text selection are untouched: Lenis defers to native key scrolling by
 *    default and we never preventDefault on key events.
 *  - Scroll events publish to the external scroll store (CSS variable + zero
 *    React re-renders).
 *  - Modals announce themselves via `meridian:modal-open` / `meridian:modal-close`
 *    window events; the engine pauses while any modal is up so wheel events
 *    never fight a dialog.
 *  - Same-page anchors (#…) are routed through Lenis; external/meta clicks and
 *    plain links behave natively.
 */

type ScrollTo = (target: string | number | HTMLElement, immediate?: boolean) => void;

interface SmoothScrollContextValue {
  scrollTo: ScrollTo;
  active: boolean;
}

const SmoothScrollContext = createContext<SmoothScrollContextValue>({
  scrollTo: () => {},
  active: false,
});

export const useSmoothScroll = () => useContext(SmoothScrollContext);

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);
  const rafRef = useRef<number | null>(null);
  const [active, setActive] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );

  // Engine lifecycle.
  useEffect(() => {
    if (reduced) return;

    let lenis: Lenis;
    try {
      lenis = new Lenis({
        duration: 1.05,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 0.95,
        touchMultiplier: 1.4,
        infinite: false,
        // Keep native scrolling semantics for keyboard + accessibility tools.
        syncTouch: false,
        autoRaf: false,
      });
    } catch {
      return; // fall back to native scrolling below
    }

    lenisRef.current = lenis;
    // Deferred one frame so the first rAF tick lands before the re-render.
    const activate = requestAnimationFrame(() => setActive(true));

    lenis.on("scroll", (instance: { scroll: number; limit: number }) => {
      publishScroll(instance.scroll, instance.limit, true);
    });

    const raf = (time: number) => {
      lenis.raf(time);
      rafRef.current = requestAnimationFrame(raf);
    };
    rafRef.current = requestAnimationFrame(raf);

    // Native fallback listeners keep the store fresh when Lenis is bypassed
    // (programmatic scrolls, find-in-page jumps).
    const onNativeScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(0, doc.scrollHeight - window.innerHeight);
      publishScroll(window.scrollY, max, true);
    };
    window.addEventListener("scroll", onNativeScroll, { passive: true });

    // Pause the engine while modal layers own the viewport.
    let openModals = 0;
    const onModalOpen = () => {
      openModals += 1;
      if (openModals === 1) lenis.stop();
    };
    const onModalClose = () => {
      openModals = Math.max(0, openModals - 1);
      if (openModals === 0) lenis.start();
    };
    window.addEventListener("meridian:modal-open", onModalOpen);
    window.addEventListener("meridian:modal-close", onModalClose);

    // Smooth anchors for same-page hash links (skip-link included).
    const onAnchorClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement).closest?.('a[href^="#"]');
      if (!anchor) return;
      const hash = anchor.getAttribute("href");
      if (!hash || hash === "#") return;
      const target = document.querySelector(hash);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -20 });
      target.setAttribute("tabindex", "-1");
      (target as HTMLElement).focus({ preventScroll: true });
    };
    document.addEventListener("click", onAnchorClick);

    return () => {
      cancelAnimationFrame(activate);
      window.removeEventListener("scroll", onNativeScroll);
      window.removeEventListener("meridian:modal-open", onModalOpen);
      window.removeEventListener("meridian:modal-close", onModalClose);
      document.removeEventListener("click", onAnchorClick);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lenis.destroy();
      lenisRef.current = null;
      requestAnimationFrame(() => setActive(false));
    };
  }, [reduced]);

  // Native fallback store for reduced-motion users.
  useEffect(() => {
    if (!reduced) return;
    const onScroll = () => {
      const doc = document.documentElement;
      publishScroll(window.scrollY, Math.max(0, doc.scrollHeight - window.innerHeight), false);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced]);

  // Route change: reset to top and re-measure once the new page settles.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true });
      else window.scrollTo({ top: 0, behavior: "auto" });
      refreshScroll(Boolean(lenisRef.current));
    });
    const settle = window.setTimeout(() => refreshScroll(Boolean(lenisRef.current)), 300);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
  }, [pathname]);

  const scrollTo = useCallback<ScrollTo>((target, immediate = false) => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(target as never, { immediate, offset: -20 });
      return;
    }
    if (typeof target === "number") window.scrollTo({ top: target, behavior: "auto" });
    else if (typeof target === "string") document.querySelector(target)?.scrollIntoView();
    else target.scrollIntoView();
  }, []);

  const value = useMemo(() => ({ scrollTo, active }), [scrollTo, active]);

  return <SmoothScrollContext.Provider value={value}>{children}</SmoothScrollContext.Provider>;
}
