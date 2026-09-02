/**
 * **Operations › Live Dispatch** — `routeTable.ts:328`, shape `monitor`,
 * pattern **P6**.
 *
 * **What changed here, and why (remediation §2.1 + §4.3).** This screen used to
 * import `fixtures/trips`, `fixtures/requests` and `fixtures/drivers` straight
 * into the component and filter them in a `useMemo`. That is the one thing the
 * data seam exists to prevent: with `VITE_DATA_SOURCE=http` the rest of the
 * product would cut over to a real API and this board would keep serving mock
 * rows for ever. All three reads now go through the clients that already
 * existed — `listTrips`, `listRequests`, `listDrivers` — and the screen holds
 * no records of its own.
 *
 * Wiring the seam is also what makes the four states possible, because a
 * fixture array can never be loading and can never fail. All four are now
 * present in **both** regions of the monitor shell (**AC-24**, **AC-36**,
 * `docs/ref/states.md`).
 *
 * Rules applied
 *   §2.1        every list comes from `@/data/clients`. No fixture import, no
 *               module-level record constant.
 *   AC-35       loading is a SKELETON, never a spinner. **P6's skeleton draws
 *               the monitor GRID**, which `MonitorShell` already draws; nesting
 *               it inside the canvas column would paint a second aside. So the
 *               canvas takes **P10**, the feed shape it actually contains, and
 *               the aside takes P10 as well — the skeleton matches the content,
 *               which is what AC-35 asks for.
 *   AC-24       the screen fails, the shell does not. `ErrorState scope="page"`
 *               sits in the canvas with a retry bound to `refetch` on all three
 *               reads; the rail, the sub-tab list and the top bar keep working.
 *   R8 / AC-38  two kinds of empty. All three feeds at zero is the board having
 *               nothing at all — the illustrated first-run. One feed at zero
 *               while the others carry rows is that scope being CLEAR, which is
 *               `kind="cleared"` with a sentence naming which scope (F-3, and
 *               `states.md` "an empty card says which kind of empty it is").
 *   R3          one primary per screen. The error state's `Try again` is that
 *               primary when it is showing; the row-level `Dispatch captain`
 *               buttons are the primary only when content is on screen.
 *   §9.1        logical utilities in everything written here (`ms-`).
 *
 * **§4.1 and §4.2 are closed** (2026-09-02):
 *   §4.1 — the ten palette classes are gone. Warning and success now come from
 *          the closed five-tone set (`bg-warning`, `text-warning-foreground`,
 *          `text-success-foreground`), and the two bracketed arbitrary sizes
 *          (eleven and ten pixels) are back on the ramp — H2 puts the tab count
 *          pills on the 11px step, whose declared job is exactly a count
 *          numeral, and everything else on the 12px meta step. The sizes are
 *          named in words above because a bracketed class written in a comment
 *          is a candidate Tailwind emits a rule for. **The pickup/destination pins changed shape, not just
 *          colour**: both were `MapPin` and green-vs-red was the ONLY thing
 *          telling them apart, so the distinction was invisible to a
 *          colour-blind operator and it read as good-vs-bad, which the two ends
 *          of a route are not. Destination is now `Navigation`, and both are
 *          muted ink.
 *   §4.2 — the 42 `t(key, { defaultValue })` calls are gone. `./copy.ts` holds
 *          them as a real dictionary, reached through `withFallback` — the same
 *          arrangement Trips and Subscriptions use, and it needs no edit to
 *          `src/i18n/dictionaries.ts`. Consolidating them surfaced **16 copy
 *          defects** that were unreviewable while scattered through JSX,
 *          including the US spelling `Fleet Utilization` and eleven Title Case
 *          headings.
 *
 * Known, still NOT fixed here:
 *   §2.2 — the three figures in the Dispatch velocity card are hardcoded. They
 *          have no type, no fixture and no client. See the note at `telemetry`.
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { withFallback } from '../localCopy'
import { DISPATCH_EN } from './copy'
import { assignRequest, listDrivers, listRequests, listTrips } from '@/data/clients'
import type {
  Driver,
  Paginated,
  RideRequest,
  SubTabRoute,
  Trip,
  TripStatus,
} from '@/data/types'
import { useAsync } from '@/hooks'
import { formatCount } from '@/lib'
import { Money } from '@/components/Money'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { MonitorShell } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { permissionName } from '@/shell/permissions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Activity, Car, Clock, MapPin, Navigation, User } from 'lucide-react'
import { InterventionsCard } from './InterventionsCard'
import { ManualDispatchModal } from './ManualDispatchModal'

/**
 * A trip is on the board while a captain is committed to it and it has not
 * ended: `assigned` (captain accepted, not moving yet), `en-route` (moving to
 * pickup), `in-trip` (rider aboard). `requested` is NOT here — that is the
 * pending feed's job, and it arrives through `listRequests` — and neither are
 * the four terminal statuses. This is the same predicate the screen carried
 * inline against the fixture array; it is now a server-side filter so the board
 * does not page in the whole trip history to throw most of it away.
 */
