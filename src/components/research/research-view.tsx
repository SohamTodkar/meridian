"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FlaskConical } from "lucide-react";
import { KineticText } from "@/components/motion/kinetic-text";
import { SearchBar } from "@/components/research/search-bar";
import { ResultCard, type ResultCardData } from "@/components/research/result-card";
import { LoadingSpinner } from "@/components/research/loading-spinner";
import { RiveFrame } from "@/components/rive/rive-frame";
import type { ResearchApiError, ResearchCombinedResult, ResearchScrapeData, ResearchSearchResult } from "@/components/research/types";

/**
 * The Research desk (directive PDF-2 §3): Exa neural discovery + Firecrawl
 * extraction, surfaced through Meridian's quiet interface.
 *
 * Boundary kept with the product's philosophy: this page makes *explicit,
 * user-initiated* requests to public-web services through the local API
 * routes. Learning records, journals, evidence — nothing personal is ever
 * sent; only the query you type. API keys live server-side only.
 */

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" as const } },
};

export function ResearchView() {
  const [mode, setMode] = useState<"idle" | "searching" | "deep" | "ready" | "error">("idle");
  const [results, setResults] = useState<ResultCardData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const runSearch = useCallback(async (query: string, deep: boolean) => {
    setError(null);
    setNotice(null);
    setResults([]);
    setMode(deep ? "deep" : "searching");
    try {
      const endpoint = deep ? "/api/research/combined" : "/api/research/search";
      const body = deep ? { query, numResults: 5, scrapeDepth: "basic" } : { query, numResults: 10 };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as
        | { results: ResearchSearchResult[] | ResearchCombinedResult[]; cached?: boolean }
        | ResearchApiError;

      if (!response.ok || "error" in payload) {
        const message = "error" in payload ? payload.error : `Request failed (${response.status}).`;
        setError(message);
        setMode("error");
        return;
      }
      const mapped: ResultCardData[] = (payload.results as Array<ResearchSearchResult | ResearchCombinedResult>).map((item) =>
        deep && "highlights" in item && "markdown" in item
          ? ({ mode: "combined", ...item } as ResultCardData)
          : ({ mode: "search", ...item } as ResultCardData),
      );
      setResults(mapped);
      setNotice(payload.cached ? "Served from the local cache." : null);
      setMode("ready");
    } catch (requestError) {
      setError(`Could not reach the research pipeline: ${(requestError as Error).message}`);
      setMode("error");
    }
  }, []);

  const extract = useCallback(async (url: string): Promise<string | null> => {
    try {
      const response = await fetch("/api/research/scrape", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown"] }),
      });
      const payload = (await response.json()) as { data?: ResearchScrapeData } | ResearchApiError;
      if (!response.ok || !("data" in payload) || !payload.data) return null;
      return payload.data.markdown;
    } catch {
      return null;
    }
  }, []);

  const configuredAway = error?.includes("not configured");

  return (
    <div className="content">
      <div className="research-head">
        <div className="page-kicker eyebrow">Research desk · explicit public-web queries</div>
        <h1 className="page-title">
          <KineticText as="span" trigger="view">Search the living web.</KineticText>
        </h1>
        <p className="page-intro">
          Exa finds the ten most relevant sources for a question; Firecrawl reads them and brings back clean text.
          Deep search does both in one pass.
        </p>
        <div className="research-note">
          <FlaskConical size={14} aria-hidden="true" />
          <span>
            These queries go out to Exa and Firecrawl through this machine’s server — the query text only.
            Your learning record, journal, and evidence never leave this device.
          </span>
        </div>
      </div>

      <SearchBar onSearch={runSearch} busy={mode === "searching" || mode === "deep"} />

      <div aria-live="polite">
        {(mode === "searching" || mode === "deep") && (
          <div style={{ marginTop: 22 }}>
            <LoadingSpinner label={mode === "deep" ? "Exa is finding sources · Firecrawl is reading them…" : "Exa is finding sources…"} />
          </div>
        )}

        {mode === "error" && error && (
          <div className="research-error" role="alert">
            <strong>Research pipeline unavailable.</strong>
            <p style={{ margin: "8px 0 0" }}>{error}</p>
            {configuredAway && (
              <p style={{ margin: "10px 0 0" }}>
                Add <code className="mono">EXA_API_KEY</code> and <code className="mono">FIRECRAWL_API_KEY</code> to
                <code className="mono"> .env.local</code> in the Meridian folder and restart the server.
                Everything else in Meridian keeps working without them.
              </p>
            )}
          </div>
        )}

        {mode === "ready" && (
          <>
            {notice && <p className="research-status" style={{ marginTop: 18 }}>{notice}</p>}
            <div className="research-results" role="list" aria-label="Research results">
              <AnimatePresence initial={false}>
                <motion.div variants={listVariants} initial="hidden" animate="visible" key={results.length}>
                  {results.map((result) => (
                    <motion.div variants={cardVariants} key={result.url} role="listitem">
                      <ResultCard result={result} onExtract={extract} />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}

        {mode === "idle" && (
          <div className="lx-empty" style={{ marginTop: 30 }}>
            <RiveFrame label="Idle orbit animation" scrollBound />
            <div>
              <strong>The desk is quiet.</strong>
              <p className="hint">Ask a question above — for example, “best practices for retrieval practice spacing”.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
