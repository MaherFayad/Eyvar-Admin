/**
 * Operations › People — view **Riders**. Design spec §9.1, §9.4 (`index`).
 *
 * **The columns.** The legacy roster (`renderRidersTable`,
 * `eyvar_ops_panel_v40_fixed.html:6406`–`:6440`) shows ten: rider with a tier
 * star and `id · phone` beneath, plan, vehicle type, a "health" pill, sub
 * count, renewal rate, lifetime value, churn risk, status, and two buttons.
 *
 *   kept        rider · status · rating · churn risk · city · trips · lifetime
 *               value · renewal rate.
 *   added       **`Wallet (SAR)`**, because `walletBalanceHalalas` may be
 *               NEGATIVE — `types/rider.ts` says nothing in the legacy app
 *               prevents it and no spec says what happens below zero, and the
 *               fixtures carry an overdrawn wallet precisely so the screen has
 *               to show it. A roster that hides a negative balance is how that
 *               question keeps not being asked.
 *   dropped     "health" (`riderHealth`, `:6402`) — it is `complaints.length`
 *               and `rating < 4` recomputed at render, which is §8.2's
 *               three-screens-three-answers defect, and `churnRisk` is the
 *               server-derived field that already answers it.
 *   dropped     plan and vehicle type — both are read off `subs[0]`'s plan
 *               STRING by `split(' ')[0]` and an `indexOf('Comfort')`, on the
 *               first subscription only. That is a subscription's fact, not a
 *               rider's; Operations › Subscriptions owns it.
 *
 * Rules applied
 *   §8.3.1/§8.3.2
 *               money is integer halalas through `Money`; a negative renders
 *               with **U+2212**, never a hyphen, never parentheses, never
 *               colour alone, and never inside a badge.
 *   §9.1/AC-43  the identity links to the 360° profile layer.
 *   §8.3.1      `renewalRatePercent: null` is `—` (no renewal history), which
 *               is not `0%`. The legacy string `'—'` becomes a real null on
 *               the wire and the distinction survives.
 *   R7          `on-demand` is `info` ("not yet live"), `subscriber` is
 *               `success`. Churn risk is warning at medium AND high — R17's
 *               ONE warning tone, separated by the label.
 */

import { useLocation, useNavigate } from 'react-router-dom'
import { listRiders } from '@/data/clients'
import type { Paginated, Rider } from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate, type Language, type Translate } from '@/lib'
import { Money } from '@/components/Money'
import { StatusBadge } from '@/components/StatusBadge'
import { withOverlay } from '@/shell/routeState'
import { Absent, Cell, DateCell, Identity, MutedCell, NumCell } from './cells'
import { CHURN_RISK, RIDER_STATUS, RIDER_TIER } from './domain'
import { PeopleTable, type PeopleColumn } from './PeopleTable'
import { VIEW_CAPTAINS, type ViewChrome } from './views'

export function RidersView({ chrome, t, language }: ViewChrome) {
  const location = useLocation()
  const navigate = useNavigate()

  const table = useIndexTable<Rider>({
    mode: 'index',
    getRowId: (rider) => rider.id,
    initialSort: { field: 'name', dir: 'asc' },
  })

  const data = useAsync<Paginated<Rider>>((signal) => listRiders({ ...table.params }, signal), {
    deps: [table.params],
  })

  const profileHref = (id: string) =>
    `${location.pathname}${withOverlay(location.search, 'entity', id)}`

  return (
    <PeopleTable
      t={t}
      table={table}
      rows={data.data?.items ?? []}
      status={data.status}
      total={data.data?.total ?? 0}
      getRowId={(rider) => rider.id}
      columns={riderColumns(t, language, profileHref)}
      skeletonPattern="P1"
      {...chrome}
      searchPlaceholder={t('people.search.riders')}
      sortFields={[
        { field: 'name', label: t('people.col.rider') },
        { field: 'rating', label: t('people.col.rating') },
        { field: 'totalTrips', label: t('people.col.trips') },
        { field: 'walletBalanceHalalas', label: t('people.col.wallet') },
        { field: 'lifetimeValueHalalas', label: t('people.col.ltv') },
        { field: 'renewalRatePercent', label: t('people.col.renewal') },
        { field: 'lastTripAt', label: t('people.col.lastTrip') },
        { field: 'joinedAt', label: t('people.col.joined') },
      ]}
      filterFields={[
        {
          field: 'status',
          label: t('people.filter.field.status'),
          options: [
            { value: 'subscriber', label: t('people.riderStatus.subscriber') },
            { value: 'on-demand', label: t('people.riderStatus.onDemand') },
          ],
        },
        {
          field: 'churnRisk',
          label: t('people.filter.field.churnRisk'),
          options: [
            { value: 'high', label: t('people.churn.high') },
            { value: 'medium', label: t('people.churn.medium') },
            { value: 'low', label: t('people.churn.low') },
          ],
        },
        {
          field: 'tier',
          label: t('people.filter.field.tier'),
          options: [
            { value: 'gold', label: t('people.tier.gold') },
            { value: 'silver', label: t('people.tier.silver') },
            { value: 'bronze', label: t('people.tier.bronze') },
            { value: 'new', label: t('people.tier.new') },
          ],
        },
      ]}
      rowActions={[
        {
          label: t('people.action.viewProfile'),
          onSelect: (rider) => navigate(profileHref(rider.id)),
        },
      ]}
      firstRun={{
        heading: t('people.empty.riders.heading'),
        body: t('people.empty.riders.body'),
        actions: [
          {
            label: t('people.empty.riders.primary'),
            primary: true,
            onClick: () => chrome.onSelectTab(VIEW_CAPTAINS),
          },
        ],
      }}
      noMatch={{
        message: t('people.empty.riders.noMatch'),
        action: { label: t('table.clearFilters'), onClick: table.clearAll },
      }}
      error={{ message: t('people.error.riders'), onRetry: data.refetch }}
    />
  )
}

