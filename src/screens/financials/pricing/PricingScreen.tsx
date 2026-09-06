/**
 * Financials › Pricing & Plans — **Stage A** — spec §5 row 6, §4.5, §6.7,
 * **AC-389–401**, **AC-409–414**.
 *
 * ## What ships, and what is absent rather than stubbed
 *
 * **Q7 is unanswered** — which of four stores is authoritative for rates,
 * commission and discount is a Finance-lead decision (§4). So the catalogue
 * half of a plan is editable, the pricing half renders in §4.6's **disabled**
 * treatment under one page-level banner, and the rate card is read-only in
 * full. Every Stage-B write — propose, approve, publish, edit a rate — is
 * **absent, not stubbed**: a stub is a promise the screen would be making.
 *
 * **AC-402–408 are BLOCKED and are not built.** They are not marked passing
 * anywhere in this file, and nothing here approximates them.
 *
 * Rules applied
 *   §4.5 / R10 **one banner**, `info` and not `warning`: nothing is wrong, one
 *              thing is undecided, and a warning tone would read as an error
 *              on a page whose numbers are all correct.
 *   AC-389     four views on ONE route, as view tabs, with `Subscription plans`
 *              default. None is a navigation level and none is in the path.
 *   AC-410     **no control here raises a surge multiplier.** Operations may
 *              only suspend, and the suspension control is the only write on
 *              the surge card.
 *   AC-RC-*    the `Rate card` view is `design/financials-pricing-rate-card.md`
 *              and lives in `RateCardBlock.tsx` and `SurgeCards.tsx`.
 *   AC-414     a cancellation rule with no enforcement path renders a visible
 *              `Stored, never applied` state. Five of the eight have none
 *              (**D-F7**) and they never render as though they were live.
 *   AC-404/405 both `Approve` refusals are stated at RENDER, on the control,
 *              before anybody clicks — the proposer's own draft and the draft
 *              with no simulation. Legacy refuses at commit (`:21586`).
 */

import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listCancellationRules,
  listPlans,
  listQuickRideTypes,
  listRevenueByPlan,
} from '@/data/clients'
import type {
  CancellationRule,
  FinancialsPeriod,
  QuickRideType,
  RevenueByPlanRow,
  SubTabRoute,
  SubscriptionPlan,
} from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatPercent } from '@/lib'
import type { BannerModel } from '@/components/Banner'
import { DataTable, type DataColumn, type RowAction } from '@/components/DataTable'
import { ViewSwitcher } from '@/components/table/ViewSwitcher'
import { MoneyCell } from '@/components/Money'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useShell } from '@/shell/ShellContext'
import { FinancialsPage, usePeriod, useWriteGate } from '../shared/FinancialsPage'
import { PeriodControl } from '../shared/PeriodControl'
import { ViewRow } from '../shared/ViewRow'
import { localisedText } from '../shared/text'
import { RateCardBlock } from './RateCardBlock'
import { SurgeCards } from './SurgeCards'
import { useScreenViews, type ScreenView } from '@/hooks'

/** **AC-389** — the four views the route table declares, read from it. */
const VIEWS: readonly ScreenView[] = [
  { id: 'subscription-plans', titleKey: 'view.pricing.subscriptionPlans' },
  { id: 'quick-rides', titleKey: 'view.pricing.quickRides' },
  { id: 'rate-card', titleKey: 'view.pricing.rateCard' },
  { id: 'cancellation-fees', titleKey: 'view.pricing.cancellationFees' },
]

const DEFAULT_VIEW = 'subscription-plans'

