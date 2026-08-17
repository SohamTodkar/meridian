"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

export function PageTransitionCurtain() {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isFirstMount = useRef(true);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    // Trigger curtain transition on navigation
    setIsTransitioning(true);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    // Dismiss curtain smoothly after animation cycle
    timeoutRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
    }, 450);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [pathname]);

  if (!isTransitioning) return null;

  return (
    <div className="curtain-overlay" aria-hidden="true">
      <div className="curtain-panel curtain-panel-top">
        <div className="curtain-content">
          <div className="curtain-brand">
            <span className="curtain-mark">M</span>
            <span className="curtain-label">MERIDIAN // STAGE 3 COCKPIT</span>
          </div>
          <div className="curtain-telemetry">
            <span className="curtain-coords">SYS.LOC // LOCAL DISK</span>
            <span className="curtain-status">LATENCY 0.00ms · 60 FPS</span>
          </div>
        </div>
      </div>
      <div className="curtain-panel curtain-panel-bottom" />
      <div className="curtain-scanline" />
    </div>
  );
}
