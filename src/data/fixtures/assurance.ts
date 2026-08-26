/**
 * Trip Assurance — Operations › Trip Assurance.
 *
 * The eight legs are `DB.upcomingSubTrips` (`eyvar_ops_panel_v40_fixed.html:6177`),
 * whose seed is unusually good: it is written as eight *labelled scenarios*
 * ("SCENARIO 3: Driver UNAVAILABLE — vehicle breakdown, needs reassignment
 * NOW"), which is the closest thing in the legacy app to a state list. Ids,
 * routes, `driverStatus`, `unavailReason` and the confirmation flags are
 * carried across; coverage, acknowledgement and offer state are joined on from
 * `backupCoverage()` (`:17480`), `legAck()` (`:18139`) and `offerState()`
 * (`:18160`), which the readiness page reads but the seed does not store.
 *
 * ## One correction on the way across
 *
 * Legacy `UST-2` is `{sub:'SUB-1052', rider:'RDR-1080'}` — but `SUB-1052`'s
 * rider is `RDR-2031` (`:2686`). Four of the eight legs name a rider who is not
 * the rider on the subscription they point at. Each leg here takes its rider
 * and captain from its own subscription, because a leg whose rider disagrees
 * with its plan is a support call, not a fixture.
 *
 * ## The SLA has a deadline and no denominator
 *
 * `DB.commitPolicy.confirmDeadline` is `'21:00'` (`:16545`) — *"a fixed evening
 * cut-off, not a rolling 24h window"* — so `slaDueAt` is knowable exactly: 21:00
 * on the day before departure. **`slaTargetMinutes` is not**, because nothing in
 * the legacy app says when the confirmation window *opens*; `confirmPlanLeg`
 * can be called at any moment and nothing bounds it.
 *
 * So these rows carry a real deadline with `slaTargetMinutes: null`. A screen
 * can render "due 21:00 yesterday" and **cannot** render a progress track,
 * because there is no denominator to divide by. That is the shape Q8 has to
 * complete, and inventing a start so the bar renders is the `/90` bug again.
 *
 * ## An auto-handoff is not a breach
 *
 * `UST-5` passed its cut-off unconfirmed and was handed to the backup. Legacy
 * is emphatic that this is a success, not a failure: *"No confirmation by
 * 21:00 — leg passed to backup captain. **No penalty**: an unconfirmed leg is a
 * managed withdrawal, not an absence"* (`:16601`). `slaBreachedAt` is `null` on
 * that row. `UST-3`, which passed the same cut-off with nobody to hand it to,
 * is breached.
 *
 * ## And a leg can be un-breached and still in serious trouble
 *
 * `UST-7`'s captain confirmed on time, then went offline; the backup offer
 * expired unanswered and there is nobody nearby. `slaBreachedAt` is `null` and
 * `uncovered` is `true`. A screen that sorts only on breach puts this row at
 * the bottom, and the rider is stranded in ninety-six minutes.
 */

import type { AbsenceEvent, AssuranceTrip } from '../types/assurance'
import { LEG_ACK_WEIGHT } from '../types/assurance'

/** The confirmation cut-off for a leg departing on the given day, as an instant. */
const cutOffBefore = (departureDay: string): string => {
  const [y, m, d] = departureDay.split('-').map(Number)
  const previous = new Date(Date.UTC(y!, m! - 1, d! - 1))
  const p = (n: number) => String(n).padStart(2, '0')
  return `${previous.getUTCFullYear()}-${p(previous.getUTCMonth() + 1)}-${p(previous.getUTCDate())}T21:00:00+03:00`
}

