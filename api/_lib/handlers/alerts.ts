/**
 * `alerts.*`: CRUD, `Test now`, `mute`, `acknowledge`, firings feed and
 * history — mirrors `src/data/clients/alerts.ts`'s mock branch field for
 * field. `Test now` runs `evaluate()` as the requesting operator's own
 * permissions, a foreground preview; the scheduled run (`evaluateDue.ts`) acts as the owner. */
import { evaluate, type ResolvedSeries } from '@/data/reporting/alerts/evaluate'
import { REPORT_NAME_MAX, type SaveInvalidReason } from '@/data/types/report'
import type { AlertCondition, AlertEvaluation, AlertRule } from '@/data/types/alert'
import type { PermissionKey } from '@/data/types/navigation'
import type { IsoDate } from '@/data/types/common'
import type { ReportQuery, ReportResult } from '@/data/types/report'
import { notFoundError, validationError } from '../errors'
import { jsonResponse, paginated, resolveOffsetPage, single } from '../envelope'
import { requirePermission, type RequestContext } from '../auth'
import type { RouteHandler } from '../router'
import type { Database } from '../db'
import { loadCatalogue } from '../compile'
import { createRunReportHandler } from './reportsRun'
import { fetchAlertRuleRow, legacyFieldsOf, measureKeyOfSeriesId, toWireAlertRule, type AlertRuleRow } from '../alertRuleRow'
import { holdsPermission, loadOperatorPermissions } from '../permissions'
import { recordAudit } from '../audit'

const WRITE_PERMISSION: PermissionKey = 'view_analytics'
const READ_PERMISSION: PermissionKey = 'view_analytics'

/** `04-alerting-v2.md` §5, verbatim from `src/data/clients/alerts.ts`'s `CONFIG_HISTORY_FIELDS` — the set of fields whose change is worth a `Changes` row. */
const CONFIG_HISTORY_FIELDS = ['name', 'evaluationGrain', 'cadence', 'severity', 'enabled', 'mutedUntil'] as const

function parseJsonBody(text: string): Record<string, unknown> {
  if (!text) return {}
  try {
    const parsed: unknown = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return parseJsonBody(await req.text())
  } catch {
    return {}
  }
}

function parseJsonColumn<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return JSON.parse(value) as T
  return value as T
}

function numberParam(url: URL, name: string): number | undefined {
  const raw = url.searchParams.get(name)
  if (raw === null) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

interface ParsedFilter {
  field: string
  op: string
  value: string
}

/** `http.ts`'s `toSearchParams`: `?filter=field:op:value`, repeated, arrays comma-joined. */
function parseFilters(url: URL): ParsedFilter[] {
  return url.searchParams.getAll('filter').map((raw) => {
    const [field, op, ...rest] = raw.split(':')
    return { field: field ?? '', op: op ?? 'eq', value: rest.join(':') }
  })
}

function filterValues(filter: ParsedFilter): string[] {
  return filter.value.split(',').filter((v) => v.length > 0)
}

/* ───────────────────────────── shared lookups ───────────────────────────── */

async function measureForSeries(db: Database, seriesId: string) {
  const catalogue = await loadCatalogue(db)
  return catalogue.measures.find((m) => m.key === measureKeyOfSeriesId(seriesId)) ?? null
}

async function fetchSavedReportQuery(db: Database, reportId: string): Promise<ReportQuery | null> {
  const rows = await db.sql<{ query_json: unknown }>`SELECT query_json FROM saved_reports WHERE id = ${reportId}`
  const raw = rows[0]?.query_json
  if (raw === undefined) return null
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as ReportQuery
}

/* ─────────────────────────────── list / get ──────────────────────────────── */

/** GET /api/v1/alerts  params: q · filter=state:in:… · filter=cadence:eq:… · filter=label:eq:… · filter=owner:eq:… · page · pageSize  -> Paginated<AlertRule> */
export function createListAlertRulesHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    requirePermission(ctx, READ_PERMISSION)
    const rows = await db.sql<AlertRuleRow>`SELECT * FROM alert_rules ORDER BY updated_at DESC`
    let rules = rows.map(toWireAlertRule)

    const url = new URL(req.url)
    const q = url.searchParams.get('q')?.trim().toLowerCase()
    if (q) rules = rules.filter((r) => r.name.toLowerCase().includes(q))

    for (const filter of parseFilters(url)) {
      const wanted = filterValues(filter)
      if (wanted.length === 0) continue
      if (filter.field === 'state') rules = rules.filter((r) => wanted.includes(r.state))
      if (filter.field === 'cadence') rules = rules.filter((r) => r.cadence !== null && wanted.includes(r.cadence))
      if (filter.field === 'owner') rules = rules.filter((r) => wanted.includes(r.ownerId))
      if (filter.field === 'label') rules = rules.filter((r) => (r.labels ?? []).some((l) => wanted.includes(l)))
    }

    const { page, pageSize, offset, limit } = resolveOffsetPage({ page: numberParam(url, 'page'), pageSize: numberParam(url, 'pageSize') })
    return jsonResponse(paginated(rules.slice(offset, offset + limit), rules.length, page, pageSize))
  }
}

