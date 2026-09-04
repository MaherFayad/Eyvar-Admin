/**
 * **The captain's trips, as a paginated table** — the owner's amendment to
 * D-CP-13.
 *
 * ```
 *  Trips                                          [ Search trips ]  [ ⚙ ]
 *  412 trips completed · Last trip 25 Jun 07:00
 *  ──────────────────────────────────────────────────────────────────────
 *  Trip        Rider          Status           Fare        Started
 *  TRP-8001    Nora Al-Harbi  Cancelled    0.00 SAR   25 Jun 09:14
 *  …
 *                                                  ‹  1–10 of 37  ›
 * ```
 *
 * ## Why this replaced a figure
 *
 * The owner, on the built page: *"trips completed is usually a list."* A
 * lifetime count of `1,284` is not a thing an operator acts on — the trips
 * are — and it is the same instruction they gave about the wallet: *"make this
 * a table not a record so we can add pagination without it becoming infinite
 * scroll."* So this is a real `DataTable` with real pages, not a scrolling list
 * and not an accordion.
 *
 * ## The count did not disappear; it moved into the table's own head
 *
 * `heading` / `subheading` put the section title inside the toolbar row, so the
 * title and the control cluster share one line and the count reads as a
 * subtitle beneath (`docs/ref/table.md`). **A table has view tabs or a heading,
 * never both** — one union in `table/IndexToolbar.types.tsx` — and this table
 * has no tabs, so it takes the heading arm unchanged.
 *
 * **The subheading names a fact about the CAPTAIN, not a row count**, and the
 * wording carries the difference: `1,284 trips completed` is
 * `Driver.totalTrips`, the lifetime figure the profile has always stated. The
 * pagination beneath says how many trips this table holds. They are two
 * numbers about two things and neither is derived from the other — which is why
 * the subheading says *completed* rather than a bare number that would read as
 * a contradiction the first time a cancelled trip appeared in the rows.
 *
 * ## `Last trip` STAYS, and the measurement is why
 *
 * The proposal was to drop it: the rows are `startedAt` descending, so the
 * first row is the newest trip and restating it above would be one fact twice
 * on one screen — the defect `payoutAccountFields` refuses for the cash debt.
 *
 * **Measured in Chromium on `DRV-0101`, it is not the same fact.**
 * `Driver.lastTripAt` is `25 Jun 07:00`; the table's first row is `TRP-8001`,
 * **`Cancelled`, `0.00 SAR`, started `25 Jun 09:14`**. The newest trip *record*
 * is not the last trip this captain *drove*, and a cancellation two hours later
 * is exactly the case that makes the difference operationally interesting. The
 * count is `Trips completed` and the date is the last completed trip; reading
 * either off row one would be wrong on this captain today.
 *
 * So the subheading carries both, as **two complete localised facts with a
 * decorative separator between them** — `DriverEarningsTable`'s own
 * construction for `{count} postings · {window}`, and the reason it is that
 * rather than one key: §9.6 forbids a sentence built from two translated
 * fragments, and this is two sentences that happen to share a line.
 *
 * ## Where it sits, and why the timeline gains a heading
 *
 * The Activity tab is now **the trips, then the audit trail**. The timeline
 * carried no heading on the ground that *the tab is its heading* (§4B.8), and
 * that stops being true the moment a second list is on the tab: two headless
 * lists read as one list that changed shape halfway down. Trips are the
 * captain's primary activity and are what an operator came for; the timeline is
 * the record of everything else. So this table leads and `DriverTimeline` takes
 * a `SectionHeading` — **which is §4B.8's rule applied rather than broken**:
 * *no section repeats the tab's own name*, and `Activity history` is not
 * `Activity`.
 *
 * ## The address is not written to
 *
 * `urlState: false`. This table shares an address with a profile page that
 * carries `?view=` and `?entity=`, and a `?q=` or `?page=` written here would
 * be inherited by whatever index the back control returns to — the same
 * reasoning `DriverEarningsTable` gives for the ledger, and the reason
 * `useIndexTable` defaults a ledger out of the address at all.
 *
 * ## No selection, no row actions, and no second flag path
 *
 * `mode: 'index'` needs a `getRowId`, and `DataTable` renders the checkbox
 * column only when `bulkActions` is non-empty — which it is not here. Flagging
 * a trip is `TripsScreen`'s, with its refusal set, its modal and its audit
 * line; a second entry point on a profile would be a second implementation of
 * a mutation, which is the divergence §3 exists to refuse. **This surface
 * commits nothing** (§6.2), exactly as `DriverFooter` records for the profile
 * as a whole.
 *
 * Rules applied
 *   §7.1        the section title is `DataTable`'s `heading`, so it shares a
 *               row with the toolbar's control cluster and the count is its
 *               subtitle. `tabs` and `heading` are one slot and the type says so.
 *   §7.3 r5     the trailing visible column is a DATE. A truncated `id` or
 *               `money` reads as a different valid value; a truncated date does
 *               not.
 *   R5a         the ONE red carrier a trip row may have is the leading-edge
 *               marker on a flagged trip, and the `Status` word carries the
 *               rest. **No red badge and no red row** — `TripsScreen`'s own
 *               ruling, reused rather than re-decided.
 *   §8.3.1      **the unit is in the CELL here, not the header, and that is
 *               `TripsScreen`'s construction reused rather than re-decided.**
 *               The `Fare` column is `trips.col.fare` and is the same column
 *               the Trips index renders; changing where the unit sits on a
 *               profile would make two tables disagree about one column. The
 *               product's ledgers put it in the header and this table does not
 *               — **reported for the Trips index's owner**, where the decision
 *               belongs, rather than forked here.
 *   P8-T1       every id this table names opens that record, through
 *               `useEntityLinks`, and degrades to muted text with a stated
 *               reason where the record cannot be resolved.
 *   §9.2        money columns are `align: 'end'` and that does NOT flip in
 *               Arabic.
 */

