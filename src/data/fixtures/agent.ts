/**
 * The analyst agent — jobs, their transcripts and one case study, `01-analyst-agent.md`.
 *
 * Only `USR-1` (Owner) and `USR-7` (Trust & Safety) hold `view_analytics` in
 * the seeded team, so every job's `requestedBy` is one of the two — the same
 * constraint a real deploy would have. `AGT-1`'s case study is requested by
 * `USR-7`, who holds `view_analytics` but not `view_finance`: its
 * `dataQuality.blockedSeries` names `revenue.total`, seeded rather than
 * invented, because the agent sees exactly what the asking operator sees
 * (§3.2). `AGT-1`'s finding cites `cancellationTrend` (`reports.ts`) and its
 * firing is `ALR-1`'s, so `Explain this firing` has a real destination.
 *
 * `AgentRunner` (WP-1.7 mints it in `types/agent.ts`) types
 * `agentRunnerStatusFixture` below, `GET /api/v1/agent/status`'s response.
 */

import { offsetFromNow } from '../mock/clock'
import { cancellationTrend } from './reports'
import type {
  AgentEvent,
  AgentJob,
  AgentRunner,
  AgentSchedule,
  CaseStudy,
} from '../types/agent'

/* ─────────────────────────── the one case study ─────────────────────────── */

/**
 * `AGT-1`'s output — a triage of `ALR-1`'s firing (`alerts.ts`). Every number
 * names the `runId` that produced it (§7's "no number without a run"); the
 * two alternatives are the ones the analyst tested and rejected, one of them
 * against `ANN-6`'s payment-gateway outage (`annotations.ts`).
 */
export const DONE_JOB_CASE_STUDY: CaseStudy = {
  title: 'Why did the cancellation rate cross 6% on 24 June?',
  language: 'en',
  question: 'Why did the cancellation rate cross 6% on 24 June?',
  decision: 'Hold driver incentives steady for three days and re-check the rate before adjusting anything.',
  headline: {
    text: 'The cancellation rate reached 7% on 24 June, up from a 5% baseline.',
    confidence: 'medium',
    confidenceReason: 'One bucket of data with a plausible cause; not yet a trend.',
  },
  baseline: {
    measureKey: 'trips.cancellationRate',
    window: { kind: 'preset', preset: 'last-30d' },
    grain: 'day',
    level: 5.4,
    previousPeriodDeltaPct: 12.3,
    trendSlopePerBucket: 0.02,
    runId: 'RUN-1',
  },
  findings: [
    {
      id: 'F1',
      text: 'The rate rose from 5% to 7% between 22 and 24 June, the day the alert fired.',
      values: [
        { runId: 'RUN-1', seriesId: 'trips.cancellationRate#_#current', bucket: '2026-06-24', value: 7, unit: 'percent', currency: null },
      ],
      evidence: ['RUN-1'],
      chart: cancellationTrend,
    },
    {
      id: 'F2',
      text: 'The increase concentrated in Al Malaz and Al Olaya pickups.',
      values: [
        { runId: 'RUN-2', seriesId: 'trips.completed#Al Malaz#current', bucket: '2026-06-24', value: 9, unit: 'count', currency: null },
      ],
      evidence: ['RUN-2'],
      chart: null,
    },
  ],
  contributors: [
    { dimension: 'trip.pickup', group: 'Al Malaz', deltaAbs: 4, shareOfChangePct: 42, runId: 'RUN-2' },
    { dimension: 'trip.pickup', group: 'Al Olaya', deltaAbs: 3, shareOfChangePct: 31, runId: 'RUN-2' },
  ],
  alternatives: [
    {
      hypothesis: 'A driver shortage caused riders to cancel while waiting.',
      tested: true,
      evidence: ['RUN-3'],
      verdict: 'not-supported',
      text: 'Active captain count on 24 June was flat against the week before.',
    },
    {
      hypothesis: 'Riders were still affected by the 10 June payment gateway outage.',
      tested: true,
      evidence: ['RUN-1'],
      verdict: 'not-supported',
      text: 'The outage cleared two weeks earlier; no gap is visible in the daily series since.',
    },
  ],
  dataQuality: {
    gaps: [],
    partialBucketsExcluded: true,
    /* USR-7 holds `view_analytics`, not `view_finance` — a real block for the
       operator who asked, not an invented one (§13.1). */
    blockedSeries: ['revenue.total#_#current'],
    truncated: false,
    coverageNote: 'Snapshots cover 27 May – 25 June; nothing outside that window was read.',
  },
  recommendations: [
    {
      text: 'Hold driver incentives steady for three days and re-check the rate before adjusting anything.',
      ownerRole: 'Dispatch lead',
      expectedEffect: { measureKey: 'trips.cancellationRate', direction: 'down', magnitude: null },
      verifyWith: { reportQuery: cancellationTrend, alertCondition: { kind: 'static', comparator: 'gt', threshold: 6 } },
      reviewBy: '2026-06-28',
    },
  ],
  followUps: ['Ask Marketing whether a competitor ran a promotion in Riyadh the week of 22 June.'],
}