/** GET /api/v1/alerts/:id -> Single<AlertRule> */
export function createGetAlertRuleHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    requirePermission(ctx, READ_PERMISSION)
    const row = await fetchAlertRuleRow(db, ctx.params.id ?? '')
    if (!row) throw notFoundError(`alert rule ${ctx.params.id}`)
    return jsonResponse(single(toWireAlertRule(row)))
  }
}

/* ─────────────────────────────── save (create/update) ────────────────────── */

interface SaveAlertBody {
  id?: string | null
  name?: unknown
  reportId?: string | null
  seriesId?: unknown
  comparator?: unknown
  threshold?: number | null
  evaluationGrain?: unknown
  cadence?: unknown
  recipientIds?: unknown
  enabled?: unknown
  mutedUntil?: unknown
  condition?: AlertCondition
  channels?: unknown
  severity?: unknown
  labels?: unknown
  minReArmMinutes?: unknown
  consecutiveFailuresBeforeError?: unknown
  ownerId?: unknown
}

async function collectSaveReasons(db: Database, body: SaveAlertBody, name: string): Promise<SaveInvalidReason[]> {
  const reasons: SaveInvalidReason[] = []
  if (name.length === 0) reasons.push('name-required')
  if (name.length > REPORT_NAME_MAX) reasons.push('name-too-long')
  if (!body.reportId) reasons.push('report-unsaved')
  if (body.threshold === null || body.threshold === undefined || Number.isNaN(body.threshold)) reasons.push('threshold-required')

  const seriesId = typeof body.seriesId === 'string' ? body.seriesId : ''
  const measure = seriesId ? await measureForSeries(db, seriesId) : null
  if (!measure) reasons.push('series-unknown')

  if (measure && Array.isArray(body.recipientIds)) {
    const recipientIds = body.recipientIds.filter((r): r is string => typeof r === 'string')
    const checks = await Promise.all(recipientIds.map((id) => loadOperatorPermissions(db, id)))
    const anyBlocked = checks.some((op) => !holdsPermission(op, measure.permission?.key ?? null))
    if (anyBlocked) reasons.push('recipient-not-permitted')
  }
  return reasons
}

/**
 * POST /api/v1/alerts · PATCH /api/v1/alerts/:id  body: SaveAlertInput
 * -> Single<AlertRule>. A 422 names every `SaveInvalidReason` as a
 * `details[].code` — the mock's `{ status: 'invalid', reasons }` is a
 * mock-only convenience; over HTTP the reasons travel as the error's details. */
