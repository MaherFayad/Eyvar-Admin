/**
 * Operations › People — view **Captains**. Design spec §9.1, §9.4 (`index`).
 *
 * §9.4's table, verbatim: *Captains → `index` → checkbox column, kebab, sort
 * popover, bulk bar.* All four are here, and the mode is `table.mode` off
 * `useIndexTable`, never a prop.
 *
 * **The columns, and why each one is there.** The legacy roster
 * (`renderDriversTable`, `eyvar_ops_panel_v40_fixed.html:6344`–`:6400`) shows
 * nine: captain (with an inline rating badge and `id · vehicle` beneath),
 * vehicle class, tier, `activeSubs` as the string `'4/5'`, capacity, on-time,
 * month earnings, status, and a `View 360°` button.
 *
 *   kept        captain · status · rating · city · subs · trips · on-time ·
 *               earned — the eight an ops manager sorts and scans by.
 *   split out   `id` becomes its own column instead of a second line under the
 *               name. §9.1 allows a second line "when a value only qualifies
 *               the primary one", and an id does not qualify a name — it is
 *               the thing operators search by. Keeping it as a second line
 *               would also put **every** row at 48px and cost the screen a
 *               third of its density (D-2).
 *   converted   `'4/5'` was one string in legacy and cannot be compared or
 *               sorted; it is two integers here and renders through one key.
 *   added       `Last trip`, because `lastTripAt: null` is a real fixture
 *               state (`DRV-0203`, a captain who has never driven) and the
 *               roster never showed it.
 *   demoted     tier, class, vehicle, phone and joined date are real but
 *               secondary; they ship **behind the column control**, which is
 *               what §9.1 asks for past ~6 columns.
 *   dropped     `capacity` (`'1 open' | 'Full'`) — it is `maxSubscriptions −
 *               activeSubscriptions`, so showing both a value and its own
 *               arithmetic is the derived-value duplication §8.2 warns about.
 *
 * Rules applied
 *   §9.1/AC-43  the identity is a LINK — here to the 360° profile layer, since
 *               a captain has no detail route of its own (`?entity=`, an
 *               overlay param on this route, **AC-21** and **AC-22**).
 *   §9.1        the second line appears only on a **suspended** captain, where
 *               it carries the suspension reason. It qualifies the name; a
 *               suspension with no stated reason is not appealable
 *               (`clients/drivers.ts`).
 *   §9.1/R4     rating, subs, trips, on-time and earnings are inline-END with
 *               `tabular-nums`; the name, id, city and dates are inline-START.
 *   §8.3.1      money is integer halalas through `Money`, `unit="none"`,
 *               because the header carries `(SAR)` once.
 *   §11.2       `Suspend` and `Reinstate` are gated **at render**: without
 *               `approve_drivers` they are disabled in place with the reason,
 *               never hidden and never checked at commit (`:10237` is the
 *               systemic legacy defect).
 *   §9.1/§5.3   the bulk confirmation names the verb and the count, says what
 *               will NOT change, and its primary repeats the verb. **Blue, not
 *               red** — a suspension is reversible and R5a spends red only on
 *               the unrecoverable.
 *   AC-25       selection resets on any view, filter or query change —
 *               `useIndexTable` does it synchronously, and switching People's
 *               view tab unmounts this component entirely.
 */

import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { listDrivers, reinstateDriver, suspendDriver } from '@/data/clients'
import type { Driver, Paginated } from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate, type Language, type Translate } from '@/lib'
import { Money } from '@/components/Money'
import { StatusBadge } from '@/components/StatusBadge'
import { withOverlay } from '@/shell/routeState'
import { Absent, Cell, DateCell, Identity, MutedCell, NumCell } from './cells'
import { ConfirmDialog, type ConfirmRequest } from './ConfirmDialog'
import { DRIVER_STATUS, DRIVER_TIER, VEHICLE_CLASS } from './domain'
import { PeopleTable, type PeopleColumn } from './PeopleTable'
import type { ViewChrome } from './views'
import { useRowOverrides } from './useRowOverrides'