/** The page `AGT-1` produced — `pages.ts` builds it with `caseStudyToBlocks(DONE_JOB_CASE_STUDY, DONE_JOB_ID)`. */
export const DONE_JOB_ID = 'AGT-1'
export const DONE_JOB_RESULT_PAGE_ID = 'PAGE-CS-1'

/* ─────────────────────────────── jobs ────────────────────────────────────── */

export const agentJobFixtures: AgentJob[] = [
  {
    id: DONE_JOB_ID,
    kind: 'triage-alert',
    question: DONE_JOB_CASE_STUDY.question,
    language: 'en',
    requestedBy: 'USR-7',
    state: 'done',
    failureReason: null,
    retryAt: null,
    contextObjects: [{ kind: 'firing', id: 'AFR-1' }],
    resultPageId: DONE_JOB_RESULT_PAGE_ID,
    startedAt: offsetFromNow({ hours: -2, minutes: -10 }),
    finishedAt: offsetFromNow({ hours: -1, minutes: -42 }),
    createdAt: offsetFromNow({ hours: -2, minutes: -12 }),
    updatedAt: offsetFromNow({ hours: -1, minutes: -42 }),
  },
  {
    id: 'AGT-2',
    kind: 'ask',
    /* Arabic — the operator asked in their own language (§4); the chrome
       around the job stays English, the question does not (AC-898's rule
       applied to agent content). */
    question: 'لماذا انخفض عدد الاشتراكات الجديدة هذا الأسبوع؟',
    language: 'ar',
    requestedBy: 'USR-1',
    state: 'running',
    failureReason: null,
    retryAt: null,
    contextObjects: [{ kind: 'report', id: 'RPT-13' }],
    resultPageId: null,
    startedAt: offsetFromNow({ minutes: -4 }),
    finishedAt: null,
    createdAt: offsetFromNow({ minutes: -5 }),
    updatedAt: offsetFromNow({ minutes: -1 }),
  },
  {
    id: 'AGT-3',
    kind: 'case-study',
    question: 'What is driving the rise in open support tickets this month?',
    language: 'en',
    requestedBy: 'USR-1',
    state: 'deferred',
    failureReason: null,
    /* Parsed from the CLI's limit message, or +60 min when it names none (§10). */
    retryAt: offsetFromNow({ minutes: 46 }),
    contextObjects: [{ kind: 'window', window: { kind: 'preset', preset: 'last-30d' } }],
    resultPageId: null,
    startedAt: offsetFromNow({ minutes: -20 }),
    finishedAt: null,
    createdAt: offsetFromNow({ minutes: -22 }),
    updatedAt: offsetFromNow({ minutes: -14 }),
  },
  {
    id: 'AGT-4',
    kind: 'ask',
    question: 'How many riders churned last quarter, and why?',
    language: 'en',
    requestedBy: 'USR-7',
    state: 'failed',
    failureReason: 'evidence',
    retryAt: null,
    contextObjects: [],
    resultPageId: null,
    startedAt: offsetFromNow({ days: -1, hours: -1 }),
    finishedAt: offsetFromNow({ days: -1, minutes: -40 }),
    createdAt: offsetFromNow({ days: -1, hours: -1, minutes: -2 }),
    updatedAt: offsetFromNow({ days: -1, minutes: -40 }),
  },
  {
    id: 'AGT-5',
    kind: 'case-study',
    question: 'Give a full breakdown of every district’s trip volume, fares and cancellations for the last year.',
    language: 'en',
    requestedBy: 'USR-1',
    /* §10 — 20 minutes wall clock, then `failed:timeout`; partial findings kept. */
    state: 'failed',
    failureReason: 'timeout',
    retryAt: null,
    contextObjects: [{ kind: 'window', window: { kind: 'preset', preset: 'last-365d' } }],
    resultPageId: null,
    startedAt: offsetFromNow({ days: -3, hours: -1 }),
    finishedAt: offsetFromNow({ days: -3, minutes: -40 }),
    createdAt: offsetFromNow({ days: -3, hours: -1, minutes: -1 }),
    updatedAt: offsetFromNow({ days: -3, minutes: -40 }),
  },
  {
    id: 'AGT-6',
    kind: 'build-page',
    question: 'Draft a page comparing quick rides and subscription trips.',
    language: 'en',
    requestedBy: 'USR-7',
    state: 'failed',
    failureReason: 'schema',
    retryAt: null,
    contextObjects: [{ kind: 'report', id: 'RPT-11' }],
    resultPageId: null,
    startedAt: offsetFromNow({ days: -2 }),
    finishedAt: offsetFromNow({ days: -2, minutes: -8 }),
    createdAt: offsetFromNow({ days: -2, minutes: -1 }),
    updatedAt: offsetFromNow({ days: -2, minutes: -8 }),
  },
  {
    /* Queued — not yet claimed by the runner. */
    id: 'AGT-7',
    kind: 'weekly-review',
    question: 'Weekly review of the growth board.',
    language: 'en',
    requestedBy: 'USR-1',
    state: 'queued',
    failureReason: null,
    retryAt: null,
    contextObjects: [{ kind: 'page', id: 'DSH-3' }],
    resultPageId: null,
    startedAt: null,
    finishedAt: null,
    createdAt: offsetFromNow({ minutes: -1 }),
    updatedAt: offsetFromNow({ minutes: -1 }),
  },
]

