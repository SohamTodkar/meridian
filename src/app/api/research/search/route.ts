import { z } from "zod";
import { searchWithExa } from "@/lib/services/exa";
import { handleResearchRequest, jsonResponse } from "@/lib/services/route-helpers";
import { cacheGet, cacheKey, cacheSet, TTL } from "@/lib/research-cache";

/**
 * POST /api/research/search — Exa neural search.
 * Body: { query, numResults?, type? } · Cache: 10 minutes.
 */

export const runtime = "nodejs";

const searchSchema = z.object({
  query: z.string().trim().min(2).max(400),
  numResults: z.number().int().min(1).max(10).default(10),
  type: z.enum(["auto", "neural", "keyword"]).default("auto"),
});

export async function POST(request: Request) {
  return handleResearchRequest(request, searchSchema, async (input) => {
    const key = cacheKey("exa", input.query, input.numResults, input.type);
    const cached = cacheGet<Awaited<ReturnType<typeof searchWithExa>>>(key);
    if (cached) return jsonResponse({ results: cached, cached: true });

    const results = await searchWithExa(input.query, { numResults: input.numResults, type: input.type });
    cacheSet(key, results, TTL.search);
    return jsonResponse({ results, cached: false });
  });
}
