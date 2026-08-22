"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * ExtractedContent — lazy-loaded markdown renderer. react-markdown parses to
 * React elements (no dangerouslySetInnerHTML), so extracted web content is
 * rendered safely; remark-gfm covers tables and strikethrough.
 */
const ReactMarkdown = dynamic(() => import("react-markdown"), {
  ssr: false,
  loading: () => <p className="research-status">Rendering extracted content…</p>,
});

export function ExtractedContent({ markdown, maxHeight }: { markdown: string; maxHeight?: number }) {
  const [gfm, setGfm] = useState<typeof import("remark-gfm").default | null>(null);
  useEffect(() => {
    let cancelled = false;
    void import("remark-gfm").then((module) => {
      if (!cancelled) setGfm(() => module.default);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="markdown-body" data-lenis-prevent style={maxHeight ? { maxHeight } : undefined}>
      <ReactMarkdown remarkPlugins={gfm ? [gfm] : []}>{markdown}</ReactMarkdown>
    </div>
  );
}
