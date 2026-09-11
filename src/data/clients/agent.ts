/**
 * The analyst agent's operator-facing surface — `01-analyst-agent.md` §4, §5.
 * The runner-token routes (events, findings, result) are `agent/mcp/`'s, over
 * HTTP directly, never through this barrel. `AgentJobState` has no
 * `'cancelled'` member yet, so `cancelAgentJob` is not implemented here;
 * flagged in the handoff rather than minted.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { paginate } from '../mock/query'
import type { Paginated, QueryParams, Single } from '../types/common'
import type { AgentEvent, AgentJob, AgentJobContext, AgentJobKind, AgentRunner } from '../types/agent'
import { currentMockUserId } from './session'
import { http } from './http'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

let agentJobFixtures!: Fixtures['agentJobFixtures']
let agentEventFixtures!: Fixtures['agentEventFixtures']
let agentRunnerStatusFixture!: Fixtures['agentRunnerStatusFixture']
let agentRunnerOfflineFixture!: Fixtures['agentRunnerOfflineFixture']
onFixturesLoaded((f) => {
  agentJobFixtures = f.agentJobFixtures
  agentEventFixtures = f.agentEventFixtures
  agentRunnerStatusFixture = f.agentRunnerStatusFixture
  agentRunnerOfflineFixture = f.agentRunnerOfflineFixture
  jobs = agentJobFixtures.map((j) => ({ ...j }))
  runnerStatus = { ...agentRunnerStatusFixture }
})

export const AGENT_OPERATIONS = {
  jobs: 'agent.jobs.list',
  job: 'agent.jobs.get',
  events: 'agent.jobs.events',
  create: 'agent.jobs.create',
  status: 'agent.status',
} as const

registerOperations(...Object.values(AGENT_OPERATIONS))

/** Mutable copy. **Not persistence** — Q1 is open, the same as every saved-report resource. */
let jobs!: AgentJob[]
let runnerStatus!: AgentRunner

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
 *
 * A bare array, the same finding `annotations.ts` makes: the job page polls
 * this every 2 s while `running` (§4) and needs the whole tail each time, not
 * a page of it. `after` is the event id already shown, so a re-poll only
 * asks for what it does not have.
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
 *   body: CreateAgentJobInput
 *   -> Single<AgentJob>
 *
 * Creates `queued`. The mock has no runner to claim it (`EYVAR_MCP_SOURCE`'s
 * own mock path is `agent/`'s, not this one); the job simply waits, which is
 * an honest state to show, not a simulation of one.
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
 *
 * The analyst view's header line (§4): `Runner online · last seen 12:03` /
 * `Runner offline` / `At usage limit until 14:00`.
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
}
