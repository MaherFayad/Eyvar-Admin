/**
 * `alert_rules` row <-> the wire `AlertRule` (`src/data/types/alert.ts`) —
 * shared by `handlers/alerts.ts` (CRUD) and `evaluateDue.ts` (the cron), so
 * the two never reconstruct the shape differently. `condition_json` is
 * always populated by every writer here, so `alertCondition(rule)` on the
 * client always reads through `condition`, never falls back to the v1
 * `comparator`/`threshold` pair — those two ride along only so the field is
 * never `undefined` on the wire.
 */
import type {
  AlertCadence,
  AlertChannel,
  AlertCondition,
  AlertRule,
  AlertSeverity,
  AlertState,
} from '@/data/types/alert'
import type { MeasureGrain } from '@/data/types/measure'
import type { CurrencyCode } from '@/data/types/common'
import type { MetricUnit } from '@/data/types/metrics'
import type { Database } from './db'

export interface AlertRuleRow {
  id: string
  name: string
  report_id: string
  series_id: string
  condition_json: unknown
  comparator: string
  threshold: string | number
  threshold_unit: string
  threshold_currency: string | null
  evaluation_grain: string
  cadence: string | null
  min_rearm_minutes: number | null
  consecutive_failures_before_error: number
  channels_json: unknown
  recipient_ids_json: unknown
  severity: string
  labels_json: unknown
  enabled: boolean
  muted_until: string | null
  state: string
  state_reason_key: string | null
  owner_id: string
  last_evaluated_at: string | null
  last_fired_at: string | null
  last_value: string | number | null
  last_band_json: unknown
  last_bucket_start: string | null
  failure_count: number
  last_ack_at: string | null
  last_ack_by: string | null
  created_at: string
  updated_at: string
  updated_by: string
}

function parseJsonColumn<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return JSON.parse(value) as T
  return value as T
}

/** The measure a rule's series belongs to — `resolveReport.ts`'s own id format, `${measureKey}#${groupValue ?? '_'}#current${idSuffix}`. */
export function measureKeyOfSeriesId(seriesId: string): string {
  return seriesId.split('#')[0] ?? seriesId
}

/** `toWireAlertRule`'s row → `AlertRule`. Numbers come back as `string` from some drivers under JSONB/NUMERIC, so every numeric column is coerced explicitly. */
export function toWireAlertRule(row: AlertRuleRow): AlertRule {
  const condition = parseJsonColumn<AlertCondition>(row.condition_json, { kind: 'static', comparator: 'gt', threshold: 0 })
  const band = parseJsonColumn<{ low: number; high: number } | null>(row.last_band_json, null)
  return {
    id: row.id,
    name: row.name,
    reportId: row.report_id,
    seriesId: row.series_id,
    comparator: row.comparator as AlertRule['comparator'],
    threshold: Number(row.threshold),
    thresholdUnit: row.threshold_unit as MetricUnit,
    thresholdCurrency: row.threshold_currency as CurrencyCode | null,
    condition,
    evaluationGrain: row.evaluation_grain as MeasureGrain,
    cadence: row.cadence as AlertCadence | null,
    minReArmMinutes: row.min_rearm_minutes,
    consecutiveFailuresBeforeError: row.consecutive_failures_before_error,
    state: row.state as AlertState,
    enabled: row.enabled,
    mutedUntil: row.muted_until,
    recipientIds: parseJsonColumn<string[]>(row.recipient_ids_json, []),
    ownerId: row.owner_id,
    notificationPriority: row.severity as AlertSeverity,
    severity: row.severity as AlertSeverity,
    channels: parseJsonColumn<AlertChannel[]>(row.channels_json, [{ type: 'in-app' }]),
    labels: parseJsonColumn<string[]>(row.labels_json, []),
    lastEvaluatedAt: row.last_evaluated_at,
    lastFiredAt: row.last_fired_at,
    lastValue: row.last_value === null ? null : Number(row.last_value),
    lastBand: band,
    acknowledgedAt: row.last_ack_at,
    acknowledgedBy: row.last_ack_by,
    stateReasonKey: row.state_reason_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** A v1-shaped `{comparator, threshold}` pair to keep on the row beside `condition_json` — see this file's header. `relative`'s `amount` and `static`'s `threshold` are the only kinds with a meaningful number; the rest get `0`. */
export function legacyFieldsOf(condition: AlertCondition): { comparator: AlertRule['comparator']; threshold: number } {
  if (condition.kind === 'static') return { comparator: condition.comparator, threshold: condition.threshold }
  if (condition.kind === 'relative') return { comparator: 'gt', threshold: condition.amount }
  return { comparator: 'gt', threshold: 0 }
}

export async function fetchAlertRuleRow(db: Database, id: string): Promise<AlertRuleRow | null> {
  const rows = await db.sql<AlertRuleRow>`SELECT * FROM alert_rules WHERE id = ${id}`
  return rows[0] ?? null
}