export const assuranceTripFixtures: AssuranceTrip[] = [
  {
    /* SCENARIO 1 — fully on track. Every queue needs the row where nothing is
       wrong, or the screen is only ever designed in its alarm state. */
    id: 'UST-1',
    subscriptionId: 'SUB-1041',
    planKey: 'weekly',
    planName: 'Weekly Economy',
    riderId: 'RDR-1041',
    riderName: 'Nora Al-Harbi',
    driverId: 'DRV-0101',
    driverName: 'Ahmed Salem',
    departsAt: '2026-06-25T10:00:00+03:00',
    route: 'King Fahd St → KFUPM Gate 1',
    pickup: 'King Fahd St',
    destination: 'KFUPM Gate 1',
    riderConfirmed: true,
    riderConfirmedAt: '2026-06-25T08:14:00+03:00',
    captainDepartureState: 'moving',
    captainUnavailableReason: null,
    acknowledgement: {
      source: 'app',
      weight: LEG_ACK_WEIGHT.app,
      at: '2026-06-24T20:12:00+03:00',
      byUserId: null,
      byUserName: 'captain',
      note: null,
    },
    autoHandedOff: false,
    minutesToPickup: 46,
    backupDriverId: 'DRV-0102',
    backupDriverName: 'Omar Farouk',
    backupEligible: true,
    backupIneligibleReason: null,
    nearbyEligibleCount: 3,
    nearestEligibleKm: 2.4,
    uncovered: false,
    backupOffer: null,
    claim: null,
    slaStartedAt: null,
    slaDueAt: cutOffBefore('2026-06-25'),
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /**
     * SCENARIO 2 — rider not confirmed, departure in 34 minutes. And the row
     * that carries **the number `renderCoverage` says is the only one that
     * matters** (`:17520`): a backup is registered, so the coverage percentage
     * counts it, and that backup **would not actually be dispatched** — an
     * Economy vehicle against a Comfort plan. Registered ≠ eligible.
     */
    id: 'UST-2',
    subscriptionId: 'SUB-1052',
    planKey: 'biweekly',
    planName: 'Bi-weekly Comfort',
    riderId: 'RDR-2031',
    riderName: 'Tariq Al-Saud',
    driverId: 'DRV-0103',
    driverName: 'Khalid Mansour',
    departsAt: '2026-06-25T09:48:00+03:00',
    route: 'Al Nuzha → Olaya Tower',
    pickup: 'Al Nuzha',
    destination: 'Olaya Tower',
    riderConfirmed: false,
    riderConfirmedAt: null,
    captainDepartureState: 'moving',
    captainUnavailableReason: null,
    acknowledgement: {
      source: 'app',
      weight: LEG_ACK_WEIGHT.app,
      at: '2026-06-24T19:40:00+03:00',
      byUserId: null,
      byUserName: 'captain',
      note: null,
    },
    autoHandedOff: false,
    minutesToPickup: 34,
    backupDriverId: 'DRV-0204',
    backupDriverName: 'Turki Al-Mutairi',
    backupEligible: false,
    backupIneligibleReason: 'Vehicle class Economy is below the plan tier Comfort',
    nearbyEligibleCount: 2,
    nearestEligibleKm: 5.1,
    uncovered: false,
    backupOffer: null,
    claim: null,
    slaStartedAt: null,
    slaDueAt: cutOffBefore('2026-06-25'),
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /**
     * SCENARIO 3 — captain unavailable, **uncovered**, and **breached**: the
     * cut-off passed with no acknowledgement and there was nobody to hand it
     * to. Nothing registered, nobody nearby. An offer is out to a captain who
     * has fourteen minutes left to answer.
     *
     * Claimed by another operator, so the take-over affordance has a case on
     * this queue.
     */
    id: 'UST-3',
    subscriptionId: 'SUB-1075',
    planKey: 'weekly',
    planName: 'Weekly Economy',
    riderId: 'RDR-1075',
    riderName: 'Sara Al-Ghamdi',
    driverId: 'DRV-0101',
    driverName: 'Ahmed Salem',
    departsAt: '2026-06-25T10:15:00+03:00',
    route: 'Qurtubah → Al Fanar Mall',
    pickup: 'Qurtubah',
    destination: 'Al Fanar Mall',
    riderConfirmed: true,
    riderConfirmedAt: '2026-06-25T08:30:00+03:00',
    captainDepartureState: 'unavailable',
    captainUnavailableReason: 'Vehicle breakdown — flat tyre reported',
    acknowledgement: null,
    autoHandedOff: false,
    minutesToPickup: 61,
    backupDriverId: null,
    backupDriverName: null,
    backupEligible: false,
    backupIneligibleReason: null,
    nearbyEligibleCount: 0,
    nearestEligibleKm: null,
    uncovered: true,
    backupOffer: {
      driverId: 'DRV-0106',
      driverName: 'Reem Al-Otaibi',
      state: 'offered',
      offeredAt: '2026-06-25T09:08:00+03:00',
      expiresAt: '2026-06-25T09:28:00+03:00',
      respondedAt: null,
    },
    claim: {
      key: 'assurance:UST-3',
      entityType: 'assurance',
      entityId: 'UST-3',
      ownerId: 'USR-5',
      ownerName: 'Yousef Al-Balawi',
      claimedAt: '2026-06-25T09:00:00+03:00',
      touchedAt: '2026-06-25T09:08:00+03:00',
      state: 'claimed',
      releasedAt: null,
      releaseReason: null,
      takeovers: [],
    },
    slaStartedAt: null,
    slaDueAt: cutOffBefore('2026-06-25'),
    slaTargetMinutes: null,
    slaBreachedAt: cutOffBefore('2026-06-25'),
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /**
     * SCENARIO 4 — captain not moving, pickup in twelve minutes. And the
     * **weak acknowledgement**: recorded as `assumed` at 06:40 this morning,
     * nine and a half hours after the cut-off. `ACK_SOURCE.assumed` says what
     * that is worth — *"⚠ Not a confirmation. Use only when the leg must
     * proceed and somebody has decided to carry the risk"* (`:18135`). Breached,
     * and it will render with a tick beside it unless the design distinguishes
     * the three weights.
     */
    id: 'UST-4',
    subscriptionId: 'SUB-1060',
    planKey: 'monthly',
    planName: 'Monthly Comfort',
    riderId: 'RDR-1080',
    riderName: 'Mohammed Al-Qahtani',
    driverId: 'DRV-0102',
    driverName: 'Omar Farouk',
    departsAt: '2026-06-25T09:32:00+03:00',
    route: 'KAFD → King Abdullah Financial District',
    pickup: 'KAFD',
    destination: 'King Abdullah Financial District',
    riderConfirmed: true,
    riderConfirmedAt: '2026-06-25T08:00:00+03:00',
    captainDepartureState: 'not-started',
    captainUnavailableReason: null,
    acknowledgement: {
      source: 'assumed',
      weight: LEG_ACK_WEIGHT.assumed,
      at: '2026-06-25T06:40:00+03:00',
      byUserId: 'USR-5',
      byUserName: 'Yousef Al-Balawi',
      note: 'No reply to three calls. Leg left in place; rider already at the pickup point.',
    },
    autoHandedOff: false,
    minutesToPickup: 12,
    backupDriverId: 'DRV-0105',
    backupDriverName: 'Youssef Nouri',
    backupEligible: true,
    backupIneligibleReason: null,
    nearbyEligibleCount: 1,
    nearestEligibleKm: 8.7,
    uncovered: false,
    backupOffer: null,
    claim: null,
    slaStartedAt: null,
    slaDueAt: cutOffBefore('2026-06-25'),
    slaTargetMinutes: null,
    slaBreachedAt: cutOffBefore('2026-06-25'),
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /**
     * SCENARIO 5 — unconfirmed by the cut-off and **auto-handed-off**, which is
     * the system working, not failing: *"a managed withdrawal, not an absence"*
     * (`:16601`). `slaBreachedAt` is `null` even though the deadline passed with
     * no acknowledgement, because the promise to the rider was kept.
     *
     * This row and `UST-3` share a cut-off, a null acknowledgement and opposite
     * breach states. Any breach rule that reads only `slaDueAt` and
     * `acknowledgement` gets one of them wrong.
     */
    id: 'UST-5',
    subscriptionId: 'SUB-1052',
    planKey: 'biweekly',
    planName: 'Bi-weekly Comfort',
    riderId: 'RDR-2031',
    riderName: 'Tariq Al-Saud',
    driverId: 'DRV-0204',
    driverName: 'Turki Al-Mutairi',
    departsAt: '2026-06-25T11:45:00+03:00',
    route: 'Al Aqiq → Riyadh Park Mall',
    pickup: 'Al Aqiq',
    destination: 'Riyadh Park Mall',
    riderConfirmed: false,
    riderConfirmedAt: null,
    captainDepartureState: 'not-started',
    captainUnavailableReason: null,
    acknowledgement: null,
    autoHandedOff: true,
    minutesToPickup: null,
    backupDriverId: 'DRV-0204',
    backupDriverName: 'Turki Al-Mutairi',
    backupEligible: true,
    backupIneligibleReason: null,
    nearbyEligibleCount: 2,
    nearestEligibleKm: 3.9,
    uncovered: false,
    backupOffer: {
      driverId: 'DRV-0204',
      driverName: 'Turki Al-Mutairi',
      state: 'accepted',
      offeredAt: '2026-06-24T21:00:00+03:00',
      expiresAt: '2026-06-24T21:20:00+03:00',
      respondedAt: '2026-06-24T21:06:00+03:00',
    },
    claim: null,
    slaStartedAt: null,
    slaDueAt: cutOffBefore('2026-06-25'),
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /* SCENARIO 6 — tomorrow morning. The **future deadline**: cut-off is 21:00
       tonight, nothing is late, nothing is confirmed, and nobody is registered.
       The only row on the screen whose clock is still counting down. */
    id: 'UST-6',
    subscriptionId: 'SUB-1041',
    planKey: 'weekly',
    planName: 'Weekly Economy',
    riderId: 'RDR-1041',
    riderName: 'Nora Al-Harbi',
    driverId: 'DRV-0104',
    driverName: 'Hassan Al-Ghamdi',
    departsAt: '2026-06-26T06:30:00+03:00',
    route: 'Al Rawdah → King Abdullah Rd',
    pickup: 'Al Rawdah',
    destination: 'King Abdullah Rd',
    riderConfirmed: false,
    riderConfirmedAt: null,
    captainDepartureState: 'not-started',
    captainUnavailableReason: null,
    acknowledgement: null,
    autoHandedOff: false,
    minutesToPickup: null,
    backupDriverId: null,
    backupDriverName: null,
    backupEligible: false,
    backupIneligibleReason: null,
    nearbyEligibleCount: 1,
    nearestEligibleKm: 6.2,
    uncovered: false,
    backupOffer: null,
    claim: null,
    slaStartedAt: null,
    slaDueAt: cutOffBefore('2026-06-26'),
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /**
     * SCENARIO 7 — **not breached, and in the most trouble on the screen.**
     * The captain confirmed in the app at 20:55 yesterday, comfortably before
     * the cut-off, then went offline. The backup offer expired unanswered at
     * 09:00 and there is nobody nearby.
     *
     * `slaBreachedAt: null` · `uncovered: true` · departure in ninety-six
     * minutes. A queue sorted on breach alone buries this row. Confirmation is
     * a promise, not a guarantee, and the SLA measures the promise.
     */
    id: 'UST-7',
    subscriptionId: 'SUB-1075',
    planKey: 'weekly',
    planName: 'Weekly Economy',
    riderId: 'RDR-1075',
    riderName: 'Sara Al-Ghamdi',
    driverId: 'DRV-0105',
    driverName: 'Youssef Nouri',
    departsAt: '2026-06-25T10:50:00+03:00',
    route: 'Olaya St → Granada Mall',
    pickup: 'Olaya St',
    destination: 'Granada Mall',
    riderConfirmed: true,
    riderConfirmedAt: '2026-06-25T09:10:00+03:00',
    captainDepartureState: 'unavailable',
    captainUnavailableReason: 'Driver app went offline — unreachable since 09:02',
    acknowledgement: {
      source: 'app',
      weight: LEG_ACK_WEIGHT.app,
      at: '2026-06-24T20:55:00+03:00',
      byUserId: null,
      byUserName: 'captain',
      note: null,
    },
    autoHandedOff: false,
    minutesToPickup: 96,
    backupDriverId: null,
    backupDriverName: null,
    backupEligible: false,
    backupIneligibleReason: null,
    nearbyEligibleCount: 0,
    nearestEligibleKm: null,
    uncovered: true,
    backupOffer: {
      driverId: 'DRV-0207',
      driverName: 'Saud Al-Harbi',
      state: 'expired',
      offeredAt: '2026-06-25T08:40:00+03:00',
      expiresAt: '2026-06-25T09:00:00+03:00',
      respondedAt: null,
    },
    claim: null,
    slaStartedAt: null,
    slaDueAt: cutOffBefore('2026-06-25'),
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /* SCENARIO 8 — tomorrow, pre-confirmed, backup accepted. Clean, and dated
       in the future, so the list is not uniformly urgent. */
    id: 'UST-8',
    subscriptionId: 'SUB-1060',
    planKey: 'monthly',
    planName: 'Monthly Comfort',
    riderId: 'RDR-1080',
    riderName: 'Mohammed Al-Qahtani',
    driverId: 'DRV-0102',
    driverName: 'Omar Farouk',
    departsAt: '2026-06-26T07:00:00+03:00',
    route: 'Al Wurud → Kingdom Tower',
    pickup: 'Al Wurud',
    destination: 'Kingdom Tower',
    riderConfirmed: true,
    riderConfirmedAt: '2026-06-24T23:00:00+03:00',
    captainDepartureState: 'not-started',
    captainUnavailableReason: null,
    acknowledgement: {
      source: 'phone',
      weight: LEG_ACK_WEIGHT.phone,
      at: '2026-06-25T08:05:00+03:00',
      byUserId: 'USR-1',
      byUserName: 'Sarah Al-Rashid',
      note: 'Confirmed verbally at 08:05; captain is on the ring road until midday.',
    },
    autoHandedOff: false,
    minutesToPickup: null,
    backupDriverId: 'DRV-0101',
    backupDriverName: 'Ahmed Salem',
    backupEligible: true,
    backupIneligibleReason: null,
    nearbyEligibleCount: 4,
    nearestEligibleKm: 1.8,
    uncovered: false,
    backupOffer: null,
    claim: null,
    slaStartedAt: null,
    slaDueAt: cutOffBefore('2026-06-26'),
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
]

/**
 * ## Absences default to **empty**, and that is the fixture
 *
 * `DB.absenceEvents = []` (`:16564`) — the legacy app ships this ledger empty
 * and only ever fills it by driving the UI. That is not an oversight to correct:
 * an empty strike ledger means **no captain has stood a rider up in the rolling
 * 30-day window**, which is the healthy state of a subscription business and
 * the one nobody designs. The brief asked for a queue that is legitimately
 * empty; this is it, and it is empty for a reason rather than for want of data.
 *
 * The *empty-because-nothing-happened* state and the *empty-because-your-filter-
 * matched-nothing* state are different screens (`docs/ref/states.md`), and the
 * `absences` view is the only place in wave 2 where the first one is the
 * default.
 *
 * Every tier is still reachable without hand-editing: `useAbsenceHistory()`
 * serves `absenceEventHistoryFixtures` below.
 */
export const absenceEventFixtures: AbsenceEvent[] = []

/**
 * The populated ledger — QA switches to it with `useAbsenceHistory()`.
 *
 * Covers all three escalation tiers (`DB.commitPolicy.tiers`, `:16556`), a
 * waived strike and a decayed one, because tier 3 terminates a captain's plan
 * access and no screen should first meet that row in production.
 *
 * Money is halalas. Legacy carries `forfeited: 24.6` — a float of SAR through
 * three divisions (`absenceExposure`, `:16646`).
 */
export const absenceEventHistoryFixtures: AbsenceEvent[] = [
  {
    /* Tier 1 — 7-day freeze, plan pulled, not terminated. */
    id: 'ABS-0001',
    driverId: 'DRV-0205',
    driverName: 'Nawaf Al-Juhani',
    subscriptionId: 'SUB-2001',
    occurredAt: '2026-06-08T06:35:00+03:00',
    tier: 1,
    freezeDays: 7,
    terminated: false,
    forfeitedHalalas: 8_240,
    reserveForfeitedHalalas: 0,
    waived: false,
    waivedReason: null,
    decayed: false,
    appealCaseId: null,
    emergencyClaimId: null,
    liveStrikesAtEvent: 0,
  },
  {
    /* Tier 2 — 30-day freeze and a tier demotion. */
    id: 'ABS-0002',
    driverId: 'DRV-0205',
    driverName: 'Nawaf Al-Juhani',
    subscriptionId: 'SUB-2001',
    occurredAt: '2026-06-11T06:40:00+03:00',
    tier: 2,
    freezeDays: 30,
    terminated: false,
    forfeitedHalalas: 16_480,
    reserveForfeitedHalalas: 5_000,
    waived: false,
    waivedReason: null,
    decayed: false,
    appealCaseId: null,
    emergencyClaimId: null,
    liveStrikesAtEvent: 1,
  },
  {
    /* Tier 3 — **terminated** from the plan system. Ordinary rides remain
       available (`:16709`), which is the distinction the row has to make
       visible or it reads as a ban. Appealed: `FC-0007`, upheld. */
    id: 'ABS-0003',
    driverId: 'DRV-0205',
    driverName: 'Nawaf Al-Juhani',
    subscriptionId: 'SUB-2001',
    occurredAt: '2026-06-13T06:38:00+03:00',
    tier: 3,
    freezeDays: 0,
    terminated: true,
    forfeitedHalalas: 24_720,
    reserveForfeitedHalalas: 5_000,
    waived: false,
    waivedReason: null,
    decayed: false,
    appealCaseId: 'FC-0007',
    emergencyClaimId: null,
    liveStrikesAtEvent: 2,
  },
  {
    /* **Waived** by an upheld emergency claim — in the ledger, not counting.
       Deleting it instead would erase the evidence the waiver rests on. */
    id: 'ABS-0004',
    driverId: 'DRV-0103',
    driverName: 'Khalid Mansour',
    subscriptionId: 'SUB-1052',
    occurredAt: '2026-06-17T07:05:00+03:00',
    tier: 1,
    freezeDays: 7,
    terminated: false,
    forfeitedHalalas: 0,
    reserveForfeitedHalalas: 0,
    waived: true,
    waivedReason: 'Emergency claim upheld — hospital admission documented',
    decayed: false,
    appealCaseId: null,
    emergencyClaimId: 'EMG-0002',
    liveStrikesAtEvent: 0,
  },
  {
    /* **Decayed** — 30 clean days erased it (`:16549`). Also in the ledger and
       also not counting, for a completely different reason. Two ways to stop
       counting is the pair that stops a screen collapsing them into "inactive". */
    id: 'ABS-0005',
    driverId: 'DRV-0207',
    driverName: 'Saud Al-Harbi',
    subscriptionId: 'SUB-2001',
    occurredAt: '2026-05-14T06:20:00+03:00',
    tier: 1,
    freezeDays: 7,
    terminated: false,
    forfeitedHalalas: 6_180,
    reserveForfeitedHalalas: 0,
    waived: false,
    waivedReason: null,
    decayed: true,
    appealCaseId: null,
    emergencyClaimId: null,
    liveStrikesAtEvent: 0,
  },
]
