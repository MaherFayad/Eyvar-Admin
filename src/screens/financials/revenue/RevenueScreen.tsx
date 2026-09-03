/**
 * Financials › Revenue & Refunds — spec §5 row 2, §6.3, **AC-354–361**.
 *
 * ## The view list, and the one place it departs from §5
 *
 * §5 lists `All postings · Revenue · Refunds · Credit notes · Contribution
 * margin`. Two of those cannot be built as named, and the reason is the sign
 * convention rather than a shortfall in the data:
 *
 *   - **`All postings` across two accounts is not a ledger.** §3.2: `debit` and
 *     `credit` mean nothing on their own, every ledger declares **one** subject
 *     account, and `direction` is relative to it — which is what **AC-308**'s
 *     sub-line states. A table mixing `revenue.fares` and `contra.refunds` rows
 *     would have two normal sides in one Balance column. So the ledger here is
 *     `contra.refunds`, and the view says which account it is.
 *   - **`revenue.fares` has no subject ledger.** It is a platform revenue
 *     account, credited by journal entries; no posting in the dataset carries
 *     `subjectAccount: 'revenue.fares'`, and inventing one to fill a view is
 *     the fabrication §6.3 forbids elsewhere. Revenue is served as
 *     `Revenue by plan`, computed from postings (**AC-355**), which is what
 *     §6.3's own table specifies.
 *
 * Both are reported in the handoff as findings against §5's view list, not
 * resolved by a fixture.
 *
 * Rules applied
 *   §8.3 / AC-354
 *              the refunds ledger is a ledger: no selection, no sort, no row
 *              action but the source link — enforced by `mode: 'ledger'`.
 *   §9.3       a table with no bulk action renders **no checkbox column**. The
 *              three document tables here have none, so they mount `queue`
 *              furniture: sortable headers, row actions, no selection.
 *   R5a / AC-356
 *              an unmatched credit note takes the 3px row marker, the words in
 *              its own cell, and ONE page banner with a count. Never a badge,
 *              and never an invoice number it did not match.
 *   AC-360     a credit note's issue date is rendered from `issuedAt`, so two
 *              notes issued on different days carry different dates.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  getFinancialsOverview,
  getRefundsLedger,
  listCreditNotes,
  listRefunds,
  listRevenueByPlan,
} from '@/data/clients'
import type {
  CreditNote,
  FinancialsOverview,
  Ledger,
  LedgerPosting,
  Paginated,
  Refund,
  RevenueByPlanRow,
  SubTabRoute,
} from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { ABSENT, formatCount, formatDate, formatPercent } from '@/lib'
import type { BannerModel } from '@/components/Banner'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { Money, MoneyCell } from '@/components/Money'
import { RowCriticalMarker } from '@/components/StatusBadge'
import { Card } from '@/components/ui/card'
import { reasonLabel } from '@/i18n/vocabulary/copy'
import { useShell } from '@/shell/ShellContext'
import { EntityName, useEntityLinks } from '../shared/entityLinks'
import { LedgerCard } from '../shared/LedgerCard'
import { FinancialsPage, periodLabel, usePeriod } from '../shared/FinancialsPage'
import { PeriodControl } from '../shared/PeriodControl'
import { Figure, FigureGrid, FigureItem, FigureRow, Percent } from '../shared/Figures'
import { marginBreakdown, percentOrNull } from '../shared/derive'
import { useScreenViews, type ScreenView } from '../shared/views'

const VIEWS: readonly ScreenView[] = [
  { id: 'all', titleKey: 'fin.revenue.view.all' },
  { id: 'revenue', titleKey: 'fin.revenue.view.revenue' },
  { id: 'refunds', titleKey: 'fin.revenue.view.refunds' },
  { id: 'credit-notes', titleKey: 'fin.revenue.view.creditNotes' },
  { id: 'margin', titleKey: 'fin.revenue.view.margin' },
]

/** §5 — `All postings` is the default on a ledger sub-tab: it describes a resource. */
const DEFAULT_VIEW = 'all'

