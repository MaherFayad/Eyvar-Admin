/**
 * The alert rule composer. An inline panel, not a `Dialog` (owner's
 * no-dialog ruling): it replaces the trigger's surrounding content in
 * place. The preview runs the same `evaluate()` the server runs (AC-1226).
 * D43's recipient filter runs on `effectivePermissions`.
 */

import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertRuleIcon, CheckIcon, CloseIcon, MutedIcon } from '@/components/icons'
import { useNowIso } from '@/screens/queues'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ErrorState } from '@/components/ErrorState'
import { InfoHint, hintLines } from '@/components/InfoHint'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import type { AlertPreviewReference } from '@/components/reports/AlertPreviewChart'
import { useAsync } from '@/hooks'
import {
  listMeasures,
  listReports,
  listTeamUsers,
  listWebhookEndpoints,
  muteAlertRule,
  runReport,
  saveAlertRule,
} from '@/data/clients'
import { evaluate, type ResolvedSeries } from '@/data/reporting/alerts/evaluate'
import { effectivePermissions, REPORT_NAME_MAX } from '@/data/types'
import type {
  AlertCadence,
  AlertRule,
  Measure,
  MeasureGrain,
  ReportResult,
  SaveInvalidReason,
  SavedReport,
  TeamUser,
} from '@/data/types'
/* `types/index.ts` (shared barrel, not this role's file) does not yet
   re-export the v2 alert types/helpers `report.ts` already re-exports from
   `alert.ts` — reached directly rather than editing a file another role owns. */
import {
  alertChannels,
  alertCondition,
  alertSeverity,
  type AlertChannel,
  type AlertCondition,
  type AlertSeverity,
} from '@/data/types/alert'
import type { WebhookEndpoint } from '@/data/types/integrations'
/* Deep import, NOT the `@/components/metrics` barrel — see `AlertsView.tsx`'s
   identical note; the barrel drags recharts onto a screen most of whose
   states never draw a chart. */
import { formatMetricValue } from '@/components/metrics/formatMetric'
import { formatDate, parseMoneyInput, parseNumericInput, type Translator } from '@/lib'

/* WP-8.4 §5 — the preview draws only once a condition is composed, so none
   of this file's three static importers (`ReportBuilder`, `ReportLibrary`,
   `BlockMenu`) needs recharts merely because the composer can open. Fallback
   is sized to the chart's own footprint (`AlertPreviewChart`'s `h-32`). */
const LazyAlertPreviewChart = lazy(() =>
  import('@/components/reports/AlertPreviewChart').then((m) => ({ default: m.AlertPreviewChart })),
)

const GRAINS: MeasureGrain[] = ['day', 'week', 'month']
const CONDITION_KINDS: AlertCondition['kind'][] = ['static', 'relative', 'anomaly', 'missing']
const PREVIEW_WINDOW = 60

