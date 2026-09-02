/**
 * The rule builder — §12.2, and **the half of alerting the client honestly
 * owns.**
 *
 * > **measure** (a series of a saved report) · **comparator** · **threshold** ·
 * > **evaluation grain** · **cadence** · **re-arm**
 *
 * ## An alert watches a SAVED report, and the form says so
 *
 * **AC-874.** A rule over an unsaved query has no stable identity to evaluate,
 * no name to put in a notification and nowhere to send the operator when it
 * fires. So the report picker offers saved reports only, and with none saved
 * the create action is disabled **in place** with that sentence rather than
 * hidden.
 *
 * ## The series list is resolved, not typed
 *
 * A `ReportSeries.id` is `<measureKey>#<group>#<role>` and it is the *result*
 * that decides which exist — a split by district produces nine, a two-measure
 * report four. So choosing a report **runs it** and offers what came back. That
 * is one request the operator asked for by choosing a report, not a poll.
 *
 * ## The threshold's unit is derived and never chosen (AC-876)
 *
 * The unit comes off the series' measure, off the catalogue. The operator types
 * `400` against a money measure meaning 400 SAR, and the wire carries 40 000
 * halalas — converted through `parseMoneyInput`, which does the conversion on
 * the digit string because `19.99 * 100` is `1998.9999999999998` in IEEE-754.
 * A client that could send a unit could send the wrong one, and a money
 * threshold off by a factor of a hundred is off in the direction nobody notices.
 *
 * ## Two fields are unset, and the form refuses to invent them
 *
 * **`cadence` and `minReArmMinutes` are `null` on every seeded rule and stay
 * `null` here.** The business has specified no evaluation schedule and no
 * scheduler exists (Q-RB-7); **AC-453** is this project's standing rule for the
 * case — *an invented window is indistinguishable from a measured one once it
 * ships*. So the field renders **disabled, reading `Not set`, with the
 * consequence stated beside it**: a rule with no cadence keeps its settings and
 * does not run.
 *
 * That is a deliberate departure from **AC-875**, which lists a cadence among
 * the fields required before `Save` is enabled. The criterion and the ruling
 * cannot both hold. The ruling wins, and the departure is named in the handoff
 * rather than absorbed — offering `Hourly`/`Daily` would put a decision nobody
 * made into a saved record, where the next reader would take it for one.
 *
 * ## What is NOT here, and why
 *
 * **The recipient picker.** §13.3's rule is that an operator who cannot see the
 * rule's measure *is not a legal recipient* — and *"can user X see measure M"*
 * has no answer today, because **D4 is open** and every measure's `permission`
 * that is set is one of the thirteen broad keys. A picker that offered everyone
 * would ship the leak the rule exists to close; one that offered nobody would
 * look broken. **AC-891 is blocked on D4** and the field is absent rather than
 * wrong.
 *
 * Rules applied
 *   §3.2        validate by disabling the primary, not by an error after submit.
 *   §8.3        a failed save never closes the dialog it came from, and the
 *               operator's input is preserved.
 *   R3          one primary in the dialog.
 *   §7.2        every control keyboard-reachable with a visible ring; every
 *               disabled control states its reason.
 */

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { Switch } from '@/components/ui/switch'
import { useAsync } from '@/hooks'
import { listReports, runReport, saveAlertRule } from '@/data/clients'
import { REPORT_NAME_MAX } from '@/data/types'
import type {
  AlertComparator,
  AlertRule,
  MeasureGrain,
  ReportSeries,
  SaveInvalidReason,
  SavedReport,
} from '@/data/types'
/* Deep import, NOT the `@/components/metrics` barrel. The barrel also exports
   `TrendChart`, which pulls recharts -- a 337 kB chunk (104 kB gzip) that then
   loads on `/management/reports` where no chart renders. `formatMetric.ts` has
   no React in it. */
import { formatMetricValue } from '@/components/metrics/formatMetric'
import { formatDate, parseMoneyInput, parseNumericInput, type Translator } from '@/lib'

/** The four, and deliberately the same four names `FilterOperator` already uses. */
const COMPARATORS: AlertComparator[] = ['gt', 'gte', 'lt', 'lte']
/** Which bucket's value is tested. `'hour'` is offered nowhere until a store carries one. */
const GRAINS: MeasureGrain[] = ['day', 'week', 'month']

