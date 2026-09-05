"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  Check,
  Globe2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { model } from "@/data";
import { useCloudStore } from "@/state/cloud";
import { useMeridianStore } from "@/state/store";

type Source = {
  title: string;
  url: string;
  highlights: readonly string[];
  markdown: string | null;
  phase?: string;
  scrapeError?: string;
};
const shelf = Array.from(
  new Map(
    model.phases.flatMap(phase =>
      phase.resources
        .filter(resource => resource.url)
        .map(
          resource =>
            [
              resource.url!,
              {
                title: resource.name,
                url: resource.url!,
                highlights: [
                  resource.why ??
                    resource.note ??
                    resource.role ??
                    phase.identity.summary,
                ],
                markdown: null,
                phase: phase.identity.northstarName,
              },
            ] as const
        )
    )
  ).values()
);
export function ResearchView() {
  const cloud = useCloudStore();
  const state = useMeridianStore();
  const [mode, setMode] = useState<"library" | "web">("library");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [results, setResults] = useState<Source[]>(shelf);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Source | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const webAvailable = cloud.research && !cloud.visitor;
  async function search(event?: FormEvent) {
    event?.preventDefault();
    if (query.trim().length < 2) {
      setError("Enter at least two characters to search.");
      return;
    }
    setError("");
    setSelected(null);
    setSubmitted(query.trim());
    if (mode === "library") {
      const words = query.toLowerCase().trim().split(/\s+/);
      setResults(
        shelf.filter(source =>
          words.every(word =>
            `${source.title} ${source.highlights.join(" ")} ${source.phase}`
              .toLowerCase()
              .includes(word)
          )
        )
      );
      return;
    }
    controller.current?.abort();
    controller.current = new AbortController();
    const timer = setTimeout(() => controller.current?.abort(), 90000);
    setBusy(true);
    try {
      const response = await fetch("/api/research/combined/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          numResults: 5,
          scrapeDepth: "basic",
        }),
        signal: controller.current.signal,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Search couldn’t finish. Try again.");
      setResults(result.results);
    } catch (e) {
      setError(
        (e as Error).name === "AbortError"
          ? "Search stopped. You can try again whenever you’re ready."
          : (e as Error).message
      );
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  }
  function save(source: Source) {
    const existing = state.evidence?.find(e => e.url === source.url);
    if (!existing)
      state.addEvidence({
        id: `research.${crypto.randomUUID()}`,
        kind: "link",
        title: source.title,
        url: source.url,
        note: source.highlights.join("\n").slice(0, 5000),
        proofStatus: "captured",
        capability: source.phase,
      });
    setSaved(v => [...v, source.url]);
  }
  function changeMode(next: "library" | "web") {
    setMode(next);
    setError("");
    setSubmitted("");
    setResults(next === "library" ? shelf : []);
    setSelected(null);
  }
  return (
    <div className="content research-desk">
      <div className="dashboard-heading">
        <div>
          <div className="eyebrow">FOLLOW YOUR CURIOSITY</div>
          <h1>
            Better questions. Clearer sources
            <span className="greeting-dot">.</span>
          </h1>
          <p>A research desk connected to what you’re learning.</p>
        </div>
        <span className="mini-icon">
          <Sparkles size={23} />
        </span>
      </div>
      <section className="obs-panel research-composer">
        <div className="research-modes">
          <button
            className={mode === "library" ? "active" : ""}
            onClick={() => changeMode("library")}
          >
            <BookOpen size={16} />
            Your library
          </button>
          <button
            className={mode === "web" ? "active" : ""}
            disabled={!webAvailable}
            onClick={() => changeMode("web")}
          >
            <Globe2 size={16} />
            Web sources{!webAvailable && <span>Not connected</span>}
          </button>
        </div>
        <form onSubmit={search}>
          <Search size={20} />
          <input
            aria-label="Research query"
            placeholder={
              mode === "library"
                ? "Find a concept, course, or tool…"
                : "What would you like to understand?"
            }
            value={query}
            onChange={e => setQuery(e.target.value)}
            maxLength={400}
          />
          <button className="button-primary" disabled={busy} type="submit">
            {busy ? "Searching…" : "Explore"}
            <ArrowRight size={17} />
          </button>
        </form>
        <div className="research-helper">
          <span>
            {mode === "library"
              ? `${shelf.length} curated resources from your curriculum`
              : "Exa discovers sources · Firecrawl extracts the original text"}
          </span>
          {!webAvailable && (
            <Link href="/settings">
              Connect web research
              <ArrowUpRight size={12} />
            </Link>
          )}
        </div>
      </section>
      <div className="research-suggestions">
        {["Python", "machine learning", "mathematics", "AI safety"].map(
          topic => (
            <button
              key={topic}
              onClick={() => {
                setQuery(topic);
                if (mode === "library") {
                  setResults(
                    shelf.filter(s =>
                      `${s.title} ${s.highlights.join(" ")} ${s.phase}`
                        .toLowerCase()
                        .includes(topic)
                    )
                  );
                  setSubmitted(topic);
                }
              }}
            >
              {topic}
              <ArrowUpRight size={12} />
            </button>
          )
        )}
      </div>
      {error && (
        <div className="research-notice" role="alert">
          {error}
          <button
            className="text-link"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {busy && (
        <section className="obs-panel research-loading" role="status">
          <span className="mini-icon">
            <Globe2 size={22} />
          </span>
          <div>
            <h2>Following the sources.</h2>
            <p>
              Discovering relevant pages and reading their contents. This can
              take a minute.
            </p>
          </div>
          <button
            className="button-secondary"
            onClick={() => controller.current?.abort()}
          >
            Stop search
          </button>
        </section>
      )}
      <div className="research-results-heading">
        <h2>
          {submitted
            ? `Sources for “${submitted}”`
            : mode === "library"
              ? "A shelf worth exploring"
              : "Your next discovery starts with a question"}
        </h2>
        <span>{results.length} sources</span>
      </div>
      <div className={`research-layout ${selected ? "has-excerpt" : ""}`}>
        <div className="research-source-list">
          {results.map((source, index) => (
            <article className="obs-panel research-source" key={source.url}>
              <div className="source-topline">
                <span>
                  {String(index + 1).padStart(2, "0")}{" "}
                  <span className="label-dot">/</span>{" "}
                  {new URL(source.url).hostname.replace(/^www\./, "")}
                </span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${source.title}`}
                >
                  <ArrowUpRight size={18} />
                </a>
              </div>
              <h3>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
              </h3>
              <p>
                {source.highlights[0] ??
                  "Open this source to read the original."}
              </p>
              <div className="research-source-actions">
                <span className="pill-violet">
                  {source.phase ?? "WEB SOURCE"}
                </span>
                {source.markdown && (
                  <button
                    className="text-link"
                    onClick={() => setSelected(source)}
                  >
                    Read extraction
                  </button>
                )}
                <button
                  className="text-link accent-link"
                  onClick={() => save(source)}
                >
                  {saved.includes(source.url) ||
                  state.evidence?.some(e => e.url === source.url) ? (
                    <>
                      <Check size={14} />
                      Saved
                    </>
                  ) : (
                    <>
                      <Bookmark size={14} />
                      Save source
                    </>
                  )}
                </button>
              </div>
              {source.scrapeError && (
                <p className="source-extraction-note">
                  Extraction unavailable. You can still open the original
                  source.
                </p>
              )}
            </article>
          ))}
          {!results.length && !busy && (
            <div className="empty-state">
              <BookOpen size={28} />
              <p>
                {submitted
                  ? "No matches yet. Try a broader concept or a course name."
                  : "Search the web to collect relevant sources here."}
              </p>
            </div>
          )}
        </div>
        {selected && (
          <aside className="obs-panel extracted-reader">
            <div className="panel-heading">
              <h2>Source extraction</h2>
              <button
                className="icon-button"
                aria-label="Close extraction"
                onClick={() => setSelected(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="markdown-body">
              <h3>{selected.title}</h3>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ children, ...props }) => (
                    <a {...props} target="_blank" rel="noreferrer">
                      {children}
                    </a>
                  ),
                  img: () => null,
                }}
              >
                {selected.markdown}
              </ReactMarkdown>
            </div>
            <a
              className="text-link accent-link"
              href={selected.url}
              target="_blank"
              rel="noreferrer"
            >
              Read original
              <ArrowUpRight size={16} />
            </a>
          </aside>
        )}
      </div>
      <p className="research-footnote">
        Read critically. Excerpts are source material; they haven’t been
        independently verified.
      </p>
    </div>
  );
}
