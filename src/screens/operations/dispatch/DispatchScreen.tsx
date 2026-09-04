/**
 * **Operations › Live Dispatch** — `routeTable.ts:328`, shape `monitor`,
 * pattern **P6**.
 *
 * ## What this screen is now, and why it changed shape
 *
 * It was a two-column monitor: a card grid of trips, a list of pending
 * requests and a grid of captain cards on the left, a velocity card and the
 * interventions on the right. Every row of it named a place — `Al Sahafa
 * District → King Saud University` — and none of it could say **where**. A
 * dispatch board whose whole subject is a city, drawn as three lists, is the
 * one representation that cannot answer the question an operator opens it to
 * ask: is the demand where the captains are?
 *
 * So the screen is a map now, full-bleed, with the three feeds floating on it
 * as one panel and the layers, alerts and legend on the other side. It is the
 * same arrangement Management › Market & Zones arrived at for the same reason,
 * and it uses **literally the same map** — `components/map` holds the
 * projection, the OpenStreetMap basemap fitted to it, the pan-and-zoom surface
 * and the zoom controls, so the two boards cannot disagree about where a
 * district is. See `components/map/projection.ts` for why that sharing is
 * load-bearing rather than tidy.
 *
 * ## What did NOT change
 *
 * Everything the remediation pass fixed here is intact and is listed below,
 * because a redesign is exactly where those regressions come back:
 *
 *   §2.1        the three feeds still come from `listTrips`, `listRequests`
 *               and `listDrivers`. No fixture import, no module-level record.
 *   AC-35       loading is a skeleton, never a spinner.
 *   AC-24       the board fails, the shell does not. `ErrorState scope="page"`
 *               with a retry bound to all three reads; the rail, the sub-tab
 *               list and the top bar keep working.
 *   R8 / AC-38  two kinds of empty. All three feeds at zero is the illustrated
 *               first-run; one feed at zero while the others carry rows is that
 *               scope being CLEAR, in `FeedPanel`.
 *   §11.2       `Dispatch captain` renders and refuses. It is on the row an
 *               operator has selected rather than on all six at once, which is
 *               a change of placement and not of policy — see `FeedPanel`.
 *   AC-74/75    every string is a key in `./copy.ts`, no `defaultValue`, no
 *               concatenation.
 *
 * ## Still not fixed, and now visible
 *
 *   §2.2  **nothing on this board carries a coordinate.** `Trip`,
 *         `RideRequest` and `Driver` have no position field, so `./geo.ts`
 *         places every mark from its place NAME and a captain from their
 *         registered district. That file says exactly what the API still owes
 *         us and the legend says it to the operator. This is the single most
 *         important thing to fix when the backend arrives.
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { withFallback } from '../localCopy'
import { DISPATCH_EN } from './copy'
import {
  EYVAR_NOW,
  assignRequest,
  getDispatchTelemetry,
  listDrivers,
  listInterventions,
  listRequests,
  listTrips,
} from '@/data/clients'
import type {
  DispatchTelemetry,
  Driver,
  Intervention,
  Paginated,
  RideRequest,
  SubTabRoute,
  Trip,
  TripStatus,
} from '@/data/types'
import { useAsync } from '@/hooks'
import { formatCount, formatDate, formatPercent } from '@/lib'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { useShell } from '@/shell/ShellContext'
import { permissionName } from '@/shell/permissions'
import { InterventionsCard } from './InterventionsCard'
import { ManualDispatchModal } from './ManualDispatchModal'
import { DispatchMap, type DispatchLayer, type LayerState } from './DispatchMap'
import { FeedPanel, type FeedTab } from './FeedPanel'
import { MapRail } from './MapRail'

/**
 * A trip is on the board while a captain is committed to it and it has not
 * ended: `assigned` (captain accepted, not moving yet), `en-route` (moving to
 * pickup), `in-trip` (rider aboard). `requested` is NOT here — that is the
 * pending feed's job, and it arrives through `listRequests` — and neither are
 * the four terminal statuses.
 */
const ACTIVE_TRIP_STATUSES: readonly TripStatus[] = ['assigned', 'en-route', 'in-trip']

/** One screenful of each feed. A monitor shows what is happening, not an archive. */
const FEED_PAGE_SIZE = 50

