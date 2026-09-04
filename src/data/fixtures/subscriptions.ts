/**
 * Subscriptions — legacy `DB.subscriptions` (`eyvar_ops_panel_v40_fixed.html:2686`–`:2693`),
 * seven rows, plus the two statuses the seven never reach.
 *
 * The filter at `:3501` offers five statuses. Only three are seeded — `Active`,
 * `Expiring`, `Cancelled` — so **`At risk` and `Frozen` have never rendered**,
 * and neither has the *Frozen* view the new Subscriptions sub-tab declares.
 * SUB-2001 and SUB-2002 fix that.
 *
 * Escrow is joined from `DB.escrowHolds` (`:2801`).
 */

import { offsetFromNow } from '../mock/clock'
import { cycle, cycleRef, refsFor } from './cycle'
import { driverFixtures } from './drivers'
import { riderFixtures } from './riders'
import type { Subscription } from '../types/subscription'

export const subscriptionFixtures: Subscription[] = [
  {
    id: 'SUB-1041',
    riderId: 'RDR-1041',
    riderName: 'Nora Al-Harbi',
    driverId: 'DRV-0101',
    driverName: 'Ahmed Salem',
    status: 'expiring',
    planKey: 'weekly',
    planName: 'Weekly Economy',
    vehicleClass: 'Economy',
    pickup: 'Al Narjis District',
    destination: 'King Abdullah Financial District',
    tripKind: 'round-trip',
    startedOn: '2026-06-19',
    /* Ends tomorrow. In the *Expiring ≤ 7 days* view by both the status **and**
       the date window — the one row where the two agree. */
    endsOn: '2026-06-26',
    frozenUntil: null,
    tripsCompleted: 5,
    tripsIncluded: 5,
    paidHalalas: 8_650,
    escrowHeldHalalas: 6_920,
    renewalLikelihoodPercent: 92,
    cancelledAt: null,
    cancellationReason: null,
    refundedHalalas: null,
  },
  {
    id: 'SUB-1052',
    riderId: 'RDR-2031',
    riderName: 'Tariq Al-Saud',
    driverId: 'DRV-0103',
    driverName: 'Khalid Mansour',
    /**
     * Status `Active`, ends tomorrow. **This is the seam the type comment
     * names**: the *Expiring ≤ 7 days* view filters on `endsOn`, so this row
     * appears in it while its badge reads `Active`. The Subscriptions spec has
     * to say which one the operator sees.
     */
    status: 'active',
    planKey: 'biweekly',
    planName: 'Bi-weekly Comfort',
    vehicleClass: 'Comfort',
    pickup: 'Al Malaz',
    destination: 'Olaya Towers',
    tripKind: 'round-trip',
    startedOn: '2026-06-12',
    endsOn: '2026-06-26',
    frozenUntil: null,
    tripsCompleted: 10,
    tripsIncluded: 10,
    paidHalalas: 41_200,
    escrowHeldHalalas: 32_960,
    renewalLikelihoodPercent: 78,
    cancelledAt: null,
    cancellationReason: null,
    refundedHalalas: null,
  },
  {
    id: 'SUB-1060',
    riderId: 'RDR-1080',
    riderName: 'Mohammed Al-Qahtani',
    driverId: 'DRV-0102',
    driverName: 'Omar Farouk',
    status: 'active',
    planKey: 'monthly',
    planName: 'Monthly Comfort',
    vehicleClass: 'Comfort',
    pickup: 'Al Yasmin District',
    destination: 'King Fahd Rd',
    tripKind: 'one-way',
    startedOn: '2026-06-01',
    endsOn: '2026-06-30',
    frozenUntil: null,
    /* `trips: '1/1'` on a monthly plan whose `execute` is 22 (`:2894`). A seed
       inconsistency, kept: the progress bar has to render 100% on a plan that
       clearly is not finished. */
    tripsCompleted: 1,
    tripsIncluded: 1,
    paidHalalas: 4_122,
    escrowHeldHalalas: 3_298,
    renewalLikelihoodPercent: 95,
    cancelledAt: null,
    cancellationReason: null,
    refundedHalalas: null,
  },
  {
    id: 'SUB-1075',
    riderId: 'RDR-1075',
    riderName: 'Sara Al-Ghamdi',
    driverId: 'DRV-0101',
    driverName: 'Ahmed Salem',
    status: 'active',
    planKey: 'weekly',
    planName: 'Weekly Economy',
    vehicleClass: 'Economy',
    pickup: 'Al Rabwah District',
    destination: 'Riyadh Front',
    tripKind: 'round-trip',
    startedOn: '2026-06-21',
    endsOn: '2026-06-28',
    frozenUntil: null,
    tripsCompleted: 2,
    tripsIncluded: 5,
    paidHalalas: 8_650,
    escrowHeldHalalas: 6_920,
    /* 25% — the low-renewal case the seeded notification N3 refers to. */
    renewalLikelihoodPercent: 25,
    cancelledAt: null,
    cancellationReason: null,
    refundedHalalas: null,
  },
  {
    id: 'SUB-1052b',
    riderId: 'RDR-1052',
    riderName: 'Omar Al-Shehri',
    driverId: 'DRV-0104',
    driverName: 'Hassan Al-Ghamdi',
    status: 'active',
    planKey: 'weekly',
    planName: 'Weekly Comfort',
    vehicleClass: 'Comfort',
    pickup: 'Al Narjis District',
    destination: 'King Abdullah Financial District',
    tripKind: 'round-trip',
    startedOn: '2026-06-20',
    endsOn: '2026-06-27',
    frozenUntil: null,
    tripsCompleted: 3,
    tripsIncluded: 5,
    paidHalalas: 12_250,
    /* No escrow hold exists for this subscription — `null`, not zero. */
    escrowHeldHalalas: null,
    renewalLikelihoodPercent: 61,
    cancelledAt: null,
    cancellationReason: null,
    refundedHalalas: null,
  },
  {
    id: 'SUB-0998',
    riderId: 'RDR-2087',
    riderName: 'Layla Al-Faraj',
    driverId: 'DRV-0102',
    driverName: 'Omar Farouk',
    status: 'cancelled',
    planKey: 'weekly',
    planName: 'Weekly Economy',
    vehicleClass: 'Economy',
    pickup: 'Al Suwaidi',
    destination: 'Kingdom Tower',
    tripKind: 'one-way',
    startedOn: '2026-06-12',
    endsOn: '2026-06-19',
    frozenUntil: null,
    tripsCompleted: 1,
    tripsIncluded: 5,
    paidHalalas: 8_650,
    escrowHeldHalalas: null,
    renewalLikelihoodPercent: null,
    cancelledAt: '2026-06-19T10:52:00+03:00',
    cancellationReason: 'Rider request',
    /* Refund REF-0002 (`:2866`) — 69.20 SAR for four unused trips. */
    refundedHalalas: 6_920,
  },
  {
    id: 'SUB-0987',
    riderId: 'RDR-2055',
    riderName: 'Bandar Al-Harbi',
    driverId: 'DRV-0105',
    driverName: 'Youssef Nouri',
    status: 'cancelled',
    planKey: 'weekly',
    planName: 'Weekly Comfort',
    vehicleClass: 'Comfort',
    pickup: 'Al Wurud District',
    destination: 'King Saud University',
    tripKind: 'round-trip',
    startedOn: '2026-06-11',
    endsOn: '2026-06-18',
    frozenUntil: null,
    tripsCompleted: 2,
    tripsIncluded: 5,
    paidHalalas: 12_250,
    escrowHeldHalalas: null,
    renewalLikelihoodPercent: null,
    cancelledAt: '2026-06-18T09:00:00+03:00',
    cancellationReason: 'Driver unavailable',
    refundedHalalas: 7_350,
  },

  /* ── added rows: the two statuses nothing seeds ─────────────────────── */
  {
    id: 'SUB-2001',
    riderId: 'RDR-4001',
    riderName: 'Abdulaziz Al-Suwailem',
    driverId: 'DRV-0207',
    driverName: 'Saud Al-Harbi',
    /**
     * `At risk`. Offered by the status filter (`:3501`) and produced by nothing.
     * What *makes* a subscription at risk is a rule nobody has written down —
     * an open question for product-owner. The row exists so the state renders;
     * the definition is still owed.
     */
    status: 'at-risk',
    planKey: 'monthly',
    planName: 'Monthly Economy',
    vehicleClass: 'Economy',
    pickup: 'Qurtubah',
    destination: 'Al Fanar Mall',
    tripKind: 'one-way',
    startedOn: '2026-06-05',
    endsOn: '2026-07-05',
    frozenUntil: null,
    tripsCompleted: 4,
    tripsIncluded: 22,
    paidHalalas: 31_900,
    escrowHeldHalalas: 25_520,
    renewalLikelihoodPercent: 11,
    cancelledAt: null,
    cancellationReason: null,
    refundedHalalas: null,
  },
  {
    id: 'SUB-2002',
    riderId: 'RDR-4003',
    riderName: 'Meshari Al-Dossari',
    driverId: 'DRV-0206',
    driverName: 'Ibrahim Diarra Coulibaly',
    /* `Frozen`, with an end date. Written by `freezeSubscription` (`:5510`),
       seeded by nothing, and it is one of the five declared views. */
    status: 'frozen',
    planKey: 'biweekly',
    planName: 'Bi-weekly Comfort',
    vehicleClass: 'Comfort',
    pickup: 'Al Sahafa District',
    destination: 'KAFD',
    tripKind: 'round-trip',
    startedOn: '2026-06-14',
    endsOn: '2026-06-28',
    frozenUntil: '2026-07-05',
    tripsCompleted: 6,
    tripsIncluded: 10,
    paidHalalas: 41_200,
    escrowHeldHalalas: 32_960,
    renewalLikelihoodPercent: 70,
    cancelledAt: null,
    cancellationReason: null,
    refundedHalalas: null,
  },
  {
    id: 'SUB-2003',
    /* A rider with a long Arabic name, an expired subscription and **no captain
       ever assigned** — `driverId: null`, which every captain column has to
       render. */
    riderId: 'RDR-4002',
    riderName: 'الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي',
    driverId: null,
    driverName: null,
    status: 'expired',
    planKey: 'weekly',
    planName: 'Weekly Economy',
    vehicleClass: 'Economy',
    pickup: 'Al Rabwah District',
    destination: 'Princess Noura University',
    tripKind: 'one-way',
    startedOn: '2026-06-01',
    endsOn: '2026-06-08',
    frozenUntil: null,
    tripsCompleted: 0,
    tripsIncluded: 5,
    paidHalalas: 8_650,
    escrowHeldHalalas: null,
    renewalLikelihoodPercent: null,
    cancelledAt: null,
    cancellationReason: null,
    refundedHalalas: null,
  },
]

