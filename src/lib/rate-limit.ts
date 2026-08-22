/**
 * In-memory token-bucket rate limiter (directive PDF-2 §5): 30 requests per
 * minute per IP for the research endpoints. Per-process state — appropriate
 * for a single-user local deployment; swap for @upstash/ratelimit when the
 * app grows to multiple instances.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, limit = 30, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) {
      // Shed the oldest buckets rather than growing unbounded.
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined) buckets.delete(oldest);
    }
    bucket = { tokens: limit, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill proportionally to elapsed time.
  const elapsed = now - bucket.lastRefill;
  if (elapsed > 0) {
    bucket.tokens = Math.min(limit, bucket.tokens + (elapsed / windowMs) * limit);
    bucket.lastRefill = now;
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterSeconds: 0 };
  }

  const secondsUntilOneToken = Math.ceil(((1 - bucket.tokens) * windowMs) / limit / 1000);
  return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, secondsUntilOneToken) };
}

/** Derive a client key from proxy headers (best effort, local deployment). */
export function clientKeyFromHeaders(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "local"
  );
}
