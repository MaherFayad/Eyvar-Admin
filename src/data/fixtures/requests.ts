/**
 * Ride requests — Operations › Requests.
 *
 * The eight instant rows are `DB.rideRequests` (`eyvar_ops_panel_v40_fixed.html:2786`)
 * extended; the six subscription rows are `DB.subscriptionRequests` (`:2794`)
 * converted field-for-field. Ids, riders, districts, plans and notes are
 * verbatim where the legacy row exists.
 *
 * ## Two legacy inconsistencies this file resolves rather than copies
 *
 * **1. `waiting` and `requestedAt` disagree by a factor of sixty.** `REQ-501`
 * is seeded `waiting:'0:38'` — parsed as `m:ss`, thirty-eight *seconds*
 * (`:9924`) — beside `requestedAt:'25 Jun 08:36'`, which is thirty-eight
 * *minutes* before the app's own 09:14 clock. Every seeded instant request
 * claims to be seconds old and minutes old at once. Only `waiting` is
 * operative: it drives the SLA badge (`:9921`) and the urgency sort (`:10057`).
 * `requestedAt` here is derived from `waiting`, so the row is one age.
 *
 * **2. `REQ-503` is seeded past a threshold it has not crossed.** Its status is
 * `no_drivers`, which the tick engine sets at `secs>=180` (`:9832`), but its
 * `waiting` is `'2:40'` — 160 seconds. The seed is 20 seconds short of the
 * state it claims. Corrected here to a row that *is* past its deadline, because
 * the whole point of the row is to be the breached one.
 *
 * ## The rows that matter
 *
 * `REQ-503`  breached by **2 minutes** against a 3-minute promise, and held by
 *            another operator (`USR-5`) so the take-over affordance has a case.
 * `SREQ-006` breached by **5 days** against a 2-hour promise. Beside `REQ-503`
 *            it is the pair that decides whether the SLA column renders a
 *            duration, a bar, or a shrug — one row is 40 % over, the other is
 *            6,000 % over, and a linear track cannot show both.
 * `SREQ-002` deadline **long past, and not breached**: requested 06:12,
 *            assigned 07:10, due 08:12. A naive `slaDueAt < now` check marks it
 *            breached. It is merely old, and this row is what fails that check.
 * `SREQ-005` **breached, then resolved**: due 13:00, assigned 14:30. Closed and
 *            late are not exclusive, and `slaBreachedAt` outlives the fix.
 * `REQ-508`  cancelled by the rider inside the window — a disposition that is
 *            nobody's fault and still has to render.
 * `SREQ-006` also carries the 44-character Arabic rider name that breaks a
 *            column (`RDR-4002`).
 */

import type { RideRequest } from '../types/request'
import { REQUEST_SLA_MINUTES } from '../types/request'
import { cycle } from './cycle'

/* All instants are literal ISO strings against the fixed clock
   (2026-06-25T09:14:00+03:00). Sub-minute offsets matter on a three-minute
   SLA, and `offsetFromNow` only takes whole minutes. */

