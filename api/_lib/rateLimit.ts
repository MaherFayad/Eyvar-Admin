/**
 * A transport rate limiter — WP-6.2c / F-V2-21's gap list, last item. Not an
 * in-memory counter: a Vercel Function has no memory shared across
 * invocations (`05-backend.md` §1's whole reason for the Neon HTTP driver),
 * so the counter has to live in `rate_limit_buckets` (`0011_wp62c.sql`).
 *
 * A fixed window, not a sliding one: simpler, and the only guarantee the
 * transport needs is "no more than N attempts land inside any window",
 * which a fixed window gives with one row and one statement.
 */
import type { Database } from './db'

export interface RateLimitResult {
  limited: boolean
  /** Seconds until the window resets. `0` when not limited. */
  retryAfterSeconds: number
}

interface BucketRow {
  count: number
  window_start: string
}

/**
 * `key` is the caller's to construct (e.g. `signin:<ip>`) — this module has
 * no opinion on what dimension to limit by. One `INSERT ... ON CONFLICT` per
 * call: a fresh key starts the window; a key already inside its window is
 * incremented; a key past its window resets to `1` and a fresh `window_start`.
 */
export async function checkRateLimit(
  db: Database,
  key: string,
  opts: { windowMs?: number; max?: number } = {},
): Promise<RateLimitResult> {
  const windowMs = opts.windowMs ?? 15 * 60_000
  const max = opts.max ?? 10
  const cutoff = new Date(Date.now() - windowMs).toISOString()

  const rows = await db.sql<BucketRow>`
    INSERT INTO rate_limit_buckets (key, count, window_start)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limit_buckets.window_start < ${cutoff} THEN 1 ELSE rate_limit_buckets.count + 1 END,
      window_start = CASE WHEN rate_limit_buckets.window_start < ${cutoff} THEN now() ELSE rate_limit_buckets.window_start END
    RETURNING count, window_start
  `
  const row = rows[0]!
  if (row.count <= max) return { limited: false, retryAfterSeconds: 0 }

  const resetAt = new Date(row.window_start).getTime() + windowMs
  return { limited: true, retryAfterSeconds: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)) }
}

/** `x-forwarded-for`'s first hop (Vercel sets it); `'unknown'` off-platform, e.g. under `vercel dev` without a proxy. Never trusted for anything but a rate-limit bucket key. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (!forwarded) return 'unknown'
  const first = forwarded.split(',')[0]?.trim()
  return first && first.length > 0 ? first : 'unknown'
}
