/**
 * **A stage log for every trip, derived from the trip itself.**
 *
 * ## Why derived rather than written out
 *
 * There are 137 trips. Hand-writing six stages each is 822 rows nobody would
 * read, that would drift from the trip they describe the first time a fare or a
 * status was edited, and that would make *"does the log agree with the record"*
 * a thing a person has to check. Every stage here is a **pure function of the
 * trip row**, so the two cannot disagree: change `latenessMinutes` and the
 * `arrived` stage moves with it.
 *
 * It is the same device `fixtures/compliance.ts` uses for its volume rows and
 * for the same reason — *"deterministic: every field is a function of the
 * index"* — one level up, with the trip standing in for the index.
 *
 * ## What the real API sends instead
 *
 * A stage log is written by the driver app as the ride happens; it is not
 * computable from a trip row on a server either. This file is a **stand-in for
 * a collection nobody has yet**, and every value it invents is invented from
 * something the trip already asserts:
 *
 * | stage | derived from |
 * |---|---|
 * | `requested` | `startedAt − 4m` — the rider asked shortly before the pickup slot |
 * | `accepted`  | `startedAt − 2m`, absent while `status === 'requested'` |
 * | `arrived`   | `startedAt + latenessMinutes` — the ONE stage the trip already carries a real number for |
 * | `started`   | `arrived + 4m` boarding |
 * | `detour`    | present only where the trip charged an extra-stop fee, which is the one signal in the record that the route changed |
 * | `dropoff`   | `endedAt`, or the projection when the trip is still running |
 * | `cancelled` | `endedAt` on a cancelled trip |
 *
 * **`arrived` is the load-bearing one.** `Trip.latenessMinutes` is the number
 * legacy hid inside a status string (`'Late +8'`), and this is the surface that
 * finally says *where* those eight minutes went.
 *
 * ## The one number that is genuinely invented
 *
 * `speedKmh`. Nothing in the record implies a speed, and the ride sheet shows
 * one because an operator watching a late trip wants to know whether the
 * captain is moving. It is a stable function of the trip id — never
 * `Math.random`, which would make the figure twitch on every re-render — and
 * `types/tripTelemetry.ts` names it as the one field that is real telemetry
 * when the API arrives.
 */

import { toEpochMs, EYVAR_NOW, EYVAR_TZ_OFFSET } from '../mock/clock'
import type { IsoDateTime } from '../types/common'
import type { Trip } from '../types/trip'
import type { TripStage, TripTelemetry } from '../types/tripTelemetry'
import { allTripFixtures } from './trips'

/** How long before the pickup slot the rider asked. */
const REQUEST_LEAD_MIN = 4
/** How long the captain took to accept. */
const ACCEPT_LEAD_MIN = 2
/** Boarding — arriving at the pickup and pulling away are not the same instant. */
const BOARDING_MIN = 4
/** What a detour costs, where the fare says one happened. */
const DETOUR_MIN = 5

/**
 * A small, stable integer from a string. FNV-1a, lifted from the dispatch
 * board's `geo.ts` for the same reason it exists there: the requirement is that
 * a figure does not jump on every re-render, not that nobody can guess it.
 */
function hash(seed: string): number {
  let value = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    value ^= seed.charCodeAt(i)
    value = Math.imul(value, 0x01000193)
  }
  return value >>> 0
}

/** An instant shifted by whole minutes, in the fixtures' one timezone. */
function shift(iso: IsoDateTime, minutes: number): IsoDateTime {
  const at = new Date(toEpochMs(iso) + minutes * 60_000)
  const p = (n: number) => String(n).padStart(2, '0')
  /* Riyadh is UTC+3 with no DST, so the local wall clock is UTC + 3h and the
     offset is written rather than computed — `toISOString` would print `Z` and
     every fixture in the product carries `+03:00`. */
  const local = new Date(at.getTime() + 3 * 3_600_000)
  return `${local.getUTCFullYear()}-${p(local.getUTCMonth() + 1)}-${p(local.getUTCDate())}T${p(
    local.getUTCHours(),
  )}:${p(local.getUTCMinutes())}:${p(local.getUTCSeconds())}${EYVAR_TZ_OFFSET}`
}

/**
 * The stages a trip has reached, given its status.
 *
 * A `requested` trip has one stage and five it has not got to; the sheet draws
 * all of them, the unreached ones with `at: null`. That is the whole point of
 * the log — an operator looking at a stuck ride needs to see the step it is
 * stuck *before*.
 */
function reached(status: Trip['status']): number {
  switch (status) {
    case 'requested':
      return 1
    case 'assigned':
      return 2
    case 'en-route':
      return 2
    case 'in-trip':
      return 4
    default:
      /* `done`, `late`, `cancelled`, `no-show` — the whole log. */
      return 6
  }
}