function createSaveAlertRuleHandler(db: Database, mode: 'create' | 'update'): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const id = mode === 'update' ? (ctx.params.id ?? '') : null
    const existing = id ? await fetchAlertRuleRow(db, id) : null
    if (mode === 'update' && !existing) throw notFoundError(`alert rule ${id}`)

    const body = (await readJsonBody(req)) as SaveAlertBody
    const name = (typeof body.name === 'string' ? body.name : '').trim()
    const reasons = await collectSaveReasons(db, body, name)
    if (reasons.length > 0) {
      throw validationError(reasons.map((code) => ({ field: 'rule', code, message: code })), 'This alert rule is not valid')
    }

    const seriesId = body.seriesId as string
    const measure = (await measureForSeries(db, seriesId))!
    const condition: AlertCondition =
      body.condition ?? { kind: 'static', comparator: (body.comparator as AlertRule['comparator']) ?? 'gt', threshold: body.threshold as number }
    const legacy = legacyFieldsOf(condition)
    const evaluationGrain = typeof body.evaluationGrain === 'string' ? body.evaluationGrain : (existing?.evaluation_grain ?? 'day')
    const cadence = body.cadence === 'hourly' || body.cadence === 'daily' ? body.cadence : null
    const recipientIds = Array.isArray(body.recipientIds) ? body.recipientIds.filter((r): r is string => typeof r === 'string') : []
    const enabled = typeof body.enabled === 'boolean' ? body.enabled : (existing?.enabled ?? true)
    const mutedUntil = typeof body.mutedUntil === 'string' ? body.mutedUntil : null
    const channels = Array.isArray(body.channels)
      ? body.channels
      : (existing ? parseJsonColumn(existing.channels_json, [{ type: 'in-app' }]) : [{ type: 'in-app' }])
    const severity = body.severity === 'critical' || body.severity === 'high' ? body.severity : (existing?.severity ?? 'high')
    const labels = Array.isArray(body.labels)
      ? body.labels.filter((l): l is string => typeof l === 'string')
      : (existing ? parseJsonColumn<string[]>(existing.labels_json, []) : [])
    const minReArmMinutes = typeof body.minReArmMinutes === 'number' ? body.minReArmMinutes : (existing?.min_rearm_minutes ?? null)
    const consecutiveFailuresBeforeError =
      typeof body.consecutiveFailuresBeforeError === 'number' ? body.consecutiveFailuresBeforeError : (existing?.consecutive_failures_before_error ?? 5)
    const ownerId = typeof body.ownerId === 'string' ? body.ownerId : (existing?.owner_id ?? operator.userId)

    let row: AlertRuleRow
    if (existing) {
      const updated = await db.sql<AlertRuleRow>`
        UPDATE alert_rules SET
          name = ${name}, report_id = ${body.reportId as string}, series_id = ${seriesId},
          condition_json = ${JSON.stringify(condition)}, comparator = ${legacy.comparator}, threshold = ${legacy.threshold},
          threshold_unit = ${measure.unit}, threshold_currency = ${measure.currency},
          evaluation_grain = ${evaluationGrain}, cadence = ${cadence}, min_rearm_minutes = ${minReArmMinutes},
          consecutive_failures_before_error = ${consecutiveFailuresBeforeError},
          channels_json = ${JSON.stringify(channels)},
          recipient_ids_json = ${JSON.stringify(recipientIds)}, severity = ${severity},
          labels_json = ${JSON.stringify(labels)},
          enabled = ${enabled}, muted_until = ${mutedUntil}, owner_id = ${ownerId},
          updated_at = now(), updated_by = ${operator.userId}
        WHERE id = ${existing.id}
        RETURNING *
      `
      row = updated[0]!
      await recordConfigChange(db, operator.userId, toWireAlertRule(existing), toWireAlertRule(row))
    } else {
      const inserted = await db.sql<AlertRuleRow>`
        INSERT INTO alert_rules (
          name, report_id, series_id, condition_json, comparator, threshold, threshold_unit, threshold_currency,
          evaluation_grain, cadence, min_rearm_minutes, consecutive_failures_before_error, channels_json,
          recipient_ids_json, severity, labels_json, enabled, muted_until, owner_id, updated_by
        ) VALUES (
          ${name}, ${body.reportId as string}, ${seriesId}, ${JSON.stringify(condition)}, ${legacy.comparator}, ${legacy.threshold},
          ${measure.unit}, ${measure.currency}, ${evaluationGrain}, ${cadence}, ${minReArmMinutes}, ${consecutiveFailuresBeforeError},
          ${JSON.stringify(channels)}, ${JSON.stringify(recipientIds)}, ${severity},
          ${JSON.stringify(labels)}, ${enabled}, ${mutedUntil}, ${ownerId}, ${operator.userId}
        )
        RETURNING *
      `
      row = inserted[0]!
    }

    await recordAudit(db, {
      userId: operator.userId,
      action: existing ? 'alert.update' : 'alert.create',
      entityType: 'alert_rule',
      entityId: row.id,
      summary: { name },
    })
    return jsonResponse(single(toWireAlertRule(row)), existing ? 200 : 201)
  }
}