/* ─────────────────────────────── events ──────────────────────────────────── */

/** Keyed by `AgentJob.id`. The live timeline reads this while a job runs; a `done` job keeps it as history. */
export const agentEventFixtures: Record<string, AgentEvent[]> = {
  [DONE_JOB_ID]: [
    { kind: 'tool-call', id: 'EVT-1', jobId: DONE_JOB_ID, tool: 'catalogue_measures', summary: 'Looked up trips.cancellationRate', durationMs: 420, ts: offsetFromNow({ hours: -2, minutes: -9 }) },
    { kind: 'tool-call', id: 'EVT-2', jobId: DONE_JOB_ID, tool: 'run_report', summary: 'Ran the cancellation rate trend, 30 days', durationMs: 610, ts: offsetFromNow({ hours: -2, minutes: -7 }) },
    { kind: 'finding', id: 'EVT-3', jobId: DONE_JOB_ID, text: DONE_JOB_CASE_STUDY.findings[0]!.text, runIds: ['RUN-1'], ts: offsetFromNow({ hours: -2, minutes: -5 }) },
    { kind: 'tool-call', id: 'EVT-4', jobId: DONE_JOB_ID, tool: 'contribution', summary: 'Split the change by pickup district', durationMs: 730, ts: offsetFromNow({ hours: -2, minutes: -4 }) },
    { kind: 'finding', id: 'EVT-5', jobId: DONE_JOB_ID, text: DONE_JOB_CASE_STUDY.findings[1]!.text, runIds: ['RUN-2'], ts: offsetFromNow({ hours: -2, minutes: -2 }) },
    { kind: 'tool-call', id: 'EVT-6', jobId: DONE_JOB_ID, tool: 'run_report', summary: 'Checked active captain count for the same days', durationMs: 540, ts: offsetFromNow({ hours: -1, minutes: -55 }) },
    { kind: 'tool-call', id: 'EVT-7', jobId: DONE_JOB_ID, tool: 'annotations_list', summary: 'Read annotations across the window', durationMs: 210, ts: offsetFromNow({ hours: -1, minutes: -50 }) },
    { kind: 'tool-call', id: 'EVT-8', jobId: DONE_JOB_ID, tool: 'create_page_draft', summary: 'Wrote the case study as a draft page', durationMs: 380, ts: offsetFromNow({ hours: -1, minutes: -43 }) },
  ],
  'AGT-2': [
    { kind: 'tool-call', id: 'EVT-9', jobId: 'AGT-2', tool: 'catalogue_measures', summary: 'Looked up subscriptions.started', durationMs: 390, ts: offsetFromNow({ minutes: -4 }) },
    { kind: 'tool-call', id: 'EVT-10', jobId: 'AGT-2', tool: 'run_report', summary: 'Ran new subscriptions, this week vs launch week', durationMs: 580, ts: offsetFromNow({ minutes: -3 }) },
    { kind: 'tool-call', id: 'EVT-11', jobId: 'AGT-2', tool: 'describe_series', summary: 'Reading the trend and change points', durationMs: 0, ts: offsetFromNow({ minutes: -1 }) },
  ],
  'AGT-3': [
    { kind: 'tool-call', id: 'EVT-12', jobId: 'AGT-3', tool: 'catalogue_measures', summary: 'Looked up support ticket measures', durationMs: 400, ts: offsetFromNow({ minutes: -20 }) },
    { kind: 'tool-call', id: 'EVT-13', jobId: 'AGT-3', tool: 'run_report', summary: 'Ran open tickets by category, 30 days', durationMs: 560, ts: offsetFromNow({ minutes: -18 }) },
  ],
  'AGT-4': [
    { kind: 'tool-call', id: 'EVT-14', jobId: 'AGT-4', tool: 'run_report', summary: 'Ran rider churn, last quarter', durationMs: 610, ts: offsetFromNow({ days: -1, hours: -1 }) },
    {
      /* The finding that failed validation: its `runIds` names a run this
         job's own tool log never produced, which is exactly the "no number
         without a run" check `agent/runner/validate.ts` enforces (§7). */
      kind: 'finding',
      id: 'EVT-15',
      jobId: 'AGT-4',
      text: 'Churn was concentrated among riders on the Gold plan.',
      runIds: ['RUN-99'],
      ts: offsetFromNow({ days: -1, minutes: -45 }),
    },
  ],
}

