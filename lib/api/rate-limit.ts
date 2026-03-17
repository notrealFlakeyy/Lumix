import 'server-only'

/**
 * In-memory token-bucket rate limiter for API routes.
 *
 * Each unique token (e.g. an IP address or API key) gets its own bucket that
 * refills every `interval` milliseconds.  The LRU map is capped at
 * `uniqueTokenPerInterval` entries so memory stays bounded.
 */
export function rateLimit({
  interval,
  uniqueTokenPerInterval,
}: {
  /** Time window in milliseconds before the token count resets. */
  interval: number
  /** Maximum number of unique tokens tracked at once (LRU eviction). */
  uniqueTokenPerInterval: number
}) {
  const tokenMap = new Map<string, { count: number; expiresAt: number }>()

  /** Evict expired entries and, if still over capacity, the oldest ones. */
  function prune() {
    const now = Date.now()
    for (const [key, value] of tokenMap) {
      if (value.expiresAt <= now) {
        tokenMap.delete(key)
      }
    }
    // If we're still at capacity, drop the oldest entries (first inserted).
    while (tokenMap.size >= uniqueTokenPerInterval) {
      const firstKey = tokenMap.keys().next().value as string
      tokenMap.delete(firstKey)
    }
  }

  return {
    /**
     * Check whether `token` is within the allowed `limit` for the current
     * interval.  Resolves silently when allowed; throws a `Response` object
     * (status 429) when the limit is exceeded.
     */
    async check(limit: number, token: string): Promise<void> {
      const now = Date.now()
      const entry = tokenMap.get(token)

      if (entry && entry.expiresAt > now) {
        entry.count += 1
        if (entry.count > limit) {
          throw new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil((entry.expiresAt - now) / 1000)),
            },
          })
        }
        // Move to end so it's treated as "most recently used".
        tokenMap.delete(token)
        tokenMap.set(token, entry)
      } else {
        prune()
        tokenMap.set(token, { count: 1, expiresAt: now + interval })
      }
    },
  }
}

/** General-purpose limiter: 60 requests per 60 s, up to 500 unique callers. */
export const apiRateLimiter = rateLimit({
  interval: 60_000,
  uniqueTokenPerInterval: 500,
})

/** Tighter limiter for cron / webhook endpoints: 5 requests per 60 s. */
export const cronRateLimiter = rateLimit({
  interval: 60_000,
  uniqueTokenPerInterval: 500,
})
