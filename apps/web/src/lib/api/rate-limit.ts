/**
 * Minimal in-memory rate limiter for security-sensitive endpoints
 * (URL signing, auth attempts).
 *
 * Per-instance and best-effort by design: at v0.1 traffic this raises the cost
 * of abuse without adding fixed infrastructure. Move to a shared store when a
 * real limit matters — the call sites will not have to change.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_KEYS) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
    }

    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;

  return {
    allowed,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: allowed ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

export const LIMITS = {
  /** Signing an upload URL: generous enough for a bulk drag-and-drop import. */
  createUpload: { limit: 120, windowMs: 60_000 },
  /** Playback URLs are re-requested as tracks change; keep it comfortable. */
  playback: { limit: 240, windowMs: 60_000 },
  /** Downloads are deliberate actions. */
  download: { limit: 30, windowMs: 60_000 },
} as const;
