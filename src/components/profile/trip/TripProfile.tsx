/**
 * The ride sheet's body: **the ground the trip happened on, the two people on
 * it, and what happened when** — and the four reads that feed them.
 *
 * ```
 *  ┌──────────────────────────────────────┐
 *  │            the map                   │   pickup ● captain ◆ drop-off ▪
 *  ├──────────────────────────────────────┤
 *  │ 14.6 km · 22 min · 12 min · +12 min  │   the figures
 *  ├──────────────────────────────────────┤
 *  │ PASSENGER              [Call rider]  │
 *  │ CAPTAIN              [Call captain]  │
 *  ├──────────────────────────────────────┤
 *  │  Stages │ Fare                       │
 *  │  ● Requested        07:41            │
 *  └──────────────────────────────────────┘
 *            --ev-drawer-w, 480
 * ```
 *
 * One column, unconditionally, for the reason `RiderProfile` records from a
 * measurement rather than from taste: at 480px a two-column body overruns its
 * box, and the answer is the full-page escape rather than a wider drawer.
 *
 * ## The four reads, and why each is one read
 *
 * | read | what it answers | why not fold it in |
 * |---|---|---|
 * | `getTrip` (owned by `ProfileLayer`) | the band, the route, the fare, the flag | the record itself |
 * | `getTripTelemetry` | the stage rail, the ETA, the captain's position and speed | six stages × 137 rows must not ride along on the index's list read — `types/tripTelemetry.ts` argues the cardinality |
 * | `getRider` | the rider's phone | `Trip` denormalises the NAME for the table and nothing else; an operator asked to "ring the rider" was leaving the sheet to find a number |
 * | `getDriver` | the captain's phone, vehicle and standing | same, and the standing is the fact that decides whether the lateness is a pattern |
 * | `getSubscription` | which plan this leg belongs to, and which leg it is | the trip carries an id and no plan name, so *"leg 5 of 5"* cannot be rendered without it |
 *
 * Five reads, and the last three are the price of not making the operator leave
 * the record to answer the first question they will ask about it. Each owns its
 * own states **inside the block that renders it**, so a failed subscription
 * read costs the subscription line and not the sheet (§9.2 #14).
 *
 * ## `enabled` is the caller saying *this record is a trip*
 *
 * A parameter and not a `tripId === ''` sentinel, because a hook cannot be
 * called conditionally: `ProfileLayer` calls this for all twelve record kinds
 * and must fire the reads for exactly one of them. `useAsync` stores nothing
 * while `enabled` is false, so the other eleven cost no request.
 *
 * Rules applied
 *   §11.3      the loading state is `TripSkeleton` — the same map block, the
 *              same two cards, the same rail. Never a spinner.
 *   §9.2 #14   each read owns its four states inside its own block.
 *   §9.1       nothing is placed on a physical side. The column is a `flex-col`,
 *              which has no direction to mirror.
 */

import { getDriver, getRider, getSubscription, getTripTelemetry } from '@/data/clients'
import type { Driver, IsoDateTime, Rider, Subscription, Trip, TripTelemetry } from '@/data/types'
import { useAsync, type AsyncResult } from '@/hooks'
import type { Language, Translate } from '@/lib'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ErrorState } from '@/components/ErrorState'
import { TripFacts } from './TripFacts'
import { TripFare } from './TripFare'
import { hasTripMap, TripMap } from './TripMap'
import { TripParties } from './TripParties'
import { TripStages } from './TripStages'

/** Everything the sheet reads for itself. The RECORD is `ProfileLayer`'s. */
export interface TripProfileReads {
  telemetry: AsyncResult<TripTelemetry>
  rider: AsyncResult<Rider>
  captain: AsyncResult<Driver>
  subscription: AsyncResult<Subscription>
}

/**
 * The five reads behind one ride.
 *
 * `riderId`, `driverId` and `subscriptionId` are on the trip, which this hook
 * does not have when the layer first calls it — so they arrive as arguments and
 * each read is enabled on its own id being present. A quick ride fires four
 * reads; a subscription leg fires five; a trip cancelled before assignment
 * fires three, because there is no captain to read.
 */