export function PricingScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, dir, language } = shell.language
  const gate = useWriteGate(row, t)
  const { period, setPeriod } = usePeriod()
  const navigate = useNavigate()

  /* The route table carries this sub-tab's views; the screen's constant is the
     fallback for a row that has not been given them. Where the table has them,
     they win — renaming a view stays a data change (§11.3). */
  const views = useMemo<readonly ScreenView[]>(
    () =>
      row.views.length > 0
        ? [...row.views]
            .sort((a, b) => a.order - b.order)
            .map((view) => ({ id: view.id, titleKey: view.titleKey }))
        : VIEWS,
    [row.views],
  )
  const { tabs, activeTab, selectTab } = useScreenViews(views, DEFAULT_VIEW, t)

  /* §4.5 — ONE standing condition, and `info` rather than `warning`. R10 — the
     body is about a plan's catalogue, which the Rate card view does not have,
     and its second half is the pane footer this view deleted. */
  const banners = useMemo<BannerModel[]>(
    () => [
      {
        id: 'fin.pricing.stageA',
        tone: 'info',
        title: t('fin.pricing.stageA.title'),
        body: activeTab === 'rate-card' ? undefined : t('fin.pricing.stageA.body'),
      },
    ],
    [t, activeTab],
  )

  /**
   * **Q-F13, decided per read.** `listPlans`, `listQuickRideTypes`,
   * `listRateCards` and `listCancellationRules` take a signal and nothing else;
   * `listRevenueByPlan(period)` takes `from` / `to`. So the period is stated
   * and controlled on the one view that honours it — a control that moves
   * nothing is **TL-2** in the other direction.
   */
  const windowed = activeTab === 'subscription-plans'

  return (
    <FinancialsPage
      row={row}
      /* **R2-1's constant strip.** A meta line on one of four views moved the
         view row between them. The period is not lost: `PeriodControl` on the
         title row prints the range it changes, so the line under the title was
         the same sentence a second time (V4). */
      meta={null}
      /* §8 slot 4c - the period rides the title row, on the one view whose
         read honours it (Q-F13 / TL-2). */
      periodControl={
        windowed ? (
          <PeriodControl period={period} onChange={setPeriod} t={t} language={language} />
        ) : undefined
      }
      /* **ONE view row, in one place, on all four views** (D12) — it was the
         `DataTable` toolbar's stadium on three views and a row of hand-rolled
         pills above the cards on `Rate card`, so the strip changed shape and
         moved on every click. */
      viewRow={
        <ViewRow
          label={tabs.find((tab) => tab.id === activeTab)?.label ?? ''}
          lead={<ViewSwitcher tabs={tabs} activeTab={activeTab} onSelectTab={selectTab} />}
          /* §12 — the screen's one primary, on the two catalogue views. It
             opens the editor blank; the gate is `manage_plans`, stated on the
             disabled control rather than refused after a click. */
          control={
            activeTab === 'subscription-plans' || activeTab === 'quick-rides' ? (
              <Button
                variant="default"
                disabled={!gate.canWrite}
                title={gate.canWrite ? undefined : gate.reason}
                onClick={() =>
                  navigate(
                    activeTab === 'quick-rides'
                      ? '/financials/pricing/quick-rides/new'
                      : '/financials/pricing/plans/new',
                  )
                }
              >
                {t(activeTab === 'quick-rides' ? 'fin.pricing.quick.add' : 'fin.pricing.plan.add')}
              </Button>
            ) : undefined
          }
        />
      }
      banners={banners}
      t={t}
      dir={dir}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {activeTab === 'subscription-plans' && (
          <PlansView
            key="plans"
            activeTab={activeTab}
            onSelectTab={selectTab}
            period={period}
          />
        )}
        {activeTab === 'quick-rides' && (
          <QuickRidesView key="quick" activeTab={activeTab} onSelectTab={selectTab} />
        )}
        {activeTab === 'rate-card' && <RateCardView key="rate" gate={gate} />}
        {activeTab === 'cancellation-fees' && (
          <CancellationView key="cancel" activeTab={activeTab} onSelectTab={selectTab} />
        )}
      </div>
    </FinancialsPage>
  )
}

/**
 * What a sub-view still needs: the id it is (the CSV's `view` column) and a way
 * to send an operator to a sibling view from an empty state. **Not `tabs`** —
 * the view row is the screen's, rendered once above (D12).
 */
interface ViewProps {
  activeTab: string
  onSelectTab: (id: string) => void
}

/* ─────────────────────────── subscription plans ────────────────────────── */

