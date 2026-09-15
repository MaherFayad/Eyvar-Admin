/**
 * `agent.*` — WP-6.7 (`05-backend.md` §5; `01-analyst-agent.md` §3, §5–§8, §10;
 * AC-1287, AC-1288). The operator-facing surface (`create`/`list`/`get`/
 * `events`/`status`) mirrors `src/data/clients/agent.ts`'s docblocks field
 * for field. The runner-token surface (`heartbeat`, `claim`, `events` (POST),
 * `findings`, `result`, `fail`) has no client — `01-analyst-agent.md` §3.1
 * says those routes are `agent/mcp/`'s, called directly over HTTP, never
 * through the client barrel — so their request shapes are built from
 * `05-backend.md` §5's endpoint table directly.
 *
 * `POST /:id/result` is the endpoint AC-1288 rests on: it re-validates a
 * submitted `CaseStudy` from first principles — never trusting that the
 * runner's own `agent/runner/validate.ts` already checked it — and refuses
 * (422, nothing stored, job state unchanged) rather than fail the job
 * outright, so the runner's own one-retry policy (§7) still has a job to
 * retry against. Only `POST /:id/fail` ever writes `failure_reason`.
 *
 * `POST /reports/sample` (T10, D44) is not named by any WP in
 * `06-execution-plan.md` — it is the analyst's only row-level tool and this
 * WP's brief names its guarantees explicitly, so it is built here rather
 * than left absent; noted in the handoff as a file another WP may expect to
 * own.
 */
import { caseStudyToBlocks } from '@/data/reporting/agent/caseStudyToBlocks'
import { validatePage } from '@/data/reporting/pages/validate'
import type { Block, IconName, Page, PageKind, PageVisibility } from '@/data/types/page'
import type {
  AgentEvent,
  AgentJob,
  AgentJobContext,
  AgentJobFailureReason,
  AgentJobKind,
  AgentJobState,
  AgentRunner,
  CaseStudy,
  CaseStudyFinding,
  CaseStudyFindingValue,
} from '@/data/types/agent'
import type { ReportResult } from '@/data/types/report'
import type { PermissionKey } from '@/data/types/navigation'
import { conflictError, notFoundError, validationError, forbiddenError } from '../errors'
import { jsonResponse, paginated, resolveOffsetPage, single } from '../envelope'
import { requirePermission, type RequestContext } from '../auth'
import { requireAgentRunnerToken } from '../agentAuth'
import type { RouteHandler } from '../router'
import type { Database } from '../db'
import { holdsPermission } from '../permissions'
import { quoteIdent, SAFE_IDENTIFIER, SqlBuilder } from '../compile'
import { rebuildPageReports } from './pages'
import { recordAudit } from '../audit'
import { validateAgentResult } from '../agentResultSchemas'

const READ_PERMISSION: PermissionKey = 'view_analytics'
const CREATE_PERMISSION: PermissionKey = 'view_analytics'

/* ─────────────────────────────── shared body/query helpers ────────────────────────────────── */

async function readJsonBody(req: Request): Promise<unknown> {
  const text = await req.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw validationError([{ field: 'body', code: 'invalid_json', message: 'The request body is not valid JSON' }])
  }
}

function numberParam(url: URL, name: string): number | undefined {
  const raw = url.searchParams.get(name)
  if (raw === null) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

/* ─────────────────────────────────── row shapes ────────────────────────────────────────────── */

interface AgentJobRow {
  id: string
  kind: string
  question: string
  language: string
  context_json: unknown
  requested_by: string
  state: string
  retry_at: string | null
  claimed_by: string | null
  claimed_at: string | null
  started_at: string | null
  finished_at: string | null
  failure_reason: string | null
  result_page_id: string | null
  prompt_version: string | null
  turns: number | null
  tool_calls: number
  created_at: string
  updated_at: string
}

function parseJsonColumn<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  return (typeof value === 'string' ? JSON.parse(value) : value) as T
}

