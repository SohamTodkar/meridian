import { z } from "zod";

/**
 * Research-integration environment validation (directive PDF-2 §4).
 *
 * Design note: the directive's example parses `process.env` at module scope,
 * which would crash the entire local-first app on any machine without API
 * keys. That would break the base site ("no accounts, no runtime network"
 * remains the default posture). Instead we validate lazily and per-feature:
 * the research routes return an explicit 503 configuration error when keys
 * are absent, and every other part of Meridian keeps working offline.
 * Keys are read only on the server; nothing here is ever imported client-side.
 */

const researchEnvSchema = z.object({
  EXA_API_KEY: z.string().min(1).optional(),
  FIRECRAWL_API_KEY: z.string().min(1).optional(),
});

export type ResearchEnvConfiguration =
  | { configured: true; exaKey: string; firecrawlKey: string }
  | { configured: false; missing: string[] };

export function getResearchEnv(): ResearchEnvConfiguration {
  const parsed = researchEnvSchema.safeParse(process.env);
  if (!parsed.success) return { configured: false, missing: ["EXA_API_KEY", "FIRECRAWL_API_KEY"] };
  const missing: string[] = [];
  if (!parsed.data.EXA_API_KEY) missing.push("EXA_API_KEY");
  if (!parsed.data.FIRECRAWL_API_KEY) missing.push("FIRECRAWL_API_KEY");
  if (missing.length > 0) return { configured: false, missing };
  return {
    configured: true,
    exaKey: parsed.data.EXA_API_KEY!,
    firecrawlKey: parsed.data.FIRECRAWL_API_KEY!,
  };
}

/** A stable, non-leaking description of the configuration for the client. */
export function describeResearchEnv(): { search: boolean; scrape: boolean } {
  const env = getResearchEnv();
  return {
    search: Boolean(env.configured || process.env.EXA_API_KEY),
    scrape: Boolean(env.configured || process.env.FIRECRAWL_API_KEY),
  };
}
