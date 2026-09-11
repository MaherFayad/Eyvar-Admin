/**
 * The runner-token identity scheme — `01-analyst-agent.md` §3.2, AC-1287.
 * Two distinct paths, never conflated:
 *
 *   - A **bare runner call** (heartbeat, claim, post events/findings/result/
 *     fail) authenticates with `AGENT_RUNNER_TOKEN` alone — `requireAgentRunnerToken`,
 *     used directly by `handlers/agent.ts`'s own routes.
 *   - An **acting-for call** (the agent's tools reaching the ordinary
 *     `/api/v1/*` surface — `reports.run`, `catalogue.*`, …) carries the same
 *     token plus `X-Eyvar-Acting-For` and `X-Eyvar-Job`. `authenticateActingFor`
 *     resolves this into the **named operator's own** `AuthenticatedOperator`
 *     — permissions loaded fresh from `permissions.ts`, never the runner's
 *     (which has none) and never a union — and refuses outright unless the
 *     named job is, right now, claimed (`state = 'running'`, `claimed_at`
 *     set) and was requested by that operator. `resolveOperator` (wired into
 *     `[...route].ts`) is what decides, per request, which of the two paths
 *     applies.
 */
import { timingSafeEqual } from 'node:crypto'
import { HttpError, unauthorizedError } from './errors'
import { loadOperatorPermissions } from './permissions'
import type { AuthenticatedOperator } from './auth'
import type { Database } from './db'

export const ACTING_FOR_HEADER = 'x-eyvar-acting-for'
export const JOB_HEADER = 'x-eyvar-job'

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** `null` when the request carries no bearer token at all. Does not check the value — callers compare it themselves against whichever secret applies. */
export function readBearerToken(req: Request): string | null {
  const header = req.headers.get('authorization') ?? ''
  const [scheme, token] = header.split(' ')
  return scheme === 'Bearer' && token ? token : null
}

/** True only for an exact, constant-time match against `AGENT_RUNNER_TOKEN`. A missing or unconfigured token is never "the runner". */
export function isRunnerToken(bearer: string | null, runnerToken: string | undefined): boolean {
  return Boolean(bearer && runnerToken && safeEqual(bearer, runnerToken))
}

/** Every bare-runner route's first line. Throws 401 for a missing, wrong, or unconfigured token — mirrors `cronAuth.ts`'s `requireCronSecret`. */
export function requireAgentRunnerToken(req: Request, runnerToken: string | undefined = process.env.AGENT_RUNNER_TOKEN): void {
  if (!isRunnerToken(readBearerToken(req), runnerToken)) {
    throw unauthorizedError('Invalid or missing agent runner token')
  }
}

/** AC-1287's refusal shape: a 403 whose `details[0].field` names the acting-for check that failed, distinct from `forbiddenError`'s permission-key shape. */
function actingForError(code: string, message: string): HttpError {
  return new HttpError(403, 'forbidden', message, [{ field: 'actingFor', code, message }], { retryable: false })
}

interface JobClaimRow {
  id: string
  state: string
  requested_by: string
  claimed_at: string | null
}

/**
 * Resolves an acting-for request into the **named operator's** identity.
 * Every failure — wrong token, missing headers, a job not claimed, a job
 * claimed but requested by someone else, an inactive operator — is a
 * refusal; there is no partial success and no fallback to the runner's own
 * (nonexistent) permissions.
 */
export async function authenticateActingFor(
  req: Request,
  db: Database,
  runnerToken: string | undefined = process.env.AGENT_RUNNER_TOKEN,
): Promise<AuthenticatedOperator> {
  if (!isRunnerToken(readBearerToken(req), runnerToken)) {
    throw unauthorizedError('Invalid or missing agent runner token')
  }

  const actingFor = req.headers.get(ACTING_FOR_HEADER)
  const jobId = req.headers.get(JOB_HEADER)
  if (!actingFor || !jobId) {
    throw actingForError('headers-required', 'X-Eyvar-Acting-For and X-Eyvar-Job are both required with the runner token')
  }

  const rows = await db.sql<JobClaimRow>`
    SELECT id, state, requested_by, claimed_at FROM agent_jobs WHERE id = ${jobId}
  `
  const job = rows[0]
  // AC-1287: "the server must refuse acting-for any job the runner has not
  // claimed" — claimed means `running` with a `claimed_at`, not merely
  // existing (a `queued`, `done`, or `failed` job is not claimed right now).
  if (!job || job.state !== 'running' || job.claimed_at === null) {
    throw actingForError('job-not-claimed', `Job ${jobId} is not claimed`)
  }
  if (job.requested_by !== actingFor) {
    throw actingForError('operator-mismatch', `Job ${jobId} was not requested by ${actingFor}`)
  }

  const operator = await loadOperatorPermissions(db, actingFor)
  if (!operator || operator.status !== 'Active') {
    throw actingForError('operator-not-active', `Operator ${actingFor} is not active`)
  }

  return {
    userId: operator.userId,
    role: operator.roleId,
    permissions: operator.permissions,
    // Never a real `sessions` row — the agent path has no session to revoke, and this value is never compared against one.
    sessionId: `job:${jobId}`,
  }
}

/**
 * Per-request operator resolution, called once by `[...route].ts` in place
 * of a bare `authenticate()` call. A bearer token that matches the runner
 * token AND carries an acting-for header pair is always fully validated
 * (throws on any problem, per `authenticateActingFor`) — it is never merely
 * ignored, which is what would let a wrong-job or wrong-operator header pair
 * silently fall back to "signed out" instead of being refused. A bare
 * runner call (no acting-for headers) resolves to `null`: `handlers/agent.ts`'s
 * own routes call `requireAgentRunnerToken` themselves and do not need an
 * operator. Anything else is the ordinary cookie path.
 */
export async function resolveOperator(
  req: Request,
  db: Database,
  sessionAuthenticate: () => Promise<AuthenticatedOperator | null>,
  runnerToken: string | undefined = process.env.AGENT_RUNNER_TOKEN,
): Promise<AuthenticatedOperator | null> {
  const bearer = readBearerToken(req)
  if (bearer !== null && isRunnerToken(bearer, runnerToken)) {
    if (req.headers.has(ACTING_FOR_HEADER) || req.headers.has(JOB_HEADER)) {
      return authenticateActingFor(req, db, runnerToken)
    }
    return null
  }
  return sessionAuthenticate()
}
