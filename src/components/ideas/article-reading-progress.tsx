"use client";

import { useEffect, useState } from "react";

export function ArticleReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const article = document.querySelector(".idea-detail");
      if (!article) return;
      const { top, height } = article.getBoundingClientRect();
      const completed = (window.innerHeight * 0.32 - top) / Math.max(1, height - window.innerHeight * 0.68);
      setProgress(Math.max(0, Math.min(1, completed)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return <div className="article-reading-progress" aria-label="Article reading progress"><span style={{ transform: `scaleX(${progress})` }} /></div>;
}
