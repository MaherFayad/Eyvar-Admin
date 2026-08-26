/**
 * Trip Assurance — Operations › Trip Assurance, four views
 * (`departing-24h`, `no-backup-captain`, `awaiting-confirmation`, `absences`).
 *
 * The widest merge in wave 2: three legacy pages on one route
 * (`readiness`, `coverage`, `commitment` — see `fixtures/routeTable.ts:359`).
 *
 * Derived from:
 *   `DB.upcomingSubTrips`   the legs themselves (`eyvar_ops_panel_v40_fixed.html:6177`)
 *   `pendingConfirmations()` captain confirmation state (`:16575`)
 *   `backupCoverage()`       registered vs *actually eligible* backup (`:17480`)
 *   `offerState()`           the backup offer and its 20-minute window (`:18160`)
 *   `legAck()` / `ACK_SOURCE` how a confirmation was obtained (`:18127`)
 *   `departureRisk()`        captain not moving with pickup approaching (`:16607`)
 *   `DB.absenceEvents`       the strike ledger (`:16564`, written at `:16686`)
 *
 * ## Two resources, not one
 *
 * The first three views are filters over **one upcoming leg**: is the rider
 * confirmed, is the captain confirmed, is there a backup who would actually be
 * dispatched. `absences` is a different thing entirely — a **past event with a
 * financial consequence**, immutable, with its own id series and its own
 * disposition (waive / appeal / let stand). One type covering both would need
 * half its fields null on every row.
 *
 * So: `AssuranceTrip` and `AbsenceEvent`, two clients, one sub-tab — the same
 * shape People took with four.
 *
 * ## The number this screen exists to show
 *
 * `renderCoverage` (`:17517`) prints registered-% beside actually-eligible-%
 * and says the gap between them is the only figure that matters: *"A registered
 * backup whose vehicle sits below the plan tier, who is frozen, or who is
 * already committed elsewhere will be skipped at the moment of need — and the
 * rider waits while the system searches."* Both are fields below, and
 * `backupIneligibleReason` carries the why.
 */

import type { Claim, Halalas, IsoDate, IsoDateTime } from './common'
import type { PlanKey } from './subscription'
import type { SlaTracked } from './workQueue'

/**
 * Legacy `driverStatus` (`:6180`), verbatim: `moving` · `not_started` ·
 * `unavailable`. Slugged.
 *
 * Tones (R7): moving → `success`, not-started → `neutral`, unavailable → `warning`.
 */
export type CaptainDepartureState = 'moving' | 'not-started' | 'unavailable'

/**
 * How the captain's confirmation was obtained — `ACK_SOURCE` (`:18127`).
 *
 * The `weight` is the point: `app` is the captain acting themselves, `phone`
 * and `whatsapp` are an operator **attesting** on their behalf, and `assumed`
 * is *"⚠ Not a confirmation. Use only when the leg must proceed and somebody
 * has decided to carry the risk."* Three different things that all look like a
 * tick until someone disputes the leg.
 */
export type LegAckSource = 'app' | 'phone' | 'whatsapp' | 'assumed'
export type LegAckWeight = 'strong' | 'attested' | 'weak'

export const LEG_ACK_WEIGHT: Record<LegAckSource, LegAckWeight> = {
  app: 'strong',
  phone: 'attested',
  whatsapp: 'attested',
  assumed: 'weak',
}

export interface LegAcknowledgement {
  source: LegAckSource
  weight: LegAckWeight
  at: IsoDateTime
  /** `'captain'` when `source === 'app'`; otherwise the operator who attested (`:18143`). */
  byUserId: string | null
  byUserName: string
  note: string | null
}

/**
 * The backup offer's own lifecycle — `offerState` (`:18160`). Note that it
 * **expires by reading**: legacy flips `offered` → `expired` inside the getter
 * and writes a log line from it (`:18163`), a read that mutates. Here the
 * server owns the transition and the client reads a value.
 */
export type BackupOfferState = 'offered' | 'accepted' | 'declined' | 'expired'

export interface BackupOffer {
  driverId: string
  driverName: string
  state: BackupOfferState
  offeredAt: IsoDateTime
  /** `offeredAt + BACKUP_OFFER_WINDOW_MINUTES`. The captain's window, not ops'. */
  expiresAt: IsoDateTime
  respondedAt: IsoDateTime | null
}

/**
 * An upcoming subscription leg and everything that decides whether it will
 * actually happen.
 *
 * **The SLA start is not the row's creation.** A leg scheduled a week out is
 * not late; the promise is *"confirmed before the 21:00 cut-off the evening
 * before"* (`DB.commitPolicy.confirmDeadline`, `:16545`). So `slaStartedAt` is
 * the start of the confirmation window and `slaDueAt` is that cut-off — this is
 * the queue the brief means by *"a queue with no natural start needs its own
 * `targetMinutes` on the row"*, and both fields carry it explicitly rather than
 * leaving a screen to subtract two dates.
 */
export interface AssuranceTrip extends SlaTracked {
  /** Legacy `UST-*` (`:6178`). */
  id: string
  subscriptionId: string
  planKey: PlanKey
  planName: string

  riderId: string
  riderName: string
  /** The assigned captain. `null` once a leg has been pulled and not yet re-covered. */
  driverId: string | null
  driverName: string | null

  /** Legacy `scheduledTime:'10:00 AM' | 'Tomorrow 06:30 AM'` — two formats, one field. */
  departsAt: IsoDateTime
  /** Legacy `route:'King Fahd St → KFUPM Gate 1'`. One display string; genuinely one field for a row. */
  route: string
  pickup: string
  destination: string

  /* ── rider side ─────────────────────────────────────────────────────── */
  riderConfirmed: boolean
  riderConfirmedAt: IsoDateTime | null

