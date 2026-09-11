/**
 * Alert rules — moved out of `report.ts` (D42, `04-alerting-v2.md` §2), which
 * re-exports these for one phase. v2 adds `AlertCondition` beside the v1
 * `comparator`/`threshold` pair rather than replacing it, so a v1 rule stays a
 * valid v2 rule. Read via `alertCondition()`, not `rule.condition` directly.
 */

import type { CurrencyCode, IsoDateTime } from './common'
import type { MeasureGrain } from './measure'
import type { MetricUnit } from './metrics'

/** Four values, deliberately the same names `FilterOperator` already uses (§12.2 of the v1 spec). */
export type AlertComparator = 'gt' | 'gte' | 'lt' | 'lte'

/** How often the server looks. `null` on a rule the business has not specified a cadence for — it does not evaluate. */
export type AlertCadence = 'hourly' | 'daily'

/** §12.4's state machine. Server state. */
export type AlertState = 'armed' | 'firing' | 'cooling' | 'suspended' | 'error'

/* ─────────────────────────── v2 condition ───────────────────────────────── */

/**
 * The v2 condition union (`04-alerting-v2.md` §2). `static` is the v1 shape,
 * unchanged, given a `kind` tag so it fits the union.
 */
export type AlertCondition =
  | { kind: 'static'; comparator: AlertComparator; threshold: number }
  | {
      kind: 'relative'
      direction: 'up' | 'down' | 'either'
      measure: 'delta' | 'percent'
      amount: number
      against: 'previous-bucket' | 'same-bucket-previous-week' | 'previous-period'
    }
  | { kind: 'anomaly'; direction: 'above' | 'below' | 'either'; confidence: 95 | 99; lookback: number | null }
  /** Fires when the last `bucketsMissing` complete buckets are `null`. */
  | { kind: 'missing'; bucketsMissing: number }

export type AlertSeverity = 'high' | 'critical'

/**
 * `in-app` is always present and cannot be removed — the notification centre
 * is the record. `email` targets team users, never a free address. `slack`
 * references a webhook stored server-side, never a URL typed into the rule.
 */
export type AlertChannel =
  | { type: 'in-app' }
  | { type: 'email'; userIds: string[] }
  | { type: 'slack'; webhookId: string }

export interface AlertRule {
  id: string
  name: string
  /** An alert targets a **saved** report — a stable identity, a name, and somewhere to send the operator. */
  reportId: string
  /** One `ReportSeries.id` of that report. */
  seriesId: string

  /* ── v1 condition, unchanged. Read through `alertCondition()` once `condition` exists too. ── */
  comparator: AlertComparator
  /** The series' own wire unit — money is integer halalas. */
  threshold: number
  /** **Derived** from the series' measure. An operator never picks a unit. */
  thresholdUnit: MetricUnit
  thresholdCurrency: CurrencyCode | null

  /** v2's condition. **Absent means the v1 static shape** — read via `alertCondition(rule)`. */
  condition?: AlertCondition

  /** Which bucket's value is tested. */
  evaluationGrain: MeasureGrain

  /** Unset on a rule with no specified cadence — it does not evaluate. */
  cadence: AlertCadence | null

  /** §12.4's backstop for a value that oscillates across the line. `null` is hysteresis alone. */
  minReArmMinutes: number | null

  /** How many consecutive `reports.run` failures move the rule to `error`. */
  consecutiveFailuresBeforeError: number

  state: AlertState
  enabled: boolean
  /** A deadline, not a duration. Silences notifications without stopping evaluation. */
  mutedUntil: IsoDateTime | null

  /** `TeamUser.id`s. A recipient who cannot see the measure is not a legal recipient. */
  recipientIds: string[]
  /** Evaluation authority: the rule is evaluated as its owner, never on wider rights. */
  ownerId: string

  /**
   * The priority the emitted `Notification` carries. **Renamed `severity` in
   * v2** (still `'high'` by default); this field is kept so a v1 caller keeps
   * compiling — read a rule's priority through `alertSeverity(rule)`.
   */
  notificationPriority: AlertSeverity
  /** v2's name for `notificationPriority`. **Absent means `notificationPriority`** — read via `alertSeverity(rule)`. */
  severity?: AlertSeverity

