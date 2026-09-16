/**
 * Threshold alerts — §12.
 *
 * ## The honest split, restated at the top of the file that implements it
 *
 * **Something has to evaluate the threshold when nobody is looking at the
 * screen. That is a scheduler, it is server work, and it does not exist.**
 * Every measure in this product resolves against fixtures in a browser.
 * Specifying an alert as though it were client work would produce a feature
 * that only fires while a tab is open, *"which is not an alert — it is a chart
 * with an opinion."*
 *
 * So this client owns the CRUD, the rule list's states, and `Test this rule`.
 * It owns **no evaluation loop**, no timer and no polling. `ALR-1` is seeded
 * `firing` with `N11` beside it precisely so the delivered state is testable
 * before any scheduler exists (§4.4 item 4).
 *
 * ## Cadence is real now, and `null` still means "not scheduled"
 *
 * D41 built the scheduler (`api/cron/alerts-hourly.ts`, `alerts-daily.ts`);
 * AC-1227 lets a rule declare `hourly`, `daily`, or `null`. A few seeded rules
 * now carry a real cadence to prove the lag warning and the on-time state;
 * most still carry `null`, a deliberate "not scheduled," not a placeholder.
 *
 * ## An alert over an undeclared population would be meaningless
 *
 * A rule points at one series of one saved report, and every series carries a
 * `measureKey` that resolves to a catalogue entry with a required
 * `population`. There is no path from this client to a number whose population
 * is unnamed, because there is no such measure. That is the catalogue
 * constraint doing load-bearing work here rather than in the picker.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW, EYVAR_TODAY } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { paginate } from '../mock/query'
import { evaluate } from '../reporting/alerts/evaluate'
import type { IsoDate, Paginated, QueryParams, Single } from '../types/common'
import {
  REPORT_NAME_MAX,
  type AlertEvaluation,
  type AlertFiring,
  type AlertRule,
  type SaveAlertOutcome,
  type SaveInvalidReason,
} from '../types/report'
import { getReport, runReport } from './reports'
import { currentMockUserId } from './session'
import { http } from './http'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let alertFiringFixtures!: Fixtures['alertFiringFixtures']
let alertRuleFixtures!: Fixtures['alertRuleFixtures']
let measuresByKey!: Fixtures['measuresByKey']
onFixturesLoaded((f) => {
  alertFiringFixtures = f.alertFiringFixtures
  alertRuleFixtures = f.alertRuleFixtures
  measuresByKey = f.measuresByKey
  /* Seeded here rather than at module load: these locals are built from
     late-bound fixtures, which are undefined until the fixture chunk lands. */
  rules = alertRuleFixtures.map((r) => ({ ...r }))
  firings = alertFiringFixtures.map((f2) => ({ ...f2 }))
  configHistory = {}
})

export const ALERT_OPERATIONS = {
  list: 'alerts.list',
  get: 'alerts.get',
  save: 'alerts.save',
  delete: 'alerts.delete',
  evaluate: 'alerts.evaluate',
  history: 'alerts.history',
  firings: 'alerts.firings',
  acknowledge: 'alerts.acknowledge',
  mute: 'alerts.mute',
  configHistory: 'alerts.configHistory',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(ALERT_OPERATIONS))

/** Mutable copy. **Not persistence** — Q1 is open, and §9.1 cuts alerts entirely without it. */
let rules!: AlertRule[]
/** Mutable copy, so `acknowledgeFiring` is observable within a session. */
let firings!: AlertFiring[]
/** §5's per-rule save log — `{ at, by, diff }`, newest last. Session-only, like everything else here. */
let configHistory!: Record<string, ConfigHistoryEntry[]>

export interface ConfigHistoryEntry {
  at: string
  by: string
  diff: Array<{ field: string; from: unknown; to: unknown }>
}

/**
 * GET /api/v1/alerts
 *   params: q · filters[state] · page · pageSize
 *   -> Paginated<AlertRule>
 *
 * ## The state filter reads `filters`, and it used to read `view`
 *
 * It was `params.view === 'firing' | 'suspended' | 'error' | 'disabled'`, and
 * **that parameter is not this client's to spend.** `view` is the index view
 * tab — `QueryParams` says so — and on `/management/reports` it is fed from
 * `?view=`, which on the alerts surface is always the reports sub-tab id
 * `'alerts'` (`screens/reports/views.ts`). So the filter could never fire: the
 * only value that ever reached it was the name of the tab the operator was
 * standing on. Worse, the two vocabularies shared a namespace, so a sub-tab
 * ever named `firing` would have silently hidden rows.
 *
 * A `FilterSpec` is keyed on a **field**, so `state` here cannot collide with a
 * view id, a sort field or a second filter — the collision is removed by the
 * shape rather than by choosing a luckier word. The State column declares the
 * matching `select` filter, so the control and this branch are one declaration.
 *
 * **`disabled` did not survive the move, deliberately.** It was never a state:
 * `enabled` is the operator's switch, `state` is the server's machine, and
 * `mutedUntil` is a third fact again — the rule this module states in three
 * places. Offering `Disabled` inside a `State` filter would fold two of the
 * three back together in the one control an operator uses to reason about them.
 * Nothing regresses: the branch was unreachable code the whole time.
 */
