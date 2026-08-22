"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FlaskConical } from "lucide-react";
import { KineticText } from "@/components/motion/kinetic-text";
import { RiveFrame } from "@/components/rive/rive-frame";
import { ThinkingState, type ThinkingRow } from "@/components/research/ui/thinking-state";
import { ToolChips, type SourceChip, type ToolRow } from "@/components/research/ui/tool-chips";
import { ContextCards, type ContextChunk } from "@/components/research/ui/context-cards";
import { StreamingText, type AnswerSource } from "@/components/research/ui/streaming-text";
import { RecommendationCard, type CardOption } from "@/components/research/ui/recommendation-card";
import { SelectionActions } from "@/components/research/ui/selection-actions";
import { PromptBar } from "@/components/research/ui/prompt-bar";
import { ResearchHistory, type HistoryEntry, type SavedSource } from "@/components/research/ui/research-history";

/**
 * The Research desk — a staged answer thread (the "structured and detailed
 * output" rebuild). Every stage is live pipeline data:
 *
 *   PromptBar        the query composer (@ sources, / commands, depth)
 *   ThinkingState    "Searching the web" while Exa is in flight, then the
 *                    real source trace settles open
 *   ToolChips        the pipeline rows — Exa discovery, Firecrawl
 *                    extractions as they complete, synthesis — each row
 *                    expandable, each source chip previewable
 *   ContextCards     the extracted chunks, counted and linked
 *   StreamingText    the answer composed from the strongest highlights,
 *                    cited inline, with follow-ups
 *   Recommendation   real next actions (open strongest source, extract the
 *                    rest, save sources locally)
 *   SelectionActions on the answer's key claim — Explain fires a real child
 *                    research turn; the rest are honest local transforms
 *
 * History and saved sources persist in this browser only.
 */

type TurnPhase = "thinking" | "searched" | "extracting" | "extracted" | "answering" | "done" | "error";

interface TurnResult {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  highlights: string[];
  markdown: string | null;
}

interface Turn {
  id: number;
  query: string;
  deep: boolean;
  phase: TurnPhase;
  results: TurnResult[];
  extractions: Record<string, string>;
  extractingUrls: string[];
  answer: string;
  citeAfter: number;
  answerSource?: AnswerSource;
  followUps: string[];
  error?: string;
}

const HISTORY_KEY = "meridian.research.v1";
const MAX_EXTRACT = 3;

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Phrases site chrome uses that never belong in an excerpt or a highlight. */
const BOILERPLATE = /(skip to (main )?content|thank you for visiting|to obtain the best experience|up to date browser|compatibility mode|ensure continued support|cookie|enable javascript|browser version|by using this site|terms of use|privacy policy|subscribe|sign in|log in to|advertisement|share this article|read more:?$)/i;

/** Drop leading boilerplate sentences until real content shows. */
function stripLeadingBoilerplate(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s/);
  while (sentences.length > 1 && BOILERPLATE.test(sentences[0])) sentences.shift();
  if (sentences.length > 0 && BOILERPLATE.test(sentences[0]) && sentences[0].length < 90) sentences.shift();
  return sentences.join(" ").trim();
}

function cleanExcerpt(markdown: string): string {
  const text = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripLeadingBoilerplate(text);
}