export function createCreateAlertRuleHandler(db: Database): RouteHandler<RequestContext> {
  return createSaveAlertRuleHandler(db, 'create')
}
export function createUpdateAlertRuleHandler(db: Database): RouteHandler<RequestContext> {
  return createSaveAlertRuleHandler(db, 'update')
}

async function recordConfigChange(db: Database, by: string, before: AlertRule, after: AlertRule): Promise<void> {
  const diff = CONFIG_HISTORY_FIELDS.filter((field) => before[field] !== after[field]).map((field) => ({
    field,
    from: before[field],
    to: after[field],
  }))
  if (diff.length === 0) return
  await db.sql`INSERT INTO alert_rule_history (rule_id, by, diff_json) VALUES (${after.id}, ${by}, ${JSON.stringify(diff)})`
}

/** DELETE /api/v1/alerts/:id -> void, 204 */
export function createDeleteAlertRuleHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const id = ctx.params.id ?? ''
    const deleted = await db.sql<{ id: string }>`DELETE FROM alert_rules WHERE id = ${id} RETURNING id`
    if (deleted.length === 0) throw notFoundError(`alert rule ${id}`)
    await recordAudit(db, { userId: operator.userId, action: 'alert.delete', entityType: 'alert_rule', entityId: id })
    return new Response(null, { status: 204 })
  }
}

/* ─────────────────────────────── Test now (evaluate) ─────────────────────── */

function bareEvaluation(rule: AlertRule, unit: AlertRule['thresholdUnit'], currency: AlertRule['thresholdCurrency'], now: string, outcome: AlertEvaluation['outcome']): AlertEvaluation {
  return { ruleId: rule.id, evaluatedAt: now, bucketStart: null, value: null, unit, currency, wouldFire: false, outcome, stateChanged: false }
}

/**
 * POST /api/v1/alerts/:id/evaluate -> AlertEvaluation (bare, mirrors the client).
 * AC-877: never changes state or writes to `alert_rules`/`alert_firings`/
 * `notifications` — `stateChanged` is the literal `false`.
 */
export interface EvaluateAlertRuleDeps {
  /** Injectable so a test pins the same clock `reports.run` resolves the window against. Defaults to the real clock. */
  today?: () => IsoDate
  now?: () => string
}

export function createEvaluateAlertRuleHandler(db: Database, deps: EvaluateAlertRuleDeps = {}): RouteHandler<RequestContext> {
  const runReportHandler = createRunReportHandler(db, deps)
  const nowFn = deps.now ?? (() => new Date().toISOString())
  return async (_req, ctx) => {
    const operator = requirePermission(ctx, READ_PERMISSION)
    const row = await fetchAlertRuleRow(db, ctx.params.id ?? '')
    if (!row) throw notFoundError(`alert rule ${ctx.params.id}`)
    const rule = toWireAlertRule(row)
    const now = nowFn()
    const measure = await measureForSeries(db, rule.seriesId)
    const unit = measure?.unit ?? rule.thresholdUnit
    const currency = measure?.currency ?? rule.thresholdCurrency

    const query = await fetchSavedReportQuery(db, rule.reportId)
    if (!query) return jsonResponse(bareEvaluation(rule, unit, currency, now, 'report-missing'))

    let result: ReportResult
    try {
      const req = new Request('http://internal/api/v1/reports/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(query),
      })
      const runCtx = { operator, requestId: ctx.requestId, params: {} }
      const res = await runReportHandler(req, runCtx)
      if (!res.ok) return jsonResponse(bareEvaluation(rule, unit, currency, now, 'report-missing'))
      result = (await res.json()) as ReportResult
    } catch {
      return jsonResponse(bareEvaluation(rule, unit, currency, now, 'report-missing'))
    }

    const series = result.series.find((s) => s.id === rule.seriesId) ?? null
    if (!series) return jsonResponse(bareEvaluation(rule, unit, currency, now, 'series-missing'))
    if (series.blocked) return jsonResponse(bareEvaluation(rule, unit, currency, now, 'series-blocked'))

    const comparison = result.series.find((s) => s.role === 'comparison' && s.measureKey === series.measureKey && s.groupValue === series.groupValue)
    const resolvedSeries: ResolvedSeries = {
      buckets: result.buckets,
      points: series.points,
      partialBucketIndexes: series.partialBucketIndexes,
      previousPeriodPoints: comparison?.points ?? null,
    }
    const evaluated = evaluate(rule, resolvedSeries, now)
    if (evaluated.outcome !== 'would-fire' && evaluated.outcome !== 'would-not-fire') {
      return jsonResponse(bareEvaluation(rule, unit, currency, now, evaluated.outcome))
    }

    const wire: AlertEvaluation = {
      ruleId: rule.id,
      evaluatedAt: now,
      bucketStart: evaluated.bucketStart,
      value: evaluated.value,
      unit: series.unit,
      currency: series.currency,
      wouldFire: evaluated.outcome === 'would-fire',
      outcome: evaluated.outcome,
      stateChanged: false,
    }
    return jsonResponse(wire)
  }
}