export async function listAlertRules(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<AlertRule>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<AlertRule>>('/alerts', { ...params, signal }, { signal })
  }
  return mock(ALERT_OPERATIONS.list, signal, () => {
    let rows = rules.slice()
    for (const filter of params.filters ?? []) {
      if (filter.field !== 'state') continue
      const wanted = Array.isArray(filter.value) ? filter.value.map(String) : [String(filter.value)]
      rows = rows.filter((r) => wanted.includes(r.state))
    }
    const q = params.q?.trim().toLowerCase()
    if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q))
    return paginate(rows, params)
  })
}

/**
 * GET /api/v1/alerts/:id
 *   -> Single<AlertRule>
 */
export async function getAlertRule(id: string, signal?: AbortSignal): Promise<Single<AlertRule>> {
  if (DATA_SOURCE === 'http') return http.get<Single<AlertRule>>(`/alerts/${id}`, undefined, { signal })
  return mock(ALERT_OPERATIONS.get, signal, () => {
    const row = rules.find((r) => r.id === id)
    if (!row) throw notFound('alert rule', id)
    return { data: { ...row } }
  })
}

export interface SaveAlertInput {
  id: string | null
  name: string
  /** A **saved** report. AC-874: the create action is disabled on an unsaved query and states why. */
  reportId: string | null
  seriesId: string
  comparator: AlertRule['comparator']
  /** In the series' wire unit — halalas for money. The operator never picks a unit. */
  threshold: number | null
  evaluationGrain: AlertRule['evaluationGrain']
  /** Unspecified by the business; pass `null` until it is. */
  cadence: AlertRule['cadence']
  recipientIds: string[]
  enabled: boolean
  mutedUntil: string | null
  /** v2, `04-alerting-v2.md` §2. **Absent means the v1 static shape** — `comparator`/`threshold` above. */
  condition?: AlertRule['condition']
  channels?: AlertRule['channels']
  severity?: AlertRule['severity']
  labels?: string[]
  minReArmMinutes?: number | null
}

/**
 * POST /api/v1/alerts · PATCH /api/v1/alerts/:id
 *   body: SaveAlertInput
 *   -> Single<AlertRule>
 *
 * **`thresholdUnit` is derived here, never accepted from the caller** (AC-876).
 * It comes off the series' measure, which comes off the catalogue. A client
 * that could send a unit could send the wrong one, and a money threshold in the
 * wrong unit is off by a factor of a hundred in the direction nobody notices.
 */
