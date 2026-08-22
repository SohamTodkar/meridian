/**
 * In-memory TTL cache for research results (directive PDF-2 §6):
 *   search   → 10 minutes (keyed query+numResults+type)
 *   scrape   → 1 hour     (keyed url+formats)
 *   combined → deliberately uncached (data freshness matters)
 *
 * Simple bounded map with lazy expiry; adequate for the single-process
 * local-first deployment model.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const MAX_ENTRIES = 300;

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  // Refresh insertion order so eviction approximates LRU.
  store.delete(key);
  store.set(key, entry);
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export const TTL = {
  search: 10 * 60 * 1000,
  scrape: 60 * 60 * 1000,
} as const;

export function cacheKey(...parts: Array<string | number>): string {
  return parts.join("|");
}

export function cacheStats(): { entries: number; maxEntries: number } {
  return { entries: store.size, maxEntries: MAX_ENTRIES };
}
