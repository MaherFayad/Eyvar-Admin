/**
 * Trips — legacy `DB.trips` (`eyvar_ops_panel_v40_fixed.html:2675`–`:2684`),
 * eight rows, plus the states the eight cannot reach.
 *
 * Conversions:
 *   `fare:'17.65'`      → `fareHalalas: 1765`
 *   `km:'—'`            → `distanceKm: null`  (legacy `parseFloat('—') || 0` → 0)
 *   `status:'Late +8'`  → `status:'late'` + `latenessMinutes: 8`
 *   `date:'25 Jun 07:00'` → ISO
 *
 * `platformCutHalalas` is `fare − driverEarn − stopFee`, the legacy formula
 * (`:3422`). **Q7 is open** — four pricing models disagree on commission — so
 * these values are the arithmetic of the seed data, not an endorsement of a
 * commission rate.
 */

import { offsetFromNow } from '../mock/clock'
import { cycleRecord, cycleRef, refsFor, type FixtureRef } from './cycle'
import { driverFixtures } from './drivers'
import { riderFixtures } from './riders'
import { subscriptionFixtures } from './subscriptions'
import type { Trip } from '../types/trip'

export const tripFixtures: Trip[] = [
  {
    id: 'TRP-7741',
    kind: 'Subscription',
    status: 'in-trip',
    latenessMinutes: null,
    riderId: 'RDR-1041',
    riderName: 'Nora Al-Harbi',
    driverId: 'DRV-0101',
    driverName: 'Ahmed Salem',
    subscriptionId: 'SUB-1041',
    startedAt: '2026-06-25T07:00:00+03:00',
    endedAt: null,
    route: 'King Fahd St → KFUPM',
    pickup: 'King Fahd St',
    destination: 'KFUPM',
    distanceKm: 6.5,
    durationMinutes: 18,
    fareHalalas: 1_765,
    driverEarningsHalalas: 1_412,
    platformCutHalalas: 353,
    extraStopFeeHalalas: 0,
    tipHalalas: 0,
    driverRatingGiven: null,
    flagged: false,
    stateDesynced: false,
    paymentId: 'PAY-5510',
  },
  {
    id: 'TRP-7738',
    kind: 'Subscription',
    status: 'done',
    latenessMinutes: null,
    riderId: 'RDR-2031',
    riderName: 'Tariq Al-Saud',
    driverId: 'DRV-0103',
    driverName: 'Khalid Mansour',
    subscriptionId: 'SUB-1052',
    startedAt: '2026-06-25T06:15:00+03:00',
    endedAt: '2026-06-25T06:37:00+03:00',
    route: 'Al Nuzha → Olaya',
    pickup: 'Al Nuzha',
    destination: 'Olaya',
    distanceKm: 8.2,
    durationMinutes: 22,
    fareHalalas: 2_185,
    driverEarningsHalalas: 1_748,
    platformCutHalalas: 437,
    extraStopFeeHalalas: 0,
    tipHalalas: 0,
    driverRatingGiven: 5,
    flagged: false,
    stateDesynced: false,
    paymentId: 'PAY-5491',
  },
  {
    id: 'TRP-7735',
    kind: 'Subscription',
    status: 'done',
    latenessMinutes: null,
    /* The legacy file records a data correction here (`:2677`–`:2679`): the rider
       was RDR-1041, contradicting three independent sources. RDR-1080 is right. */
    riderId: 'RDR-1080',
    riderName: 'Mohammed Al-Qahtani',
    driverId: 'DRV-0102',
    driverName: 'Omar Farouk',
    subscriptionId: 'SUB-1060',
    startedAt: '2026-06-25T06:10:00+03:00',
    endedAt: '2026-06-25T06:39:00+03:00',
    route: 'Al Rawdah → King Abdullah Rd',
    pickup: 'Al Rawdah',
    destination: 'King Abdullah Rd',
    distanceKm: 12.4,
    durationMinutes: 29,
    fareHalalas: 4_122,
    driverEarningsHalalas: 3_298,
    platformCutHalalas: 824,
    extraStopFeeHalalas: 0,
    tipHalalas: 0,
    driverRatingGiven: 4,
    flagged: false,
    stateDesynced: false,
    paymentId: 'PAY-5480',
  },
  {
    id: 'TRP-7742',
    kind: 'Subscription',
    /* Legacy `status:'Late +8'` — a status and a value in one string. Split. */
    status: 'late',
    latenessMinutes: 8,
    riderId: 'RDR-2055',
    riderName: 'Bandar Al-Harbi',
    driverId: 'DRV-0103',
    driverName: 'Khalid Mansour',
    subscriptionId: 'SUB-1041',
    startedAt: '2026-06-25T07:45:00+03:00',
    /**
     * **08:23 — `startedAt` + `durationMinutes` + the eight minutes of
     * lateness.** It was `null`, and `types/trip.ts` diagnosed it as a fixture
     * bug rather than a state: this row carries a distance, a duration, a fare,
     * a captain payout and a settled payment, and *"a trip that has been
     * measured, priced, paid out and settled is not still running"*.
     *
     * It was left alone because `'route-history'` selects on
     * `endedAt !== null && distanceKm !== null`, so setting it moves what that
     * view returns. The ride record is what forced the fix: the stage log drew
     * `Drop-off · Not yet` under a fare of 29.40 that had already been paid,
     * which is a surface reproducing the contradiction rather than a fixture
     * quietly holding one.
     *
     * Nothing else moves. `management.performance.tripsCompleted` filters
     * `status === 'done'` (`clients/metrics.ts:126`) and this row is `late`; no
     * test asserts a `route-history` count.
     */
    endedAt: '2026-06-25T08:23:00+03:00',
    route: 'Al Malaz → Riyadh Park',
    pickup: 'Al Malaz',
    destination: 'Riyadh Park',
    distanceKm: 11.0,
    durationMinutes: 30,
    fareHalalas: 2_940,
    driverEarningsHalalas: 2_352,
    platformCutHalalas: 588,
    extraStopFeeHalalas: 0,
    tipHalalas: 0,
    driverRatingGiven: null,
    /* Flagged for review — the row-highlight case (`:3424`). */
    flagged: true,
    stateDesynced: false,
    paymentId: 'PAY-5475',
  },
  {
    id: 'TRP-9012',
    kind: 'Quick ride',
    status: 'in-trip',
    latenessMinutes: null,
    riderId: 'RDR-2087',
    riderName: 'Layla Al-Faraj',
    driverId: 'DRV-0102',
    driverName: 'Omar Farouk',
    subscriptionId: null,
    startedAt: '2026-06-25T09:02:00+03:00',
    endedAt: null,
    route: 'Olaya → Granada Mall',
    pickup: 'Olaya',
    destination: 'Granada Mall',
    distanceKm: 9.1,
    durationMinutes: 21,
    fareHalalas: 2_450,
    driverEarningsHalalas: 1_960,
    platformCutHalalas: 490,
    extraStopFeeHalalas: 0,
    tipHalalas: 0,
    driverRatingGiven: null,
    flagged: false,
    stateDesynced: false,
    paymentId: 'PAY-6001',
  },
  {
    id: 'TRP-9008',
    kind: 'Quick ride',
    status: 'done',
    latenessMinutes: null,
    riderId: 'RDR-2031',
    riderName: 'Tariq Al-Saud',
    driverId: 'DRV-0104',
    driverName: 'Hassan Al-Ghamdi',
    subscriptionId: null,
    startedAt: '2026-06-25T08:41:00+03:00',
    endedAt: '2026-06-25T09:08:00+03:00',
    route: 'KAFD → Airport T5',
    pickup: 'KAFD',
    destination: 'Airport T5',
    distanceKm: 14.2,
    durationMinutes: 27,
    fareHalalas: 3_800,
    driverEarningsHalalas: 3_040,
    platformCutHalalas: 760,
    extraStopFeeHalalas: 0,
    /* The one seeded tip (`tip: 5`, `:2681`). */
    tipHalalas: 500,
    driverRatingGiven: 5,
    flagged: false,
    stateDesynced: false,
    paymentId: 'PAY-6008',
  },
  {
    id: 'TRP-9005',
    kind: 'Quick ride',
    status: 'done',
    latenessMinutes: null,
    riderId: 'RDR-2090',
    riderName: 'Hessa Al-Mutlaq',
    driverId: 'DRV-0101',
    driverName: 'Ahmed Salem',
    subscriptionId: null,
    startedAt: '2026-06-25T08:20:00+03:00',
    endedAt: '2026-06-25T08:34:00+03:00',
    route: 'Al Malaz → Qurtubah',
    pickup: 'Al Malaz',
    destination: 'Qurtubah',
    distanceKm: 5.4,
    durationMinutes: 14,
    fareHalalas: 1_575,
    driverEarningsHalalas: 1_260,
    platformCutHalalas: 315,
    extraStopFeeHalalas: 0,
    tipHalalas: 0,
    driverRatingGiven: null,
    flagged: false,
    /* Rider app never acknowledged the completion transition. */
    stateDesynced: true,
    paymentId: 'PAY-6010',
  },
  {
    id: 'TRP-9003',
    kind: 'Quick ride',
    status: 'cancelled',
    latenessMinutes: null,
    riderId: 'RDR-2055',
    riderName: 'Bandar Al-Harbi',
    driverId: 'DRV-0105',
    driverName: 'Youssef Nouri',
    subscriptionId: null,
    startedAt: '2026-06-25T07:55:00+03:00',
    endedAt: '2026-06-25T07:56:00+03:00',
    route: 'Al Aqiq → cancelled',
    pickup: 'Al Aqiq',
    /* Cancelled before a destination was confirmed. */
    destination: null,
    /* Legacy stores `'—'` here and then `parseFloat('—') || 0` makes it 0 in the
       Eyvar-cut column. `null` is the truth: there is no distance. */
    distanceKm: null,
    durationMinutes: null,
    fareHalalas: 0,
    driverEarningsHalalas: 0,
    platformCutHalalas: 0,
    extraStopFeeHalalas: 0,
    tipHalalas: 0,
    driverRatingGiven: null,
    flagged: false,
    stateDesynced: false,
    paymentId: null,
  },

  /* ── added rows ─────────────────────────────────────────────────────── */
  {
    id: 'TRP-9101',
    kind: 'Quick ride',
    /* No-show. Legacy only reaches this by regex on the status string
       (`/no-show/i`, `:3406`); nothing seeds it, so the KPI tile reads 0 and
       the state has never rendered. */
    status: 'no-show',
    latenessMinutes: null,
    riderId: 'RDR-4001',
    riderName: 'Abdulaziz Al-Suwailem',
    driverId: 'DRV-0207',
    driverName: 'Saud Al-Harbi',
    subscriptionId: null,
    startedAt: offsetFromNow({ days: -9, hours: -1 }),
    endedAt: offsetFromNow({ days: -9 }),
    route: 'Al Badiah → King Saud University',
    pickup: 'Al Badiah',
    destination: 'King Saud University',
    distanceKm: null,
    durationMinutes: null,
    /* A no-show still charges a fee — money on a trip with no distance. */
    fareHalalas: 1_500,
    driverEarningsHalalas: 1_200,
    platformCutHalalas: 300,
    extraStopFeeHalalas: 0,
    tipHalalas: 0,
    driverRatingGiven: null,
    flagged: true,
    stateDesynced: false,
    paymentId: 'PAY-6103',
  },
  {
    id: 'TRP-9102',
    kind: 'Quick ride',
    status: 'done',
    latenessMinutes: null,
    riderId: 'RDR-4003',
    riderName: 'Meshari Al-Dossari',
    driverId: 'DRV-0201',
    /* A 61-character Arabic captain name in a table column beside "Ahmed Salem". */
    driverName: 'عبد الرحمن بن محمد بن عبد الله آل عبد الله القحطاني الدوسري',
    subscriptionId: null,
    startedAt: offsetFromNow({ hours: -2, minutes: -40 }),
    endedAt: offsetFromNow({ hours: -2 }),
    route: 'حي الملقا → مطار الملك خالد الدولي، صالة ٥',
    pickup: 'حي الملقا',
    destination: 'مطار الملك خالد الدولي، صالة ٥',
    distanceKm: 38.7,
    durationMinutes: 41,
    /* The largest fare in the set — 1,284.50 SAR with three extra stops. Finds
       out whether the money column is wide enough and whether the thousands
       separator renders in RTL. */
    fareHalalas: 128_450,
    driverEarningsHalalas: 100_190,
    platformCutHalalas: 27_360,
    extraStopFeeHalalas: 900,
    tipHalalas: 5_000,
    /* Exactly the low-rating threshold. */
    driverRatingGiven: 3,
    flagged: false,
    stateDesynced: false,
    paymentId: 'PAY-6104',
  },
  {
    id: 'TRP-9103',
    kind: 'Subscription',
    status: 'assigned',
    latenessMinutes: null,
    riderId: 'RDR-1052',
    riderName: 'Omar Al-Shehri',
    /* Assigned but the captain has not started — `driverId` set, no `endedAt`,
       no fare yet. The state between "requested" and "en-route". */
    driverId: 'DRV-0104',
    driverName: 'Hassan Al-Ghamdi',
    subscriptionId: 'SUB-1052b',
    startedAt: offsetFromNow({ minutes: 25 }),
    endedAt: null,
    route: 'Al Malaz → KFUPM Gate 2',
    pickup: 'Al Malaz',
    destination: 'KFUPM Gate 2',
    distanceKm: null,
    durationMinutes: null,
    fareHalalas: 0,
    driverEarningsHalalas: 0,
    platformCutHalalas: 0,
    extraStopFeeHalalas: 0,
    tipHalalas: 0,
    driverRatingGiven: null,
    flagged: false,
    stateDesynced: false,
    paymentId: null,
  },
  {
    id: 'TRP-9104',
    kind: 'Quick ride',
    /* Requested, no captain yet. `driverId` null — the case every "captain"
       column has to render without falling over. */
    status: 'requested',
    latenessMinutes: null,
    riderId: 'RDR-4002',
    riderName: 'الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي',
    driverId: null,
    driverName: null,
    subscriptionId: null,
    startedAt: offsetFromNow({ minutes: -3 }),
    endedAt: null,
    route: 'حي حطين → مستشفى الملك فيصل التخصصي',
    pickup: 'حي حطين',
    destination: 'مستشفى الملك فيصل التخصصي',
    distanceKm: null,
    durationMinutes: null,
    fareHalalas: 0,
    driverEarningsHalalas: 0,
    platformCutHalalas: 0,
    extraStopFeeHalalas: 0,
    tipHalalas: 0,
    driverRatingGiven: null,
    flagged: false,
    stateDesynced: false,
    paymentId: null,
  },
  {
    /**
     * **`TRP-7720` -- the trip `DRV-0101` says he drove and that did not
     * exist.** `fixtures/drivers.ts` lists it in `tripIds` (`:73`) and nothing
     * in this file produced it, so the captain's 360 profile opened a trip
     * card with a dead row in it. Given a record rather than deleted from the
     * captain: the id is corroborated by the captain's own array, which is the
     * same standard `TRP-7735`'s rider correction was decided on.
     */
    id: 'TRP-7720',
    kind: 'Subscription',
    status: 'done',
    latenessMinutes: null,
    riderId: 'RDR-1041',
    riderName: 'Nora Al-Harbi',
    driverId: 'DRV-0101',
    driverName: 'Ahmed Salem',
    subscriptionId: 'SUB-1041',
    /* **Dated 20 May on purpose.** `management.performance.tripsCompleted`
       counts trips that *finished* inside the current fortnight (11–25 Jun) and
       compares against the one before it (27 May–10 Jun), and both figures are
       asserted against literals in `fixtures/metrics.ts`. A new `done` trip
       landing in either window silently moves a board tile. This one sits
       before both, which is also where a 412-trip captain's older legs belong. */
    startedAt: '2026-05-20T07:02:00+03:00',
    endedAt: '2026-05-20T07:21:00+03:00',
    route: 'King Fahd St -> KFUPM',
    pickup: 'King Fahd St',
    destination: 'KFUPM',
    distanceKm: 6.4,
    durationMinutes: 19,
    fareHalalas: 1_765,
    driverEarningsHalalas: 1_412,
    platformCutHalalas: 353,
    extraStopFeeHalalas: 0,
    tipHalalas: 0,
    driverRatingGiven: 5,
    flagged: false,
    stateDesynced: false,
    paymentId: 'PAY-5502',
  },
  {
    /**
     * **`en-route`** -- the captain has accepted and is driving to the pickup.
     * `types/trip.ts` declares it, the status filter offers it, and **nothing
     * seeded it**, so the one status between `assigned` and `in-trip` had never
     * rendered. No fare yet, no distance yet, no `endedAt`: the same shape as
     * `assigned`, one step later, and `startedAt` is in the past rather than
     * the future because the captain has actually moved.
     */
    id: 'TRP-9105',
    kind: 'Quick ride',
    status: 'en-route',
    latenessMinutes: null,
    riderId: 'RDR-1046',
    riderName: 'Noura Al-Harbi',
    driverId: 'DRV-0206',
    driverName: 'Ibrahim Diarra Coulibaly',
    subscriptionId: null,
    startedAt: offsetFromNow({ minutes: -6 }),
    endedAt: null,
    route: 'Al Malqa -> Riyadh Front',
    pickup: 'Al Malqa',
    destination: 'Riyadh Front',
    distanceKm: null,
    durationMinutes: null,
    fareHalalas: 0,
    driverEarningsHalalas: 0,
    platformCutHalalas: 0,
    extraStopFeeHalalas: 0,
    tipHalalas: 0,
    driverRatingGiven: null,
    flagged: false,
    stateDesynced: false,
    paymentId: null,
  },
  {
    /**
     * **The one trip whose fare does not split, on purpose.**
     *
     * `clients/integrity.ts`'s `money.trip-split` check reports any trip where
     * `fare - earnings - extraStopFee - platformCut` is non-zero, and
     * `clients/integrity.test.ts:229` requires it to find at least one. Until
     * now it found the fourteen filler rows that mis-modelled the extra-stop
     * fee -- so fixing them would have left the check, and the Integrity pane's
     * entire content state, with nothing to show.
     *
     * A deliberately contradictory record is the honest replacement, and it is
     * the same device `SUB-1060` already uses for `agree.escrow-amount`: escrow
     * released, subscription still showing the hold.
     *
     * The residual is **-300 halalas**: the parts exceed the whole by three
     * riyals, which is the shape a float commission calculation leaves behind
     * when it is rounded somewhere else and written back. Do not "fix" this row
     * -- it is the fixture the check exists to find.
     */
    id: 'TRP-9106',
    kind: 'Quick ride',
    status: 'done',
    latenessMinutes: null,
    riderId: 'RDR-1045',
    riderName: 'Youssef Abdelrahman El-Sayed Farag',
    driverId: 'DRV-0104',
    driverName: 'Hassan Al-Ghamdi',
    subscriptionId: null,
    /* Before both snapshot windows — see TRP-7720. */
    startedAt: '2026-05-18T19:40:00+03:00',
    endedAt: '2026-05-18T20:14:00+03:00',
    route: 'Al Suwaidi -> Diriyah',
    pickup: 'Al Suwaidi',
    destination: 'Diriyah',
    distanceKm: 21.3,
    durationMinutes: 34,
    fareHalalas: 4_500,
    driverEarningsHalalas: 3_600,
    platformCutHalalas: 900,
    extraStopFeeHalalas: 300,
    tipHalalas: 0,
    driverRatingGiven: 4,
    flagged: true,
    stateDesynced: false,
    paymentId: 'PAY-6107',
  },
  {
    /**
     * **The one trip whose plan link does not resolve, on purpose.**
     *
     * `clients/integrity.ts`'s `ref.trip-links` check reports a trip whose
     * `subscriptionId` names no subscription, and
     * `clients/integrity.test.ts:198` requires it to find at least one. Until
     * now it found 32 filler rows citing `SUB-1042` … `SUB-1045`, four plans
     * that were never seeded — an accident that happened to be keeping a check
     * alive. Repointing the fillers at real plans fixed the accident and would
     * have left the check, and the Integrity pane's content state, with nothing
     * to report.
     *
     * `SUB-0871` is a plan that ended in April and was purged by retention
     * while its legs stayed on file. That is a real condition — a foreign key
     * with no cascade — and it is the condition this check exists to name.
     * **Do not repoint it.**
     *
     * Everything else about the row resolves: the rider and the captain are
     * both canonical records, so the finding is unambiguous about which link is
     * broken.
     */
    id: 'TRP-9107',
    kind: 'Subscription',
    status: 'done',
    latenessMinutes: null,
    riderId: 'RDR-1048',
    riderName: 'Maryam Al-Anazi',
    driverId: 'DRV-0102',
    driverName: 'Omar Farouk',
    subscriptionId: 'SUB-0871',
    /* Before both snapshot windows — see TRP-7720. */
    startedAt: '2026-05-14T06:55:00+03:00',
    endedAt: '2026-05-14T07:26:00+03:00',
    route: 'Al Shifa -> Al Olaya',
    pickup: 'Al Shifa',
    destination: 'Al Olaya',
    distanceKm: 17.8,
    durationMinutes: 31,
    fareHalalas: 3_150,
    driverEarningsHalalas: 2_520,
    platformCutHalalas: 630,
    extraStopFeeHalalas: 0,
    tipHalalas: 0,
    driverRatingGiven: 4,
    flagged: false,
    stateDesynced: false,
    paymentId: 'PAY-6108',
  },
  {
    /**
     * **`DRV-0202`'s last leg, and the trip `INC-019` is about.**
     *
     * The captain is suspended and carried `tripIds: []` with
     * `lastTripAt: 2026-06-18T14:20` -- a last trip with no trip. `INC-019`
     * cited `TRP-8845`, which existed in no collection, so the harassment
     * report, the precautionary suspension and the captain's own timeline all
     * pointed at nothing. This row is the single record all three describe, and
     * its `endedAt` is the captain's `lastTripAt` to the minute.
     *
     * **`cancelled`**, because that is what the summary says happened: the
     * rider ended it when the captain refused the agreed route. It also keeps
     * the row out of `management.performance.tripsCompleted`, which counts
     * `done` trips inside the current fortnight against a literal baseline.
     */
    id: 'TRP-9108',
    kind: 'Quick ride',
    status: 'cancelled',
    latenessMinutes: null,
    riderId: 'RDR-1060',
    riderName: 'Khaled Al-Zahrani',
    driverId: 'DRV-0202',
    driverName: 'Majed Al-Shamrani',
    subscriptionId: null,
    startedAt: '2026-06-18T14:02:00+03:00',
    endedAt: '2026-06-18T14:20:00+03:00',
    route: 'Al Shifa -> cancelled',
    pickup: 'Al Shifa',
    destination: null,
    distanceKm: 3.1,
    durationMinutes: 18,
    /* Cancelled mid-route, so there is a distance and no fare. The other
       cancellation in this file (`TRP-9003`) has neither -- two different
       cancellations, and a screen has to render both. */
    fareHalalas: 0,
    driverEarningsHalalas: 0,
    platformCutHalalas: 0,
    extraStopFeeHalalas: 0,
    tipHalalas: 0,
    driverRatingGiven: 1,
    flagged: true,
    stateDesynced: false,
    paymentId: null,
  },
]

