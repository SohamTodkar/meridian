"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function PageTransition() {
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const timeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    const handleNavigationIntent = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.target === "_blank") return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      setVisible(true);
      router.prefetch(destination.pathname);
      timeout.current = window.setTimeout(() => setVisible(false), 3000);
    };
    document.addEventListener("click", handleNavigationIntent, true);
    return () => document.removeEventListener("click", handleNavigationIntent, true);
  }, [router]);

  useEffect(() => {
    if (timeout.current) window.clearTimeout(timeout.current);
    const reveal = window.setTimeout(() => setVisible(false), 120);
    return () => window.clearTimeout(reveal);
  }, [pathname]);

  return <div className={`transition-curtain ${visible ? "is-visible" : ""}`} aria-hidden="true"><span>Loading Ideas…</span><i /></div>;
}