export function CaptainsView({ chrome, t, language, canWrite }: ViewChrome) {
  const location = useLocation()
  const navigate = useNavigate()

  const table = useIndexTable<Driver>({
    mode: 'index',
    getRowId: (driver) => driver.id,
    initialSort: { field: 'name', dir: 'asc' },
  })

  const data = useAsync<Paginated<Driver>>(
    (signal) => listDrivers({ ...table.params }, signal),
    { deps: [table.params] },
  )

  const overrides = useRowOverrides<Driver>()
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [busy, setBusy] = useState(false)

  const rows = overrides.apply(data.data?.items ?? [])
  const profileHref = (id: string) => ({
    pathname: location.pathname,
    search: withOverlay(location.search, 'entity', id),
  })

  /* ── the mutations. The mock returns the updated record and does not write
        it back to the fixture array, so the row is held here for the life of
        the view — see the handoff's note to mock-data-engineer. ─────────── */
  async function runSuspend(ids: readonly string[], reason: string) {
    setBusy(true)
    try {
      const updated = await Promise.all(ids.map((id) => suspendDriver(id, reason)))
      updated.forEach(overrides.record)
      table.clearSelection()
      toast(
        ids.length === 1
          ? t('people.toast.suspended.one')
          : t('people.toast.suspended.other', { count: formatCount(ids.length, language) }),
      )
      setConfirm(null)
    } finally {
      setBusy(false)
    }
  }

  async function runReinstate(ids: readonly string[]) {
    setBusy(true)
    try {
      const updated = await Promise.all(ids.map((id) => reinstateDriver(id)))
      updated.forEach(overrides.record)
      table.clearSelection()
      toast(
        ids.length === 1
          ? t('people.toast.reinstated.one')
          : t('people.toast.reinstated.other', { count: formatCount(ids.length, language) }),
      )
      setConfirm(null)
    } finally {
      setBusy(false)
    }
  }

  function askSuspend(ids: readonly string[]) {
    setConfirm({
      title:
        ids.length === 1
          ? t('people.confirm.suspend.title.one')
          : t('people.confirm.suspend.title.other', { count: formatCount(ids.length, language) }),
      body: t('people.confirm.suspend.body'),
      confirmLabel: t('people.confirm.suspend.confirm'),
      reason: {
        label: t('people.confirm.suspend.reason'),
        help: t('people.confirm.suspend.reasonHelp'),
        message: t('people.confirm.suspend.reasonHelp'),
      },
      onConfirm: (reason) => void runSuspend(ids, reason),
    })
  }

  function askReinstate(ids: readonly string[]) {
    setConfirm({
      title:
        ids.length === 1
          ? t('people.confirm.reinstate.title.one')
          : t('people.confirm.reinstate.title.other', {
              count: formatCount(ids.length, language),
            }),
      body: t('people.confirm.reinstate.body'),
      confirmLabel: t('people.confirm.reinstate.confirm'),
      onConfirm: () => void runReinstate(ids),
    })
  }

  const columns = captainColumns(t, language, profileHref)

  return (
    <>
      <PeopleTable
        t={t}
        table={table}
        rows={rows}
        status={data.status}
        total={data.data?.total ?? 0}
        getRowId={(driver) => driver.id}
        columns={columns}
        skeletonPattern="P1"
        {...chrome}
        searchPlaceholder={t('people.search.captains')}
        sortFields={[
          { field: 'name', label: t('people.col.captain') },
          { field: 'rating', label: t('people.col.rating') },
          { field: 'totalTrips', label: t('people.col.trips') },
          { field: 'monthEarningsHalalas', label: t('people.col.earned') },
          { field: 'onTimePercent', label: t('people.col.onTime') },
          { field: 'activeSubscriptions', label: t('people.col.subs') },
          { field: 'lastTripAt', label: t('people.col.lastTrip') },
          { field: 'joinedAt', label: t('people.col.joined') },
        ]}
        filterFields={[
          {
            field: 'status',
            label: t('people.filter.field.status'),
            options: [
              { value: 'active', label: t('people.driverStatus.active') },
              { value: 'under-review', label: t('people.driverStatus.underReview') },
              { value: 'suspended', label: t('people.driverStatus.suspended') },
              { value: 'pending', label: t('people.driverStatus.pending') },
            ],
          },
          {
            field: 'tier',
            label: t('people.filter.field.tier'),
            options: [
              { value: 'gold', label: t('people.tier.gold') },
              { value: 'silver', label: t('people.tier.silver') },
              { value: 'standard', label: t('people.tier.standard') },
            ],
          },
          {
            field: 'vehicleClass',
            label: t('people.filter.field.vehicleClass'),
            options: [
              { value: 'Economy', label: t('people.class.economy') },
              { value: 'Comfort', label: t('people.class.comfort') },
            ],
          },
        ]}
        rowActions={[
          {
            label: t('people.action.viewProfile'),
            onSelect: (driver) => navigate(profileHref(driver.id)),
          },
          {
            label: t('people.action.suspend'),
            onSelect: (driver) => askSuspend([driver.id]),
            disabled: (driver) => !canWrite || driver.suspended,
          },
          {
            label: t('people.action.reinstate'),
            onSelect: (driver) => askReinstate([driver.id]),
            disabled: (driver) => !canWrite || !driver.suspended,
          },
        ]}
        bulkActions={[
          { label: t('people.bulk.suspend'), onClick: (ids) => askSuspend([...ids]) },
          { label: t('people.bulk.reinstate'), onClick: (ids) => askReinstate([...ids]) },
        ]}
        firstRun={{
          heading: t('people.empty.captains.heading'),
          body: t('people.empty.captains.body'),
          actions: [
            {
              label: t('people.empty.captains.primary'),
              primary: true,
              onClick: () => chrome.onSelectTab('applications'),
            },
          ],
        }}
        noMatch={{
          message: t('people.empty.captains.noMatch'),
          action: { label: t('table.clearFilters'), onClick: table.clearAll },
        }}
        error={{ message: t('people.error.captains'), onRetry: data.refetch }}
      />

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={busy} t={t} />
    </>
  )
}