/* ─────────────────────────────── mute ─────────────────────────────────────── */

/** POST /api/v1/alerts/:id/mute  body: { until: IsoDateTime | null }  -> Single<AlertRule> */
export function createMuteAlertRuleHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const id = ctx.params.id ?? ''
    const body = await readJsonBody(req)
    const until = typeof body.until === 'string' ? body.until : null
    const rows = await db.sql<AlertRuleRow>`UPDATE alert_rules SET muted_until = ${until} WHERE id = ${id} RETURNING *`
    if (rows.length === 0) throw notFoundError(`alert rule ${id}`)
    await recordAudit(db, { userId: operator.userId, action: 'alert.mute', entityType: 'alert_rule', entityId: id, summary: { until } })
    return jsonResponse(single(toWireAlertRule(rows[0]!)))
  }
}

/* ─────────────────────────────── history / firings ────────────────────────── */

interface FiringRow {
  id: string
  rule_id: string
  fired_at: string
  bucket_start: string
  value: string | number | null
  threshold_or_band_json: unknown
  severity: string
  notification_id: string | null
  acknowledged_at: string | null
  acknowledged_by: string | null
}

interface DeliveryRow {
  firing_id: string
  channel_type: string
  target: string | null
  status: string
  error: string | null
  at: string
}

/** `src/data/types/alert.ts`'s `AlertFiring`/`AlertDelivery`, widened by one status (`'muted'`, `0007_alerts.sql`'s own note) that the client type does not carry — see the migration's comment. */
interface AlertFiringWire {
  id: string
  ruleId: string
  firedAt: string
  bucketStart: string
  value: number | null
  threshold: number
  notificationId: string | null
  acknowledgedAt: string | null
  acknowledgedBy: string | null
  deliveries: Array<{ channelType: string; target: string | null; status: string; error: string | null; at: string }>
  band: { low: number; high: number } | null
}

function toFiringWire(row: FiringRow, deliveries: DeliveryRow[]): AlertFiringWire {
  const evidence = row.threshold_or_band_json as { threshold?: number; band?: { low: number; high: number } } | null
  return {
    id: row.id,
    ruleId: row.rule_id,
    firedAt: row.fired_at,
    bucketStart: row.bucket_start,
    value: row.value === null ? null : Number(row.value),
    threshold: evidence?.threshold ?? 0,
    notificationId: row.notification_id,
    acknowledgedAt: row.acknowledged_at,
    acknowledgedBy: row.acknowledged_by,
    band: evidence?.band ?? null,
    deliveries: deliveries
      .filter((d) => d.firing_id === row.id)
      .map((d) => ({ channelType: d.channel_type, target: d.target, status: d.status, error: d.error, at: d.at })),
  }
}

async function firingsWithDeliveries(db: Database, rows: FiringRow[]): Promise<AlertFiringWire[]> {
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)
  const deliveries = await db.sql<DeliveryRow>`SELECT * FROM alert_deliveries WHERE firing_id = ANY(${ids})`
  return rows.map((r) => toFiringWire(r, deliveries))
}