function riderColumns(
  t: Translate,
  language: Language,
  profileHref: (id: string) => string,
): ReadonlyArray<PeopleColumn<Rider>> {
  return [
    {
      id: 'rider',
      header: t('people.col.rider'),
      alwaysVisible: true,
      sortField: 'name',
      cell: (r) => <Identity to={profileHref(r.id)} name={r.name} t={t} />,
      /* Qualifies the name: a rider covered by a company account is billed to
         it, and that changes what an operator may do about their wallet. */
      secondaryLine: (r) => r.corporateAccountId,
    },
    {
      id: 'id',
      header: t('people.col.id'),
      cell: (r) => <MutedCell className="tabular-nums">{r.id}</MutedCell>,
    },
    {
      id: 'status',
      header: t('people.col.status'),
      cell: (r) => (
        <Cell>
          <StatusBadge tone={RIDER_STATUS[r.status].tone}>
            {t(RIDER_STATUS[r.status].key)}
          </StatusBadge>
        </Cell>
      ),
    },
    {
      id: 'churn',
      header: t('people.col.churn'),
      cell: (r) => (
        <Cell>
          <StatusBadge tone={CHURN_RISK[r.churnRisk].tone}>
            {t(CHURN_RISK[r.churnRisk].key)}
          </StatusBadge>
        </Cell>
      ),
    },
    {
      id: 'rating',
      header: t('people.col.rating'),
      align: 'end',
      sortField: 'rating',
      /* Behind the column control: `churnRisk` is the server-derived answer to
         the question a rating is usually a proxy for, and at 1280px the
         wallet, lifetime and renewal columns earn the width first. */
      defaultHidden: true,
      cell: (r) =>
        r.rating === null || r.rating === 0 ? (
          <NumCell className="text-muted-foreground">{t('people.ratingNew')}</NumCell>
        ) : (
          <NumCell>{r.rating.toFixed(1)}</NumCell>
        ),
    },
    {
      id: 'city',
      header: t('people.col.city'),
      /* One city in the data today; behind the control until there are two. */
      defaultHidden: true,
      cell: (r) => <Cell>{r.city}</Cell>,
    },
    {
      id: 'trips',
      header: t('people.col.trips'),
      align: 'end',
      sortField: 'totalTrips',
      cell: (r) => <NumCell>{formatCount(r.totalTrips, language)}</NumCell>,
    },
    {
      id: 'wallet',
      header: t('people.col.wallet'),
      align: 'end',
      sortField: 'walletBalanceHalalas',
      cell: (r) => (
        <NumCell>
          <Money unit="none" amount={r.walletBalanceHalalas} />
        </NumCell>
      ),
    },
    {
      id: 'ltv',
      header: t('people.col.ltv'),
      align: 'end',
      sortField: 'lifetimeValueHalalas',
      cell: (r) => (
        <NumCell>
          <Money unit="none" amount={r.lifetimeValueHalalas} />
        </NumCell>
      ),
    },
    {
      id: 'renewal',
      header: t('people.col.renewal'),
      align: 'end',
      sortField: 'renewalRatePercent',
      cell: (r) =>
        r.renewalRatePercent === null ? (
          <Absent numeric />
        ) : (
          <NumCell>
            {t('people.percent', { value: formatCount(r.renewalRatePercent, language) })}
          </NumCell>
        ),
    },
    {
      id: 'lastTrip',
      header: t('people.col.lastTrip'),
      sortField: 'lastTripAt',
      cell: (r) =>
        r.lastTripAt === null ? (
          <Absent />
        ) : (
          <DateCell>{formatDate(r.lastTripAt, { style: 'day-month', language })}</DateCell>
        ),
    },
    {
      id: 'tier',
      header: t('people.col.tier'),
      defaultHidden: true,
      cell: (r) => <Cell>{t(RIDER_TIER[r.tier])}</Cell>,
    },
    {
      id: 'quickRides',
      header: t('people.col.quickRides'),
      align: 'end',
      defaultHidden: true,
      cell: (r) => <NumCell>{formatCount(r.quickRides, language)}</NumCell>,
    },
    {
      id: 'phone',
      header: t('people.col.phone'),
      defaultHidden: true,
      cell: (r) => <DateCell className="tabular-nums">{r.phone}</DateCell>,
    },
    {
      id: 'joined',
      header: t('people.col.joined'),
      defaultHidden: true,
      sortField: 'joinedAt',
      cell: (r) => (
        <DateCell>{formatDate(r.joinedAt, { style: 'day-month-year', language })}</DateCell>
      ),
    },
  ]
}