import { useMemo } from 'react'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { Money } from '@/components/Money'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import { listTrips } from '@/data/clients'
import type { Paginated, Trip, TripStatus } from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatDate, type Language, type Translator } from '@/lib'
import { Cell, DateCell, Identity, NumCell } from '@/screens/queues/cells'
import { EntityLink, useEntityLinks } from '@/screens/operations/EntityLink'

/**
 * R7 tones, keyed on the **union** so a new status cannot fall through to
 * `neutral`. **Imported in spirit, not re-decided**: this is `TripsScreen`'s
 * map and the two must not disagree about what colour `late` is. It is copied
 * rather than exported because `TripsScreen` holds it as a module constant
 * behind a screen barrel that also pulls the flag modal and the detail drawer
 * — **reported** as a candidate for `screens/operations/trips/domain.ts`, which
 * is where `people/domain.ts` keeps the identical kind of map.
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

export interface DriverTripsTableProps {
  /** Scopes every query. `listTrips` filters on it server-side (`clients/trips.ts`). */
  driverId: string
  /**
   * `Driver.totalTrips` — the LIFETIME completed count, and the subheading.
   * Passed rather than derived: it is a field on the record this page already
   * read, and a second count computed from a page of rows would be a different
   * number wearing the same label.
   */
  totalTrips: number
  /**
   * `Driver.lastTripAt` — the last trip this captain **drove**, `null` where
   * they have driven none.
   *
   * It is not derivable from row one: the rows are every trip record newest
   * first, and `DRV-0101`'s newest is a cancellation started two hours after
   * the last completed trip. See the header.
   */
  lastTripAt: string | null
  t: Translator
  language: Language
}

