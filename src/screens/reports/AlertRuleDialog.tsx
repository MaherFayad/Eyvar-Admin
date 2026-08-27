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
import { formatMetricValue } from '@/components/metrics'
import { parseMoneyInput, parseNumericInput, type Translator } from '@/lib'

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
  const [reasons, setReasons] = useState<readonly SaveInvalidReason[]>([])
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  const reports = useAsync(async (signal) => (await listReports({ pageSize: 100 }, signal)).items, {
    deps: [],
    isEmpty: () => false,
    enabled: open,
  })

  /* Choosing a report RESOLVES it, because which series exist is a property of
     the result and not of the query. One request, caused by one choice. */
  const resolved = useAsync<readonly ReportSeries[]>(
    async (signal) => {
      const report = (reports.data ?? []).find((r) => r.id === reportId)
      if (!report) return []
      const outcome = await runReport(report.query, { today, signal })
      return outcome.status === 'ok'
        ? outcome.result.series.filter((s) => s.role === 'current' && !s.blocked)
        : []
    },
    { deps: [reportId, reports.data?.length], isEmpty: () => false, enabled: reportId !== null },
  )

  const series = (resolved.data ?? []).find((s) => s.id === seriesId) ?? null

  useEffect(() => {
    if (!open) return
    setName(rule?.name ?? '')
    setReportId(rule?.reportId ?? null)
    setSeriesId(rule?.seriesId ?? '')
    setComparator(rule?.comparator ?? 'gt')
    setGrain(rule?.evaluationGrain ?? 'day')
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
        recipientIds: rule?.recipientIds ?? [],
        enabled: rule?.enabled ?? true,
        mutedUntil: rule?.mutedUntil ?? null,
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

  const noSavedReports = reports.status === 'content' && (reports.data ?? []).length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
                {(reports.data ?? []).map((report: SavedReport) => (
                  <SelectItem key={report.id} value={report.id}>
                    <bdi>{report.name}</bdi>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* AC-874 — disabled in place, with the reason. */}
            {noSavedReports && (
              <p className="text-xs text-muted-foreground">{t('rb.alert.form.report.unsaved')}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rb-alert-series">{t('rb.alert.form.series')}</Label>
            <Select value={seriesId} disabled={reportId === null} onValueChange={setSeriesId}>
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
