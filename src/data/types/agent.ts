/**
 * The analyst agent (D38, `01-analyst-agent.md` §3–§8): a job, its transcript,
 * and the `CaseStudy` output schema a validated run must satisfy before the
 * backend renders it as a page (§7, `caseStudyToBlocks()`).
 */

import type { CurrencyCode, IsoDate, IsoDateTime } from './common'
import type { AlertCondition } from './alert'
import type { DimensionKey, MeasureKey } from './measure'
import type { MetricUnit } from './metrics'
import type { ReportGrain, ReportQuery, ReportWindow } from './report'

export type AgentJobKind = 'ask' | 'case-study' | 'build-page' | 'triage-alert' | 'weekly-review'

/** §10's table. `deferred` is a rate limit; `failed` carries `failureReason`. */
export type AgentJobState = 'queued' | 'running' | 'deferred' | 'done' | 'failed'

export type AgentJobFailureReason = 'timeout' | 'evidence' | 'schema'

/** What the operator attached when asking — already-fetched by the backend before the runner sees it. */
export type AgentJobContext =
  | { kind: 'report'; id: string }
  | { kind: 'page'; id: string }
  | { kind: 'firing'; id: string }
  | { kind: 'window'; window: ReportWindow }

export interface AgentJob {
  id: string
  kind: AgentJobKind
  /** The operator's text, verbatim, in the operator's language. */
  question: string
  language: 'ar' | 'en'
  /** A `TeamUser.id` — every tool call runs as this operator (§3.2). */
  requestedBy: string
  state: AgentJobState
  /** `null` unless `state === 'failed'`. */
  failureReason: AgentJobFailureReason | null
  /** Parsed from the CLI limit message, or +60 min. `null` unless `state === 'deferred'`. */
  retryAt: IsoDateTime | null
  contextObjects: AgentJobContext[]
  /** The published-or-draft page the job produced. `null` until `done`. */
  resultPageId: string | null
  startedAt: IsoDateTime | null
  finishedAt: IsoDateTime | null
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

/** The live timeline: one row per tool call, polled every 2 s while `running` (§4). */
export interface AgentToolCallEvent {
  kind: 'tool-call'
  id: string
  jobId: string
  tool: string
  /** One-line summary for the timeline, never the raw tool input. */
  summary: string
  durationMs: number
  ts: IsoDateTime
}

/** Emitted by the `note_finding` tool (T19); shown live before the job finishes. */
export interface AgentFindingEvent {
  kind: 'finding'
  id: string
  jobId: string
  text: string
  /** `run_report` ids this finding is evidenced by. */
  runIds: string[]
  ts: IsoDateTime
}

export type AgentEvent = AgentToolCallEvent | AgentFindingEvent

/* ─────────────────────── the case-study output (§7) ─────────────────────── */

export type AgentConfidence = 'high' | 'medium' | 'low'

export interface CaseStudyBaseline {
  measureKey: MeasureKey
  window: ReportWindow
  grain: ReportGrain
  level: number
  previousPeriodDeltaPct: number | null
  trendSlopePerBucket: number | null
  runId: string
}

export interface CaseStudyFindingValue {
  runId: string
  seriesId: string
  bucket: IsoDate | 'total'
  value: number
  unit: MetricUnit
  currency: CurrencyCode | null
}

export interface CaseStudyFinding {
  id: string
  text: string
  values: CaseStudyFindingValue[]
  /** Every entry names a `runId` that exists in this job's tool log — enforced by the runner. */
  evidence: string[]
  chart: ReportQuery | null
}

export interface CaseStudyContributor {
  dimension: DimensionKey
  group: string
  deltaAbs: number
  shareOfChangePct: number
  runId: string
}

export type AlternativeVerdict = 'supported' | 'not-supported' | 'inconclusive'

/** At least one alternative must name a data explanation (§7 method step 6). */
export interface CaseStudyAlternative {
  hypothesis: string
  tested: true
  evidence: string[]
  verdict: AlternativeVerdict
  text: string
}

export interface CaseStudyDataQuality {
  gaps: string[]
  partialBucketsExcluded: true
  blockedSeries: string[]
  truncated: boolean
  coverageNote: string
}

export interface CaseStudyRecommendation {
  text: string
  ownerRole: string
  expectedEffect: { measureKey: MeasureKey; direction: 'up' | 'down'; magnitude: number | null }
  verifyWith: { reportQuery: ReportQuery | null; alertCondition: AlertCondition | null }
  reviewBy: IsoDate
}

/**
 * The runner's `--json-schema` output, re-validated by `agent/runner/validate.ts`
 * before the backend converts it to `Block[]`. A case study with fewer than two
 * `alternatives` or without `dataQuality` fails schema validation.
 */
export interface CaseStudy {
  title: string
  language: 'ar' | 'en'
  question: string
  decision: string
  headline: { text: string; confidence: AgentConfidence; confidenceReason: string }
  baseline: CaseStudyBaseline
  findings: CaseStudyFinding[]
  contributors: CaseStudyContributor[]
  alternatives: CaseStudyAlternative[]
  dataQuality: CaseStudyDataQuality
  recommendations: CaseStudyRecommendation[]
  followUps: string[]
}

/* ─────────────────────────── the runner (§4, §5) ─────────────────────────── */

/**
 * `GET /api/v1/agent/status` — the runner's own state, read by the analyst
 * view's header line (`01-analyst-agent.md` §4: `Runner online` / `Runner
 * offline` / `At usage limit`). WP-1.8 found this had no type, only an
 * object shaped like one.
 */
export interface AgentRunner {
  online: boolean
  /** `null` before the runner has ever heartbeat. The backend marks it offline after 90 s without one. */
  lastHeartbeatAt: IsoDateTime | null
  /** A deadline, not a duration — mirrors `AlertRule.mutedUntil`. `null` when not rate-limited. */
  limitedUntil: IsoDateTime | null
  /** Jobs queued and not yet claimed. */
  queueDepth: number
}

/* ─────────────────────── scheduled reviews (§8) ──────────────────────────── */

/** A `weekly-review` schedule row (`agent_schedules`). Cron is restricted to weekly/daily. */
export interface AgentSchedule {
  id: string
  kind: 'weekly-review'
  /** Saved report ids, or a page id, the template studies. */
  reportIds: string[]
  pageId: string | null
  cron: string
  ownerId: string
  enabled: boolean
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}