export const requestFixtures: RideRequest[] = [
  /* ── instant ride requests ───────────────────────────────────────────── */
  {
    id: 'REQ-501',
    channel: 'instant',
    status: 'searching',
    riderId: 'RDR-2090',
    riderName: 'Hessa Al-Mutlaq',
    /* `★ new` — no rating yet (`:9907`). The most common row in a growth month. */
    riderRating: null,
    riderHasPriorSubscription: false,
    vip: false,
    pickup: 'Al Sahafa District',
    destination: 'King Saud University',
    vehicleClass: 'Economy',
    requestedAt: '2026-06-25T09:13:22+03:00',
    planKey: null,
    preferredPickupTime: null,
    notes: null,
    offeredToDriverId: null,
    offeredToDriverName: null,
    offerExpiresAt: null,
    assignedDriverId: null,
    assignedDriverName: null,
    assignedSubscriptionId: null,
    assignedByUserId: null,
    assignedByUserName: null,
    assignedAt: null,
    expiredAt: null,
    cancelledAt: null,
    claim: null,
    slaStartedAt: '2026-06-25T09:13:22+03:00',
    slaDueAt: '2026-06-25T09:16:22+03:00',
    slaTargetMinutes: REQUEST_SLA_MINUTES.instant,
    slaBreachedAt: null,
    slaSource: 'legacy-policy',
    /* Requests make no separate promise to *answer* — the only promise is to
       find a captain. One clock. */
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    id: 'REQ-502',
    channel: 'instant',
    status: 'searching',
    riderId: 'RDR-1060',
    riderName: 'Khaled Al-Zahrani',
    riderRating: 4.9,
    riderHasPriorSubscription: true,
    vip: false,
    pickup: 'Al Wurud District',
    destination: 'Kingdom Tower',
    vehicleClass: 'Comfort',
    /* 72 s in — past `secs>=90`? No: this is the row just *before* legacy's
       "⏱ Approaching SLA" threshold (`:9926`), so the amber band has a
       neighbour on each side. */
    requestedAt: '2026-06-25T09:12:48+03:00',
    planKey: null,
    preferredPickupTime: null,
    notes: null,
    offeredToDriverId: null,
    offeredToDriverName: null,
    offerExpiresAt: null,
    assignedDriverId: null,
    assignedDriverName: null,
    assignedSubscriptionId: null,
    assignedByUserId: null,
    assignedByUserName: null,
    assignedAt: null,
    expiredAt: null,
    cancelledAt: null,
    claim: null,
    slaStartedAt: '2026-06-25T09:12:48+03:00',
    slaDueAt: '2026-06-25T09:15:48+03:00',
    slaTargetMinutes: REQUEST_SLA_MINUTES.instant,
    slaBreachedAt: null,
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /**
     * **Breached by two minutes, and claimed by someone else.**
     *
     * `no-drivers` is not "still looking" — the tick engine sets it *at* the
     * breach and logs `sla_breach` in the same statement (`:9832`–`:9838`). So
     * this row's status and its `slaBreachedAt` are the same event seen twice,
     * and they must never disagree; `clients/workQueues.test.ts` asserts it.
     */
    id: 'REQ-503',
    channel: 'instant',
    status: 'no-drivers',
    riderId: 'RDR-2031',
    riderName: 'Tariq Al-Saud',
    riderRating: 4.6,
    riderHasPriorSubscription: true,
    vip: false,
    pickup: 'KAFD',
    destination: 'Airport T5',
    vehicleClass: 'Comfort',
    requestedAt: '2026-06-25T09:09:00+03:00',
    planKey: null,
    preferredPickupTime: null,
    notes: null,
    offeredToDriverId: null,
    offeredToDriverName: null,
    offerExpiresAt: null,
    assignedDriverId: null,
    assignedDriverName: null,
    assignedSubscriptionId: null,
    assignedByUserId: null,
    assignedByUserName: null,
    assignedAt: null,
    expiredAt: null,
    cancelledAt: null,
    claim: {
      key: 'request:REQ-503',
      entityType: 'request',
      entityId: 'REQ-503',
      ownerId: 'USR-5',
      ownerName: 'Yousef Al-Balawi',
      claimedAt: '2026-06-25T09:12:10+03:00',
      touchedAt: '2026-06-25T09:13:40+03:00',
      state: 'claimed',
      releasedAt: null,
      releaseReason: null,
      takeovers: [],
    },
    slaStartedAt: '2026-06-25T09:09:00+03:00',
    slaDueAt: '2026-06-25T09:12:00+03:00',
    slaTargetMinutes: REQUEST_SLA_MINUTES.instant,
    slaBreachedAt: '2026-06-25T09:12:00+03:00',
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /* Offered — the captain's own app is deciding, and ops can only wait.
       `offerExpiresAt` is four seconds away: a twelve-second window is not a
       countdown a human can act on, which is why it is a separate field from
       the SLA and not a second clock on the same track. */
    id: 'REQ-504',
    channel: 'instant',
    status: 'offered',
    riderId: 'RDR-1041',
    riderName: 'Nora Al-Harbi',
    riderRating: 5,
    riderHasPriorSubscription: true,
    vip: true,
    pickup: 'Al Rabwah District',
    destination: 'Riyadh Park Mall',
    vehicleClass: 'Economy',
    requestedAt: '2026-06-25T09:13:40+03:00',
    planKey: null,
    preferredPickupTime: null,
    notes: null,
    offeredToDriverId: 'DRV-0106',
    offeredToDriverName: 'Reem Al-Otaibi',
    offerExpiresAt: '2026-06-25T09:14:04+03:00',
    assignedDriverId: null,
    assignedDriverName: null,
    assignedSubscriptionId: null,
    assignedByUserId: null,
    assignedByUserName: null,
    assignedAt: null,
    expiredAt: null,
    cancelledAt: null,
    claim: null,
    slaStartedAt: '2026-06-25T09:13:40+03:00',
    slaDueAt: '2026-06-25T09:16:40+03:00',
    slaTargetMinutes: REQUEST_SLA_MINUTES.instant,
    slaBreachedAt: null,
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /**
     * **Merely old.** Deadline 08:44, now 09:14 — half an hour past. Assigned
     * at 08:42:10, seventy seconds in, comfortably inside the promise.
     * `slaDueAt < now` says breached. It was not. This row is why breach is a
     * stamp.
     */
    id: 'REQ-505',
    channel: 'instant',
    status: 'assigned',
    riderId: 'RDR-1080',
    riderName: 'Mohammed Al-Qahtani',
    riderRating: 4.4,
    riderHasPriorSubscription: true,
    vip: false,
    pickup: 'Al Malaz',
    destination: 'Riyadh Park',
    vehicleClass: 'Economy',
    requestedAt: '2026-06-25T08:41:00+03:00',
    planKey: null,
    preferredPickupTime: null,
    notes: null,
    offeredToDriverId: 'DRV-0101',
    offeredToDriverName: 'Ahmed Salem',
    offerExpiresAt: '2026-06-25T08:41:18+03:00',
    assignedDriverId: 'DRV-0101',
    assignedDriverName: 'Ahmed Salem',
    assignedSubscriptionId: null,
    assignedByUserId: null,
    assignedByUserName: null,
    assignedAt: '2026-06-25T08:42:10+03:00',
    expiredAt: null,
    cancelledAt: null,
    claim: null,
    slaStartedAt: '2026-06-25T08:41:00+03:00',
    slaDueAt: '2026-06-25T08:44:00+03:00',
    slaTargetMinutes: REQUEST_SLA_MINUTES.instant,
    slaBreachedAt: null,
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /**
     * **Breached, then resolved.** Due 07:05, assigned 07:26 — twenty-one
     * minutes late. Closed and late are not exclusive, and an operations review
     * asks for exactly this row. `slaBreachedAt` survives the disposition.
     */
    id: 'REQ-506',
    channel: 'instant',
    status: 'assigned',
    riderId: 'RDR-2055',
    riderName: 'Bandar Al-Harbi',
    riderRating: 3.9,
    riderHasPriorSubscription: true,
    vip: false,
    pickup: 'Al Nuzha District',
    destination: 'Olaya Towers',
    vehicleClass: 'Comfort',
    requestedAt: '2026-06-25T07:02:00+03:00',
    planKey: null,
    preferredPickupTime: null,
    notes: null,
    offeredToDriverId: 'DRV-0105',
    offeredToDriverName: 'Youssef Nouri',
    offerExpiresAt: '2026-06-25T07:25:12+03:00',
    assignedDriverId: 'DRV-0105',
    assignedDriverName: 'Youssef Nouri',
    assignedSubscriptionId: null,
    assignedByUserId: 'USR-5',
    assignedByUserName: 'Yousef Al-Balawi',
    assignedAt: '2026-06-25T07:26:00+03:00',
    expiredAt: null,
    cancelledAt: null,
    claim: {
      key: 'request:REQ-506',
      entityType: 'request',
      entityId: 'REQ-506',
      ownerId: 'USR-5',
      ownerName: 'Yousef Al-Balawi',
      claimedAt: '2026-06-25T07:06:00+03:00',
      touchedAt: '2026-06-25T07:26:00+03:00',
      state: 'done',
      releasedAt: null,
      releaseReason: null,
      takeovers: [],
    },
    slaStartedAt: '2026-06-25T07:02:00+03:00',
    slaDueAt: '2026-06-25T07:05:00+03:00',
    slaTargetMinutes: REQUEST_SLA_MINUTES.instant,
    slaBreachedAt: '2026-06-25T07:05:00+03:00',
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    id: 'REQ-507',
    channel: 'instant',
    status: 'expired',
    riderId: 'RDR-4003',
    riderName: 'Meshari Al-Dossari',
    riderRating: null,
    riderHasPriorSubscription: false,
    vip: false,
    pickup: 'Qurtubah',
    destination: 'Al Fanar Mall',
    vehicleClass: 'Economy',
    requestedAt: '2026-06-24T22:40:00+03:00',
    planKey: null,
    preferredPickupTime: null,
    notes: null,
    offeredToDriverId: null,
    offeredToDriverName: null,
    offerExpiresAt: null,
    assignedDriverId: null,
    assignedDriverName: null,
    assignedSubscriptionId: null,
    assignedByUserId: null,
    assignedByUserName: null,
    assignedAt: null,
    expiredAt: '2026-06-24T23:10:00+03:00',
    cancelledAt: null,
    claim: null,
    slaStartedAt: '2026-06-24T22:40:00+03:00',
    slaDueAt: '2026-06-24T22:43:00+03:00',
    slaTargetMinutes: REQUEST_SLA_MINUTES.instant,
    slaBreachedAt: '2026-06-24T22:43:00+03:00',
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /* Rider cancelled ninety seconds in, before anyone was found. Nobody's
       fault, inside the window, and it still needs a row and a badge. */
    id: 'REQ-508',
    channel: 'instant',
    status: 'cancelled',
    riderId: 'RDR-2087',
    riderName: 'Layla Al-Faraj',
    riderRating: 4.2,
    riderHasPriorSubscription: true,
    vip: false,
    pickup: 'Al Aqiq',
    destination: 'Granada Mall',
    vehicleClass: 'Comfort',
    requestedAt: '2026-06-25T09:05:00+03:00',
    planKey: null,
    preferredPickupTime: null,
    notes: null,
    offeredToDriverId: null,
    offeredToDriverName: null,
    offerExpiresAt: null,
    assignedDriverId: null,
    assignedDriverName: null,
    assignedSubscriptionId: null,
    assignedByUserId: null,
    assignedByUserName: null,
    assignedAt: null,
    expiredAt: null,
    cancelledAt: '2026-06-25T09:06:30+03:00',
    claim: null,
    slaStartedAt: '2026-06-25T09:05:00+03:00',
    slaDueAt: '2026-06-25T09:08:00+03:00',
    slaTargetMinutes: REQUEST_SLA_MINUTES.instant,
    slaBreachedAt: null,
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },

  /* ── subscription requests ───────────────────────────────────────────── */
  {
    id: 'SREQ-001',
    channel: 'subscription',
    status: 'searching',
    riderId: 'RDR-3001',
    riderName: 'Abdullah Al-Rasheed',
    riderRating: null,
    riderHasPriorSubscription: false,
    vip: false,
    pickup: 'Al Yasmin District',
    destination: 'King Fahd Rd',
    vehicleClass: 'Economy',
    requestedAt: '2026-06-25T07:45:00+03:00',
    planKey: 'weekly',
    preferredPickupTime: '07:00',
    notes: 'First subscription — wants female driver if available',
    offeredToDriverId: null,
    offeredToDriverName: null,
    offerExpiresAt: null,
    assignedDriverId: null,
    assignedDriverName: null,
    assignedSubscriptionId: null,
    assignedByUserId: null,
    assignedByUserName: null,
    assignedAt: null,
    expiredAt: null,
    cancelledAt: null,
    claim: null,
    slaStartedAt: '2026-06-25T07:45:00+03:00',
    /* 89 of 120 minutes used — past `SUBREQ_REMINDER_HOURS` (`:9578`), inside
       the window. The amber band with something on both sides of it. */
    slaDueAt: '2026-06-25T09:45:00+03:00',
    slaTargetMinutes: REQUEST_SLA_MINUTES.subscription,
    slaBreachedAt: null,
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /** **Merely old**, the subscription-channel case. Due 08:12; assigned 07:10. */
    id: 'SREQ-002',
    channel: 'subscription',
    status: 'assigned',
    riderId: 'RDR-3002',
    riderName: 'Hind Al-Sulaiman',
    riderRating: null,
    riderHasPriorSubscription: false,
    vip: false,
    pickup: 'Al Narjis District',
    destination: 'King Abdullah Financial District',
    vehicleClass: 'Economy',
    requestedAt: '2026-06-25T06:12:00+03:00',
    planKey: 'biweekly',
    preferredPickupTime: '08:00',
    notes: null,
    offeredToDriverId: null,
    offeredToDriverName: null,
    offerExpiresAt: null,
    assignedDriverId: 'DRV-0104',
    assignedDriverName: 'Hassan Al-Ghamdi',
    assignedSubscriptionId: 'SUB-1052b',
    assignedByUserId: 'USR-1',
    assignedByUserName: 'Sarah Al-Rashid',
    assignedAt: '2026-06-25T07:10:00+03:00',
    expiredAt: null,
    cancelledAt: null,
    claim: null,
    slaStartedAt: '2026-06-25T06:12:00+03:00',
    slaDueAt: '2026-06-25T08:12:00+03:00',
    slaTargetMinutes: REQUEST_SLA_MINUTES.subscription,
    slaBreachedAt: null,
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /* Breached overnight — twelve hours past a two-hour promise, still open,
       nobody holding it. The row that asks whether the SLA column should show
       "12h over" or just "over". */
    id: 'SREQ-003',
    channel: 'subscription',
    status: 'searching',
    riderId: 'RDR-1090',
    riderName: 'Reem Al-Dosari',
    riderRating: 4.8,
    riderHasPriorSubscription: true,
    vip: false,
    pickup: 'Al Rabwah District',
    destination: 'Olaya Towers',
    vehicleClass: 'Comfort',
    requestedAt: '2026-06-24T19:03:00+03:00',
    planKey: 'monthly',
    preferredPickupTime: '07:30',
    notes: 'Wants the same driver daily if possible',
    offeredToDriverId: null,
    offeredToDriverName: null,
    offerExpiresAt: null,
    assignedDriverId: null,
    assignedDriverName: null,
    assignedSubscriptionId: null,
    assignedByUserId: null,
    assignedByUserName: null,
    assignedAt: null,
    expiredAt: null,
    cancelledAt: null,
    claim: null,
    slaStartedAt: '2026-06-24T19:03:00+03:00',
    slaDueAt: '2026-06-24T21:03:00+03:00',
    slaTargetMinutes: REQUEST_SLA_MINUTES.subscription,
    slaBreachedAt: '2026-06-24T21:03:00+03:00',
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    id: 'SREQ-004',
    channel: 'subscription',
    status: 'expired',
    riderId: 'RDR-3003',
    riderName: 'Yara Al-Mansour',
    riderRating: null,
    riderHasPriorSubscription: false,
    vip: false,
    pickup: 'Al Rabwah District',
    destination: 'Princess Noura University',
    vehicleClass: 'Economy',
    requestedAt: '2026-06-24T15:22:00+03:00',
    planKey: 'weekly',
    preferredPickupTime: '06:30',
    notes: 'No drivers available for requested route',
    offeredToDriverId: null,
    offeredToDriverName: null,
    offerExpiresAt: null,
    assignedDriverId: null,
    assignedDriverName: null,
    assignedSubscriptionId: null,
    assignedByUserId: null,
    assignedByUserName: null,
    assignedAt: null,
    expiredAt: '2026-06-25T06:00:00+03:00',
    cancelledAt: null,
    claim: null,
    slaStartedAt: '2026-06-24T15:22:00+03:00',
    slaDueAt: '2026-06-24T17:22:00+03:00',
    slaTargetMinutes: REQUEST_SLA_MINUTES.subscription,
    slaBreachedAt: '2026-06-24T17:22:00+03:00',
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /** **Breached, then resolved**, five days ago. Due 13:00, assigned 14:30. */
    id: 'SREQ-005',
    channel: 'subscription',
    status: 'assigned',
    riderId: 'RDR-1052',
    riderName: 'Omar Al-Shehri',
    riderRating: 4.7,
    riderHasPriorSubscription: true,
    vip: false,
    pickup: 'Al Malaz',
    destination: 'KFUPM Gate 2',
    vehicleClass: 'Comfort',
    requestedAt: '2026-06-20T11:00:00+03:00',
    planKey: 'biweekly',
    preferredPickupTime: '06:15',
    notes: null,
    offeredToDriverId: null,
    offeredToDriverName: null,
    offerExpiresAt: null,
    assignedDriverId: 'DRV-0104',
    assignedDriverName: 'Hassan Al-Ghamdi',
    assignedSubscriptionId: 'SUB-1052b',
    assignedByUserId: 'USR-2',
    assignedByUserName: 'Fahad Al-Dosari',
    assignedAt: '2026-06-20T14:30:00+03:00',
    expiredAt: null,
    cancelledAt: null,
    claim: null,
    slaStartedAt: '2026-06-20T11:00:00+03:00',
    slaDueAt: '2026-06-20T13:00:00+03:00',
    slaTargetMinutes: REQUEST_SLA_MINUTES.subscription,
    slaBreachedAt: '2026-06-20T13:00:00+03:00',
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /**
     * **Breached by five days**, against a two-hour promise, and still open.
     * Beside `REQ-503` (breached by two minutes against a three-minute promise)
     * this is the pair a single SLA column has to render without either row
     * disappearing: 40 % over and 6,000 % over.
     *
     * Also the long-Arabic-name row — 44 characters, `RDR-4002`.
     */
    id: 'SREQ-006',
    channel: 'subscription',
    status: 'searching',
    riderId: 'RDR-4002',
    riderName: 'الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي',
    riderRating: null,
    riderHasPriorSubscription: true,
    vip: false,
    pickup: 'Al Narjis District',
    destination: 'Princess Noura University',
    vehicleClass: 'Economy',
    requestedAt: '2026-06-20T08:15:00+03:00',
    planKey: 'weekly',
    preferredPickupTime: '06:45',
    notes: 'طلبت سائقة — لا يوجد كابتن متاح في الحي حتى الآن',
    offeredToDriverId: null,
    offeredToDriverName: null,
    offerExpiresAt: null,
    assignedDriverId: null,
    assignedDriverName: null,
    assignedSubscriptionId: null,
    assignedByUserId: null,
    assignedByUserName: null,
    assignedAt: null,
    expiredAt: null,
    cancelledAt: null,
    claim: null,
    slaStartedAt: '2026-06-20T08:15:00+03:00',
    slaDueAt: '2026-06-20T10:15:00+03:00',
    slaTargetMinutes: REQUEST_SLA_MINUTES.subscription,
    slaBreachedAt: '2026-06-20T10:15:00+03:00',
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
]

/**
 * Volume rows, so the index pages and the urgency sort are exercised.
 *
 * Deterministic by construction — every value is a pure function of the index.
 * Mirrors `fillerDrivers` in `fixtures/drivers.ts`; the legacy filler
 * (`:9836`–`:9848`) used `Math.random()` for the wait, the rider, the route and
 * the hour, so no two loads of the legacy app ever agreed on this table.
 *
 * All filler is **disposed** — assigned or expired — so it never changes the
 * open backlog the nav badge counts. The interesting rows above stay the whole
 * of the live queue.
 */
const FILLER_DISTRICTS = [
  'Al Narjis District',
  'Al Sahafa District',
  'Al Yasmin District',
  'Qurtubah',
  'Al Malaz',
  'Al Wurud District',
]
const FILLER_LANDMARKS = [
  'King Saud University',
  'Kingdom Tower',
  'Riyadh Park Mall',
  'Airport T5',
  'Granada Mall',
  'Olaya Towers',
]
const FILLER_RIDERS: ReadonlyArray<readonly [string, string]> = [
  ['RDR-1041', 'Nora Al-Harbi'],
  ['RDR-2087', 'Layla Al-Faraj'],
  ['RDR-1080', 'Mohammed Al-Qahtani'],
  ['RDR-1052', 'Omar Al-Shehri'],
  ['RDR-4003', 'Meshari Al-Dossari'],
  ['RDR-2090', 'Hessa Al-Mutlaq'],
]

export const fillerRequests: RideRequest[] = Array.from({ length: 40 }, (_, i) => {
  const instant = i % 2 === 0
  const assigned = i % 3 !== 0
  const [riderId, riderName] = cycle(FILLER_RIDERS, i)
  const dayOffset = 1 + (i % 4)
  const hour = 6 + (i % 10)
  const minute = (i * 7) % 60
  const p = (n: number) => String(n).padStart(2, '0')
  const day = 25 - dayOffset
  const at = (h: number, m: number) => `2026-06-${p(day)}T${p(h)}:${p(m)}:00+03:00`
  const requestedAt = at(hour, minute)
  const targetMinutes = instant ? REQUEST_SLA_MINUTES.instant : REQUEST_SLA_MINUTES.subscription
  const dueMinute = minute + targetMinutes
  const slaDueAt = at(hour + Math.floor(dueMinute / 60), dueMinute % 60)
  /* Every third filler row breached before it was disposed, so the archive has
     a realistic mix rather than a uniformly clean history. */
  const late = i % 3 === 0
  return {
    id: instant ? `REQ-${600 + i}` : `SREQ-${100 + i}`,
    channel: instant ? 'instant' : 'subscription',
    status: assigned ? 'assigned' : 'expired',
    riderId,
    riderName,
    riderRating: i % 4 === 0 ? null : Number((3.8 + ((i * 3) % 12) / 10).toFixed(1)),
    riderHasPriorSubscription: i % 5 !== 0,
    vip: false,
    pickup: cycle(FILLER_DISTRICTS, i),
    destination: cycle(FILLER_LANDMARKS, i + 2),
    vehicleClass: i % 3 === 0 ? 'Comfort' : 'Economy',
    requestedAt,
    planKey: instant ? null : cycle(['weekly', 'biweekly', 'monthly'] as const, i),
    preferredPickupTime: instant ? null : `0${6 + (i % 3)}:${cycle(['00', '15', '30', '45'], i)}`,
    notes: null,
    offeredToDriverId: null,
    offeredToDriverName: null,
    offerExpiresAt: null,
    assignedDriverId: assigned ? cycle(['DRV-0101', 'DRV-0102', 'DRV-0104'], i) : null,
    assignedDriverName: assigned ? cycle(['Ahmed Salem', 'Omar Farouk', 'Hassan Al-Ghamdi'], i) : null,
    assignedSubscriptionId: assigned && !instant ? 'SUB-1052b' : null,
    assignedByUserId: assigned ? cycle(['USR-1', 'USR-5'], i) : null,
    assignedByUserName: assigned ? cycle(['Sarah Al-Rashid', 'Yousef Al-Balawi'], i) : null,
    assignedAt: assigned ? at(hour + 1, minute) : null,
    expiredAt: assigned ? null : at(hour + 2, minute),
    cancelledAt: null,
    claim: null,
    slaStartedAt: requestedAt,
    slaDueAt,
    slaTargetMinutes: targetMinutes,
    slaBreachedAt: late ? slaDueAt : null,
    slaSource: 'legacy-policy',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  } satisfies RideRequest
})

/** What the client serves: the interesting rows first, then the volume. 54 in total. */
export const allRequestFixtures: RideRequest[] = [...requestFixtures, ...fillerRequests]
