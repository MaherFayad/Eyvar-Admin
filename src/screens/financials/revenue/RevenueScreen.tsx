/**
 * Financials › Revenue & Refunds — spec §5 row 2, §6.3, **AC-354–361**, and
 * FINANCIALS-UX-PLAN §1 P0-4 and §4.
 *
 * ## The view list
 *
 * VW-3, adopted: `Revenue by plan · Refunds · Refunds ledger · Credit notes ·
 * Contribution margin`, opening on the plan list. Two of §5's original names
 * were dropped rather than built, and the reason is the sign convention:
 *
 *   - **`All postings` across two accounts is not a ledger.** §3.2: every
 *     ledger declares ONE subject account and `direction` is relative to it
 *     (**AC-308**). So the ledger here is `contra.refunds`, and the view now
 *     says which account it is.
 *   - **`revenue.fares` has no subject ledger.** No posting carries
 *     `subjectAccount: 'revenue.fares'`, and minting one to fill a view is the
 *     fabrication §6.3 forbids. Revenue is served as `Revenue by plan`,
 *     computed from postings (**AC-355**).
 *
 * Rules applied
 *   §8.3 / AC-354
 *              the refunds ledger is a ledger: no selection, no sort, no row
 *              action but the source link — enforced by `mode: 'ledger'`.
 *   §9.3       a table with no bulk action renders **no checkbox column**.
 *   R5a / AC-356
 *              an unmatched credit note takes the 3px row marker, the words in
 *              its own cell, and ONE page banner with a count. Never a badge.
 *   AC-355     the by-plan total is a **footer row** of the table (V-11),
 *              computed from the rows on screen so it cannot disagree with
 *              them — the exact failure `12a` R12 records.
 *   AC-360     a credit note's issue date is rendered from `issuedAt`.
 *   §4         `Revenue by plan` is a master-detail with a `Charts | Table`
 *              control; `Table` is the same `DataTable` it always was.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
} from 'react'
import { Download } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getFinancialsOverview,
  getPlanRevenueDetail,
  getRefundsLedger,
  listCreditNotes,
  listRefunds,
  listRevenueByPlan,
} from '@/data/clients'
import type {
  CreditNote,
  FinancialsOverview,
  FinancialsPeriod,
  Ledger,
  LedgerPosting,
  Metric,
  Paginated,
  PlanRevenueDetail,
  Refund,
  RevenueByPlanRow,
  SubTabRoute,
} from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import {
  ABSENT,
  formatCount,
  formatDate,
  formatPercent,
  type Language,
  type Translate,
} from '@/lib'
import { cn } from '@/lib/utils'
import type { BannerModel } from '@/components/Banner'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { tableCsvFilename, tableCsvText } from '@/components/table/csv'
import { ViewSwitcher } from '@/components/table/ViewSwitcher'
import { downloadCsv } from '@/screens/reports/csv'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { Money, MoneyCell } from '@/components/Money'
import { MetricTile, Sparkline } from '@/components/metrics'
import { MasterDetailPage } from '@/components/PageShell'
import { RowCriticalMarker } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { reasonLabel } from '@/i18n/vocabulary/copy'
import { useShell } from '@/shell/ShellContext'
import { EntityName, useEntityLinks } from '../shared/entityLinks'
import { LedgerCard } from '../shared/LedgerCard'
import { FinancialsPage, periodLabel, usePeriod } from '../shared/FinancialsPage'
import { PeriodControl } from '../shared/PeriodControl'
import { ViewRow, usePublishFacts, type ViewFacts } from '../shared/ViewRow'
import { CompositionBar } from '../shared/CompositionBar'
import { PlanDayChart } from '../shared/PlanDayChart'
import { shiftPeriodMonths } from '../shared/periodPresets'
import { Figure, FigureGrid, FigureItem, FigureRow, Percent } from '../shared/Figures'
import { marginBreakdown, percentOrNull } from '../shared/derive'
import { useScreenViews, type ScreenView } from '@/hooks'

/**
 * **VW-3, adopted** (FINANCIALS-UX-PLAN P0-4). The tab labelled `All postings`
 * rendered the `contra.refunds` ledger and the one labelled `Revenue` rendered
 * *Revenue by plan*; both now say what they show, and the plan list leads.
 */
const VIEWS: readonly ScreenView[] = [
  { id: 'by-plan', titleKey: 'fin.revenue.view.byPlan' },
  { id: 'refunds', titleKey: 'fin.revenue.view.refunds' },
  { id: 'refunds-ledger', titleKey: 'fin.revenue.view.refundsLedger' },
  { id: 'credit-notes', titleKey: 'fin.revenue.view.creditNotes' },
  { id: 'margin', titleKey: 'fin.revenue.view.margin' },
]

/** The sub-tab is *Revenue* & Refunds, so revenue is what it opens on. */
const DEFAULT_VIEW = 'by-plan'