export function RevenueScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, dir, language } = shell.language
  const { period, setPeriod } = usePeriod()
  const { tabs, activeTab, selectTab } = useScreenViews(VIEWS, DEFAULT_VIEW, t)

  /* The banner state is lifted so the page renders **one** banner whichever
     view is mounted (R10). Only the credit-note view can raise one here. */
  const [unlinkedCount, setUnlinkedCount] = useState(0)

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

  return (
    <FinancialsPage
      row={row}
      meta={periodLabel(period, t, language)}
      banners={activeTab === 'credit-notes' ? banners : []}
      t={t}
      dir={dir}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <PeriodControl period={period} onChange={setPeriod} t={t} language={language} />

        {activeTab === 'all' && (
          <RefundsLedgerView
            key="all"
            tabs={tabs}
            activeTab={activeTab}
            onSelectTab={selectTab}
            period={period}
          />
        )}
        {activeTab === 'revenue' && (
          <RevenueByPlanView key="revenue" tabs={tabs} activeTab={activeTab} onSelectTab={selectTab} />
        )}
        {activeTab === 'refunds' && (
          <RefundsView key="refunds" tabs={tabs} activeTab={activeTab} onSelectTab={selectTab} />
        )}
        {activeTab === 'credit-notes' && (
          <CreditNotesView
            key="credit-notes"
            tabs={tabs}
            activeTab={activeTab}
            onSelectTab={selectTab}
            onUnlinkedCount={setUnlinkedCount}
          />
        )}
        {activeTab === 'margin' && (
          <ContributionMarginView key="margin" tabs={tabs} activeTab={activeTab} onSelectTab={selectTab} />
        )}
      </div>
    </FinancialsPage>
  )
}

interface ViewProps {
  tabs: readonly { id: string; label: string }[]
  activeTab: string
  onSelectTab: (id: string) => void
}

/* ─────────────────────── the `contra.refunds` ledger ────────────────────── */

function RefundsLedgerView({
  tabs,
  activeTab,
  onSelectTab,
  period,
}: ViewProps & { period: { start: string; end: string } }) {
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
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
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
 * **AC-355** — every column's total row equals the sum of its data rows.
 *
 * The totals are computed here from the rows on screen rather than served, so
 * they cannot disagree with what is above them — the exact failure `12a` R12
 * records on the legacy header.
 */
function RevenueByPlanView({ tabs, activeTab, onSelectTab }: ViewProps) {
  const shell = useShell()
  const { t, language } = shell.language
  const { period } = usePeriod()
  const table = useIndexTable<RevenueByPlanRow>({
    mode: 'queue',
    getRowId: (planRow) => planRow.planId,
  })

  const plans = useAsync<RevenueByPlanRow[]>((signal) => listRevenueByPlan(period, signal), {
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

  const columns = useMemo<DataColumn<RevenueByPlanRow>[]>(
    () => [
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
        csv: (plan) => plan.captainHalalas,
        header: t('fin.revenue.byPlan.captain'),
        dataType: 'money',
        align: 'end',
        width: 120,
        cell: (plan) => <MoneyCell amount={plan.captainHalalas} />,
      },
      {
        id: 'platformPercent',
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
    ],
    [t, language],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
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
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        searchPlaceholder={t('fin.pricing.plan.search')}
        skeletonPattern="P1"
        firstRun={{
          heading: t('fin.pricing.plan.empty.heading'),
          body: t('fin.pricing.plan.empty.body'),
          actions: [{ label: t('fin.pricing.plan.empty.action'), onClick: () => onSelectTab('all') }],
        }}
        noMatch={{ message: t('fin.empty.noMatch') }}
        error={{ message: t('fin.error.read'), onRetry: plans.refetch }}
      />

      {plans.status === 'content' && (
        <Card className="gap-1">
          <div className="flex flex-wrap items-baseline justify-between gap-3 px-(--card-spacing)">
            <span className="text-sm font-semibold text-foreground">
              {t('fin.revenue.byPlan.total')}
            </span>
            <span className="flex flex-wrap items-baseline gap-4 text-sm tabular-nums">
              <span>
                {t('fin.revenue.byPlan.subs')} {formatCount(totals.activeSubs, language)}
              </span>
              <span>
                {t('fin.revenue.byPlan.trips')} {formatCount(totals.trips, language)}
              </span>
              <span>
                {t('fin.revenue.byPlan.gross')} <Money amount={totals.grossHalalas} unit="none" />
              </span>
              <span>
                {t('fin.revenue.byPlan.platform')}{' '}
                <Money amount={totals.platformHalalas} unit="none" />
              </span>
              <span>
                {t('fin.revenue.byPlan.captain')}{' '}
                <Money amount={totals.captainHalalas} unit="none" />
              </span>
            </span>
          </div>
        </Card>
      )}
    </div>
  )
}

/* ──────────────────────────── refund documents ─────────────────────────── */

function RefundsView({ tabs, activeTab, onSelectTab }: ViewProps) {
  const shell = useShell()
  const { t, language } = shell.language
  const table = useIndexTable<Refund>({ mode: 'queue', getRowId: (refund) => refund.id })

  const refunds = useAsync<Paginated<Refund>>(
    (signal) => listRefunds({ ...table.params }, signal),
    { deps: [table.params], cacheKey: 'revenue.refunds' },
  )

  const rows = refunds.data?.items ?? []

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
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
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
        actions: [{ label: t('fin.refund.empty.action'), onClick: () => onSelectTab('all') }],
      }}
      noMatch={{ message: t('fin.empty.noMatch') }}
      error={{ message: t('fin.error.read'), onRetry: refunds.refetch }}
    />
  )
}