/** GET /api/v1/alerts/:id/history  params: page · pageSize  -> Paginated<AlertFiring> */
export function createGetAlertHistoryHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    requirePermission(ctx, READ_PERMISSION)
    const ruleId = ctx.params.id ?? ''
    const rows = await db.sql<FiringRow>`SELECT * FROM alert_firings WHERE rule_id = ${ruleId} ORDER BY fired_at DESC`
    const url = new URL(req.url)
    const { page, pageSize, offset, limit } = resolveOffsetPage({ page: numberParam(url, 'page'), pageSize: numberParam(url, 'pageSize') })
    const page_ = rows.slice(offset, offset + limit)
    const wire = await firingsWithDeliveries(db, page_)
    return jsonResponse(paginated(wire, rows.length, page, pageSize))
  }
}

/** GET /api/v1/alerts/firings  params: q · filter=ruleId:in:… · filter=acknowledged:eq:true|false · filter=severity:in:… · page · pageSize  -> Paginated<AlertFiring> */
export function createListFiringsHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    requirePermission(ctx, READ_PERMISSION)
    let rows = await db.sql<FiringRow>`SELECT * FROM alert_firings ORDER BY fired_at DESC`

    const url = new URL(req.url)
    for (const filter of parseFilters(url)) {
      const wanted = filterValues(filter)
      if (wanted.length === 0) continue
      if (filter.field === 'ruleId') rows = rows.filter((r) => wanted.includes(r.rule_id))
      if (filter.field === 'severity') rows = rows.filter((r) => wanted.includes(r.severity))
      if (filter.field === 'acknowledged') {
        const want = wanted.includes('true')
        rows = rows.filter((r) => (r.acknowledged_at !== null) === want)
      }
    }

    const { page, pageSize, offset, limit } = resolveOffsetPage({ page: numberParam(url, 'page'), pageSize: numberParam(url, 'pageSize') })
    const page_ = rows.slice(offset, offset + limit)
    const wire = await firingsWithDeliveries(db, page_)
    return jsonResponse(paginated(wire, rows.length, page, pageSize))
  }
}

/** POST /api/v1/alerts/firings/:id/acknowledge -> AlertFiring (bare). Mirrors `acknowledgedAt`/`By` onto the rule (§7 state 27). No state change. */
export function createAcknowledgeFiringHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    const operator = requirePermission(ctx, WRITE_PERMISSION)
    const now = new Date().toISOString()
    const rows = await db.sql<FiringRow>`
      UPDATE alert_firings SET acknowledged_at = ${now}, acknowledged_by = ${operator.userId}
      WHERE id = ${ctx.params.id ?? ''}
      RETURNING *
    `
    const row = rows[0]
    if (!row) throw notFoundError(`alert firing ${ctx.params.id}`)
    await db.sql`UPDATE alert_rules SET last_ack_at = ${now}, last_ack_by = ${operator.userId} WHERE id = ${row.rule_id}`
    await recordAudit(db, { userId: operator.userId, action: 'alert.acknowledge', entityType: 'alert_firing', entityId: row.id, summary: { ruleId: row.rule_id } })
    const wire = await firingsWithDeliveries(db, [row])
    return jsonResponse(wire[0])
  }
}

/** GET /api/v1/alerts/:id/config-history -> Paginated<ConfigHistoryEntry> */
export function createGetAlertConfigHistoryHandler(db: Database): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    requirePermission(ctx, READ_PERMISSION)
    const ruleId = ctx.params.id ?? ''
    const rows = await db.sql<{ at: string; by: string; diff_json: unknown }>`
      SELECT at, by, diff_json FROM alert_rule_history WHERE rule_id = ${ruleId} ORDER BY at DESC
    `
    const entries = rows.map((r) => ({ at: r.at, by: r.by, diff: typeof r.diff_json === 'string' ? JSON.parse(r.diff_json) : r.diff_json }))
    const url = new URL(req.url)
    const { page, pageSize, offset, limit } = resolveOffsetPage({ page: numberParam(url, 'page'), pageSize: numberParam(url, 'pageSize') })
    return jsonResponse(paginated(entries.slice(offset, offset + limit), entries.length, page, pageSize))
  }
}

export type { AlertRuleRow, FiringRow, DeliveryRow, AlertFiringWire }