export interface AlertRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` creates. */
  rule: AlertRule | null
  onSaved: (rule: AlertRule) => void
  today: string
  t: Translator
  language: 'en' | 'ar'
}

export function AlertRuleDialog({
  open,
  onOpenChange,
  rule,
  onSaved,
  today,
  t,
  language,
}: AlertRuleDialogProps) {
  const [name, setName] = useState(rule?.name ?? '')
  const [reportId, setReportId] = useState<string | null>(rule?.reportId ?? null)
  const [seriesId, setSeriesId] = useState<string>(rule?.seriesId ?? '')
  const [comparator, setComparator] = useState<AlertComparator>(rule?.comparator ?? 'gt')
  const [thresholdText, setThresholdText] = useState('')
  const [grain, setGrain] = useState<MeasureGrain>(rule?.evaluationGrain ?? 'day')
  const [enabled, setEnabled] = useState(true)
  const [mutedUntil, setMutedUntil] = useState<string | null>(null)
  const [reasons, setReasons] = useState<readonly SaveInvalidReason[]>([])
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  /**
   * **Settled: `reports.list` holds the client's native `Paginated` envelope.**
   *
   * This fetcher used to unwrap to `SavedReport[]` while
   * `DashboardDetailScreen`'s picker stored the envelope under the same
   * operation id. The cache is untyped — `useAsync` casts the stored `unknown`
   * to `T` — so one id holding two shapes is a `.find is not a function`
   * waiting for the two keys to meet. Found by the P3-13 deps audit and left
   * uncached rather than papered over with a distinguishing dep, which is the
   * right call: a dep would have hidden the collision, not removed it.
   *
   * This side changed because the envelope is what the client actually returns;
   * unwrapping at the *consumer* keeps one shape per operation id, which is the
   * invariant the cache needs. The two callers now genuinely share an entry.
   */
  const reports = useAsync((signal) => listReports({ pageSize: 100 }, signal), {
    cacheKey: 'reports.list',
    deps: [open],
    isEmpty: () => false,
    enabled: open,
  })
  const reportItems = reports.data?.items ?? []

  /* Choosing a report RESOLVES it, because which series exist is a property of
     the result and not of the query. One request, caused by one choice. */
  const resolved = useAsync<readonly ReportSeries[]>(
    async (signal) => {
      const report = reportItems.find((r) => r.id === reportId)
      if (!report) return []
      const outcome = await runReport(report.query, { today, signal })
      return outcome.status === 'ok'
        ? outcome.result.series.filter((s) => s.role === 'current' && !s.blocked)
        : []
    },
    {
      /* P3-13 fix: `today` is threaded into `runReport` above and was NOT a
         dependency, so the resolved series list did not re-resolve across a
         midnight rollover - the parent derives `today` from a ticking clock.
         Deliberately NOT given a `cacheKey`: `reports.data?.length` is a proxy
         for the report list, and a saved report edited in place keeps the same
         length and the same id, so the key would collide with the pre-edit
         series. Needs a memoised `query` dep before it can be cached. */
      deps: [reportId, reportItems.length, today],
      /* A report that resolves to no readable series is a REAL answer — every
         series blocked, or a run that returned nothing — and it has to be
         distinguishable from *still loading*, or the picker sits enabled over
         an empty list and silently offers nothing. */
      isEmpty: (rows) => rows.length === 0,
      enabled: reportId !== null,
    },
  )

  const series = (resolved.data ?? []).find((s) => s.id === seriesId) ?? null

  useEffect(() => {
    if (!open) return
    setName(rule?.name ?? '')
    setReportId(rule?.reportId ?? null)
    setSeriesId(rule?.seriesId ?? '')
    setComparator(rule?.comparator ?? 'gt')
    setGrain(rule?.evaluationGrain ?? 'day')
    setEnabled(rule?.enabled ?? true)
    setMutedUntil(rule?.mutedUntil ?? null)
    /* An existing money threshold is halalas on the record and SAR in the
       field — the same asymmetry, read the other way. */
    setThresholdText(
      rule === null
        ? ''
        : rule.thresholdUnit === 'money'
          ? String(rule.threshold / 100)
          : String(rule.threshold),
    )
    setReasons([])
    setFailed(false)
  }, [open, rule])

  /** The wire value. Money is halalas; everything else is the number as typed. */
  const threshold =
    series?.unit === 'money' ? parseMoneyInput(thresholdText) : parseNumericInput(thresholdText)

  const submit = async () => {
    setSaving(true)
    setFailed(false)
    try {
      const outcome = await saveAlertRule({
        id: rule?.id ?? null,
        name,
        reportId,
        seriesId,
        comparator,
        threshold,
        evaluationGrain: grain,
        /* **Unset, and passed as unset.** See the file header. */
        cadence: null,
        /* **Blocked on D4, and passed through rather than reset.** See the
           file header: *can user X see measure M* has no answer today, so this
           form may not compose a recipient list. Editing a rule must not
           silently clear the one it already has. */
        recipientIds: rule?.recipientIds ?? [],
        enabled,
        mutedUntil,
      })
      if (outcome.status === 'invalid') {
        setReasons(outcome.reasons)
        return
      }
      onSaved(outcome.rule)
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  const noSavedReports = reports.status === 'content' && reportItems.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{rule ? t('rb.alert.form.edit') : t('rb.alert.form.title')}</DialogTitle>
          {/* AC-878 — what will happen, in words, as one key with named
              parameters. It updates as the controls do, so the operator reads
              the rule rather than reconstructing it from four fields. */}
          <DialogDescription>
            {series && threshold !== null
              ? t('rb.alert.sentence', {
                  measure: t(`rb.measure.${series.measureKey}`),
                  comparator: t(`rb.alert.comparator.${comparator}`),
                  threshold: formatMetricValue(threshold, series.unit, language),
                  grain: t(`rb.grainNoun.${grain}`),
                })
              : t('rb.alert.form.report.unsaved')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rb-alert-name">{t('rb.alert.form.name')}</Label>
            <Input
              id="rb-alert-name"
              autoFocus
              maxLength={REPORT_NAME_MAX}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rb-alert-report">{t('rb.alert.form.report')}</Label>
            {/* **Four states, on a picker.** A trigger that stays enabled
                while its list is still arriving — or after it failed — opens a
                menu that silently offers nothing, and the operator reads that
                as *there are no reports*. The same defect `ManualDispatchModal`
                fixed for its captain picker. */}
            {reports.status === 'loading' ? (
              <LoadingSkeleton pattern="P1" rows={2} label={t('rb.alert.form.report.loading')} />
            ) : reports.status === 'error' ? (
              <ErrorState
                scope="card"
                card={false}
                message={t('rb.alert.form.report.error')}
                action={{ label: t('rb.library.error.retry'), onClick: reports.refetch }}
              />
            ) : (
              <Select
                value={reportId ?? ''}
                disabled={noSavedReports}
                onValueChange={(value) => {
                  setReportId(value)
                  setSeriesId('')
                }}
              >
                <SelectTrigger id="rb-alert-report" className="w-full">
                  <SelectValue placeholder={t('rb.alert.form.report')} />
                </SelectTrigger>
                <SelectContent>
                  {reportItems.map((report: SavedReport) => (
                    <SelectItem key={report.id} value={report.id}>
                      <bdi>{report.name}</bdi>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* AC-874 — disabled in place, with the reason. */}
            {noSavedReports && (
              <p className="text-xs text-muted-foreground">{t('rb.alert.form.report.unsaved')}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rb-alert-series">{t('rb.alert.form.series')}</Label>
            {/* The unstarted case FIRST: with no report chosen the hook is
                held in `loading` without firing, so branching on status alone
                would show a skeleton for a request that is not happening. */}
            {reportId === null ? (
              <>
                <Select value="" disabled onValueChange={setSeriesId}>
                  <SelectTrigger id="rb-alert-series" className="w-full">
                    <SelectValue placeholder={t('rb.alert.form.series')} />
                  </SelectTrigger>
                  <SelectContent />
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('rb.alert.form.series.unstarted')}
                </p>
              </>
            ) : resolved.status === 'loading' ? (
              <LoadingSkeleton pattern="P1" rows={2} label={t('rb.alert.form.series.loading')} />
            ) : resolved.status === 'error' ? (
              <ErrorState
                scope="card"
                card={false}
                message={t('rb.alert.form.series.error')}
                action={{ label: t('rb.library.error.retry'), onClick: resolved.refetch }}
              />
            ) : resolved.status === 'empty' ? (
              /* Stated, not an empty menu. §13.1's redaction can empty this
                 list, and *you may not read any of its series* is a different
                 fact from *it has none*. */
              <p className="text-xs text-muted-foreground">{t('rb.alert.form.series.empty')}</p>
            ) : (
              <Select value={seriesId} onValueChange={setSeriesId}>
                <SelectTrigger id="rb-alert-series" className="w-full">
                  <SelectValue placeholder={t('rb.alert.form.series')} />
                </SelectTrigger>
                <SelectContent>
                  {(resolved.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.groupValue === null ? (
                        t(`rb.measure.${s.measureKey}`)
                      ) : (
                        <bdi>{s.groupValue}</bdi>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rb-alert-comparator">{t('rb.alert.form.comparator')}</Label>
            <Select
              value={comparator}
              onValueChange={(value) => setComparator(value as AlertComparator)}
            >
              <SelectTrigger id="rb-alert-comparator" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPARATORS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`rb.alert.comparator.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rb-alert-threshold">{t('rb.alert.form.threshold')}</Label>
            <Input
              id="rb-alert-threshold"
              inputMode="decimal"
              value={thresholdText}
              disabled={series === null}
              onChange={(event) => setThresholdText(event.target.value)}
            />
            {/* AC-876 — the unit is STATED and never selected. */}
            {series && (
              <p className="text-xs text-muted-foreground">
                {t('rb.alert.form.threshold.unit', { unit: t(`rb.unit.${series.unit}`) })}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rb-alert-grain">{t('rb.alert.form.grain')}</Label>
            <Select value={grain} onValueChange={(value) => setGrain(value as MeasureGrain)}>
              <SelectTrigger id="rb-alert-grain" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRAINS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`rb.grain.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* **The unset field, rendered as unset.** Disabled because there is
              nothing to choose between: the business has named no schedule, and
              a picker offering two invented ones would look like a decision. */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rb-alert-cadence">{t('rb.alert.form.cadence')}</Label>
            <Input id="rb-alert-cadence" disabled readOnly value={t('rb.alert.cadence.unset')} />
            <p className="text-xs text-muted-foreground">{t('rb.alert.cadence.explain')}</p>
          </div>

          {/* **On or off, and it is a real control.** `enabled` is on the
              record and `alerts.save` takes it; leaving it out meant an
              operator could not turn a rule off from the form that made it. */}
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="rb-alert-enabled">{t('rb.alert.form.enabled')}</Label>
            <Switch id="rb-alert-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* **Muted, said out loud.** A muted rule keeps evaluating and stops
              notifying, so a form that did not show the mute would let someone
              wonder why a firing rule told nobody. Un-muting is here; muting
              *for a duration* is not, because no durations have been specified
              and inventing three would be AC-453. */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rb-alert-muted">{t('rb.alert.form.muted')}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="rb-alert-muted"
                disabled
                readOnly
                value={
                  mutedUntil === null
                    ? t('rb.alert.form.muted.none')
                    : t('rb.alert.muted', {
                        time: formatDate(mutedUntil, { style: 'day-month-time', language }),
                      })
                }
              />
              <Button
                type="button"
                variant="secondary"
                /* §11.2 — disabled in place while there is nothing to un-mute,
                   never hidden. */
                disabled={mutedUntil === null}
                onClick={() => setMutedUntil(null)}
              >
                {t('rb.alert.form.muted.clear')}
              </Button>
            </div>
          </div>

          {/* **AC-891 is blocked on D4, and the form says so** rather than
              omitting the field. §13.3's rule is that an operator who cannot
              see the rule's measure is not a legal recipient, and *can user X
              see measure M* has no answer today: every measure permission that
              is set is one of the thirteen broad keys. A picker offering
              everyone would ship the leak the rule exists to close; one
              offering nobody would look broken. Whatever the rule already has
              is preserved on save. */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rb-alert-recipients">{t('rb.alert.form.recipients')}</Label>
            <Input
              id="rb-alert-recipients"
              disabled
              readOnly
              value={t('rb.alert.form.recipients.count', {
                count: rule?.recipientIds.length ?? 0,
              })}
            />
            <p className="text-xs text-muted-foreground">{t('rb.alert.form.recipients.blocked')}</p>
          </div>

          {reasons.length > 0 && (
            <ul role="alert" className="flex list-none flex-col gap-0.5">
              {reasons.map((reason) => (
                <li key={reason} className="text-xs text-muted-foreground">
                  {t(`rb.save.invalid.${reason}`, { max: REPORT_NAME_MAX })}
                </li>
              ))}
            </ul>
          )}
          {failed && (
            <p role="alert" className="text-xs text-muted-foreground">
              {t('rb.alert.form.failed')}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t('rb.alert.form.cancel')}
          </Button>
          {/* §3.2 — off until every field the rule needs is present, and
              carrying no error text while it is. `cadence` is deliberately NOT
              among them; see the file header. */}
          <Button
            type="button"
            variant="default"
            disabled={saving || name.trim() === '' || reportId === null || seriesId === '' || threshold === null}
            onClick={() => void submit()}
          >
            {t('rb.alert.form.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
