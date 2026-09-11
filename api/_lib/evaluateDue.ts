/**
 * `api/cron/alerts-hourly.ts` and `alerts-daily.ts` share this
 * (05-backend.md §8): select rules due for the given cadence, run each one's
 * report as its owner, `evaluate()` and `machine.nextAlertState()` — the
 * **imported** definitions (`src/data/reporting/alerts/`), never
 * reimplemented — persist the transition, and on a firing deliver through
 * `alertDelivery.ts`.
 *
 * A partial bucket is never evaluated because `evaluate()` enforces it on
 * the `ResolvedSeries` built straight from `reports.run`'s own
 * `partialBucketIndexes` — this file picks no bucket itself, only passes the
 * report's own marking through. AC-1221/AC-1286: `isNewBucket` gates a
 * weekly-or-coarser rule's `conditionMet` to `null` on a cadence tick that
 * lands on the same complete bucket as last time, so a weekly rule on the
 * daily cadence can fire at most once per new bucket.
 */
import { evaluate, isNewBucket, type ResolvedSeries } from '@/data/reporting/alerts/evaluate'
import { nextAlertState, type AlertMachineInput, type AlertTransition } from '@/data/reporting/alerts/machine'
import { reportQueryPath } from '@/data/reporting/serialise'
import { localDayOf } from '@/data/reporting/buckets'
import type { AlertCadence, AlertRule } from '@/data/types/alert'
import type { IsoDate, IsoDateTime } from '@/data/types/common'
import type { ReportQuery, ReportResult } from '@/data/types/report'
import { loadCatalogue } from './compile'
import { createRunReportHandler } from './handlers/reportsRun'
import { deliverFiring, type SlackAdapter } from './alertDelivery'
import type { EmailAdapter } from './email'
import type { SecretsAdapter } from './secrets'
import { holdsPermission, loadOperatorPermissions } from './permissions'
import { measureKeyOfSeriesId, toWireAlertRule, type AlertRuleRow } from './alertRuleRow'
import type { Database } from './db'
import type { RequestContext } from './auth'
import type { RouteHandler } from './router'

export interface EvaluateDueDeps {
  db: Database
  cadence: AlertCadence
  email: EmailAdapter
  slack: SlackAdapter
  secrets: SecretsAdapter
  /** Injectable for a frozen-clock test. Defaults to the real clock. */
  now?: () => IsoDateTime
  today?: () => IsoDate
  /** §8 step 4: "stop at 250 s elapsed". Injectable so a test does not wait 250 s. */
  limitMs?: number
  batchSize?: number
}

export interface EvaluateDueSummary {
  processed: number
  fired: number
  suspended: number
  errored: number
  /** §8 step 4: the next invocation resumes from the oldest `last_evaluated_at`, which the `ORDER BY` already guarantees — this just says whether the batch was cut short. */
  stoppedEarly: boolean
}

const DEFAULT_BATCH_SIZE = 200
const DEFAULT_LIMIT_MS = 250_000

async function notifyOwnerOfStateChange(db: Database, rule: AlertRule, transition: AlertTransition, now: IsoDateTime): Promise<void> {
  const title = transition.to === 'suspended' ? 'An alert rule was suspended' : 'An alert rule needs attention'
  const body =
    transition.to === 'suspended'
      ? `"${rule.name}" was suspended: the permission its measure needs is no longer held.`
      : `"${rule.name}" failed to evaluate ${rule.consecutiveFailuresBeforeError} times in a row and moved to the error state.`
  await db.sql`
    INSERT INTO notifications (user_id, type, priority, title, body, created_at, route, entity_id, entity_type)
    VALUES (${rule.ownerId}, 'warning', 'high', ${title}, ${body}, ${now}, NULL, ${rule.id}, 'alert_rule')
  `
}

interface PersistTransitionOptions {
  db: Database
  row: AlertRuleRow
  rule: AlertRule
  now: IsoDateTime
  input: AlertMachineInput
  summary: EvaluateDueSummary
  /** Only set on a real evaluation (not a permission/run failure) — carries the tested value forward. */
  evaluated?: { value: number | null; band: { low: number; high: number } | null; bucketStart: string | null }
  failureCount?: number
}