function PlansView({
  activeTab,
  onSelectTab,
  period,
}: ViewProps & { period: FinancialsPeriod }) {
  const shell = useShell()
  const { t, language } = shell.language
  const navigate = useNavigate()
  const table = useIndexTable<SubscriptionPlan>({ mode: 'queue', getRowId: (plan) => plan.id })

  const plans = useAsync<SubscriptionPlan[]>((signal) => listPlans(signal), {
    deps: [],
    cacheKey: 'pricing.plans',
  })
  const rows = plans.data ?? []

  /**
   * **§5.4 — the join is `SubscriptionPlan.id === RevenueByPlanRow.planId`**, a
   * plain string match: the id is `PlanKey`, and the only `planId` outside that
   * union is `quick-ride`, which is not a plan and has no row here. A plan with
   * no revenue row renders the em dash, never a zero (**AC-341**).
   */
  const revenue = useAsync<RevenueByPlanRow[]>(
    (signal) => listRevenueByPlan(period, {}, signal),
    { deps: [period.start, period.end], cacheKey: 'revenue.byPlan' },
  )
  const grossByPlan = useMemo(() => {
    const byPlan = new Map<string, number>()
    for (const each of revenue.data ?? []) byPlan.set(each.planId, each.grossHalalas)
    return byPlan
  }, [revenue.data])

  const columns = useMemo<DataColumn<SubscriptionPlan>[]>(
    () => [
      {
        id: 'name',
        emphasis: 'primary',
        csv: (plan) => plan.nameEn,
        header: t('fin.pricing.plan.col.name'),
        dataType: 'text',
        minWidth: 200,
        sortField: 'nameEn',
        cell: (plan) => <span className="font-medium">{plan.nameEn}</span>,
        /* Both names are required on save (`:6125`), so both are shown. */
        secondaryLine: (plan) => <bdi dir="rtl">{plan.nameAr}</bdi>,
      },
      {
        id: 'duration',
        header: t('fin.pricing.plan.col.duration'),
        dataType: 'number',
        align: 'end',
        width: 116,
        cell: (plan) => (
          <span className="tabular-nums">
            {t('fin.pricing.plan.days', { count: formatCount(plan.durationDays, language) })}
          </span>
        ),
      },
      {
        id: 'execute',
        header: t('fin.pricing.plan.col.execute'),
        dataType: 'number',
        align: 'end',
        width: 100,
        /* **V-12** — §7.3 rule 3 budgets `Σ px + identity floor ≤ 910`, and the
           gross column takes 160 of it. With all seven declared, every fixed
           column squeezed to 76px and four headers wrapped mid-word. The leg
           count and the discount are on the editor behind the row, so they are
           off by default and one click away in `Columns`. */
        defaultHidden: true,
        cell: (plan) => (
          <span className="tabular-nums">{formatCount(plan.executeDays, language)}</span>
        ),
      },
      {
        id: 'commission',
        header: t('fin.pricing.plan.col.commission'),
        dataType: 'number',
        align: 'end',
        width: 132,
        cell: (plan) => (
          <span className="tabular-nums">{formatPercent(plan.commissionPercent, language)}</span>
        ),
      },
      {
        id: 'discount',
        header: t('fin.pricing.plan.col.discount'),
        dataType: 'number',
        align: 'end',
        width: 124,
        /* Off by default with `execute`; see the note there. */
        defaultHidden: true,
        cell: (plan) => (
          <span className="tabular-nums">{formatPercent(plan.discountPercent, language)}</span>
        ),
      },
      {
        id: 'gross',
        emphasis: 'data',
        csv: (plan) => grossByPlan.get(plan.id) ?? '',
        header: t('fin.pricing.plan.col.gross'),
        dataType: 'money',
        align: 'end',
        width: 160,
        cell: (plan) => <MoneyCell amount={grossByPlan.get(plan.id) ?? null} />,
      },
      {
        id: 'status',
        emphasis: 'data',
        header: t('fin.pricing.plan.col.status'),
        dataType: 'enum',
        width: 120,
        cell: (plan) => (
          <StatusBadge tone={plan.status === 'active' ? 'success' : plan.status === 'draft' ? 'info' : 'neutral'}>
            {t(`fin.pricing.plan.status.${plan.status}`)}
          </StatusBadge>
        ),
      },
    ],
    [t, language, grossByPlan],
  )

  /**
   * **R2-4** — one inline action, and opening the plan is the ROW. Pricing is
   * the catalogue; a plan's money page is the Revenue master-detail, so a plain
   * click on the row — and `Enter` on the focused row, through the same door —
   * opens it there, and the lane holds the one act that changes the catalogue.
   */
  const openRevenue = useCallback(
    (plan: SubscriptionPlan) =>
      navigate(`/financials/revenue?view=by-plan&plan=${encodeURIComponent(plan.id)}`),
    [navigate],
  )

  const rowActions = useMemo<RowAction<SubscriptionPlan>[]>(
    () => [
      {
        label: t('fin.pricing.plan.action.edit'),
        /* **AC-390** — the editor is a route outside the layout, so entering it
           unmounts the rail, the sub-tab column and the top bar. */
        onSelect: (plan) => navigate(`/financials/pricing/plans/${plan.id}/edit`),
      },
    ],
    [t, navigate],
  )

  return (
    <DataTable
      table={table}
      rows={rows}
      columns={columns}
      getRowId={(plan) => plan.id}
      status={plans.status}
      total={rows.length}
      t={t}
      language={language}
      tableId="financials-plans"
      view={activeTab}
      searchPlaceholder={t('fin.pricing.plan.search')}
      skeletonPattern="P1"
      onRowClick={openRevenue}
      rowActions={rowActions}
      firstRun={{
        heading: t('fin.pricing.plan.empty.heading'),
        body: t('fin.pricing.plan.empty.body'),
        actions: [{ label: t('fin.pricing.plan.empty.action'), onClick: () => onSelectTab('rate-card') }],
      }}
      noMatch={{ message: t('fin.empty.noMatch') }}
      error={{ message: t('fin.error.read'), onRetry: plans.refetch }}
    />
  )
}

