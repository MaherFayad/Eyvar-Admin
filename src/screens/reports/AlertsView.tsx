/**
 * The alert rules list and the firings feed (`?view=alerts`) — v2
 * (`22-analytics-v2.md` §4, `04-alerting-v2.md` §4). A `ViewTabs` strip (not a
 * route) switches **Rules** and **Firings**; the composer opens in place of
 * the list, never as a dialog. One badge per row; a breach is never red
 * (R5a). Rules applied: R10 (one standing-condition banner), X15 (a hint,
 * not a hover-only fact), §7.3 (a mute control is a column, not hover-only).
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Banner } from '@/components/Banner'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { DataTable, type RowAction } from '@/components/DataTable'
import { InfoHint, hintLines } from '@/components/InfoHint'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { ViewTabs } from '@/components/ViewTabs'
import {
  ArmedIcon,
  BreachedIcon,
  CoolingIcon,
  DisabledIcon,
  EmailIcon,
  FiringIcon,
  MutedIcon,
  NotWorkingIcon,
  SuspendedIcon,
} from '@/components/icons'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Area, AreaChart, ReferenceArea, ReferenceLine, YAxis } from 'recharts'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import type { DataColumn } from '@/components/table/columns'
/* Deep import, NOT the `@/components/metrics` barrel. The barrel also exports
   `TrendChart`, which pulls recharts -- a 337 kB chunk (104 kB gzip) that then
   loads on `/management/reports` where no chart renders in most states. */
import { formatMetricValue } from '@/components/metrics/formatMetric'
import { useAsync, useIndexTable } from '@/hooks'
import {
  deleteAlertRule,
  evaluateAlertRule,
  getReport,
  listAlertRules,
  runReport,
} from '@/data/clients'
import type { AlertEvaluation, AlertRule } from '@/data/types'
import { alertCondition, type AlertCondition } from '@/data/types/alert'
import { formatDate, formatDuration, isolatedRunProps, type Language, type Translator } from '@/lib'
import { AlertFeedView } from './AlertFeedView'
import { AlertHistoryDialog } from './AlertHistoryDialog'
import { AlertRuleDialog, MuteMenu } from './AlertRuleDialog'
import { reportsViewTabs, type ReportsView } from './views'

export interface AlertsViewProps {
  title: string
  activeView?: ReportsView
  onSelectView?: (view: ReportsView) => void
  /** The day a `Test this rule` and the form's series resolution run against. */
  today: string
  t: Translator
  language: Language
  dir: 'ltr' | 'rtl'
}

const STATE_TONE: Record<AlertRule['state'], 'success' | 'warning' | 'info' | 'neutral'> = {
  armed: 'success',
  firing: 'warning',
  cooling: 'info',
  suspended: 'neutral',
  error: 'neutral',
}

const STATE_GLYPH: Record<AlertRule['state'], typeof ArmedIcon> = {
  armed: ArmedIcon,
  firing: FiringIcon,
  cooling: CoolingIcon,
  suspended: SuspendedIcon,
  error: NotWorkingIcon,
}

const ALERT_STATES = Object.keys(STATE_TONE) as ReadonlyArray<AlertRule['state']>

/** `AlertCondition.relative.against` to its inline sentence key segment. */
const AGAINST_KEY: Record<Extract<AlertCondition, { kind: 'relative' }>['against'], string> = {
  'previous-bucket': 'previousBucket',
  'same-bucket-previous-week': 'sameWeekday',
  'previous-period': 'previousPeriod',
}

/** How late an evaluation may run before the row states it (§4.6). */
function cadenceHours(cadence: NonNullable<AlertRule['cadence']>): number {
  return cadence === 'hourly' ? 1 : 24
}

