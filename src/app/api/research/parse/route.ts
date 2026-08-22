import { z } from "zod";
import { scrapeWithFirecrawl } from "@/lib/services/firecrawl";
import { handleResearchRequest, jsonResponse } from "@/lib/services/route-helpers";

/**
 * POST /api/research/parse — document parsing (directive PDF-2 §2 route 4).
 *
 * Implementation note: Firecrawl's dedicated /v1/parse endpoint accepts
 * multipart/form-data for local files. In a server route the practical,
 * documented path for remotely hosted documents (PDFs, docs hosted at URLs)
 * is the scrape endpoint with markdown+html formats, which runs Firecrawl's
 * document parsing server-side. This route therefore accepts { fileUrl } and
 * returns both representations. Local-file multipart upload is intentionally
 * not exposed: Meridian never uploads a user's local files anywhere — that
 * boundary is part of the product's privacy philosophy.
 */

export const runtime = "nodejs";

const parseSchema = z.object({
  fileUrl: z
    .string()
    .trim()
    .url()
    .refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
      message: "fileUrl must be an http(s) URL to a hosted document.",
    }),
});

export async function POST(request: Request) {
  return handleResearchRequest(request, parseSchema, async (input) => {
    const data = await scrapeWithFirecrawl(input.fileUrl, { formats: ["markdown", "html"], onlyMainContent: false });
    return jsonResponse({ success: true, data });
  });
}
