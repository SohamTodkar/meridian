"use client";

import { ExternalLink, FileText } from "lucide-react";
import { useState } from "react";
import { ExtractedContent } from "./extracted-content";
import { LoadingSpinner } from "./loading-spinner";
import type { ResearchCombinedResult, ResearchSearchResult } from "./types";

export type ResultCardData =
  | ({ mode: "search" } & ResearchSearchResult)
  | ({ mode: "combined" } & ResearchCombinedResult);

export function ResultCard({
  result,
  onExtract,
}: {
  result: ResultCardData;
  onExtract: (url: string) => Promise<string | null>;
}) {
  const [markdown, setMarkdown] = useState<string | null>(result.mode === "combined" ? result.markdown : null);
  const [extracting, setExtracting] = useState(false);
  const [open, setOpen] = useState(result.mode === "combined" && Boolean(result.markdown));
  const [error, setError] = useState<string | null>(result.mode === "combined" ? result.scrapeError ?? null : null);

  async function toggleContent() {
    if (open) {
      setOpen(false);
      return;
    }
    if (!markdown) {
      setExtracting(true);
      setError(null);
      const extracted = await onExtract(result.url);
      setExtracting(false);
      if (extracted === null) {
        setError("Extraction failed for this source. The link still opens the original page.");
        return;
      }
      setMarkdown(extracted);
    }
    setOpen(true);
  }

  const host = (() => {
    try {
      return new URL(result.url).hostname.replace(/^www\./, "");
    } catch {
      return result.url;
    }
  })();

  return (
    <article className="research-card">
      <div className="research-card-topline">
        <span className="resource-guidance">{host}{result.publishedDate ? ` · ${result.publishedDate.slice(0, 10)}` : ""}</span>
        {result.author && <span className="research-status">{result.author}</span>}
      </div>
      <h3>
        <a href={result.url} target="_blank" rel="noreferrer">
          {result.title} <ExternalLink size={12} style={{ verticalAlign: "middle" }} aria-hidden="true" />
        </a>
      </h3>
      {result.highlights && result.highlights.length > 0 && (
        <ul className="research-highlights">
          {result.highlights.slice(0, 3).map((highlight, index) => (
            <li key={index}>{highlight}</li>
          ))}
        </ul>
      )}
      <div className="research-actions">
        <button className="button-secondary" type="button" onClick={toggleContent} disabled={extracting}>
          <FileText size={14} aria-hidden="true" />
          {extracting ? "Extracting…" : open ? "Hide extracted content" : "View extracted content"}
        </button>
        {extracting && <LoadingSpinner label="Firecrawl is reading this source…" />}
        {error && <span className="research-status" role="alert">{error}</span>}
      </div>
      {open && markdown && <ExtractedContent markdown={markdown} maxHeight={420} />}
    </article>
  );
}