/* ───────────────────────────── credit notes ─────────────────────────────── */

function CreditNotesView({
  tabs,
  activeTab,
  onSelectTab,
  onUnlinkedCount,
}: ViewProps & { onUnlinkedCount: (count: number) => void }) {
  const shell = useShell()
  const { t, language } = shell.language
  const table = useIndexTable<CreditNote>({ mode: 'queue', getRowId: (note) => note.id })

  const notes = useAsync<Paginated<CreditNote>>(
    (signal) => listCreditNotes({ ...table.params }, signal),
    { deps: [table.params], cacheKey: 'revenue.creditNotes' },
  )

  const rows = notes.data?.items ?? []

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
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
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
  )
}

/* ────────────────────────── contribution margin ─────────────────────────── */

/**
 * **AC-347** — the gross-margin value here and Overview's tile are the same
 * number, to the halala, because both call `marginBreakdown()` on the same
 * response. **AC-361** — both percentages render, each labelled, and the gross
 * figure is never presented alone.
 */
function ContributionMarginView({ tabs, activeTab, onSelectTab }: ViewProps) {
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
      {/* The view row is the table toolbar's on every other view; this one has
          no table, so the tabs render as the same control above the cards. */}
      <ViewTabs tabs={tabs} activeTab={activeTab} onSelectTab={onSelectTab} />

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
              <FigureRow label={t('fin.overview.gross')} amount={margin.grossBookingsHalalas} />
              <FigureRow
                label={t('fin.overview.captainEarnings')}
                amount={margin.captainEarningsHalalas}
              />
              <FigureRow label={t('fin.overview.grossMargin')} amount={margin.grossMarginHalalas} />
              <FigureRow label={t('fin.overview.giveback')} amount={margin.givebackHalalas} />
              <FigureRow
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

/**
 * The view row, for a view with no table under it.
 *
 * `DataTable` owns the toolbar on every other view (§5.3), and a view that
 * mounts cards instead of a table still needs the same control in the same
 * place — otherwise switching to it makes the tabs disappear, and an operator
 * has no way back that does not involve the browser's Back button.
 */
export function ViewTabs({ tabs, activeTab, onSelectTab }: ViewProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          /* **Not `role="tab"`.** A tab role owes a `tabpanel` and an
             `aria-controls`, and these controls change a search param rather
             than swapping a panel inside one widget. `aria-pressed` states what
             is true — this view is the one selected — without claiming a widget
             structure the page does not have. */
          aria-pressed={tab.id === activeTab}
          onClick={() => onSelectTab(tab.id)}
          className={
            tab.id === activeTab
              ? 'rounded-lg bg-accent px-2.5 py-1.5 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              : 'rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
