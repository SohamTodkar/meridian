"use client";

import type { ReactNode } from "react";

/** Shimmering text for in-flight labels — a background-position animation,
 *  never a layout property. */
export function Shimmer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage: "linear-gradient(90deg, var(--color-ink-3) 35%, var(--color-ink) 50%, var(--color-ink-3) 65%)",
        backgroundSize: "200% 100%",
        animation: "shimmer-text 1.4s linear infinite",
      }}
    >
      {children}
    </span>
  );
}