export function DriverTripsTable({
  driverId,
  totalTrips,
  lastTripAt,
  t,
  language,
}: DriverTripsTableProps) {
  /* **Newest first**, which is what makes the first row the last trip and
     retires the caption that used to state it above. `pageSize` is 10 rather
     than the product's 25: this table sits inside a tab panel under a band, a
     banner and a strip, and 25 rows would push its own pagination two screens
     below the thing it paginates. */
  const table = useIndexTable<Trip>({
    mode: 'index',
    getRowId: (trip) => trip.id,
    initialSort: { field: 'startedAt', dir: 'desc' },
    pageSize: 10,
    /* The profile's address belongs to the profile. See the header. */
    urlState: false,
  })

  const query = useMemo(
    () => ({ ...table.params, driverId }),
    [table.params, driverId],
  )

  const data = useAsync<Paginated<Trip>>((signal) => listTrips(query, signal), {
    /* Everything the fetcher varies on is in `deps`, which is also what makes
       the cache key correct — `requestCacheKey` serialises them. */
    deps: [query],
    cacheKey: 'trips.list',
  })

  const rows = useMemo(() => data.data?.items ?? [], [data.data])

  /* **Two facts, one line, a decorative separator between them** — never one
     sentence assembled from two translated fragments (§9.6). The count is the
     captain's lifetime completed figure; the date is the last trip they drove,
     which is **not** the table's first row on a captain whose newest record is
     a cancellation. Both are on `Driver`, so neither waits on this read. */
  const subheading =
    lastTripAt === null
      ? t.plural('entity.driver.trips.count', { count: totalTrips })
      : `${t.plural('entity.driver.trips.count', { count: totalTrips })} · ${t(
          'profile.driver.figure.lastTrip',
          { date: formatDate(lastTripAt, { style: 'day-month-time', language }) },
        )}`

  /* P8-T1 — every id this table names is asked about once, together. */
  const hrefFor = useEntityLinks(
    useMemo(() => rows.flatMap((trip) => [trip.id, trip.riderId]), [rows]),
  )

  const columns: ReadonlyArray<DataColumn<Trip>> = useMemo(
    () => [
      {
        id: 'id',
        emphasis: 'primary',
        header: t('trips.col.id'),
        csv: (trip) => trip.id,
        /* AC-104 / AC-106 — the identity is implicitly pinned, so a flagged
           row's marker stays visible at every horizontal scroll offset. */
        alwaysVisible: true,
        minWidth: 168,
        dataType: 'id',
        sortField: 'id',
        cell: (trip) => {
          const href = hrefFor(trip.id)
          /* §7.7 — line 2 QUALIFIES line 1. The route is what an operator reads
             next after the id, and it retires a 200px column. */
          const secondary =
            trip.pickup === null || trip.destination === null
              ? trip.route
              : t('trips.route', { pickup: trip.pickup, destination: trip.destination })
          if (href === null) {
            return (
              <span className="flex min-w-0 max-w-80 flex-col justify-center">
                <EntityLink
                  href={null}
                  code
                  label={t('trips.open.trip', { id: trip.id })}
                  reason={t('trips.entity.unresolved')}
                  reasonId={`captain-trip-${trip.id}-unresolved`}
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
                  trip is under investigation. */}
              {trip.flagged && <RowCriticalMarker />}
              <Identity
                to={href}
                name={trip.id}
                code
                secondary={secondary}
                label={t('trips.open.trip', { id: trip.id })}
              />
            </>
          )
        },
      },
      /* **No `Captain` column.** Every row on this table is this captain, so
         the column would repeat one name down the whole page and take 152px
         from the two that truncate. Same argument `TripsScreen` makes for
         dropping `kind` from a kind-scoped table. */
      {
        id: 'riderName',
        header: t('trips.col.rider'),
        emphasis: 'data',
        width: 152,
        dataType: 'text',
        sortField: 'riderName',
        cell: (trip) => (
          <Cell>
            <EntityLink
              href={hrefFor(trip.riderId)}
              label={t('trips.open.rider', { name: trip.riderName })}
              reason={t('trips.entity.unresolved')}
              reasonId={`captain-trip-${trip.id}-rider-unresolved`}
            >
              {trip.riderName}
            </EntityLink>
          </Cell>
        ),
      },
      {
        id: 'status',
        header: t('trips.col.status'),
        emphasis: 'data',
        width: 112,
        dataType: 'enum',
        sortField: 'status',
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
        header: t('trips.col.fare'),
        emphasis: 'data',
        /* 128, measured by `TripsScreen`: at 112 the cell offers 88px of inner
           width and `1,284.50 SAR` needs ~94, so it truncated to `1,284.50 …`
           — which an operator reads as a different number rather than as a
           clipped one. A money column must never ellipsis. */
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
        width: 128,
        dataType: 'date',
        sortField: 'startedAt',
        cell: (trip) => (
          <DateCell>{formatDate(trip.startedAt, { style: 'day-month-time', language })}</DateCell>
        ),
      },
    ],
    [hrefFor, t, language],
  )

  return (
    <DataTable
      heading={t('entity.driver.trips.title')}
      /* **The captain's lifetime figure, named as what it is.** `null` while
         the record has not landed is not possible here — `totalTrips` is a
         required field on a record the page already holds — so the subtitle
         never claims a number it has not read. */
      subheading={subheading}
      table={table}
      rows={rows}
      columns={columns}
      getRowId={(trip) => trip.id}
      status={data.status}
      total={data.data?.total ?? 0}
      t={t}
      language={language}
      tableId="profile.captainTrips"
      searchPlaceholder={t('entity.driver.trips.search')}
      /* The owner's instruction, in one prop: *"so we can add pagination
         without it becoming infinite scroll."* */
      infiniteScroll={false}
      /* No avatars on a trip row — the identity is a code, not a person. */
      rowMedia={false}
      /* §9.1 — the identity link is the click target and the row is not. */
      onRowClick={undefined}
      /**
       * **A captain who has taken no trips**, and it is a real first-run: the
       * record exists and nothing has happened on it yet.
       *
       * **No action, and that is not a dead end.** §4.7's rule is *never a dead
       * end you could have escaped*, and there is nothing to escape to —
       * nobody creates a trip, and a link to the Trips index scoped to a
       * captain with none would land on the same emptiness one screen further
       * away. `DriverEarningsTable` can offer `Back to payouts` because a
       * payout is somewhere money is worked; a trip has no such place.
       */
      firstRun={{
        heading: t('entity.driver.trips.empty.heading'),
        body: t('entity.driver.trips.empty.body'),
        actions: [],
      }}
      /* The shared sentence, not a second spelling of it. `TripsScreen`
         declares it and this table narrows the same collection. */
      noMatch={{ message: t('trips.empty.noMatch') }}
      error={{ message: t('trips.error.list'), onRetry: data.refetch }}
    />
  )
}
