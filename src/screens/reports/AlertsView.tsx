/**
 * The threshold-alert rule list — §12, and **only the half the client honestly
 * owns.**
 *
 * ## What is here and what is not
 *
 * Something has to evaluate a threshold when nobody is looking at the screen.
 * **That is a scheduler, it is server work, and it does not exist.** Building it
 * client-side would produce a feature that fires only while a tab is open,
 * *"which is not an alert — it is a chart with an opinion."* So this screen owns
 * the rule list, its four base states, its domain states, and `Test this rule`.
 * It owns **no evaluation loop, no timer and no polling.**
 *
 * ## The cadence is unset, and it is rendered as unset
 *
 * Every seeded rule carries `cadence: null` and `minReArmMinutes: null`. The
 * business has specified neither, and **AC-453** is this project's standing rule
 * for the case: *an invented window is indistinguishable from a measured one
 * once it ships.* So the column reads `Not set`, the sentence beside it says
 * what that means and what follows from it, and **the form does not offer a
 * value to choose.** A picker defaulted to `Daily` would put a business decision
 * nobody made into a saved record, where the next reader would take it for one.
 *
 * ## The correction outranked itself, and now it does not
 *
 * That unset cadence means **nothing evaluates**, and four of the five state
 * words are present tense for a machine that is running: `Armed` means
 * *watching*, `Cooling` means *counting down*. The two sentences that said
 * otherwise used to render **after** the `DataTable`, below pagination — a 12px
 * grey paragraph contradicting a `success`-toned badge on every row, which is
 * the least authoritative element on the page arguing with the most
 * authoritative one on each row.
 *
 * R10 puts a standing condition in a banner, so both sentences moved into one
 * — §5.2 permits exactly one page-level banner, so they MERGE rather than
 * stack — above the table, and each row carries `rb.alert.cadence.rowNote`
 * under its badge.
 *
 * **No state word was removed or softened.** Each is a true statement about the
 * last recorded state; what was false was the present tense a bare badge
 * implies, and that is what the qualifier fixes.
 *
 * ## Every mutation confirms, and one of them is destructive
 *
 * §5.1 asks for a toast on every successful mutation *including ones inside a
 * modal*, and saving a rule used to close the dialog and refetch in silence.
 * `Delete alert` is R5a use #1 — the row menu, never the header — behind a
 * confirm that names the rule (§5.3) and says what goes and what stays.
 *
 * That is a deliberate departure from **AC-875**, which lists a cadence among
 * the fields a rule requires before `Save` is enabled. The criterion and the
 * ruling cannot both hold; the ruling wins and the departure is named in the
 * handoff rather than absorbed.
 *
 * ## No red, and the argument rather than the assumption
 *
 * R5a enumerates red's four permitted uses — a destructive button, one
 * page-level critical banner, a breached-row leading-edge marker, a map marker.
 * **A threshold breach is none of them.** It is not destructive; it is not
 * page-level, because a dashboard can carry several firing tiles at once and
 * §5.2 forbids stacking banners; and the row marker belongs to §8.4's work
 * queues, which this is not. So a firing rule is carried by **the word**
 * (`Firing`) and a `warning`-tone badge from R7's closed five-tone set
 * (**AC-885**). There is no red badge and no sixth tone.
 *
 * ## No nav badge either
 *
 * §12.6, argued not assumed: tone is a property of a queue, not of one
 * operator's configuration; the two-`attention` cap is asserted mechanically
 * and a user-configurable producer makes that test unassertable; and
 * `attention` means *a breach whose harm is irreversible or statutory*, which a
 * threshold typed into a form last Tuesday cannot satisfy. **The notification
 * centre is the only surface** (AC-884).
 *
 * ## A state is a shape before it is a word (§H, §A6)
 *
 * Amplitude's inbox is built so that what needs attention reads at a glance,
 * and five badges in one geometry differing only in fill is the opposite of
 * that. `STATE_GLYPH` gives each of the five a literal glyph, and `muted`,
 * `enabled: false` and `cadence: null` — three facts that are **not** states —
 * get their own, so none of them can be mistaken for a sixth badge. Every glyph
 * is `aria-hidden` and every word is still present, so the glyph is redundancy
 * and never the carrier (§7.5).
 *
 * The `Threshold` column joins them for the same reason: `Last reading` had
 * nothing beside it to be read against, and the line it is tested against lived
 * only inside the rule sentence in the identity cell.
 *
 * **What could not be done here, and where it belongs.** §1.5 and the register
 * `ChartToolbar` and `DashboardTile` set also want the row overflow to carry a
 * `MoreHorizontal` glyph and a leading glyph per menu item. Both live in
 * `DataTable` (the trigger renders a text `⋯`) and in `table/rowActions.tsx`
 * (`RowAction.label` is a `string` and there is no `icon` field), which are the
 * table layer's files and land on forty screens. Reported to that owner rather
 * than reached into from here.
 */

