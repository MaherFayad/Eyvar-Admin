/**
 * `Idempotency-Key` handling — `05-backend.md` §2 Q3: every non-GET accepts
 * the header; the server stores `(user, key) → response` for 24h in
 * `idempotency_keys` and replays it on a repeat. Behind an interface, like
 * `SessionStore`, so WP-6.2 can back it with the real table without touching
 * the router.
 */

export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key'

export interface StoredResponse {
  status: number
  body: unknown
}

export interface IdempotencyStore {
  get(userId: string, key: string): Promise<StoredResponse | null>
  put(userId: string, key: string, response: StoredResponse): Promise<void>
}

/** Never remembers anything. WP-6.2 implements the `idempotency_keys`-backed store (24h TTL, swept by `api/cron/housekeeping.ts`). */
export class StubIdempotencyStore implements IdempotencyStore {
  async get(): Promise<StoredResponse | null> {
    return null
  }
  async put(): Promise<void> {
    // no-op
  }
}

export function readIdempotencyKey(req: Request): string | null {
  return req.headers.get(IDEMPOTENCY_KEY_HEADER)
}

/**
 * Wraps a handler so a repeated `Idempotency-Key` on the same user replays
 * the first response instead of re-running the mutation. GETs and requests
 * with no key pass straight through — nothing here is a cache for reads.
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

  const cached = await store.get(userId, key)
  if (cached) {
    return new Response(JSON.stringify(cached.body), {
      status: cached.status,
      headers: { 'content-type': 'application/json' },
    })
  }

  const response = await handler()
  const body = await response
    .clone()
    .json()
    .catch(() => null)
  if (body !== null) await store.put(userId, key, { status: response.status, body })
  return response
}
