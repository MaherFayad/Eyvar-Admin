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
 * than narrowing the command. One predicate answers for the row menu and the
 * bulk bar, so there is no single-record code path for them to disagree in.
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

import { useCallback, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { listTrips } from '@/data/clients'
import type { Paginated, SubTabRoute, Trip, TripStatus } from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate } from '@/lib'
import { DataTable, type BulkAction, type DataColumn, type RowAction } from '@/components/DataTable'
/**
 * **The two commands are declared in `src/commands/trips.ts`, not here** — D9 /
 * X9, the way Captains does it. The row menu, the bulk bar, the ride sheet and
 * ⌘K resolve one registry, so `Flag` and `Remove flag` carry D18's undo on
 * every surface instead of only in the palette.
 */
import {
  FLAG_REASONS,
  TRIP_COMMANDS,
  resolveCommands,
  runCommand,
  toastOutcome,
  unavailableReason,
  type Command,
  type CommandContext,
  type CommandHost,
  type CommandResult,
} from '@/commands'
import { FlagTripModal } from '@/components/actions'
import { ErrorState } from '@/components/ErrorState'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { useRouteState, withOverlay, withView } from '@/shell/routeState'
import { Absent, Cell, DateCell, Identity, MutedCell, NumCell } from '@/screens/queues/cells'
import { EntityLink, useEntityLinks } from '../EntityLink'
import { withFallback } from '../localCopy'
import { TRIPS_EN } from './copy'


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


/**
 * Resolved once at module scope because they depend on nothing the screen
 * holds — CM-1. `plural: false` is the row kebab, `plural: true` the bulk bar.
 */
