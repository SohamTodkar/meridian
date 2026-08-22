import { describe, expect, it, vi, beforeEach } from "vitest";
import { checkRateLimit, clientKeyFromHeaders } from "./rate-limit";
import { cacheGet, cacheSet, cacheKey, TTL, cacheStats } from "./research-cache";
import { getResearchEnv, describeResearchEnv } from "./env";
import { publishScroll, subscribeScroll, scrollState } from "./scroll";
import { cn, clamp, lerp, damp, remap, readingMinutes } from "./utils";

/* ------------------------------------------------------------------ */
/* Rate limiter (directive PDF-2 §5)                                   */
/* ------------------------------------------------------------------ */

describe("research rate limiter", () => {
  it("allows a burst of 30 requests per minute and then blocks", () => {
    for (let i = 0; i < 30; i++) {
      expect(checkRateLimit(`ip:test:${i % 1}`).allowed).toBe(true);
    }
    const blocked = checkRateLimit("ip:test:0");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks clients independently", () => {
    expect(checkRateLimit("ip:a").allowed).toBe(true);
    expect(checkRateLimit("ip:b").allowed).toBe(true);
  });

  it("derives the client key from proxy headers", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" });
    expect(clientKeyFromHeaders(headers)).toBe("203.0.113.7");
    expect(clientKeyFromHeaders(new Headers())).toBe("local");
  });
});

/* ------------------------------------------------------------------ */
/* TTL cache (directive PDF-2 §6)                                      */
/* ------------------------------------------------------------------ */

describe("research TTL cache", () => {
  it("stores and expires entries", () => {
    vi.useFakeTimers();
    cacheSet("k", { value: 1 }, TTL.search);
    expect(cacheGet("k")).toEqual({ value: 1 });
    vi.advanceTimersByTime(TTL.search + 1);
    expect(cacheGet("k")).toBeUndefined();
    vi.useRealTimers();
  });

  it("builds composite keys and stays bounded", () => {
    const key = cacheKey("exa", "query", 10, "auto");
    expect(key).toBe("exa|query|10|auto");
    expect(cacheStats().maxEntries).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* Environment validation (directive PDF-2 §4)                         */
/* ------------------------------------------------------------------ */

describe("research environment validation", () => {
  beforeEach(() => {
    delete process.env.EXA_API_KEY;
    delete process.env.FIRECRAWL_API_KEY;
  });

  it("reports the missing keys without throwing", () => {
    const env = getResearchEnv();
    expect(env.configured).toBe(false);
    expect(env.configured ? null : env.missing).toEqual(["EXA_API_KEY", "FIRECRAWL_API_KEY"]);
    expect(describeResearchEnv()).toEqual({ search: false, scrape: false });
  });

  it("validates a fully configured instance", () => {
    process.env.EXA_API_KEY = "test-exa";
    process.env.FIRECRAWL_API_KEY = "test-firecrawl";
    const env = getResearchEnv();
    expect(env.configured).toBe(true);
    expect(describeResearchEnv()).toEqual({ search: true, scrape: true });
  });
});

/* ------------------------------------------------------------------ */
/* Scroll store (directive PDF-1 §2)                                   */
/* ------------------------------------------------------------------ */

describe("scroll telemetry store", () => {
  it("publishes progress, direction and velocity without React", () => {
    publishScroll(0, 1000, true);
    expect(scrollState.progress).toBe(0);
    publishScroll(500, 1000, true);
    expect(scrollState.progress).toBeCloseTo(0.5);
    expect(scrollState.direction).toBe(1);
    publishScroll(400, 1000, true);
    expect(scrollState.direction).toBe(-1);
    expect(scrollState.smooth).toBe(true);
  });

  it("delivers updates to subscribers and supports unsubscribe", () => {
    const seen: number[] = [];
    const unsubscribe = subscribeScroll((state) => seen.push(state.progress));
    publishScroll(250, 1000, false);
    unsubscribe();
    publishScroll(750, 1000, false);
    expect(seen).toContain(0.25);
    expect(seen).not.toContain(0.75);
  });

  it("clamps beyond the document bounds", () => {
    publishScroll(5000, 1000, false);
    expect(scrollState.progress).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* Utils                                                               */
/* ------------------------------------------------------------------ */

describe("shared utilities", () => {
  it("joins conditional class names", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });

  it("clamps, lerps, damps and remaps", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(damp(0, 10, 0.5, 16.7)).toBeCloseTo(5);
    expect(remap(0.5, 0, 1, 0, 100)).toBe(50);
  });

  it("estimates reading time at ~200 wpm", () => {
    expect(readingMinutes("word ".repeat(200))).toBe(1);
    expect(readingMinutes("word ".repeat(600))).toBe(3);
  });
});