function toAgentJob(row: AgentJobRow): AgentJob {
  return {
    id: row.id,
    kind: row.kind as AgentJobKind,
    question: row.question,
    language: row.language as AgentJob['language'],
    requestedBy: row.requested_by,
    state: row.state as AgentJobState,
    failureReason: row.failure_reason as AgentJobFailureReason | null,
    retryAt: row.retry_at,
    contextObjects: parseJsonColumn<AgentJobContext[]>(row.context_json, []),
    resultPageId: row.result_page_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function fetchJobRow(db: Database, id: string): Promise<AgentJobRow | null> {
  const rows = await db.sql<AgentJobRow>`SELECT * FROM agent_jobs WHERE id = ${id}`
  return rows[0] ?? null
}

interface AgentEventRow {
  id: string
  job_id: string
  seq: string | number
  at: string
  type: string
  payload_json: unknown
}

function toAgentEvent(row: AgentEventRow): AgentEvent {
  const payload = parseJsonColumn<Record<string, unknown>>(row.payload_json, {})
  if (row.type === 'finding') {
    return {
      kind: 'finding',
      id: row.id,
      jobId: row.job_id,
      text: typeof payload.text === 'string' ? payload.text : '',
      runIds: Array.isArray(payload.runIds) ? (payload.runIds as string[]) : [],
      ts: row.at,
    }
  }
  return {
    kind: 'tool-call',
    id: row.id,
    jobId: row.job_id,
    tool: typeof payload.tool === 'string' ? payload.tool : '',
    summary: typeof payload.summary === 'string' ? payload.summary : '',
    durationMs: typeof payload.durationMs === 'number' ? payload.durationMs : 0,
    ts: row.at,
  }
}

/* ──────────────────────────────── operator surface ─────────────────────────────────────────── */

interface ParsedFilter {
  field: string
  op: string
  value: string
}

/** `?filter=field:op:value`, repeated — the same convention `alerts.ts`'s own local copy reads. */
function parseFilters(url: URL): ParsedFilter[] {
  return url.searchParams.getAll('filter').map((raw) => {
    const [field, op, ...rest] = raw.split(':')
    return { field: field ?? '', op: op ?? 'eq', value: rest.join(':') }
  })
}

function filterValues(filter: ParsedFilter): string[] {
  return filter.value.split(',').filter((v) => v.length > 0)
}

/** GET /api/v1/agent/jobs  params: q · view=mine|team · filter=state:in:… · filter=kind:in:… · page · pageSize  -> Paginated<AgentJob> */
export function createListAgentJobsHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    const operator = requirePermission(ctx, READ_PERMISSION)
    const rows = await db.sql<AgentJobRow>`SELECT * FROM agent_jobs ORDER BY created_at DESC`
    let jobs = rows.map(toAgentJob)

    const url = new URL(req.url)
    if (url.searchParams.get('view') === 'mine') jobs = jobs.filter((j) => j.requestedBy === operator.userId)
    for (const filter of parseFilters(url)) {
      const wanted = filterValues(filter)
      if (wanted.length === 0) continue
      if (filter.field === 'state') jobs = jobs.filter((j) => wanted.includes(j.state))
      if (filter.field === 'kind') jobs = jobs.filter((j) => wanted.includes(j.kind))
    }
    const q = url.searchParams.get('q')?.trim().toLowerCase()
    if (q) jobs = jobs.filter((j) => j.question.toLowerCase().includes(q))

    const { page, pageSize, offset, limit } = resolveOffsetPage({ page: numberParam(url, 'page'), pageSize: numberParam(url, 'pageSize') })
    return jsonResponse(paginated(jobs.slice(offset, offset + limit), jobs.length, page, pageSize))
  }
}

/** GET /api/v1/agent/jobs/:id -> Single<AgentJob> */
export function createGetAgentJobHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    requirePermission(ctx, READ_PERMISSION)
    const row = await fetchJobRow(db, ctx.params.id ?? '')
    if (!row) throw notFoundError(`agent job ${ctx.params.id}`)
    return jsonResponse(single(toAgentJob(row)))
  }
}

/** GET /api/v1/agent/jobs/:id/events?after=<eventId> -> AgentEvent[] (bare array — `src/data/clients/agent.ts`). */
export function createListAgentJobEventsHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    requirePermission(ctx, READ_PERMISSION)
    const jobId = ctx.params.id ?? ''
    const job = await fetchJobRow(db, jobId)
    if (!job) throw notFoundError(`agent job ${jobId}`)

    const url = new URL(req.url)
    const after = url.searchParams.get('after')
    let afterSeq: number | null = null
    if (after) {
      const afterRows = await db.sql<{ seq: string | number }>`SELECT seq FROM agent_events WHERE id = ${after}`
      afterSeq = afterRows[0] ? Number(afterRows[0].seq) : null
    }

    const rows =
      afterSeq === null
        ? await db.sql<AgentEventRow>`SELECT * FROM agent_events WHERE job_id = ${jobId} ORDER BY seq ASC`
        : await db.sql<AgentEventRow>`SELECT * FROM agent_events WHERE job_id = ${jobId} AND seq > ${afterSeq} ORDER BY seq ASC`

    return jsonResponse(rows.map(toAgentEvent))
  }
}

const JOB_KINDS: readonly AgentJobKind[] = ['ask', 'case-study', 'build-page', 'triage-alert', 'weekly-review']

async function contextObjectExists(db: Database, context: AgentJobContext): Promise<boolean> {
  if (context.kind === 'window') return true
  if (context.kind === 'report') {
    const rows = await db.sql<{ id: string }>`SELECT id FROM saved_reports WHERE id = ${context.id}`
    return rows.length > 0
  }
  if (context.kind === 'page') {
    const rows = await db.sql<{ id: string }>`SELECT id FROM pages WHERE id = ${context.id}`
    return rows.length > 0
  }
  const rows = await db.sql<{ id: string }>`SELECT id FROM alert_firings WHERE id = ${context.id}`
  return rows.length > 0
}

/**
 * POST /api/v1/agent/jobs
 *   body: { kind, question, language, contextObjects }
 *   -> Single<AgentJob>, 201
 *
 * "validates kind and context ids the operator can see" (05-backend.md §5):
 * a context object naming an id that does not exist is refused before the
 * job is created, never silently dropped.
 */