export function RevenueScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, dir, language } = shell.language
  const { period, setPeriod } = usePeriod()
  const { tabs, activeTab, selectTab } = useScreenViews(VIEWS, DEFAULT_VIEW, t)
  const { mode, setMode } = useDrawMode()

  /* The banner state is lifted so the page renders **one** banner whichever
     view is mounted (R10). Only the credit-note view can raise one here. */
  const [unlinkedCount, setUnlinkedCount] = useState(0)
  /* **§10.4** — the view's figures ride the stadium's row, published by the
     view that counts them. */
  const [facts, setFacts] = useState<ViewFacts | null>(null)

  const banners = useMemo<BannerModel[]>(() => {
    if (unlinkedCount === 0) return []
    return [
      {
        id: 'fin.creditNote.unlinked',
        tone: 'critical',
        title:
          unlinkedCount === 1
            ? t('fin.creditNote.unlinked.title')
            : t('fin.creditNote.unlinked.titleMany', {
                count: formatCount(unlinkedCount, language),
              }),
        body: t('fin.creditNote.unlinked.body'),
      },
    ]
  }, [unlinkedCount, t, language])

  /* The by-plan read lives here because `Export CSV` does: the row's button
     and the view draw the same plans off one read. `enabled` keeps it off the
     other four views and off `Table` mode, which reads without the series. */
  const plans = useAsync<RevenueByPlanRow[]>(
    (signal) => listRevenueByPlan(period, { include: 'daily' }, signal),
    {
      deps: [period.start, period.end],
      enabled: activeTab === 'by-plan' && mode === 'charts',
      cacheKey: 'revenue.byPlan.daily',
    },
  )
  const planRows = useMemo(() => plans.data ?? [], [plans.data])

  /* §4.5 - the CSV is the by-plan table in both modes, so `Charts` exports the
     same file `Table` does rather than a second shape of the same numbers. */
  const exportCsv = () => {
    const columns = revenueByPlanColumns(t, language, false)
    const exportedAt = new Date().toISOString()
    const text = tableCsvText({
      tableId: 'financials-revenue-by-plan',
      view: activeTab,
      columns,
      visible: columns,
      rows: planRows,
      query: '',
      filters: [],
      sort: null,
      total: planRows.length,
      exportedAt,
    })
    downloadCsv(tableCsvFilename('financials-revenue-by-plan', activeTab, exportedAt), text)
  }

  return (
    <FinancialsPage
      row={row}
      meta={periodLabel(period, t, language)}
      banners={activeTab === 'credit-notes' ? banners : []}
      periodControl={
        <PeriodControl period={period} onChange={setPeriod} t={t} language={language} />
      }
      /* **ONE view row, in one place, on all five views.** It was the
         `DataTable` toolbar's stadium on three views and a row of pills above
         the cards on the other two, so the strip changed shape and moved on
         every click. The sub-views pass no `tabs` at all now (D12). */
      viewRow={
        <ViewRow
          label={tabs.find((tab) => tab.id === activeTab)?.label ?? ''}
          facts={facts}
          lead={<ViewSwitcher tabs={tabs} activeTab={activeTab} onSelectTab={selectTab} />}
          /* §4.5 - the drawing control and its export belong to `Revenue by
              plan` alone, so they render at the row's inline-end there and
              nowhere else. `Table` mode carries the table's own `Export`. */
          control={
            activeTab === 'by-plan' ? (
            <div className="flex items-center gap-2">
              <Tabs
                value={mode}
                onValueChange={(next) => setMode(next === 'table' ? 'table' : 'charts')}
                className="shrink-0 gap-0"
              >
                <TabsList variant="segmented" aria-label={t('fin.revenue.mode.label')}>
                  {(['charts', 'table'] as const).map((id) => (
                    <TabsTrigger
                      key={id}
                      value={id}
                      className="rounded-full border-transparent px-3 text-sm data-active:border-border-control data-active:bg-card"
                    >
                      {t(id === 'table' ? 'fin.revenue.mode.table' : 'fin.revenue.mode.charts')}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              {mode === 'charts' && (
                <Button variant="secondary" onClick={exportCsv} disabled={planRows.length === 0}>
                  <Download aria-hidden="true" />
                  {t('fin.revenue.export')}
                </Button>
              )}
            </div>
            ) : undefined
          }
        />
      }
      t={t}
      dir={dir}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {activeTab === 'by-plan' && (
          <PlanRevenueView
            key="by-plan"
            activeTab={activeTab}
            onSelectTab={selectTab}
            mode={mode}
            rows={planRows}
            status={plans.status}
            onRetry={plans.refetch}
          />
        )}
        {activeTab === 'refunds-ledger' && (
          <RefundsLedgerView key="refunds-ledger" onSelectTab={selectTab} period={period} />
        )}
        {activeTab === 'refunds' && (
          <RefundsView
            key="refunds"
            activeTab={activeTab}
            onSelectTab={selectTab}
            onFacts={setFacts}
          />
        )}
        {activeTab === 'credit-notes' && (
          <CreditNotesView
            key="credit-notes"
            activeTab={activeTab}
            onSelectTab={selectTab}
            onUnlinkedCount={setUnlinkedCount}
            onFacts={setFacts}
          />
        )}
        {activeTab === 'margin' && <ContributionMarginView key="margin" />}
      </div>
    </FinancialsPage>
  )
}

/**
 * What a sub-view still needs: the id it is (the CSV's `view` column) and a way
 * to send an operator to a sibling view from an empty state. **Not `tabs`** —
 * the view row is the screen's, rendered once above (D12).
 */
/** The two views with no figures of their own publish nothing. */
const noop = () => {}

interface ViewProps {
  activeTab: string
  onSelectTab: (id: string) => void
  /* **§10.4** — the view's figures belong on the screen's view row, and only
     the view's own rows know them (AC-355). Published, not rendered here. */
  onFacts?: (facts: ViewFacts | null) => void
}

/* ─────────────────────── the `contra.refunds` ledger ────────────────────── */

function RefundsLedgerView({
  onSelectTab,
  period,
}: Pick<ViewProps, 'onSelectTab'> & { period: { start: string; end: string } }) {
  const shell = useShell()
  const { t, language } = shell.language
  const table = useIndexTable({ mode: 'ledger' })

  const ledger = useAsync<Ledger>((signal) => getRefundsLedger(period, signal), {
    /* `period` is `{ start, end }` and both ends are here. */
    deps: [period.start, period.end],
    cacheKey: 'revenue.ledger',
    isEmpty: (data) => data.postings.length === 0,
  })

  /* The ledger client windows by date and does not search, so the toolbar's
     query narrows what was read — over the reference and the rendered
     description, which is what an operator is looking at. `table.isFiltered`
     therefore drives `no-match` exactly as it does on an index (**AC-427**). */
  const rows = useMemo<LedgerPosting[]>(() => {
    const all = ledger.data?.postings ?? []
    const needle = table.params.q?.trim().toLowerCase() ?? ''
    if (needle === '') return all
    return all.filter(
      (posting) =>
        (posting.reference ?? posting.id).toLowerCase().includes(needle) ||
        t(posting.description.key, posting.description.params).toLowerCase().includes(needle),
    )
  }, [ledger.data, table.params.q, t])

  const status =
    ledger.status === 'content' && rows.length === 0 ? 'empty' : ledger.status

  return (
    <LedgerCard
      table={table}
      ledger={ledger.data}
      status={status}
      rows={rows}
      t={t}
      language={language}
      tableId="financials-refunds-ledger"
      onRetry={ledger.refetch}
      hasHistory={(ledger.data?.lifetimePostings ?? 0) > 0}
      firstRun={{
        heading: t('fin.empty.firstRun.heading'),
        body: t('fin.empty.firstRun.body'),
        action: { label: t('fin.refund.empty.action'), onClick: () => onSelectTab('refunds') },
      }}
    />
  )
}

/* ─────────────────────────── revenue by plan ────────────────────────────── */

/**
 * The by-plan table's columns. Lifted out of the view so `Charts` mode can
 * export the same file `Table` mode does (§4.5) without mounting the table.
 *
 * **H6 (V-12)** — `preset` drops `Captain`, `Take rate %` and `ARPA` from the
 * default set: eleven columns measured **284px wider than the scroller** at the
 * 1280 floor, which is §7.3 rule 3 broken. `Columns` puts any of them back, and
 * the CSV takes every declared column whatever is on screen.
 */
function revenueByPlanColumns(
  t: Translate,
  language: Language,
  preset: boolean,
): DataColumn<RevenueByPlanRow>[] {
  return [
    {
      id: 'plan',
      emphasis: 'primary',
      csv: (plan) => plan.planName,
      header: t('fin.revenue.byPlan.plan'),
      dataType: 'text',
      minWidth: 160,
      sortField: 'planName',
      cell: (plan) => <span className="font-medium">{plan.planName}</span>,
    },
    {
      id: 'subs',
      header: t('fin.revenue.byPlan.subs'),
      dataType: 'number',
      align: 'end',
      width: 100,
      cell: (plan) => <span className="tabular-nums">{formatCount(plan.activeSubs, language)}</span>,
    },
    {
      id: 'trips',
      header: t('fin.revenue.byPlan.trips'),
      dataType: 'number',
      align: 'end',
      width: 90,
      cell: (plan) => <span className="tabular-nums">{formatCount(plan.trips, language)}</span>,
    },
    {
      id: 'gross',
      emphasis: 'data',
      csv: (plan) => plan.grossHalalas,
      header: t('fin.revenue.byPlan.gross'),
      dataType: 'money',
      align: 'end',
      width: 120,
      cell: (plan) => <MoneyCell amount={plan.grossHalalas} />,
    },
    {
      id: 'platform',
      csv: (plan) => plan.platformHalalas,
      header: t('fin.revenue.byPlan.platform'),
      dataType: 'money',
      align: 'end',
      width: 120,
      cell: (plan) => <MoneyCell amount={plan.platformHalalas} />,
    },
    {
      id: 'givebacks',
      csv: (plan) => plan.givebacksHalalas ?? 0,
      header: t('fin.revenue.byPlan.givebacks'),
      dataType: 'money',
      align: 'end',
      width: 120,
      cell: (plan) => <MoneyCell amount={plan.givebacksHalalas ?? 0} />,
    },
    {
      id: 'contribution',
      emphasis: 'data',
      csv: (plan) => plan.platformHalalas - (plan.givebacksHalalas ?? 0),
      header: t('fin.revenue.byPlan.contribution'),
      dataType: 'money',
      align: 'end',
      width: 130,
      cell: (plan) => <MoneyCell amount={plan.platformHalalas - (plan.givebacksHalalas ?? 0)} />,
    },
    {
      id: 'contributionPercent',
      header: t('fin.revenue.byPlan.contributionPercent'),
      dataType: 'number',
      align: 'end',
      width: 100,
      cell: (plan) => {
        const contrib = plan.platformHalalas - (plan.givebacksHalalas ?? 0)
        const value = percentOrNull(contrib, plan.grossHalalas)
        return (
          <span className="tabular-nums" aria-label={value === null ? ABSENT : undefined}>
            {value === null ? ABSENT : formatPercent(value, language)}
          </span>
        )
      },
    },
    {
      id: 'arpa',
      defaultHidden: preset,
      csv: (plan) => (plan.activeSubs === 0 ? null : Math.round(plan.grossHalalas / plan.activeSubs)),
      header: t('fin.revenue.byPlan.arpa'),
      dataType: 'money',
      align: 'end',
      width: 120,
      cell: (plan) => {
        if (plan.activeSubs === 0) {
          return <span className="tabular-nums" aria-label={ABSENT}>{ABSENT}</span>
        }
        const arpaHalalas = Math.round(plan.grossHalalas / plan.activeSubs)
        return <MoneyCell amount={arpaHalalas} />
      },
    },
    {
      id: 'captain',
      defaultHidden: preset,
      csv: (plan) => plan.captainHalalas,
      header: t('fin.revenue.byPlan.captain'),
      dataType: 'money',
      align: 'end',
      width: 120,
      cell: (plan) => <MoneyCell amount={plan.captainHalalas} />,
    },
    {
      id: 'platformPercent',
      defaultHidden: preset,
      header: t('fin.revenue.byPlan.platformPercent'),
      dataType: 'number',
      align: 'end',
      width: 100,
      /* **Derived** — `platform / gross` (M-4), and `null` when gross is zero
         so **AC-342**'s em dash renders rather than `0%`. */
      cell: (plan) => {
        const value = percentOrNull(plan.platformHalalas, plan.grossHalalas)
        return (
          <span className="tabular-nums" aria-label={value === null ? ABSENT : undefined}>
            {value === null ? ABSENT : formatPercent(value, language)}
          </span>
        )
      },
    },
  ]
}

/**
 * **AC-355** — every column's total row equals the sum of its data rows.
 *
 * The totals are computed here from the rows on screen rather than served, so
 * they cannot disagree with what is above them — the exact failure `12a` R12
 * records on the legacy header.
 */
function RevenueByPlanView({ activeTab, onSelectTab }: Pick<ViewProps, 'activeTab' | 'onSelectTab'>) {
  const shell = useShell()
  const { t, language } = shell.language
  const { period } = usePeriod()
  const table = useIndexTable<RevenueByPlanRow>({
    mode: 'queue',
    getRowId: (planRow) => planRow.planId,
  })

  const plans = useAsync<RevenueByPlanRow[]>((signal) => listRevenueByPlan(period, {}, signal), {
    deps: [period.start, period.end],
    cacheKey: 'revenue.byPlan',
  })

  /**
   * **The by-plan table sorts HERE, because its read cannot.**
   *
   * `listRevenueByPlan` takes a period and nothing else — no `sort`, no `page`,
   * no query at all — so the sort the toolbar records in the URL reached a
   * client that had no way to honour it. Every sortable column on this table
   * was inert: the menu opened, the caret moved, the rows did not.
   *
   * It is sorted in the screen rather than by teaching the client a query,
   * because there are six rows and no pagination — the whole result is already
   * in memory, and a `QueryShape` for a fixed six-row summary would be a query
   * engine standing in for an `Array.prototype.sort`.
   *
   * `planName` is the one text field; everything else on the row is a number,
   * so one comparator covers both. Nulls sort last ascending, which is the rule
   * `mock/query.ts` follows for the tables that DO have a query — the two must
   * not disagree about where an absent value goes.
   */
  const rows = useMemo(() => {
    const all = plans.data ?? []
    const sort = table.sort
    if (!sort) return all
    const read = (planRow: RevenueByPlanRow): string | number | null =>
      (planRow as unknown as Record<string, string | number | null>)[sort.field] ?? null
    const dir = sort.dir === 'desc' ? -1 : 1
    return [...all].sort((a, b) => {
      const left = read(a)
      const right = read(b)
      if (left === right) return 0
      if (left === null) return 1
      if (right === null) return -1
      return (typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right), ['ar', 'en'])) * dir
    })
  }, [plans.data, table.sort])

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, plan) => {
          const givebacks = plan.givebacksHalalas ?? 0
          const contribution = plan.platformHalalas - givebacks
          return {
            activeSubs: sum.activeSubs + plan.activeSubs,
            trips: sum.trips + plan.trips,
            grossHalalas: sum.grossHalalas + plan.grossHalalas,
            platformHalalas: sum.platformHalalas + plan.platformHalalas,
            captainHalalas: sum.captainHalalas + plan.captainHalalas,
            givebacksHalalas: sum.givebacksHalalas + givebacks,
            contributionHalalas: sum.contributionHalalas + contribution,
          }
        },
        {
          activeSubs: 0,
          trips: 0,
          grossHalalas: 0,
          platformHalalas: 0,
          captainHalalas: 0,
          givebacksHalalas: 0,
          contributionHalalas: 0,
        },
      ),
    [rows],
  )

  const columns = useMemo(() => revenueByPlanColumns(t, language, true), [t, language])

  return (
    <DataTable
      table={table}
      rows={rows}
      columns={columns}
      getRowId={(plan) => plan.planId}
      status={plans.status}
      total={rows.length}
      t={t}
      language={language}
      tableId="financials-revenue-by-plan"
      view={activeTab}
      searchPlaceholder={t('fin.pricing.plan.search')}
      skeletonPattern="P1"
      /* **V-11 — AC-355's total is a FOOTER ROW**, under the columns it totals,
         the way `LedgerCard` draws a closing balance. The card it replaces sat
         320px below the last row with nothing between them. */
      footerRow={{
        label: t('fin.revenue.byPlan.total'),
        cells: {
          subs: formatCount(totals.activeSubs, language),
          trips: formatCount(totals.trips, language),
          gross: <Money amount={totals.grossHalalas} unit="none" />,
          platform: <Money amount={totals.platformHalalas} unit="none" />,
          givebacks: <Money amount={totals.givebacksHalalas} unit="none" />,
          contribution: <Money amount={totals.contributionHalalas} unit="none" />,
          captain: <Money amount={totals.captainHalalas} unit="none" />,
        },
      }}
      firstRun={{
        heading: t('fin.pricing.plan.empty.heading'),
        body: t('fin.pricing.plan.empty.body'),
        actions: [
          { label: t('fin.pricing.plan.empty.action'), onClick: () => onSelectTab('refunds') },
        ],
      }}
      noMatch={{ message: t('fin.empty.noMatch') }}
      error={{ message: t('fin.error.read'), onRetry: plans.refetch }}
    />
  )
}

