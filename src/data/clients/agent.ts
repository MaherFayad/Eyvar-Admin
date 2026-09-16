/**
 * Analyst agent's operator-facing surface (`01-analyst-agent.md` §4-5).
 * Runner-token routes go through `agent/mcp/` directly, never this barrel.
 * `cancelAgentJob` is unimplemented: no `'cancelled'` member on `AgentJobState`.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { paginate } from '../mock/query'
import type { Paginated, QueryParams, Single } from '../types/common'
import type { AgentEvent, AgentJob, AgentJobContext, AgentJobKind, AgentRunner, AgentSchedule } from '../types/agent'
import { currentMockUserId } from './session'
import { http } from './http'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

let agentJobFixtures!: Fixtures['agentJobFixtures']
let agentEventFixtures!: Fixtures['agentEventFixtures']
let agentRunnerStatusFixture!: Fixtures['agentRunnerStatusFixture']
let agentRunnerOfflineFixture!: Fixtures['agentRunnerOfflineFixture']
let agentScheduleFixtures!: Fixtures['agentScheduleFixtures']
onFixturesLoaded((f) => {
  agentJobFixtures = f.agentJobFixtures
  agentEventFixtures = f.agentEventFixtures
  agentRunnerStatusFixture = f.agentRunnerStatusFixture
  agentRunnerOfflineFixture = f.agentRunnerOfflineFixture
  agentScheduleFixtures = f.agentScheduleFixtures
  jobs = agentJobFixtures.map((j) => ({ ...j }))
  runnerStatus = { ...agentRunnerStatusFixture }
  schedules = agentScheduleFixtures.map((s) => ({ ...s }))
})

export const AGENT_OPERATIONS = {
  jobs: 'agent.jobs.list',
  job: 'agent.jobs.get',
  events: 'agent.jobs.events',
  create: 'agent.jobs.create',
  status: 'agent.status',
  schedules: 'agent.schedules.list',
  scheduleCreate: 'agent.schedules.create',
  scheduleUpdate: 'agent.schedules.update',
} as const

registerOperations(...Object.values(AGENT_OPERATIONS))

/** Mutable copy. **Not persistence** — Q1 is open, the same as every saved-report resource. */
let jobs!: AgentJob[]
let runnerStatus!: AgentRunner
let schedules!: AgentSchedule[]

export interface AgentJobQuery extends QueryParams {
  /** `mine · team` — §4's index. */
  view?: string | null
}

/**
 * GET /api/v1/agent/jobs
 *   params: q · view=mine|team · filters[state|kind] · page · pageSize
 *   -> Paginated<AgentJob>
 */
export async function listAgentJobs(
  params: AgentJobQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<AgentJob>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<AgentJob>>('/agent/jobs', { ...params, signal }, { signal })
  }
  return mock(AGENT_OPERATIONS.jobs, signal, () => {
    const me = currentMockUserId()
    let rows = jobs
    if (params.view === 'mine') rows = rows.filter((j) => j.requestedBy === me)
    for (const filter of params.filters ?? []) {
      const wanted = Array.isArray(filter.value) ? filter.value.map(String) : [String(filter.value)]
      if (filter.field === 'state') rows = rows.filter((j) => wanted.includes(j.state))
      if (filter.field === 'kind') rows = rows.filter((j) => wanted.includes(j.kind))
    }
    const q = params.q?.trim().toLowerCase()
    if (q) rows = rows.filter((j) => j.question.toLowerCase().includes(q))
    return paginate([...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), params)
  })
}

/**
 * GET /api/v1/agent/jobs/:id
 *   -> Single<AgentJob>
 */
export async function getAgentJob(id: string, signal?: AbortSignal): Promise<Single<AgentJob>> {
  if (DATA_SOURCE === 'http') return http.get<Single<AgentJob>>(`/agent/jobs/${id}`, undefined, { signal })
  return mock(AGENT_OPERATIONS.job, signal, () => {
    const row = jobs.find((j) => j.id === id)
    if (!row) throw notFound('analyst job', id)
    return { data: { ...row } }
  })
}

/**
 * GET /api/v1/agent/jobs/:id/events?after=seq
 *   -> AgentEvent[]
 * Bare array: polls every 2s while running (§4); `after` is the last event id shown, so a re-poll asks only for what's new.
 */
export async function listAgentJobEvents(
  jobId: string,
  after?: string,
  signal?: AbortSignal,
): Promise<AgentEvent[]> {
  if (DATA_SOURCE === 'http') {
    return http.get<AgentEvent[]>(`/agent/jobs/${jobId}/events`, { after, signal }, { signal })
  }
  return mock(AGENT_OPERATIONS.events, signal, () => {
    const all = agentEventFixtures[jobId] ?? []
    if (!after) return [...all]
    const cut = all.findIndex((e) => e.id === after)
    return cut === -1 ? [...all] : all.slice(cut + 1)
  })
}

export interface CreateAgentJobInput {
  kind: AgentJobKind
  question: string
  language: 'ar' | 'en'
  contextObjects: AgentJobContext[]
}

