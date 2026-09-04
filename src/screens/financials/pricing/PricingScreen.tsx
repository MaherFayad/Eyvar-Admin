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
 *   AC-414     a cancellation rule with no enforcement path renders a visible
 *              `Stored, never applied` state. Five of the eight have none
 *              (**D-F7**) and they never render as though they were live.
 *   AC-404/405 both `Approve` refusals are stated at RENDER, on the control,
 *              before anybody clicks — the proposer's own draft and the draft
 *              with no simulation. Legacy refuses at commit (`:21586`).
 */

import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getLiveRateCard,
  listCancellationRules,
  listPlans,
  listQuickRideTypes,
  listRateCards,
  listRevenueByPlan,
  listSurgeSuspensions,
  listSurgeWindows,
  listZones,
  suspendSurge,
} from '@/data/clients'
import { SURGE_SUSPENSION_MAX_HOURS } from '@/data/types'
import type {
  CancellationRule,
  FinancialsPeriod,
  Paginated,
  QuickRideType,
  RateCard,
  RevenueByPlanRow,
  SubTabRoute,
  SubscriptionPlan,
  SurgeSuspension,
  SurgeWindow,
  Zone,
} from '@/data/types'
import { useAsync, useIndexTable, useNow } from '@/hooks'
import { formatCount, formatDate, formatDuration, formatMoney, formatPercent } from '@/lib'
import type { BannerModel } from '@/components/Banner'
import { DataTable, type DataColumn, type RowAction } from '@/components/DataTable'
import { ViewSwitcher } from '@/components/table/ViewSwitcher'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { MoneyCell } from '@/components/Money'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useShell } from '@/shell/ShellContext'
import { ConfirmMoneyDialog, type MoneyConfirmRequest } from '../shared/ConfirmMoneyDialog'
import { FigureRow } from '../shared/Figures'
import { FinancialsPage, usePeriod, useWriteGate } from '../shared/FinancialsPage'
import { PeriodControl } from '../shared/PeriodControl'
import { localisedText } from '../shared/text'
import { useMoneyActions } from '../shared/actions'
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

  /* §4.5 — ONE standing condition, and `info` rather than `warning`. */
  const banners = useMemo<BannerModel[]>(
    () => [
      {
        id: 'fin.pricing.stageA',
        tone: 'info',
        title: t('fin.pricing.stageA.title'),
        body: t('fin.pricing.stageA.body'),
      },
    ],
    [t],
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
      viewRow={<ViewSwitcher tabs={tabs} activeTab={activeTab} onSelectTab={selectTab} />}
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

function RateCardView({ gate }: { gate: { canWrite: boolean; reason: string } }) {
  const shell = useShell()
  const { t, language } = shell.language
  const currentUserId = shell.session?.userId ?? ''

  /**
   * **Two reads, one operation id.** `clients/pricing.ts` gives BOTH
   * `getLiveRateCard` (`:249`) and `listRateCards` (`:236`) the id
   * `pricing.rateCards`, and both run here with no parameters. Keyed on the
   * operation id alone they would collide on `pricing.rateCards::[]` while
   * returning different shapes - a `RateCard` served where a `RateCard[]` is
   * expected, which is a `.map is not a function` and not merely stale rows.
   *
   * So the dep says WHICH rate card is being asked for. It is a constant, and
   * that is the point: it is the thing that distinguishes the two requests, and
   * `useAsync.ts:66-72` requires it to be in `deps` for the key to be honest.
   * `invalidate('pricing.rateCards')` still clears both.
   */
  const live = useAsync<RateCard>((signal) => getLiveRateCard(signal), {
    deps: ['live'],
    cacheKey: 'pricing.rateCards',
  })
  const cards = useAsync<RateCard[]>((signal) => listRateCards(signal), {
    deps: [],
    cacheKey: 'pricing.rateCards',
  })

  return (
    <div className="flex flex-col gap-3">
      {live.status === 'loading' && <LoadingSkeleton pattern="P4" />}
      {live.status === 'error' && (
        <ErrorState
          scope="card"
          message={t('fin.error.read')}
          action={{ label: t('fin.error.retry'), onClick: live.refetch }}
        />
      )}
      {live.status === 'empty' && (
        <Card className="gap-1">
          <div className="px-(--card-spacing) text-sm text-muted-foreground">
            {t('fin.pricing.rateCard.empty.body')}
          </div>
        </Card>
      )}

      {live.data && <RateCardCard card={live.data} t={t} language={language} />}

      {(cards.data ?? [])
        .filter((card) => card.status !== 'live')
        .map((card) => (
          <RateCardCard
            key={card.version}
            card={card}
            t={t}
            language={language}
            approve={{
              canWrite: gate.canWrite,
              currentUserId,
            }}
          />
        ))}

      <SurgeCard gate={gate} />
    </div>
  )
}

function RateCardCard({
  card,
  t,
  language,
  approve,
}: {
  card: RateCard
  t: ReturnType<typeof useShell>['language']['t']
  language: ReturnType<typeof useShell>['language']['language']
  approve?: { canWrite: boolean; currentUserId: string }
}) {
  /* **AC-404 / AC-405** — both refusals are properties of the draft, read at
     render. A proposer cannot approve their own card, and a card nobody
     modelled cannot be approved at all. */
  const proposedByMe = approve !== undefined && card.proposedByUserId === approve.currentUserId
  const noSimulation = card.simulation === null
  const approveBlockedReason = !approve
    ? null
    : proposedByMe
      ? t('fin.pricing.rateCard.approve.blocked.proposer')
      : noSimulation
        ? t('fin.pricing.rateCard.approve.blocked.simulation')
        : t('fin.pricing.rateCard.approve.blocked.stage')

  return (
    <Card className="gap-2">
      <div className="flex flex-col gap-2 px-(--card-spacing)">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            {t('fin.pricing.rateCard.heading', { version: card.version })}
          </h2>
          <StatusBadge tone={card.status === 'live' ? 'success' : card.status === 'draft' ? 'info' : 'neutral'}>
            {t(`fin.pricing.rateCard.status.${card.status}`)}
          </StatusBadge>
        </div>

        <p className="text-xs text-muted-foreground">
          {card.effectiveTo === null
            ? t('fin.pricing.rateCard.effective', {
                date: formatDate(`${card.effectiveFrom}T00:00:00+03:00`, {
                  style: 'day-month',
                  language,
                }),
              })
            : t('fin.pricing.rateCard.effectiveUntil', {
                from: formatDate(`${card.effectiveFrom}T00:00:00+03:00`, {
                  style: 'day-month',
                  language,
                }),
                to: formatDate(`${card.effectiveTo}T00:00:00+03:00`, {
                  style: 'day-month',
                  language,
                }),
              })}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('fin.pricing.rateCard.commission', {
            onDemand: String(card.commission.onDemandPercent),
            subscription: String(card.commission.subscriptionPercent),
          })}
        </p>
        {card.vatIncluded && (
          <p className="text-xs text-muted-foreground">{t('fin.pricing.rateCard.vatIncluded')}</p>
        )}

        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th scope="col" className="py-1 text-start font-medium">
                {t('fin.pricing.rateCard.col.class')}
              </th>
              <th scope="col" className="py-1 text-end font-medium">
                {t('fin.pricing.rateCard.col.base')}
              </th>
              <th scope="col" className="py-1 text-end font-medium">
                {t('fin.pricing.rateCard.col.perKm')}
              </th>
              <th scope="col" className="py-1 text-end font-medium">
                {t('fin.pricing.rateCard.col.perMin')}
              </th>
              <th scope="col" className="py-1 text-end font-medium">
                {t('fin.pricing.rateCard.col.minFare')}
              </th>
              <th scope="col" className="py-1 text-end font-medium">
                {t('fin.pricing.rateCard.col.cancelFee')}
              </th>
            </tr>
          </thead>
          <tbody>
            {card.classes.map((vehicleClass) => (
              <tr key={vehicleClass.id}>
                <td className="py-1 text-foreground">{vehicleClass.label}</td>
                <td className="py-1 text-end">
                  <MoneyCell amount={vehicleClass.baseHalalas} />
                </td>
                <td className="py-1 text-end">
                  <MoneyCell amount={vehicleClass.perKmHalalas} />
                </td>
                <td className="py-1 text-end">
                  <MoneyCell amount={vehicleClass.perMinHalalas} />
                </td>
                <td className="py-1 text-end">
                  <MoneyCell amount={vehicleClass.minFareHalalas} />
                </td>
                <td className="py-1 text-end">
                  <MoneyCell amount={vehicleClass.cancelFeeHalalas} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-xs text-muted-foreground">
          {card.simulation === null
            ? t('fin.pricing.rateCard.noSimulation')
            : t('fin.pricing.rateCard.simulation', {
                trips: formatCount(card.simulation.trips, language),
                before: formatMoney(card.simulation.riderBeforeHalalas),
                after: formatMoney(card.simulation.riderAfterHalalas),
                delta: String(card.simulation.deltaPercent),
              })}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('fin.pricing.rateCard.floors', {
            margin: String(card.floors.targetMarginPercent),
            support: formatMoney(card.floors.supportCostPerSubscriberHalalas),
            fee: String(card.floors.paymentFeePercent),
            reserve: String(card.floors.emergencyReservePercent),
          })}
        </p>

        {approve && (
          <div>
            {/* **Stage B is BLOCKED (AC-403–406) and this control is disabled in
                place with the reason on it.** It is not a stub: it commits
                nothing and promises nothing, and the reason names the open
                question rather than implying a permission problem. */}
            <Button variant="secondary" size="xs" disabled title={approveBlockedReason ?? undefined}>
              {t('fin.pricing.rateCard.approve')}
            </Button>
            {approveBlockedReason && (
              <p className="pt-1 text-xs text-muted-foreground">{approveBlockedReason}</p>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

/* ──────────────────────────────── surge ────────────────────────────────── */

function SurgeCard({ gate }: { gate: { canWrite: boolean; reason: string } }) {
  const shell = useShell()
  const { t } = shell.language
  const actions = useMoneyActions<SurgeSuspension>({ keyOf: (suspension) => suspension.id })
  const [request, setRequest] = useState<MoneyConfirmRequest | null>(null)

  const windows = useAsync<SurgeWindow[]>((signal) => listSurgeWindows(signal), {
    deps: [],
    cacheKey: 'pricing.surgeWindows',
  })
  const suspensions = useAsync<SurgeSuspension[]>((signal) => listSurgeSuspensions(signal), {
    deps: [],
    cacheKey: 'pricing.surgeSuspensions',
  })
  /* **Deliberately NOT cached (P3-13).** `zones.list` is the Zones surface's
     operation and this is a parameterless read of it, so a `deps: []` key here
     would be claimed by whichever of the two screens mounts first. Zones is
     owned elsewhere; keying against a surface I cannot read is how two agents
     ship incompatible answers to one key. */
  const zones = useAsync<Paginated<Zone>>((signal) => listZones({ signal }), { deps: [] })

  /* **AC-409** — a live countdown, against the shared clock. One interval for
     the whole app; never a `setInterval` per row. */
  const now = useNow(30, true)

  const suspend = useCallback(
    (zone: Zone) => {
      setRequest({
        title: t('fin.pricing.surge.suspend.title', { zone: zone.name }),
        body: t('fin.pricing.surge.suspend.body'),
        confirmLabel: t('fin.pricing.surge.suspend.confirm'),
        /* **AC-411** — the primary is disabled until a reason is entered. */
        reason: {
          label: t('fin.pricing.surge.suspend.reason.label'),
          help: t('fin.pricing.surge.suspend.reason.help', {
            hours: String(SURGE_SUSPENSION_MAX_HOURS),
          }),
          message: t('fin.pricing.surge.suspend.reason.message'),
        },
        onConfirm: ({ reason }) => {
          void actions
            .run({
              key: zone.id,
              errorMessage: t('fin.error.row'),
              toastMessage: t('fin.pricing.surge.toast.suspended'),
              action: () =>
                suspendSurge({
                  zoneId: zone.id,
                  zoneName: zone.name,
                  reason,
                  /* **AC-409** — it cannot be created for more than 12 hours,
                     and the ceiling is the data layer's constant rather than a
                     number typed here. */
                  hours: SURGE_SUSPENSION_MAX_HOURS,
                }),
            })
            .then(() => {
              setRequest(null)
              suspensions.refetch()
            })
        },
      })
    },
    [actions, t, suspensions],
  )

  const live = suspensions.data ?? []

  return (
    <>
      <Card className="gap-2">
        <div className="flex flex-col gap-2 px-(--card-spacing)">
          <h2 className="text-sm font-semibold text-foreground">
            {t('fin.pricing.surge.heading')}
          </h2>
          {/* **AC-410** — stated, and true: there is no control on this card
              that raises a multiplier. */}
          <p className="text-xs text-muted-foreground">{t('fin.pricing.surge.readOnly')}</p>

          {(windows.data ?? []).map((window) => (
            <FigureRow
              key={window.id}
              label={t('fin.pricing.surge.window', {
                label: window.label,
                days: window.days.join(' '),
                start: String(window.startHour),
                end: String(window.endHour),
              })}
              value={
                <span>
                  {t('fin.pricing.surge.multiplier', { value: String(window.multiplier) })}
                  {' · '}
                  {window.enabled ? t('fin.pricing.surge.enabled') : t('fin.pricing.surge.disabled')}
                </span>
              }
            />
          ))}

          <h3 className="pt-2 text-sm font-semibold text-foreground">
            {t('fin.pricing.surge.suspensions')}
          </h3>
          {live.length === 0 && (
            <p className="text-xs text-muted-foreground">{t('fin.pricing.surge.suspension.none')}</p>
          )}
          {live.map((suspension) => {
            const remainingMs = Date.parse(suspension.expiresAt) - Date.parse(now)
            return (
              <FigureRow
                key={suspension.id}
                label={t('fin.pricing.surge.suspension', {
                  zone: suspension.zoneName,
                  reason: suspension.reason,
                })}
                value={
                  <span>
                    {remainingMs <= 0
                      ? t('fin.pricing.surge.suspension.expired')
                      : t('fin.pricing.surge.suspension.expires', {
                          duration: formatDuration(remainingMs),
                        })}
                  </span>
                }
              />
            )
          })}

          <div className="flex flex-wrap gap-1 pt-2">
            {(zones.data?.items ?? []).map((zone) => (
              <Button
                key={zone.id}
                variant="secondary"
                size="xs"
                disabled={!gate.canWrite}
                title={gate.canWrite ? undefined : gate.reason}
                onClick={() => suspend(zone)}
              >
                {zone.name}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t('fin.pricing.surge.suspend')}</p>
        </div>
      </Card>
      <ConfirmMoneyDialog
        request={request}
        onClose={() => setRequest(null)}
        busy={actions.busy}
        t={t}
      />
    </>
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