/* ───────────────── the plan master-detail (§4, FINANCIALS-UX-PLAN) ──────── */

/** `?mode=table` remembers the drawing; `charts` is the default and takes no param. */
function useDrawMode(): { mode: 'charts' | 'table'; setMode: (next: 'charts' | 'table') => void } {
  const location = useLocation()
  const navigate = useNavigate()
  const mode = new URLSearchParams(location.search).get('mode') === 'table' ? 'table' : 'charts'
  const setMode = useCallback(
    (next: 'charts' | 'table') => {
      const params = new URLSearchParams(location.search)
      if (next === 'table') params.set('mode', 'table')
      else params.delete('mode')
      const search = params.toString()
      navigate({ pathname: location.pathname, search: search === '' ? '' : `?${search}` })
    },
    [navigate, location.pathname, location.search],
  )
  return { mode, setMode }
}

/**
 * `?plan=` — foundation §3.8.3, a control over one resource is a search param.
 * No plan in the URL selects the first row, so the view has a record on first
 * paint and a link carrying a plan id opens on it (Pricing links here).
 */
function usePlanParam(): { planId: string | null; selectPlan: (id: string) => void } {
  const location = useLocation()
  const navigate = useNavigate()
  const planId = new URLSearchParams(location.search).get('plan')
  const selectPlan = useCallback(
    (id: string) => {
      const params = new URLSearchParams(location.search)
      params.set('plan', id)
      navigate({ pathname: location.pathname, search: `?${params.toString()}` })
    },
    [navigate, location.pathname, location.search],
  )
  return { planId, selectPlan }
}

