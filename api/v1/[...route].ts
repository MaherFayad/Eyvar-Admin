/**
 * The one Vercel Function behind `/api/v1/*` — `05-backend.md` §1: "one cold
 * start, one place for auth, one place for the error envelope; a function
 * per route would be 60 cold starts." Web-standard handler signature, Node
 * 22 runtime (`vercel.json`'s `functions` block sets `maxDuration`).
 *
 * Order per §4: auth → permission (each handler's own `requirePermission`
 * call) → idempotency → handler → envelope. Only `/health` is registered —
 * "no business handlers beyond health" for this work package; WP-6.2 onward
 * add routes to this same router.
 */

import { createRouter } from '../_lib/router'
import { errorResponse } from '../_lib/errors'
import { authenticate, StubSessionStore, type RequestContext } from '../_lib/auth'
import { withIdempotency, StubIdempotencyStore } from '../_lib/idempotency'
import { single } from '../_lib/envelope'
import type { IsoDateTime } from '@/data/types/common'

interface HealthPayload {
  status: 'ok'
  time: IsoDateTime
}

const router = createRouter<RequestContext>()
const idempotencyStore = new StubIdempotencyStore()

router.get('/health', async (_req, _ctx) => {
  const body = single<HealthPayload>({ status: 'ok', time: new Date().toISOString() })
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
})

export default async function handler(req: Request): Promise<Response> {
  const requestId = req.headers.get('x-vercel-id') ?? crypto.randomUUID()
  try {
    const operator = await authenticate(req, new StubSessionStore())
    const ctx: RequestContext = { operator, requestId }
    const userId = operator?.userId ?? 'anonymous'
    const response = await withIdempotency(req, userId, idempotencyStore, () => router.dispatch(req, ctx))
    response.headers.set('x-request-id', requestId)
    return response
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