/* ───────────────────────────── quick rides ─────────────────────────────── */

function QuickRidesView({ activeTab, onSelectTab }: ViewProps) {
  const shell = useShell()
  const { t, language } = shell.language
  const navigate = useNavigate()
  const table = useIndexTable<QuickRideType>({ mode: 'queue', getRowId: (type) => type.id })

  const types = useAsync<QuickRideType[]>((signal) => listQuickRideTypes(signal), {
    deps: [],
    cacheKey: 'pricing.quickRides',
  })
  const rows = types.data ?? []

  const columns = useMemo<DataColumn<QuickRideType>[]>(
    () => [
      {
        id: 'name',
        emphasis: 'primary',
        csv: (type) => type.name,
        header: t('fin.pricing.quick.col.name'),
        dataType: 'text',
        minWidth: 200,
        sortField: 'name',
        cell: (type) => <span className="font-medium">{type.name}</span>,
        /* Both names are required on save, so both are shown (§12). */
        secondaryLine: (type) => <bdi dir="rtl">{type.nameAr}</bdi>,
      },
      {
        id: 'base',
        emphasis: 'data',
        csv: (type) => type.baseFareHalalas,
        header: t('fin.pricing.quick.col.base'),
        dataType: 'money',
        align: 'end',
        width: 140,
        cell: (type) => <MoneyCell amount={type.baseFareHalalas} />,
      },
      {
        id: 'perKm',
        emphasis: 'data',
        csv: (type) => type.perKmHalalas,
        header: t('fin.pricing.quick.col.perKm'),
        dataType: 'money',
        align: 'end',
        width: 132,
        cell: (type) => <MoneyCell amount={type.perKmHalalas} />,
      },
      {
        id: 'perMin',
        emphasis: 'data',
        csv: (type) => type.perMinHalalas,
        header: t('fin.pricing.quick.col.perMin'),
        dataType: 'money',
        align: 'end',
        width: 148,
        cell: (type) => <MoneyCell amount={type.perMinHalalas} />,
      },
      {
        id: 'active',
        header: t('fin.pricing.quick.col.active'),
        dataType: 'boolean',
        width: 128,
        cell: (type) => (
          <StatusBadge tone={type.active ? 'success' : 'neutral'}>
            {type.active ? t('fin.pricing.quick.yes') : t('fin.pricing.quick.no')}
          </StatusBadge>
        ),
      },
    ],
    [t],
  )

  /* A class has no money page of its own, so the row IS the editor (R2-4):
     a click, and Enter on the focused row, open it; the lane repeats it. */
  const openEditor = useCallback(
    (type: QuickRideType) =>
      navigate(`/financials/pricing/quick-rides/${encodeURIComponent(type.id)}/edit`),
    [navigate],
  )
  const rowActions = useMemo<RowAction<QuickRideType>[]>(
    () => [{ label: t('fin.pricing.plan.action.edit'), onSelect: openEditor }],
    [t, openEditor],
  )

  return (
    <DataTable
      table={table}
      rows={rows}
      columns={columns}
      getRowId={(type) => type.id}
      status={types.status}
      total={rows.length}
      t={t}
      language={language}
      tableId="financials-quick-rides"
      view={activeTab}
      searchPlaceholder={t('fin.pricing.quick.search')}
      skeletonPattern="P1"
      onRowClick={openEditor}
      rowActions={rowActions}
      firstRun={{
        heading: t('fin.pricing.quick.empty.heading'),
        body: t('fin.pricing.quick.empty.body'),
        actions: [{ label: t('fin.pricing.quick.empty.action'), onClick: () => onSelectTab('rate-card') }],
      }}
      noMatch={{ message: t('fin.empty.noMatch') }}
      error={{ message: t('fin.error.read'), onRetry: types.refetch }}
    />
  )
}

/* ────────────────────────────── the rate card ──────────────────────────── */