/** The facts line under a plan's name. Two keys, because quick rides has no subs. */
function planFacts(plan: RevenueByPlanRow, t: Translate, language: Language): string {
  return plan.activeSubs === 0
    ? t('fin.revenue.plan.facts.noSubs', { trips: formatCount(plan.trips, language) })
    : t('fin.revenue.plan.facts', {
        subs: formatCount(plan.activeSubs, language),
        trips: formatCount(plan.trips, language),
      })
}

const contributionOf = (plan: RevenueByPlanRow): number =>
  plan.platformHalalas - (plan.givebacksHalalas ?? 0)

/** One decimal, the rounding `Metric.deltaPercent` promises. `null` on no base. */
function percentChange(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

function PlanRevenueView({
  activeTab,
  onSelectTab,
  mode,
  rows,
  status,
  onRetry,
}: ViewProps & {
  mode: 'charts' | 'table'
  /** The plans the screen read, so the row's `Export` and this view agree. */
  rows: readonly RevenueByPlanRow[]
  status: 'loading' | 'error' | 'empty' | 'content'
  onRetry: () => void
}) {
  const shell = useShell()
  const { t, language } = shell.language
  const { period } = usePeriod()
  const { planId, selectPlan } = usePlanParam()

  const selected = rows.find((plan) => plan.planId === planId) ?? rows[0] ?? null

  /* Arrow keys move the SELECTION, which is what the list is for; Home and End
     jump. Vertical, so nothing here is direction-sensitive (§9.1). */
  const listKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const at = rows.findIndex((plan) => plan.planId === selected?.planId)
    const next =
      event.key === 'ArrowDown'
        ? Math.min(rows.length - 1, at + 1)
        : event.key === 'ArrowUp'
          ? Math.max(0, at - 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? rows.length - 1
              : -1
    if (next === -1 || at === -1) return
    event.preventDefault()
    const plan = rows[next]
    if (!plan) return
    selectPlan(plan.planId)
    event.currentTarget.querySelectorAll('button')[next]?.focus()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {mode === 'table' ? (
        <RevenueByPlanView activeTab={activeTab} onSelectTab={onSelectTab} />
      ) : (
        <>
          {status === 'loading' && <LoadingSkeleton pattern="P5" />}
          {status === 'error' && (
            <ErrorState
              scope="card"
              message={t('fin.error.read')}
              action={{ label: t('fin.error.retry'), onClick: onRetry }}
            />
          )}
          {status === 'content' && rows.length === 0 && (
            <EmptyState
              kind="first-run"
              heading={t('fin.pricing.plan.empty.heading')}
              body={t('fin.pricing.plan.empty.body')}
              actions={[
                { label: t('fin.pricing.plan.empty.action'), onClick: () => onSelectTab('refunds') },
              ]}
            />
          )}
          {selected && (
            <MasterDetailPage
              list={
                <div className="flex flex-col gap-2">
                  <h2 className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('fin.revenue.plan.list')}
                  </h2>
                  <ul
                    aria-label={t('fin.revenue.plan.list')}
                    className="flex flex-col gap-1"
                    onKeyDown={listKeyDown}
                  >
                    {rows.map((plan) => (
                      <PlanListRow
                        key={plan.planId}
                        plan={plan}
                        selected={plan.planId === selected.planId}
                        period={period}
                        onSelect={() => selectPlan(plan.planId)}
                        t={t}
                        language={language}
                      />
                    ))}
                  </ul>
                </div>
              }
              detail={
                <PlanDetailPanel
                  key={selected.planId}
                  plan={selected}
                  period={period}
                  t={t}
                  language={language}
                />
              }
            />
          )}
        </>
      )}
    </div>
  )
}