export function AlertsView({
  title,
  activeView = 'alerts',
  onSelectView,
  today,
  t,
  language,
  dir,
}: AlertsViewProps) {
  const [alertsTab, setAlertsTab] = useState<'rules' | 'firings'>('rules')
  const [editing, setEditing] = useState<AlertRule | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const table = useIndexTable<AlertRule>({
    mode: 'index',
    getRowId: (row) => row.id,
  })
  const rules = useAsync((signal) => listAlertRules(table.params, signal), {
    deps: [JSON.stringify(table.params)],
    cacheKey: 'alerts.list',
  })

  const rows = rules.data?.items ?? []
  const rulesById = new Map(rows.map((rule) => [rule.id, rule]))

  /* §4.6 list-level banner: every rule IN VIEW has no cadence, so nothing on
     this page ever runs. The claim is about the view, not about any one row —
     one rule with a cadence retires the banner even if others are unset. */
  const bannerShown = rows.length > 0 && rows.every((rule) => rule.cadence === null)

  const [tested, setTested] = useState<Record<string, AlertEvaluation | 'failed'>>({})
  const runTest = async (rule: AlertRule) => {
    try {
      const evaluation = await evaluateAlertRule(rule.id)
      setTested((current) => ({ ...current, [rule.id]: evaluation }))
    } catch {
      setTested((current) => ({ ...current, [rule.id]: 'failed' }))
    }
  }

  const [historyOf, setHistoryOf] = useState<AlertRule | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [deleting, setDeleting] = useState(false)

  const askDelete = (rule: AlertRule) => {
    setConfirm({
      title: t('rb.alert.delete.confirm.title', { name: rule.name }),
      body: t('rb.alert.delete.confirm.body'),
      confirmLabel: t('rb.alert.delete.confirm.action'),
      destructive: true,
      onConfirm: () => void runDelete(rule),
    })
  }

  const runDelete = async (rule: AlertRule) => {
    setDeleting(true)
    try {
      await deleteAlertRule(rule.id)
      setConfirm(null)
      toast.success(t('rb.alert.toast.deleted', { name: rule.name }))
      rules.refetch()
    } catch {
      toast.error(t('rb.alert.delete.failed'))
    } finally {
      setDeleting(false)
    }
  }

  /* The rules table's sparkline (AC-1233) and the anomaly no-baseline row
     state (§7 state 23) both need each visible rule's own resolved series —
     no endpoint returns a rolling reading list for a rule at rest, so this
     runs each row's report once, the same path `evaluateAlertRule` already
     takes server-side. Bounded to the current page; a failed row is simply
     omitted rather than failing the whole row. */
  const ruleIdsKey = rows.map((rule) => rule.id).join(',')
  const rowSeries = useAsync<Record<string, RowSeriesInfo>>(
    async (signal) => {
      const entries = await Promise.all(
        rows.map(async (rule): Promise<[string, RowSeriesInfo] | null> => {
          try {
            const report = await getReport(rule.reportId, signal)
            const outcome = await runReport(report.data.query, { today, signal })
            if (outcome.status !== 'ok') return null
            const series = outcome.result.series.find((s) => s.id === rule.seriesId)
            if (!series || series.blocked) return null
            const info: RowSeriesInfo = {
              buckets: outcome.result.buckets,
              points: series.points,
              partialBucketIndexes: series.partialBucketIndexes,
            }
            return [rule.id, info]
          } catch {
            return null
          }
        }),
      )
      return Object.fromEntries(entries.filter((e): e is [string, RowSeriesInfo] => e !== null))
    },
    { deps: [ruleIdsKey, today], isEmpty: () => false, enabled: rows.length > 0 && alertsTab === 'rules' },
  )

  const columns: Array<DataColumn<AlertRule>> = [
    {
      id: 'name',
      emphasis: 'primary',
      csv: (row) => row.name,
      header: t('rb.alerts.col.name'),
      alwaysVisible: true,
      minWidth: 220,
      sortField: 'name',
      dataType: 'text',
      cell: (row) => (
        <span
          {...isolatedRunProps({ className: 'block min-w-0 truncate' }).box}
          title={conditionSummary(row, t, language)}
        >
          <bdi {...isolatedRunProps().run}>{row.name}</bdi>
        </span>
      ),
    },
    {
      id: 'condition',
      emphasis: 'data',
      header: t('rb.alerts.col.condition'),
      minWidth: 180,
      dataType: 'text',
      /* §7 state 23 — an anomaly rule short of the 8-point floor states the
         count on the row, not only inside a transient `Test now` result. */
      cell: (row) => {
        const condition = alertCondition(row)
        const info = rowSeries.data?.[row.id]
        if (condition.kind === 'anomaly' && info) {
          const usable = info.points.filter(
            (v, i) => v !== null && !info.partialBucketIndexes.includes(i),
          ).length
          if (usable < 8) {
            return <bdi>{t('rb.alert.anomaly.noBaseline', { count: usable })}</bdi>
          }
        }
        return <bdi>{conditionSummary(row, t, language)}</bdi>
      },
    },
    {
      id: 'state',
      emphasis: 'data',
      header: t('rb.alerts.col.state'),
      width: 160,
      dataType: 'enum',
      filter: {
        kind: 'select',
        field: 'state',
        label: t('rb.alerts.filter.state'),
        options: ALERT_STATES.map((state) => ({
          value: state,
          label: t(`rb.alert.state.${state}`),
        })),
      },
      cell: (row) => {
        const Glyph = STATE_GLYPH[row.state]
        return (
          <span className="flex items-center gap-1.5">
            <Glyph
              aria-hidden="true"
              data-state-glyph={row.state}
              className="size-4 shrink-0 text-muted-foreground"
            />
            <StatusBadge tone={STATE_TONE[row.state]}>
              {t(`rb.alert.state.${row.state}`)}
            </StatusBadge>
            {!row.enabled && (
              <GlyphNote glyph={DisabledIcon} kind="disabled" label={t('rb.alert.disabled')} />
            )}
            {row.mutedUntil && (
              <GlyphNote
                glyph={MutedIcon}
                kind="muted"
                label={t('rb.alert.muted', {
                  time: formatDate(row.mutedUntil, { style: 'day-month-time', language }),
                })}
              />
            )}
            {row.stateReasonKey !== null && (
              <InfoHint t={t}>{hintLines([t(row.stateReasonKey)])}</InfoHint>
            )}
          </span>
        )
      },
    },
    {
      id: 'cadence',
      header: t('rb.alerts.col.cadence'),
      width: 120,
      dataType: 'enum',
      cell: (row) => (
        <span className={row.cadence === null ? 'text-muted-foreground' : undefined}>
          {row.cadence === null ? t('rb.alert.cadence.none') : t(`rb.alert.cadence.${row.cadence}`)}
        </span>
      ),
    },
    {
      id: 'lastValue',
      header: t('rb.alerts.col.lastValue'),
      width: 150,
      align: 'end',
      dataType: 'number',
      /* AC-1233 — the sparkline draws the threshold or the band, never red;
         a rule with no resolved series yet draws no shape (state pending, not
         an error — the row's own `lastEvaluatedAt`/`lastValue` still read). */
      /* O9 — a rule nothing has read has no last reading, and the cell is
         BLANK, not a dash and not a sparkline for a line nobody drew. */
      cell: (row) => {
        if (row.lastValue === null) return null
        const info = rowSeries.data?.[row.id]
        const condition = alertCondition(row)
        const reference: RuleSparklineReference | null =
          condition.kind === 'static'
            ? { kind: 'line', value: condition.threshold }
            : condition.kind === 'anomaly' && row.lastBand
              ? { kind: 'band', low: row.lastBand.low, high: row.lastBand.high }
              : null
        return (
          <span className="flex min-w-0 items-center justify-end gap-1.5 overflow-hidden">
            <span className="shrink-0 tabular-nums">
              {formatMetricValue(row.lastValue, row.thresholdUnit, language)}
            </span>
            {info && info.points.length > 1 && (
              <RuleSparkline points={info.points} reference={reference} />
            )}
          </span>
        )
      },
    },
    {
      id: 'lastEvaluated',
      emphasis: 'data',
      header: t('rb.alerts.col.lastEvaluated'),
      width: 190,
      dataType: 'date',
      /* §4.6 — the lag state. `cadence === null` reads plainly as "Not
         scheduled", never with the warning icon: that would conflate "never
         runs" with "is late" (states table's explicit warning). */
      cell: (row) => {
        if (row.cadence === null) {
          return <span className="text-muted-foreground">{t('rb.alert.state.notScheduled')}</span>
        }
        if (row.lastEvaluatedAt === null) {
          return <span className="text-muted-foreground">{t('rb.alert.lastEvaluated.never')}</span>
        }
        const lagMs = Date.now() - Date.parse(row.lastEvaluatedAt)
        const breached = lagMs > 2 * cadenceHours(row.cadence) * 3_600_000
        const sentence = t('rb.alert.state.lag', {
          duration: formatDuration(lagMs),
          cadence: t(`rb.alert.cadence.${row.cadence}`).toLowerCase(),
        })
        if (!breached) {
          return <bdi className="text-muted-foreground">{sentence}</bdi>
        }
        return (
          <span className="flex items-center gap-1 text-warning-foreground">
            <BreachedIcon aria-hidden="true" className="size-3.5 shrink-0 text-warning-graphic" />
            <bdi>{sentence}</bdi>
          </span>
        )
      },
    },
    {
      id: 'channels',
      header: t('rb.alerts.col.channels'),
      width: 110,
      dataType: 'text',
      cell: (row) => <ChannelGlyphs rule={row} t={t} />,
    },
    {
      id: 'labels',
      header: t('rb.alerts.col.labels'),
      width: 140,
      /* Nine columns wrap every header at 1280px (measured, `alerts-v2.mjs`);
         sparse data (one seeded rule carries any) makes this the one to move
         behind `Columns` rather than mint a narrower label myself — a
         density call flagged to product-designer, not made here. */
      defaultHidden: true,
      dataType: 'text',
      cell: (row) =>
        (row.labels ?? []).length === 0 ? null : (
          <span className="flex flex-wrap gap-1">
            {(row.labels ?? []).map((label) => (
              <span
                key={label}
                className="rounded-control border border-border bg-muted px-1.5 py-0.5 text-xs"
              >
                <bdi>{label}</bdi>
              </span>
            ))}
          </span>
        ),
    },
    {
      id: 'mute',
      header: t('rb.alerts.col.mute'),
      width: 130,
      dataType: 'text',
      /* §4.5 / §7.3 — a real, always-rendered control, not a hover-only row
         action: the shared kebab lane refuses a submenu for a ledger-adjacent
         index row, so this is its own column. */
      cell: (row) => (
        <MuteMenu rule={row} t={t} language={language} onChanged={() => rules.refetch()} />
      ),
    },
  ]

  const rowActions: Array<RowAction<AlertRule>> = [
    {
      label: t('rb.library.open'),
      onSelect: (row) => {
        setEditing(row)
        setFormOpen(true)
      },
      rowClick: true,
    },
    {
      label: t('rb.alert.test'),
      onSelect: (row) => void runTest(row),
      disabled: (row) => row.state === 'suspended',
      reason: () => null,
    },
    {
      label: t('rb.alert.history'),
      onSelect: (row) => {
        setHistoryOf(row)
        setHistoryOpen(true)
      },
    },
    {
      label: t('rb.alert.delete'),
      onSelect: (row) => askDelete(row),
    },
  ]

  const showComposer = formOpen
  const alertsTabs = [
    { id: 'rules', label: t('rb.alerts.tab.rules') },
    { id: 'firings', label: t('rb.alerts.tab.firings') },
  ]

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={title}
          meta={null}
          primaryAction={
            showComposer
              ? undefined
              : {
                  label: t('rb.alerts.new'),
                  onClick: () => {
                    setEditing(null)
                    setFormOpen(true)
                  },
                }
          }
          t={t}
          dir={dir}
        />
      }
    >
      <div className="flex flex-col gap-3">
        {!showComposer && (
          <ViewTabs
            tabs={alertsTabs}
            activeTab={alertsTab}
            onSelectTab={(id) => setAlertsTab(id as 'rules' | 'firings')}
            label={t('rb.alerts.tab.rules')}
          />
        )}

        {showComposer ? (
          <AlertRuleDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            rule={editing}
            today={today}
            onSaved={(rule) => {
              setFormOpen(false)
              toast.success(t('rb.alert.toast.saved', { name: rule.name }))
              rules.refetch()
            }}
            t={t}
            language={language}
          />
        ) : alertsTab === 'firings' ? (
          <AlertFeedView today={today} t={t} language={language} dir={dir} />
        ) : (
          <>
            {bannerShown && (
              <Banner
                role="status"
                banner={{
                  id: 'management-reports-alerts-no-cadence',
                  tone: 'warning',
                  title: t('rb.alert.banner.noCadence.title'),
                  actions: [
                    {
                      label: t('rb.alert.banner.noCadence.action'),
                      onClick: () => {
                        setEditing(rows[0] ?? null)
                        setFormOpen(true)
                      },
                    },
                  ],
                }}
              >
                {t('rb.alert.banner.noCadence.body')}
              </Banner>
            )}

            {Object.entries(tested).length > 0 && (
              <ul role="status" className="flex list-none flex-col gap-1">
                {Object.entries(tested).map(([ruleId, evaluation]) => (
                  <li key={ruleId} className="text-sm text-muted-foreground">
                    <bdi>
                      {t('rb.alert.test.of', { name: rulesById.get(ruleId)?.name ?? ruleId })}
                    </bdi>{' '}
                    {evaluation === 'failed'
                      ? t('rb.alert.test.failed')
                      : describeEvaluation(evaluation, t, language)}{' '}
                    {evaluation !== 'failed' && t('rb.alert.test.noChange')}
                  </li>
                ))}
              </ul>
            )}

            <DataTable
              table={table}
              rows={rows}
              columns={columns}
              getRowId={(row) => row.id}
              status={rules.status}
              total={rules.data?.total ?? 0}
              t={t}
              language={language}
              tableId="management-reports-alerts"
              view={activeView}
              tabs={reportsViewTabs(t)}
              activeTab={activeView}
              onSelectTab={(id) => onSelectView?.(id as ReportsView)}
              searchPlaceholder={t('rb.alerts.search')}
              rowActions={rowActions}
              skeletonPattern="P1"
              firstRun={{
                heading: t('rb.alerts.firstRun.heading'),
                body: t('rb.alerts.firstRun.body'),
                actions: [
                  {
                    label: t('rb.alerts.firstRun.action'),
                    onClick: () => {
                      setEditing(null)
                      setFormOpen(true)
                    },
                    primary: true,
                  },
                ],
              }}
              noMatch={{
                message: t('rb.alerts.noMatch'),
                action: { label: t('rb.alerts.noMatch.action'), onClick: table.clearAll },
              }}
              error={{ message: t('rb.alerts.error'), onRetry: rules.refetch }}
            />
          </>
        )}
      </div>

      <AlertHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        rule={historyOf}
        t={t}
        language={language}
      />

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={deleting} t={t} />
    </SingleColumnPage>
  )
}

