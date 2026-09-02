/**
 * **Operations › Trips** — `routeTable.ts`, shape `index`, six views.
 *
 * ## What P4-T1 and P8-T1 changed here
 *
 * **The table had a checkbox column and nothing behind it.** `mode: 'index'`
 * gives `canSelect: true` unconditionally (`useIndexTable.ts`), so every row
 * rendered a checkbox and the header rendered a select-all — but `DataTable`
 * only draws the bulk bar when `bulkActions` is non-empty, and this screen
 * declared none. Selecting rows therefore produced **nothing at all**: no bar,
 * no count, no way to clear. `Flag` and `Remove flag` are the two commands the
 * trips client actually supports over a set, and they are now declared, gated
 * and wired.
 *
 * **§11.2 over a set — D21, in full.** A bulk command is refused if **any**
 * selected trip would be refused on its own row; the refusal names the count in
 * one of **three** sentences (one target, some blocked, **all** blocked); there
 * is no partial apply; and the way out is `Select only the N eligible`, which
 * `DataTable` renders from `eligibleIds` and which changes the SELECTION rather
 * than narrowing the command. One predicate (`flagRefusal` / `unflagRefusal`)
 * answers for the row menu and the bulk bar, so there is no single-record code
 * path for them to disagree in, and `setRefusal` supplies the shape so this
 * screen cannot forget D21's third sentence.
 *
 * **Four cells named an entity and none of them opened one properly.** The trip
 * id, the rider and the captain were `<button onClick={navigate}>` carrying
 * `focus:outline-none` with no replacement — not middle-clickable, not
 * copyable, and with the focus ring removed (§7.2). They are `<Link>`s now,
 * through `EntityLink`, and a trip with no captain renders the captain cell as
 * **plain text with its reason** rather than as a dead control (§11.2). The
 * subscription id is a fifth reachable entity that was not on the table at all.
 *
 * **The row's actions moved into `DataTable`.** They were a hand-rolled
 * `DropdownMenu` inside an `actions` COLUMN, which put them inside the
 * horizontal scroller, outside the pinned action lane, and outside §11.2's
 * `disabled` / `reason` contract. `rowActions` is the contract; D8 then chooses
 * the shape from the count of declared actions, and this screen no longer
 * decides that for itself.
 *
 * **`STATUS_TONES` keyed statuses that do not exist.** It mapped
 * `'in-progress'` and `'scheduled'`; `TripStatus` is
 * `requested | assigned | en-route | in-trip | done | late | cancelled |
 * no-show`. Because the map was typed `Record<string, …>` the dead keys did not
 * fail to compile, and four live statuses fell through to `neutral`. It is now
 * keyed on the union, so a ninth status is a compile error here.
 *
 * Rules applied
 *   §9.1 / AC-43  the first data cell is the record's identity and **a link**.
 *   §9.1          the whole row is never a click target — the link is.
 *   §9.1 / R4     fare and rating are inline-END with `tabular-nums`.
 *   §8.3.1        `—` is not-applicable only. An unrated trip is *Not rated*,
 *                 because "nobody rated it" is a known fact, not an absent one.
 *   R5a           **no red badge and no red row.** A flagged trip is `warning`;
 *                 `no-show` and `cancelled` are neutral and the WORD carries
 *                 them.
 *   R3            one primary per screen, and Trips has none — nobody creates a
 *                 trip. The empty state's action is the only primary it needs.
 *   §11.2         every action is gated at RENDER and disabled in place with
 *                 its reason. Never hidden, never checked at commit.
 *   AC-74/75      every string is a key in `./copy.ts` with named placeholders.
 */

import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { flagTrip, listTrips, unflagTrip } from '@/data/clients'
import type { Paginated, SubTabRoute, Trip, TripStatus } from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate } from '@/lib'
import { DataTable, type BulkAction, type DataColumn, type RowAction } from '@/components/DataTable'
import { setRefusal, type SetRefusal } from '../bulkRefusal'
import { ErrorState } from '@/components/ErrorState'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { useRouteState, withView } from '@/shell/routeState'
import { Absent, Cell, DateCell, Identity, MutedCell, NumCell } from '@/screens/queues/cells'
import { EntityLink, useEntityLinks } from '../EntityLink'
import { withFallback } from '../localCopy'
import { TRIPS_EN } from './copy'
import { FlagTripModal } from './FlagTripModal'
import { TripDetailDrawer } from './TripDetailDrawer'