/**
 * POST /api/v1/agent/jobs
 *   -> Single<AgentJob>
 * Creates `queued` and stops: the mock has no runner to claim it (that's `agent/`'s own mock path) — an honest wait, not a simulated claim.
 */
export async function createAgentJob(input: CreateAgentJobInput, signal?: AbortSignal): Promise<Single<AgentJob>> {
  if (DATA_SOURCE === 'http') return http.post<Single<AgentJob>>('/agent/jobs', input, { signal })
  return mockMutation(AGENT_OPERATIONS.create, signal, () => {
    const job: AgentJob = {
      id: `AGT-${jobs.length + 1}${jobs.length}`,
      kind: input.kind,
      question: input.question,
      language: input.language,
      requestedBy: currentMockUserId(),
      state: 'queued',
      failureReason: null,
      retryAt: null,
      contextObjects: input.contextObjects,
      resultPageId: null,
      startedAt: null,
      finishedAt: null,
      createdAt: EYVAR_NOW,
      updatedAt: EYVAR_NOW,
    }
    jobs = [...jobs, job]
    return { data: { ...job } }
  })
}

/**
 * GET /api/v1/agent/status
 *   -> AgentRunner
 * Drives the analyst view's header line (§4): online/offline/at-limit text.
 */
export async function getAgentStatus(signal?: AbortSignal): Promise<AgentRunner> {
  if (DATA_SOURCE === 'http') return http.get<AgentRunner>('/agent/status', undefined, { signal })
  return mock(AGENT_OPERATIONS.status, signal, () => ({ ...runnerStatus }))
}

/** QA seam — `Runner offline`, reachable without hand-editing a fixture. */
export function useOfflineRunner(): void {
  if (!fixturesLoaded()) return
  runnerStatus = { ...agentRunnerOfflineFixture }
}

export function resetAgent(): void {
  if (!fixturesLoaded()) return
  jobs = agentJobFixtures.map((j) => ({ ...j }))
  runnerStatus = { ...agentRunnerStatusFixture }
  schedules = agentScheduleFixtures.map((s) => ({ ...s }))
}

/* ─────────────────────────── scheduled reviews (§8) ──────────────────────────── */

/**
 * GET /api/v1/agent/schedules
 *   -> AgentSchedule[]
 * Bare array (§8): the list is always small, so there's no pagination to wire, same as `listAgentJobEvents`.
 */
export async function listAgentSchedules(signal?: AbortSignal): Promise<AgentSchedule[]> {
  if (DATA_SOURCE === 'http') return http.get<AgentSchedule[]>('/agent/schedules', undefined, { signal })
  return mock(AGENT_OPERATIONS.schedules, signal, () => schedules.map((s) => ({ ...s })))
}

export interface CreateAgentScheduleInput {
  cron: string
  reportIds: string[]
  pageId: string | null
}

/**
 * POST /api/v1/agent/schedules
 *   -> Single<AgentSchedule>
 * `kind` is always `weekly-review` (§8); the input type omits it because the server does not accept it from the body.
 */
export async function createAgentSchedule(input: CreateAgentScheduleInput, signal?: AbortSignal): Promise<Single<AgentSchedule>> {
  if (DATA_SOURCE === 'http') return http.post<Single<AgentSchedule>>('/agent/schedules', input, { signal })
  return mockMutation(AGENT_OPERATIONS.scheduleCreate, signal, () => {
    const schedule: AgentSchedule = {
      id: `AGS-${schedules.length + 1}`,
      kind: 'weekly-review',
      reportIds: input.reportIds,
      pageId: input.pageId,
      cron: input.cron,
      ownerId: currentMockUserId(),
      enabled: true,
      createdAt: EYVAR_NOW,
      updatedAt: EYVAR_NOW,
    }
    schedules = [...schedules, schedule]
    return { data: { ...schedule } }
  })
}

export interface UpdateAgentScheduleInput {
  cron?: string
  enabled?: boolean
  reportIds?: string[]
  pageId?: string | null
}

/**
 * PATCH /api/v1/agent/schedules/:id
 *   -> Single<AgentSchedule>
 * The enable/disable toggle (AC-1266: a disabled schedule enqueues none) shares this endpoint with a cron or template edit.
 */
export async function updateAgentSchedule(id: string, input: UpdateAgentScheduleInput, signal?: AbortSignal): Promise<Single<AgentSchedule>> {
  if (DATA_SOURCE === 'http') return http.patch<Single<AgentSchedule>>(`/agent/schedules/${id}`, input, { signal })
  return mockMutation(AGENT_OPERATIONS.scheduleUpdate, signal, () => {
    const index = schedules.findIndex((s) => s.id === id)
    if (index === -1) throw notFound('schedule', id)
    const current = schedules[index]!
    const next: AgentSchedule = {
      ...current,
      cron: input.cron ?? current.cron,
      enabled: input.enabled ?? current.enabled,
      reportIds: input.reportIds ?? current.reportIds,
      pageId: input.pageId !== undefined ? input.pageId : current.pageId,
      updatedAt: EYVAR_NOW,
    }
    schedules = schedules.map((s, i) => (i === index ? next : s))
    return { data: { ...next } }
  })
}