export function DispatchScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const navigate = useNavigate()
  /* AC-74 — the copy lives in `./copy.ts`. `withFallback` resolves keys the
     shell dictionary has not registered yet against that dictionary, so no
     English literal sits in this file.

     **Memoised, and it is load-bearing.** `withFallback` returns a NEW function
     on every call, and several screens carry `t` in a `deps` array — so an
     unmemoised wrapper re-ran the fetch, which re-rendered, which rebuilt the
     wrapper. Two suites hung outright. */
  const t = useMemo(() => withFallback(shell.language.t, DISPATCH_EN), [shell.language.t])
  const { dir, language } = shell.language

  const [tab, setTab] = useState<FeedTab>('pending')
  const [feedCollapsed, setFeedCollapsed] = useState(false)
  /* The one piece of state the list and the map share. Picking a row lights its
     pin and picking a pin lights its row — see `FeedPanel`. */
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [layers, setLayers] = useState<LayerState>({
    trips: true,
    pending: true,
    captains: true,
  })
  const [interventionsOpen, setInterventionsOpen] = useState(false)

  /* ── the three feeds, each through its own client (§2.1) ──────────────── */

  const trips = useAsync<Paginated<Trip>>(
    (signal) =>
      listTrips(
        {
          filters: [{ field: 'status', op: 'in', value: [...ACTIVE_TRIP_STATUSES] }],
          pageSize: FEED_PAGE_SIZE,
        },
        signal,
      ),
    /**
     * **The constant query is restated in `deps`, and that is the point.**
     *
     * This fetcher varies on nothing, so `deps: []` would be *correct* as a
     * dependency array and *wrong* as a cache key: `trips.list::[]` is a slot
     * every other constant-query read of `trips.list` would also claim, and the
     * two would then serve each other's rows.
     */
    { deps: [ACTIVE_TRIP_STATUSES, FEED_PAGE_SIZE], cacheKey: 'trips.list' },
  )

  /* `pending` is the client's own view — `searching ∪ offered`, legacy
     `reqStatusMatch` (`:10046`). Passing the view rather than re-deriving the
     predicate here is what stops this board and the Requests queue disagreeing
     about what "pending" means. */
  const requests = useAsync<Paginated<RideRequest>>(
    (signal) => listRequests({ view: 'pending', pageSize: FEED_PAGE_SIZE }, signal),
    /* `requests.list::[]` is **already taken** — `RequestsScreen`'s breached
       count reads the same operation with its own constant query and keys it on
       `[]`. Sharing that slot would paint this board's pending column from a
       one-row breach count. */
    { deps: ['pending', FEED_PAGE_SIZE], cacheKey: 'requests.list' },
  )

  const fleet = useAsync<Paginated<Driver>>(
    (signal) => listDrivers({ status: 'active', pageSize: FEED_PAGE_SIZE }, signal),
    /* `ManualDispatchModal` reads `drivers.list` with the same status and a
       different page size, and the two must not collide. */
    { deps: ['active', FEED_PAGE_SIZE], cacheKey: 'drivers.list' },
  )

  /* T1.1 — the three header readings, from `clients/dispatch.ts`. They were a
     `TELEMETRY` literal beside a sentence claiming a live connection (X4). */
  const telemetry = useAsync<DispatchTelemetry>((signal) => getDispatchTelemetry(signal), {
    deps: [],
    cacheKey: 'dispatch.telemetry',
  })

  /* T1.2 — interventions are a read, not a `useState` literal. */
  const interventionFeed = useAsync<Intervention[]>(
    (signal) => listInterventions({ status: 'open' }, signal),
    { deps: ['open'], cacheKey: 'dispatch.interventions' },
  )

  const activeTrips = trips.data?.items ?? []
  const pendingRequests = requests.data?.items ?? []
  const onlineDrivers = fleet.data?.items ?? []
  const interventions = interventionFeed.data ?? []

  /* One board, one load. A monitor that renders two of its three feeds and a
     skeleton in the third reads as broken chrome, so the three reads resolve to
     one page state — and one retry that re-runs all three. */
  const loading =
    trips.status === 'loading' || requests.status === 'loading' || fleet.status === 'loading'
  const failed =
    trips.status === 'error' || requests.status === 'error' || fleet.status === 'error'
  const boardEmpty =
    !loading &&
    !failed &&
    activeTrips.length === 0 &&
    pendingRequests.length === 0 &&
    onlineDrivers.length === 0

  const retry = () => {
    trips.refetch()
    requests.refetch()
    fleet.refetch()
    telemetry.refetch()
    interventionFeed.refetch()
  }

  const [manualDispatchReq, setManualDispatchReq] = useState<{
    id: string
    riderName: string
    pickup: string
  } | null>(null)

  const canWrite = shell.permissions.permissions.includes('live_ops')

  /**
   * **The two intervention handlers are gone, and that is the fix.**
   *
   * They each spliced the literal array above and toasted success. Nothing was
   * acknowledged and no captain was reassigned — the alert vanished because
   * this component forgot it, and returned on the next reload. §11.2 says a
   * blocked control is disabled in place **with a stated reason**, never
   * hidden, so `InterventionsCard` renders both and refuses both.
   */
  const interventionsUnavailable = t('dispatch.interventions.unavailable')

  /**
   * **The write, and it used to not exist.**
   *
   * This function toasted `Request {id} assigned to captain {name}` and called
   * `retry()`. The refetch then re-rendered the same request **still
   * unassigned**, silently contradicting the sentence the operator had just
   * read. `assignRequest` has been fully implemented in `clients/requests.ts`
   * (`:246`) the whole time, including its 422 and its 409.
   *
   * The failure is deliberately re-thrown rather than caught here:
   * `ManualDispatchModal` awaits it, keeps itself open, keeps the operator's
   * choice, and states the refusal in place (§11.2).
   */
  const handleManualDispatchConfirm = async (
    requestId: string,
    driverId: string,
    driverName: string,
  ) => {
    await assignRequest(requestId, driverId)
    toast.success(t('dispatch.toast.dispatched', { id: requestId, name: driverName }))
    /* The board has changed on the server: that request now has a captain, and
       that captain now has a trip. Re-read rather than splice — legacy splices
       the record out of the array (`:11895`) and that is why its counts drift. */
    retry()
    /* The selection pointed at a request that is no longer pending. Keeping it
       would leave a lit pin on a row that has left the feed. */
    setSelectedId(null)
  }

  const title = t(row.titleKey)

  const totals = {
    pending: requests.data?.total ?? pendingRequests.length,
    trips: trips.data?.total ?? activeTrips.length,
    fleet: fleet.data?.total ?? onlineDrivers.length,
  } as const

  /* T1.1 — the meta names a count and **when the figures were measured**. It
     used to read "live telemetry connected", which nothing in this screen was
     (X4). Both halves need their read, so it waits for both. */
  const header = (
    <PageHeader
      title={title}
      meta={
        trips.data && telemetry.data ? (
          <span className="flex items-center gap-2">
            {/* The connection dot. Static — R18: a pulsing "live" indicator is
                the first thing an operator's eye learns to discard. */}
            <span aria-hidden="true" className="size-1.5 rounded-full bg-chart-series" />
            {t('dispatch.meta', {
              count: formatCount(trips.data.total, language),
              time: formatDate(telemetry.data.asOf, { style: 'time', language }),
            })}
          </span>
        ) : null
      }
      aside={
        /* Yielding to the error state below rather than presenting a figure
           beside a board that could not load. */
        failed || loading || !telemetry.data ? null : (
          <div className="flex items-start gap-4 wide:gap-6">
            <Reading
              label={t('dispatch.reading.matchTime')}
              value={t('dispatch.reading.seconds', {
                seconds: formatCount(telemetry.data.medianMatchSeconds, language),
              })}
            />
            <Reading
              label={t('dispatch.reading.autoMatch')}
              value={formatPercent(telemetry.data.autoMatchPercent, language)}
              tone="up"
            />
            <Reading
              label={t('dispatch.reading.utilisation')}
              value={formatPercent(telemetry.data.fleetUtilisationPercent, language)}
            />
          </div>
        )
      }
      t={t}
      dir={dir}
    />
  )

  /* ── the four states ──────────────────────────────────────────────────── */

  const pageState = loading ? (
    /* AC-35 — the feed-shaped skeleton. P6's own skeleton draws the monitor
       GRID, and this screen is a bleed with a map in it, so the pattern that
       matches the content is the feed. */
    <LoadingSkeleton pattern="P10" label={t('overview.loading', { resource: title })} />
  ) : failed ? (
    /* AC-24 — the board fails, the shell does not, and `Try again` re-runs all
       three reads rather than only the one the operator happens to be looking
       at. It is the one primary on a page showing nothing else (R3). */
    <ErrorState
      scope="page"
      heading={t('state.pageError.title', { resource: title })}
      message={t('state.pageError.body')}
      action={{ label: t('state.pageError.action'), onClick: retry }}
    />
  ) : boardEmpty ? (
    /* R8 / AC-38 — no trips, no requests AND no captains is the board having
       nothing at all, which is the illustrated first-run. */
    <EmptyState
      kind="first-run"
      heading={t('dispatch.empty.board.heading')}
      body={t('dispatch.empty.board.body')}
      actions={[
        {
          label: t('dispatch.empty.board.action'),
          onClick: () => navigate('/operations/ride-requests'),
          primary: true,
        },
      ]}
    />
  ) : null

  const board = pageState === null

  return (
    <SingleColumnPage
      /* `flow` — the page sizes to its content and the content region scrolls
         it, which is what lets the map claim the residual height without the
         states below it being pushed off the screen. */
      body="flow"
      bleed={
        <>
          {/* The header rides in the bleed, padded to the same inline inset the
              page block uses, so §8's "the title's inline-start edge is the
              first card's inline-start edge" still holds against a map that
              has no inline-start edge of its own. */}
          <div className="px-page-pad pt-8 compact:pt-6 wide:px-page-pad-wide wide:pt-11">
            {header}
          </div>

          {board && (
            <DispatchMap
              trips={activeTrips}
              requests={pendingRequests}
              captains={onlineDrivers}
              layers={layers}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id)
                /* Picking a pin moves the feed to the list that pin is in, so
                   the row it lit is one an operator can actually see. */
                if (id !== null) {
                  if (activeTrips.some((trip) => trip.id === id)) setTab('trips')
                  else if (pendingRequests.some((request) => request.id === id)) setTab('pending')
                  setFeedCollapsed(false)
                }
              }}
              language={language}
              t={t}
              startPanel={
                <FeedPanel
                  tab={tab}
                  onTab={setTab}
                  collapsed={feedCollapsed}
                  onCollapsed={setFeedCollapsed}
                  trips={activeTrips}
                  requests={pendingRequests}
                  captains={onlineDrivers}
                  totals={totals}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  canDispatch={canWrite}
                  deniedReason={t('state.forbidden.body', {
                    permission: permissionName(t, 'live_ops'),
                  })}
                  onDispatch={(request) =>
                    setManualDispatchReq({
                      id: request.id,
                      riderName: request.riderName,
                      pickup: request.pickup,
                    })
                  }
                  language={language}
                  dir={dir}
                  t={t}
                />
              }
              endPanel={
                <MapRail
                  layers={layers}
                  onToggleLayer={(layer: DispatchLayer) =>
                    setLayers((current) => ({ ...current, [layer]: !current[layer] }))
                  }
                  counts={{
                    trips: totals.trips,
                    pending: totals.pending,
                    captains: totals.fleet,
                  }}
                  interventionCount={interventions.length}
                  interventionsOpen={interventionsOpen}
                  onInterventionsOpen={setInterventionsOpen}
                  interventions={
                    /* Its own read, so a failure takes down what it owns and
                       nothing else (AC-41). */
                    <InterventionsCard
                      items={interventions}
                      now={telemetry.data?.asOf ?? EYVAR_NOW}
                      unavailableReason={interventionsUnavailable}
                      t={t}
                    />
                  }
                  language={language}
                  dir={dir}
                  t={t}
                />
              }
            />
          )}

          {/* Declared in the bleed because it renders through a portal — where
              it sits in this tree decides nothing about where it paints. */}
          <ManualDispatchModal
            requestId={manualDispatchReq?.id ?? null}
            riderName={manualDispatchReq?.riderName ?? ''}
            pickup={manualDispatchReq?.pickup ?? ''}
            open={!!manualDispatchReq}
            onClose={() => setManualDispatchReq(null)}
            onConfirm={handleManualDispatchConfirm}
            t={t}
          />
        </>
      }
    >
      {/* **`null` in the ordinary content state, and that is load-bearing.**
          The screen IS the bleed — a header and a map that fills what is left —
          so on a healthy read there is no second half of the page, and
          `SingleColumnPage` skips the padded block entirely rather than drawing
          64px of ground under the map. The states above are the only thing that
          ever goes there. */}
      {pageState}
    </SingleColumnPage>
  )
}

/**
 * One header reading: a label above a figure.
 *
 * H1/H2 — the label is the `--text-2xs` meta rung in caps, the figure is
 * `--text-xl` with tabular figures, because these three numbers sit side by
 * side and a proportional `1` would make the column ragged as they tick.
 */
function Reading({
  label,
  value,
  tone = 'ink',
}: {
  label: string
  value: string
  tone?: 'ink' | 'up'
}) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={
          /* One step down below the wide breakpoint: three 24px figures beside
             a 30px title squeeze the title into two lines at 1024 and under. */
          tone === 'up'
            ? 'text-lg tabular-nums text-success-foreground wide:text-xl'
            : 'text-lg tabular-nums text-foreground wide:text-xl'
        }
      >
        {value}
      </span>
    </div>
  )
}