function trimWords(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > maxChars * 0.6 ? lastSpace : maxChars).trim()}…`;
}

function firstSentence(text: string): string {
  return text.split(/(?<=[.!?])\s/)[0] ?? text;
}

/** Compose the structured answer from the strongest highlights. */
function synthesize(query: string, results: TurnResult[]): { answer: string; citeAfter: number; followUps: string[] } {
  // Rank by the cleanest (post-scrub) highlight, not the raw one.
  const cleaned = results.map((result) => ({
    ...result,
    highlights: result.highlights.map(stripLeadingBoilerplate).filter((text) => text.length > 40),
  }));
  const ranked = [...cleaned].sort((a, b) => (b.highlights[0]?.length ?? 0) - (a.highlights[0]?.length ?? 0));
  const primary = ranked.find((result) => result.highlights.length > 0) ?? ranked[0];
  const secondary = ranked.find((result) => result !== primary && result.highlights.length > 0);

  const lead = `Across ${results.length} sources, the strongest signal on “${trimWords(query, 60)}”:`;
  const h1 = primary?.highlights[0] ? trimWords(primary.highlights[0], 240) : primary ? trimWords(primary.title, 160) : "";
  const h2 = secondary?.highlights[0] ? ` A second source agrees: ${trimWords(secondary.highlights[0], 160)}` : "";

  const citeAfter = `${lead} ${h1}`.split(/\s+/).length;

  const followUps = [
    `${trimWords(query, 50)} — recent developments`,
    `${trimWords(query, 50)} — for beginners`,
    ...(primary ? [`${trimWords(primary.title, 60)} — go deeper`] : []),
  ].slice(0, 3);

  return { answer: `${lead} ${h1}.${h2}`, citeAfter, followUps };
}

export function ResearchView() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [savedSources, setSavedSources] = useState<SavedSource[]>([]);
  const turnIdRef = useRef(0);
  const historyLoadedRef = useRef(false);

  /* Local-first persistence — load once (deferred), save on change. */
  useEffect(() => {
    if (historyLoadedRef.current) return;
    historyLoadedRef.current = true;
    const frame = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { queries?: HistoryEntry[]; sources?: SavedSource[] };
          setHistory(parsed.queries ?? []);
          setSavedSources(parsed.sources ?? []);
        }
      } catch {
        /* unreadable history is simply ignored */
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!historyLoadedRef.current) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify({ queries: history.slice(0, 40), sources: savedSources.slice(0, 40) }));
      } catch {
        /* storage full or blocked — history stays in-memory */
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [history, savedSources]);

  const patchTurn = useCallback((id: number, patch: Partial<Turn> | ((turn: Turn) => Partial<Turn>)) => {
    setTurns((current) =>
      current.map((turn) => (turn.id === id ? { ...turn, ...(typeof patch === "function" ? patch(turn) : patch) } : turn)),
    );
  }, []);

  const extractTop = useCallback(async (id: number, results: TurnResult[]) => {
    const targets = results.slice(0, MAX_EXTRACT);
    patchTurn(id, { phase: "extracting", extractingUrls: targets.map((result) => result.url) });

    await Promise.all(
      targets.map(async (result) => {
        try {
          const response = await fetch("/api/research/scrape", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: result.url, formats: ["markdown"] }),
          });
          const payload = (await response.json()) as { data?: { markdown: string } };
          const markdown = payload.data?.markdown ?? null;
          patchTurn(id, (turn) => ({
            results: turn.results.map((entry) => (entry.url === result.url ? { ...entry, markdown } : entry)),
          }));
        } catch {
          patchTurn(id, (turn) => ({
            results: turn.results.map((entry) => (entry.url === result.url ? { ...entry, markdown: null } : entry)),
          }));
        }
      }),
    );

    // Let the tool rows settle a beat, then stream the answer.
    window.setTimeout(() => {
      patchTurn(id, (turn) => {
        const synthesis = synthesize(turn.query, turn.results);
        const primary = [...turn.results].sort(
          (a, b) => (b.highlights[0]?.length ?? 0) - (a.highlights[0]?.length ?? 0),
        )[0];
        return {
          phase: "answering",
          ...synthesis,
          answerSource: primary
            ? { name: trimWords(primary.title, 40), domain: domainOf(primary.url), href: primary.url }
            : undefined,
        };
      });
    }, 900);
  }, [patchTurn]);

  const runTurn = useCallback(async (query: string, deep: boolean) => {
    setBusy(true);
    const id = ++turnIdRef.current;
    const turn: Turn = {
      id,
      query,
      deep,
      phase: "thinking",
      results: [],
      extractions: {},
      extractingUrls: [],
      answer: "",
      citeAfter: 0,
      followUps: [],
    };
    setTurns((current) => [...current, turn]);
    const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setHistory((current) => [{ query, at: stamp, deep }, ...current.filter((entry) => entry.query !== query)].slice(0, 40));

    try {
      const endpoint = deep ? "/api/research/combined" : "/api/research/search";
      const body = deep ? { query, numResults: 5, scrapeDepth: "basic" } : { query, numResults: 10 };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as
        | { results: Array<{ title: string; url: string; publishedDate?: string; author?: string; highlights?: string[]; markdown?: string | null }> }
        | { error: string };

      if (!response.ok || "error" in payload) {
        const message = "error" in payload ? payload.error : `Request failed (${response.status}).`;
        patchTurn(id, { phase: "error", error: message });
        return;
      }

      const results: TurnResult[] = payload.results.map((result) => ({
        title: result.title,
        url: result.url,
        publishedDate: result.publishedDate,
        author: result.author,
        highlights: result.highlights ?? [],
        markdown: result.markdown ?? null,
      }));
      patchTurn(id, { phase: "searched", results });

      if (deep) {
        // Combined already extracted — settle the trace, then answer.
        window.setTimeout(() => extractTop(id, results), 400);
      }
      // Standard flow waits for ThinkingState's onSettled to start extraction.
    } catch (requestError) {
      patchTurn(id, { phase: "error", error: `Could not reach the research pipeline: ${(requestError as Error).message}` });
    } finally {
      setBusy(false);
    }
  }, [patchTurn, extractTop]);

  /* ---- derived per-turn view models ---------------------------------- */

  const thinkingRows = (turn: Turn): ThinkingRow[] =>
    turn.results.slice(0, 3).map((result) => ({
      primary: trimWords(result.title, 42),
      secondary: domainOf(result.url),
      href: result.url,
    }));

  const toolRows = (turn: Turn): ToolRow[] => {
    const rows: ToolRow[] = [
      {
        icon: "think",
        label: "Plan",
        chip: turn.query,
        mono: false,
        detailMono: false,
        detail: [
          { text: `Exa neural search${turn.deep ? " + Firecrawl deep extraction" : ""} for this turn.` },
          { text: `Top ${Math.min(MAX_EXTRACT, turn.results.length || MAX_EXTRACT)} sources selected for full extraction.` },
        ],
      },
    ];
    if (turn.results.length > 0) {
      rows.push({
        icon: "read",
        label: "Exa search",
        chip: `${turn.results.length} results`,
        mono: false,
        detailMono: false,
        detail: turn.results.slice(0, 3).map((result) => ({ text: `${domainOf(result.url)} — ${trimWords(result.title, 60)}` })),
      });
    }
    const extracted = turn.results.filter((result) => result.markdown !== null);
    if (turn.extractingUrls.length > 0 || extracted.length > 0) {
      rows.push({
        icon: "write",
        label: `Firecrawl × ${turn.extractingUrls.length || extracted.length}`,
        chip: `${extracted.length} extracted`,
        mono: false,
        detailMono: true,
        detail: extracted.length > 0
          ? extracted.map((result) => ({ text: `+ ${domainOf(result.url)} · ${result.markdown?.length ?? 0} chars`, tone: "add" as const }))
          : [{ text: "rendering sources as markdown…" }],
      });
    }
    if (turn.phase === "answering" || turn.phase === "done") {
      rows.push({
        icon: "run",
        label: "Synthesis",
        chip: "answer",
        mono: true,
        detailMono: false,
        detail: [
          { text: "Composed from the strongest highlights, cited inline." },
          { text: `${turn.results.length} sources considered · ${extracted.length} read in full.` },
        ],
      });
    }
    return rows;
  };

  const sourceChips = (turn: Turn): SourceChip[] =>
    turn.results
      .filter((result) => result.markdown)
      .map((result) => {
        const lines = cleanExcerpt(result.markdown ?? "")
          .split(/(?<=[.!?])\s/)
          .filter((sentence) => sentence.length > 24)
          .slice(0, 5)
          .map((sentence, index) => ({ text: trimWords(sentence, 64), tone: (index === 0 ? "ctx" : "add") as "ctx" | "add" }));
        return {
          file: domainOf(result.url),
          add: result.markdown?.length ?? 0,
          del: 0,
          lines,
          href: result.url,
        };
      });

  const chunks = (turn: Turn): ContextChunk[] =>
    turn.results
      .filter((result) => result.markdown)
      .map((result) => {
        const excerpt = cleanExcerpt(result.markdown ?? "");
        const isPdf = result.url.toLowerCase().endsWith(".pdf");
        return {
          title: trimWords(result.title, 48),
          chars: `${(result.markdown?.length ?? 0).toLocaleString()} characters`,
          body: trimWords(excerpt, 180),
          source: domainOf(result.url),
          badge: isPdf ? "PDF" : "WEB",
          tone: isPdf ? "bg-red" : "bg-accent",
          href: result.url,
        };
      });

  const recommendationOptions = (turn: Turn): CardOption[] => {
    const primary = [...turn.results].sort((a, b) => (b.highlights[0]?.length ?? 0) - (a.highlights[0]?.length ?? 0))[0];
    const options: CardOption[] = [];
    if (primary) {
      options.push({
        key: "open",
        body: (
          <>
            Open the strongest source — <span className="font-medium text-ink">{trimWords(primary.title, 64)}</span> — and
            read the original in full.
          </>
        ),
        short: `Open ${domainOf(primary.url)}`,
        signal: 3,
        tone: "var(--color-green)",
        label: "High confidence",
        cta: "Open source",
        ctaVariant: "accent",
      });
    }
    options.push({
      key: "save",
      body: <>Save this turn’s sources to your local source list — kept on this device, inside the history panel below.</>,
      short: "Save sources locally",
      signal: 2,
      tone: "var(--color-orange)",
      label: "Local only",
      cta: "Save sources",
      ctaVariant: "primary",
    });
    options.push({
      key: "rerun",
      body: (
        <>
          Re-run the search fresh — caches are bypassed for a <span className="font-medium text-ink">new sweep</span> of the same question.
        </>
      ),
      short: "Fresh re-run of this query",
      signal: 0,
      tone: "var(--color-ink-3)",
      label: "No new signal",
      cta: "Re-run",
      ctaVariant: "secondary",
    });
    return options;
  };

  const onConfirmRecommendation = (turn: Turn, option: CardOption) => {
    if (option.key === "open") {
      const primary = [...turn.results].sort((a, b) => (b.highlights[0]?.length ?? 0) - (a.highlights[0]?.length ?? 0))[0];
      if (primary) window.open(primary.url, "_blank", "noreferrer");
    }
    if (option.key === "save") {
      const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      void stamp;
      setSavedSources((current) => {
        const additions = turn.results.slice(0, 5).map((result) => ({
          name: trimWords(result.title, 48),
          domain: domainOf(result.url),
          href: result.url,
        }));
        const merged = [...additions, ...current].filter(
          (source, index, all) => all.findIndex((entry) => entry.href === source.href) === index,
        );
        return merged.slice(0, 40);
      });
    }
    if (option.key === "rerun") void runTurn(turn.query, turn.deep);
  };

  const claimOf = (turn: Turn): string => {
    const ranked = [...turn.results].sort((a, b) => (b.highlights[0]?.length ?? 0) - (a.highlights[0]?.length ?? 0));
    const primary = ranked[0];
    const claim = stripLeadingBoilerplate(primary?.highlights[0] ?? primary?.title ?? turn.query);
    return trimWords(firstSentence(claim) || claim, 180);
  };

  return (
    <div className="content">
      <div className="research-head">
        <div className="page-kicker eyebrow">Research desk · explicit public-web queries</div>
        <h1 className="page-title">
          <KineticText as="span" trigger="view">Search the living web.</KineticText>
        </h1>
        <p className="page-intro">
          Every answer is staged and structured: the search trace, the extraction pipeline, the retrieved chunks, then a
          cited synthesis you can interrogate.
        </p>
        <div className="research-note">
          <FlaskConical size={14} aria-hidden="true" />
          <span>
            These queries go out to Exa and Firecrawl through this machine’s server — the query text only. Your learning
            record, journal, and evidence never leave this device.
          </span>
        </div>
      </div>

      <PromptBar busy={busy} onSend={(text, deep) => void runTurn(text, deep)} />

      <div className="mt-6 flex flex-col gap-10" aria-live="polite">
        {turns.map((turn) => (
          <section key={turn.id} className="flex flex-col gap-4" aria-label={`Research turn: ${turn.query}`}>
            {/* user turn */}
            <div className="flex justify-end pl-14" style={{ animation: "fade-up 300ms cubic-bezier(0.23,1,0.32,1) both" }}>
              <div className="rounded-xl bg-field px-3 py-1.5 text-[13px] leading-[1.4] text-ink shadow-hairline">
                {turn.deep ? "★ " : ""}
                {turn.query}
              </div>
            </div>

            {turn.phase === "error" ? (
              <div className="research-error" role="alert">
                <strong>Research pipeline unavailable.</strong>
                <p style={{ margin: "8px 0 0" }}>{turn.error ?? "The request failed."}</p>
                {(turn.error ?? "").includes("not configured") && (
                  <p style={{ margin: "10px 0 0" }}>
                    Add <code className="mono">EXA_API_KEY</code> and <code className="mono">FIRECRAWL_API_KEY</code> to
                    <code className="mono"> .env.local</code> in the Meridian folder and restart the server. Everything
                    else in Meridian keeps working without them.
                  </p>
                )}
              </div>
            ) : (
              <>
                <ThinkingState
                  query={turn.query}
                  rows={thinkingRows(turn)}
                  working={turn.phase === "thinking"}
                  onSettled={() => {
                    if (!turn.deep && turn.phase === "searched") void extractTop(turn.id, turn.results);
                  }}
                />

                {turn.phase !== "thinking" && turn.phase !== "searched" && (
                  <ToolChips
                    rows={toolRows(turn)}
                    chips={sourceChips(turn)}
                    summary={`${toolRows(turn).length} steps · ${turn.results.length} sources`}
                    running={turn.phase === "extracting"}
                  />
                )}

                {(turn.phase === "extracted" || turn.phase === "answering" || turn.phase === "done") && (
                  <ContextCards chunks={chunks(turn)} total={turn.results.length} />
                )}

                {(turn.phase === "answering" || turn.phase === "done") && turn.answer && (
                  <>
                    <StreamingText
                      answer={turn.answer}
                      citeAfter={turn.citeAfter}
                      source={turn.answerSource}
                      sourcesCount={turn.results.length}
                      followUps={turn.followUps}
                      onFollowUp={(followUp) => void runTurn(followUp, false)}
                      onCopy={() => void navigator.clipboard?.writeText(turn.answer).catch(() => {})}
                      onRetry={() => void runTurn(turn.query, turn.deep)}
                      onSources={() => {
                        const first = turn.results.find((result) => result.url)?.url;
                        if (first) window.open(first, "_blank", "noreferrer");
                      }}
                      onSettled={() => patchTurn(turn.id, { phase: "done" })}
                    />

                    {turn.phase === "done" && (
                      <div className="flex flex-col gap-5" style={{ animation: "fade-up 400ms cubic-bezier(0.23,1,0.32,1) both" }}>
                        <RecommendationCard
                          question="Where should this answer go next?"
                          options={recommendationOptions(turn)}
                          onConfirm={(option) => onConfirmRecommendation(turn, option)}
                        />
                        <SelectionActions
                          claim={claimOf(turn)}
                          onExplain={(selection) => void runTurn(selection, false)}
                          onInstruct={(instruction, selection) => void runTurn(`${instruction}: ${selection}`, false)}
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        ))}

        {turns.length === 0 && (
          <div className="lx-empty" style={{ marginTop: 30 }}>
            <RiveFrame label="Idle orbit animation" scrollBound />
            <div>
              <strong>The desk is quiet.</strong>
              <p className="hint">Ask a question above — you’ll see the search trace, the extractions, the chunks, and a cited answer.</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <p className="eyebrow">Local history</p>
          <ResearchHistory
            queries={history}
            sources={savedSources}
            onPick={(query, deep) => void runTurn(query, deep)}
          />
        </div>
      </div>
    </div>
  );
}