const ROW_COMMANDS = resolveCommands(TRIP_COMMANDS, { entityType: 'trip', plural: false })
const BULK_COMMANDS = resolveCommands(TRIP_COMMANDS, { entityType: 'trip', plural: true })

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

  /* ── the registry: one declaration, four surfaces ────────────────────── */

  /**
   * **The set rule, D21.** Refused if ANY target would be refused on its own
   * row; the permission refusal first, because narrowing a selection cannot
   * make a role able to act. A row menu passes an array of one; the bulk bar
   * passes the selection. `unavailableReason` answers both.
   */
  /**
   * The confirmation this screen asks `trip.flag` for is `FlagTripModal`, not
   * `ConfirmDialog`: the category list is the point of the flag. The command
   * still owns the copy and the write, so the palette and this screen cannot
   * ask different questions. Both draw on `trips.flag.*`.
   */
  const pending = useRef<readonly Trip[]>([])
  const answer = useRef<((reason: string | null) => void) | null>(null)
  const settled = useRef<{ ok: () => void; fail: (error: unknown) => void } | null>(null)

  /** CQ-4 — the only things a command may reach this screen for. */
  const host: CommandHost = {
    openProfile: (_entityType, id) =>
      navigate({
        pathname: location.pathname,
        search: withOverlay(location.search, 'entity', id),
      }),
    confirm: () =>
      new Promise<string | null>((resolve) => {
        answer.current = resolve
        setFlagging(pending.current)
      }),
  }

  const context = useCallback(
    (targets: readonly Trip[]): CommandContext<Trip> => ({
      targets,
      t,
      language,
      /* CQ-7 / Q4 — one boolean, read only by `roleRefusal`. */
      session: { canWrite },
      host,
    }),
    // `host` is rebuilt every render and holds only refs and the router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, language, canWrite],
  )

  /**
   * **The one dispatch path.** `runCommand` re-checks the refusal, runs the
   * write, and `toastOutcome` renders D18's undo handle — a bare `toast` would
   * render the sentence and drop the inverse on the floor.
   */
  const dispatch = useCallback(
    async (command: Command<Trip>, targets: readonly Trip[]) => {
      pending.current = targets
      let result: CommandResult<Trip>
      try {
        result = await runCommand(command, context(targets))
      } catch (error: unknown) {
        /* §11.2 — the refusal renders inside the form that asked, with the
           operator's category and note still on screen. */
        settled.current?.fail(error)
        settled.current = null
        return
      }
      settled.current?.ok()
      settled.current = null
      setFlagging([])
      if (result.kind === 'refused') {
        toast(result.reason)
        return
      }
      if (result.kind === 'cancelled' || result.outcome === null) return
      record(result.outcome.changed ?? [])
      table.clearSelection()
      toastOutcome(result.outcome, t)
    },
    [context, record, table, t],
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
        /* **`data`, not the default `meta`.** Neither column declared an
           emphasis, so both fell to the quietest tier — on a trips table,
           where the rider and the captain are the two things an operator
           scans for once they have the trip id. It read as a deliberate
           demotion of the wrong two columns on the desktop table, and the
           narrow card mode made it unmissable: the card builds its body
           from the `data` tier, so a phone showed Status and Fare and
           neither name. */
        emphasis: 'data',
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
        /* **`data`, not the default `meta`.** Neither column declared an
           emphasis, so both fell to the quietest tier — on a trips table,
           where the rider and the captain are the two things an operator
           scans for once they have the trip id. It read as a deliberate
           demotion of the wrong two columns on the desktop table, and the
           narrow card mode made it unmissable: the card builds its body
           from the `data` tier, so a phone showed Status and Fare and
           neither name. */
        emphasis: 'data',
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
        sortField: 'subscriptionId',
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
        sortField: 'paymentId',
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
        sortField: 'flagged',
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
        /* **The ride sheet is the 360° layer, not a drawer this screen owns.**
           It used to be `TripDetailDrawer`, a second record surface built here
           — which meant a trip opened from the trips table and a trip opened
           from a rider's profile were two different sheets showing two subsets
           of one record. `?entity=TRP-*` is the one address, and
           `components/profile/trip` is the one arrangement behind it. */
        onSelect: (trip: Trip) =>
          navigate({
            pathname: location.pathname,
            search: withOverlay(location.search, 'entity', trip.id),
          }),
        /* **P0-2 — the declared row-click target.** `Flag` and `Unflag` both
           mutate; neither may carry this. */
        rowClick: true,
      },
      /* CM-1 — two ids, no declarations. §11.2 / AC-368 — `disabled` and
         `reason` are the same call, so a dead control cannot lose its
         sentence on the way to the screen. */
      ...ROW_COMMANDS.map((command) => ({
        label: t(command.titleKey),
        onSelect: (trip: Trip) => void dispatch(command, [trip]),
        disabled: (trip: Trip) => unavailableReason(command, context([trip])) !== null,
        reason: (trip: Trip) => unavailableReason(command, context([trip])),
      })),
    ],
    [t, context, dispatch, navigate, location.pathname, location.search],
  )

  /* ── the bulk bar (§13.4 — the inverted strip takes the compact form) ── */

  const bulkActions: ReadonlyArray<BulkAction> = useMemo(
    () =>
      BULK_COMMANDS.map((command) => {
        const refusal = selected.length === 0 ? null : unavailableReason(command, context(selected))
        /* **D21's escape hatch, and it is not a partial apply.** These are the
           ids in the CURRENT selection the command would accept, derived from
           the SAME predicate; `DataTable` renders `Select only the N eligible`
           from them and narrows the selection through `table.selectOnly`, so
           the bar's count changes before the command can run and the toast can
           never name a different number from the bar (AC-959, AC-960). */
        const eligibleIds = new Set(
          selected
            .filter((trip) => unavailableReason(command, context([trip])) === null)
            .map((trip) => trip.id),
        )
        return {
          label: t(command.compactTitleKey ?? command.titleKey),
          onClick: (ids: ReadonlySet<string>) =>
            void dispatch(
              command,
              rows.filter((trip) => ids.has(trip.id)),
            ),
          disabled: refusal !== null,
          reason: refusal,
          eligibleIds: eligibleIds.size === selected.length ? undefined : eligibleIds,
        }
      }),
    [selected, rows, context, dispatch, t],
  )

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

      <FlagTripModal
        trips={flagging}
        reasonKeys={FLAG_REASONS}
        /* Dismissing answers the command with `null`, which is how `run` learns
           it was cancelled and returns without writing anything. */
        onClose={() => {
          answer.current?.(null)
          answer.current = null
          setFlagging([])
        }}
        /* Resolved when the command settles, so the form stays open for the
           round trip and a refusal lands in place (§11.2). */
        onConfirm={(_trips, reason) =>
          new Promise<void>((ok, fail) => {
            settled.current = { ok, fail }
            answer.current?.(reason)
            answer.current = null
          })
        }
        t={t}
      />
    </SingleColumnPage>
  )
}