export async function saveAlertRule(
  input: SaveAlertInput,
  signal?: AbortSignal,
): Promise<SaveAlertOutcome> {
  if (DATA_SOURCE === 'http') {
    const res = input.id
      ? await http.patch<Single<AlertRule>>(`/alerts/${input.id}`, input, { signal })
      : await http.post<Single<AlertRule>>('/alerts', input, { signal })
    return { status: 'saved', rule: res.data }
  }
  return mockMutation(ALERT_OPERATIONS.save, signal, () => {
    const reasons: SaveInvalidReason[] = []
    const name = input.name.trim()
    if (name.length === 0) reasons.push('name-required')
    if (name.length > REPORT_NAME_MAX) reasons.push('name-too-long')
    if (input.reportId === null) reasons.push('report-unsaved')
    if (input.threshold === null || Number.isNaN(input.threshold)) reasons.push('threshold-required')

    const measure = measureForSeries(input.seriesId)
    if (!measure) reasons.push('series-unknown')
    if (reasons.length > 0) return { status: 'invalid' as const, reasons }

    const existing = input.id ? rules.find((r) => r.id === input.id) : undefined
    if (input.id && !existing) throw notFound('alert rule', input.id)

    const rule: AlertRule = {
      id: existing?.id ?? `ALR-${rules.length + 1}${rules.length}`,
      name,
      reportId: input.reportId as string,
      seriesId: input.seriesId,
      comparator: input.comparator,
      threshold: input.threshold as number,
      /* Derived. See the doc comment. */
      thresholdUnit: measure!.unit,
      thresholdCurrency: measure!.currency,
      /* v2 (`04-alerting-v2.md` §2). `undefined` keeps `alertCondition()` reading the v1 pair above. */
      condition: input.condition,
      evaluationGrain: input.evaluationGrain,
      cadence: input.cadence,
      minReArmMinutes: input.minReArmMinutes ?? existing?.minReArmMinutes ?? null,
      consecutiveFailuresBeforeError: existing?.consecutiveFailuresBeforeError ?? 5,
      state: existing?.state ?? 'armed',
      enabled: input.enabled,
      mutedUntil: input.mutedUntil,
      recipientIds: input.recipientIds,
      ownerId: existing?.ownerId ?? currentMockUserId(),
      notificationPriority: existing?.notificationPriority ?? 'high',
      severity: input.severity,
      channels: input.channels,
      labels: input.labels ?? existing?.labels ?? [],
      lastEvaluatedAt: existing?.lastEvaluatedAt ?? null,
      lastFiredAt: existing?.lastFiredAt ?? null,
      lastValue: existing?.lastValue ?? null,
      lastBand: existing?.lastBand,
      acknowledgedAt: existing?.acknowledgedAt,
      acknowledgedBy: existing?.acknowledgedBy,
      stateReasonKey: existing?.stateReasonKey ?? null,
      createdAt: existing?.createdAt ?? EYVAR_NOW,
      updatedAt: EYVAR_NOW,
    }

    if (existing) recordConfigChange(existing, rule)
    rules = existing ? rules.map((r) => (r.id === rule.id ? rule : r)) : [...rules, rule]
    return { status: 'saved' as const, rule: { ...rule } }
  })
}

/**
 * DELETE /api/v1/alerts/:id
 *   -> 204
 */
export async function deleteAlertRule(id: string, signal?: AbortSignal): Promise<void> {
  if (DATA_SOURCE === 'http') {
    await http.delete<void>(`/alerts/${id}`, { signal })
    return
  }
  await mockMutation(ALERT_OPERATIONS.delete, signal, () => {
    if (!rules.some((r) => r.id === id)) throw notFound('alert rule', id)
    rules = rules.filter((r) => r.id !== id)
  })
}

/**
 * POST /api/v1/alerts/:id/evaluate
 *   -> AlertEvaluation
 *
 * **`Test this rule` — foreground only, and it says *would have fired*.**
 *
 * §12.1 lists this as the fourth thing the client genuinely owns, and it is
 * genuinely useful: it is how an operator discovers the threshold is on the
 * wrong side of the line. AC-877 pins the three things it must not do — it
 * never changes the rule's state, never emits a notification, and never claims
 * the rule fired. `stateChanged` is the literal `false` so a caller cannot read
 * it as anything else.
 *
 * It reads **the most recent complete bucket** (§12.3). A partial bucket is
 * never evaluated: a flow measure's current partial bucket is always below any
 * sensible floor, so evaluating it would fire every rule every morning.
 */
export async function evaluateAlertRule(
  id: string,
  options: { today?: IsoDate; signal?: AbortSignal } = {},
): Promise<AlertEvaluation> {
  const { signal } = options
  if (DATA_SOURCE === 'http') {
    return http.post<AlertEvaluation>(`/alerts/${id}/evaluate`, undefined, { signal })
  }

  const rule = rules.find((r) => r.id === id)
  if (!rule) throw notFound('alert rule', id)

  const today = options.today ?? EYVAR_TODAY
  const report = await getReport(rule.reportId).catch(() => null)
  if (!report) return evaluation(rule, today, 'report-missing')

  const run = await runReport(report.data.query, { today })
  if (run.status !== 'ok') return evaluation(rule, today, 'series-missing')

  const series = run.result.series.find((s) => s.id === rule.seriesId)
  if (!series) return evaluation(rule, today, 'series-missing')
  if (series.blocked) return evaluation(rule, today, 'series-blocked')

  /* The report's own aligned comparison series, if the query has one
     (`resolveReport.ts:342`) — `relative`'s `against: 'previous-period'`
     reads this rather than issuing a second query (`evaluate.ts`). */
  const comparison = run.result.series.find(
    (s) => s.role === 'comparison' && s.measureKey === series.measureKey && s.groupValue === series.groupValue,
  )

  /* All four condition kinds, the partial-bucket rule and the gap rule live in
     `reporting/alerts/evaluate.ts` now — shared with the server cron
     (`04-alerting-v2.md` §3). */
  const result = evaluate(
    rule,
    {
      buckets: run.result.buckets,
      points: series.points,
      partialBucketIndexes: series.partialBucketIndexes,
      previousPeriodPoints: comparison?.points ?? null,
    },
    EYVAR_NOW,
  )
  /* A refusal carries its own reason through to the composer (AC-1230): too little
     history reads as `no-baseline`, not as a missing bucket. */
  const outcome = result.outcome
  if (outcome !== 'would-fire' && outcome !== 'would-not-fire') {
    return evaluation(rule, today, outcome)
  }

  return mock(ALERT_OPERATIONS.evaluate, signal, () => ({
    ruleId: rule.id,
    evaluatedAt: EYVAR_NOW,
    bucketStart: result.bucketStart,
    value: result.value,
    unit: series.unit,
    currency: series.currency,
    wouldFire: outcome === 'would-fire',
    outcome,
    stateChanged: false as const,
  }))
}