async function persistTransition(opts: PersistTransitionOptions): Promise<AlertTransition> {
  const { db, row, rule, now, input, summary, evaluated, failureCount } = opts
  const transition = nextAlertState(rule.state, input)
  const enteredCooling = transition.from !== 'cooling' && transition.to === 'cooling'
  const lastFiredAt = enteredCooling ? now : row.last_fired_at

  await db.sql`
    UPDATE alert_rules SET
      state = ${transition.to},
      state_reason_key = ${transition.reasonKey},
      last_evaluated_at = ${now},
      last_fired_at = ${lastFiredAt},
      last_value = ${evaluated ? evaluated.value : row.last_value},
      last_band_json = ${evaluated ? (evaluated.band ? JSON.stringify(evaluated.band) : null) : row.last_band_json},
      last_bucket_start = ${evaluated ? (evaluated.bucketStart ?? row.last_bucket_start) : row.last_bucket_start},
      failure_count = ${failureCount ?? 0}
    WHERE id = ${row.id}
  `

  if (transition.notifyOwner) await notifyOwnerOfStateChange(db, rule, transition, now)
  if (transition.to === 'suspended') summary.suspended += 1
  if (transition.to === 'error') summary.errored += 1
  return transition
}

interface EvaluateOneRuleOptions {
  db: Database
  row: AlertRuleRow
  email: EmailAdapter
  slack: SlackAdapter
  secrets: SecretsAdapter
  now: IsoDateTime
  runReportHandler: RouteHandler<RequestContext>
  catalogue: Awaited<ReturnType<typeof loadCatalogue>>
  summary: EvaluateDueSummary
}

/** A run that could not be tested at all: a missing saved report, `reports.run` throwing, or the rule's own series absent from the result. All three feed `runFailed: true` — five in a row moves the rule to `error` (§12.4), one owner notification. */
async function applyRunFailure(db: Database, row: AlertRuleRow, rule: AlertRule, now: IsoDateTime, summary: EvaluateDueSummary): Promise<void> {
  const failureCount = row.failure_count + 1
  await persistTransition({
    db,
    row,
    rule,
    now,
    summary,
    failureCount,
    input: {
      now,
      conditionMet: null,
      coolingSince: row.last_fired_at,
      minReArmMinutes: rule.minReArmMinutes,
      runFailed: true,
      consecutiveFailures: failureCount,
      consecutiveFailuresBeforeError: rule.consecutiveFailuresBeforeError,
      ownerHasPermission: true,
    },
  })
}