/**
 * The parties the filler trips are spread across, **resolved from the canonical
 * records once**.
 *
 * This block used to build the id by string arithmetic and the name by a
 * separate `cycle` over a separate list: an id of period 9 against a four-name
 * list, an id of period 6 against another four-name list. The periods walked
 * out of phase on the second row and never came back.
 *
 *   - **80 of the 120 filler trips carried a `driverName` contradicting
 *     `fixtures/drivers.ts`**, and sixteen ids carried between two and seven
 *     different names each;
 *   - **`RDR-1042` ... `RDR-1049` did not exist at all**, so 106 of 132 trips
 *     linked to a rider profile that 404s.
 *
 * `refsFor` resolves each id against the canonical array and throws at module
 * load if one is missing. The periods below still control the distribution --
 * nine riders, six captains, five plans, exactly as before -- but the name can
 * only come off the record the id names, and a deleted record is a build
 * failure rather than a dead link on 80% of the rows.
 */
const FILLER_RIDERS: readonly FixtureRef[] = refsFor(riderFixtures, [
  'RDR-1041',
  'RDR-1042',
  'RDR-1043',
  'RDR-1044',
  'RDR-1045',
  'RDR-1046',
  'RDR-1047',
  'RDR-1048',
  'RDR-1049',
])

const FILLER_CAPTAINS: readonly FixtureRef[] = refsFor(driverFixtures, [
  'DRV-0101',
  'DRV-0102',
  'DRV-0103',
  'DRV-0104',
  'DRV-0105',
  'DRV-0106',
])