/**
 * GET /api/v1/alerts/:id/history
 *   params: page · pageSize
 *   -> Paginated<AlertFiring>
 *
 * Newest first. A firing whose notification has since been cleared carries
 * `notificationId: null` — a real state, and the history must not imply the row
 * is still in the inbox.
 */
export async function listAlertFirings(
  ruleId: string,
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<AlertFiring>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<AlertFiring>>(`/alerts/${ruleId}/history`, { ...params, signal }, { signal })
  }
  return mock(ALERT_OPERATIONS.history, signal, () => {
    const rows = firings
      .filter((f) => f.ruleId === ruleId)
      .sort((a, b) => Date.parse(b.firedAt) - Date.parse(a.firedAt))
    return paginate(rows, params)
  })
}

/* ─────────────────────────── §4's Firings tab ───────────────────────────── */

export interface FiringQuery extends QueryParams {
  /** `filters[ruleId|severity|acknowledged]` — the Firings tab's own controls. */
  filters?: QueryParams['filters']
}

/**
 * GET /api/v1/alerts/firings
 *   -> Paginated<AlertFiring>
 * The cross-rule ledger (§4) beside `alerts.history`: every firing seen, newest first.
 */
export async function listFirings(params: FiringQuery = {}, signal?: AbortSignal): Promise<Paginated<AlertFiring>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<AlertFiring>>('/alerts/firings', { ...params, signal }, { signal })
  }
  return mock(ALERT_OPERATIONS.firings, signal, () => {
    let rows = [...firings]
    for (const filter of params.filters ?? []) {
      const wanted = Array.isArray(filter.value) ? filter.value.map(String) : [String(filter.value)]
      if (filter.field === 'ruleId') rows = rows.filter((f) => wanted.includes(f.ruleId))
      if (filter.field === 'acknowledged') {
        const want = wanted.includes('true')
        rows = rows.filter((f) => (f.acknowledgedAt !== null && f.acknowledgedAt !== undefined) === want)
      }
    }
    rows.sort((a, b) => Date.parse(b.firedAt) - Date.parse(a.firedAt))
    return paginate(rows, params)
  })
}

/**
 * POST /api/v1/alerts/firings/:id/acknowledge
 *   -> AlertFiring (§7 state 27)
 * Writes `acknowledgedAt`/`acknowledgedBy` on the firing AND mirrors both onto the rule, matching `ALR-10`/`AFR-3`.
 */
export async function acknowledgeFiring(firingId: string, signal?: AbortSignal): Promise<AlertFiring> {
  if (DATA_SOURCE === 'http') {
    return http.post<AlertFiring>(`/alerts/firings/${firingId}/acknowledge`, undefined, { signal })
  }
  return mockMutation(ALERT_OPERATIONS.acknowledge, signal, () => {
    const row = firings.find((f) => f.id === firingId)
    if (!row) throw notFound('alert firing', firingId)
    const me = currentMockUserId()
    const acknowledged: AlertFiring = { ...row, acknowledgedAt: EYVAR_NOW, acknowledgedBy: me }
    firings = firings.map((f) => (f.id === firingId ? acknowledged : f))
    rules = rules.map((r) => (r.id === row.ruleId ? { ...r, acknowledgedAt: EYVAR_NOW, acknowledgedBy: me } : r))
    return { ...acknowledged }
  })
}

/**
 * POST /api/v1/alerts/:id/mute
 *   -> Single<AlertRule>
 * §4's `Mute for…` menu. Evaluation keeps running while muted (§12.4) so the rule re-arms correctly.
 */