interface RowSeriesInfo {
  buckets: readonly string[]
  points: readonly (number | null)[]
  partialBucketIndexes: readonly number[]
}

/**
 * A fact that is not a state, as a glyph a tooltip names (T9.15). The name is
 * on the element, so the word survives with the tooltip closed and with no
 * pointer; the trigger is focusable and rings, so it is reachable (§7.2).
 */
function GlyphNote({
  glyph: Glyph,
  kind,
  label,
}: {
  glyph: typeof MutedIcon
  kind: string
  label: string
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            tabIndex={0}
            aria-label={label}
            data-state-note={kind}
            className="inline-flex rounded-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Glyph aria-hidden="true" data-state-glyph={kind} className="size-4 shrink-0" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <bdi>{label}</bdi>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/** Channel glyphs with `title`, in-app always present (§4.4). */
function ChannelGlyphs({ rule, t }: { rule: AlertRule; t: Translator }) {
  const channels = rule.channels ?? [{ type: 'in-app' as const }]
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      {channels.map((channel, index) => {
        if (channel.type === 'email') {
          return <EmailIcon key={index} aria-hidden="true" className="size-3.5" data-title={t('rb.alert.channel.email')} />
        }
        if (channel.type === 'slack') {
          return (
            <span key={index} title={t('rb.alert.channel.slack')} className="text-xs">
              Slack
            </span>
          )
        }
        return null
      })}
      <span className="sr-only">{t('rb.alert.channel.inApp')}</span>
    </span>
  )
}

export type RuleSparklineReference =
  | { kind: 'line'; value: number }
  | { kind: 'band'; low: number; high: number }

const SPARKLINE_CONFIG = {
  value: { label: 'value', color: 'var(--chart-series)' },
} satisfies ChartConfig

/** AC-1233 — the rules table's own sparkline: the threshold line or the
 * anomaly band, drawn in `--chart-axis`, never a red stroke. */
function RuleSparkline({
  points,
  reference,
}: {
  points: readonly (number | null)[]
  reference: RuleSparklineReference | null
}) {
  const rows = points.map((value, index) => ({ index, value }))
  const readings = points.filter((value): value is number => value !== null)
  const bandValues = reference?.kind === 'band' ? [reference.low, reference.high] : []
  const lineValue = reference?.kind === 'line' ? [reference.value] : []
  const domain = [...readings, ...bandValues, ...lineValue]
  const min = domain.length > 0 ? Math.min(...domain, 0) : 0
  const max = domain.length > 0 ? Math.max(...domain, 0) : 0

  return (
    <div dir="ltr" aria-hidden="true" className="w-14 min-w-0 shrink-0">
      <ChartContainer config={SPARKLINE_CONFIG} className="aspect-auto h-7 w-14">
        <AreaChart data={rows} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <YAxis hide domain={[min, max === min ? min + 1 : max]} />
          {reference?.kind === 'band' && (
            <ReferenceArea
              y1={reference.low}
              y2={reference.high}
              fill="var(--chart-fill)"
              fillOpacity={0.6}
              stroke="var(--chart-axis)"
              strokeDasharray="2 2"
            />
          )}
          {reference?.kind === 'line' && (
            <ReferenceLine y={reference.value} stroke="var(--chart-axis)" strokeDasharray="2 2" />
          )}
          <Area
            dataKey="value"
            type="monotone"
            stroke="var(--color-value)"
            strokeWidth={1.5}
            fill="var(--chart-fill)"
            fillOpacity={1}
            dot={false}
            activeDot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

/**
 * The condition summary (AC-1232) — one short sentence per kind, from
 * `rb.alert.sentence.<kind>` with named params, never string concatenation.
 */
function conditionSummary(rule: AlertRule, t: Translator, language: Language): string {
  const condition = alertCondition(rule)
  switch (condition.kind) {
    case 'static':
      return t('rb.alert.sentence.static', {
        comparator: t(`rb.alert.comparator.${condition.comparator}`),
        threshold: formatMetricValue(condition.threshold, rule.thresholdUnit, language),
      })
    case 'relative':
      return t('rb.alert.sentence.relative', {
        direction: t(`rb.alert.relative.directionWord.${condition.direction}`),
        amount:
          condition.measure === 'percent'
            ? formatMetricValue(condition.amount, 'percent', language)
            : formatMetricValue(condition.amount, rule.thresholdUnit, language),
        against: t(`rb.alert.relative.against.${AGAINST_KEY[condition.against]}.inline`),
      })
    case 'anomaly':
      return t('rb.alert.sentence.anomaly', {
        direction: t(`rb.alert.anomaly.directionWord.${condition.direction}`),
        confidence: condition.confidence,
      })
    case 'missing':
      return t('rb.alert.sentence.missing', { count: condition.bucketsMissing })
  }
}

function describeEvaluation(
  evaluation: AlertEvaluation,
  t: Translator,
  language: Language,
): string {
  switch (evaluation.outcome) {
    case 'would-fire':
    case 'would-not-fire':
      return t(evaluation.wouldFire ? 'rb.alert.test.wouldFire' : 'rb.alert.test.wouldNotFire', {
        value: formatMetricValue(evaluation.value, evaluation.unit, language),
        bucket: evaluation.bucketStart
          ? formatDate(evaluation.bucketStart, { style: 'day-month', language })
          : '',
        grain: t('rb.grainNoun.day'),
      })
    case 'no-complete-bucket':
      return t('rb.alert.test.noBucket')
    case 'no-baseline':
      return t('rb.alert.anomaly.noBaseline', { count: 0 })
    case 'invalid-condition':
      return t('rb.alert.against.weekOnlyAtDay')
    case 'series-missing':
      return t('rb.alert.test.seriesMissing')
    case 'series-blocked':
      return t('rb.alert.test.seriesBlocked')
    case 'report-missing':
      return t('rb.alert.test.reportMissing')
  }
}