  /** v2. **Absent means `[{ type: 'in-app' }]`** — read via `alertChannels(rule)`. */
  channels?: AlertChannel[]
  /** v2. Free-text tags on the rule list. **Absent means `[]`**. */
  labels?: string[]

  lastEvaluatedAt: IsoDateTime | null
  lastFiredAt: IsoDateTime | null
  lastValue: number | null
  /** v2 — the anomaly band the last evaluation computed, so history and the chart can draw it. */
  lastBand?: { low: number; high: number } | null
  /** v2 — per-firing acknowledgement, mirrored on the rule for the list. `null` until acknowledged. */
  acknowledgedAt?: IsoDateTime | null
  acknowledgedBy?: string | null

  /** Why the rule is `suspended` or in `error`, as a key. `null` in every other state. */
  stateReasonKey: string | null

  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

/** The **one** reader of `rule.condition`. See `AlertRule.condition`. */
export function alertCondition(rule: Pick<AlertRule, 'comparator' | 'threshold' | 'condition'>): AlertCondition {
  return rule.condition ?? { kind: 'static', comparator: rule.comparator, threshold: rule.threshold }
}

/** The **one** reader of `rule.severity`. See `AlertRule.severity`. */
export function alertSeverity(rule: Pick<AlertRule, 'notificationPriority' | 'severity'>): AlertSeverity {
  return rule.severity ?? rule.notificationPriority
}

/** The **one** reader of `rule.channels`. See `AlertRule.channels`. */
export function alertChannels(rule: Pick<AlertRule, 'channels'>): AlertChannel[] {
  return rule.channels ?? [{ type: 'in-app' }]
}

/** The rule with every v2 default made explicit, mirroring `normaliseReportQuery`. */
export function normaliseAlertRule(
  rule: AlertRule,
): AlertRule & { condition: AlertCondition; severity: AlertSeverity; channels: AlertChannel[]; labels: string[] } {
  return {
    ...rule,
    condition: alertCondition(rule),
    severity: alertSeverity(rule),
    channels: alertChannels(rule),
    labels: rule.labels ?? [],
  }
}

/** One attempt to deliver a firing down one channel — `04-alerting-v2.md` §5, `alert_deliveries`. */
export interface AlertDelivery {
  channelType: AlertChannel['type']
  /** The recipient the channel resolved to (a user id, a webhook id). `null` for `in-app`, which has none. */
  target: string | null
  status: 'sent' | 'failed'
  /** Present only when `status` is `'failed'` — state 24, the delivery itself unaffected. */
  error: string | null
  at: IsoDateTime
}

/** One past crossing. `alerts.history`. */
export interface AlertFiring {
  id: string
  ruleId: string
  firedAt: IsoDateTime
  /** The complete bucket that tripped it. */
  bucketStart: string
  value: number
  threshold: number
  /** The `Notification.id` this firing produced, so the two can be reconciled. */
  notificationId: string | null
  /** v2, `04-alerting-v2.md` §5. **Absent means `[]`** — a firing seeded before delivery tracking existed. */
  deliveries?: AlertDelivery[]
  /** v2 — the anomaly band this firing evaluated against, mirroring `AlertRule.lastBand`. `undefined` for a non-anomaly condition. */
  band?: { low: number; high: number } | null
}

/** The **one** reader of `firing.deliveries`. See `AlertFiring.deliveries`. */
export function alertDeliveries(firing: Pick<AlertFiring, 'deliveries'>): AlertDelivery[] {
  return firing.deliveries ?? []
}

/**
 * `Test this rule` — says *would have fired*, never *fired*. `stateChanged` is
 * the literal `false` so no caller can read it as anything else, and no
 * notification is emitted.
 */
export interface AlertEvaluation {
  ruleId: string
  evaluatedAt: IsoDateTime
  /** The most recent **complete** bucket. `null` when the window holds none. */
  bucketStart: string | null
  value: number | null
  unit: MetricUnit
  currency: CurrencyCode | null
  wouldFire: boolean
  outcome:
    | 'would-fire'
    | 'would-not-fire'
    | 'no-complete-bucket'
    /* An anomaly rule with too little history to form a band, and a condition the
       catalogue cannot support (AC-1230, AC-1222). Both are refusals the composer
       shows in place, not failures. */
    | 'no-baseline'
    | 'invalid-condition'
    | 'series-missing'
    | 'series-blocked'
    | 'report-missing'
  stateChanged: false
}