import { useState } from 'react'
import {
  BellOffIcon,
  BellRingIcon,
  CalendarClockIcon,
  CalendarOffIcon,
  CircleAlertIcon,
  HourglassIcon,
  PauseIcon,
  PowerOffIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Banner, BannerConditionList } from '@/components/Banner'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { DataTable, type RowAction } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
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
   * §A11's view strip, as **state plus a callback rather than as markup**.
   *
   * There used to be a third member here, `views?: React.ReactNode`, and it was
   * the sixth dead prop the audit found: declared on this interface and on
   * `ReportLibraryProps`, never destructured, never read, never passed. It is
   * **deleted rather than wired**, and the reason is that wiring it would have
   * created a second way to put the same strip on the same screen. Every view
   * builds its own tabs from `reportsViewTabs` (`./views`) — one list, so the
   * three views cannot offer different sets — and a caller-supplied node would
   * be a parallel source that agrees today and drifts later. `ReportsScreen`
   * already owns the only decision a caller has: which view is current, and
   * what happens when another is chosen.
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
 * The state, as a word plus a tone from the closed five.
 *
 * `firing` is `warning` — the one attention tone R17 gives — and never red.
 * `suspended` and `error` are **neutral**: both are inert, terminal facts about
 * the rule rather than about the business, and R7 puts a terminal factual
 * outcome in neutral. A rule that stopped working is not a breach.
 */
const STATE_TONE: Record<AlertRule['state'], 'success' | 'warning' | 'info' | 'neutral'> = {
  armed: 'success',
  firing: 'warning',
  cooling: 'info',
  suspended: 'neutral',
  error: 'neutral',
}

/**
 * **The same five states, each carrying a glyph as well as its word** — §A6/§H.
 *
 * Amplitude's principle on an inbox is that *what needs attention reads at a
 * glance*: a state is a shape before it is a word, so a scan down the column
 * separates `Firing` from `Armed` without reading either. Five badge words in
 * the same geometry, differing only in fill, is exactly the scan this replaces.
 *
 * **The glyph is redundancy and never the carrier.** Every one is
 * `aria-hidden`, the word stays inside the `StatusBadge` beside it, and
 * `StatusBadge`'s own type requires that word — so a glyph-only state is
 * unrepresentable rather than merely discouraged (§7.5). Remove colour and
 * remove the glyph and the state still reads; that is the test.
 *
 * The choices are literal rather than decorative: a bell that is *ringing* for
 * `firing`, an hourglass *running* for `cooling`, a shield *set* for `armed`, a
 * pause for a rule stopped on purpose, and the ordinary "something is wrong
 * with this object" disc for `error`. None of them is red — R5a's four uses do
 * not include a threshold breach (see the header), and each renders in
 * `text-muted-foreground`, so the badge's tone remains the only colour in the
 * cell.
 */
const STATE_GLYPH: Record<AlertRule['state'], typeof ShieldCheckIcon> = {
  armed: ShieldCheckIcon,
  firing: BellRingIcon,
  cooling: HourglassIcon,
  suspended: PauseIcon,
  error: CircleAlertIcon,
}