export function createCreateAgentJobHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    const operator = requirePermission(ctx, CREATE_PERMISSION)
    const body = (await readJsonBody(req)) as Record<string, unknown>

    const kind = body.kind as AgentJobKind
    if (!JOB_KINDS.includes(kind)) {
      throw validationError([{ field: 'kind', code: 'invalid', message: `kind must be one of ${JOB_KINDS.join(', ')}` }])
    }
    const question = typeof body.question === 'string' ? body.question.trim() : ''
    if (!question) throw validationError([{ field: 'question', code: 'required', message: 'A question is required' }])
    const language = body.language === 'ar' || body.language === 'en' ? body.language : null
    if (!language) throw validationError([{ field: 'language', code: 'invalid', message: 'language must be "ar" or "en"' }])
    const contextObjects: AgentJobContext[] = Array.isArray(body.contextObjects) ? (body.contextObjects as AgentJobContext[]) : []

    for (const context of contextObjects) {
      if (!(await contextObjectExists(db, context))) {
        throw validationError([
          { field: 'contextObjects', code: 'not-found', message: `${context.kind} context object does not exist` },
        ])
      }
    }

    const inserted = await db.sql<AgentJobRow>`
      INSERT INTO agent_jobs (kind, question, language, context_json, requested_by)
      VALUES (${kind}, ${question}, ${language}, ${JSON.stringify(contextObjects)}, ${operator.userId})
      RETURNING *
    `
    return jsonResponse(single(toAgentJob(inserted[0]!)), 201)
  }
}

const RUNNER_ONLINE_WINDOW_MS = 90 * 1000

interface RunnerRow {
  id: string
  name: string
  last_heartbeat_at: string | null
  state: string
  limit_until: string | null
}

/** GET /api/v1/agent/status -> AgentRunner (bare — §4's header line). Aggregates across every runner row: one is enough to be "online". */
export function createGetAgentStatusHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    requirePermission(ctx, READ_PERMISSION)
    const runners = await db.sql<RunnerRow>`SELECT * FROM agent_runners`
    const now = Date.now()

    const heartbeats = runners.map((r) => (r.last_heartbeat_at ? new Date(r.last_heartbeat_at).getTime() : null))
    const online = heartbeats.some((t) => t !== null && now - t < RUNNER_ONLINE_WINDOW_MS)
    const lastHeartbeatAt = heartbeats.reduce<string | null>((latest, t, i) => {
      if (t === null) return latest
      const iso = runners[i]!.last_heartbeat_at
      return latest === null || t > new Date(latest).getTime() ? iso : latest
    }, null)

    const limited = runners
      .filter((_r, i) => heartbeats[i] !== null && now - heartbeats[i]! < RUNNER_ONLINE_WINDOW_MS)
      .filter((r) => r.limit_until !== null && new Date(r.limit_until).getTime() > now)
    const limitedUntil = limited.length > 0 ? limited.reduce((max, r) => (r.limit_until! > max ? r.limit_until! : max), limited[0]!.limit_until!) : null

    const queueRows = await db.sql<{ count: string }>`SELECT count(*)::text AS count FROM agent_jobs WHERE state = 'queued'`

    const status: AgentRunner = {
      online,
      lastHeartbeatAt,
      limitedUntil,
      queueDepth: Number(queueRows[0]?.count ?? '0'),
    }
    return jsonResponse(status)
  }
}

/* ──────────────────────────────── runner surface ────────────────────────────────────────────── */

interface HeartbeatBody {
  id?: string
  name?: string
  limitUntil?: string | null
}

/** POST /api/v1/agent/heartbeat  runner token  body: { id, name?, limitUntil? }  -> { ok: true }. Upserts `agent_runners`; §3.3 says every 30 s. */
export function createAgentHeartbeatHandler(db: Database): RouteHandler<RequestContext> {
  return async (req) => {
    requireAgentRunnerToken(req)
    const body = (await readJsonBody(req)) as HeartbeatBody
    const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : null
    if (!id) throw validationError([{ field: 'id', code: 'required', message: 'A runner id is required' }])
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : id
    const limitUntil = typeof body.limitUntil === 'string' ? body.limitUntil : null
    const state = limitUntil && new Date(limitUntil).getTime() > Date.now() ? 'limited' : 'online'

    await db.sql`
      INSERT INTO agent_runners (id, name, last_heartbeat_at, state, limit_until)
      VALUES (${id}, ${name}, now(), ${state}, ${limitUntil})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, last_heartbeat_at = now(), state = EXCLUDED.state, limit_until = EXCLUDED.limit_until
    `
    return jsonResponse({ ok: true })
  }
}

/**
 * POST /api/v1/agent/jobs/claim  runner token  body: { runnerId? }
 *   -> Single<AgentJob>, 200 when a job was claimed; 204 when none is due.
 *
 * AC-1287: the atomic claim. The row is chosen and locked in one scalar
 * subquery (`SELECT … FOR UPDATE SKIP LOCKED … LIMIT 1`) evaluated as part
 * of the same `UPDATE` statement, so two concurrent claims can never both
 * select the same row — one wins the `UPDATE`, the other's subquery either
 * skips the now-locked row (finds a different queued job) or returns no
 * row at all (204), never a duplicate claim. This is the database
 * arbitrating, not a read-then-write race the handler resolves itself.
 */