/** One row of the plan list: name, gross, sparkline, facts, contribution %. */
function PlanListRow({
  plan,
  selected,
  period,
  onSelect,
  t,
  language,
}: {
  plan: RevenueByPlanRow
  selected: boolean
  period: FinancialsPeriod
  onSelect: () => void
  t: Translate
  language: Language
}) {
  const share = percentOrNull(contributionOf(plan), plan.grossHalalas)
  const from = formatDate(period.start + 'T00:00:00+03:00', { style: 'day-month', language })
  const to = formatDate(period.end + 'T00:00:00+03:00', { style: 'day-month', language })

  return (
    <li>
      <button
        type="button"
        /* AC-08's rule restated for a list: the state is `aria-current`, and
           the tint and the marker below are the two visible carriers (§7.5). */
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
        className={cn(
          'relative flex w-full flex-col gap-1 overflow-hidden rounded-lg p-2 text-start',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          selected ? 'bg-accent' : 'hover:bg-muted/60',
        )}
      >
        {/* V-13 — the 3px start-edge bar, `w-marker` and a logical inset, the
            geometry `RowCriticalMarker` uses. `bg-primary`, never the
            destructive hue: a selected row is not a critical one (R5a). */}
        {selected && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 start-0 w-marker bg-primary"
          />
        )}
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn('truncate text-sm', selected ? 'font-semibold' : 'font-medium')}>
            {plan.planName}
          </span>
          <span className="shrink-0 text-sm tabular-nums text-foreground">
            <bdi>
              <Money amount={plan.grossHalalas} unit="none" />
            </bdi>
          </span>
        </span>
        <Sparkline
          values={(plan.daily ?? []).map((point) => point.grossHalalas)}
          description={t('fin.revenue.plan.sparkline', { from, to })}
        />
        <span className="flex items-baseline justify-between gap-2 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
          <bdi className="truncate">{planFacts(plan, t, language)}</bdi>
          <span className="shrink-0 tabular-nums">
            {share === null ? ABSENT : formatPercent(share, language)}
          </span>
        </span>
      </button>
    </li>
  )
}

/**
 * The four detail tiles, as `Metric`s from a response that carries a real
 * comparison — the reading F-3 records, so nothing here is a minted literal.
 * `Contribution %` compares in POINTS: a change in a percentage is not a
 * percentage of a percentage.
 */
function planMetrics(
  detail: PlanRevenueDetail,
  period: FinancialsPeriod,
): ReadonlyArray<{ metric: Metric; points: boolean }> {
  const { row, comparison } = detail
  const prior = shiftPeriodMonths(period, -1)
  const contribution = contributionOf(row)
  const priorContribution = comparison ? contributionOf(comparison) : undefined
  const share = percentOrNull(contribution, row.grossHalalas)
  const priorShare = comparison ? percentOrNull(priorContribution ?? 0, comparison.grossHalalas) : null

  const build = (
    key: string,
    value: number | null,
    unit: Metric['unit'],
    deltaPercent: number | null,
    previous: number | null,
  ): Metric => ({
    key,
    subTabId: 'financials-revenue',
    category: 'revenue',
    value,
    /* R5-1 §1.3 — non-null iff the value is. A percentage over a zero gross is
       not computable, which is exactly what `percentOrNull` returned `null` for. */
    absenceReason: value === null ? 'not-computable' : null,
    unit,
    currency: unit === 'money' ? 'SAR' : null,
    asOf: detail.asOf,
    periodStart: period.start,
    periodEnd: period.end,
    comparison:
      previous === null
        ? { kind: 'none', reason: 'no-history' }
        : {
            kind: 'previous-period',
            value: previous,
            periodStart: prior.start,
            periodEnd: prior.end,
          },
    deltaPercent: previous === null ? null : deltaPercent,
    direction: deltaPercent === null ? null : deltaPercent > 0 ? 'up' : deltaPercent < 0 ? 'down' : 'flat',
    higherIsBetter: true,
    caption: null,
    sourceResource: null,
    drilldownRoute: null,
    rank: 'supporting',
  })

  return [
    {
      metric: build(
        'fin.revenue.plan.gross',
        row.grossHalalas,
        'money',
        percentChange(row.grossHalalas, comparison?.grossHalalas),
        comparison?.grossHalalas ?? null,
      ),
      points: false,
    },
    {
      metric: build(
        'fin.revenue.plan.platform',
        row.platformHalalas,
        'money',
        percentChange(row.platformHalalas, comparison?.platformHalalas),
        comparison?.platformHalalas ?? null,
      ),
      points: false,
    },
    {
      metric: build(
        'fin.revenue.plan.contribution',
        contribution,
        'money',
        percentChange(contribution, priorContribution),
        priorContribution ?? null,
      ),
      points: false,
    },
    {
      metric: build(
        'fin.revenue.plan.contributionPercent',
        share,
        'percent',
        share === null || priorShare === null ? null : Math.round((share - priorShare) * 10) / 10,
        priorShare,
      ),
      points: true,
    },
  ]
}

