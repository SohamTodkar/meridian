import { z } from "zod";
import { scrapeWithFirecrawl } from "@/lib/services/firecrawl";
import { handleResearchRequest, jsonResponse } from "@/lib/services/route-helpers";
import { cacheGet, cacheKey, cacheSet, TTL } from "@/lib/research-cache";

/**
 * POST /api/research/scrape — Firecrawl extraction for one URL.
 * Body: { url, formats? } · Cache: 1 hour keyed url+formats.
 */

export const runtime = "nodejs";

const scrapeSchema = z.object({
  url: z.string().trim().url().refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
    message: "Only http(s) URLs can be extracted.",
  }),
  formats: z.array(z.enum(["markdown", "html", "links"])).min(1).default(["markdown"]),
});

export async function POST(request: Request) {
  return handleResearchRequest(request, scrapeSchema, async (input) => {
    const key = cacheKey("firecrawl", input.url, [...input.formats].sort().join(","));
    const cached = cacheGet<Awaited<ReturnType<typeof scrapeWithFirecrawl>>>(key);
    if (cached) return jsonResponse({ success: true, data: cached, cached: true });

    const data = await scrapeWithFirecrawl(input.url, { formats: input.formats });
    cacheSet(key, data, TTL.scrape);
    return jsonResponse({ success: true, data, cached: false });
  });
}