/* ─────────────────────────────── columns ─────────────────────────────── */

function captainColumns(
  t: Translate,
  language: Language,
  profileHref: (id: string) => { pathname: string; search: string },
): ReadonlyArray<PeopleColumn<Driver>> {
  return [
    {
      id: 'captain',
      header: t('people.col.captain'),
      alwaysVisible: true,
      sortField: 'name',
      cell: (d) => <Identity to={hrefString(profileHref(d.id))} name={d.name} t={t} />,
      /* §9.1 — a second line only where a value QUALIFIES the primary one. */
      secondaryLine: (d) => (d.suspended && d.suspensionReason ? d.suspensionReason : null),
    },
    {
      id: 'id',
      header: t('people.col.id'),
      cell: (d) => <MutedCell className="tabular-nums">{d.id}</MutedCell>,
    },
    {
      id: 'status',
      header: t('people.col.status'),
      cell: (d) => (
        <Cell>
          <StatusBadge tone={DRIVER_STATUS[d.status].tone}>
            {t(DRIVER_STATUS[d.status].key)}
          </StatusBadge>
        </Cell>
      ),
    },
    {
      id: 'rating',
      header: t('people.col.rating'),
      align: 'end',
      sortField: 'rating',
      /* `0` is a seeded value meaning NO RATING YET (`:2607`), and the client
         sends it as `null`. It is not a zero-star rating, so it renders as a
         word, not as a number. */
      cell: (d) =>
        d.rating === null || d.rating === 0 ? (
          <NumCell className="text-muted-foreground">{t('people.ratingNew')}</NumCell>
        ) : (
          <NumCell>{d.rating.toFixed(1)}</NumCell>
        ),
    },
    {
      id: 'city',
      header: t('people.col.city'),
      cell: (d) => <Cell>{d.city}</Cell>,
    },
    {
      id: 'subs',
      header: t('people.col.subs'),
      align: 'end',
      sortField: 'activeSubscriptions',
      cell: (d) => (
        <NumCell>
          {t('people.subsOfMax', {
            used: formatCount(d.activeSubscriptions, language),
            max: formatCount(d.maxSubscriptions, language),
          })}
        </NumCell>
      ),
    },
    {
      id: 'trips',
      header: t('people.col.trips'),
      align: 'end',
      sortField: 'totalTrips',
      cell: (d) => <NumCell>{formatCount(d.totalTrips, language)}</NumCell>,
    },
    {
      id: 'onTime',
      header: t('people.col.onTime'),
      align: 'end',
      sortField: 'onTimePercent',
      cell: (d) =>
        d.onTimePercent === null ? (
          <Absent numeric />
        ) : (
          <NumCell>
            {t('people.percent', { value: formatCount(d.onTimePercent, language) })}
          </NumCell>
        ),
    },
    {
      id: 'earned',
      header: t('people.col.earned'),
      align: 'end',
      sortField: 'monthEarningsHalalas',
      cell: (d) => (
        <NumCell>
          <Money unit="none" amount={d.monthEarningsHalalas} />
        </NumCell>
      ),
    },
    {
      id: 'lastTrip',
      header: t('people.col.lastTrip'),
      sortField: 'lastTripAt',
      /* `null` is a captain who has never driven — a real fixture row. `—`
         means not-applicable or unknown and is never a zero (§8.3.1). */
      cell: (d) =>
        d.lastTripAt === null ? (
          <Absent />
        ) : (
          <DateCell>{formatDate(d.lastTripAt, { style: 'day-month', language })}</DateCell>
        ),
    },
    {
      id: 'tier',
      header: t('people.col.tier'),
      defaultHidden: true,
      cell: (d) => <Cell>{t(DRIVER_TIER[d.tier])}</Cell>,
    },
    {
      id: 'class',
      header: t('people.col.class'),
      defaultHidden: true,
      cell: (d) => <Cell>{t(VEHICLE_CLASS[d.vehicleClass])}</Cell>,
    },
    {
      id: 'vehicle',
      header: t('people.col.vehicle'),
      defaultHidden: true,
      cell: (d) => <Cell>{d.vehicle}</Cell>,
    },
    {
      id: 'phone',
      header: t('people.col.phone'),
      defaultHidden: true,
      /* §9.2 — a phone value is a single LTR token: without isolation a
         leading `+` jumps sides under `dir="rtl"`. */
      cell: (d) => <DateCell className="tabular-nums">{d.phone}</DateCell>,
    },
    {
      id: 'joined',
      header: t('people.col.joined'),
      defaultHidden: true,
      sortField: 'joinedAt',
      cell: (d) => (
        <DateCell>{formatDate(d.joinedAt, { style: 'day-month-year', language })}</DateCell>
      ),
    },
  ]
}

/** `Link`'s `to` as a string, so `Identity` stays a dumb presentational cell. */
function hrefString(target: { pathname: string; search: string }): string {
  return `${target.pathname}${target.search}`
}