export function useTripReads(
  trip: Trip | null,
  enabled = true,
): TripProfileReads {
  const tripId = trip?.id ?? ''
  const riderId = trip?.riderId ?? ''
  const driverId = trip?.driverId ?? ''
  const subscriptionId = trip?.subscriptionId ?? ''

  const telemetry = useAsync<TripTelemetry>(
    (signal) => getTripTelemetry(tripId, signal),
    { deps: [tripId], enabled: enabled && tripId !== '', cacheKey: 'trips.telemetry' },
  )

  const rider = useAsync<Rider>((signal) => getRider(riderId, signal), {
    deps: [riderId],
    enabled: enabled && riderId !== '',
    cacheKey: 'riders.get',
  })

  const captain = useAsync<Driver>((signal) => getDriver(driverId, signal), {
    deps: [driverId],
    enabled: enabled && driverId !== '',
    cacheKey: 'drivers.get',
  })

  const subscription = useAsync<Subscription>((signal) => getSubscription(subscriptionId, signal), {
    deps: [subscriptionId],
    enabled: enabled && subscriptionId !== '',
    cacheKey: 'subscriptions.get',
  })

  return { telemetry, rider, captain, subscription }
}

export interface TripProfileProps {
  trip: Trip
  reads: TripProfileReads
  /** The clock every elapsed figure is measured against. Never `Date.now()`. */
  nowIso: IsoDateTime
  /** `?entity=` hrefs, computed by the presentation. */
  riderHref: string | null
  captainHref: string | null
  subscriptionHref: string | null
  paymentHref: string | null
  t: Translate
  language: Language
}

export function TripProfile({
  trip,
  reads,
  nowIso,
  riderHref,
  captainHref,
  subscriptionHref,
  paymentHref,
  t,
  language,
}: TripProfileProps) {
  const telemetry = reads.telemetry.data ?? null

  return (
    <div className="-m-3 flex min-h-full flex-col">
      {/* **The map is conditional on the gazetteer, not on the trip.** A ride
          between two districts nobody has anchored has no picture, and a blank
          canvas claiming to be Riyadh is worse than the figures alone. */}
      {hasTripMap(trip) && (
        <TripMap trip={trip} telemetry={telemetry} t={t} language={language} />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
        <TripFacts
          trip={trip}
          telemetry={telemetry}
          nowIso={nowIso}
          t={t}
          language={language}
        />

        {/* §8.4 — the desync is a standing condition on one record, so it is a
            sentence and not a badge. It is here rather than in the band because
            it qualifies what the whole sheet is showing. */}
        {trip.stateDesynced && (
          <p className="rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
            {t('profile.trip.desynced')}
          </p>
        )}

        <TripParties
          trip={trip}
          rider={reads.rider.data ?? null}
          captain={reads.captain.data ?? null}
          subscription={reads.subscription.data ?? null}
          riderHref={riderHref}
          captainHref={captainHref}
          subscriptionHref={subscriptionHref}
          t={t}
          language={language}
        />

        <Tabs defaultValue="stages" className="min-w-0 gap-3">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="stages" className="flex-none">
              {t('profile.trip.tab.stages')}
            </TabsTrigger>
            <TabsTrigger value="fare" className="flex-none">
              {t('profile.trip.tab.fare')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stages" className="flex flex-col gap-3">
            {/* The stage read owns its own states here, so a failed log costs
                the rail and not the sheet. */}
            {reads.telemetry.status === 'error' && (
              <ErrorState
                scope="card"
                card={false}
                message={t('profile.trip.stages.error')}
                action={{
                  label: t('profile.trip.state.retry'),
                  onClick: reads.telemetry.refetch,
                }}
              />
            )}
            {telemetry !== null && (
              <TripStages telemetry={telemetry} t={t} language={language} />
            )}
          </TabsContent>

          <TabsContent value="fare" className="flex flex-col gap-3">
            <TripFare trip={trip} paymentHref={paymentHref} t={t} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