/**
 * The State filter's options, **derived from the tone map rather than typed a
 * second time.** `STATE_TONE` is a `Record` over the closed union, so a sixth
 * state does not compile without a tone — and therefore cannot reach the filter
 * without one either. A hand-written list of five would silently keep filtering
 * on five after the union grew to six, which is how a row disappears from an
 * index nobody has touched.
 */
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
      cell: (row) => (
        <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
          <bdi {...isolatedRunProps().run}>{row.name}</bdi>
        </span>
      ),
      /* AC-878 — ONE key with named parameters. Never `a + ' vs ' + b`, and
         never a sentence assembled from translated fragments. */
      secondaryLine: (row) => <AlertSentence rule={row} t={t} language={language} />,
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
      cell: (row) => {
        const Glyph = STATE_GLYPH[row.state]
        return (
          <span className="flex flex-col items-start gap-1">
            <span className="flex items-center gap-1.5">
              {/* Decorative by declaration, and identified for the test by a
                  data attribute rather than by a class name — a lucide icon's
                  own `lucide-bell-ring` class is the library's, and asserting on
                  it would make a lucide upgrade a UI test failure. */}
              <Glyph
                aria-hidden="true"
                data-state-glyph={row.state}
                className="size-4 shrink-0 text-muted-foreground"
              />
              <StatusBadge tone={STATE_TONE[row.state]}>
                {t(`rb.alert.state.${row.state}`)}
              </StatusBadge>
            </span>
            {/* `enabled: false` is the OPERATOR's switch; `suspended` is the
                server's; `mutedUntil` silences without stopping. Three different
                facts and none of them is the other — so each gets its own glyph
                and its own word, and neither of these two is a state badge. */}
            {!row.enabled && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <PowerOffIcon
                  aria-hidden="true"
                  data-state-glyph="disabled"
                  className="size-4 shrink-0"
                />
                {t('rb.alert.disabled')}
              </span>
            )}
            {row.mutedUntil && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BellOffIcon
                  aria-hidden="true"
                  data-state-glyph="muted"
                  className="size-4 shrink-0"
                />
                {/* A timestamp opens the sentence's tail with digits, which the
                    UBA throws to the far end of an Arabic line without an
                    isolate. */}
                <bdi>
                  {t('rb.alert.muted', {
                    time: formatDate(row.mutedUntil, {
                      style: 'day-month-time',
                      language,
                    }),
                  })}
                </bdi>
              </span>
            )}
          </span>
        )
      },
      /**
       * The qualifier, in the slot the suspended and error reasons already use.
       *
       * **The row note is added, never substituted.** It answers *is anything
       * checking this?* and `stateReasonKey` answers *why is it in this state?*
       * — two different questions, and the second is the one the disabled
       * `Test this rule` action points at (`reason: () => null` below is only
       * legal while the reason is on the row). A rule with a cadence shows the
       * reason alone; a rule without one shows both, in that order, because the
       * present tense is what needs qualifying first.
       */
      secondaryLine: (row) => {
        const lines = [
          ...(row.cadence === null ? [t('rb.alert.cadence.rowNote')] : []),
          ...(row.stateReasonKey === null ? [] : [t(row.stateReasonKey)]),
        ]
        if (lines.length === 0) return null
        return (
          <span className="flex flex-col text-xs text-muted-foreground">
            {lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </span>
        )
      },
    },
    {
      id: 'cadence',
      header: t('rb.alerts.col.cadence'),
      width: 120,
      /* Unset, and rendered AS unset. Not blank, not a guess, not a dash that
         could be read as "none needed". The glyph is the same fact in a second
         channel — a calendar with a line through it — and the word is still the
         one thing that carries it. */
      cell: (row) =>
        row.cadence === null ? (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarOffIcon
              aria-hidden="true"
              data-state-glyph="cadence-unset"
              className="size-4 shrink-0"
            />
            {t('rb.alert.cadence.unset')}
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <CalendarClockIcon aria-hidden="true" className="size-4 shrink-0" />
            {row.cadence}
          </span>
        ),
    },
    {
      /* **The line, beside the reading tested against it.** It was only ever
         inside the rule sentence on the identity cell, so an operator scanning
         the `Last reading` column had nothing to compare it with without
         reading a paragraph two columns away. §H's principle: what needs
         attention reads at a glance.

         The unit is STATED under the number rather than assumed from the
         format (AC-876's sentence, the same key the rule form uses): a count
         formats as a bare numeral, and a bare numeral in a `Threshold` column
         is the one reading nobody can check. */
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
      secondaryLine: (row) => (
        <span className="text-xs text-muted-foreground">
          {t('rb.alert.form.threshold.unit', {
            unit: t(`rb.unit.${row.thresholdUnit}`),
          })}
        </span>
      ),
    },
    {
      id: 'lastValue',
      header: t('rb.alerts.col.lastValue'),
      width: 140,
      align: 'end',
      dataType: 'number',
      cell: (row) => (
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
        {/* **R10 — the standing condition, above the rows it qualifies.**

            §11.4 puts a page-level banner first in the content block, and §5.2
            allows exactly ONE — so the cadence sentence and the re-arm sentence
            are merged into this single `info` banner rather than stacked. They
            used to be two 12px paragraphs BELOW the table and below pagination,
            where they were the last thing on the page contradicting a
            `success`-toned badge on every row.

            `info`, not `warning`: nothing is wrong and nothing is degrading.
            A decision has not been made, which is a fact about the product and
            not an incident. `role="status"` for the same reason — it is true,
            not a rejection, and it does not earn a screen-reader interruption.

            Rendered only while a rule on this page actually has no cadence, so
            the day one is set the banner stops asserting something false. */}
        {(rules.data?.items ?? []).some((rule) => rule.cadence === null) && (
          <Banner
            role="status"
            banner={{
              id: 'management-reports-alerts-no-cadence',
              tone: 'info',
              title: t('rb.alerts.banner.title'),
              body: t('rb.alerts.banner.body'),
            }}
          >
            {/* The second merged condition. §4.2's one-line-per-condition list
                is what a merge renders, so the two facts stay two facts. */}
            <BannerConditionList lines={[t('rb.alert.rearm.explain')]} />
          </Banner>
        )}

        {/* AC-877 — it reports the bucket, the value and whether it WOULD have
            fired. It never changes the rule and never emits a notification, and
            the sentence says so out loud so nobody reads a test as a firing. */}
        {Object.entries(tested).length > 0 && (
          <ul role="status" className="flex list-none flex-col gap-1">
            {Object.entries(tested).map(([ruleId, evaluation]) => (
              <li key={ruleId} className="text-sm text-muted-foreground">
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
          rows={rules.data?.items ?? []}
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
 * What the rule will do, in words — **one key, named parameters** (AC-878).
 *
 * `describeAlertRule` returns the key and its params; the measure arrives as its
 * own translation key, and the comparator as one of four. Both are resolved
 * before interpolation so the sentence is assembled by the translator and never
 * by `+`. Arabic does not put the noun where English does, and a concatenated
 * sentence is untranslatable by construction.
 */
function AlertSentence({
  rule,
  t,
  language,
}: {
  rule: AlertRule
  t: Translator
  language: Language
}) {
  const described = describeAlertRule(rule)
  return (
    <span className="text-xs text-muted-foreground">
      {t(described.key, {
        measure: t(String(described.params['measure'])),
        comparator: t(`rb.alert.comparator.${String(described.params['comparator'])}`),
        threshold: formatMetricValue(rule.threshold, rule.thresholdUnit, language),
        /* The noun, not the control label. */
        grain: t(`rb.grainNoun.${rule.evaluationGrain}`),
      })}{' '}
      {t(
        crossingIsGoodNews(rule, described.params['higherIsBetter'] === true)
          ? 'rb.alert.direction.good'
          : 'rb.alert.direction.bad',
      )}
    </span>
  )
}

/**
 * **Whether crossing this line is good news, and why one field cannot answer it.**
 *
 * `higherIsBetter` says which direction of the MEASURE is desirable. The
 * comparator says which direction of the LINE the rule watches. Gross revenue
 * is a measure where higher is better, and a rule that fires when it *falls
 * below* SAR 400 is firing on bad news — the same measure, the opposite
 * reading. Wording it from `higherIsBetter` alone told the operator the
 * opposite of the truth, which is exactly the failure F-7 exists to prevent:
 * *"to word a comparator honestly and to decide whether over the line is good
 * news."*
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
