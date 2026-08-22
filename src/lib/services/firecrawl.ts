/**
 * Firecrawl extraction service (directive PDF-2 §1).
 *
 * Native fetch against the Firecrawl v1 REST API
 * (https://api.firecrawl.dev/v1/scrape). Firecrawl renders JavaScript, walks
 * sub-pages when asked, and returns clean markdown plus metadata — the
 * extraction half of the Exa → Firecrawl pipeline. Server-side only.
 */

import { getResearchEnv } from "@/lib/env";

const FIRECRAWL_SCRAPE_ENDPOINT = "https://api.firecrawl.dev/v1/scrape";
const REQUEST_TIMEOUT_MS = 45_000;

export interface FirecrawlScrapeResult {
  markdown: string;
  html?: string;
  metadata: Record<string, unknown>;
}

export interface FirecrawlOptions {
  formats?: Array<"markdown" | "html" | "links" | "screenshot">;
  onlyMainContent?: boolean;
}

export class FirecrawlError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "FirecrawlError";
  }
}

export async function scrapeWithFirecrawl(url: string, options: FirecrawlOptions = {}): Promise<FirecrawlScrapeResult> {
  const env = getResearchEnv();
  const apiKey = process.env.FIRECRAWL_API_KEY ?? (env.configured ? env.firecrawlKey : undefined);
  if (!apiKey) {
    throw new FirecrawlError("FIRECRAWL_API_KEY is not configured on this Meridian instance.", 503);
  }

  const formats = options.formats ?? ["markdown"];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(FIRECRAWL_SCRAPE_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats,
        onlyMainContent: options.onlyMainContent ?? true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new FirecrawlError(`Firecrawl scrape failed (${response.status}): ${body.slice(0, 300)}`, response.status);
    }

    const payload = (await response.json()) as {
      success?: boolean;
      data?: { markdown?: string; html?: string; metadata?: Record<string, unknown> };
      error?: string;
    };

    if (!payload.success || !payload.data) {
      throw new FirecrawlError(payload.error || "Firecrawl scrape returned no data.");
    }

    return {
      markdown: payload.data.markdown ?? "",
      html: payload.data.html,
      metadata: payload.data.metadata ?? {},
    };
  } catch (error) {
    if (error instanceof FirecrawlError) throw error;
    if ((error as Error).name === "AbortError") throw new FirecrawlError("Firecrawl scrape timed out.", 504);
    throw new FirecrawlError(`Firecrawl scrape failed: ${(error as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }
}
