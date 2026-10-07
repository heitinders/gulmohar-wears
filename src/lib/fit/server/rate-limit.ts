/**
 * Fixed-window limiter held in this server instance's memory. A first line against form spam on the gate;
 * instances do not share counts, which is acceptable for a consented sign-up that writes one row per phone.
 */
export function createRateLimiter({ limit, windowMs, now = Date.now, maxKeys = 5000 }: { limit: number; windowMs: number; now?: () => number; maxKeys?: number }) {
  const hits = new Map<string, { start: number; count: number }>();
  const sweep = (t: number) => {
    for (const [k, v] of hits) if (t - v.start >= windowMs) hits.delete(k);
    while (hits.size >= maxKeys) hits.delete(hits.keys().next().value!);
  };
  return {
    take(key: string): boolean {
      const t = now(); const h = hits.get(key);
      if (!h || t - h.start >= windowMs) { if (!h && hits.size >= maxKeys) sweep(t); hits.set(key, { start: t, count: 1 }); return true; }
      if (h.count >= limit) return false;
      h.count += 1; return true;
    },
    size: () => hits.size,
  };
}
