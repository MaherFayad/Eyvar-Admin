/**
 * **What happened during a trip, in order** — the record behind the ride sheet
 * and the ride page.
 *
 * ## Why this is a separate resource and not eight more fields on `Trip`
 *
 * `Trip` is the row an index table draws: 137 of them arrive on one read, and
 * every field on it is one the list actually renders. A stage log is
 * per-record, unbounded in principle, and read by exactly two surfaces. Putting
 * it on `Trip` would send six stages × 137 rows to a table that draws none of
 * them, and `types/driver.ts` already records the rule this follows —
 * *"different queries with different cardinality; fusing them because they
 * share a screen is the mistake §5.1 warns about."*
 *
 * It also keeps the seam honest. `getTripTelemetry` is one endpoint the backend
 * has to answer, and `docs/07-api/` can carry it as such rather than as eight
 * optional fields that are `null` on every list response.
 *
 * ## The captain's position is a FRACTION, not a point, and that is deliberate
 *
 * `components/map/places.ts` states the standing caveat: a trip carries two
 * place *names* and no geometry, the two anchors are hand-placed to the
 * district, and the line between them is a connector rather than a route.
 * A live captain position is telemetry we do not have.
 *
 * So this record does not pretend to one. It carries `progress` — how far
 * through the leg the captain is, as a fraction of the *plan* — and the map
 * interpolates the connector to place a mark that is labelled as an estimate.
 * A `{ lat, lng }` here would look like a GPS fix and would be a fabricated
 * one; the fraction looks like what it is. When the real API sends a position,
 * this field is replaced by it and the map's mark stops being an estimate —
 * one field changes, in one place.
 */

import type { IsoDateTime } from './common'

/**
 * The six things that can happen to a ride, in the order they happen.
 *
 * Legacy has no stage log at all — a trip is a status string and two
 * timestamps, which is why *"why was this trip twelve minutes late"* could only
 * be answered by ringing the captain. These are the events an operator asks
 * about, and each one is the answer to a different question:
 *
 * | kind | the question it answers |
 * |---|---|
 * | `requested`  | when did the rider ask |
 * | `accepted`   | how long did it take to find a captain |
 * | `arrived`    | was the captain at the pickup on time |
 * | `started`    | how long did boarding take |
 * | `detour`     | where did the time go |
 * | `dropoff`    | when did it finish, or when will it |
 * | `cancelled`  | it did not finish, and at which stage it stopped |
 *
 * `detour` is the only optional one and the only one that may repeat.
 * `cancelled` and `dropoff` are mutually exclusive — a trip ends once.
 */
export type TripStageKind =
  | 'requested'
  | 'accepted'
  | 'arrived'
  | 'started'
  | 'detour'
  | 'dropoff'
  | 'cancelled'

/**
 * One stage.
 *
 * **`at === null` means the stage has not happened yet** — the drop-off on a
 * trip still in flight, which is the row the ETA sits on. It is not an absent
 * value in §8.3.1's sense and must not render as `—`: the surface says
 * *"ETA 08:19"* there, because the trip has a projection and the operator's
 * whole question is what it is.
 */
export interface TripStage {
  kind: TripStageKind
  /** When it happened. `null` for a stage still ahead. */
  at: IsoDateTime | null
  /**
   * What this stage cost against the plan, in minutes. **Positive is time
   * lost** — a captain seven minutes late to the pickup, a detour that added
   * five.
   *
   * `null` where there is nothing to measure against, which is most stages:
   * a request has no plan to be early or late for.
   */
  deltaMinutes: number | null
  /**
   * Where it happened, for the stages that have somewhere. A detour names the
   * road it went down, because *"detour"* on its own tells an operator that
   * time was lost and nothing about why.
   *
   * `null` on the stages whose place is already the trip's pickup or
   * destination — repeating it would be noise on every row.
   */
  place: string | null
}

/**
 * The projection and the live position, for a trip that is still running.
 *
 * Every field is `null` on a finished trip, and that is the discriminator the
 * surfaces branch on: there is nothing to project about a ride that ended.
 */
export interface TripTelemetry {
  /** Echoed back, so a late response can be matched to the trip that asked. */
  tripId: string

  /** The stage log, oldest first. Never empty — a trip was at least requested. */
  stages: readonly TripStage[]

  /**
   * How far through the leg the captain is, `0`–`1`, or `null` when the trip is
   * not in flight.
   *
   * See the module header: this is **not** a position and the map says so. It
   * is elapsed against the plan, which is the same thing the *Remaining* figure
   * is computed from, so the mark on the map and the number beside it cannot
   * disagree.
   */
  progress: number | null

  /**
   * The captain's current speed, km/h. `null` when the trip is not in flight.
   *
   * This one **is** telemetry rather than a derivation — the driver app reports
   * it — which is why it is a field and the position is not.
   */
  speedKmh: number | null

  /**
   * When the trip is now expected to finish. `null` on a trip that already
   * has an `endedAt`.
   */
  etaAt: IsoDateTime | null

  /**
   * What the trip was quoted to take, in minutes, at the moment it was
   * requested. `null` where no quote was made.
   *
   * The pair (`plannedDurationMinutes`, projected duration) is the *against
   * plan* figure both surfaces print, and it is stated as two facts rather than
   * as one difference so that a screen can show the operator what it was
   * measured from.
   */
  plannedDurationMinutes: number | null
}
