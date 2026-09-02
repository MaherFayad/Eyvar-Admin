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
import type { ExtraFilterSpec } from '@/components/DataTable'
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
    /* Keyed by the whole table query, which serialises to an object - it cannot
       collide with the corporate riders reads, which key by a joined id list. */
    deps: [table.params],
    cacheKey: 'riders.list',
  })

  const profileHref = (id: string) =>
    `${location.pathname}${withOverlay(location.search, 'entity', id)}`

  return (
    <PeopleTable
      t={t}
      language={language}
      table={table}
      rows={data.data?.items ?? []}
      status={data.status}
      total={data.data?.total ?? 0}
      getRowId={(rider) => rider.id}
      columns={riderColumns(t, language, profileHref)}
      skeletonPattern="P1"
      {...chrome}
      searchPlaceholder={t('people.search.riders')}
      extraFilters={riderExtraFilters(t)}
      /* **D8 — one declared action, so `DataTable` renders it as a labelled
         button and no kebab exists here.** Owner, on the screenshot: *"still
         kebab with 1 item"*. The rule lives in `DataTable`, not in this file:
         it is about the COUNT of actions, and deriving it per screen is how the
         four-way duplication D9 records began.

         The LABEL changed with the shape. `Open 360° profile` is a fine menu
         item and a bad button: 17 characters is a 140px lane, and §7.3's budget
         has 870px in Arabic to place. §13.4's word for this action is `View`. */
      rowActions={[
        {
          label: t('people.action.view'),
          onSelect: (rider) => navigate(profileHref(rider.id)),
          /* **P0-2 — the declared row-click target.** */
          rowClick: true,
        },
      ]}
      /* §7.8's default. `View` / `عرض` both fit 88 − 24 = 64. */
      rowActionsWidth={88}
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

/**
 * §6.4 — one filter with no column of its own.
 *
 * `corporateAccountId` is a rider's billing relationship. It qualifies the name
 * on the identity's second line rather than earning a column (§9.1), but "every
 * rider on account CORP-002" is a real question, so it is a `text` filter with
 * `contains` — the client declares the field filterable.
 */
function riderExtraFilters(t: Translate): ExtraFilterSpec[] {
  return [
    {
      field: 'corporateAccountId',
      label: t('people.filter.field.corporateAccount'),
      kind: 'text',
    },
  ]
}

export function riderColumns(
  t: Translate,
  language: Language,
  profileHref: (id: string) => string,
): ReadonlyArray<PeopleColumn<Rider>> {
  return [
    {
      id: 'rider',
      emphasis: 'primary',
      csv: (r) => r.name,
      header: t('people.col.rider'),
      /* AC-104 — the identity: implicitly pinned, never hidden, never unpinned. */
      alwaysVisible: true,
      /* §7.3 rule 2 — the one flexible column; 238px of residual at 1280, the
         tightest of the four because Riders carries the most columns. */
      minWidth: 200,
      dataType: 'text',
      sortField: 'name',
      /* §7.7 — line 2 is the phone. The corporate account id it used to carry
         qualifies the name too, but R20 makes the second line all-or-nothing
         and only a minority of riders have one. It moves to the drawer (§11);
         reported in the handoff as a real loss. */
      cell: (r) => <Identity to={profileHref(r.id)} name={r.name} secondary={r.phone} t={t} />,
    },
    {
      id: 'status',
      emphasis: 'data',
      header: t('people.col.status'),
      width: 112,
      dataType: 'enum',
      filter: {
        kind: 'select',
        field: 'status',
        options: [
          { value: 'subscriber', label: t('people.riderStatus.subscriber') },
          { value: 'on-demand', label: t('people.riderStatus.onDemand') },
        ],
      },
      cell: (r) => (
        <Cell>
          <StatusBadge tone={RIDER_STATUS[r.status].tone}>
            {t(RIDER_STATUS[r.status].key)}
          </StatusBadge>
        </Cell>
      ),
    },
    {
      id: 'city',
      header: t('people.col.city'),
      /* **Default-hidden, against §7.4, and the reason is the data.** There is
         exactly ONE city in the rider fixtures, so this column repeats the same
         word 25 times; it was behind the column control for that reason before
         this pass and it goes back there.

         **The budget is what forces the choice rather than leaving both.**
         §7.4's Riders set sums to 872, which already misses the Arabic inner
         width of 870 by 2 — the `:root:lang(ar)` step widens the rail by 8 and
         the sub-tab column by 32, so the content region is 40px narrower in
         Arabic. D8 then turns the actions lane from a 56px kebab into an 88px
         labelled button, and with this column visible the view sums to 896:
         inside the 910 English width and 26 OUTSIDE the Arabic one. Without it,
         776. Raised as a finding against §7.4 — the published set does not fit
         the language it ships in.

         The FILTER stays declared: a hidden column keeps its chip and is
         reachable from the filter picker (§7.5's third case). */
      defaultHidden: true,
      width: 128,
      dataType: 'text',
      filter: {
        kind: 'multi-select',
        field: 'city',
        options: [{ value: 'Riyadh', label: 'Riyadh' }],
      },
      cell: (r) => <Cell>{r.city}</Cell>,
    },
    {
      id: 'subs',
      header: t('people.col.subs'),
      align: 'end',
      width: 88,
      dataType: 'number',
      /* The count of the ids the record already carries — not a recomputation
         of another screen's derived value (§8.2), and not a second query. */
      cell: (r) => <NumCell>{formatCount(r.subscriptionIds.length, language)}</NumCell>,
    },
    {
      id: 'wallet',
      emphasis: 'data',
      header: t('people.col.wallet'),
      align: 'end',
      width: 128,
      dataType: 'money',
      sortField: 'walletBalanceHalalas',
      /* AC-101 — the one money range in the product today. The control renders
         the `SAR` in-field INLINE-START prefix (§4.2 governs inputs) and
         converts major units to halalas before emitting, while this column keeps
         `(SAR)` in its header and bare numbers in its cells (§8.3 governs
         output). Both are correct and they look different on purpose. */
      filter: { kind: 'number-range', field: 'walletBalanceHalalas', unit: 'money' },
      /* §9.3 / craft-critique F20.5 — a NEGATIVE balance takes the critical
         TEXT tone. Today `-41.50` renders identically to `0.00` and it is the
         one number on this screen an ops person must spot. Never colour alone:
         the leading minus sign is in the string. */
      cell: (r) => (
        <NumCell className={r.walletBalanceHalalas < 0 ? 'text-critical-foreground' : undefined}>
          <Money unit="none" amount={r.walletBalanceHalalas} />
        </NumCell>
      ),
    },
    {
      id: 'churn',
      /* §7.3 rule 5 — an ordinal word is the trailing column, deliberately:
         `Wallet (SAR)` may not be, and it was. */
      header: t('people.col.churn'),
      width: 120,
      dataType: 'enum',
      filter: {
        kind: 'multi-select',
        field: 'churnRisk',
        options: [
          { value: 'high', label: t('people.churn.high') },
          { value: 'medium', label: t('people.churn.medium') },
          { value: 'low', label: t('people.churn.low') },
        ],
      },
      /* §9.2 replaces this badge with a three-tick meter plus the word — build
         item 10, not this pass. The WIDTH is set for the meter now so the
         budget does not move when the cell does. */
      cell: (r) => (
        <Cell>
          <StatusBadge tone={CHURN_RISK[r.churnRisk].tone}>
            {t(CHURN_RISK[r.churnRisk].key)}
          </StatusBadge>
        </Cell>
      ),
    },

    /* ── §7.4's default-hidden set, reachable from `Columns` (§5.3). ─────── */
    {
      id: 'id',
      header: t('people.col.id'),
      width: 112,
      /* §7.3 rule 5 — an `id` may never be the trailing column. */
      dataType: 'id',
      defaultHidden: true,
      cell: (r) => <MutedCell className="tabular-nums">{r.id}</MutedCell>,
    },
    {
      id: 'trips',
      emphasis: 'data',
      header: t('people.col.trips'),
      align: 'end',
      width: 88,
      dataType: 'number',
      defaultHidden: true,
      sortField: 'totalTrips',
      cell: (r) => <NumCell>{formatCount(r.totalTrips, language)}</NumCell>,
    },
    {
      id: 'rating',
      header: t('people.col.rating'),
      align: 'end',
      width: 80,
      dataType: 'number',
      sortField: 'rating',
      /* Behind the column control: `churnRisk` is the server-derived answer to
         the question a rating is usually a proxy for. */
      defaultHidden: true,
      cell: (r) =>
        r.rating === null || r.rating === 0 ? (
          <NumCell className="text-muted-foreground">{t('people.ratingNew')}</NumCell>
        ) : (
          <NumCell>{r.rating.toFixed(1)}</NumCell>
        ),
    },
    {
      id: 'ltv',
      header: t('people.col.ltv'),
      align: 'end',
      width: 128,
      dataType: 'money',
      defaultHidden: true,
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
      width: 104,
      dataType: 'number',
      defaultHidden: true,
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
      width: 112,
      dataType: 'date',
      defaultHidden: true,
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
      width: 100,
      dataType: 'enum',
      defaultHidden: true,
      filter: {
        kind: 'multi-select',
        field: 'tier',
        options: [
          { value: 'gold', label: t('people.tier.gold') },
          { value: 'silver', label: t('people.tier.silver') },
          { value: 'bronze', label: t('people.tier.bronze') },
          { value: 'new', label: t('people.tier.new') },
        ],
      },
      cell: (r) => <Cell>{t(RIDER_TIER[r.tier])}</Cell>,
    },
    {
      id: 'quickRides',
      header: t('people.col.quickRides'),
      align: 'end',
      width: 112,
      dataType: 'number',
      defaultHidden: true,
      cell: (r) => <NumCell>{formatCount(r.quickRides, language)}</NumCell>,
    },
    {
      id: 'phone',
      header: t('people.col.phone'),
      width: 144,
      dataType: 'text',
      /* §9.2 / A2 — see `CaptainsView`: the leading `+` is neutral and the
         run has no strong character to hold it in place. */
      isolate: true,
      defaultHidden: true,
      cell: (r) => <DateCell className="tabular-nums">{r.phone}</DateCell>,
    },
    {
      id: 'joined',
      header: t('people.col.joined'),
      width: 120,
      dataType: 'date',
      defaultHidden: true,
      sortField: 'joinedAt',
      cell: (r) => (
        <DateCell>{formatDate(r.joinedAt, { style: 'day-month-year', language })}</DateCell>
      ),
    },
  ]
}
