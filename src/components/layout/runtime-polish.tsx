"use client";

import { useEffect, useRef } from "react";
import { useIdeasUi } from "@/state/ideas-ui";

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

export function RuntimePolish() {
  const developerVisible = useIdeasUi((state) => state.developerVisible);
  const toggleDeveloper = useIdeasUi((state) => state.toggleDeveloper);
  const sequence = useRef<string[]>([]);

  useEffect(() => {
    console.log("%c Ideas by Noah", "color: #FF6B6B; font-size: 20px; font-weight: bold;");
    console.log("   /\\\n  /  \\   FIELD NOTES\n /____\\  built for useful unfinished thinking");
    const applySavedTheme = () => { document.documentElement.dataset.theme = window.localStorage.getItem("ideas-theme") === "light" ? "light" : "dark"; };
    applySavedTheme();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "F1") { event.preventDefault(); toggleDeveloper(); return; }
      sequence.current = [...sequence.current, event.key].slice(-KONAMI.length);
      if (sequence.current.join("|").toLowerCase() === KONAMI.join("|").toLowerCase()) {
        document.documentElement.dataset.confetti = "true";
        window.setTimeout(() => { delete document.documentElement.dataset.confetti; }, 1700);
        sequence.current = [];
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [toggleDeveloper]);

  return <>{developerVisible && <aside className="developer-panel" aria-live="polite"><strong>Field mode</strong><span>F1 closes this panel.</span><span>Scroll: {Math.round(useIdeasUi.getState().scrollProgress * 100)}%</span></aside>}<div className="confetti-layer" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div></>;
}
