/**
 * The threshold-alert rule list (§12). Nothing evaluates a rule while the tab
 * is shut, so R10 states that once in the banner and no row repeats it (T9.15).
 * One badge per row; muted and off are tooltipped glyphs, a suspension reason
 * an `InfoHint` (X15). No red: a breach is not one of R5a's four uses (AC-885).
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
import {
  ArmedIcon,
  CoolingIcon,
  DisabledIcon,
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
import type { DataColumn } from '@/components/table/columns'
/* Deep import, NOT the `@/components/metrics` barrel. The barrel also exports
   `TrendChart`, which pulls recharts -- a 337 kB chunk (104 kB gzip) that then
   loads on `/management/reports` where no chart renders. `formatMetric.ts` has
   no React in it. */
import { formatMetricValue } from '@/components/metrics/formatMetric'
import { useAsync, useIndexTable } from '@/hooks'
import {
  deleteAlertRule,
  describeAlertRule,
  evaluateAlertRule,
  listAlertRules,
} from '@/data/clients'
import type { AlertEvaluation, AlertRule } from '@/data/types'
import { formatDate, isolatedRunProps, type Language, type Translator } from '@/lib'
import { AlertHistoryDialog } from './AlertHistoryDialog'
import { AlertRuleDialog } from './AlertRuleDialog'
import { reportsViewTabs, type ReportsView } from './views'

export interface AlertsViewProps {
  title: string
  /**
   * §A11's view strip, as state plus a callback rather than as markup. Every
   * view builds its own tabs from `reportsViewTabs`, so the three cannot offer
   * different sets and a caller cannot supply a parallel strip that drifts.
   */
  activeView?: ReportsView
  onSelectView?: (view: ReportsView) => void
  /** The day a `Test this rule` and the form's series resolution run against. */
  today: string
  t: Translator
  language: Language
  dir: 'ltr' | 'rtl'
}

/**
 * The state, as a word plus a tone from R7's closed five. `firing` is `warning`
 * and never red (R5a). `suspended` and `error` are neutral: both are inert,
 * terminal facts about the rule rather than about the business, and a rule that
 * stopped working is not a breach.
 */
const STATE_TONE: Record<AlertRule['state'], 'success' | 'warning' | 'info' | 'neutral'> = {
  armed: 'success',
  firing: 'warning',
  cooling: 'info',
  suspended: 'neutral',
  error: 'neutral',
}

/**
 * A state is a shape before it is a word (§A6/§H), from the registry (X17).
 * Every glyph is `aria-hidden` and the badge keeps the word, so the glyph is
 * redundancy and never the carrier (§7.5).
 */
const STATE_GLYPH: Record<AlertRule['state'], typeof ArmedIcon> = {
  armed: ArmedIcon,
  firing: FiringIcon,
  cooling: CoolingIcon,
  suspended: SuspendedIcon,
  error: NotWorkingIcon,
}

/* Derived from the tone map, never typed twice: a sixth state cannot reach the
   filter without a tone, so no row can vanish from an index nobody touched. */
const ALERT_STATES = Object.keys(STATE_TONE) as ReadonlyArray<AlertRule['state']>