export function createClaimAgentJobHandler(db: Database): RouteHandler<RequestContext> {
  return async (req) => {
    requireAgentRunnerToken(req)
    const claimed = await db.sql<AgentJobRow>`
      UPDATE agent_jobs
      SET state = 'running', claimed_at = now(), started_at = now(), updated_at = now()
      WHERE id = (
        SELECT id FROM agent_jobs
        -- queued always has retry_at IS NULL; a deferred job (section 10's
        -- rate-limit path) re-enters this same pool the moment its own
        -- retry_at passes, with no separate requeue step or cron.
        WHERE state IN ('queued', 'deferred') AND (retry_at IS NULL OR retry_at < now())
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `
    const row = claimed[0]
    if (!row) return new Response(null, { status: 204 })
    return jsonResponse(single(toAgentJob(row)), 200)
  }
}

interface EventInput {
  type: 'tool-call' | 'finding'
  tool?: string
  summary?: string
  durationMs?: number
  text?: string
  runIds?: string[]
}

function isValidEventInput(raw: unknown): raw is EventInput {
  if (!raw || typeof raw !== 'object') return false
  const r = raw as Record<string, unknown>
  if (r.type === 'tool-call') return typeof r.tool === 'string' && typeof r.summary === 'string'
  if (r.type === 'finding') return typeof r.text === 'string' && Array.isArray(r.runIds)
  return false
}

/** Inserts one or more events for a `running` job, bumping `tool_calls` and `updated_at`. Shared by the batched-events route and the single-finding route (T19). */
async function insertEvents(db: Database, jobId: string, events: EventInput[]): Promise<number> {
  let toolCalls = 0
  for (const event of events) {
    const payload =
      event.type === 'tool-call'
        ? { tool: event.tool, summary: event.summary, durationMs: event.durationMs ?? 0 }
        : { text: event.text, runIds: event.runIds ?? [] }
    await db.sql`INSERT INTO agent_events (job_id, type, payload_json) VALUES (${jobId}, ${event.type}, ${JSON.stringify(payload)})`
    if (event.type === 'tool-call') toolCalls += 1
  }
  await db.sql`UPDATE agent_jobs SET tool_calls = tool_calls + ${toolCalls}, updated_at = now() WHERE id = ${jobId}`
  return events.length
}

async function requireRunningJob(db: Database, jobId: string): Promise<AgentJobRow> {
  const row = await fetchJobRow(db, jobId)
  if (!row) throw notFoundError(`agent job ${jobId}`)
  if (row.state !== 'running') {
    throw conflictError([{ field: 'state', code: 'not-claimed', message: `job ${jobId} is not running` }], 'This job is not claimed')
  }
  return row
}

/** POST /api/v1/agent/jobs/:id/events  runner token, claimed job only  body: { events: EventInput[] }  -> { inserted: number }. ≤ 50 per post (05-backend.md §5). */
export function createPostAgentJobEventsHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    requireAgentRunnerToken(req)
    const jobId = ctx.params.id ?? ''
    await requireRunningJob(db, jobId)
    const body = (await readJsonBody(req)) as { events?: unknown }
    const events = Array.isArray(body.events) ? body.events.filter(isValidEventInput) : []
    if (events.length === 0) {
      throw validationError([{ field: 'events', code: 'required', message: 'At least one valid event is required' }])
    }
    if (events.length > 50) {
      throw validationError([{ field: 'events', code: 'too-many', message: 'At most 50 events per post' }])
    }
    const inserted = await insertEvents(db, jobId, events)
    return jsonResponse({ inserted })
  }
}

/** POST /api/v1/agent/jobs/:id/findings  runner token (T19)  body: { text, runIds }  -> ok */
export function createPostAgentJobFindingHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    requireAgentRunnerToken(req)
    const jobId = ctx.params.id ?? ''
    await requireRunningJob(db, jobId)
    const body = (await readJsonBody(req)) as { text?: unknown; runIds?: unknown }
    const text = typeof body.text === 'string' ? body.text : ''
    if (!text) throw validationError([{ field: 'text', code: 'required', message: 'A finding needs text' }])
    const runIds = Array.isArray(body.runIds) ? body.runIds.filter((r): r is string => typeof r === 'string') : []
    await insertEvents(db, jobId, [{ type: 'finding', text, runIds }])
    return jsonResponse({ ok: true })
  }
}

/**
 * POST /api/v1/agent/jobs/:id/fail  runner token
 *   body: { outcome: 'failed', reason: 'timeout'|'evidence'|'schema' } | { outcome: 'deferred', retryAt?: IsoDateTime }
 *   -> Single<AgentJob>
 *
 * The runner's own exhaustion of its retry budget (§7, §10) — the one path
 * that writes `failure_reason`, distinct from `/:id/result`'s refusal,
 * which leaves a `running` job retryable.
 */