async function evaluateOneRule(opts: EvaluateOneRuleOptions): Promise<void> {
  const { db, row, email, slack, secrets, now, runReportHandler, catalogue, summary } = opts
  const rule = toWireAlertRule(row)
  const measureKey = measureKeyOfSeriesId(rule.seriesId)
  const measure = catalogue.measures.find((m) => m.key === measureKey) ?? null
  const measurePermissionKey = measure?.permission?.key ?? null

  const ownerPerms = await loadOperatorPermissions(db, rule.ownerId)
  const ownerHasPermission = holdsPermission(ownerPerms, measurePermissionKey)

  if (!ownerHasPermission || !ownerPerms) {
    await persistTransition({
      db,
      row,
      rule,
      now,
      summary,
      input: {
        now,
        conditionMet: null,
        coolingSince: row.last_fired_at,
        minReArmMinutes: rule.minReArmMinutes,
        runFailed: false,
        consecutiveFailures: 0,
        consecutiveFailuresBeforeError: rule.consecutiveFailuresBeforeError,
        ownerHasPermission: false,
      },
    })
    return
  }

  const reportRows = await db.sql<{ query_json: unknown }>`SELECT query_json FROM saved_reports WHERE id = ${rule.reportId}`
  const raw = reportRows[0]?.query_json
  if (raw === undefined) {
    await applyRunFailure(db, row, rule, now, summary)
    return
  }
  const query = (typeof raw === 'string' ? JSON.parse(raw) : raw) as ReportQuery

  let result: ReportResult
  try {
    const req = new Request('http://internal/api/v1/reports/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(query),
    })
    const ctx: RequestContext & { params: Record<string, string> } = {
      operator: { userId: rule.ownerId, role: ownerPerms.roleId, permissions: ownerPerms.permissions, sessionId: 'cron' },
      requestId: 'cron',
      params: {},
    }
    const res = await runReportHandler(req, ctx)
    if (!res.ok) throw new Error(`reports.run responded ${res.status}`)
    result = (await res.json()) as ReportResult
  } catch {
    await applyRunFailure(db, row, rule, now, summary)
    return
  }

  const target = result.series.find((s) => s.id === rule.seriesId) ?? null
  if (!target) {
    await applyRunFailure(db, row, rule, now, summary)
    return
  }
  if (target.blocked !== null) {
    await persistTransition({
      db,
      row,
      rule,
      now,
      summary,
      input: {
        now,
        conditionMet: null,
        coolingSince: row.last_fired_at,
        minReArmMinutes: rule.minReArmMinutes,
        runFailed: false,
        consecutiveFailures: 0,
        consecutiveFailuresBeforeError: rule.consecutiveFailuresBeforeError,
        ownerHasPermission: false,
      },
    })
    return
  }

  // Matched by measure + group, not by string-editing the id — the same rule
  // `handlers/alerts.ts`'s foreground `Test now` and the mock's
  // `evaluateAlertRule` use, so all three agree on which series is "this
  // one's comparison" regardless of id formatting.
  const comparison = result.series.find((s) => s.role === 'comparison' && s.measureKey === target.measureKey && s.groupValue === target.groupValue) ?? null

  const resolvedSeries: ResolvedSeries = {
    buckets: result.buckets,
    points: target.points,
    partialBucketIndexes: target.partialBucketIndexes,
    previousPeriodPoints: comparison ? comparison.points : null,
  }

  const evaluation = evaluate(rule, resolvedSeries, now)
  const newBucket = isNewBucket(evaluation.bucketStart, row.last_bucket_start)
  let conditionMet: boolean | null = null
  if (evaluation.outcome === 'would-fire') conditionMet = true
  else if (evaluation.outcome === 'would-not-fire') conditionMet = false
  // AC-1221/AC-1286: an unchanged bucket is "nothing new happened", not the condition holding again.
  if (conditionMet !== null && !newBucket) conditionMet = null

  const transition = await persistTransition({
    db,
    row,
    rule,
    now,
    summary,
    evaluated: { value: evaluation.value, band: evaluation.band, bucketStart: evaluation.bucketStart },
    input: {
      now,
      conditionMet,
      coolingSince: row.last_fired_at,
      minReArmMinutes: rule.minReArmMinutes,
      runFailed: false,
      consecutiveFailures: 0,
      consecutiveFailuresBeforeError: rule.consecutiveFailuresBeforeError,
      ownerHasPermission: true,
    },
  })

  if (!transition.fired) return
  summary.fired += 1

  const conditionEvidence = evaluation.band ? { band: evaluation.band } : { threshold: evaluation.threshold }
  const firingRows = await db.sql<{ id: string }>`
    INSERT INTO alert_firings (rule_id, fired_at, bucket_start, value, threshold_or_band_json, severity)
    VALUES (${row.id}, ${now}, ${evaluation.bucketStart}, ${evaluation.value}, ${JSON.stringify(conditionEvidence)}, ${rule.severity ?? 'high'})
    RETURNING id
  `
  const firingId = firingRows[0]!.id
  const muted = rule.mutedUntil !== null && Date.parse(rule.mutedUntil) > Date.parse(now)

  await deliverFiring({
    db,
    email,
    slack,
    secrets,
    rule: {
      id: rule.id,
      name: rule.name,
      ownerId: rule.ownerId,
      recipientIds: rule.recipientIds,
      channels: rule.channels ?? [{ type: 'in-app' }],
      severity: rule.severity ?? 'high',
    },
    firingId,
    muted,
    now,
    measurePermissionKey,
    route: reportQueryPath(query),
  })
}

/** §8: `WHERE enabled AND cadence = $1 AND state <> 'suspended' ORDER BY last_evaluated_at NULLS FIRST LIMIT 200`, stopping at the time budget and letting the next invocation resume from the oldest `last_evaluated_at` naturally. */
export async function evaluateDueRules(deps: EvaluateDueDeps): Promise<EvaluateDueSummary> {
  const { db, cadence, email, slack, secrets } = deps
  const now = deps.now ?? (() => new Date().toISOString())
  const today = deps.today ?? (() => localDayOf(now()))
  const batchSize = deps.batchSize ?? DEFAULT_BATCH_SIZE
  const limitMs = deps.limitMs ?? DEFAULT_LIMIT_MS
  const startedAt = Date.now()

  const rows = await db.sql<AlertRuleRow>`
    SELECT * FROM alert_rules
    WHERE enabled = true AND cadence = ${cadence} AND state <> 'suspended'
    ORDER BY last_evaluated_at ASC NULLS FIRST
    LIMIT ${batchSize}
  `

  const summary: EvaluateDueSummary = { processed: 0, fired: 0, suspended: 0, errored: 0, stoppedEarly: false }
  const runReportHandler = createRunReportHandler(db, { today, now })
  const catalogue = await loadCatalogue(db)

  for (const row of rows) {
    if (Date.now() - startedAt >= limitMs) {
      summary.stoppedEarly = true
      break
    }
    await evaluateOneRule({ db, row, email, slack, secrets, now: now(), runReportHandler, catalogue, summary })
    summary.processed += 1
  }

  return summary
}
