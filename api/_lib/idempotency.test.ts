/**
 * `DbIdempotencyStore` and `withIdempotency` — WP-6.2. AC-1273: a repeated
 * non-GET with the same `Idempotency-Key` replays the stored response and
 * performs no second write; a concurrent repeat is refused, not executed.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase } from '../_test/db'
import type { Database } from './db'
import { DbIdempotencyStore, withIdempotency } from './idempotency'
import { HttpError } from './errors'

let pglite: PGlite
let db: Database

beforeEach(async () => {
  const setup = await createTestDatabase()
  pglite = setup.pglite
  db = setup.db
})

afterEach(async () => {
  await pglite.close()
})

function postRequest(key: string | null): Request {
  const headers: Record<string, string> = {}
  if (key) headers['idempotency-key'] = key
  return new Request('http://localhost/api/v1/widgets', { method: 'POST', headers })
}

describe('DbIdempotencyStore.begin', () => {
  it('the first claim wins; a second claim before completion is a conflict (concurrency arbitrated by the unique constraint)', async () => {
    const store = new DbIdempotencyStore(db)
    const first = await store.begin('u1', 'key-a')
    const second = await store.begin('u1', 'key-a')
    expect(first).toEqual({ state: 'won' })
    expect(second).toEqual({ state: 'conflict' })
  })

  it('two truly concurrent claims for the same key: exactly one wins', async () => {
    const store = new DbIdempotencyStore(db)
    const [a, b] = await Promise.all([store.begin('u2', 'key-b'), store.begin('u2', 'key-b')])
    const states = [a.state, b.state].sort()
    expect(states).toEqual(['conflict', 'won'])
  })

  it('a completed claim replays verbatim on a later begin', async () => {
    const store = new DbIdempotencyStore(db)
    await store.begin('u3', 'key-c')
    await store.complete('u3', 'key-c', { status: 201, body: { id: 'w_1' } })

    const claim = await store.begin('u3', 'key-c')
    expect(claim).toEqual({ state: 'completed', response: { status: 201, body: { id: 'w_1' } } })
  })

  it('a claim whose handler threw is abandoned, so a retry is not stuck behind it', async () => {
    const store = new DbIdempotencyStore(db)
    await store.begin('u4', 'key-d')
    await store.abandon('u4', 'key-d')

    await expect(store.begin('u4', 'key-d')).resolves.toEqual({ state: 'won' })
  })

  it('reclaims a row past the 24h TTL instead of replaying a stale response or blocking forever', async () => {
    const staleCreatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    await db.sql`
      INSERT INTO idempotency_keys (user_id, key, status, response_status, response_json, created_at)
      VALUES ('u5', 'key-e', 'completed', 200, ${JSON.stringify({ old: true })}, ${staleCreatedAt})
    `
    const store = new DbIdempotencyStore(db)
    await expect(store.begin('u5', 'key-e')).resolves.toEqual({ state: 'won' })
  })
})

describe('withIdempotency', () => {
  it('replays the identical body on a repeated key and runs the effect exactly once', async () => {
    const store = new DbIdempotencyStore(db)
    let effectCount = 0
    const handler = async (): Promise<Response> => {
      effectCount += 1
      return new Response(JSON.stringify({ createdId: `w_${effectCount}` }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    }

    const first = await withIdempotency(postRequest('same-key'), 'u6', store, handler)
    const second = await withIdempotency(postRequest('same-key'), 'u6', store, handler)

    expect(effectCount).toBe(1)
    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(await first.json()).toEqual(await second.json())
  })

  it('runs the handler on every request with no Idempotency-Key', async () => {
    const store = new DbIdempotencyStore(db)
    let effectCount = 0
    const handler = async (): Promise<Response> => {
      effectCount += 1
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }

    await withIdempotency(postRequest(null), 'u7', store, handler)
    await withIdempotency(postRequest(null), 'u7', store, handler)

    expect(effectCount).toBe(2)
  })

  it('a concurrent repeat with the same key is refused with the contract conflict status, not executed', async () => {
    const store = new DbIdempotencyStore(db)
    let effectCount = 0
    const handler = async (): Promise<Response> => {
      effectCount += 1
      await new Promise((resolve) => setTimeout(resolve, 30))
      return new Response(JSON.stringify({ createdId: 'w_only' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      })
    }

    const results = await Promise.allSettled([
      withIdempotency(postRequest('race-key'), 'u8', store, handler),
      withIdempotency(postRequest('race-key'), 'u8', store, handler),
    ])

    expect(effectCount).toBe(1)
    const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<Response>[]
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[]
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect(fulfilled[0]!.value.status).toBe(201)
    const err = rejected[0]!.reason as HttpError
    expect(err).toBeInstanceOf(HttpError)
    expect(err.status).toBe(409)
    expect(err.retryable).toBe(true)
  })

  it('abandons the claim when the handler throws, so a genuine retry is not permanently blocked', async () => {
    const store = new DbIdempotencyStore(db)
    const failingHandler = async (): Promise<Response> => {
      throw new Error('boom')
    }
    await expect(withIdempotency(postRequest('retry-key'), 'u9', store, failingHandler)).rejects.toThrow('boom')

    let effectCount = 0
    const succeedingHandler = async (): Promise<Response> => {
      effectCount += 1
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }
    const retried = await withIdempotency(postRequest('retry-key'), 'u9', store, succeedingHandler)
    expect(retried.status).toBe(200)
    expect(effectCount).toBe(1)
  })
})