const FAILURE_REASONS: readonly AgentJobFailureReason[] = ['timeout', 'evidence', 'schema']
const DEFAULT_DEFER_MINUTES = 60

export function createPostAgentJobFailHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    requireAgentRunnerToken(req)
    const jobId = ctx.params.id ?? ''
    await requireRunningJob(db, jobId)
    const body = (await readJsonBody(req)) as { outcome?: unknown; reason?: unknown; retryAt?: unknown }

    if (body.outcome === 'deferred') {
      const retryAt =
        typeof body.retryAt === 'string' ? body.retryAt : new Date(Date.now() + DEFAULT_DEFER_MINUTES * 60 * 1000).toISOString()
      const rows = await db.sql<AgentJobRow>`
        UPDATE agent_jobs SET state = 'deferred', retry_at = ${retryAt}, updated_at = now() WHERE id = ${jobId} RETURNING *
      `
      return jsonResponse(single(toAgentJob(rows[0]!)))
    }

    const reason = body.reason as AgentJobFailureReason
    if (!FAILURE_REASONS.includes(reason)) {
      throw validationError([{ field: 'reason', code: 'invalid', message: `reason must be one of ${FAILURE_REASONS.join(', ')}` }])
    }
    const rows = await db.sql<AgentJobRow>`
      UPDATE agent_jobs SET state = 'failed', failure_reason = ${reason}, finished_at = now(), updated_at = now()
      WHERE id = ${jobId}
      RETURNING *
    `
    return jsonResponse(single(toAgentJob(rows[0]!)))
  }
}

/* ──────────────────────────── result validation — AC-1288 / F-V2-38 ──────────────────────────── */

/** Every runId a `CaseStudy` cites, from every place §7's schema allows one. */
function citedRunIds(study: CaseStudy): string[] {
  const ids = new Set<string>()
  ids.add(study.baseline.runId)
  for (const finding of study.findings) {
    for (const id of finding.evidence) ids.add(id)
    for (const value of finding.values) ids.add(value.runId)
  }
  for (const contributor of study.contributors) ids.add(contributor.runId)
  for (const alternative of study.alternatives) for (const id of alternative.evidence) ids.add(id)
  return Array.from(ids)
}

/** The `ask` kind's narrower citation set — `findings[]` only, per `agent/schemas/ask.schema.json` (no `baseline`/`contributors`/`alternatives`). */
function citedRunIdsFromFindings(findings: readonly CaseStudyFinding[]): string[] {
  const ids = new Set<string>()
  for (const finding of findings) {
    for (const id of finding.evidence) ids.add(id)
    for (const value of finding.values) ids.add(value.runId)
  }
  return Array.from(ids)
}

interface RunRow {
  id: string
  result_json: unknown
}

/** Recomputes the number a `CaseStudyFindingValue` claims, from the run's own stored `ReportResult` — never from the claim itself. `null` means "could not be recomputed" (series or bucket absent), which is itself a mismatch. */
function recomputeValue(result: ReportResult, value: CaseStudyFindingValue): number | null {
  const series = result.series.find((s) => s.id === value.seriesId)
  if (!series) return null
  if (value.bucket === 'total') {
    return series.points.reduce((sum: number, p) => sum + (p ?? 0), 0)
  }
  const index = result.buckets.indexOf(value.bucket)
  if (index === -1) return null
  return series.points[index] ?? null
}

/** "Within rounding" (§7): at least 1 unit or 0.5 % of the recomputed magnitude, whichever is larger — enough slack for integer halalas and float means alike, none for a fabricated number. */
function withinRounding(recomputed: number, claimed: number): boolean {
  const tolerance = Math.max(1, Math.abs(recomputed) * 0.005)
  return Math.abs(recomputed - claimed) <= tolerance
}

interface EvidenceCheck {
  ok: boolean
  violations: string[]
}

/**
 * AC-1288, in full: every cited runId must exist as a `report_runs` row
 * **belonging to this job** (`job_id = jobId` — a real run from a different
 * job is exactly as refused as a run id that does not exist at all), and
 * every `finding.values[]` entry must match what that run actually recorded.
 *
 * Takes the citation set and the findings array directly rather than a
 * `CaseStudy` — `ask` cites a narrower set (`citedRunIdsFromFindings`, no
 * `baseline`/`contributors`/`alternatives`) but its `findings[]` shape is
 * otherwise identical, so this one function serves both.
 */
async function checkEvidence(db: Database, jobId: string, ids: string[], findings: readonly CaseStudyFinding[]): Promise<EvidenceCheck> {
  const violations: string[] = []
  if (ids.length === 0) return { ok: true, violations: [] }

  const rows = await db.sql<RunRow>`SELECT id, result_json FROM report_runs WHERE id = ANY(${ids}) AND job_id = ${jobId}`
  const byId = new Map(rows.map((r) => [r.id, parseJsonColumn<ReportResult>(r.result_json, {} as ReportResult)]))

  for (const id of ids) {
    if (!byId.has(id)) violations.push(`runId "${id}" does not belong to this job`)
  }

  for (const finding of findings) {
    for (const value of finding.values) {
      const result = byId.get(value.runId)
      if (!result) continue // already reported above
      const recomputed = recomputeValue(result, value)
      if (recomputed === null || !withinRounding(recomputed, value.value)) {
        violations.push(
          `finding "${finding.id}" value for run "${value.runId}" (${value.seriesId} · ${value.bucket}) claims ${value.value}, the run recorded ${recomputed ?? 'nothing'}`,
        )
      }
    }
  }

  return { ok: violations.length === 0, violations }
}

