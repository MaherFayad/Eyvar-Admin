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
import { resolveOperator } from '../_lib/agentAuth'
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
import { createRunReportHandler } from '../_lib/handlers/reportsRun'
import {
  createCreateReportHandler,
  createDeleteReportHandler,
  createDuplicateReportHandler,
  createGetReportHandler,
  createGetReportVersionsHandler,
  createListReportsHandler,
  createStarReportHandler,
  createUpdateReportHandler,
} from '../_lib/handlers/reports'
import {
  createCreateSegmentHandler,
  createDeleteSegmentHandler,
  createGetSegmentHandler,
  createListSegmentsHandler,
  createUpdateSegmentHandler,
} from '../_lib/handlers/segments'
import {
  createCreateAnnotationHandler,
  createDeleteAnnotationHandler,
  createListAnnotationsHandler,
} from '../_lib/handlers/annotations'
import {
  createCreatePageHandler,
  createDeletePageHandler,
  createDuplicatePageHandler,
  createGetPageHandler,
  createListPagesHandler,
  createPublishPageHandler,
  createStarPageHandler,
  createUpdatePageHandler,
} from '../_lib/handlers/pages'
import {
  createAcknowledgeFiringHandler,
  createCreateAlertRuleHandler,
  createDeleteAlertRuleHandler,
  createEvaluateAlertRuleHandler,
  createGetAlertConfigHistoryHandler,
  createGetAlertHistoryHandler,
  createGetAlertRuleHandler,
  createListAlertRulesHandler,
  createListFiringsHandler,
  createMuteAlertRuleHandler,
  createUpdateAlertRuleHandler,
} from '../_lib/handlers/alerts'
import { createCreateWebhookHandler, createDeleteWebhookHandler, createListWebhooksHandler } from '../_lib/handlers/webhooks'
import {
  createAgentHeartbeatHandler,
  createClaimAgentJobHandler,
  createCreateAgentJobHandler,
  createGetAgentJobHandler,
  createGetAgentStatusHandler,
  createListAgentJobEventsHandler,
  createListAgentJobsHandler,
  createPostAgentJobEventsHandler,
  createPostAgentJobFailHandler,
  createPostAgentJobFindingHandler,
  createPostAgentJobResultHandler,
  createSampleRowsHandler,
} from '../_lib/handlers/agent'
import { createSecretsAdapterFromEnv, type SecretsAdapter } from '../_lib/secrets'
import type { IsoDate, IsoDateTime } from '@/data/types/common'

interface HealthPayload {
  status: 'ok'
  time: IsoDateTime
}

export interface ApiDeps {
  db: Database
  /** WP-6.2b: injectable so a test can drive `verifyCode` deterministically instead of racing a random six-digit code. Defaults to the real generator. */
  generateCode?: () => string
  /** WP-6.4: injectable so `reports.run`'s AC-1276 equality test can pin the same clock the mock resolver runs against (`EYVAR_TODAY`/`EYVAR_NOW`). Defaults to the real clock. */
  reportsClock?: { today?: () => IsoDate; now?: () => string }
  /** WP-6.6: injectable so a webhook test can encrypt/decrypt with a fixed key instead of requiring `SECRETS_KEY`. Defaults to the lazy env-backed adapter. */
  secrets?: SecretsAdapter
}

/** `SECRETS_KEY` is read only when a webhook route actually encrypts or decrypts — mirrors `lazyEnvDatabase()` below, so this module stays importable without it set (e.g. `/health`). */
function lazyEnvSecrets(): SecretsAdapter {
  let real: SecretsAdapter | null = null
  function ensure(): SecretsAdapter {
    if (!real) real = createSecretsAdapterFromEnv()
    return real
  }
  return {
    encrypt: (plaintext) => ensure().encrypt(plaintext),
    decrypt: (blob) => ensure().decrypt(blob),
  }
}

