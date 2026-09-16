/**
 * Every `/api/cron/*` handler's first line (05-backend.md §1, §8). Vercel
 * Cron sends `Authorization: Bearer <CRON_SECRET>`; a missing header, wrong
 * value, or unset `CRON_SECRET` is refused before a single query runs.
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