/**
 * R7 tones, keyed on the **union** so a new status cannot silently fall through
 * to `neutral` the way four of them did. R5a: there is no red badge here — a
 * `no-show` is neutral and the word is what carries it.
 */
const STATUS_TONE: Readonly<
  Record<TripStatus, 'success' | 'warning' | 'info' | 'neutral' | 'new'>
> = {
  requested: 'info',
  assigned: 'new',
  'en-route': 'info',
  'in-trip': 'info',
  done: 'success',
  late: 'warning',
  cancelled: 'neutral',
  'no-show': 'neutral',
}

/** The five categories the flag form offers. Keys, never strings (AC-74). */
const FLAG_REASONS: readonly string[] = [
  'trips.reason.fareDispute',
  'trips.reason.routeDeviation',
  'trips.reason.speedViolation',
  'trips.reason.safetyIncident',
  'trips.reason.unusualPairing',
]

export function TripsScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const route = useRouteState()
  const location = useLocation()
  const navigate = useNavigate()
  const { dir, language } = shell.language
  /* AC-74 — the copy lives in `./copy.ts`, not in this file. See `localCopy`
     for why the wrapper exists and what deletes it. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, TRIPS_EN),
    [shell.language.t],
  )

  const views = useMemo(() => [...row.views].sort((a, b) => a.order - b.order), [row.views])
  const fallback = views.find((v) => v.isDefault)?.id ?? 'all'
  const activeTab = views.some((v) => v.id === route.view) ? (route.view as string) : fallback

  const table = useIndexTable<Trip>({
    mode: 'index',
    getRowId: (trip) => trip.id,
    initialSort: { field: 'startedAt', dir: 'desc' },
  })

  /**
   * **The sub-tab decides the kind — `DECISIONS.md` D1b.**
   *
   * Quick rides and subscription trips are two sub-tabs now, not two view tabs
   * of one. One screen still renders both, because they share a `Trip` type, a
   * client and all fourteen columns; what the owner separated is the operator's
   * entry point, not the domain model.
   *
   * The filter is applied HERE rather than in the client's `views` map, so the
   * `all`, `flagged`, `low-rating` and `route-history` tabs each stay scoped to
   * the kind — before this, `flagged` on the Trips tab showed flagged trips of
   * *both* kinds and there was no way to ask for one.
   */
  const kind: Trip['kind'] =
    row?.subTabId === 'operations-subscription-trips' ? 'Subscription' : 'Quick ride'

  const queryParams = useMemo(
    () => ({
      ...table.params,
      view: activeTab,
      filters: [
        ...(table.params.filters ?? []),
        { field: 'kind', op: 'eq' as const, value: kind },
      ],
    }),
    [table.params, activeTab, kind],
  )

  const data = useAsync<Paginated<Trip>>((signal) => listTrips(queryParams, signal), {
    /* `queryParams` carries the table query and the view tab. */
    deps: [queryParams],
    /* `queryParams` now carries the kind, and `requestCacheKey` serialises deps
       into the key — so the two sub-tabs cannot serve each other's rows. */
    cacheKey: 'trips.list',
  })

  /**
   * The mutated rows, held over the list until a real read agrees with them.
   * The mock clients deliberately do not write back to their fixture arrays —
   * `setTripFlag` returns `{ ...row, flagged }` and the next `listTrips`
   * returns the original — so without this an operator flags a trip, reads the
   * toast, and watches the row stay unflagged.
   */
  const [overrides, setOverrides] = useState<ReadonlyMap<string, Trip>>(() => new Map())
  const [drawerTripId, setDrawerTripId] = useState<string | null>(null)
  /** The trips the flag form is asking about — one from a kebab, N from the bar. */
  const [flagging, setFlagging] = useState<readonly Trip[]>([])

  const rows = useMemo(() => {
    const raw = data.data?.items ?? []
    return overrides.size === 0 ? raw : raw.map((item) => overrides.get(item.id) ?? item)
  }, [data.data?.items, overrides])

  const canWrite = shell.permissions.permissions.includes('live_ops')

  /**
   * **P8-T1 — resolution is ASKED, not assumed.**
   *
   * Every id this page names goes to `useEntityLinks`, which asks
   * `resolveProfile` once per distinct id and answers `null` for anything that
   * does not exist. A name whose entity cannot be resolved then renders as
   * plain text with its reason rather than as a link into the overlay's
   * not-found state — discovering the miss after the click is gating at commit,
   * which is what §11.2 exists to replace.
   *
   * The id list is built from the rows on screen, so it re-asks when the page
   * or the view changes and asks nothing twice.
   */
  const hrefFor = useEntityLinks(
    useMemo(
      () =>
        rows.flatMap((trip) => [
          trip.id,
          trip.riderId,
          trip.driverId,
          trip.subscriptionId,
          trip.paymentId,
        ]),
      [rows],
    ),
  )

  /**
   * §11.2 — the two reasons a captain cell is text, and they are different
   * facts with different next actions: nobody was ever assigned, or the
   * captain named on this row has no record.
   */
  const captainReason = useCallback(
    (trip: Trip) =>
      trip.driverId === null ? t('trips.captain.none.reason') : t('trips.entity.unresolved'),
    [t],
  )

  const record = useCallback((updated: readonly Trip[]) => {
    setOverrides((current) => {
      const next = new Map(current)
      updated.forEach((trip) => next.set(trip.id, trip))
      return next
    })
  }, [])

  /* ── §11.2, one predicate per command, evaluated over a SET ──────────── */

  /**
   * **The set rule, D21.** Refused if ANY target would be refused on its own
   * row; three sentences depending on how much of the selection is blocked; the
   * permission refusal first, because narrowing a selection cannot make a role
   * able to act. A row menu passes an array of one; the bulk bar passes the
   * selection. There is no separate single-record path, which is what makes
   * "the two surfaces agree" structural rather than a promise.
   */
  const roleReason = canWrite ? null : t('trips.action.noPermission')

  const flagRefusal = useCallback(
    (targets: readonly Trip[]): SetRefusal =>
      setRefusal({
        targets,
        getId: (trip) => trip.id,
        isBlocked: (trip) => trip.flagged,
        roleReason,
        blockedKeyPrefix: 'trips.action.flag.blocked',
        t,
        language,
      }),
    [roleReason, t, language],
  )

  const unflagRefusal = useCallback(
    (targets: readonly Trip[]): SetRefusal =>
      setRefusal({
        targets,
        getId: (trip) => trip.id,
        isBlocked: (trip) => !trip.flagged,
        roleReason,
        blockedKeyPrefix: 'trips.action.unflag.blocked',
        t,
        language,
      }),
    [roleReason, t, language],
  )

  /* ── the writes. Every bulk action reaches the data layer ────────────── */

  /**
   * **`Promise.all` over the client, never a toast on its own.** A bulk action
   * that only fires a toast is worse than none: it teaches the operator that
   * twelve records changed when nothing did. `flagTrip` / `unflagTrip` return
   * the updated record, and every one of them is held over the list.
   */
  const runFlag = useCallback(
    async (trips: readonly Trip[], reason: string) => {
      try {
        const updated = await Promise.all(trips.map((trip) => flagTrip(trip.id, reason)))
        record(updated)
        table.clearSelection()
        toast.success(
          trips.length === 1
            ? t('trips.toast.flagged.one')
            : t('trips.toast.flagged.other', { count: formatCount(trips.length, language) }),
        )
      } catch (error: unknown) {
        /* Re-thrown so `FlagTripModal` keeps itself open and states the refusal
           beside the category that produced it (§11.2). */
        throw error instanceof Error ? error : new Error(t('trips.error.flag'))
      }
    },
    [record, table, t, language],
  )

  const runUnflag = useCallback(
    async (trips: readonly Trip[]) => {
      try {
        const updated = await Promise.all(trips.map((trip) => unflagTrip(trip.id)))
        record(updated)
        table.clearSelection()
        toast.success(
          trips.length === 1
            ? t('trips.toast.unflagged.one')
            : t('trips.toast.unflagged.other', { count: formatCount(trips.length, language) }),
        )
      } catch {
        toast.error(t('trips.error.unflag'))
      }
    },
    [record, table, t, language],
  )

  /** The selection as RECORDS, which is what both predicates take. */
  const selected = useMemo(
    () => rows.filter((trip) => table.selectedIds.has(trip.id)),
    [rows, table.selectedIds],
  )

  /* ── columns ─────────────────────────────────────────────────────────── */

  const columns: ReadonlyArray<DataColumn<Trip>> = useMemo(
    () => [
      {
        id: 'id',
        emphasis: 'primary',
        csv: (trip) => trip.id,
        header: t('trips.col.id'),
        /* AC-104 / AC-106 — the identity is implicitly pinned, so a flagged
           row's marker stays visible at every horizontal scroll offset. */
        alwaysVisible: true,
        minWidth: 168,
        dataType: 'id',
        sortField: 'id',
        cell: (trip) => {
          const href = hrefFor(trip.id)
          const secondary =
            trip.pickup === null || trip.destination === null
              ? trip.route
              : t('trips.route', { pickup: trip.pickup, destination: trip.destination })
          /**
           * **The identity degrades to text too, and it has to.** P8-T1's rule
           * is not "every cell except the first": a trip whose record the
           * resolver cannot find has nothing to open from here either, and
           * `Identity` always renders a `<Link>`.
           *
           * Reported rather than worked around: `queues/cells.tsx`'s `Identity`
           * wants `to: string | null` so the identity cell can fall back the
           * same way every other name cell does, and the exact diff is in the
           * handoff. It is a file shared with Support, so this branch stands in
           * meanwhile — the avatar is the only thing lost, and only on a row
           * whose record is missing.
           */
          if (href === null) {
            return (
              <span className="flex min-w-0 max-w-80 flex-col justify-center">
                <EntityLink
                  href={null}
                  code
                  label={t('trips.open.trip', { id: trip.id })}
                  reason={t('trips.entity.unresolved')}
                  reasonId={`trip-${trip.id}-unresolved`}
                >
                  {trip.id}
                </EntityLink>
                <span className="truncate text-xs text-muted-foreground">
                  <bdi>{secondary}</bdi>
                </span>
              </span>
            )
          }
          return (
          <>
            {/* R5a — the ONE red carrier a row may have, and only while the
                trip is under investigation. A flagged trip is a standing
                condition an operator is meant to find. */}
            {trip.flagged && <RowCriticalMarker />}
            <Identity
              to={href}
              name={trip.id}
              code
              /* §7.7 — line 2 QUALIFIES line 1. The route is what an operator
                 reads next after the id, and it retires a 200px column. */
              secondary={secondary}
              label={t('trips.open.trip', { id: trip.id })}
            />
          </>
          )
        },
      },
      /* **No `kind` column, and no kind filter.** Both were right while one
         table served both kinds; D1b split that into two sub-tabs, and the
         screen now scopes every query to a single kind above. What survived the
         split was a 112px column repeating the same badge on every row of a
         screen whose own title already says it — "Quick ride" twenty-five times
         under the heading *Quick rides* — and a select offering to filter a
         kind-scoped table by kind, whose other option returns nothing.

         The column is not merely redundant, it is the most expensive kind of
         redundant: this table declares nine columns into 1136px, so the one
         carrying no information was taking width from `Rider` and `Captain`,
         both of which truncate names today. `Trip['kind']` is untouched — the
         field still exists, the client still filters on it, and a combined view
         would declare its own column. */
      {
        id: 'riderName',
        header: t('trips.col.rider'),
        width: 152,
        dataType: 'text',
        sortField: 'riderName',
        filter: { kind: 'text', field: 'riderName' },
        /* **P8-T1** — a cell that names a rider opens that rider. */
        cell: (trip) => (
          <Cell>
            <EntityLink
              href={hrefFor(trip.riderId)}
              label={t('trips.open.rider', { name: trip.riderName })}
              reason={t('trips.entity.unresolved')}
              reasonId={`trip-${trip.id}-rider-unresolved`}
            >
              {trip.riderName}
            </EntityLink>
          </Cell>
        ),
      },
      {
        id: 'driverName',
        header: t('trips.col.captain'),
        width: 152,
        dataType: 'text',
        sortField: 'driverName',
        filter: { kind: 'text', field: 'driverName' },
        /**
         * **P8-T1, and its second rule.** A trip cancelled before assignment
         * has `driverId: null` — there is no captain to open, so the cell is
         * plain muted text carrying the reason, and not a dead link. It also
         * does not render `—`: §8.3.1 reserves that for not-applicable, and
         * *"no captain accepted this"* is a known fact worth stating in words.
         */
        cell: (trip) => (
          <Cell>
            <EntityLink
              href={hrefFor(trip.driverId)}
              label={t('trips.open.captain', { name: trip.driverName ?? '' })}
              reason={captainReason(trip)}
              reasonId={`trip-${trip.id}-captain-absent`}
            >
              {trip.driverName ?? t('trips.captain.none')}
            </EntityLink>
          </Cell>
        ),
      },
      {
        id: 'status',
        emphasis: 'data',
        header: t('trips.col.status'),
        width: 112,
        dataType: 'enum',
        sortField: 'status',
        filter: {
          kind: 'multi-select',
          field: 'status',
          options: (Object.keys(STATUS_TONE) as TripStatus[]).map((value) => ({
            value,
            label: t(`trips.status.${value}`),
          })),
        },
        cell: (trip) => (
          <Cell>
            <StatusBadge tone={STATUS_TONE[trip.status]}>
              {t(`trips.status.${trip.status}`)}
            </StatusBadge>
          </Cell>
        ),
      },
      {
        id: 'fareHalalas',
        emphasis: 'data',
        header: t('trips.col.fare'),
        /* 128, not 112, and the 16px comes from `startedAt` below so the row
           budget is unchanged. At 112 the cell offers 88px of inner width and
           `1,284.50 SAR` (TRP-6001, `fareHalalas: 128_450`) needs ~94 — it
           truncated to `1,284.50 …`, which an operator reads as a different
           number rather than as a clipped one. A money column must never
           ellipsis: `1,284.50` and `1,284.50 …` are both plausible fares. */
        width: 128,
        align: 'end',
        dataType: 'money',
        sortField: 'fareHalalas',
        cell: (trip) => (
          <NumCell className="font-medium">
            <Money amount={trip.fareHalalas} />
          </NumCell>
        ),
      },
      {
        id: 'startedAt',
        header: t('trips.col.started'),
        /* 128 — measured widest content is `25 Jun 09:39` at ~84px against
           104px of inner width, so this had 20px of slack and the fare had
           none. */
        width: 128,
        dataType: 'date',
        sortField: 'startedAt',
        /* §7.3 rule 5 — the trailing visible column is a DATE, never a `money`
           or an `id`, where a truncation reads as a different valid value. */
        cell: (trip) => (
          <DateCell>{formatDate(trip.startedAt, { style: 'day-month-time', language })}</DateCell>
        ),
      },

      /* ── behind the column control (§7.4) ─────────────────────────────── */
      {
        id: 'rating',
        header: t('trips.col.rating'),
        width: 104,
        align: 'end',
        dataType: 'number',
        defaultHidden: true,
        sortField: 'driverRatingGiven',
        /* §8.3.1 — an unrated trip is not an ABSENT one. `REQ-501`'s lesson
           applied to trips: "nobody rated it" is a known fact and reads in
           words, so `—` stays reserved for not-applicable. */
        cell: (trip) =>
          trip.driverRatingGiven === null ? (
            <Cell className="text-end text-muted-foreground">{t('trips.drawer.notRated')}</Cell>
          ) : (
            <NumCell>{t('trips.rating.value', { rating: trip.driverRatingGiven })}</NumCell>
          ),
      },
      {
        id: 'subscriptionId',
        header: t('trips.col.subscription'),
        width: 136,
        dataType: 'id',
        defaultHidden: true,
        /* **P8-T1** — the fifth entity this table names, and it was not on the
           table at all before. A subscription leg that cannot be traced back to
           its subscription is the reason an operator opens three screens. */
        cell: (trip) =>
          trip.subscriptionId === null ? (
            <Absent />
          ) : (
            <Cell>
              <EntityLink
                href={hrefFor(trip.subscriptionId)}
                code
                label={t('trips.open.subscription', { id: trip.subscriptionId })}
                reason={t('trips.entity.unresolved')}
                reasonId={`trip-${trip.id}-sub-unresolved`}
              >
                {trip.subscriptionId}
              </EntityLink>
            </Cell>
          ),
      },
      {
        id: 'endedAt',
        header: t('trips.col.ended'),
        width: 136,
        dataType: 'date',
        defaultHidden: true,
        sortField: 'endedAt',
        cell: (trip) =>
          trip.endedAt === null ? (
            <Cell className="text-muted-foreground">{t('trips.drawer.inProgress')}</Cell>
          ) : (
            <DateCell>{formatDate(trip.endedAt, { style: 'day-month-time', language })}</DateCell>
          ),
      },
      {
        id: 'paymentId',
        header: t('trips.col.payment'),
        width: 136,
        dataType: 'id',
        defaultHidden: true,
        cell: (trip) =>
          trip.paymentId === null ? (
            <Absent />
          ) : (
            <Cell>
              <EntityLink
                href={hrefFor(trip.paymentId)}
                code
                label={t('trips.open.payment', { id: trip.paymentId })}
                reason={t('trips.entity.unresolved')}
                reasonId={`trip-${trip.id}-payment-unresolved`}
              >
                {trip.paymentId}
              </EntityLink>
            </Cell>
          ),
      },
      {
        id: 'distanceKm',
        header: t('trips.col.distance'),
        width: 104,
        align: 'end',
        dataType: 'number',
        defaultHidden: true,
        sortField: 'distanceKm',
        /* §8.3.1 — a cancelled trip has NO distance. `0` would be a lie, and
           legacy computes a platform cut from that lie (`:3422`). */
        cell: (trip) =>
          trip.distanceKm === null ? <Absent numeric /> : <NumCell>{trip.distanceKm}</NumCell>,
      },
      {
        id: 'durationMinutes',
        emphasis: 'data',
        header: t('trips.col.duration'),
        width: 104,
        align: 'end',
        dataType: 'number',
        defaultHidden: true,
        sortField: 'durationMinutes',
        cell: (trip) =>
          trip.durationMinutes === null ? (
            <Absent numeric />
          ) : (
            <NumCell>{trip.durationMinutes}</NumCell>
          ),
      },
      {
        id: 'flagged',
        header: t('trips.flagged'),
        width: 112,
        dataType: 'enum',
        defaultHidden: true,
        filter: {
          kind: 'boolean',
          field: 'flagged',
          trueLabel: t('trips.flagged'),
          falseLabel: t('trips.status.done'),
        },
        cell: (trip) =>
          trip.flagged ? (
            <Cell>
              <StatusBadge tone="warning">{t('trips.flagged')}</StatusBadge>
            </Cell>
          ) : (
            <MutedCell>{t('trips.drawer.notRated')}</MutedCell>
          ),
      },
    ],
    [t, language, hrefFor, captainReason],
  )

  /* ── row actions (§7.8 / D8 — three declared, so a kebab) ────────────── */

  const rowActions: ReadonlyArray<RowAction<Trip>> = useMemo(
    () => [
      {
        label: t('trips.action.view'),
        onSelect: (trip: Trip) => setDrawerTripId(trip.id),
        /* **P0-2 — the declared row-click target.** `Flag` and `Unflag` both
           mutate; neither may carry this. */
        rowClick: true,
      },
      {
        label: t('trips.action.flag'),
        onSelect: (trip: Trip) => setFlagging([trip]),
        disabled: (trip: Trip) => flagRefusal([trip]).refused,
        reason: (trip: Trip) => flagRefusal([trip]).reason,
      },
      {
        label: t('trips.action.unflag'),
        onSelect: (trip: Trip) => void runUnflag([trip]),
        disabled: (trip: Trip) => unflagRefusal([trip]).refused,
        reason: (trip: Trip) => unflagRefusal([trip]).reason,
      },
    ],
    [t, flagRefusal, unflagRefusal, runUnflag],
  )

  /* ── the bulk bar (§13.4 — the inverted strip takes the compact form) ── */

  const bulkActions: ReadonlyArray<BulkAction> = useMemo(() => {
    const flag = flagRefusal(selected)
    const unflag = unflagRefusal(selected)
    return [
      {
        label: t('trips.bulk.flag'),
        onClick: () => setFlagging(selected),
        disabled: flag.refused,
        reason: flag.reason,
        /* **D21's escape hatch, and it is not a partial apply.** These are the
           ids in the CURRENT selection the command would accept; `DataTable`
           renders `Select only the N eligible` from them and narrows the
           selection through `table.selectOnly`, so the bar's count changes
           before the command can run and the toast can never name a different
           number from the bar. Empty when every selected trip is blocked, and
           the bar then correctly offers no control (AC-960). */
        eligibleIds: flag.eligibleIds,
      },
      {
        label: t('trips.bulk.unflag'),
        onClick: () => void runUnflag(selected),
        disabled: unflag.refused,
        reason: unflag.reason,
        eligibleIds: unflag.eligibleIds,
      },
    ]
  }, [selected, flagRefusal, unflagRefusal, runUnflag, t])

  const tabs = views.map((v) => ({ id: v.id, label: t(v.titleKey) }))
  const total = data.data?.total ?? 0
  const meta =
    data.status === 'content'
      ? total === 1
        ? t('trips.meta.one', { count: '1' })
        : t('trips.meta.other', { count: formatCount(total, language) })
      : null

  /**
   * **AC-24 / AC-36 — the read can fail, and the screen must say so.**
   *
   * `DataTable` renders a *card*-scoped error, which is right for a card that
   * failed beside cards that did not. This is the whole page's only read: when
   * it fails there is no table, the toolbar sits live over a list that will
   * never arrive, and §11.2 gives a whole-read failure the **page** scope. The
   * header keeps its title and drops its `meta` count, which would otherwise
   * read `0 trips` about a list nobody counted.
   */
  if (data.status === 'error') {
    const title = t(row.titleKey)
    return (
      <SingleColumnPage header={<PageHeader title={title} t={t} dir={dir} />}>
        <ErrorState
          scope="page"
          heading={t('state.pageError.title', { resource: title })}
          message={t('state.pageError.body')}
          action={{ label: t('state.pageError.action'), onClick: data.refetch }}
        />
      </SingleColumnPage>
    )
  }

  return (
    <SingleColumnPage header={<PageHeader title={t(row.titleKey)} meta={meta} t={t} dir={dir} />}>
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(trip) => trip.id}
        status={data.status}
        total={total}
        t={t}
        language={language}
        tableId={row?.subTabId ?? 'operations-quick-rides'}
        view={activeTab}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={(id) =>
          navigate({ pathname: location.pathname, search: withView(location.search, id) })
        }
        searchPlaceholder={t('trips.search')}
        /* **NO `isRowCritical`, and that is this screen's own ruling** — see
           the header: *R5a — no red badge and **no red row**. A flagged trip
           is `warning`.* The single red carrier a trip row may have is the 3px
           leading-edge marker in the identity cell (§8.4.6: *a row MUST carry
           at most one red carrier*), and the `Flagged` column says it in words.
           `DataTable` used to tint anyway, off a bare `r.flagged` duck-type:
           audit C read `TRP-8001` tinted and `TRP-9003` not, both `Cancelled`,
           with nothing in either row to explain the difference. */
        rowActions={rowActions}
        bulkActions={bulkActions}
        /* §9.1 — the identity link is the click target and the row is not. The
           kebab's `Telemetry` opens the record; nothing opens on a stray click
           in the middle of a row. */
        onRowClick={undefined}
        firstRun={{
          heading: t('trips.empty.firstRun.heading'),
          body: t('trips.empty.firstRun.body'),
          actions: [
            {
              label: t('trips.empty.firstRun.action'),
              onClick: () =>
                navigate({
                  pathname: location.pathname,
                  search: withView(location.search, 'all'),
                }),
            },
          ],
        }}
        noMatch={{ message: t('trips.empty.noMatch') }}
        error={{ message: t('trips.error.list'), onRetry: data.refetch }}
      />

      <TripDetailDrawer
        tripId={drawerTripId}
        onClose={() => setDrawerTripId(null)}
        language={language}
        t={t}
      />

      <FlagTripModal
        trips={flagging}
        reasonKeys={FLAG_REASONS}
        onClose={() => setFlagging([])}
        onConfirm={runFlag}
        t={t}
      />
    </SingleColumnPage>
  )
}