async function storeRenderedPage(
  db: Database,
  opts: { kind: PageKind; title: string; description: string; requestedBy: string; blocks: Block[] },
): Promise<Page> {
  const { kind, title, description, requestedBy, blocks } = opts
  const candidate: Page = {
    id: 'pending',
    kind,
    title: title.slice(0, 200),
    icon: null,
    description,
    ownerId: requestedBy,
    visibility: 'private',
    tags: ['analyst'],
    official: false,
    scope: { range: null, filters: [] },
    blocks,
    version: 1,
    publishedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: requestedBy,
  }
  const pageViolations = validatePage(candidate)
  if (pageViolations.length > 0) {
    throw validationError(
      pageViolations.map((v) => ({ field: v.blockId ?? (v.path || 'blocks'), code: v.code, message: v.message })),
      'The rendered page failed validation',
    )
  }

  const inserted = await db.sql<{
    id: string
    kind: string
    title: string
    icon: string | null
    description: string | null
    owner_id: string
    visibility: string
    tags_json: unknown
    official: boolean
    scope_json: unknown
    blocks_json: unknown
    version: number
    published_at: string | null
    created_at: string
    updated_at: string
    updated_by: string
  }>`
    INSERT INTO pages (kind, title, icon, description, owner_id, visibility, tags_json, official, scope_json, blocks_json, updated_by)
    VALUES (${candidate.kind}, ${candidate.title}, ${candidate.icon}, ${candidate.description}, ${requestedBy}, ${candidate.visibility},
            ${JSON.stringify(candidate.tags)}, ${candidate.official}, ${JSON.stringify(candidate.scope)}, ${JSON.stringify(blocks)}, ${requestedBy})
    RETURNING *
  `
  const row = inserted[0]!
  await rebuildPageReports(db, row.id, blocks)
  return {
    id: row.id,
    kind: row.kind as PageKind,
    title: row.title,
    icon: row.icon as IconName | null,
    description: row.description,
    ownerId: row.owner_id,
    visibility: row.visibility as PageVisibility,
    tags: parseJsonColumn<string[]>(row.tags_json, []),
    official: row.official,
    scope: parseJsonColumn(row.scope_json, { range: null, filters: [] }),
    blocks: parseJsonColumn<Block[]>(row.blocks_json, []),
    version: row.version,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  }
}

async function storeCaseStudyPage(db: Database, jobId: string, requestedBy: string, study: CaseStudy): Promise<Page> {
  return storeRenderedPage(db, {
    kind: 'case-study',
    title: study.title,
    description: study.question,
    requestedBy,
    blocks: caseStudyToBlocks(study, jobId),
  })
}

/** `id`s stable within one page — `validatePage`'s `duplicate-block-id` rule. */
function textBlock(id: string, md: string): Block {
  return { id, type: 'text', md } as Block
}
function headingBlock(id: string, text: string): Block {
  return { id, type: 'heading', level: 1, text } as Block
}

/**
 * `ask` has no renderer of its own in `src/data/reporting/agent/` —
 * `caseStudyToBlocks()` is the only one that exists, and it reads
 * `decision`/`headline`/`baseline`/`contributors`/`alternatives`/
 * `recommendations`, none of which an `AskResult` (`agent/schemas/
 * ask.schema.json`: `answer`, `findings`, `dataQuality`, `followUps`) has.
 * `src/data/types/agent.ts`'s `AgentJob`/`CaseStudy` types have no
 * `AskResult` member either — both are `src/` files this WP does not own.
 * Rather than force an `ask` result through `caseStudyToBlocks` (which
 * would either throw on the missing fields or silently drop `answer`), this
 * is a small, self-contained renderer using only block types (`heading`,
 * `text`) already in `@/data/types/page` — every field the answer actually
 * has reaches the page; nothing is invented to fill a `CaseStudy` shape it
 * was never in. Flagged in this WP's report as the gap a real `AskResult`
 * type + renderer on the `src/` side should close.
 */
function askResultToBlocks(answer: {
  title: string
  answer: { text: string; confidence: string; confidenceReason: string }
  findings: CaseStudyFinding[]
  followUps: string[]
  dataQuality: { coverageNote: string }
}): Block[] {
  const blocks: Block[] = [headingBlock('ask-title', answer.title), textBlock('ask-answer', answer.answer.text)]
  answer.findings.forEach((f, i) => blocks.push(textBlock(`ask-finding-${i}`, f.text)))
  if (answer.followUps.length > 0) {
    blocks.push(textBlock('ask-followups', answer.followUps.map((f) => `- ${f}`).join('\n')))
  }
  blocks.push(textBlock('ask-coverage', answer.dataQuality.coverageNote))
  return blocks
}