  /* ── captain side ───────────────────────────────────────────────────── */
  captainDepartureState: CaptainDepartureState
  /** Legacy `unavailReason:'Vehicle breakdown — flat tyre reported'` (`:6198`). `null` unless unavailable. */
  captainUnavailableReason: string | null
  /** `null` = no acknowledgement at all, which is the *most common* state and the one that starts a handoff. */
  acknowledgement: LegAcknowledgement | null
  /** Legacy `autoHandedOff` — no confirmation by the cut-off, leg passed to backup, **no penalty** (`:16600`). */
  autoHandedOff: boolean

  /**
   * Minutes until pickup, from `departureRisk()` (`:16607`). Only meaningful
   * inside the departure window; `null` on a leg that is hours out.
   *
   * **Legacy computes this from the trip id**:
   * `minsToPickup: 20-((parseInt(t.id.replace(/\D/g,''),10)||0)%18)` — a
   * plausible-looking number derived from a string of digits. Modelled as real
   * data here; it was never a measurement.
   */
  minutesToPickup: number | null

  /* ── backup coverage ────────────────────────────────────────────────── */
  /** Who is on the registry for this plan. `null` when nobody was ever registered. */
  backupDriverId: string | null
  backupDriverName: string | null
  /**
   * Whether the registered backup **would actually be dispatched** —
   * `dispatchEligibility(...).ok` (`:17485`). A registered-but-ineligible
   * backup is the gap `renderCoverage` calls the only number that matters.
   */
  backupEligible: boolean
  /** Why not. Legacy `regOk.why` (`:17494`). `null` when eligible or when there is no registration. */
  backupIneligibleReason: string | null
  /** How many *other* captains near enough to fall back on. `0` is what makes a leg uncovered. */
  nearbyEligibleCount: number
  nearestEligibleKm: number | null
  /**
   * `!(registeredEligible) && nearbyEligibleCount === 0` (`:17498`). The state
   * the rider feels: nobody registered, nobody nearby.
   */
  uncovered: boolean
  /** The live offer to a backup, if one is out. `null` when none. */
  backupOffer: BackupOffer | null

  claim: Claim | null
}

/**
 * A recorded absence and its financial consequence — `recordAbsence` (`:16678`).
 *
 * Immutable once written: the strike ledger is what the tier escalation counts
 * against, and rewriting it retroactively is how a captain loses a plan they
 * could have kept. `waived` / `decayed` are *additions*, not edits.
 */
export interface AbsenceEvent {
  /** Legacy `ABS-0001` (`:16687`). */
  id: string
  driverId: string
  driverName: string
  subscriptionId: string
  /** When the leg was missed. Legacy `tsMs` + a separate display `date` (`:16688`). */
  occurredAt: IsoDateTime

  /**
   * Which escalation tier this absence triggered — `DB.commitPolicy.tiers`
   * (`:16556`): 1 → 7-day freeze, 2 → 30-day freeze + tier demotion,
   * 3 → termination from the plan system.
   */
  tier: 1 | 2 | 3
  freezeDays: number
  terminated: boolean

  /**
   * Undelivered plan earnings forfeited, in halalas. Legacy carries
   * `forfeited: 24.6` — **a float of SAR**, computed through three divisions
   * (`absenceExposure`, `:16646`). Integer minor units here; §8.3 formats.
   */
  forfeitedHalalas: Halalas
  /** The commitment reserve forfeited alongside it. `0` when there was none. */
  reserveForfeitedHalalas: Halalas

  /**
   * Set when an upheld emergency claim or a successful appeal removed the
   * strike (`:16690`). A waived event stays in the ledger and stops counting —
   * *"deterrence without a route back produces withdrawal, not compliance"*
   * (`:16628`).
   */
  waived: boolean
  waivedReason: string | null
  /** Aged out of the rolling 30-day window — `DB.commitPolicy.decayDays` (`:16549`). */
  decayed: boolean
  /** The `FC-*` appeal filed against it, if any. */
  appealCaseId: string | null
  /** The emergency claim that waived it, if any. */
  emergencyClaimId: string | null

  /** How many strikes were live for this captain when it landed — `absenceCount` (`:16622`). */
  liveStrikesAtEvent: number
}

/** `DB.commitPolicy.offerWindowMin` (`:18126`) — how long a backup has to answer. */
export const BACKUP_OFFER_WINDOW_MINUTES = 20

/** `DB.commitPolicy.confirmDeadline` (`:16545`) — a fixed evening cut-off, not a rolling 24 h window. */
export const CONFIRM_DEADLINE_LOCAL_TIME = '21:00'

/** `DB.commitPolicy.counterWindowDays` (`:16548`) — the rolling window strikes count inside. */
export const ABSENCE_COUNTER_WINDOW_DAYS = 30

/**
 * The confirmation SLA, in minutes, measured from the opening of the
 * confirmation window to `CONFIRM_DEADLINE_LOCAL_TIME` the evening before
 * departure.
 *
 * **This one is `unset` and stays that way.** Legacy has the *deadline*
 * (21:00) but never states when the window **opens** — `confirmPlanLeg` can be
 * called at any time and nothing bounds it. Without a start there is no
 * denominator, so `slaTargetMinutes` is `null` on every `AssuranceTrip` and the
 * bar does not render. That is Q8's to answer, and the shape is here waiting
 * for it.
 */
export const ASSURANCE_CONFIRM_WINDOW_MINUTES: number | null = null

/** A leg is "departing soon" inside this many hours — the `departing-24h` view. */
export const ASSURANCE_DEPARTING_WINDOW_HOURS = 24

/** Convenience for the fixtures: a bare calendar day in the dataset's timezone. */
export type AssuranceDay = IsoDate