/** The end side: a facts header, four tiles, the day chart, the two panels. */
function PlanDetailPanel({
  plan,
  period,
  t,
  language,
}: {
  plan: RevenueByPlanRow
  period: FinancialsPeriod
  t: Translate
  language: Language
}) {
  const headingId = useId()
  const detail = useAsync<PlanRevenueDetail>(
    (signal) => getPlanRevenueDetail({ planId: plan.planId, period, signal }),
    { deps: [plan.planId, period.start, period.end], cacheKey: 'revenue.planDetail' },
  )

  const from = formatDate(period.start + 'T00:00:00+03:00', { style: 'day-month', language })
  const to = formatDate(period.end + 'T00:00:00+03:00', { style: 'day-month', language })
  const facts =
    plan.activeSubs === 0
      ? t('fin.revenue.plan.detail.facts.noSubs', {
          trips: formatCount(plan.trips, language),
          from,
          to,
        })
      : t('fin.revenue.plan.detail.facts', {
          subs: formatCount(plan.activeSubs, language),
          trips: formatCount(plan.trips, language),
          from,
          to,
        })

  const tiles = detail.data ? planMetrics(detail.data, period) : []
  const refundTotal = (detail.data?.refunds ?? []).reduce(
    (sum, refund) => sum + refund.amountHalalas,
    0,
  )
  const refundRate = percentOrNull(refundTotal, plan.grossHalalas)

  return (
    /* A named region, so the detail is addressable as one thing — by an
       operator moving with a screen reader, and by the test that asserts every
       figure repaints when the selection changes. */
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 id={headingId} className="text-lg font-semibold text-foreground">
          {plan.planName}
        </h2>
        {/* V-3 — the facts rung, in the console's own face (`MetricTile`'s
            eyebrow classes). `--ev-text-3` is 2.536:1 and is never text. */}
        <bdi className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
          {facts}
        </bdi>
      </div>

      {detail.status === 'loading' && <LoadingSkeleton pattern="P5" />}
      {detail.status === 'error' && (
        <ErrorState
          scope="card"
          message={t('fin.error.read')}
          action={{ label: t('fin.error.retry'), onClick: detail.refetch }}
        />
      )}

      {detail.data && (
        <>
          {/* V-14 — on a working page beside a list and a table a figure is a
              card, because the card is what separates it from the chrome. */}
          <ul className="grid grid-cols-2 gap-3 wide:grid-cols-4">
            {tiles.map(({ metric, points }) => (
              <li key={metric.key} className="min-w-0">
                <Card className="h-full gap-0">
                  <div className="px-(--card-spacing)">
                    <MetricTile
                      metric={metric}
                      boardAsOf={metric.asOf}
                      deltaUnit={points ? 'points' : 'percent'}
                      t={t}
                      language={language}
                    />
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          <Card className="gap-2">
            <div className="flex flex-col gap-2 px-(--card-spacing)">
              <h3 className="text-sm font-semibold text-foreground">
                {t('fin.revenue.plan.chart.heading')}
              </h3>
              <PlanDayChart
                daily={detail.data.daily}
                description={t('fin.revenue.plan.chart.description', { from, to })}
                t={t}
                language={language}
              />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-3 wide:grid-cols-2">
            <Card className="gap-2">
              <div className="flex flex-col gap-3 px-(--card-spacing)">
                <h3 className="text-sm font-semibold text-foreground">
                  {t('fin.revenue.plan.composition.heading')}
                </h3>
                <CompositionBar
                  totalHalalas={plan.grossHalalas}
                  language={language}
                  segments={[
                    {
                      id: 'captain',
                      label: t('fin.revenue.plan.composition.captain'),
                      amountHalalas: plan.captainHalalas,
                    },
                    {
                      id: 'givebacks',
                      label: t('fin.revenue.plan.composition.givebacks'),
                      amountHalalas: plan.givebacksHalalas ?? 0,
                    },
                    {
                      id: 'contribution',
                      label: t('fin.revenue.plan.composition.contribution'),
                      amountHalalas: contributionOf(plan),
                    },
                  ]}
                />
              </div>
            </Card>

            <Card className="gap-2">
              <div className="flex flex-col gap-2 px-(--card-spacing)">
                <h3 className="text-sm font-semibold text-foreground">
                  {t('fin.revenue.plan.refunds.heading')}
                </h3>
                {detail.data.refunds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('fin.revenue.plan.refunds.none')}
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {detail.data.refunds.map((refund) => (
                      <li
                        key={refund.id}
                        className="flex items-baseline gap-3 border-b border-border py-1 last:border-b-0"
                      >
                        {/* AC-474 — a refund is a document with no profile, so
                            the id is text and never a link. */}
                        <bdi className="text-sm tabular-nums text-foreground">{refund.id}</bdi>
                        <span className="flex-1 truncate text-sm text-muted-foreground">
                          {reasonLabel(t, refund.reasonCode)}
                        </span>
                        <span className="text-sm tabular-nums text-foreground">
                          <bdi>
                            <Money amount={refund.amountHalalas} unit="none" />
                          </bdi>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {/* §4.4 — the footer rate, `percentOrNull` so a zero gross is
                    an em dash rather than a manufactured `0%` (AC-342). */}
                <p className="pt-1 text-xs text-muted-foreground">
                  {t('fin.revenue.plan.refunds.rate', {
                    rate: refundRate === null ? ABSENT : formatPercent(refundRate, language),
                  })}
                </p>
              </div>
            </Card>
          </div>
        </>
      )}
    </section>
  )
}

/* ──────────────────────────── refund documents ─────────────────────────── */

function RefundsView({ activeTab, onSelectTab, onFacts }: ViewProps) {
  const shell = useShell()
  const { t, language } = shell.language
  const table = useIndexTable<Refund>({ mode: 'queue', getRowId: (refund) => refund.id })

  const refunds = useAsync<Paginated<Refund>>(
    (signal) => listRefunds({ ...table.params }, signal),
    { deps: [table.params], cacheKey: 'revenue.refunds' },
  )

  const rows = refunds.data?.items ?? []

  /* The three headline figures, off the rows on screen (AC-355's argument):
     how many refunds, how much went back, and how many name no payment. */
  const figures = useMemo(
    () => ({
      total: rows.reduce((sum, refund) => sum + refund.amountHalalas, 0),
      unsourced: rows.filter((refund) => refund.sourcePaymentId === null).length,
    }),
    [rows],
  )

  /* **§10.4 / AC-355** — every figure is of the rows on screen, so the row
     above the table cannot disagree with the table. */
  const facts = useMemo<ViewFacts | null>(
    () =>
      rows.length === 0
        ? null
        : {
            figures: [
              { label: t('fin.refund.header.count'), value: formatCount(rows.length, language) },
              { label: t('fin.refund.header.total'), amountHalalas: figures.total },
              {
                label: t('fin.refund.unsourced'),
                value: formatCount(figures.unsourced, language),
              },
            ],
          },
    [rows.length, figures, t, language],
  )
  usePublishFacts(onFacts ?? noop, facts)

  /**
   * **P8-T1** — the rider the refund went to.
   *
   * The refund id, the credit-note number and `processedByUserName` are **not**
   * entity links: a refund and a credit note are documents with no profile, and
   * an operator is not one of the six kinds `/entity/:id` resolves. Rendering
   * any of them as a link would be a guess about the route table (**AC-474**).
   *
   * **This view has no bulk bar either**, and that is not an omission: a refund
   * here is a *record of an issued refund*. It has no row action at all — the
   * act that creates one is `Issue a refund` in the PageHeader (**AC-477**) —
   * so there is no command to offer over a set.
   */
  const hrefFor = useEntityLinks(useMemo(() => rows.map((refund) => refund.riderId), [rows]))

  const columns = useMemo<DataColumn<Refund>[]>(
    () => [
      {
        id: 'id',
        emphasis: 'primary',
        csv: (refund) => refund.id,
        header: t('fin.refund.col.id'),
        dataType: 'id',
        minWidth: 160,
        sortField: 'id',
        cell: (refund) => (
          <span className="relative block font-medium tabular-nums">
            {/* R5a — a refund with no traceable payment is a warning row, not a
                fabricated link (§6.3). It carries the marker and says so. */}
            {refund.sourcePaymentId === null && <RowCriticalMarker />}
            <bdi>{refund.id}</bdi>
          </span>
        ),
        /* A3 — `PAY_REFUND_REQ` was the whole second line. A refund's reason is
           read here to answer "why did we give this back", which the code
           cannot answer and the sentence can. */
        secondaryLine: (refund) =>
          refund.sourcePaymentId === null
            ? t('fin.refund.unsourced')
            : reasonLabel(t, refund.reasonCode),
      },
      {
        id: 'rider',
        header: t('fin.refund.col.rider'),
        dataType: 'text',
        width: 180,
        sortField: 'riderName',
        cell: (refund) => (
          <EntityName href={hrefFor(refund.riderId)} name={refund.riderName} t={t} />
        ),
      },
      {
        id: 'amount',
        emphasis: 'data',
        csv: (refund) => refund.amountHalalas,
        header: t('fin.refund.col.amount'),
        dataType: 'money',
        align: 'end',
        width: 132,
        sortField: 'amountHalalas',
        cell: (refund) => <MoneyCell amount={refund.amountHalalas} />,
      },
      {
        id: 'destination',
        header: t('fin.refund.col.destination'),
        dataType: 'enum',
        width: 168,
        /* **AC-337** — one refund lands in exactly one place, and the row says
           which. Legacy credits both and the business pays twice (`12a` R1). */
        cell: (refund) => <span>{t(`fin.refund.destination.${refund.destination}`)}</span>,
        filter: {
          kind: 'select',
          field: 'destination',
          options: [
            { value: 'instrument', label: t('fin.refund.destination.instrument') },
            { value: 'wallet', label: t('fin.refund.destination.wallet') },
          ],
        },
      },
      {
        id: 'issued',
        header: t('fin.refund.col.issued'),
        dataType: 'date',
        width: 132,
        sortField: 'issuedAt',
        cell: (refund) => (
          <span className="tabular-nums">
            {formatDate(refund.issuedAt, { style: 'day-month', language })}
          </span>
        ),
      },
      {
        id: 'by',
        header: t('fin.refund.col.by'),
        dataType: 'text',
        width: 160,
        cell: (refund) => <span className="truncate">{refund.processedByUserName}</span>,
      },
    ],
    [t, language, hrefFor],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(refund) => refund.id}
        status={refunds.status}
        total={refunds.data?.total ?? 0}
        t={t}
        language={language}
        tableId="financials-refunds"
        view={activeTab}
        searchPlaceholder={t('fin.refund.search')}
        /* **§6.3 / R5a** — a refund with no traceable payment. The table used to
           reach for this itself with `r.sourcePaymentId === null && 'refundId'
           in r`, a clause that matched NO type in the product: `Refund` has no
           `refundId` and `CreditNote` has no `sourcePaymentId`. So the marker
           has been alone on these rows since it shipped. */
        isRowCritical={(refund) => refund.sourcePaymentId === null}
        skeletonPattern="P1"
        firstRun={{
          heading: t('fin.refund.empty.heading'),
          body: t('fin.refund.empty.body'),
          actions: [
            { label: t('fin.refund.empty.action'), onClick: () => onSelectTab('refunds-ledger') },
          ],
        }}
        noMatch={{ message: t('fin.empty.noMatch') }}
        error={{ message: t('fin.error.read'), onRetry: refunds.refetch }}
      />
    </div>
  )
}

/* ───────────────────────────── credit notes ─────────────────────────────── */

function CreditNotesView({
  activeTab,
  onSelectTab,
  onUnlinkedCount,
  onFacts,
}: ViewProps & { onUnlinkedCount: (count: number) => void }) {
  const shell = useShell()
  const { t, language } = shell.language
  const table = useIndexTable<CreditNote>({ mode: 'queue', getRowId: (note) => note.id })

  const notes = useAsync<Paginated<CreditNote>>(
    (signal) => listCreditNotes({ ...table.params }, signal),
    { deps: [table.params], cacheKey: 'revenue.creditNotes' },
  )

  const rows = notes.data?.items ?? []

  /* The headline figures, off the rows on screen. The page BANNER counts the
     population instead, and that is the difference between the two: a banner
     names a condition beyond this page, a header describes this page. */
  const figures = useMemo(
    () => ({
      vat: rows.reduce((sum, note) => sum + note.vatHalalas, 0),
      unlinked: rows.filter((note) => note.unlinked).length,
    }),
    [rows],
  )

  /* **§10.4 / AC-355** — of the rows on screen, above them. */
  const facts = useMemo<ViewFacts | null>(
    () =>
      rows.length === 0
        ? null
        : {
            figures: [
              {
                label: t('fin.creditNote.header.count'),
                value: formatCount(rows.length, language),
              },
              { label: t('fin.creditNote.header.vat'), amountHalalas: figures.vat },
              {
                label: t('fin.creditNote.unlinked'),
                value: formatCount(figures.unlinked, language),
              },
            ],
          },
    [rows.length, figures, t, language],
  )
  usePublishFacts(onFacts ?? noop, facts)

  /* **P8-T1** — the buyer. A buyer is a rider or a corporate account and both
     resolve; the note number, the refund id and `againstInvoice` are documents
     and stay text. */
  const hrefFor = useEntityLinks(useMemo(() => rows.map((note) => note.buyerId), [rows]))

  /* **AC-356's count is of the population, not of the page.** A count of what
     is on screen understates the moment there are two pages, which is the same
     argument §4.4 makes for a queue's breach banner. */
  const unlinked = useAsync<Paginated<CreditNote>>(
    (signal) => listCreditNotes({ view: 'unlinked', pageSize: 1 }, signal),
    /* Constant query; `[]` cannot collide with the index read's `[{...}]`. */
    { deps: [], cacheKey: 'revenue.creditNotes' },
  )
  const unlinkedTotal = unlinked.data?.total ?? 0
  useEffect(() => {
    onUnlinkedCount(unlinkedTotal)
    return () => onUnlinkedCount(0)
  }, [unlinkedTotal, onUnlinkedCount])

  const columns = useMemo<DataColumn<CreditNote>[]>(
    () => [
      {
        id: 'number',
        header: t('fin.creditNote.col.number'),
        dataType: 'id',
        minWidth: 210,
        sortField: 'noteNumber',
        cell: (note) => (
          <span className="relative block font-medium tabular-nums">
            {/* **AC-356** — the row-level critical signal, plus the words in the
                cell below, plus the page banner. Three parts, no badge. */}
            {note.unlinked && <RowCriticalMarker />}
            <bdi>{note.noteNumber}</bdi>
          </span>
        ),
        secondaryLine: (note) => note.refundId,
      },
      {
        id: 'buyer',
        header: t('fin.creditNote.col.buyer'),
        dataType: 'text',
        width: 180,
        cell: (note) => <EntityName href={hrefFor(note.buyerId)} name={note.buyerName} t={t} />,
      },
      {
        id: 'subtotal',
        header: t('fin.creditNote.col.subtotal'),
        dataType: 'money',
        align: 'end',
        width: 124,
        cell: (note) => <MoneyCell amount={note.subtotalHalalas} />,
      },
      {
        id: 'vat',
        header: t('fin.creditNote.col.vat'),
        dataType: 'money',
        align: 'end',
        width: 116,
        /* **AC-338 / AC-345** — VAT is the residual, so net + VAT is the total
           to the halala. Nothing here recomputes it from a rate. */
        cell: (note) => <MoneyCell amount={note.vatHalalas} />,
      },
      {
        id: 'total',
        header: t('fin.creditNote.col.total'),
        dataType: 'money',
        align: 'end',
        width: 124,
        sortField: 'totalHalalas',
        cell: (note) => <MoneyCell amount={note.totalHalalas} />,
      },
      {
        id: 'invoice',
        header: t('fin.creditNote.col.invoice'),
        dataType: 'text',
        width: 180,
        /* **AC-356** — it never displays an invoice number it did not match.
           `null` says so in words rather than borrowing the rider's first paid
           payment, which is what `:15857` does. */
        cell: (note) =>
          note.againstInvoice === null ? (
            <span className="text-foreground">{t('fin.creditNote.unlinked')}</span>
          ) : (
            <span className="truncate tabular-nums">
              <bdi>{note.againstInvoice}</bdi>
            </span>
          ),
        filter: {
          kind: 'boolean',
          field: 'unlinked',
          trueLabel: t('fin.creditNote.unlinked'),
          falseLabel: t('fin.creditNote.col.invoice'),
        },
      },
      {
        id: 'issued',
        header: t('fin.creditNote.col.issued'),
        dataType: 'date',
        width: 132,
        sortField: 'issuedAt',
        /* **AC-360** — the date it was issued, from the record. Legacy freezes
           it (`12a` R18). */
        cell: (note) => (
          <span className="tabular-nums">
            {formatDate(note.issuedAt, { style: 'day-month', language })}
          </span>
        ),
      },
    ],
    [t, language],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(note) => note.id}
        status={notes.status}
        total={notes.data?.total ?? 0}
        t={t}
        language={language}
        tableId="financials-credit-notes"
        view={activeTab}
        searchPlaceholder={t('fin.creditNote.search')}
        /* **AC-356 / R5a** — the third of the three parts, beside the marker and
           the page banner, and now declared rather than duck-typed. */
        isRowCritical={(note) => note.unlinked}
        skeletonPattern="P1"
        firstRun={{
          heading: t('fin.creditNote.empty.heading'),
          body: t('fin.creditNote.empty.body'),
          actions: [{ label: t('fin.creditNote.empty.action'), onClick: () => onSelectTab('refunds') }],
        }}
        noMatch={{ message: t('fin.empty.noMatch') }}
        error={{ message: t('fin.error.read'), onRetry: notes.refetch }}
      />
    </div>
  )
}

/* ────────────────────────── contribution margin ─────────────────────────── */

/**
 * **AC-347** — the gross-margin value here and Overview's tile are the same
 * number, to the halala, because both call `marginBreakdown()` on the same
 * response. **AC-361** — both percentages render, each labelled, and the gross
 * figure is never presented alone.
 */
function ContributionMarginView() {
  const shell = useShell()
  const { t, language } = shell.language
  const { period } = usePeriod()

  const overview = useAsync<FinancialsOverview>(
    (signal) => getFinancialsOverview({ period, signal }),
    /* Same operation, same deps and same shape as `OverviewScreen`'s read, so
       the two deliberately share one entry - moving between the two sub-tabs on
       the same period paints instead of refetching. */
    { deps: [period.start, period.end], cacheKey: 'financials.overview', isEmpty: () => false },
  )

  const margin = useMemo(
    () => (overview.data ? marginBreakdown(overview.data) : null),
    [overview.data],
  )

  return (
    <div className="flex flex-col gap-3">
      {overview.status === 'loading' && <LoadingSkeleton pattern="P5" />}
      {overview.status === 'error' && (
        <ErrorState
          scope="card"
          message={t('fin.error.read')}
          action={{ label: t('fin.error.retry'), onClick: overview.refetch }}
        />
      )}

      {margin && (
        <>
          <FigureGrid>
            <FigureItem>
              <Figure label={t('fin.overview.grossMargin')} amount={margin.grossMarginHalalas} />
            </FigureItem>
            <FigureItem>
              <Figure
                label={t('fin.overview.grossMarginPercent')}
                value={<Percent value={margin.grossMarginPercent} language={language} />}
              />
            </FigureItem>
            <FigureItem>
              <Figure
                label={t('fin.overview.contributionPercent')}
                value={<Percent value={margin.contributionMarginPercent} language={language} />}
              />
            </FigureItem>
          </FigureGrid>

          <Card className="gap-2">
            <div className="flex flex-col px-(--card-spacing)">
              <h2 className="pb-1 text-sm font-semibold text-foreground">
                {t('fin.overview.margin.heading')}
              </h2>
              {/* §H5 — AC-347 says this card and Overview's are the same
                  number, so they are the same card: the operators state what
                  each line DOES to the running total. */}
              <FigureRow
                operator={null}
                label={t('fin.overview.gross')}
                amount={margin.grossBookingsHalalas}
              />
              <FigureRow
                operator="subtract"
                label={t('fin.overview.captainEarnings')}
                amount={margin.captainEarningsHalalas}
              />
              <FigureRow
                operator="equals"
                label={t('fin.overview.grossMargin')}
                amount={margin.grossMarginHalalas}
              />
              <FigureRow
                operator="subtract"
                label={t('fin.overview.giveback')}
                amount={margin.givebackHalalas}
              />
              <FigureRow
                operator="equals"
                label={t('fin.overview.contributionMargin')}
                amount={margin.contributionMarginHalalas}
                emphasis
              />
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