/**
 * The nine riders and six captains the filler subscriptions are spread across,
 * **resolved from the canonical records once**.
 *
 * This block used to be four parallel `cycle` calls — an id built by string
 * arithmetic with period 9, a name list of period 4, an id of period 6, a name
 * list of period 4 — and the periods walked out of phase immediately. **40 of
 * the 70 subscriptions carried a `driverName` that contradicted
 * `fixtures/drivers.ts`**: `SUB-3107` called `DRV-0101` "Khalid Mansour" while
 * the captain record calls him "Ahmed Salem".
 *
 * `refsFor` resolves each id against the canonical array and throws at module
 * load if one is missing, so the periods below still control the *distribution*
 * — nine riders, six captains, exactly as before — while the name can only
 * come off the record the id names. There is no second sequence left to drift.
 */
const FILLER_SUB_RIDERS = refsFor(riderFixtures, [
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
const FILLER_SUB_CAPTAINS = refsFor(driverFixtures, [
  'DRV-0101',
  'DRV-0102',
  'DRV-0103',
  'DRV-0104',
  'DRV-0105',
  'DRV-0106',
])

/**
 * The commutes the filler rows run.
 *
 * Every name is a `components/map/places.ts` entry, because a subscription's
 * sheet draws its route and a row the gazetteer cannot place would show the
 * *"neither end of this ride is a place the map knows"* branch on a record
 * that has a perfectly good route. Two lists rather than one pair list, offset
 * by a step, so the two ends cycle at different rates and 60 rows do not read
 * as six routes repeated ten times.
 */
const FILLER_SUB_PICKUPS: readonly string[] = [
  'Al Narjis District',
  'Al Sahafa District',
  'Al Malaz',
  'Qurtubah',
  'Al Yasmin District',
  'Al Rabwah District',
  'Al Wurud District',
]
const FILLER_SUB_DESTINATIONS: readonly string[] = [
  'KAFD',
  'Olaya Towers',
  'King Saud University',
  'Riyadh Front',
  'Kingdom Tower',
  'Princess Noura University',
  'Granada Mall',
  'Al Fanar Mall',
]

/** Volume for pagination — 60 rows, deterministic by index. */
export const fillerSubscriptions: Subscription[] = Array.from({ length: 60 }, (_, i) => {
  const n = i + 1
  const comfort = i % 3 === 0
  const planKey = cycle(['weekly', 'biweekly', 'monthly'] as const, i)
  const included = planKey === 'weekly' ? 5 : planKey === 'biweekly' ? 10 : 22
  const rider = cycleRef(FILLER_SUB_RIDERS, i)
  const captain = cycleRef(FILLER_SUB_CAPTAINS, i)
  return {
    id: `SUB-3${String(100 + n).padStart(3, '0')}`,
    riderId: rider.id,
    riderName: rider.name,
    driverId: captain.id,
    driverName: captain.name,
    status: i % 9 === 0 ? 'cancelled' : i % 5 === 0 ? 'expiring' : 'active',
    planKey,
    planName: `${planKey === 'biweekly' ? 'Bi-weekly' : planKey === 'weekly' ? 'Weekly' : 'Monthly'} ${comfort ? 'Comfort' : 'Economy'}`,
    vehicleClass: comfort ? 'Comfort' : 'Economy',
    /* The commute, cycled over pairs the gazetteer can place, so the sheet's
       map draws a real route on every filler row rather than on some of them.
       Round trips on two rows in three, which is the mix the named rows carry
       and the reason `tripKind` is a field: it doubles the daily legs. */
    pickup: cycle(FILLER_SUB_PICKUPS, i),
    destination: cycle(FILLER_SUB_DESTINATIONS, i + 1),
    tripKind: i % 3 === 0 ? 'one-way' : 'round-trip',
    startedOn: `2026-06-${String((i % 25) + 1).padStart(2, '0')}`,
    endsOn: `2026-07-${String((i % 27) + 1).padStart(2, '0')}`,
    frozenUntil: null,
    tripsCompleted: i % (included + 1),
    tripsIncluded: included,
    paidHalalas: comfort ? 12_250 + i * 50 : 8_650 + i * 50,
    escrowHeldHalalas: i % 4 === 0 ? null : 6_920 + i * 40,
    renewalLikelihoodPercent: i % 6 === 0 ? null : 30 + ((i * 7) % 65),
    cancelledAt: i % 9 === 0 ? offsetFromNow({ days: -(i % 20) }) : null,
    cancellationReason: i % 9 === 0 ? 'Rider request' : null,
    refundedHalalas: i % 9 === 0 ? 2_000 + i * 30 : null,
  } satisfies Subscription
})

export const allSubscriptionFixtures: Subscription[] = [...subscriptionFixtures, ...fillerSubscriptions]