async function storeAskResultPage(
  db: Database,
  requestedBy: string,
  question: string,
  answer: Parameters<typeof askResultToBlocks>[0],
): Promise<Page> {
  return storeRenderedPage(db, {
    kind: 'note',
    title: answer.title,
    description: question,
    requestedBy,
    blocks: askResultToBlocks(answer),
  })
}

/**
 * POST /api/v1/agent/jobs/:id/result  runner token  body: the kind's output
 *   -> Single<AgentJob>
 *
 * Refuses (422, nothing stored, job left `running`) on a schema violation or
 * an evidence violation — AC-1288's two named cases: a foreign `runId`, and
 * a finding whose numbers do not match its cited run. Only a successful
 * validation writes anything: the page, then the job's `done` state.
 *
 * F-V2-38 (WP-6.2c): every kind now validates against its **own**
 * `agent/schemas/*.json` file (`validateAgentResult`), not one hand-rolled
 * `CaseStudy` shape applied to all five. Before this WP, `'ask'` results
 * were checked against the `case-study`/`triage-alert`/`weekly-review`
 * shape (`decision`/`headline`/`baseline`/`contributors`/`alternatives`/
 * `recommendations`) — fields an `AskResult` (`answer`/`findings`/
 * `dataQuality`/`followUps`) does not have, so a genuinely correct `ask`
 * result would always have been refused. `case-study`/`triage-alert`/
 * `weekly-review` share one wire shape by design (`jobAssembly.ts`'s own
 * comment: "triage and review are literally the case-study shape") and keep
 * going through `checkEvidence`/`storeCaseStudyPage` unchanged; `'ask'` gets
 * its own, narrower evidence check and its own renderer (`storeAskResultPage`
 * — see that function's header for the `src/`-side gap this leaves).
 */
function throwSchemaViolations(violations: readonly { path: string; message: string }[], summary: string): never {
  throw validationError(
    violations.map((v) => ({ field: v.path, code: 'schema', message: v.message })),
    summary,
  )
}

export function createPostAgentJobResultHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    requireAgentRunnerToken(req)
    const jobId = ctx.params.id ?? ''
    const job = await requireRunningJob(db, jobId)
    const kind = job.kind as AgentJobKind
    const body = (await readJsonBody(req)) as { turns?: unknown } & Record<string, unknown>
    const turns = typeof body.turns === 'number' ? body.turns : null

    let resultPageId: string

    if (kind === 'build-page') {
      const blocks = Array.isArray(body.blocks) ? (body.blocks as Block[]) : null
      if (!blocks) throw validationError([{ field: 'blocks', code: 'required', message: 'blocks must be an array' }])
      const schemaViolations = validateAgentResult(kind, blocks)
      if (schemaViolations.length > 0) throwSchemaViolations(schemaViolations, 'The result does not match the build-page schema')

      const title = typeof body.title === 'string' ? body.title : job.question
      const page = await storeRenderedPage(db, { kind: 'dashboard', title, description: job.question, requestedBy: job.requested_by, blocks })
      resultPageId = page.id
    } else if (kind === 'ask') {
      const schemaViolations = validateAgentResult(kind, body)
      if (schemaViolations.length > 0) throwSchemaViolations(schemaViolations, 'The result does not match the ask schema')

      const answer = body as {
        title: string
        answer: { text: string; confidence: string; confidenceReason: string }
        findings: CaseStudyFinding[]
        followUps: string[]
        dataQuality: { coverageNote: string }
      }
      const evidence = await checkEvidence(db, jobId, citedRunIdsFromFindings(answer.findings), answer.findings)
      if (!evidence.ok) {
        throw validationError(
          evidence.violations.map((message) => ({ field: 'result', code: 'evidence', message })),
          'The result cites numbers this job cannot substantiate',
        )
      }
      const page = await storeAskResultPage(db, job.requested_by, job.question, answer)
      resultPageId = page.id
    } else {
      // 'case-study' | 'triage-alert' | 'weekly-review' — one shared wire shape (see the docblock above).
      const schemaViolations = validateAgentResult(kind, body)
      if (schemaViolations.length > 0) throwSchemaViolations(schemaViolations, `The result does not match the ${kind} schema`)

      const study = body as unknown as CaseStudy
      const evidence = await checkEvidence(db, jobId, citedRunIds(study), study.findings)
      if (!evidence.ok) {
        throw validationError(
          evidence.violations.map((message) => ({ field: 'result', code: 'evidence', message })),
          'The result cites numbers this job cannot substantiate',
        )
      }
      const page = await storeCaseStudyPage(db, jobId, job.requested_by, study)
      resultPageId = page.id
    }

    const rows = await db.sql<AgentJobRow>`
      UPDATE agent_jobs SET state = 'done', result_page_id = ${resultPageId}, finished_at = now(), updated_at = now(), turns = ${turns}
      WHERE id = ${jobId} RETURNING *
    `
    return jsonResponse(single(toAgentJob(rows[0]!)))
  }
}

