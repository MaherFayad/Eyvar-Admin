/**
 * The runner-token identity scheme (AC-1287, §3.2). A bare runner call uses
 * `requireAgentRunnerToken` alone; an acting-for call also carries
 * `X-Eyvar-Acting-For`/`X-Eyvar-Job` and resolves to the named operator's
 * own permissions via `authenticateActingFor` — never the runner's, never a union. */
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
 * Resolves an acting-for request to the named operator's identity (AC-1287).
 * Every failure — wrong token, missing headers, unclaimed job, mismatched
 * requester, inactive operator — refuses outright; no fallback to the
 * runner's own (nonexistent) permissions. */
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
 * Called once by `[...route].ts` instead of a bare `authenticate()`. A
 * runner token with an acting-for header pair is always fully validated
 * (AC-1287) — never silently falls back to "signed out" on a wrong job or
 * operator. No headers: `null`, since agent routes authenticate themselves. */
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
