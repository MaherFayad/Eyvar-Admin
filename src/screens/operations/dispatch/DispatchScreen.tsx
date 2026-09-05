/**
 * Operations › Live Dispatch — `routeTable.ts:328`, shape `monitor`, pattern P6.
 *
 * A full-bleed map with the three feeds floating on one side and the layers,
 * alerts and legend on the other; it shares `components/map` with Market &
 * Zones so the two boards cannot disagree about where a district is.
 *
 * §2.1 three clients, no fixture import. AC-35 skeleton. AC-24 the board fails,
 * the shell does not. R8/AC-38 two kinds of empty. §11.2 every write refuses in
 * place. §2.2 nothing on the wire carries a coordinate: `geo.ts` places a mark
 * from a NAME and a captain from a registered district, and says so (O6).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { withFallback } from '../localCopy'
import { DISPATCH_EN } from './copy'
import {
  EYVAR_NOW,
  acknowledgeIntervention,
  assignRequest,
  getDispatchTelemetry,
  listDrivers,
  listInterventions,
  listRequests,
  listTrips,
  reassignIntervention,
} from '@/data/clients'
import {
  isApiError,
  type DispatchTelemetry,
  type Driver,
  type Intervention,
  type Paginated,
  type RideRequest,
  type SubTabRoute,
  type Trip,
  type TripStatus,
} from '@/data/types'
import { getTickCount, useAsync, useTick } from '@/hooks'
import { formatCount, formatPercent, type Language, type Translate } from '@/lib'
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

/**
 * T1.3 / AC-28 — how often the board re-reads, on the shell's one clock. Twenty
 * seconds rather than five: the reads are five, and a monitor whose rows move
 * under the cursor is worse than one that is twenty seconds old. It is also not
 * a divisor of thirty, so a capture taken twice thirty seconds apart differs.
 */
const REFRESH_SECONDS = 20

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

  /** The second the five reads were last asked for — the meta's `ago`. */
  const [readAtSecond, setReadAtSecond] = useState(() => getTickCount())

  const retry = () => {
    trips.refetch()
    requests.refetch()
    fleet.refetch()
    telemetry.refetch()
    interventionFeed.refetch()
    setReadAtSecond(getTickCount())
  }
  /* `retry` is rebuilt every render and the effect below must fire on the tick
     alone, so it reads the latest through a ref rather than a dependency. */
  const retryRef = useRef(retry)
  retryRef.current = retry

  /* T1.3 — the board re-reads on the shell's clock (AC-28: one interval for
     the app). The mount pass is skipped; the five reads have already run. */
  const refreshTick = useTick(REFRESH_SECONDS)
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    retryRef.current()
  }, [refreshTick])

  const [manualDispatchReq, setManualDispatchReq] = useState<{
    id: string
    riderName: string
    pickup: string
  } | null>(null)

  const canWrite = shell.permissions.permissions.includes('live_ops')

  /* §11.2 — the only thing that now blocks both intervention controls is the
     permission. The sentence names it and who can grant it. */
  const forbidden = t('state.forbidden.body', { permission: permissionName(t, 'live_ops') })

  /* T1.2 — acknowledge is a write. It throws on the 409 and `InterventionsCard`
     states the refusal on the row that made it. */
  const handleAcknowledge = async (item: Intervention) => {
    await acknowledgeIntervention(item.id)
    toast.success(t('dispatch.toast.acknowledged', { id: item.id }))
    retry()
  }

  const [reassigning, setReassigning] = useState<Intervention | null>(null)

  const handleReassignConfirm = async (
    interventionId: string,
    driverId: string,
    driverName: string,
  ) => {
    await reassignIntervention(interventionId, driverId)
    toast.success(t('dispatch.toast.reassigned', { id: interventionId, name: driverName }))
    retry()
  }

  /* The two 422s are different corrections — pick somebody else, pick somebody
     available — so each gets its own sentence inside the dialog (§11.2). */
  const reassignRefusal = (error: unknown): string | null => {
    if (!isApiError(error)) return null
    if (error.code === 'same_driver') return t('dispatch.intervention.refusal.same_driver')
    if (error.code === 'driver_unavailable') {
      return t('dispatch.intervention.refusal.driver_unavailable')
    }
    return null
  }

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

  /* T1.3 — the meta says how old the board is, not that it is connected (X4).
     The count it used to carry is on the feed's tabs and the layer rail; R10
     says a figure is stated once. */
  const header = (
    <PageHeader
      title={title}
      meta={
        trips.data && telemetry.data ? (
          <Freshness readAtSecond={readAtSecond} language={language} t={t} />
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
                  deniedReason={forbidden}
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
                      unavailableReason={canWrite ? null : forbidden}
                      onAcknowledge={handleAcknowledge}
                      onReassign={setReassigning}
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

          {/* Declared in the bleed because they render through a portal — where
              they sit in this tree decides nothing about where they paint. */}
          <ManualDispatchModal
            subjectId={manualDispatchReq?.id ?? null}
            title={t('dispatch.manual.title')}
            description={t('dispatch.manual.desc', {
              id: manualDispatchReq?.id ?? '',
              rider: manualDispatchReq?.riderName ?? '',
              pickup: manualDispatchReq?.pickup ?? '',
            })}
            facts={[
              { label: t('column.rider'), value: manualDispatchReq?.riderName ?? '' },
              { label: t('trip.pickup'), value: manualDispatchReq?.pickup ?? '' },
            ]}
            confirmLabel={t('dispatch.assignCaptain')}
            open={!!manualDispatchReq}
            onClose={() => setManualDispatchReq(null)}
            onConfirm={handleManualDispatchConfirm}
            t={t}
          />

          {/* T1.2 — the same picker, on an intervention. */}
          <ManualDispatchModal
            subjectId={reassigning?.id ?? null}
            title={t('dispatch.reassign.title')}
            description={t('dispatch.reassign.desc')}
            facts={[
              { label: t('column.rider'), value: reassigning?.riderName ?? '' },
              { label: t('dispatch.place'), value: reassigning?.place ?? '' },
            ]}
            confirmLabel={t('dispatch.reassignCaptain')}
            open={reassigning !== null}
            onClose={() => setReassigning(null)}
            onConfirm={handleReassignConfirm}
            refusalFor={reassignRefusal}
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
 * How old the board is, in its own component so the one-second bucket
 * re-renders a sentence and not fifty map marks (AC-28's second half).
 */
function Freshness({
  readAtSecond,
  language,
  t,
}: {
  readAtSecond: number
  language: Language
  t: Translate
}) {
  /* `useTick(1)` IS the second counter `readAtSecond` was taken from, so the
     subtraction is exact and needs no clock of its own. */
  const second = useTick(1)
  return (
    <span className="flex items-center gap-2">
      {/* The connection dot. Static — R18: a pulsing "live" indicator is the
          first thing an operator's eye learns to discard. */}
      <span aria-hidden="true" className="size-1.5 rounded-full bg-chart-series" />
      {t('dispatch.meta', {
        seconds: formatCount(Math.max(0, second - readAtSecond), language),
      })}
    </span>
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
