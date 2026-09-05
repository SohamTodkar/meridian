import { z } from "zod";
import { searchWithExa, type ExaSearchResult } from "@/lib/services/exa";
import {
  scrapeWithFirecrawl,
  type FirecrawlScrapeResult,
} from "@/lib/services/firecrawl";
import {
  handleResearchRequest,
  jsonResponse,
} from "@/lib/services/route-helpers";

/**
 * POST /api/research/combined — the full pipeline:
 *   Exa discovers candidate URLs → Firecrawl extracts each one in parallel
 *   (Promise.allSettled; failed extractions come back as null, never failing
 *   the whole response).
 *
 * Body: { query, numResults? (default 5), scrapeDepth? }
 * Cache: intentionally NOT cached — this route is the expensive one and data
 * freshness matters (directive PDF-2 §6). The upstream /search and /scrape
 * routes still benefit from their own caches when used individually.
 */

export const runtime = "nodejs";

const combinedSchema = z.object({
  query: z.string().trim().min(2).max(400),
  numResults: z.number().int().min(1).max(5).default(5),
  scrapeDepth: z.enum(["basic", "full"]).default("basic"),
});

export interface CombinedResult {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  highlights: string[];
  markdown: string | null;
  metadata: Record<string, unknown> | null;
  scrapeError?: string;
}

export async function POST(request: Request) {
  return handleResearchRequest(request, combinedSchema, async input => {
    const searchResults = await searchWithExa(input.query, {
      numResults: input.numResults,
      type: "neural",
    });

    const extractions = await Promise.allSettled(
      searchResults.map(result =>
        scrapeWithFirecrawl(result.url, {
          formats:
            input.scrapeDepth === "full" ? ["markdown", "html"] : ["markdown"],
        })
      )
    );

    const results: CombinedResult[] = searchResults.map(
      (result: ExaSearchResult, index) => {
        const extraction = extractions[index];
        const scraped: FirecrawlScrapeResult | null =
          extraction.status === "fulfilled" ? extraction.value : null;
        return {
          title: result.title,
          url: result.url,
          publishedDate: result.publishedDate,
          author: result.author,
          highlights: result.highlights ?? [],
          markdown: scraped ? scraped.markdown : null,
          metadata: scraped ? scraped.metadata : null,
          scrapeError:
            extraction.status === "rejected"
              ? "This page could not be extracted. Open the source link to read it."
              : undefined,
        };
      }
    );

    return jsonResponse({ query: input.query, results });
  });
}