const ACTIVE_TRIP_STATUSES: readonly TripStatus[] = ['assigned', 'en-route', 'in-trip']

/** One screenful of each feed. A monitor shows what is happening, not an archive. */
const FEED_PAGE_SIZE = 50

/** §7.4 — the fleet column shows a sample; the count badge shows the truth. */
const FLEET_CARDS = 9

export function DispatchScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const navigate = useNavigate()
  /* AC-74 — the copy lives in `./copy.ts`. `withFallback` resolves keys the
     shell dictionary has not registered yet against that dictionary, so no
     English literal sits in this file. See `../localCopy`. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, DISPATCH_EN),
    [shell.language.t],
  )
  const { dir, language } = shell.language

  const [activeTab, setActiveTab] = useState<'trips' | 'pending' | 'fleet'>('trips')

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
     * two would then serve each other's rows. Naming the query's own constants
     * makes the key describe the request rather than the operation.
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
       one-row breach count. The view and the page size distinguish it. */
    { deps: ['pending', FEED_PAGE_SIZE], cacheKey: 'requests.list' },
  )

  const fleet = useAsync<Paginated<Driver>>(
    (signal) => listDrivers({ status: 'active', pageSize: FEED_PAGE_SIZE }, signal),
    /* Same reasoning as the two above: the status and the page size are the
       whole query, so they are the whole key. `ManualDispatchModal` reads
       `drivers.list` with the same status and a different page size, and the
       two must not collide. */
    { deps: ['active', FEED_PAGE_SIZE], cacheKey: 'drivers.list' },
  )

  const activeTrips = trips.data?.items ?? []
  const pendingRequests = requests.data?.items ?? []
  const onlineDrivers = fleet.data?.items ?? []

  /* One board, one load. A monitor that renders two of its three columns and a
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
  }

  /* Simulated live interventions. Local state, not a feed: these have no type,
     no fixture and no client (`REMEDIATION-PLAN.md` §2.2 class), which is why
     they neither load nor fail. Reported, not invented here. */
  const [interventions] = useState([
    {
      id: 'INT-01',
      kind: 'delayed' as const,
      title: 'Delayed Arrival — SUB-1041',
      subtitle: 'Captain Abdullah Al-Otaibi is 8 mins delayed for pickup at Al-Olaya',
      elapsedMinutes: 8,
      tripId: 'TRP-1002',
    },
    {
      id: 'INT-02',
      kind: 'sos' as const,
      title: 'Emergency Signal — TRP-1004',
      subtitle: 'Rider flagged route deviation on King Fahd Rd',
      elapsedMinutes: 3,
      tripId: 'TRP-1004',
    },
  ])

  // Manual dispatch modal
  const [manualDispatchReq, setManualDispatchReq] = useState<{
    id: string
    riderName: string
    pickup: string
  } | null>(null)

  const canWrite = shell.permissions.permissions.includes('live_ops')
  /* One id for the whole feed: the refusal is a fact about the operator, not
     about a request, so N identical sentences under N rows would be N copies of
     one sentence. Every disabled control points at the single line rendered
     once beneath the feed. */
  const dispatchDeniedId = 'dispatch-denied-live-ops'

  /**
   * **The two intervention handlers are gone, and that is the fix.**
   *
   * `handleResolveIntervention` and `handleReassignIntervention` each spliced
   * the literal array above and toasted success. Nothing was acknowledged and
   * no captain was reassigned - the alert vanished because this component
   * forgot it, and returned on the next reload. `Automated captain reassignment
   * dispatched` was reported to an operator about a rider who was still
   * waiting.
   *
   * Interventions have no type, no fixture and no client, so there was nothing
   * for either handler to call. §11.2 says a blocked control is disabled in
   * place **with a stated reason**, never hidden, so `InterventionsCard` now
   * renders both and refuses both with this sentence. The model it needs is in
   * the handoff.
   */
  const interventionsUnavailable = t('dispatch.interventions.unavailable')

  /**
   * **The write, and it used to not exist.**
   *
   * This function toasted `Request {id} assigned to captain {name}` and called
   * `retry()`. The refetch then re-rendered the same request **still
   * unassigned**, silently contradicting the sentence the operator had just
   * read — the worst shape a defect can take, because the console looked like it
   * worked. `assignRequest` has been fully implemented in `clients/requests.ts`
   * (`:246`) the whole time, including its 422 and its 409.
   *
   * The toast fires **after** the promise resolves, and the failure is
   * deliberately re-thrown rather than caught here: `ManualDispatchModal` awaits
   * it, keeps itself open, keeps the operator's choice, and states the refusal
   * in place (§11.2). A `catch` here would swallow that and leave the modal
   * closing on a failure.
   */
  const handleManualDispatchConfirm = async (
    requestId: string,
    driverId: string,
    driverName: string,
  ) => {
    await assignRequest(requestId, driverId)
    toast.success(t('dispatch.toast.dispatched', { id: requestId,
      name: driverName }))
    /* The board has changed on the server: that request now has a captain, and
       that captain now has a trip. Re-read rather than splice — legacy splices
       the record out of the array (`:11895`) and that is why its counts drift. */
    retry()
  }

  const title = t(row.titleKey)

  /* The meta line names a count, so it only exists once there is a count to
     name. `—` here would be a claim that the number is zero. */
  const metaText = trips.data
    ? `${formatCount(trips.data.total, language)} ${t('dispatch.inTransit')} · ${t('dispatch.liveConnected')}`
    : null

  const header = (
    <PageHeader
      title={title}
      meta={metaText}
      t={t}
      dir={dir}
    />
  )

  /* ── canvas: loading → error → empty → content ────────────────────────── */

  const feeds = (
    <div className="flex flex-col gap-4">
      {/* Live Dispatch Feed Switcher */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as typeof activeTab)} className="w-full">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <TabsList className="bg-muted/40 p-1">
            <TabsTrigger value="trips" className="text-xs gap-1.5">
              <Navigation className="h-3.5 w-3.5" />
              {t('dispatch.feed.activeTrips')}
              {/* H2 — the count-badge numeral is `--text-2xs`'s ONE declared
                  job. Its three siblings were 11px arbitrary, 11px arbitrary
                  and `text-2xs`: three sizes for one thing, and two of them
                  off the ramp. */}
              <span className="ms-1 text-2xs font-mono rounded-full bg-primary/10 text-primary px-1.5">
                {formatCount(trips.data?.total ?? 0, language)}
              </span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {t('dispatch.feed.pendingMatch')}
              <span className="ms-1 text-2xs font-mono rounded-full bg-warning text-warning-foreground px-1.5">
                {formatCount(requests.data?.total ?? 0, language)}
              </span>
            </TabsTrigger>
            <TabsTrigger value="fleet" className="text-xs gap-1.5">
              <Car className="h-3.5 w-3.5" />
              {t('dispatch.feed.fleet')}
              <span className="ms-1 text-2xs font-mono rounded-full bg-muted text-muted-foreground px-1.5">
                {formatCount(fleet.data?.total ?? 0, language)}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Active In-Progress Trips */}
        <TabsContent value="trips" className="mt-4 space-y-3">
          {activeTrips.length === 0 ? (
            /* R8 — a live board with nothing in transit is CLEAR, not unbuilt.
               One sentence naming the scope; no illustration. */
            <EmptyState
              kind="cleared"
              heading={t('dispatch.empty.trips.heading')}
              body={t('dispatch.empty.trips.body')}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 compact:grid-cols-1">
              {activeTrips.map((trip) => (
                <Card key={trip.id} className="border-border">
                  <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* H3 — PRIMARY is 500. `font-bold` (700) on an id is
                          two ranks above what an id is worth, and weight spent
                          here is weight the fare beside it cannot spend. */}
                      <span className="font-mono text-xs font-medium text-foreground">{trip.id}</span>
                      <StatusBadge tone="info">{trip.kind}</StatusBadge>
                    </div>
                    {/* H1/H2 DATA tier — the fare is what an operator scans a
                        dispatch card FOR, so it is 14px ink with tabular
                        figures, not 12px semibold. Size carries it; the weight
                        it used to borrow goes back to the identity rank. */}
                    <span className="text-sm tabular-nums text-foreground"><Money amount={trip.fareHalalas} /></span>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 text-xs space-y-2.5">
                    <div className="space-y-1 bg-muted/30 p-2.5 rounded border border-border">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{trip.pickup}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Navigation className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{trip.destination}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="font-medium text-foreground">{trip.riderName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        <span className="font-medium text-foreground">
                          {trip.driverName ?? t('dispatch.unassigned')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Pending Requests */}
        <TabsContent value="pending" className="mt-4 space-y-3">
          {pendingRequests.length === 0 ? (
            <EmptyState
              kind="cleared"
              heading={t('dispatch.empty.pending.heading')}
              body={t('dispatch.empty.pending.body')}
            />
          ) : (
            <div className="divide-y divide-border border border-border rounded-lg bg-card overflow-hidden">
              {pendingRequests.map((req) => (
                <div key={req.id} className="p-3 text-xs flex items-center justify-between hover:bg-muted/20">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-foreground">{req.id}</span>
                      <StatusBadge tone="warning">{req.channel}</StatusBadge>
                      <span className="text-xs text-muted-foreground">{req.riderName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {req.pickup} → {req.destination}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground capitalize">{req.vehicleClass}</span>
                    {/* **§11.2 — the last hidden control in the product.**
                        This was `{canWrite && (…)}`, so an operator without
                        `live_ops` saw a pending-request row with no dispatch
                        control on it at all — and learned that requests are not
                        dispatchable from here, rather than that they personally
                        may not. It renders and refuses, like every other
                        control on this screen. */}
                    <div className="flex flex-col items-end gap-0.5">
                      <Button
                        size="xs"
                        disabled={!canWrite}
                        aria-describedby={canWrite ? undefined : dispatchDeniedId}
                        onClick={() =>
                          setManualDispatchReq({
                            id: req.id,
                            riderName: req.riderName,
                            pickup: req.pickup,
                          })
                        }
                      >
                        {t('dispatch.assignCaptain')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {!canWrite && (
                /* Rendered ONCE for the feed, not per row — see
                   `dispatchDeniedId`. D17's denial sentence, naming the
                   permission and who can grant it, so the refusal tells the
                   operator what to do next rather than only that they cannot. */
                <p id={dispatchDeniedId} className="text-2xs text-muted-foreground">
                  {t('state.forbidden.body', { permission: permissionName(t, 'live_ops') })}
                </p>
              )}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Fleet Online */}
        <TabsContent value="fleet" className="mt-4 space-y-3">
          {onlineDrivers.length === 0 ? (
            <EmptyState
              kind="cleared"
              heading={t('dispatch.empty.fleet.heading')}
              body={t('dispatch.empty.fleet.body')}
            />
          ) : (
            <div className="grid grid-cols-3 gap-3 compact:grid-cols-1">
              {onlineDrivers.slice(0, FLEET_CARDS).map((driver) => (
                <Card key={driver.id} className="border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{driver.name}</span>
                    <StatusBadge tone="success">
                      {t('dispatch.fleet.active')}
                    </StatusBadge>
                  </div>
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>{driver.city} · {driver.vehicleClass}</span>
                    <span className="font-semibold text-foreground">{driver.rating !== null ? `★ ${driver.rating.toFixed(1)}` : '—'}</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex justify-between pt-1 border-t border-border">
                    <span>{driver.activeSubscriptions}/{driver.maxSubscriptions} active subs</span>
                    <span className="font-mono">{driver.id}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )

  const canvas = loading ? (
    /* AC-35 — the feed-shaped skeleton. See the P6 note in the file header. */
    <LoadingSkeleton pattern="P10" label={t('overview.loading', { resource: title })} />
  ) : failed ? (
    /* AC-24 — the board fails, the shell does not, and `Try again` re-runs all
       three reads rather than only the one the operator happens to be looking
       at. It is the one primary on a canvas showing nothing else (R3). */
    <ErrorState
      scope="page"
      heading={t('state.pageError.title', { resource: title })}
      message={t('state.pageError.body')}
      action={{ label: t('state.pageError.action'), onClick: retry }}
    />
  ) : boardEmpty ? (
    /* R8 / AC-38 — no trips, no requests AND no captains is the board having
       nothing at all, which is the illustrated first-run: a heading naming what
       Live Dispatch is FOR, and an action that goes where the work starts. */
    <EmptyState
      kind="first-run"
      heading={t('dispatch.empty.board.heading')}
      body={t('dispatch.empty.board.body')}
      actions={[
        {
          label: t('dispatch.empty.board.action'),
          onClick: () => navigate('/operations/requests'),
          primary: true,
        },
      ]}
    />
  ) : (
    feeds
  )

  /* ── aside: the same four states, in the shell's second region ─────────── */

  /**
   * **§2.2 — these three figures are hardcoded and have no client.** They are
   * on the remediation list as unmodelled data. Until they are modelled, the
   * card yields to the error state when the board's reads fail: presenting
   * "96.4%" beside a canvas that could not load is the V-2 conflation
   * `states.md` names — the operator cannot tell working from broken.
   */
  const telemetry = (
    <Card>
      <CardHeader className="pb-2">
        {/* H2/H3 — a card title is INK. This one was 12px grey over a 12px
            grey body: same size, same colour, so the card had no first thing to
            read. Case and tracking stay; the colour comes back. */}
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-success-foreground" />
          {t('dispatch.liveTelemetry')}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('dispatch.avgMatchTime')}:</span>
          <span className="font-semibold text-foreground">42s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('dispatch.autoMatchRate')}:</span>
          <span className="font-semibold text-success-foreground">96.4%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('dispatch.fleetUtilization')}:</span>
          <span className="font-semibold text-foreground">78.2%</span>
        </div>
      </CardContent>
    </Card>
  )

  const aside = loading ? (
    <LoadingSkeleton pattern="P10" label={t('overview.loading', { resource: title })} />
  ) : (
    <div className="flex flex-col gap-4">
      {/* Local state, so it neither loads nor fails, and it carries its own
          cleared empty. It keeps working while the feeds are down (AC-41's
          principle: a failure takes down what it owns and nothing else). */}
      <InterventionsCard
        items={interventions}
        /* §11.2 — the two controls render and refuse. There is no client behind
           either act; see the note above `interventionsUnavailable`. */
        unavailableReason={interventionsUnavailable}
        t={t}
      />

      {failed ? (
        <ErrorState
          scope="card"
          message={t('dispatch.error.telemetry')}
          action={{ label: t('state.pageError.action'), onClick: retry }}
        />
      ) : (
        telemetry
      )}
    </div>
  )

  return (
    <>
      <MonitorShell header={header} canvas={canvas} aside={aside} />

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
  )
}