/* ───────────────────────────── T10 sample_rows — D44 ───────────────────────────────────────── */

interface MeasureSourceRow {
  resource: string
  table_name: string
  pii_columns_json: unknown
}

interface SampleFilter {
  field: string
  op: string
  value: unknown
}

/** `column → masked value`. The three shapes §5's tool table names; anything else that is declared PII gets a flat redaction rather than passing through unmasked. */
function maskValue(column: string, raw: unknown): unknown {
  if (raw === null || raw === undefined) return raw
  const value = String(raw)
  const lower = column.toLowerCase()
  if (lower.includes('phone')) return `••${value.slice(-2)}`
  if (lower.includes('name')) {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')
  }
  if (lower.includes('email')) {
    const at = value.indexOf('@')
    return at === -1 ? '••••' : `${value[0] ?? ''}••••${value.slice(at)}`
  }
  return '••••'
}

const SAMPLE_ROW_CAP = 50

/**
 * POST /api/v1/reports/sample (T10, D44)
 *   body: { resource, filters?: FilterSpec[], limit? }
 *   -> { rows: Record<string, unknown>[] }
 *
 * The only row-level tool (§5). Refused for an operator without `view` on
 * the resource's measures; capped at 50 regardless of what is asked;
 * declared-PII columns masked server-side, never left to the caller; every
 * call writes one `audit_log` row naming who, when, which job (when reached
 * through the agent path), and which resource (D44).
 */
export function createSampleRowsHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    const operator = requirePermission(ctx, 'view_analytics')
    const body = (await readJsonBody(req)) as { resource?: unknown; filters?: unknown; limit?: unknown }
    const resource = typeof body.resource === 'string' ? body.resource : ''
    if (!resource) throw validationError([{ field: 'resource', code: 'required', message: 'A resource is required' }])

    const sourceRows = await db.sql<MeasureSourceRow>`SELECT resource, table_name, pii_columns_json FROM measure_sources WHERE resource = ${resource}`
    const source = sourceRows[0]
    if (!source) throw notFoundError(`resource ${resource}`)

    const permissionRows = await db.sql<{ permission_key: string | null }>`
      SELECT DISTINCT permission_key FROM measures WHERE population_resource = ${resource} AND permission_key IS NOT NULL
    `
    for (const row of permissionRows) {
      const key = row.permission_key as PermissionKey | null
      if (key && !holdsPermission({ userId: operator.userId, roleId: operator.role, status: 'Active', permissions: operator.permissions }, key)) {
        throw forbiddenError(key)
      }
    }

    const columnRows = await db.sql<{ column_name: string }>`
      SELECT column_name FROM information_schema.columns WHERE table_name = ${source.table_name}
    `
    const validColumns = new Set(columnRows.map((r) => r.column_name))
    const piiColumns = new Set(parseJsonColumn<string[]>(source.pii_columns_json, []))

    const filters: SampleFilter[] = Array.isArray(body.filters) ? (body.filters as SampleFilter[]) : []
    const sb = new SqlBuilder()
    sb.text(`SELECT * FROM ${quoteIdent(source.table_name)}`)
    for (const filter of filters) {
      if (!SAFE_IDENTIFIER.test(filter.field) || !validColumns.has(filter.field)) {
        throw validationError([{ field: 'filters', code: 'unknown-field', message: `"${filter.field}" is not a column of ${resource}` }])
      }
    }
    if (filters.length > 0) {
      sb.text(' WHERE ')
      filters.forEach((filter, i) => {
        if (i > 0) sb.text(' AND ')
        const col = quoteIdent(filter.field)
        switch (filter.op) {
          case 'in':
            sb.text(`${col} = ANY(`).param(filter.value).text(')')
            break
          case 'isNull':
            sb.text(`${col} IS NULL`)
            break
          case 'isNotNull':
            sb.text(`${col} IS NOT NULL`)
            break
          case 'contains':
            sb.text(`${col} ILIKE '%' || `).param(String(filter.value)).text(` || '%'`)
            break
          default:
            sb.text(`${col} = `).param(filter.value)
        }
      })
    }
    const requestedLimit = typeof body.limit === 'number' ? body.limit : SAMPLE_ROW_CAP
    const cap = Math.max(1, Math.min(SAMPLE_ROW_CAP, Math.trunc(requestedLimit)))
    sb.text(` LIMIT ${cap}`)

    const rawRows = await sb.run<Record<string, unknown>>(db)
    const rows = rawRows.map((row) => {
      const masked: Record<string, unknown> = {}
      for (const [column, value] of Object.entries(row)) {
        masked[column] = piiColumns.has(column) ? maskValue(column, value) : value
      }
      return masked
    })

    const actingVia = req.headers.get('x-eyvar-job') ? 'analyst-agent' : 'operator'
    const jobId = req.headers.get('x-eyvar-job')
    await recordAudit(db, {
      userId: operator.userId,
      actingVia,
      action: 'sample_rows',
      entityType: 'resource',
      entityId: resource,
      summary: { filters, limit: cap, rowCount: rows.length, jobId },
    })

    return jsonResponse({ rows })
  }
}
