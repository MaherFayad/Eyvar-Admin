/**
 * Live Dispatch — the two things the monitor reads that had no model.
 *
 * Both were literals in `DispatchScreen.tsx` (`TELEMETRY` at `:107`, the
 * intervention array at `:208`), which is why the header claimed *"live
 * telemetry connected"* over three numbers nothing could refresh and why both
 * intervention controls were disabled (X4, X5).
 */

import type { IsoDateTime } from './common'

/**
 * The three readings above the dispatch board.
 *
 * **Not floats pretending to be strings.** The screen used `'42s'`, `'96.4%'`
 * and `'78.2%'`; the server sends the measurements and §8.3 formats them, so an
 * Arabic operator gets Arabic digits and a percent sign on the right side.
 */
export interface DispatchTelemetry {
  /** Median seconds from request to captain accepting. */
  medianMatchSeconds: number
  /** Share of matches made without an operator, 0-100. */
  autoMatchPercent: number
  /** Share of online captains currently on a trip, 0-100. */
  fleetUtilisationPercent: number
  /**
   * When the figures were measured. The meta line reads *"as of {time}"* rather
   * than claiming a live connection, which is what X4 objected to: the dot is
   * static by design (R18) and the sentence beside it was a claim.
   */
  asOf: IsoDateTime
}

/**
 * What kind of trouble an intervention is. Legacy's three literal rows, slugged.
 *
 * Tones (R7): `sos` → `warning`, `delayed` and `stranded` → `neutral`. There is
 * no fourth tone and no red badge (R5a).
 */
export type InterventionKind = 'delayed' | 'sos' | 'stranded'

/** Where an intervention is in an operator's hands. */
export type InterventionStatus = 'open' | 'acknowledged' | 'reassigned'

/**
 * One live operational intervention: a trip that needs a human now.
 *
 * `titleKey` and `subtitleKey` rather than sentences, for the reason
 * `types/work.ts` gives: a row assembled in English cannot be read in Arabic.
 */
export interface Intervention {
  id: string
  kind: InterventionKind
  status: InterventionStatus

  /** The trip in trouble. `null` on an intervention raised against a request. */
  tripId: string | null
  /** The captain currently on it. `null` when nobody is assigned, which is the point of `stranded`. */
  driverId: string | null
  driverName: string | null
  riderName: string
  /** Where the trouble is, as the record stores it. */
  place: string

  /** When the condition was first detected. Elapsed time is the UI's to compute. */
  raisedAt: IsoDateTime

  /**
   * Who acknowledged it and when. Both `null` while `status === 'open'`, and
   * both set together: an acknowledgement nobody signed is not one.
   */
  acknowledgedAt: IsoDateTime | null
  acknowledgedBy: string | null
  /** What the operator recorded when acknowledging. `null` when they added nothing. */
  acknowledgementNote: string | null

  /** The captain this was reassigned to. `null` until it is. */
  reassignedToDriverId: string | null
  reassignedToDriverName: string | null
}