export interface AlertRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` creates. */
  rule: AlertRule | null
  /** Which report a NEW rule starts on — read only when `rule` is `null` (an
   * edit's `reportId` is on the record and always wins). */
  presetReportId?: string
  /** WP-5.5 (G15) — the series a chart's bell/menu handed the composer, so
   * "create an alert from this chart" preselects it rather than leaving the
   * series picker empty. Read only when `rule` is `null`, same as above. */
  presetSeriesId?: string
  /** AC-1260 — a finding's own `verifyWith.alertCondition`, carried on its
   * `agent-insight` block (`caseStudyToBlocks.ts`). Fills the condition kind
   * and its fields; the operator still reviews and saves it (§5 — an agent
   * proposes, it never arms). Read only when `rule` is `null`. */
  presetCondition?: AlertCondition
  onSaved: (rule: AlertRule) => void
  today: string
  t: Translator
  language: 'en' | 'ar'
}

export function AlertRuleDialog({
  open,
  onOpenChange,
  rule,
  presetReportId,
  presetSeriesId,
  presetCondition,
  onSaved,
  today,
  t,
  language,
}: AlertRuleDialogProps) {
  const [name, setName] = useState(rule?.name ?? '')
  const [reportId, setReportId] = useState<string | null>(rule?.reportId ?? presetReportId ?? null)
  const [seriesId, setSeriesId] = useState<string>(rule?.seriesId ?? presetSeriesId ?? '')

  /* ── condition — one discriminated draft per kind, so switching kinds
     discards rather than carries stale fields into the payload (§4.2). ──── */
  const [kind, setKind] = useState<AlertCondition['kind']>('static')
  const [comparator, setComparator] = useState<'gt' | 'gte' | 'lt' | 'lte'>('gt')
  const [thresholdText, setThresholdText] = useState('')
  const [relDirection, setRelDirection] = useState<'up' | 'down' | 'either'>('down')
  const [relMeasure, setRelMeasure] = useState<'delta' | 'percent'>('percent')
  const [relAmountText, setRelAmountText] = useState('')
  const [relAgainst, setRelAgainst] = useState<
    'previous-bucket' | 'same-bucket-previous-week' | 'previous-period'
  >('previous-bucket')
  const [anomalyDirection, setAnomalyDirection] = useState<'above' | 'below' | 'either'>('either')
  const [confidence, setConfidence] = useState<95 | 99>(95)
  const [lookbackText, setLookbackText] = useState('')
  const [missingCountText, setMissingCountText] = useState('3')

  const [grain, setGrain] = useState<MeasureGrain>(rule?.evaluationGrain ?? 'day')
  const [cadence, setCadence] = useState<AlertCadence | null>(rule?.cadence ?? null)
  const [reArmText, setReArmText] = useState('')
  const [severity, setSeverity] = useState<AlertSeverity>('high')
  const [labels, setLabels] = useState<string[]>([])
  const [labelDraft, setLabelDraft] = useState('')

  const [emailChecked, setEmailChecked] = useState(false)
  const [emailUserIds, setEmailUserIds] = useState<string[]>([])
  const [slackChecked, setSlackChecked] = useState(false)
  const [slackWebhookId, setSlackWebhookId] = useState<string | null>(null)
  const [recipientIds, setRecipientIds] = useState<string[]>([])

  const [enabled, setEnabled] = useState(true)
  const [mutedUntil, setMutedUntil] = useState<string | null>(null)
  const [reasons, setReasons] = useState<readonly SaveInvalidReason[]>([])
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const reports = useAsync((signal) => listReports({ pageSize: 100 }, signal), {
    cacheKey: 'reports.list',
    deps: [open],
    isEmpty: () => false,
    enabled: open,
  })
  const reportItems = reports.data?.items ?? []

  const resolved = useAsync<ReportResult | null>(
    async (signal) => {
      const report = reportItems.find((r) => r.id === reportId)
      if (!report) return null
      const outcome = await runReport(report.query, { today, signal })
      return outcome.status === 'ok' ? outcome.result : null
    },
    {
      deps: [reportId, reportItems.length, today],
      isEmpty: (result) =>
        result === null ||
        result.series.filter((s) => s.role === 'current' && !s.blocked).length === 0,
      enabled: reportId !== null,
    },
  )
  const seriesOptions = (resolved.data?.series ?? []).filter(
    (s) => s.role === 'current' && !s.blocked,
  )
  const series = seriesOptions.find((s) => s.id === seriesId) ?? null

  /* §4 — both entry points open with "report and the first current series
     prefilled". The builder passes the series it had in view; a page block
     knows only its report, so the first legal series is chosen here once the
     report resolves. Scoped to an entry point that named a report: editing a
     rule, or opening the composer cold, still starts on the placeholder. */
  const firstSeriesId = seriesOptions[0]?.id ?? ''
  useEffect(() => {
    if (!open || rule !== null || presetReportId === undefined) return
    if (seriesId !== '' || firstSeriesId === '') return
    setSeriesId(firstSeriesId)
  }, [open, rule, presetReportId, seriesId, firstSeriesId])

  /* The measure catalogue, once — the email/recipient pickers filter against
     `measure.permission` (D43), and a measure is recoverable only from here. */
  const measures = useAsync((signal) => listMeasures({ pageSize: 200 }, signal), {
    cacheKey: 'catalogue.measures',
    deps: [open],
    isEmpty: () => false,
    enabled: open,
  })
  const measure: Measure | null =
    measures.data?.items.find((m) => m.key === series?.measureKey) ?? null

  const teamUsers = useAsync((signal) => listTeamUsers(signal), {
    cacheKey: 'team.users',
    deps: [open],
    isEmpty: (rows) => rows.length === 0,
    enabled: open,
  })
  const eligibleUsers: TeamUser[] = (teamUsers.data ?? []).filter(
    (user) =>
      measure === null ||
      measure.permission === null ||
      effectivePermissions(user.role, user.permissionDelta).includes(measure.permission.key),
  )

  const webhooks = useAsync((signal) => listWebhookEndpoints(signal), {
    cacheKey: 'integrations.webhooks.list',
    deps: [open],
    isEmpty: (rows) => rows.length === 0,
    enabled: open,
  })
  const webhookOptions: WebhookEndpoint[] = webhooks.data ?? []

  useEffect(() => {
    if (!open) return
    setName(rule?.name ?? '')
    setReportId(rule?.reportId ?? presetReportId ?? null)
    setSeriesId(rule?.seriesId ?? presetSeriesId ?? '')

    const c: AlertCondition = rule ? alertCondition(rule) : (presetCondition ?? { kind: 'static', comparator: 'gt', threshold: NaN })
    setKind(c.kind)
    if (c.kind === 'static') {
      setComparator(c.comparator)
      /* A preset's `threshold` is not yet money-converted (its measure's unit
         resolves later, off `series`, per AC-1260) — displayed as written,
         same as every other field a proposal only prefills for review. */
      setThresholdText(
        rule ? (rule.thresholdUnit === 'money' ? String(c.threshold / 100) : String(c.threshold)) : presetCondition ? String(c.threshold) : '',
      )
    } else {
      setComparator('gt')
      setThresholdText('')
    }
    if (c.kind === 'relative') {
      setRelDirection(c.direction)
      setRelMeasure(c.measure)
      setRelAmountText(String(c.amount))
      setRelAgainst(c.against)
    } else {
      setRelDirection('down')
      setRelMeasure('percent')
      setRelAmountText('')
      setRelAgainst('previous-bucket')
    }
    if (c.kind === 'anomaly') {
      setAnomalyDirection(c.direction)
      setConfidence(c.confidence)
      setLookbackText(c.lookback === null ? '' : String(c.lookback))
    } else {
      setAnomalyDirection('either')
      setConfidence(95)
      setLookbackText('')
    }
    setMissingCountText(c.kind === 'missing' ? String(c.bucketsMissing) : '3')

    setGrain(rule?.evaluationGrain ?? 'day')
    setCadence(rule?.cadence ?? null)
    setReArmText(rule?.minReArmMinutes === null || rule?.minReArmMinutes === undefined ? '' : String(rule.minReArmMinutes))
    setSeverity(rule ? alertSeverity(rule) : 'high')
    setLabels(rule?.labels ? [...rule.labels] : [])
    setLabelDraft('')

    const channels = rule ? alertChannels(rule) : [{ type: 'in-app' as const }]
    const email = channels.find((ch): ch is Extract<AlertChannel, { type: 'email' }> => ch.type === 'email')
    const slack = channels.find((ch): ch is Extract<AlertChannel, { type: 'slack' }> => ch.type === 'slack')
    setEmailChecked(email !== undefined)
    setEmailUserIds(email?.userIds ?? [])
    setSlackChecked(slack !== undefined)
    setSlackWebhookId(slack?.webhookId ?? null)
    setRecipientIds(rule?.recipientIds ? [...rule.recipientIds] : [])

    setEnabled(rule?.enabled ?? true)
    setMutedUntil(rule?.mutedUntil ?? null)
    setReasons([])
    setFailed(false)
    setTestResult(null)
  }, [open, rule, presetReportId, presetSeriesId, presetCondition])

  const threshold =
    series?.unit === 'money' ? parseMoneyInput(thresholdText) : parseNumericInput(thresholdText)
  const relAmount =
    relMeasure === 'delta' && series?.unit === 'money'
      ? parseMoneyInput(relAmountText)
      : parseNumericInput(relAmountText)
  const lookback = lookbackText.trim() === '' ? null : parseNumericInput(lookbackText)
  const missingCount = parseNumericInput(missingCountText)
  const reArm = reArmText.trim() === '' ? null : parseNumericInput(reArmText)

  /* One condition, built from only the active kind's fields (§4.2). */
  const condition: AlertCondition | null = useMemo(() => {
    switch (kind) {
      case 'static':
        return threshold === null ? null : { kind: 'static', comparator, threshold }
      case 'relative':
        return relAmount === null
          ? null
          : { kind: 'relative', direction: relDirection, measure: relMeasure, amount: relAmount, against: relAgainst }
      case 'anomaly':
        return { kind: 'anomaly', direction: anomalyDirection, confidence, lookback }
      case 'missing':
        return missingCount === null || missingCount < 1 ? null : { kind: 'missing', bucketsMissing: missingCount }
    }
  }, [kind, comparator, threshold, relDirection, relMeasure, relAmount, relAgainst, anomalyDirection, confidence, lookback, missingCount])

  const relativeAgainstInvalid = relAgainst === 'same-bucket-previous-week' && grain !== 'day'

  /* ── preview (§4.3) — `evaluate()`, the same function the server runs, over
     a sliding window so the preview can never disagree with what fires. ──── */
  /* The product clock, never the wall clock: fixtures are timed against it. */
  const now = useNowIso()
  const preview = useMemo(() => {
    if (!series || !resolved.data || condition === null || relativeAgainstInvalid) return null
    const buckets = resolved.data.buckets
    const points = series.points
    const partial = series.partialBucketIndexes
    const comparisonSeries = resolved.data.series.find(
      (s) => s.role === 'comparison' && s.measureKey === series.measureKey && s.groupValue === series.groupValue,
    )
    const draft: AlertRule = {
      id: 'draft',
      name: '',
      reportId: reportId ?? '',
      seriesId: series.id,
      comparator: condition.kind === 'static' ? condition.comparator : 'gt',
      threshold: condition.kind === 'static' ? condition.threshold : 0,
      thresholdUnit: series.unit,
      thresholdCurrency: series.currency,
      condition,
      evaluationGrain: grain,
      cadence: null,
      minReArmMinutes: null,
      consecutiveFailuresBeforeError: 5,
      state: 'armed',
      enabled: true,
      mutedUntil: null,
      recipientIds: [],
      ownerId: '',
      notificationPriority: 'high',
      lastEvaluatedAt: null,
      lastFiredAt: null,
      lastValue: null,
      stateReasonKey: null,
      createdAt: today,
      updatedAt: today,
    }
    const start = Math.max(0, buckets.length - PREVIEW_WINDOW)
    const fired: boolean[] = []
    let lastBand: { low: number; high: number } | null = null
    for (let i = start; i < buckets.length; i += 1) {
      if (partial.includes(i)) {
        fired.push(false)
        continue
      }
      const windowSeries: ResolvedSeries = {
        buckets: buckets.slice(0, i + 1),
        points: points.slice(0, i + 1),
        partialBucketIndexes: partial.filter((p) => p <= i),
        previousPeriodPoints: comparisonSeries?.points.slice(0, i + 1) ?? null,
      }
      const outcome = evaluate(draft, windowSeries, now)
      fired.push(outcome.outcome === 'would-fire')
      if (outcome.band) lastBand = outcome.band
    }
    const lastOutcome = evaluate(
      draft,
      {
        buckets,
        points,
        partialBucketIndexes: partial,
        previousPeriodPoints: comparisonSeries?.points ?? null,
      },
      now,
    )
    const usableCount = points.filter((v, i) => v !== null && !partial.includes(i)).length
    return {
      buckets: buckets.slice(start),
      points: points.slice(start),
      fired,
      lastOutcome,
      lastBand,
      usableCount,
    }
  }, [series, resolved.data, condition, grain, reportId, relativeAgainstInvalid, today, now])

  const previewReference: AlertPreviewReference | null =
    condition?.kind === 'static' && threshold !== null
      ? { kind: 'line', value: threshold }
      : condition?.kind === 'anomaly' && preview?.lastBand
        ? { kind: 'band', low: preview.lastBand.low, high: preview.lastBand.high }
        : null

  const submit = async () => {
    if (condition === null) return
    setSaving(true)
    setFailed(false)
    try {
      const channels: AlertChannel[] = [
        { type: 'in-app' },
        ...(emailChecked && emailUserIds.length > 0 ? [{ type: 'email' as const, userIds: emailUserIds }] : []),
        ...(slackChecked && slackWebhookId ? [{ type: 'slack' as const, webhookId: slackWebhookId }] : []),
      ]
      const outcome = await saveAlertRule({
        id: rule?.id ?? null,
        name,
        reportId,
        seriesId,
        comparator: condition.kind === 'static' ? condition.comparator : 'gt',
        threshold: condition.kind === 'static' ? condition.threshold : 0,
        evaluationGrain: grain,
        cadence,
        recipientIds,
        enabled,
        mutedUntil,
        condition,
        channels,
        severity,
        labels,
        minReArmMinutes: reArm,
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

  const runTest = () => {
    if (!preview) return
    setTestResult(describePreviewOutcome(preview.lastOutcome, t, language))
  }

  const noSavedReports = reports.status === 'content' && reportItems.length === 0
  const chosenReport = reportItems.find((report) => report.id === reportId) ?? null

  /* A real loading state, not an instruction that happens to be false while
     it loads. Editing a rule (or opening with `presetReportId`) already
     names a report; while `reports` hasn't resolved it yet, or it has and
     `resolved` is still reading that report's series, the operator has not
     failed to choose anything — the data just has not arrived. */
  const composerPending =
    (rule !== null || presetReportId !== undefined) &&
    (chosenReport === null ? reports.status === 'loading' : resolved.status === 'loading')

  const conditionInvalid =
    condition === null ||
    (kind === 'relative' && relativeAgainstInvalid) ||
    (kind === 'missing' && (missingCount === null || missingCount < 1))

  if (!open) return null

  const headingId = 'rb-alert-panel-heading'

  return (
    <Card
      className="border-border"
      /* An inline panel, not a Radix primitive, so `Escape` is wired here.
         `Cancel` is 16 tabs from the name field; a keyboard operator needs the
         same one-key exit a dialog would have given them. A key pressed inside
         a Select or a popover is left alone — that layer closes itself first. */
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || event.defaultPrevented) return
        event.stopPropagation()
        onOpenChange(false)
      }}
    >
      <CardHeader>
        {/* `CardTitle` renders a plain `div` (`card.tsx`, shared, not this
           role's file) — `role="heading"` is added here rather than there, so
           this panel is reachable by heading navigation without changing
           every other card's semantics. */}
        <CardTitle id={headingId} role="heading" aria-level={2} className="flex items-center gap-2">
          <AlertRuleIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          {rule ? t('rb.alert.panel.heading.edit') : t('rb.alert.panel.heading.new')}
        </CardTitle>
        <CardDescription>
          {composerPending ? (
            t(chosenReport === null ? 'rb.alert.form.report.loading' : 'rb.alert.form.series.loading')
          ) : chosenReport ? (
            <bdi>{t('rb.alert.form.preset', { name: chosenReport.name })}</bdi>
          ) : noSavedReports ? (
            t('rb.alert.form.report.unsaved')
          ) : (
            t('rb.alert.form.series.unstarted')
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
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
          {noSavedReports && (
            <p className="text-xs text-muted-foreground">{t('rb.alert.form.report.unsaved')}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rb-alert-series">{t('rb.alert.form.series')}</Label>
          {reportId === null ? (
            <>
              <Select value="" disabled onValueChange={setSeriesId}>
                <SelectTrigger id="rb-alert-series" className="w-full">
                  <SelectValue placeholder={t('rb.alert.form.series')} />
                </SelectTrigger>
                <SelectContent />
              </Select>
              <p className="text-xs text-muted-foreground">{t('rb.alert.form.series.unstarted')}</p>
            </>
          ) : resolved.status === 'loading' ? (
            <LoadingSkeleton pattern="P1" rows={1} label={t('rb.alert.form.series.loading')} />
          ) : resolved.status === 'error' ? (
            <ErrorState
              scope="card"
              card={false}
              message={t('rb.alert.form.series.error')}
              action={{ label: t('rb.library.error.retry'), onClick: resolved.refetch }}
            />
          ) : resolved.status === 'empty' ? (
            <p className="text-xs text-muted-foreground">{t('rb.alert.series.empty')}</p>
          ) : (
            <Select value={seriesId} onValueChange={setSeriesId}>
              <SelectTrigger id="rb-alert-series" className="w-full">
                <SelectValue placeholder={t('rb.alert.form.series')} />
              </SelectTrigger>
              <SelectContent>
                {seriesOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.groupValue === null ? t(`rb.measure.${s.measureKey}`) : <bdi>{s.groupValue}</bdi>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* §4.1 — the condition kind, a segmented control (the MUST case: a
            mode switch that changes every field below it). */}
        <div className="flex flex-col gap-1.5">
          <Label id="rb-alert-condition-label">{t('rb.alert.form.condition')}</Label>
          <Tabs value={kind} onValueChange={(value) => setKind(value as AlertCondition['kind'])}>
            <TabsList variant="segmented" aria-labelledby="rb-alert-condition-label">
              {CONDITION_KINDS.map((k) => (
                <TabsTrigger key={k} value={k}>
                  {t(`rb.alert.kind.${k}.name`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {kind === 'static' && (
            <div className="flex items-center gap-2">
              <Select value={comparator} onValueChange={(value) => setComparator(value as typeof comparator)}>
                <SelectTrigger aria-label={t('rb.alert.form.comparator')} className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['gt', 'gte', 'lt', 'lte'] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`rb.alert.comparator.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                aria-label={t('rb.alert.form.threshold')}
                inputMode="decimal"
                className="w-28 tabular-nums"
                disabled={series === null}
                value={thresholdText}
                onChange={(event) => setThresholdText(event.target.value)}
              />
              {series && (
                <span className="text-xs text-muted-foreground">{t(`rb.unit.${series.unit}`)}</span>
              )}
            </div>
          )}

          {kind === 'relative' && (
            <div className="flex flex-col gap-2">
              <SegmentedField
                label={t('rb.alert.relative.direction')}
                value={relDirection}
                onChange={(v) => setRelDirection(v as typeof relDirection)}
                options={['up', 'down', 'either']}
                labelOf={(v) => t(`rb.alert.relative.direction.${v}`)}
              />
              <SegmentedField
                label={t('rb.alert.relative.measure')}
                value={relMeasure}
                onChange={(v) => setRelMeasure(v as typeof relMeasure)}
                options={['delta', 'percent']}
                labelOf={(v) => t(`rb.alert.relative.measure.${v}`)}
              />
              <div className="flex items-center gap-2">
                <Label htmlFor="rb-alert-rel-amount" className="shrink-0">
                  {t('rb.alert.relative.amount')}
                </Label>
                <Input
                  id="rb-alert-rel-amount"
                  inputMode="decimal"
                  className="w-24 tabular-nums"
                  value={relAmountText}
                  onChange={(event) => setRelAmountText(event.target.value)}
                />
                <span className="text-xs text-muted-foreground">
                  {relMeasure === 'percent' ? t('rb.unit.percent') : series ? t(`rb.unit.${series.unit}`) : ''}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="rb-alert-rel-against">{t('rb.alert.relative.against')}</Label>
                <Select value={relAgainst} onValueChange={(value) => setRelAgainst(value as typeof relAgainst)}>
                  <SelectTrigger id="rb-alert-rel-against" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="previous-bucket">{t('rb.alert.relative.against.previousBucket')}</SelectItem>
                    <SelectItem value="same-bucket-previous-week" disabled={grain !== 'day'}>
                      {t('rb.alert.relative.against.sameWeekday')}
                    </SelectItem>
                    <SelectItem value="previous-period">{t('rb.alert.relative.against.previousPeriod')}</SelectItem>
                  </SelectContent>
                </Select>
                {relativeAgainstInvalid && (
                  <p className="text-xs text-muted-foreground">{t('rb.alert.against.weekOnlyAtDay')}</p>
                )}
              </div>
            </div>
          )}

          {kind === 'anomaly' && (
            <div className="flex flex-col gap-2">
              <SegmentedField
                label={t('rb.alert.anomaly.direction')}
                value={anomalyDirection}
                onChange={(v) => setAnomalyDirection(v as typeof anomalyDirection)}
                options={['above', 'below', 'either']}
                labelOf={(v) => t(`rb.alert.anomaly.direction.${v}`)}
              />
              <SegmentedField
                label={t('rb.alert.anomaly.confidence')}
                value={String(confidence)}
                onChange={(v) => setConfidence(Number(v) as 95 | 99)}
                options={['95', '99']}
                labelOf={(v) => t(`rb.alert.anomaly.confidence.${v}`)}
              />
              <div className="flex flex-col gap-1">
                <Label htmlFor="rb-alert-lookback">{t('rb.alert.anomaly.lookback')}</Label>
                <Input
                  id="rb-alert-lookback"
                  inputMode="numeric"
                  className="w-56 tabular-nums"
                  placeholder={t('rb.alert.anomaly.lookback.placeholder', {
                    count: grain === 'day' ? 28 : grain === 'week' ? 12 : 6,
                  })}
                  value={lookbackText}
                  onChange={(event) => setLookbackText(event.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">{t('rb.alert.anomaly.method')}</p>
            </div>
          )}

          {kind === 'missing' && (
            <div className="flex items-center gap-2">
              <Label htmlFor="rb-alert-missing" className="shrink-0">
                {t('rb.alert.missing.count')}
              </Label>
              <Input
                id="rb-alert-missing"
                inputMode="numeric"
                min={1}
                className="w-16 tabular-nums"
                value={missingCountText}
                onChange={(event) => setMissingCountText(event.target.value)}
              />
              <span className="text-xs text-muted-foreground">{t('rb.alert.missing.count.suffix')}</span>
            </div>
          )}
        </div>

        {/* §4.3 — the preview. */}
        <div className="flex flex-col gap-1.5">
          <Label>{t('rb.alert.preview.heading')}</Label>
          {series === null || condition === null || relativeAgainstInvalid ? (
            <p className="text-xs text-muted-foreground">{t('rb.alert.preview.incomplete')}</p>
          ) : kind === 'anomaly' &&
            (preview?.lastOutcome.outcome === 'no-baseline' || preview?.lastOutcome.outcome === 'no-complete-bucket') ? (
            <p className="text-xs text-muted-foreground">
              {t('rb.alert.anomaly.noBaseline', { count: preview?.usableCount ?? 0 })}
            </p>
          ) : preview ? (
            <Suspense fallback={<div className="h-32 w-full" aria-hidden="true" />}>
              <LazyAlertPreviewChart
                buckets={preview.buckets}
                points={preview.points}
                fired={preview.fired}
                reference={previewReference}
                unit={series.unit}
                language={language}
                description={t('rb.alert.preview.summary', {
                  count: preview.fired.filter(Boolean).length,
                  window: preview.fired.length,
                })}
              />
            </Suspense>
          ) : (
            <p className="text-xs text-muted-foreground">{t('rb.alert.preview.incomplete')}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rb-alert-grain">{t('rb.alert.form.evaluationGrain')}</Label>
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

        <div className="flex flex-col gap-1.5">
          <Label id="rb-alert-cadence-label">{t('rb.alert.form.cadence')}</Label>
          <Tabs
            value={cadence ?? 'none'}
            onValueChange={(value) => setCadence(value === 'none' ? null : (value as AlertCadence))}
          >
            <TabsList variant="segmented" aria-labelledby="rb-alert-cadence-label">
              <TabsTrigger value="hourly">{t('rb.alert.cadence.hourly')}</TabsTrigger>
              <TabsTrigger value="daily">{t('rb.alert.cadence.daily')}</TabsTrigger>
              <TabsTrigger value="none">{t('rb.alert.cadence.none')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rb-alert-rearm">{t('rb.alert.form.reArm')}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="rb-alert-rearm"
              inputMode="numeric"
              className="w-20 tabular-nums"
              value={reArmText}
              onChange={(event) => setReArmText(event.target.value)}
            />
            <span className="text-xs text-muted-foreground">{t('rb.alert.form.reArm.unit')}</span>
          </div>
        </div>

        {/* §4.4 — channels. */}
        <div className="flex flex-col gap-2">
          <Label>{t('rb.alert.channel.inApp')}</Label>
          <div className="flex items-center gap-2">
            <Checkbox checked disabled aria-label={t('rb.alert.channel.inApp')} />
            <span className="text-sm text-foreground">{t('rb.alert.channel.inApp')}</span>
            <span className="text-xs text-muted-foreground">{t('rb.alert.channel.inApp.always')}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Checkbox
                id="rb-alert-email"
                checked={emailChecked}
                disabled={eligibleUsers.length === 0}
                onCheckedChange={(value) => setEmailChecked(value === true)}
              />
              <Label htmlFor="rb-alert-email">{t('rb.alert.channel.email')}</Label>
            </div>
            {eligibleUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('rb.alert.channel.email.empty')}</p>
            ) : (
              emailChecked && (
                <RecipientPicker
                  selected={emailUserIds}
                  onChange={setEmailUserIds}
                  options={eligibleUsers}
                  t={t}
                />
              )
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Checkbox
                id="rb-alert-slack"
                checked={slackChecked}
                disabled={webhookOptions.length === 0}
                onCheckedChange={(value) => setSlackChecked(value === true)}
              />
              <Label htmlFor="rb-alert-slack">{t('rb.alert.channel.slack')}</Label>
            </div>
            {webhookOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t('rb.alert.channel.slack.empty')}{' '}
                <a className="text-info-foreground underline" href="/admin/workspace?pane=integrations">
                  {t('rb.alert.channel.slack.addLink')}
                </a>
              </p>
            ) : (
              slackChecked && (
                <Select value={slackWebhookId ?? ''} onValueChange={setSlackWebhookId}>
                  <SelectTrigger aria-label={t('rb.alert.channel.slack')} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {webhookOptions.map((hook) => (
                      <SelectItem key={hook.id} value={hook.id}>
                        {hook.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t('rb.alert.form.recipients')}</Label>
          {eligibleUsers.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('rb.alert.form.recipients.empty')}</p>
          ) : (
            <RecipientPicker selected={recipientIds} onChange={setRecipientIds} options={eligibleUsers} t={t} />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1">
            <Label id="rb-alert-severity-label">{t('rb.alert.form.severity')}</Label>
            <InfoHint t={t}>{hintLines([t('rb.alert.severity.critical.blocked')])}</InfoHint>
          </span>
          <Tabs value={severity} onValueChange={(value) => setSeverity(value as AlertSeverity)}>
            <TabsList variant="segmented" aria-labelledby="rb-alert-severity-label">
              <TabsTrigger value="high">{t('rb.alert.severity.high')}</TabsTrigger>
              <TabsTrigger value="critical" disabled>
                {t('rb.alert.severity.critical')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rb-alert-label-draft">{t('rb.alert.form.labels')}</Label>
          <div className="flex flex-wrap items-center gap-1.5">
            {labels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-control border border-border bg-muted px-1.5 py-0.5 text-xs"
              >
                <bdi>{label}</bdi>
                <button
                  type="button"
                  aria-label={t('rb.alert.form.labels.remove', { name: label })}
                  className="rounded-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setLabels((current) => current.filter((l) => l !== label))}
                >
                  <CloseIcon aria-hidden="true" className="size-3" />
                </button>
              </span>
            ))}
            <Input
              id="rb-alert-label-draft"
              className="h-control w-32"
              placeholder={t('rb.alert.form.labels.placeholder')}
              value={labelDraft}
              onChange={(event) => setLabelDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                const value = labelDraft.trim()
                if (value !== '' && !labels.includes(value)) setLabels((current) => [...current, value])
                setLabelDraft('')
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="rb-alert-enabled">{t('rb.alert.form.enabled')}</Label>
          <Switch id="rb-alert-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {/* §4.5 — mute, also reachable from the composer for an existing rule. */}
        {rule && (
          <MuteMenu
            rule={{ ...rule, mutedUntil }}
            t={t}
            language={language}
            onChanged={(muted) => setMutedUntil(muted)}
          />
        )}

        {testResult && (
          <p role="status" className="text-sm text-muted-foreground">
            {testResult}
          </p>
        )}
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
      </CardContent>

      <div className="flex items-center justify-end gap-2 border-t border-border p-3">
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          {t('rb.alert.form.cancel')}
        </Button>
        <Button type="button" variant="secondary" disabled={preview === null} onClick={runTest}>
          {t('rb.alert.action.test')}
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={saving || name.trim() === '' || reportId === null || seriesId === '' || conditionInvalid}
          onClick={() => void submit()}
        >
          {t('rb.alert.action.save')}
        </Button>
      </div>
    </Card>
  )
}

/** A small two/three-way segmented control, the shape §4 MUST licenses for a
 * mode switch — reused across the four condition kinds' own sub-toggles. */
function SegmentedField({
  label,
  value,
  onChange,
  options,
  labelOf,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  labelOf: (value: string) => string
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="shrink-0">{label}</Label>
      <Tabs value={value} onValueChange={onChange}>
        <TabsList variant="segmented" aria-label={label}>
          {options.map((option) => (
            <TabsTrigger key={option} value={option}>
              {labelOf(option)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}

/** The email/in-app recipient multi-select (§4.4) — a `Command`-backed
 * popover, chips shaped like every other removable chip in this product. */
function RecipientPicker({
  selected,
  onChange,
  options,
  t,
}: {
  selected: readonly string[]
  onChange: (ids: string[]) => void
  options: readonly TeamUser[]
  t: Translator
}) {
  const [open, setOpen] = useState(false)
  const chosen = options.filter((user) => selected.includes(user.id))

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chosen.map((user) => (
        <span
          key={user.id}
          className="inline-flex items-center gap-1 rounded-control border border-border bg-muted px-1.5 py-0.5 text-xs"
        >
          <bdi>{user.name}</bdi>
          <button
            type="button"
            aria-label={t('rb.alert.channel.email.remove', { name: user.name })}
            className="rounded-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onChange(selected.filter((id) => id !== user.id))}
          >
            <CloseIcon aria-hidden="true" className="size-3" />
          </button>
        </span>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="secondary" size="xs">
            {t('rb.alert.channel.email.add')}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <Command>
            <CommandInput placeholder={t('rb.alert.channel.email.search')} />
            <CommandList>
              <CommandEmpty>{t('rb.alert.channel.email.noMatch')}</CommandEmpty>
              <CommandGroup>
                {options.map((user) => {
                  const isSelected = selected.includes(user.id)
                  return (
                    <CommandItem
                      key={user.id}
                      value={user.name}
                      onSelect={() =>
                        onChange(isSelected ? selected.filter((id) => id !== user.id) : [...selected, user.id])
                      }
                    >
                      <CheckIcon
                        aria-hidden="true"
                        className={isSelected ? 'size-3.5 opacity-100' : 'size-3.5 opacity-0'}
                      />
                      <bdi>{user.name}</bdi>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/** §4.5 — shared by the Rules table's row and the composer's own edit view.
 * Writes `mutedUntil` directly through `muteAlertRule`, independent of `Save`. */
export function MuteMenu({
  rule,
  t,
  language,
  onChanged,
}: {
  rule: AlertRule
  t: Translator
  language: 'en' | 'ar'
  onChanged: (mutedUntil: string | null) => void
}) {
  const [customOpen, setCustomOpen] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [busy, setBusy] = useState(false)

  const mute = async (until: string) => {
    setBusy(true)
    try {
      const outcome = await muteAlertRule(rule.id, until)
      onChanged(outcome.data.mutedUntil)
    } catch {
      toast.error(t('rb.alert.mute.failed'))
    } finally {
      setBusy(false)
    }
  }

  const muted = rule.mutedUntil !== null

  return (
    <div className="flex flex-col gap-1.5">
      {muted && (
        <p className="text-xs text-muted-foreground">
          {t('rb.alert.mute.rowState', {
            time: formatDate(rule.mutedUntil as string, { style: 'day-month-time', language }),
          })}
        </p>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            disabled={busy}
            aria-label={t('rb.alert.mute.action', { name: rule.name })}
          >
            <MutedIcon aria-hidden="true" className="size-3.5" />
            {muted ? t('rb.alert.mute.unmute') : t('rb.alert.mute.menu')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {muted && (
            <>
              <DropdownMenuItem onSelect={() => void mute('')}>{t('rb.alert.mute.unmute')}</DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onSelect={() => void mute(muteUntilIso('1h'))}>{t('rb.alert.mute.1h')}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void mute(muteUntilIso('8h'))}>{t('rb.alert.mute.8h')}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void mute(muteUntilIso('24h'))}>{t('rb.alert.mute.24h')}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void mute(muteUntilIso('monday'))}>
            {t('rb.alert.mute.untilMonday')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setCustomOpen(true)}>{t('rb.alert.mute.custom')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {customOpen && (
        <div className="flex items-center gap-2">
          <Input
            type="datetime-local"
            aria-label={t('rb.alert.mute.custom')}
            className="w-48"
            value={customValue}
            onChange={(event) => setCustomValue(event.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            size="xs"
            disabled={customValue === ''}
            onClick={() => {
              void mute(new Date(customValue).toISOString())
              setCustomOpen(false)
            }}
          >
            {t('rb.alert.mute.custom.apply')}
          </Button>
          <Button type="button" variant="ghost" size="xs" onClick={() => setCustomOpen(false)}>
            {t('rb.alert.mute.custom.cancel')}
          </Button>
        </div>
      )}
    </div>
  )
}

/** §4.5's five durations, computed against the real clock — this is a live
 * operator action, not a seeded fixture, so it does not read `EYVAR_NOW`. */
function muteUntilIso(option: '1h' | '8h' | '24h' | 'monday'): string {
  const now = new Date()
  if (option === 'monday') {
    const day = now.getUTCDay()
    const daysAhead = ((8 - day) % 7) || 7
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysAhead))
    return target.toISOString()
  }
  const hours = option === '1h' ? 1 : option === '8h' ? 8 : 24
  return new Date(now.getTime() + hours * 3_600_000).toISOString()
}

function describePreviewOutcome(
  outcome: import('@/data/reporting/alerts/evaluate').AlertConditionEvaluation,
  t: Translator,
  language: 'en' | 'ar',
): string {
  switch (outcome.outcome) {
    case 'would-fire':
      return t('rb.alert.test.wouldFire', {
        value: formatMetricValue(outcome.value, 'count', language),
        bucket: outcome.bucketStart ? formatDate(outcome.bucketStart, { style: 'day-month', language }) : '',
        grain: t('rb.grainNoun.day'),
      })
    case 'would-not-fire':
      return t('rb.alert.test.wouldNotFire', {
        value: formatMetricValue(outcome.value, 'count', language),
        bucket: outcome.bucketStart ? formatDate(outcome.bucketStart, { style: 'day-month', language }) : '',
        grain: t('rb.grainNoun.day'),
      })
    case 'no-complete-bucket':
      return t('rb.alert.test.noBucket')
    case 'no-baseline':
      return t('rb.alert.anomaly.noBaseline', { count: 0 })
    case 'invalid-condition':
      return t('rb.alert.against.weekOnlyAtDay')
  }
}