/**
 * The view composes and does not read: the block owns the one rate-card read
 * and the surge cards own theirs, so one failing read never blanks another.
 */
function RateCardView({ gate }: { gate: { canWrite: boolean; reason: string } }) {
  /* Its own column, and `shrink-0`: the screen's content region is a
     constrained flex column, so a bare card here is shrunk below its content
     and `Card`'s `overflow-hidden` then clips the pane. §4.2 — a change of
     subject costs 24px, whether it is a rule inside a card or a gap between
     two of them. */
  return (
    <div className="flex shrink-0 flex-col gap-6">
      <RateCardBlock gate={gate} />
      <SurgeCards gate={gate} />
    </div>
  )
}

/* ───────────────────────── cancellation fees ───────────────────────────── */

function CancellationView({ activeTab, onSelectTab }: ViewProps) {
  const shell = useShell()
  const { t, language } = shell.language
  const table = useIndexTable<CancellationRule>({ mode: 'queue', getRowId: (rule) => rule.id })

  const rules = useAsync<CancellationRule[]>((signal) => listCancellationRules(signal), {
    deps: [],
    cacheKey: 'pricing.cancellationRules',
  })
  const rows = rules.data ?? []

  const unenforced = rows.filter((rule) => !rule.hasEnforcement).length

  const columns = useMemo<DataColumn<CancellationRule>[]>(
    () => [
      {
        id: 'scenario',
        header: t('fin.pricing.cancel.col.scenario'),
        dataType: 'text',
        minWidth: 260,
        cell: (rule) => <span className="font-medium">{localisedText(t, rule.scenario)}</span>,
        /* **AC-414** — a rule with no enforcement path says so in words, on the
           row. It never renders as though it were live. */
        secondaryLine: (rule) =>
          rule.hasEnforcement
            ? rule.note
              ? localisedText(t, rule.note)
              : null
            : t('fin.pricing.cancel.notEnforced'),
      },
      {
        id: 'appliesTo',
        header: t('fin.pricing.cancel.col.appliesTo'),
        dataType: 'enum',
        width: 160,
        cell: (rule) => <span>{t(`fin.pricing.cancel.appliesTo.${rule.appliesTo}`)}</span>,
      },
      {
        id: 'fee',
        header: t('fin.pricing.cancel.col.fee'),
        dataType: 'money',
        align: 'end',
        width: 168,
        /* The discriminated union, rendered as one: a quick-ride rule charges a
           flat fee and a subscription rule charges a percentage of the refund.
           There is no row that can show both, because the type cannot hold
           both (§6.7). */
        cell: (rule) =>
          rule.appliesTo === 'quick_ride' ? (
            rule.locked ? (
              <span className="block text-end">{t('fin.pricing.cancel.locked')}</span>
            ) : (
              <MoneyCell amount={rule.feeHalalas} />
            )
          ) : (
            <span className="block text-end tabular-nums">
              {t('fin.pricing.cancel.feePercent', { percent: String(rule.feePercent) })}
            </span>
          ),
      },
      {
        id: 'enabled',
        header: t('fin.pricing.cancel.col.enabled'),
        dataType: 'boolean',
        width: 132,
        cell: (rule) => (
          <StatusBadge tone={rule.enabled ? 'success' : 'neutral'}>
            {rule.enabled
              ? t('fin.pricing.cancel.enabled.yes')
              : t('fin.pricing.cancel.enabled.no')}
          </StatusBadge>
        ),
      },
    ],
    [t],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {unenforced > 0 && (
        <Card className="gap-1">
          <div className="flex flex-col gap-1 px-(--card-spacing)">
            <span className="text-sm font-semibold text-foreground">
              {t('fin.pricing.cancel.notEnforced.title')}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('fin.pricing.cancel.notEnforced.body')}
            </span>
          </div>
        </Card>
      )}
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(rule) => rule.id}
        status={rules.status}
        total={rows.length}
        t={t}
        language={language}
        tableId="financials-cancellation"
        view={activeTab}
        searchPlaceholder={t('fin.pricing.cancel.search')}
        skeletonPattern="P1"
        firstRun={{
          heading: t('fin.pricing.cancel.empty.heading'),
          body: t('fin.pricing.cancel.empty.body'),
          actions: [
            { label: t('fin.pricing.cancel.empty.action'), onClick: () => onSelectTab('rate-card') },
          ],
        }}
        noMatch={{ message: t('fin.empty.noMatch') }}
        error={{ message: t('fin.error.read'), onRetry: rules.refetch }}
      />
    </div>
  )
}