export function AlertsView({
  title,
  activeView = 'alerts',
  onSelectView,
  today,
  t,
  language,
  dir,
}: AlertsViewProps) {
  /* `null` creates, a rule edits. One dialog, two modes, and the mode is the
     value rather than a flag — the same shape `saveReport` uses. */
  const [editing, setEditing] = useState<AlertRule | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const table = useIndexTable<AlertRule>({
    mode: 'index',
    getRowId: (row) => row.id,
  })
  const rules = useAsync((signal) => listAlertRules(table.params, signal), {
    /* `table.params` is the fetcher's only input; saving a rule calls
       `rules.refetch`, which bypasses the cache read. */
    deps: [JSON.stringify(table.params)],
    cacheKey: 'alerts.list',
  })

  const rows = rules.data?.items ?? []
  const rulesById = new Map(rows.map((rule) => [rule.id, rule]))
  /* The banner's `Test a rule` target, and the condition it renders on: a rule
     nothing checks, that a test is allowed to read (§13.3 refuses a suspended
     one). Undefined means neither the banner nor the action has a subject. */
  const testable = rows.find((rule) => rule.cadence === null && rule.state !== 'suspended')

  /* `Test this rule`'s answer, per rule. Held on the screen rather than pushed
     into the row, because a test changes nothing about the rule and a result
     that looked like row state would read as one. */
  const [tested, setTested] = useState<Record<string, AlertEvaluation | 'failed'>>({})

  const runTest = async (rule: AlertRule) => {
    try {
      const evaluation = await evaluateAlertRule(rule.id)
      setTested((current) => ({ ...current, [rule.id]: evaluation }))
    } catch {
      setTested((current) => ({ ...current, [rule.id]: 'failed' }))
    }
  }

  /* The firing history. One dialog, one rule at a time; the rule is held rather
     than the id so the title can name it without a second read. */
  const [historyOf, setHistoryOf] = useState<AlertRule | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [deleting, setDeleting] = useState(false)

  /**
   * §5.3 — the confirmation NAMES the rule, and its body says what goes and
   * what stays. `deleteAlertRule` has existed since the client was written and
   * had no UI caller at all: a rule could be created and edited and never
   * removed.
   */
  const askDelete = (rule: AlertRule) => {
    setConfirm({
      title: t('rb.alert.delete.confirm.title', { name: rule.name }),
      body: t('rb.alert.delete.confirm.body'),
      confirmLabel: t('rb.alert.delete.confirm.action'),
      /* R5a use #1. Nothing in this product restores a deleted rule or its
         firing history, which is the test the red button has to pass. */
      destructive: true,
      onConfirm: () => void runDelete(rule),
    })
  }

  const runDelete = async (rule: AlertRule) => {
    setDeleting(true)
    try {
      await deleteAlertRule(rule.id)
      setConfirm(null)
      /* R9 — one line, naming the object. §5.1 wants one for every successful
         mutation, and a row vanishing from a table is not a confirmation: the
         operator cannot tell it from a filter change. */
      toast.success(t('rb.alert.toast.deleted', { name: rule.name }))
      rules.refetch()
    } catch {
      /* §8.3 — a failed mutation never closes the surface it came from. The
         confirm stays open with the same rule named in it. */
      toast.error(t('rb.alert.delete.failed'))
    } finally {
      setDeleting(false)
    }
  }

  const columns: Array<DataColumn<AlertRule>> = [
    {
      id: 'name',
      emphasis: 'primary',
      csv: (row) => row.name,
      header: t('rb.alerts.col.name'),
      alwaysVisible: true,
      minWidth: 240,
      sortField: 'name',
      dataType: 'text',
      /* T9.15 — the name on one line. The rule sentence used to wrap to two
         and truncate mid-clause; it reads in full in the row's `title` and in
         the rule's own dialog, which is where an operator edits it. */
      cell: (row) => (
        <span
          {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}
          title={alertSentence(row, t, language)}
        >
          <bdi {...isolatedRunProps().run}>{row.name}</bdi>
        </span>
      ),
    },
    {
      id: 'state',
      emphasis: 'data',
      header: t('rb.alerts.col.state'),
      /* 160, up from 140: the glyph and its 6px gap are 22px the badge did not
         have to share the cell with, and `Not working` is the longest of the
         five words in English. Measured rather than rounded up twice. */
      width: 160,
      dataType: 'enum',
      /* **The filter that could never fire, made reachable.** It used to live
         on `params.view` in `alerts.ts`, which `useIndexTable` feeds from
         `?view=` — always the reports sub-tab id `alerts` on this screen. A
         `FilterSpec` is keyed on a FIELD, so `state` cannot collide with a view
         id, and the control and the client branch are now one declaration. */
      filter: {
        kind: 'select',
        field: 'state',
        label: t('rb.alerts.filter.state'),
        options: ALERT_STATES.map((state) => ({
          value: state,
          label: t(`rb.alert.state.${state}`),
        })),
      },
      /* T9.15 — ONE badge, on one line. `enabled: false` and `mutedUntil` are
         not states, so they ride as registry glyphs a tooltip names; the
         server's suspension reason is an explanation, so it is an `InfoHint`
         (X15). Nothing here wraps, so the row stays one line tall. */
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
              <GlyphNote
                glyph={DisabledIcon}
                kind="disabled"
                label={t('rb.alert.disabled')}
              />
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
      /* R10 — the banner above says nothing checks these rules, so the cell
         does not repeat it once per row. O9: an absence the banner already
         states is blank. */
      cell: (row) => (row.cadence === null ? null : <span>{row.cadence}</span>),
    },
    {
      /* The line, beside the reading tested against it (§H). T9.15 deletes the
         unit line under it: `formatMetricValue` already prints the unit. */
      id: 'threshold',
      emphasis: 'data',
      header: t('rb.alerts.col.threshold'),
      width: 150,
      align: 'end',
      dataType: 'number',
      csv: (row) => row.threshold,
      cell: (row) => (
        <span className="tabular-nums">
          {formatMetricValue(row.threshold, row.thresholdUnit, language)}
        </span>
      ),
    },
    {
      id: 'lastValue',
      header: t('rb.alerts.col.lastValue'),
      width: 140,
      align: 'end',
      dataType: 'number',
      /* O9 — a rule nothing has read has no last reading, and that is not a
         fact the operator acts on: the cell is blank, never a dash. */
      cell: (row) =>
        row.lastValue === null ? null : (
          <span className="tabular-nums">
            {formatMetricValue(row.lastValue, row.thresholdUnit, language)}
          </span>
        ),
    },
    {
      id: 'lastEvaluated',
      emphasis: 'data',
      header: t('rb.alerts.col.lastEvaluated'),
      width: 160,
      dataType: 'date',
      /* **A word, not a placeholder.** `formatMetricValue(null, …)` rendered the
         no-data dash, which cannot tell *never checked* from *checked, and the
         reading was missing*. Every rule on this list is the first of those and
         the column is entitled to say so. */
      cell: (row) =>
        row.lastEvaluatedAt === null ? (
          <span className="text-muted-foreground">{t('rb.alert.lastEvaluated.never')}</span>
        ) : (
          <bdi>
            {formatDate(row.lastEvaluatedAt, {
              style: 'day-month-time',
              language,
            })}
          </bdi>
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
      /* **P0-2 — the declared row-click target.** It opens the rule's form and
         writes nothing until the operator saves; `Test` fires a real
         evaluation and must stay unreachable from a row click. */
      rowClick: true,
    },
    {
      label: t('rb.alert.test'),
      onSelect: (row) => void runTest(row),
      /* §13.3 — a suspended rule stopped evaluating on purpose, and testing it
         would read as resuming it. Disabled IN PLACE with the reason the server
         already gave. */
      disabled: (row) => row.state === 'suspended',
      /* `null` on purpose. `RowAction.reason` allows it *"where the refusal is
         self-evident from the row itself"*, and it is: the State column two
         cells away already carries `Suspended` plus the server's own reason.
         Repeating a four-line paragraph in the action lane pushes every row to
         five times its height and says nothing new. */
      reason: () => null,
    },
    {
      /* The whole `alerts.history` resource's only way in. It opens a record,
         mutates nothing, and is deliberately NOT the row-click target: `Open`
         already is, and §11.2 allows exactly one. */
      label: t('rb.alert.history'),
      onSelect: (row) => {
        setHistoryOf(row)
        setHistoryOpen(true)
      },
    },
    {
      /* R5a use #1. In the row menu, never on the page header, and never
         reachable from a row click — a stray click must not be able to open a
         destructive confirm the operator did not ask for. */
      label: t('rb.alert.delete'),
      onSelect: (row) => askDelete(row),
    },
  ]

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={title}
          meta={null}
          primaryAction={{
            label: t('rb.alerts.new'),
            onClick: () => {
              setEditing(null)
              setFormOpen(true)
            },
          }}
          t={t}
          dir={dir}
        />
      }
    >
      <div className="flex flex-col gap-3">
        {/* R10 — the standing condition, above the rows it qualifies, and §5.2
            allows exactly one. T9.15 cuts it to one sentence plus the action
            that answers it; the re-arm rule is an explanation, so it is an
            `InfoHint` on the title (X15). `info` and `role="status"`: a decision
            has not been made, which is true rather than wrong. */}
        {testable !== undefined && (
          <Banner
            role="status"
            banner={{
              id: 'management-reports-alerts-no-cadence',
              tone: 'info',
              title: t('rb.alerts.banner.title'),
              body: t('rb.alerts.banner.body'),
              actions: [
                {
                  label: t('rb.alerts.banner.action'),
                  onClick: () => void runTest(testable),
                },
              ],
            }}
          >
            <InfoHint t={t}>{hintLines([t('rb.alert.rearm.explain')])}</InfoHint>
          </Banner>
        )}

        {/* AC-877 — it reports the bucket, the value and whether it WOULD have
            fired, and it names the rule, because the banner's `Test a rule` and
            four row menus write into one list. It never changes the rule and
            never emits a notification, and the sentence says so. */}
        {Object.entries(tested).length > 0 && (
          <ul role="status" className="flex list-none flex-col gap-1">
            {Object.entries(tested).map(([ruleId, evaluation]) => (
              <li key={ruleId} className="text-sm text-muted-foreground">
                <bdi>
                  {t('rb.alert.test.of', {
                    name: rulesById.get(ruleId)?.name ?? ruleId,
                  })}
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
            action: {
              label: t('rb.alerts.noMatch.action'),
              onClick: table.clearAll,
            },
          }}
          error={{ message: t('rb.alerts.error'), onRetry: rules.refetch }}
        />
        {/* The two footnotes that used to sit here are the banner above. R10:
            a standing condition is a banner; a footnote below pagination is
            not a place a correction can outrank a badge from. */}
      </div>

      <AlertRuleDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        rule={editing}
        today={today}
        onSaved={(rule) => {
          setFormOpen(false)
          /* §5.1 — a toast for every successful mutation, INCLUDING one inside
             a modal. Saving used to close the dialog and refetch in silence,
             which leaves the operator to infer the write from a list that looks
             the same either way. R9: one line, naming the object. */
          toast.success(t('rb.alert.toast.saved', { name: rule.name }))
          rules.refetch()
        }}
        t={t}
        language={language}
      />

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

/**
 * What the rule will do, in words — one key with named parameters (AC-878).
 * The measure and the comparator are resolved before interpolation, so the
 * translator assembles the sentence and never `+`.
 */
function alertSentence(rule: AlertRule, t: Translator, language: Language): string {
  const described = describeAlertRule(rule)
  return `${t(described.key, {
    measure: t(String(described.params['measure'])),
    comparator: t(`rb.alert.comparator.${String(described.params['comparator'])}`),
    threshold: formatMetricValue(rule.threshold, rule.thresholdUnit, language),
    grain: t(`rb.grainNoun.${rule.evaluationGrain}`),
  })} ${t(
    crossingIsGoodNews(rule, described.params['higherIsBetter'] === true)
      ? 'rb.alert.direction.good'
      : 'rb.alert.direction.bad',
  )}`
}

/**
 * Whether crossing this line is good news. `higherIsBetter` is a property of
 * the measure and the comparator is a property of the rule, so neither alone
 * answers it: revenue rising past a line and revenue falling below one are the
 * same measure and opposite news (F-7).
 */
function crossingIsGoodNews(rule: AlertRule, higherIsBetter: boolean): boolean {
  const crossingUpward = rule.comparator === 'gt' || rule.comparator === 'gte'
  return crossingUpward === higherIsBetter
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
          ? formatDate(evaluation.bucketStart, {
              style: 'day-month',
              language,
            })
          : '',
        grain: t('rb.grainNoun.day'),
      })
    case 'no-complete-bucket':
      return t('rb.alert.test.noBucket')
    case 'series-missing':
      return t('rb.alert.test.seriesMissing')
    case 'series-blocked':
      return t('rb.alert.test.seriesBlocked')
    case 'report-missing':
      return t('rb.alert.test.reportMissing')
  }
}
