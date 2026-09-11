/**
 * Every `/api/cron/*` default export refuses an unauthenticated call before
 * touching the database — the brief's "Every cron handler is guarded by
 * `CRON_SECRET`; an unauthenticated call is refused. Test that." `snapshot.ts`
 * carries its own copy of this test beside its other behaviour; this file is
 * the other four.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const originalCronSecret = process.env.CRON_SECRET
const originalDatabaseUrl = process.env.DATABASE_URL

beforeEach(() => {
  delete process.env.CRON_SECRET
  delete process.env.DATABASE_URL
})

afterEach(() => {
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = originalCronSecret
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = originalDatabaseUrl
})

const CRON_MODULES = ['./alerts-hourly', './alerts-daily', './alerts-digest', './housekeeping'] as const

describe.each(CRON_MODULES)('%s', (modulePath) => {
  it('401s a request with no Authorization header, and never reaches the database', async () => {
    const handler = (await import(modulePath)).default as (req: Request) => Promise<Response>
    const res = await handler(new Request(`http://internal/api/cron${modulePath.slice(1)}`))
    expect(res.status).toBe(401)
  })

  it('401s a request bearing the wrong secret', async () => {
    process.env.CRON_SECRET = 'the-real-secret'
    const handler = (await import(modulePath)).default as (req: Request) => Promise<Response>
    const res = await handler(
      new Request(`http://internal/api/cron${modulePath.slice(1)}`, { headers: { authorization: 'Bearer wrong-secret' } }),
    )
    expect(res.status).toBe(401)
  })
})