/** The stage log for one trip. */
export function tripStagesFor(trip: Trip): TripStage[] {
  const anchor = trip.startedAt
  const lateness = trip.latenessMinutes ?? 0
  const arrivedAt = shift(anchor, lateness)
  const startedAt = shift(arrivedAt, BOARDING_MIN)
  const hasDetour = trip.extraStopFeeHalalas > 0
  const steps = reached(trip.status)
  const terminal = trip.status === 'cancelled' || trip.status === 'no-show'

  const stages: TripStage[] = [
    {
      kind: 'requested',
      at: shift(anchor, -REQUEST_LEAD_MIN),
      deltaMinutes: null,
      place: null,
    },
    {
      kind: 'accepted',
      at: steps >= 2 ? shift(anchor, -ACCEPT_LEAD_MIN) : null,
      /* How long the rider waited for a captain. Positive is time lost, and on
         an accepted ride that is `REQUEST_LEAD_MIN − ACCEPT_LEAD_MIN`. */
      deltaMinutes: steps >= 2 ? REQUEST_LEAD_MIN - ACCEPT_LEAD_MIN : null,
      place: null,
    },
    {
      kind: 'arrived',
      at: steps >= 3 ? arrivedAt : null,
      /* **The trip's own number**, not one invented here. `null` rather than
         `0` when the captain was on time: §8.3.1 keeps `—` for absent, and a
         stage that cost nothing has nothing to say. */
      deltaMinutes: lateness > 0 ? lateness : null,
      place: null,
    },
    {
      kind: 'started',
      at: steps >= 4 ? startedAt : null,
      deltaMinutes: null,
      place: null,
    },
  ]

  if (hasDetour) {
    stages.push({
      kind: 'detour',
      at: steps >= 5 ? shift(startedAt, 8) : null,
      deltaMinutes: DETOUR_MIN,
      /* A detour that does not say where it went tells an operator that time
         was lost and nothing about why. The road is the answer. */
      place: DETOUR_ROADS[hash(trip.id) % DETOUR_ROADS.length] ?? null,
    })
  }

  stages.push(
    terminal
      ? {
          kind: 'cancelled',
          at: trip.endedAt,
          deltaMinutes: null,
          place: null,
        }
      : {
          kind: 'dropoff',
          /* `null` while the trip is in flight — the surface prints the ETA on
             this row, which is exactly the question a running trip raises. */
          at: trip.endedAt,
          deltaMinutes: null,
          place: null,
        },
  )

  return stages
}

/**
 * The roads a detour goes down. Real Riyadh arteries, so a detour reads as a
 * place an operator knows rather than as a lorem ipsum.
 */
const DETOUR_ROADS: readonly string[] = [
  'Northern Ring Road',
  'King Fahd Road',
  'Eastern Ring Road',
  'King Abdullah Road',
  'Al Takhassusi Street',
]

/**
 * The telemetry record for one trip.
 *
 * **`progress`, `speedKmh` and `etaAt` are `null` together**, on exactly the
 * trips that are not in flight. One condition, three fields, so a surface that
 * branches on any of them branches on the same fact.
 */
export function tripTelemetryFor(trip: Trip, now: IsoDateTime = EYVAR_NOW): TripTelemetry {
  const stages = tripStagesFor(trip)
  const inFlight = trip.endedAt === null && trip.status !== 'requested'

  if (!inFlight) {
    return {
      tripId: trip.id,
      stages,
      progress: null,
      speedKmh: null,
      etaAt: null,
      plannedDurationMinutes: trip.durationMinutes,
    }
  }

  const lateness = trip.latenessMinutes ?? 0
  /* The plan is what the trip was quoted at; where it has no duration yet —
     a ride that has not started — a district-to-district leg in Riyadh is
     modelled at 24 minutes, which is the median of the seeded durations. */
  const planned = trip.durationMinutes ?? 24
  const wheelsAt = shift(shift(trip.startedAt, lateness), BOARDING_MIN)
  const elapsedMin = (toEpochMs(now) - toEpochMs(wheelsAt)) / 60_000
  const detourMin = trip.extraStopFeeHalalas > 0 ? DETOUR_MIN : 0
  const projected = planned + detourMin

  return {
    tripId: trip.id,
    stages,
    /* Clamped into `[0, 1]`. A trip running over its projection is at the end
       of the line, not past it — the map has no ground beyond the drop-off and
       an unclamped fraction would draw the captain in the desert. */
    progress: Math.min(1, Math.max(0, elapsedMin / projected)),
    /* 38–72 km/h, stable per trip. See the module header on why this is the one
       invented figure. */
    speedKmh: 38 + (hash(trip.id) % 35),
    etaAt: shift(wheelsAt, projected),
    plannedDurationMinutes: trip.durationMinutes,
  }
}

/**
 * Every trip's telemetry, keyed by id.
 *
 * Built eagerly at module load rather than on demand: `mock/fixtures.ts` loads
 * this module once and a `Map` lookup is what the client's `get` should be —
 * scanning 137 trips per read would be the N+1 the trips fixtures' own header
 * complains about legacy doing per row.
 */
export const tripTelemetryFixtures: ReadonlyMap<string, TripTelemetry> = new Map(
  allTripFixtures.map((trip) => [trip.id, tripTelemetryFor(trip)]),
)
