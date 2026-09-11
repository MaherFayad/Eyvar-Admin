/**
 * The one Vercel Function behind `/api/v1/*` — `05-backend.md` §1: "one cold
 * start, one place for auth, one place for the error envelope; a function
 * per route would be 60 cold starts." Web-standard handler signature, Node
 * 22 runtime (`vercel.json`'s `functions` block sets `maxDuration`).
 *
 * Order per §4: auth → permission (each handler's own `requirePermission`
 * call) → idempotency → handler → envelope. `createApiHandler` takes its
 * `Database` as a parameter so a test can hand it PGlite instead of the
 * lazy, env-backed one the default export uses — WP-6.2.
 */

import { createRouter } from '../_lib/router'
import { errorResponse } from '../_lib/errors'
import { authenticate, DbSessionStore, readSessionSecret, type RequestContext } from '../_lib/auth'
import { withIdempotency, DbIdempotencyStore } from '../_lib/idempotency'
import { single } from '../_lib/envelope'
import { createDatabaseFromEnv, type Database } from '../_lib/db'
import { createGetSessionHandler } from '../_lib/handlers/session'
import {
  createActivateInviteHandler,
  createBeginTotpEnrolmentHandler,
  createEnrollSecondFactorHandler,
  createReauthenticateHandler,
  createRequestPasswordResetHandler,
  createResendCodeHandler,
  createResetPasswordHandler,
  createSignInHandler,
  createSignOutHandler,
  createSignOutEverywhereHandler,
  createValidateResetTokenHandler,
  createVerifyCodeHandler,
} from '../_lib/handlers/auth'
import { generateCode as generateOtpCode } from '../_lib/otp'
import {
  createGetTeamUserHandler,
  createInviteOperatorHandler,
  createListTeamUsersHandler,
  createOffboardOperatorHandler,
  createReinstateOperatorHandler,
  createResendInviteHandler,
  createRevokeInviteHandler,
  createSetPermissionDeltaHandler,
  createSuspendOperatorHandler,
} from '../_lib/handlers/team'
import {
  createListMeasuresHandler,
  createListDimensionsHandler,
  createGetGlossaryHandler,
} from '../_lib/handlers/catalogue'
import type { IsoDateTime } from '@/data/types/common'

interface HealthPayload {
  status: 'ok'
  time: IsoDateTime
}

export interface ApiDeps {
  db: Database
  /** WP-6.2b: injectable so a test can drive `verifyCode` deterministically instead of racing a random six-digit code. Defaults to the real generator. */
  generateCode?: () => string
}

export function createApiHandler(deps: ApiDeps): (req: Request) => Promise<Response> {
  const router = createRouter<RequestContext>()
  const sessionStore = new DbSessionStore(deps.db)
  const idempotencyStore = new DbIdempotencyStore(deps.db)
  const generateCode = deps.generateCode ?? generateOtpCode

  router.get('/health', async () => {
    const body = single<HealthPayload>({ status: 'ok', time: new Date().toISOString() })
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })

  // auth.* — see handlers/auth.ts. WP-6.2b finishes the full `SignInOutcome`
  // union WP-6.2 named out of scope: second-factor challenge, TOTP
  // enrolment, password reset, invite activation, device-trust reauth.
  router.post('/auth/sign-in', createSignInHandler(deps.db, generateCode))
  router.post('/auth/verify-code', createVerifyCodeHandler(deps.db))
  router.post('/auth/resend-code', createResendCodeHandler(deps.db, generateCode))
  router.post('/auth/enroll-second-factor', createEnrollSecondFactorHandler(deps.db, generateCode))
  router.post('/auth/totp-secret', createBeginTotpEnrolmentHandler(deps.db))
  router.post('/auth/request-password-reset', createRequestPasswordResetHandler(deps.db))
  router.get('/auth/reset-token/:token', createValidateResetTokenHandler(deps.db))
  router.post('/auth/reset-password', createResetPasswordHandler(deps.db))
  router.post('/auth/activate', createActivateInviteHandler(deps.db))
  router.post('/auth/reauthenticate', createReauthenticateHandler(deps.db, generateCode))
  router.post('/auth/sign-out', createSignOutHandler(deps.db))
  router.post('/auth/sign-out-everywhere', createSignOutEverywhereHandler(deps.db))

  // session.current
  router.get('/session', createGetSessionHandler(deps.db))

  // team.* — see handlers/team.ts. `/team-users` is the read-only "who
  // exists" slice from WP-6.2; `/team/operators` and `/team/invites` are the
  // WP-6.2b lifecycle (F-016-guarded).
  router.get('/team-users', createListTeamUsersHandler(deps.db))
  router.get('/team-users/:id', createGetTeamUserHandler(deps.db))
  router.post('/team/operators', createInviteOperatorHandler(deps.db))
  router.post('/team/invites/:userId/resend', createResendInviteHandler(deps.db))
  router.delete('/team/invites/:userId', createRevokeInviteHandler(deps.db))
  router.post('/team/operators/:id/suspend', createSuspendOperatorHandler(deps.db))
  router.post('/team/operators/:id/reinstate', createReinstateOperatorHandler(deps.db))
  router.delete('/team/operators/:id', createOffboardOperatorHandler(deps.db))
  router.put('/team/operators/:id/override', createSetPermissionDeltaHandler(deps.db))

  // catalogue.* (see handlers/catalogue.ts) — WP-6.3
  router.get('/catalogue/measures', createListMeasuresHandler(deps.db))
  router.get('/catalogue/dimensions', createListDimensionsHandler(deps.db))
  router.get('/catalogue/glossary', createGetGlossaryHandler(deps.db))

  return async function handler(req: Request): Promise<Response> {
    const requestId = req.headers.get('x-vercel-id') ?? crypto.randomUUID()
    try {
      const operator = await authenticate(req, sessionStore, readSessionSecret())
      const ctx: RequestContext = { operator, requestId }
      const userId = operator?.userId ?? 'anonymous'
      const response = await withIdempotency(req, userId, idempotencyStore, () => router.dispatch(req, ctx))
      response.headers.set('x-request-id', requestId)
      return response
    } catch (err) {
      return errorResponse(err, requestId)
    }
  }
}

/**
 * `DATABASE_URL` is read only when a route actually queries the database —
 * `/health` never does, so this stays importable (and `health.test.ts`
 * stays green) in an environment that has not set it.
 */
function lazyEnvDatabase(): Database {
  let real: Database | null = null
  function ensure(): Database {
    if (!real) real = createDatabaseFromEnv()
    return real
  }
  return {
    async sql<T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]> {
      return ensure().sql<T>(strings, ...values)
    },
    close: async () => {
      if (real) await real.close()
    },
  }
}

export default createApiHandler({ db: lazyEnvDatabase() })