/**
 * A subscription leg is driven by **the subscription's own captain for the
 * subscription's own rider** -- that is what a subscription is. So the plan,
 * the rider and the captain on a filler subscription trip all come off one
 * `Subscription` record rather than from three independent sequences that
 * happen to be the same length today.
 *
 * The old code wrote `SUB-10${41 + (i % 5)}`, naming `SUB-1042` ... `SUB-1045`.
 * **Only `SUB-1041` of the five existed**; 32 trips cited a plan that was never
 * seeded.
 */
interface FillerPlan {
  /** The subscription id. Named `id` so `cycleRecord` will take it. */
  readonly id: string
  readonly rider: FixtureRef
  readonly captain: FixtureRef
}

const FILLER_PLANS: readonly FillerPlan[] = [
  'SUB-1041',
  'SUB-1052',
  'SUB-1060',
  'SUB-1075',
  'SUB-1052b',
].map((id) => {
  const sub = subscriptionFixtures.find((s) => s.id === id)
  if (!sub) throw new Error(`fillerTrips: no subscription "${id}"`)
  if (sub.driverId === null || sub.driverName === null) {
    throw new Error(`fillerTrips: subscription "${id}" has no captain to drive its legs`)
  }
  return {
    id: sub.id,
    rider: { id: sub.riderId, name: sub.riderName },
    captain: { id: sub.driverId, name: sub.driverName },
  }
})

