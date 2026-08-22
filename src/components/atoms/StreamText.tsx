"use client";

import { useEffect, useState } from "react";

/**
 * StreamText atom — reveals text word by word. onProgress fires per word so
 * embedders can re-measure attached elements (e.g. selection bars); onDone
 * fires once the final word lands. Looping is opt-in; the research answer
 * streams once.
 */
export function StreamText({
  text,
  wordMs = 55,
  loop = false,
  holdMs = 3400,
  onProgress,
  onDone,
  className = "",
}: {
  text: string;
  wordMs?: number;
  loop?: boolean;
  holdMs?: number;
  onProgress?: () => void;
  onDone?: () => void;
  className?: string;
}) {
  const words = text.split(/(\s+)/).filter((token) => token.length > 0);
  const [count, setCount] = useState(0);
  const done = count >= words.length;

  // Reset the stream when the text changes — state adjustment during render
  // (the React-sanctioned derived-reset pattern, no cascading effect).
  const [lastText, setLastText] = useState(text);
  if (lastText !== text) {
    setLastText(text);
    setCount(0);
  }

  useEffect(() => {
    if (done && !loop) {
      if (done) onDone?.();
      return;
    }
    const timer = window.setTimeout(
      () => setCount((current) => (current >= words.length ? 0 : current + 1)),
      done ? holdMs : wordMs,
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, done, loop, text]);

  useEffect(() => {
    if (!done) onProgress?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return (
    <span className={className}>
      {words.slice(0, count).join("")}
      {!done && (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-3 w-0.5 translate-y-0.5 rounded-full bg-ink align-baseline"
          style={{ animation: "fade-in 150ms ease-out both" }}
        />
      )}
    </span>
  );
}