export async function muteAlertRule(id: string, until: string, signal?: AbortSignal): Promise<Single<AlertRule>> {
  if (DATA_SOURCE === 'http') return http.post<Single<AlertRule>>(`/alerts/${id}/mute`, { until }, { signal })
  return mockMutation(ALERT_OPERATIONS.mute, signal, () => {
    const row = rules.find((r) => r.id === id)
    if (!row) throw notFound('alert rule', id)
    const muted: AlertRule = { ...row, mutedUntil: until }
    rules = rules.map((r) => (r.id === id ? muted : r))
    return { data: { ...muted } }
  })
}

/**
 * GET /api/v1/alerts/:id/config-history
 *   -> Paginated<ConfigHistoryEntry>
 * §5's Changes tab: one entry per save that changed a field, newest first. No history is the empty state, not an error.
 */
export async function getAlertConfigHistory(
  id: string,
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<ConfigHistoryEntry>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<ConfigHistoryEntry>>(`/alerts/${id}/config-history`, { ...params, signal }, { signal })
  }
  return mock(ALERT_OPERATIONS.configHistory, signal, () => {
    const rows = [...(configHistory[id] ?? [])].reverse()
    return paginate(rows, params)
  })
}

/* ─────────────────────────── the sentence ──────────────────────────────── */

/**
 * What the rule will do, as **one translation key with named parameters** —
 * AC-878, and AC-895's *"there is no `a + ' vs ' + b` anywhere in the module"*.
 *
 * The builder has to state, in words, what will happen. This returns the key
 * and the params; the UI resolves both, because Arabic does not put the noun
 * where English does and a concatenated sentence is untranslatable by
 * construction.
 *
 * `higherIsBetter` rides along because §4.1 F-7 says the builder needs it *"to
 * word a comparator honestly and to decide whether over the line is good news"*
 * — a rising cancellation rate crossing a threshold is not the same news as a
 * rising revenue one, and no screen can derive that from the key or the sign.
 */
export function describeAlertRule(rule: AlertRule): {
  key: string
  params: Record<string, string | number | boolean>
} {
  const measure = measureForSeries(rule.seriesId)
  return {
    key: 'rb.alert.sentence',
    params: {
      measure: measure?.labelKey ?? rule.seriesId,
      comparator: rule.comparator,
      threshold: rule.threshold,
      unit: rule.thresholdUnit,
      grain: rule.evaluationGrain,
      higherIsBetter: measure?.higherIsBetter ?? true,
    },
  }
}

export function resetAlerts(): void {
  /* Nothing seeded yet: the fixture chunk has not landed, so there is no
     state to reset and the rows this would read are still undefined. The
     binder in this module seeds fresh state when it does land. */
  if (!fixturesLoaded()) return
  rules = alertRuleFixtures.map((r) => ({ ...r }))
  firings = alertFiringFixtures.map((f) => ({ ...f }))
  configHistory = {}
}

/* ────────────────────────────── helpers ────────────────────────────────── */

/**
 * A `ReportSeries.id` is `<measureKey>#<group>#<role>`, so the measure — and
 * therefore the unit, the currency and the population — is recoverable from the
 * rule alone, with no report resolved. That is what lets a rule list render a
 * threshold in the right unit without running fourteen reports.
 */
function measureForSeries(seriesId: string) {
  return measuresByKey[seriesId.split('#')[0] ?? ''] ?? null
}

/** §5's `{ at, by, diff }` row — one entry per field that actually changed. */
const CONFIG_HISTORY_FIELDS = ['name', 'evaluationGrain', 'cadence', 'severity', 'enabled', 'mutedUntil'] as const

function recordConfigChange(before: AlertRule, after: AlertRule): void {
  const diff = CONFIG_HISTORY_FIELDS.filter((field) => before[field] !== after[field]).map((field) => ({
    field,
    from: before[field],
    to: after[field],
  }))
  if (diff.length === 0) return
  const entry: ConfigHistoryEntry = { at: EYVAR_NOW, by: currentMockUserId(), diff }
  configHistory = { ...configHistory, [after.id]: [...(configHistory[after.id] ?? []), entry] }
}

function evaluation(
  rule: AlertRule,
  _today: IsoDate,
  outcome: AlertEvaluation['outcome'],
): AlertEvaluation {
  const measure = measureForSeries(rule.seriesId)
  return {
    ruleId: rule.id,
    evaluatedAt: EYVAR_NOW,
    bucketStart: null,
    value: null,
    unit: measure?.unit ?? rule.thresholdUnit,
    currency: measure?.currency ?? rule.thresholdCurrency,
    wouldFire: false,
    outcome,
    stateChanged: false,
  }
}