/**
 * **The districts the volume trips run between, and why they are real ones.**
 *
 * They were `District 1` … `District 12` — filler names in the literal sense,
 * and the map could not draw a single one of them. `components/map/places.ts`
 * is a gazetteer of the ~30 place names the fixtures actually use, and
 * `District 7` is in none of them, so `locate` returned `null` for **both ends
 * of 120 of the 137 trips**. The ride sheet and the ride page each ask
 * `hasTripMap` before they lay themselves out, so the honest answer — *neither
 * end of this ride is a place the map knows* — was the answer on almost every
 * record in the product. An operator opening a trip saw no map and no reason
 * for there not to be one.
 *
 * The fix is the same one `FILLER_RIDERS` and `FILLER_CAPTAINS` already apply
 * one field over: **stop inventing a value the rest of the system cannot
 * resolve.** These twelve are Riyadh districts the gazetteer already anchors,
 * spread across the city so a filler leg crosses real ground rather than
 * hopping between two neighbours, and every one of them places.
 *
 * The period is 12 and the destination is offset by 5, exactly as before, so
 * the distribution of pairs is unchanged — only the names are.
 *
 * **`KFUPM` is the one endpoint still unplaceable, and it is left alone.** It
 * is King Fahd University of Petroleum and Minerals, which is in Dhahran,
 * ~400km away; two hand-written trips use it as a Riyadh commute. Anchoring it
 * truthfully would draw a country-scale frame on a city ride, and repointing it
 * would be editing a seeded record to suit a picture. The map names it as
 * unplaced instead, which is what that state is for.
 */