/* ─────────────────────────── scheduled reviews ───────────────────────────── */

export const agentScheduleFixtures: AgentSchedule[] = [
  {
    id: 'AGS-1',
    kind: 'weekly-review',
    reportIds: ['RPT-1', 'RPT-2', 'RPT-4'],
    pageId: 'DSH-1',
    cron: '0 6 * * 1',
    ownerId: 'USR-1',
    enabled: true,
    createdAt: offsetFromNow({ days: -30 }),
    updatedAt: offsetFromNow({ days: -30 }),
  },
]

/* ─────────────────────────── runner status ───────────────────────────────── */

/** `GET /api/v1/agent/status`, the online case. Online, because `AGT-2` is mid-run. */
export const agentRunnerStatusFixture: AgentRunner = {
  online: true,
  lastHeartbeatAt: offsetFromNow({ seconds: -12 }),
  limitedUntil: null,
  queueDepth: 1,
}

/** The offline case — `01-analyst-agent.md` §4's `Runner offline`, reachable via `agent.ts`'s `useOfflineRunner()`. */
export const agentRunnerOfflineFixture: AgentRunner = {
  online: false,
  /* Stale enough to be past the backend's 90 s heartbeat window. */
  lastHeartbeatAt: offsetFromNow({ minutes: -12 }),
  limitedUntil: null,
  queueDepth: 1,
}
