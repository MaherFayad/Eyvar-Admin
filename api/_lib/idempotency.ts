/**
 * `Idempotency-Key` handling — `05-backend.md` §2 Q3: every non-GET accepts
 * the header; the server stores `(user, key) → response` for 24h in
 * `idempotency_keys` and replays it on a repeat. `DbIdempotencyStore`
 * (WP-6.2) claims a key with `INSERT … ON CONFLICT DO NOTHING`, so two
 * concurrent requests are arbitrated by the table's primary key, not by a
 * check-then-insert race in this process.
 */

import { idempotencyInProgressError } from './errors'
import type { Database } from './db'

export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key'
export const IDEMPOTENCY_TTL_HOURS = 24

export interface StoredResponse {
  status: number
  body: unknown
}

export type IdempotencyClaim =
  | { state: 'won' }
  | { state: 'completed'; response: StoredResponse }
  | { state: 'conflict' }

export interface IdempotencyStore {
  /** Atomically claims `(user, key)` for a new request, or reports what already holds it. */
  begin(userId: string, key: string): Promise<IdempotencyClaim>
  /** Records the response of a claim this store returned `{ state: 'won' }` for. */
  complete(userId: string, key: string, response: StoredResponse): Promise<void>
  /** Releases a claim whose handler threw, so a retry is not stuck behind a dead `in_progress` row for the rest of the TTL. */
  abandon(userId: string, key: string): Promise<void>
}

/** Never remembers anything — every claim is won. For call sites with no database. */
export class StubIdempotencyStore implements IdempotencyStore {
  async begin(): Promise<IdempotencyClaim> {
    return { state: 'won' }
  }
  async complete(): Promise<void> {
    // no-op
  }
  async abandon(): Promise<void> {
    // no-op
  }
}

/** `idempotency_keys`-backed store. 24h TTL enforced here on read, not only by `api/cron/housekeeping.ts`'s sweep. */
export class DbIdempotencyStore implements IdempotencyStore {
  constructor(private readonly db: Database) {}

  async begin(userId: string, key: string): Promise<IdempotencyClaim> {
    return this.attemptBegin(userId, key, false)
  }

  private async attemptBegin(userId: string, key: string, retried: boolean): Promise<IdempotencyClaim> {
    const inserted = await this.db.sql<{ user_id: string }>`
      INSERT INTO idempotency_keys (user_id, key, status)
      VALUES (${userId}, ${key}, 'in_progress')
      ON CONFLICT (user_id, key) DO NOTHING
      RETURNING user_id
    `
    if (inserted.length > 0) return { state: 'won' }

    const existingRows = await this.db.sql<{
      status: string
      response_status: number | null
      response_json: unknown
      created_at: string
    }>`
      SELECT status, response_status, response_json, created_at
      FROM idempotency_keys WHERE user_id = ${userId} AND key = ${key}
    `
    const row = existingRows[0]
    if (!row) {
      // The row we lost the insert race to vanished (an `abandon()` elsewhere)
      // between the two statements. One retry is enough — a repeated miss
      // would mean two requests are racing forever, which does not happen.
      if (retried) return { state: 'conflict' }
      return this.attemptBegin(userId, key, true)
    }

    const ageMs = Date.now() - new Date(row.created_at).getTime()
    if (ageMs > IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000) {
      // Past the TTL: reclaim it rather than replay a stale response or block
      // a legitimate retry for the rest of the day. Deleted by exact
      // `created_at` so a fresher row inserted in the meantime is not lost.
      await this.db.sql`
        DELETE FROM idempotency_keys WHERE user_id = ${userId} AND key = ${key} AND created_at = ${row.created_at}
      `
      if (retried) return { state: 'conflict' }
      return this.attemptBegin(userId, key, true)
    }

    if (row.status === 'completed') {
      return { state: 'completed', response: { status: row.response_status ?? 200, body: row.response_json } }
    }
    return { state: 'conflict' }
  }

  async complete(userId: string, key: string, response: StoredResponse): Promise<void> {
    await this.db.sql`
      UPDATE idempotency_keys
      SET status = 'completed', response_status = ${response.status}, response_json = ${JSON.stringify(response.body)}
      WHERE user_id = ${userId} AND key = ${key}
    `
  }

  async abandon(userId: string, key: string): Promise<void> {
    await this.db.sql`
      DELETE FROM idempotency_keys WHERE user_id = ${userId} AND key = ${key} AND status = 'in_progress'
    `
  }
}

export function readIdempotencyKey(req: Request): string | null {
  return req.headers.get(IDEMPOTENCY_KEY_HEADER)
}

/**
 * Wraps a handler so a repeated `Idempotency-Key` on the same user replays
 * the first response instead of re-running the mutation, and a second
 * request that arrives while the first is still running is refused with the
 * contract's conflict status rather than executed a second time. GETs and
 * requests with no key pass straight through — nothing here is a cache for
 * reads.
 */
export async function withIdempotency(
  req: Request,
  userId: string,
  store: IdempotencyStore,
  handler: () => Promise<Response>,
): Promise<Response> {
  if (req.method === 'GET') return handler()

  const key = readIdempotencyKey(req)
  if (!key) return handler()

  const claim = await store.begin(userId, key)
  if (claim.state === 'completed') {
    return new Response(JSON.stringify(claim.response.body), {
      status: claim.response.status,
      headers: { 'content-type': 'application/json' },
    })
  }
  if (claim.state === 'conflict') throw idempotencyInProgressError()

  try {
    const response = await handler()
    const body = await response
      .clone()
      .json()
      .catch(() => null)
    await store.complete(userId, key, { status: response.status, body })
    return response
  } catch (err) {
    await store.abandon(userId, key)
    throw err
  }
}