const FILLER_PLACES: readonly string[] = [
  'Al Malqa',
  'Al Narjis',
  'Hittin',
  'Al Sahafa',
  'Al Yasmin',
  'KAFD',
  'Al Wurud',
  'Olaya',
  'Al Malaz',
  'Al Rawdah',
  'Qurtubah',
  'Al Suwaidi',
]

/**
 * Volume rows for pagination. Deterministic: every field is a function of the
 * index. 120 rows, so the Trips index pages five deep at the default 25.
 *
 * **The fare splits.** `clients/integrity.ts`'s `money.trip-split` check states
 * the identity the product uses --
 * `fare = driverEarnings + extraStopFee + platformCut` -- and legacy computes
 * the Eyvar cut the same way, `max(0, fare - earn - stopFee)` (`:3422`). These
 * rows used to set `platformCut = fare - earn` **and** charge a 300-halala
 * extra-stop fee on top, so on the fourteen rows carrying a stop fee the parts
 * exceeded the whole by exactly 300: three riyals a row the rider never paid
 * and the ledger could never source. The stop fee now comes out of the fare
 * before the split, which is both the legacy formula and the only reading under
 * which the money exists.
 */
export const fillerTrips: Trip[] = Array.from({ length: 120 }, (_, i) => {
  const n = i + 1
  const subscription = i % 3 === 0
  const plan = subscription ? cycleRecord(FILLER_PLANS, i) : null
  const rider = plan ? plan.rider : cycleRef(FILLER_RIDERS, i)
  const captain = plan ? plan.captain : cycleRef(FILLER_CAPTAINS, i)
  const fare = 1_200 + ((i * 137) % 4_800)
  const stopFee = i % 9 === 0 ? 300 : 0
  /* The captain's 80% is 80% of what the ride itself earned, not of the rider's
     total bill: the extra-stop fee passes through to the captain whole and is
     not commissioned twice. */
  const earn = Math.round((fare - stopFee) * 0.8)
  return {
    id: `TRP-${8000 + n}`,
    kind: subscription ? 'Subscription' : 'Quick ride',
    status: i % 11 === 0 ? 'cancelled' : i % 7 === 0 ? 'late' : 'done',
    latenessMinutes: i % 7 === 0 && i % 11 !== 0 ? (i % 15) + 3 : null,
    riderId: rider.id,
    riderName: rider.name,
    driverId: captain.id,
    driverName: captain.name,
    subscriptionId: plan ? plan.id : null,
    startedAt: offsetFromNow({ days: -(i % 45), hours: -(i % 14), minutes: -(i % 55) }),
    endedAt: i % 11 === 0 ? null : offsetFromNow({ days: -(i % 45), hours: -(i % 14) }),
    route: `${FILLER_PLACES[i % FILLER_PLACES.length]} → ${
      FILLER_PLACES[(i + 5) % FILLER_PLACES.length]
    }`,
    pickup: FILLER_PLACES[i % FILLER_PLACES.length] ?? null,
    destination: FILLER_PLACES[(i + 5) % FILLER_PLACES.length] ?? null,
    distanceKm: i % 11 === 0 ? null : Number((3 + ((i * 7) % 220) / 10).toFixed(1)),
    durationMinutes: i % 11 === 0 ? null : 8 + (i % 40),
    fareHalalas: i % 11 === 0 ? 0 : fare,
    driverEarningsHalalas: i % 11 === 0 ? 0 : earn,
    platformCutHalalas: i % 11 === 0 ? 0 : fare - earn - stopFee,
    extraStopFeeHalalas: i % 11 === 0 ? 0 : stopFee,
    tipHalalas: i % 13 === 0 ? 500 : 0,
    driverRatingGiven: i % 5 === 0 ? null : 3 + (i % 3),
    flagged: i % 17 === 0,
    stateDesynced: i % 23 === 0,
    paymentId: i % 11 === 0 ? null : `PAY-${7000 + n}`,
  } satisfies Trip
})

/** 137 rows. Enough to page, sort and filter for real. */
export const allTripFixtures: Trip[] = [...tripFixtures, ...fillerTrips]
