/**
 * Exa neural-search service (directive PDF-2 §1).
 *
 * Implemented with native fetch against the documented Exa REST API
 * (https://api.exa.ai/search) — the directive allows the SDK or raw fetch;
 * raw fetch keeps the dependency surface at zero and works on every runtime.
 * Server-side only: the API key never crosses to the client.
 */

import { getResearchEnv } from "@/lib/env";

const EXA_SEARCH_ENDPOINT = "https://api.exa.ai/search";
const REQUEST_TIMEOUT_MS = 20_000;

export interface ExaSearchResult {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  score?: number;
  highlights?: string[];
  text?: string;
}

export interface ExaSearchOptions {
  numResults?: number;
  type?: "auto" | "neural" | "keyword";
}

export class ExaError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ExaError";
  }
}

export async function searchWithExa(query: string, options: ExaSearchOptions = {}): Promise<ExaSearchResult[]> {
  const env = getResearchEnv();
  if (!env.configured && !process.env.EXA_API_KEY) {
    throw new ExaError("EXA_API_KEY is not configured on this Meridian instance.", 503);
  }
  const apiKey = process.env.EXA_API_KEY ?? (env.configured ? env.exaKey : undefined);
  if (!apiKey) throw new ExaError("EXA_API_KEY is not configured on this Meridian instance.", 503);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(EXA_SEARCH_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        query,
        numResults: options.numResults ?? 10,
        type: options.type ?? "auto",
        contents: { highlights: true },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new ExaError(`Exa search failed (${response.status}): ${body.slice(0, 300)}`, response.status);
    }

    const payload = (await response.json()) as { results?: ExaSearchResult[] };
    return (payload.results ?? []).map((result) => ({
      title: result.title ?? result.url,
      url: result.url,
      publishedDate: result.publishedDate,
      author: result.author,
      score: result.score,
      highlights: result.highlights ?? [],
      text: result.text,
    }));
  } catch (error) {
    if (error instanceof ExaError) throw error;
    if ((error as Error).name === "AbortError") throw new ExaError("Exa search timed out.", 504);
    throw new ExaError(`Exa search failed: ${(error as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }
}
