"use client";

import { useIdeasUi } from "@/state/ideas-ui";

export function ScrollProgress() {
  const progress = useIdeasUi((state) => state.scrollProgress);
  return <div className="scroll-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>;
}
