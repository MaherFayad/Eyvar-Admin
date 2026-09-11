/**
 * Every `/api/cron/*` handler's first line (05-backend.md §1, §8): "each
 * guarded by `CRON_SECRET`". Vercel Cron sends `Authorization: Bearer
 * <CRON_SECRET>` (per Vercel's own cron docs, cited in `05-backend.md` §1a);
 * an unauthenticated call — no header, wrong value, or `CRON_SECRET` unset —
 * is refused before a single query runs.
 */
import { timingSafeEqual } from 'node:crypto'
import { unauthorizedError } from './errors'

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** Throws `unauthorizedError()` unless the request's bearer token matches `CRON_SECRET`. `secret` is injectable so a test does not depend on `process.env`. */
export function requireCronSecret(req: Request, secret: string | undefined = process.env.CRON_SECRET): void {
  if (!secret) throw unauthorizedError('CRON_SECRET is not configured')
  const header = req.headers.get('authorization') ?? ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token || !safeEqual(token, secret)) {
    throw unauthorizedError('Invalid or missing cron secret')
  }
}
