/** Client-side types for the research desk (mirrors the API routes). */

export interface ResearchSearchResult {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  highlights?: string[];
}

export interface ResearchScrapeData {
  markdown: string;
  html?: string;
  metadata: Record<string, unknown>;
}

export interface ResearchCombinedResult {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  highlights: string[];
  markdown: string | null;
  metadata: Record<string, unknown> | null;
  scrapeError?: string;
}

export interface ResearchApiError {
  error: string;
  traceId?: string;
  retryAfterSeconds?: number;
}