export function createApiHandler(deps: ApiDeps): (req: Request) => Promise<Response> {
  const router = createRouter<RequestContext>()
  const sessionStore = new DbSessionStore(deps.db)
  const idempotencyStore = new DbIdempotencyStore(deps.db)
  const generateCode = deps.generateCode ?? generateOtpCode
  const secrets = deps.secrets ?? lazyEnvSecrets()

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

  // reports.run (see handlers/reportsRun.ts — a separate file from WP-6.5's
  // handlers/reports.ts CRUD library; see reportsRun.ts's header) — WP-6.4
  router.post('/reports/run', createRunReportHandler(deps.db, deps.reportsClock))

  // reports.* CRUD library — see handlers/reports.ts — WP-6.5 (AC-1280)
  router.get('/reports', createListReportsHandler(deps.db))
  router.post('/reports', createCreateReportHandler(deps.db))
  router.get('/reports/:id', createGetReportHandler(deps.db))
  router.patch('/reports/:id', createUpdateReportHandler(deps.db))
  router.delete('/reports/:id', createDeleteReportHandler(deps.db))
  router.post('/reports/:id/duplicate', createDuplicateReportHandler(deps.db))
  router.post('/reports/:id/star', createStarReportHandler(deps.db))
  router.get('/reports/:id/versions', createGetReportVersionsHandler(deps.db))

  // segments.* — see handlers/segments.ts — WP-6.5
  router.get('/segments', createListSegmentsHandler(deps.db))
  router.post('/segments', createCreateSegmentHandler(deps.db))
  router.get('/segments/:id', createGetSegmentHandler(deps.db))
  router.patch('/segments/:id', createUpdateSegmentHandler(deps.db))
  router.delete('/segments/:id', createDeleteSegmentHandler(deps.db))

  // annotations.* — see handlers/annotations.ts — WP-6.5
  router.get('/annotations', createListAnnotationsHandler(deps.db))
  router.post('/annotations', createCreateAnnotationHandler(deps.db))
  router.delete('/annotations/:id', createDeleteAnnotationHandler(deps.db))

  // pages.* — see handlers/pages.ts — WP-6.5 (AC-1279, AC-1280, AC-1281)
  router.get('/pages', createListPagesHandler(deps.db))
  router.post('/pages', createCreatePageHandler(deps.db))
  router.get('/pages/:id', createGetPageHandler(deps.db))
  router.patch('/pages/:id', createUpdatePageHandler(deps.db))
  router.delete('/pages/:id', createDeletePageHandler(deps.db))
  router.post('/pages/:id/publish', createPublishPageHandler(deps.db))
  router.post('/pages/:id/duplicate', createDuplicatePageHandler(deps.db))
  router.post('/pages/:id/star', createStarPageHandler(deps.db))

  // alerts.* — see handlers/alerts.ts — WP-6.6 (AC-1282 … AC-1286).
  // `/alerts/firings` must be registered before `/alerts/:id` — both are two
  // segments, and `router.ts` matches by registration order, so `:id` would
  // otherwise swallow the literal `firings` path (see alerts.ts's header).
  router.get('/alerts/firings', createListFiringsHandler(deps.db))
  router.post('/alerts/firings/:id/acknowledge', createAcknowledgeFiringHandler(deps.db))
  router.get('/alerts', createListAlertRulesHandler(deps.db))
  router.post('/alerts', createCreateAlertRuleHandler(deps.db))
  router.get('/alerts/:id', createGetAlertRuleHandler(deps.db))
  router.patch('/alerts/:id', createUpdateAlertRuleHandler(deps.db))
  router.delete('/alerts/:id', createDeleteAlertRuleHandler(deps.db))
  router.post('/alerts/:id/evaluate', createEvaluateAlertRuleHandler(deps.db, deps.reportsClock))
  router.get('/alerts/:id/history', createGetAlertHistoryHandler(deps.db))
  router.get('/alerts/:id/config-history', createGetAlertConfigHistoryHandler(deps.db))
  router.post('/alerts/:id/mute', createMuteAlertRuleHandler(deps.db))

  // webhooks.* — see handlers/webhooks.ts — WP-6.6
  router.get('/webhooks', createListWebhooksHandler(deps.db))
  router.post('/webhooks', createCreateWebhookHandler(deps.db, secrets))
  router.delete('/webhooks/:id', createDeleteWebhookHandler(deps.db))

  // agent.* — see handlers/agent.ts — WP-6.7 (AC-1287, AC-1288). `/agent/jobs/claim`
  // must be registered before `/agent/jobs/:id` — both are two segments, and
  // `router.ts` matches by registration order (see `alerts.ts`'s own note
  // about `/alerts/firings` for the same reason).
  router.post('/agent/jobs/claim', createClaimAgentJobHandler(deps.db))
  router.get('/agent/jobs', createListAgentJobsHandler(deps.db))
  router.post('/agent/jobs', createCreateAgentJobHandler(deps.db))
  router.get('/agent/jobs/:id', createGetAgentJobHandler(deps.db))
  router.get('/agent/jobs/:id/events', createListAgentJobEventsHandler(deps.db))
  router.post('/agent/jobs/:id/events', createPostAgentJobEventsHandler(deps.db))
  router.post('/agent/jobs/:id/findings', createPostAgentJobFindingHandler(deps.db))
  router.post('/agent/jobs/:id/result', createPostAgentJobResultHandler(deps.db))
  router.post('/agent/jobs/:id/fail', createPostAgentJobFailHandler(deps.db))
  router.get('/agent/status', createGetAgentStatusHandler(deps.db))
  router.post('/agent/heartbeat', createAgentHeartbeatHandler(deps.db))

  // reports.sample (T10, D44) — see handlers/agent.ts's own header for why it lives there.
  router.post('/reports/sample', createSampleRowsHandler(deps.db))

  return async function handler(req: Request): Promise<Response> {
    const requestId = req.headers.get('x-vercel-id') ?? crypto.randomUUID()
    try {
      // WP-6.7: a runner-token request carrying `X-Eyvar-Acting-For`/`X-Eyvar-Job`
      // resolves to that operator's own permissions (AC-1287); anything else
      // falls back to the ordinary cookie session — see `agentAuth.ts`.
      const operator = await resolveOperator(req, deps.db, () => authenticate(req, sessionStore, readSessionSecret()))
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
