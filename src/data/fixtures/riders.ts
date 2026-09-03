/**
 * Riders — legacy `DB.riders` (`eyvar_ops_panel_v40_fixed.html:2593`–`:2632`),
 * ten rows, converted and extended.
 *
 * The legacy wallet amounts are floats — `20`, `17.30` (`:2595`, `:2600`) — and
 * are the reason §8.3 exists. Halalas here.
 *
 * Added rows and what they exist to reach:
 *   RDR-4001  **overdrawn wallet** (negative balance). Nothing in the legacy app
 *             prevents one and no spec says what happens — an open question for
 *             product-owner, and until it is answered the screen must at least
 *             render it without lying.
 *   RDR-4002  a long Arabic name, high churn risk, no trips
 *   RDR-4003  a corporate-account employee (the `corporateAccountId` link)
 *
 * `RDR-1042` … `RDR-1049` were **referenced by 80 % of the trip fixtures and by
 * `CASH-0006` and did not exist**. They are real records now; the block above
 * them says why that resolution was chosen over repointing the fillers.
 *
 * `fillerRiders` at the bottom takes the population to 55, which is what the
 * riders index and Financials › Rider Wallets need to page at all.
 *
 * ## A lifetime total larger than the trips we hold is expected — not a defect
 *
 * `stats.totalTrips` is a **lifetime** figure; `fixtures/trips.ts` serves a
 * 137-row **sample**. Most riders here therefore store a total the trip table
 * cannot account for, and `clients/integrity.ts`'s `agree.aggregate-vs-records`
 * reports each one. **That is the level mismatch, not a data fault**, and it is
 * the same reading legacy itself settled on (`:20441`):
 *
 * > *"A gap is only an ALERT when the window itself is empty — that means a
 * > failed import or a duplicate profile. A total larger than the window is
 * > expected and must not shout, or the alert stops being read."*
 *
 * `RDR-1041` below is the worked example: 42 stored trips against a handful on
 * file, and correct. Closing the gap honestly would need roughly five thousand
 * trip rows; closing it by flattening the totals would corrupt real data to
 * satisfy a check, which is the move `rebuildAllHistory()` (`:18605`) makes and
 * that this layer refused to port.
 *
 * The half that **is** a fault is asserted, in `denormalisation.test.ts`: a
 * non-zero `totalTrips` beside a `null` `lastTripAt`. `null` there is defined
 * as *"has never taken a trip"*, so that pair is this layer contradicting its
 * own field definition rather than describing a sample.
 */

import { offsetFromNow } from '../mock/clock'
import { cycle } from './cycle'
import type { NewRider, Rider } from '../types/rider'

const namedRiders: Rider[] = [
  {
    id: 'RDR-1041',
    name: 'Nora Al-Harbi',
    phone: '+966 51 234 5678',
    rating: 4.9,
    tier: 'gold',
    status: 'subscriber',
    churnRisk: 'low',
    churnReason: { key: 'rider.churn.complaintsFiled', params: { count: 1 } },
    joinedAt: '2026-03-01',
    hasPhoto: true,
    gender: 'Female',
    /* The one seeded rider with a captain-gender preference (`:2594`). */
    driverGenderPreference: 'female',
    city: 'Riyadh',
    address: 'King Fahd District, Riyadh',
    device: 'iPhone 14 Pro · iOS 17.4',
    appLanguage: 'Arabic',
    lastIp: '92.96.14.201',
    ipLocation: 'Riyadh, SA',
    walletBalanceHalalas: 2_000,
    /* `PAY-6120`, authorised and not yet settled. */
    heldHalalas: 12_000,
    movementLog: [
      { at: '2026-03-01', action: 'Account registered', location: 'Riyadh, SA' },
      { at: '2026-04-01', action: 'Address updated', location: 'King Fahd District, Riyadh' },
      { at: '2026-06-25', action: 'App opened', location: 'Riyadh, SA' },
    ],
    totalTrips: 42,
    lifetimeValueHalalas: 25_950,
    renewalRatePercent: 100,
    quickRides: 6,
    lastTripAt: '2026-06-25T07:00:00+03:00',
    subscriptionIds: ['SUB-1041'],
    tripIds: ['TRP-7741'],
    paymentIds: ['PAY-5510'],
    /* The complaint this rider filed, now that `fixtures/complaints.ts` holds it. */
    complaintIds: ['CMP-350'],
    corporateAccountId: null,
  },
  {
    id: 'RDR-2087',
    name: 'Layla Al-Faraj',
    phone: '+966 54 901 2233',
    rating: 4.3,
    tier: 'silver',
    /* Their one subscription is cancelled, so `subs.length` is still 1 and the
       legacy renderer calls them Active (`:6428`). Corrected here: a cancelled
       subscription is not a subscriber. Recorded as a finding. */
    status: 'on-demand',
    churnRisk: 'high',
    churnReason: { key: 'rider.churn.cancelledOnRecord' },
    joinedAt: '2026-05-01',
    hasPhoto: false,
    gender: 'Female',
    driverGenderPreference: null,
    city: 'Riyadh',
    address: 'Al Nakheel District, Riyadh',
    device: 'Samsung Galaxy S23 · Android 14',
    appLanguage: 'Arabic',
    lastIp: '160.156.4.90',
    ipLocation: 'Riyadh, SA',
    walletBalanceHalalas: 1_730,
    heldHalalas: 2_450,
    movementLog: [
      { at: '2026-05-01', action: 'Account registered', location: 'Riyadh, SA' },
      { at: '2026-06-20', action: 'App opened', location: 'Riyadh, SA' },
    ],
    totalTrips: 11,
    lifetimeValueHalalas: 21_400,
    renewalRatePercent: null,
    quickRides: 11,
    lastTripAt: '2026-06-25T09:02:00+03:00',
    subscriptionIds: ['SUB-0998'],
    tripIds: ['TRP-9012'],
    paymentIds: ['PAY-6001', 'PAY-5988'],
    complaintIds: ['CMP-310'],
    corporateAccountId: null,
  },
  {
    id: 'RDR-2031',
    name: 'Tariq Al-Saud',
    phone: '+966 50 112 9988',
    rating: 4.9,
    tier: 'gold',
    status: 'subscriber',
    churnRisk: 'low',
    churnReason: { key: 'rider.churn.complaintsFiled', params: { count: 1 } },
    joinedAt: '2026-01-01',
    hasPhoto: true,
    gender: 'Male',
    driverGenderPreference: null,
    city: 'Riyadh',
    address: 'Al Yasmin District, Riyadh',
    device: 'iPhone 15 · iOS 17.5',
    appLanguage: 'English',
    lastIp: '92.96.201.44',
    ipLocation: 'Riyadh, SA',
    walletBalanceHalalas: 0,
    /* Two filler card charges still authorising. */
    heldHalalas: 4_077,
    movementLog: [
      { at: '2026-01-01', action: 'Account registered', location: 'Riyadh, SA' },
      /* App opened in Jeddah, account registered in Riyadh. A real signal the
         Risk & Signals surface reads. */
      { at: '2026-06-14', action: 'App opened', location: 'Jeddah, SA' },
      { at: '2026-06-25', action: 'App opened', location: 'Riyadh, SA' },
    ],
    totalTrips: 28,
    lifetimeValueHalalas: 104_000,
    renewalRatePercent: null,
    quickRides: 28,
    lastTripAt: '2026-06-25T08:41:00+03:00',
    subscriptionIds: ['SUB-1052'],
    tripIds: ['TRP-9008'],
    paymentIds: ['PAY-5491', 'PAY-6008'],
    /* The complaint this rider filed, now that `fixtures/complaints.ts` holds it. */
    complaintIds: ['CMP-301'],
    corporateAccountId: null,
  },
  {
    id: 'RDR-2090',
    name: 'Hessa Al-Mutlaq',
    phone: '+966 56 778 1020',
    /* Legacy `rating: 0` (`:2607`) means "no rating yet", not zero stars. */
    rating: null,
    tier: 'new',
    status: 'on-demand',
    churnRisk: 'medium',
    churnReason: { key: 'rider.churn.noSubscription' },
    joinedAt: '2026-06-01',
    hasPhoto: false,
    gender: 'Female',
    driverGenderPreference: null,
    city: 'Riyadh',
    address: 'Al Sahafa District, Riyadh',
    /**
     * **The one rider with no device on record — `null`, not `''`.**
     *
     * The profile's identity block prints *"No device recorded"* and until
     * `Rider.device` became nullable there was no value that could make that
     * sentence true, so the state was unreachable without hand-editing a
     * fixture. This is the row where it contradicts least: the wallet was
     * funded by a captain collecting 20.00 in cash at the kerb (`CASH-0003`),
     * which is an account that can exist without an app install behind it.
     *
     * `lastIp` below stays set on purpose. It is a different fact — the network
     * the last request came from — and blanking it to match would be inventing
     * a second absence nobody asked for.
     */
    device: null,
    appLanguage: 'Arabic',
    lastIp: '37.36.88.5',
    ipLocation: 'Riyadh, SA',
    /* Credited 20.00 by a cash top-up the captain collected (`CASH-0003`). */
    walletBalanceHalalas: 2_000,
    heldHalalas: 0,
    movementLog: [{ at: '2026-06-25', action: 'Account registered', location: 'Riyadh, SA' }],
    totalTrips: 1,
    lifetimeValueHalalas: 1_575,
    renewalRatePercent: null,
    quickRides: 1,
    lastTripAt: '2026-06-25T08:20:00+03:00',
    subscriptionIds: [],
    tripIds: ['TRP-9005'],
    paymentIds: ['PAY-6010'],
    /* The complaint this rider filed, now that `fixtures/complaints.ts` holds it. */
    complaintIds: ['CMP-351'],
    corporateAccountId: null,
  },
  {
    id: 'RDR-2055',
    name: 'Bandar Al-Harbi',
    phone: '+966 55 330 4411',
    rating: 4.2,
    tier: 'silver',
    status: 'on-demand',
    churnRisk: 'high',
    churnReason: { key: 'rider.churn.cancelledOnRecord' },
    joinedAt: '2026-04-01',
    hasPhoto: false,
    gender: 'Male',
    driverGenderPreference: null,
    city: 'Riyadh',
    address: 'Al Aqiq District, Riyadh',
    device: 'Huawei P60 · HarmonyOS 4',
    appLanguage: 'Arabic',
    /* Same IP as RDR-2087 (`160.156.4.90`) — two accounts, one device network.
       The fraud signal that already exists in the seed data. */
    lastIp: '160.156.4.90',
    ipLocation: 'Riyadh, SA',
    walletBalanceHalalas: 0,
    heldHalalas: 0,
    movementLog: [
      { at: '2026-04-01', action: 'Account registered', location: 'Riyadh, SA' },
      { at: '2026-06-25', action: 'App opened', location: 'Riyadh, SA' },
    ],
    totalTrips: 7,
    lifetimeValueHalalas: 13_200,
    renewalRatePercent: null,
    quickRides: 7,
    lastTripAt: '2026-06-25T07:55:00+03:00',
    subscriptionIds: ['SUB-0987'],
    tripIds: ['TRP-9003', 'TRP-7742'],
    paymentIds: ['PAY-5977', 'PAY-5475'],
    complaintIds: ['CMP-318'],
    corporateAccountId: null,
  },
  {
    id: 'RDR-1075',
    name: 'Sara Al-Ghamdi',
    phone: '+966 56 789 0123',
    /* Exactly 3.0 — the low-rating boundary. Off-by-one bugs live here. */
    rating: 3.0,
    tier: 'silver',
    status: 'subscriber',
    churnRisk: 'high',
    churnReason: { key: 'rider.churn.ratingBelowFour' },
    joinedAt: '2026-02-01',
    hasPhoto: true,
    gender: 'Female',
    driverGenderPreference: null,
    city: 'Riyadh',
    address: 'Qurtubah District, Riyadh',
    device: 'Samsung Galaxy A54 · Android 13',
    appLanguage: 'Arabic',
    lastIp: '185.45.10.91',
    ipLocation: 'Riyadh, SA',
    walletBalanceHalalas: 1_000,
    heldHalalas: 0,
    movementLog: [
      { at: '2026-02-01', action: 'Account registered', location: 'Riyadh, SA' },
      { at: '2026-06-23', action: 'Complaint filed', location: 'Riyadh, SA' },
    ],
    totalTrips: 13,
    lifetimeValueHalalas: 17_300,
    renewalRatePercent: 25,
    quickRides: 1,
    /* 13 lifetime trips, zero trip ids — the seeded contradiction at `:2622`. */
    /**
     * **A non-null last trip beside an empty `tripIds`.** The empty array is the
     * preserved legacy contradiction; `lastTripAt` is not part of it. Legacy
     * carries no such field (`DB.riders`, `:2593`–`:2632`) and
     * `types/rider.ts` defines `null` as *"a rider who has never taken a
     * trip"*, so `null` on a row with 13 recorded trips is this layer
     * contradicting its own field definition — and it makes every
     * `lastTripAt` sort and date filter wrong for the row.
     */
    lastTripAt: '2026-06-23T07:50:00+03:00',
    subscriptionIds: ['SUB-1075'],
    tripIds: [],
    paymentIds: [],
    complaintIds: ['CMP-330'],
    corporateAccountId: null,
  },
  {
    id: 'RDR-1080',
    name: 'Mohammed Al-Qahtani',
    phone: '+966 50 876 5432',
    rating: 5.0,
    tier: 'gold',
    status: 'subscriber',
    churnRisk: 'low',
    churnReason: { key: 'rider.churn.complaintsFiled', params: { count: 1 } },
    joinedAt: '2025-12-01',
    hasPhoto: true,
    gender: 'Male',
    driverGenderPreference: null,
    city: 'Riyadh',
    address: 'Al Nuzha District, Riyadh',
    device: 'iPhone 15 Pro · iOS 17.5',
    appLanguage: 'Arabic',
    lastIp: '92.96.33.6',
    ipLocation: 'Riyadh, SA',
    walletBalanceHalalas: 5_000,
    /* A filler card charge still authorising. */
    heldHalalas: 1_464,
    movementLog: [
      { at: '2025-12-01', action: 'Account registered', location: 'Riyadh, SA' },
      { at: '2026-06-25', action: 'App opened', location: 'Riyadh, SA' },
    ],
    totalTrips: 38,
    lifetimeValueHalalas: 206_000,
    renewalRatePercent: 93,
    quickRides: 0,
    lastTripAt: '2026-06-25T06:10:00+03:00',
    subscriptionIds: ['SUB-1060'],
    tripIds: ['TRP-7735'],
    paymentIds: ['PAY-5480'],
    /* The complaint this rider filed, now that `fixtures/complaints.ts` holds it. */
    complaintIds: ['CMP-344'],
    corporateAccountId: null,
  },
  {
    id: 'RDR-1052',
    name: 'Omar Al-Shehri',
    phone: '+966 50 555 6666',
    rating: 4.0,
    tier: 'silver',
    status: 'subscriber',
    churnRisk: 'medium',
    churnReason: { key: 'rider.churn.lowRenewalRate', params: { percent: 30 } },
    joinedAt: '2026-05-01',
    hasPhoto: true,
    gender: 'Male',
    driverGenderPreference: null,
    city: 'Riyadh',
    address: 'Al Aqiq District, Riyadh',
    device: 'OnePlus 11 · Android 14',
    appLanguage: 'Arabic',
    lastIp: '46.31.77.12',
    ipLocation: 'Riyadh, SA',
    walletBalanceHalalas: 0,
    heldHalalas: 0,
    movementLog: [{ at: '2026-05-01', action: 'Account registered', location: 'Riyadh, SA' }],
    totalTrips: 8,
    lifetimeValueHalalas: 12_250,
    renewalRatePercent: 30,
    quickRides: 0,
    /**
     * **A non-null last trip beside an empty `tripIds`.** The empty array is the
     * preserved legacy contradiction; `lastTripAt` is not part of it. Legacy
     * carries no such field (`DB.riders`, `:2593`–`:2632`) and
     * `types/rider.ts` defines `null` as *"a rider who has never taken a
     * trip"*, so `null` on a row with 8 recorded trips is this layer
     * contradicting its own field definition — and it makes every
     * `lastTripAt` sort and date filter wrong for the row.
     */
    lastTripAt: '2026-06-20T18:05:00+03:00',
    subscriptionIds: ['SUB-1052b'],
    tripIds: [],
    paymentIds: [],
    complaintIds: [],
    corporateAccountId: null,
  },
  {
    id: 'RDR-1060',
    name: 'Khaled Al-Zahrani',
    phone: '+966 54 222 1199',
    rating: 4.9,
    tier: 'gold',
    status: 'on-demand',
    churnRisk: 'low',
    churnReason: { key: 'rider.churn.complaintsFiled', params: { count: 1 } },
    joinedAt: '2026-01-01',
    hasPhoto: false,
    gender: 'Male',
    driverGenderPreference: null,
    city: 'Riyadh',
    address: 'Al Wurud District, Riyadh',
    device: 'iPhone 14 · iOS 17.4',
    appLanguage: 'Arabic',
    lastIp: '92.96.5.18',
    ipLocation: 'Riyadh, SA',
    walletBalanceHalalas: 20_000,
    heldHalalas: 3_450,
    movementLog: [{ at: '2026-01-01', action: 'Account registered', location: 'Riyadh, SA' }],
    totalTrips: 30,
    lifetimeValueHalalas: 164_000,
    renewalRatePercent: 91,
    quickRides: 2,
    /**
     * **A non-null last trip beside an empty `tripIds`.** The empty array is the
     * preserved legacy contradiction; `lastTripAt` is not part of it. Legacy
     * carries no such field (`DB.riders`, `:2593`–`:2632`) and
     * `types/rider.ts` defines `null` as *"a rider who has never taken a
     * trip"*, so `null` on a row with 30 recorded trips is this layer
     * contradicting its own field definition — and it makes every
     * `lastTripAt` sort and date filter wrong for the row.
     */
    lastTripAt: '2026-06-18T14:20:00+03:00',
    subscriptionIds: [],
    /* `TRP-9108` -- the cancelled leg behind `INC-019`. */
    tripIds: ['TRP-9108'],
    paymentIds: [],
    /* The complaint this rider filed, now that `fixtures/complaints.ts` holds it. */
    complaintIds: ['CMP-322'],
    corporateAccountId: null,
  },
  {
    id: 'RDR-1090',
    name: 'Reem Al-Dosari',
    phone: '+966 53 111 2222',
    rating: 4.8,
    tier: 'gold',
    status: 'on-demand',
    churnRisk: 'low',
    churnReason: null,
    joinedAt: '2026-03-01',
    hasPhoto: false,
    gender: 'Female',
    driverGenderPreference: null,
    city: 'Riyadh',
    address: 'Al Rawdah District, Riyadh',
    device: 'iPhone 13 mini · iOS 17.2',
    appLanguage: 'Arabic',
    lastIp: '37.36.50.2',
    ipLocation: 'Riyadh, SA',
    /* A 40.00 refund that landed in the **wallet**, not the instrument (`REF-0003`). */
    walletBalanceHalalas: 4_000,
    heldHalalas: 5_000,
    movementLog: [{ at: '2026-03-01', action: 'Account registered', location: 'Riyadh, SA' }],
    totalTrips: 20,
    lifetimeValueHalalas: 154_000,
    renewalRatePercent: 85,
    quickRides: 0,
    /**
     * **A non-null last trip beside an empty `tripIds`.** The empty array is the
     * preserved legacy contradiction; `lastTripAt` is not part of it. Legacy
     * carries no such field (`DB.riders`, `:2593`–`:2632`) and
     * `types/rider.ts` defines `null` as *"a rider who has never taken a
     * trip"*, so `null` on a row with 20 recorded trips is this layer
     * contradicting its own field definition — and it makes every
     * `lastTripAt` sort and date filter wrong for the row.
     */
    lastTripAt: '2026-06-11T20:15:00+03:00',
    subscriptionIds: [],
    tripIds: [],
    paymentIds: [],
    complaintIds: [],
    corporateAccountId: null,
  },

  /* ── added rows ─────────────────────────────────────────────────────── */
  {
    id: 'RDR-4001',
    name: 'Abdulaziz Al-Suwailem',
    phone: '+966 55 777 3131',
    rating: 3.8,
    tier: 'bronze',
    /**
     * **`on-demand`, corrected — L-12.**
     *
     * This row carried `status: 'subscriber'` with `subscriptionIds: []`, which
     * contradicts the field's own definition: `types/rider.ts` says `status` is
     * legacy's `subs.length` join (`:6428`), materialised as a server field so
     * three screens cannot compute it three ways. `RDR-2087` applies it
     * correctly in the *harder* direction — it holds a **cancelled**
     * subscription and is `on-demand` — so the rule was already established and
     * two rows in this block broke it.
     *
     * **It is a fixture defect and not a population choice**, and it was doing
     * real damage: it is the entire 62.0 / 63.3 gap on
     * `management.performance.avgRenewalRate`. The n=6 set that nobody could
     * name a predicate for was *"riders whose `status` says subscriber"* —
     * which **included these two with empty `subscriptionIds` and excluded
     * `RDR-1060` and `RDR-1090`, which also have empty `subscriptionIds`**. No
     * predicate on the data produces that set, because the set was produced by
     * an inconsistency.
     *
     * `renewalRatePercent: 44` **stays**, and it is not contradictory:
     * `RDR-1060` and `RDR-1090` are the established pattern — a rider with a
     * renewal history who holds no plan today. The rate is history; the status
     * is now.
     */
    status: 'on-demand',
    churnRisk: 'high',
    churnReason: { key: 'rider.churn.ratingBelowFour' },
    joinedAt: '2025-11-01',
    hasPhoto: false,
    gender: 'Male',
    driverGenderPreference: null,
    city: 'Riyadh',
    address: 'Al Badiah District, Riyadh',
    device: 'Samsung Galaxy A14 · Android 13',
    appLanguage: 'Arabic',
    lastIp: '46.31.11.4',
    ipLocation: 'Riyadh, SA',
    /**
     * **Overdrawn: −41.50 SAR.** A chargeback landed after the balance was
     * spent. Nothing in the legacy app prevents this and **no spec says what
     * happens next** — can they still book? is the debt collected? Open
     * question for product-owner, flagged in the handoff. Until it is answered
     * the screen has to render a negative balance, and this is the row that
     * makes it do so.
     */
    walletBalanceHalalas: -4_150,
    heldHalalas: 0,
    movementLog: [{ at: '2025-11-01', action: 'Account registered', location: 'Riyadh, SA' }],
    totalTrips: 63,
    lifetimeValueHalalas: 88_400,
    renewalRatePercent: 44,
    quickRides: 51,
    lastTripAt: offsetFromNow({ days: -2, hours: -3 }),
    subscriptionIds: [],
    tripIds: [],
    paymentIds: [],
    /* The complaint this rider filed, now that `fixtures/complaints.ts` holds it. */
    complaintIds: ['CMP-380'],
    corporateAccountId: null,
  },
  {
    id: 'RDR-4002',
    /* Long Arabic name in the same column as "Omar Al-Shehri". */
    name: 'الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي',
    phone: '+966 59 448 7070',
    rating: null,
    tier: 'new',
    status: 'on-demand',
    churnRisk: 'high',
    churnReason: { key: 'rider.churn.lapsedUnused' },
    /**
     * **DO NOT MOVE THIS DATE. It is wrong, it is deliberate, and two asserted
     * metric literals are pinned to it.**
     *
     * ## The contradiction
     *
     * Four facts about this rider **predate the day her account was created**:
     *
     * | fact | dated | where |
     * |---|---|---|
     * | wallet top-up, +120.00 | 31 May 14:26 | `fixtures/ledger.ts:140` |
     * | `SUB-2003` starts | 1 Jun | `fixtures/subscriptions.ts` |
     * | `SUB-2003` expires | 8 Jun | *same* |
     * | `PAY-6151`, a 64.00 fare | 17 Jun | `fixtures/payments.ts` |
     *
     * An account cannot transact before it exists, so the profile's timeline
     * (`clients/riders.ts` → `getRiderTimeline`) renders *"22 Jun · Account
     * registered"* **between** the plan expiring on the 8th and the trip
     * requested on the 25th. That ordering is odd on screen and it is
     * deliberate: the timeline reports the data rather than hiding it.
     *
     * ## Why it was not fixed by moving this field
     *
     * Moving `joinedAt` earlier was tried, measured and reverted. It breaks two
     * literals in `fixtures/metrics.ts`, and one of them is a state with no
     * other fixture in the product:
     *
     * 1. **`management.growth.newRiders`** (`fixtures/metrics.ts:1240`) —
     *    `comparison.value: 1`, over the window 20–22 Jun, and its own docblock
     *    names this rider: *"one rider joined on the 22nd, in the three days
     *    before."* **She is the only rider in the whole dataset with a
     *    `joinedAt` in that window.** Move her and the baseline is `0`, the
     *    tile becomes 0-against-0, and **AC-606's measured-zero-with-a-real-
     *    delta case is deleted** — it has no second fixture.
     * 2. **`management.growth.registeredRiders`** (`:1277`) — `comparison.value:
     *    54`, whose prose reads *"54 riders had joined on or before 10 Jun; the
     *    fifty-fifth joined 22 Jun."* That fifty-fifth is this row.
     *
     * ## Why it was not fixed from the other end either
     *
     * Re-dating the four records is worse. `SUB-2003.startedOn` sits inside
     * `SNAPSHOT_PREVIOUS`, and `clients/metrics.test.ts` asserts
     * `netSubscriptionMovement` at exactly `30` / `−3.2 %`. And `SUB-2003` is
     * the **only `expired` subscription in the dataset**, so pushing it past
     * `EYVAR_NOW` stops it being expired and takes `seam.test.ts`'s
     * "every subscription status is reachable" with it.
     *
     * ## The fix, when someone does it
     *
     * `fixtures/metrics.ts` already carries the finding: those baselines
     * *"should be computed the same way [their] numerator is … rather than
     * maintained by hand"*. Derive them, and moving this date becomes a
     * one-line change. Until then, this comment is the reason it stays.
     */
    joinedAt: '2026-06-22',
    hasPhoto: false,
    gender: 'Female',
    driverGenderPreference: 'female',
    city: 'Riyadh',
    address: 'حي حطين، طريق الملك سلمان، الرياض',
    device: 'iPhone 15 Pro Max · iOS 17.5',
    appLanguage: 'Arabic',
    lastIp: '92.96.201.90',
    ipLocation: 'Riyadh, SA',
    walletBalanceHalalas: 20_000,
    /* `PAY-6150` — a 98.00 quick-ride fare captured on `mada` and frozen for
       fraud review. Outside the 200.00 balance, which is two settled top-ups
       and nothing else. */
    heldHalalas: 9_800,
    movementLog: [{ at: '2026-06-22', action: 'Account registered', location: 'Riyadh, SA' }],
    /* Registered three days ago, never taken a trip. Every card on the profile
       is empty at once — the whole-page first-run empty (R8), not eight
       filtered-to-zero sentences. */
    totalTrips: 0,
    lifetimeValueHalalas: 0,
    renewalRatePercent: null,
    quickRides: 0,
    lastTripAt: null,
    subscriptionIds: [],
    tripIds: [],
    paymentIds: [],
    /* The complaint this rider filed, now that `fixtures/complaints.ts` holds it. */
    complaintIds: ['CMP-343'],
    corporateAccountId: null,
  },
  {
    id: 'RDR-4003',
    name: 'Meshari Al-Dossari',
    phone: '+966 50 990 6161',
    rating: 4.6,
    tier: 'silver',
    /** **`on-demand`, corrected — L-12.** Same defect as `RDR-4001`; the reason
        is written out there. `subscriptionIds` is `[]`, so the join says
        `on-demand`, and a corporate rider holds no personal plan of their own. */
    status: 'on-demand',
    churnRisk: 'low',
    churnReason: { key: 'rider.churn.complaintsFiled', params: { count: 1 } },
    joinedAt: '2026-04-15',
    hasPhoto: true,
    gender: 'Male',
    driverGenderPreference: null,
    city: 'Riyadh',
    address: 'Olaya District, Riyadh',
    device: 'iPhone 14 · iOS 17.4',
    appLanguage: 'English',
    lastIp: '92.96.14.77',
    ipLocation: 'Riyadh, SA',
    walletBalanceHalalas: 3_500,
    heldHalalas: 0,
    movementLog: [{ at: '2026-04-15', action: 'Account registered', location: 'Riyadh, SA' }],
    totalTrips: 74,
    lifetimeValueHalalas: 132_000,
    renewalRatePercent: 88,
    quickRides: 12,
    lastTripAt: offsetFromNow({ hours: -2 }),
    subscriptionIds: [],
    tripIds: [],
    paymentIds: [],
    /* The complaint this rider filed, now that `fixtures/complaints.ts` holds it. */
    complaintIds: ['CMP-372'],
    /* An employee on a corporate account — the link `corpForRider` walks (`:4910`). */
    corporateAccountId: 'CORP-002',
  },

  /* ── RDR-1042 … RDR-1049: the eight riders the fillers already linked to ──
     These ids were referenced by **106 of 132 trips (80 %)**, **53 of 70
     subscriptions (76 %)** and `CASH-0006`, and none of them existed. Four in
     five trip rows opened a 360° profile that 404s.

     Two honest resolutions: invent eight riders, or repoint the fillers at the
     thirteen that exist. **These eight are real records** because repointing
     would have changed every trips-per-rider distribution the metric baselines
     are derived against, and because `riderFixtures` at thirteen rows could not
     page at `DEFAULT_PAGE_SIZE = 25` — the riders index and Rider Wallets were
     both stuck on one page. One change, two findings.

     Every one of them: `walletBalanceHalalas: 0`, because the wallet balance on
     the index is read from the ledger's last settled posting
     (`clients/wallets.ts:79`) and these riders have no postings. A non-zero
     literal here would be a number the ledger cannot corroborate, which is the
     defect `financials.test.ts:423` exists to catch. */
  {
    id: 'RDR-1042',
    /* 47 characters, full Arabic naming convention. The rider-side counterpart
       of DRV-0201 — bidirectional text in one column is the normal case. */
    name: 'محمد بن عبد العزيز بن ناصر آل سعيّد الشمري',
    phone: '+966 55 812 4409',
    rating: 4.7,
    tier: 'gold',
    status: 'on-demand',
    churnRisk: 'low',
    churnReason: null,
    joinedAt: '2025-09-01',
    hasPhoto: true,
    gender: 'Male',
    driverGenderPreference: null,
    city: 'Riyadh',
    address: 'حي الياسمين، طريق أنس بن مالك، الرياض',
    device: 'iPhone 15 Pro Max · iOS 17.5',
    appLanguage: 'Arabic',
    lastIp: '92.96.88.17',
    ipLocation: 'Riyadh, SA',
    walletBalanceHalalas: 20_000,
    heldHalalas: 0,
    movementLog: [{ at: '2025-09-01', action: 'Account registered', location: 'Riyadh, SA' }],
    totalTrips: 216,
    lifetimeValueHalalas: 412_600,
    renewalRatePercent: 96,
    quickRides: 44,
    lastTripAt: '2026-06-24T19:12:00+03:00',
    subscriptionIds: [],
    tripIds: [],
    paymentIds: [],
    complaintIds: [],
    corporateAccountId: null,
  },
  {
    id: 'RDR-1043',
    name: 'Abdulrahman Al-Zahrani',
    phone: '+966 56 118 9042',
    /* Three trips and **nobody has rated him** — `null`, not 0. The rating
       column has to render an em dash beside a non-zero trip count. */
    rating: null,
    tier: 'new',
    status: 'on-demand',
    churnRisk: 'medium',
    churnReason: { key: 'rider.churn.noSubscription' },
    joinedAt: '2026-06-08',
    hasPhoto: false,
    gender: 'Male',
    driverGenderPreference: null,
    city: 'Riyadh',
    address: 'Al Izdihar District, Riyadh',
    device: 'Samsung Galaxy A15 · Android 14',
    appLanguage: 'Arabic',
    lastIp: '46.31.60.140',
    ipLocation: 'Riyadh, SA',
    walletBalanceHalalas: 5_000,
    /* A filler card charge still authorising. */
    heldHalalas: 2_839,
    movementLog: [{ at: '2026-06-08', action: 'Account registered', location: 'Riyadh, SA' }],
    totalTrips: 3,
    lifetimeValueHalalas: 4_820,
    renewalRatePercent: null,
    quickRides: 3,
    lastTripAt: '2026-06-19T07:40:00+03:00',
    subscriptionIds: [],
    tripIds: [],
    paymentIds: [],
    complaintIds: [],
    corporateAccountId: null,
  },
  {
    id: 'RDR-1044',
    name: 'Fatimah Al-Qurashi',
    phone: '+966 50 334 6612',
    rating: 4.1,
    /* The only `bronze` rider besides RDR-4001 — the tier the badge palette has
       a tone for and the data almost never reaches. */
    tier: 'bronze',
    status: 'on-demand',
    churnRisk: 'medium',
    churnReason: { key: 'rider.churn.noSubscription' },
    joinedAt: '2026-02-01',
    hasPhoto: true,
    gender: 'Female',
    driverGenderPreference: 'female',
    city: 'Riyadh',
    address: 'Al Rabwah District, Riyadh',
    device: 'iPhone 12 mini · iOS 17.1',
    appLanguage: 'Arabic',
    lastIp: '185.45.22.71',
    ipLocation: 'Riyadh, SA',
    walletBalanceHalalas: 0,
    heldHalalas: 0,
    movementLog: [
      { at: '2026-02-01', action: 'Account registered', location: 'Riyadh, SA' },
      { at: '2026-06-17', action: 'App opened', location: 'Riyadh, SA' },
    ],
    totalTrips: 34,
    lifetimeValueHalalas: 41_900,
    renewalRatePercent: 62,
    quickRides: 34,
    lastTripAt: '2026-06-17T16:05:00+03:00',
    subscriptionIds: [],
    tripIds: [],
    paymentIds: [],
    complaintIds: [],
    corporateAccountId: null,
  },
  {
    id: 'RDR-1045',
    /* 34 characters of Latin text — long enough to break a name column without
       any of the Arabic shaping that usually gets the blame for it. */
    name: 'Youssef Abdelrahman El-Sayed Farag',
    phone: '+966 59 002 7788',
    rating: 3.4,
    tier: 'silver',
    status: 'on-demand',
    churnRisk: 'high',
    churnReason: { key: 'rider.churn.ratingBelowFour' },
    joinedAt: '2025-10-01',
    hasPhoto: false,
    gender: 'Male',
    driverGenderPreference: null,
    city: 'Riyadh',
    address: 'Al Suwaidi District, Riyadh',
    device: 'Oppo Reno 10 · Android 14',
    appLanguage: 'English',
    lastIp: '37.36.19.204',
    ipLocation: 'Riyadh, SA',
    walletBalanceHalalas: 10_000,
    heldHalalas: 0,
    movementLog: [{ at: '2025-10-01', action: 'Account registered', location: 'Riyadh, SA' }],
    totalTrips: 91,
    lifetimeValueHalalas: 118_300,
    renewalRatePercent: 38,
    quickRides: 78,
    lastTripAt: '2026-06-15T21:30:00+03:00',
    subscriptionIds: [],
    tripIds: [],
    paymentIds: [],
    complaintIds: [],
    corporateAccountId: null,
  },
  {
    id: 'RDR-1046',
    /**
     * **"Noura Al-Harbi", one letter from RDR-1041's "Nora Al-Harbi", and a
     * different person.** `CASH-0006` carried this id with *Nora's* name on it
     * — the denormalisation defect in its purest form, on a hand-written row
     * rather than a generated one. Two near-identical names is the ordinary
     * case in a city of five million, and search, disambiguation and the
     * "are you sure this is the right rider?" moment all have to survive it.
     */
    name: 'Noura Al-Harbi',
    phone: '+966 53 447 1902',
    rating: 4.8,
    tier: 'gold',
    status: 'on-demand',
    churnRisk: 'low',
    churnReason: null,
    joinedAt: '2025-12-01',
    hasPhoto: true,
    gender: 'Female',
    driverGenderPreference: 'female',
    city: 'Riyadh',
    address: 'Al Malqa District, Riyadh',
    device: 'iPhone 14 · iOS 17.4',
    appLanguage: 'Arabic',
    lastIp: '92.96.14.202',
    ipLocation: 'Riyadh, SA',
    walletBalanceHalalas: 2_500,
    heldHalalas: 0,
    movementLog: [{ at: '2025-12-01', action: 'Account registered', location: 'Riyadh, SA' }],
    totalTrips: 128,
    lifetimeValueHalalas: 233_400,
    renewalRatePercent: 88,
    quickRides: 12,
    lastTripAt: '2026-06-24T21:00:00+03:00',
    subscriptionIds: [],
    tripIds: [],
    paymentIds: [],
    complaintIds: [],
    corporateAccountId: null,
  },
  {
    id: 'RDR-1047',
    name: 'Salman Al-Dossari',
    phone: '+966 50 771 3355',
    rating: 4.5,
    tier: 'silver',
    status: 'on-demand',
    churnRisk: 'low',
    churnReason: null,
    joinedAt: '2026-01-15',
    hasPhoto: false,
    gender: 'Male',
    driverGenderPreference: null,
    city: 'Riyadh',
    address: 'KAFD, Riyadh',
    device: 'Pixel 7a · Android 14',
    appLanguage: 'English',
    lastIp: '92.96.14.78',
    ipLocation: 'Riyadh, SA',
    walletBalanceHalalas: 60_000,
    heldHalalas: 0,
    movementLog: [{ at: '2026-01-15', action: 'Account registered', location: 'Riyadh, SA' }],
    totalTrips: 57,
    lifetimeValueHalalas: 96_400,
    renewalRatePercent: 74,
    quickRides: 9,
    lastTripAt: '2026-06-23T08:15:00+03:00',
    subscriptionIds: [],
    tripIds: [],
    paymentIds: [],
    complaintIds: [],
    /* A second employee on CORP-002, so the corporate profile's employee list
       has more than one row and its "remove employee" case is reachable. */
    corporateAccountId: 'CORP-002',
  },
  {
    id: 'RDR-1048',
    name: 'Maryam Al-Anazi',
    phone: '+966 56 220 8134',
    rating: 4.4,
    tier: 'silver',
    status: 'on-demand',
    churnRisk: 'high',
    churnReason: { key: 'rider.churn.lowRenewalRate', params: { percent: 20 } },
    joinedAt: '2025-08-01',
    hasPhoto: false,
    gender: 'Female',
    driverGenderPreference: 'female',
    city: 'Riyadh',
    address: 'Al Shifa District, Riyadh',
    device: 'Huawei nova 12 · HarmonyOS 4',
    appLanguage: 'Arabic',
    lastIp: '160.156.30.11',
    ipLocation: 'Riyadh, SA',
    walletBalanceHalalas: 7_500,
    /* A filler card charge still authorising. */
    heldHalalas: 4_889,
    movementLog: [{ at: '2025-08-01', action: 'Account registered', location: 'Riyadh, SA' }],
    totalTrips: 62,
    lifetimeValueHalalas: 71_500,
    renewalRatePercent: 20,
    quickRides: 62,
    /* Nine weeks since the last trip. The dormancy proxy
       (`management.growth.dormantRiderShare`) is measured on rows like this
       one, and until now the only dormant rows were riders with `null`. */
    lastTripAt: '2026-04-19T18:22:00+03:00',
    subscriptionIds: [],
    tripIds: [],
    paymentIds: [],
    complaintIds: [],
    corporateAccountId: null,
  },
  {
    id: 'RDR-1049',
    name: 'Ali Al-Balawi',
    phone: '+966 54 663 2077',
    rating: 2.6,
    tier: 'bronze',
    status: 'on-demand',
    churnRisk: 'high',
    churnReason: { key: 'rider.churn.complaintsFiled', params: { count: 2 } },
    joinedAt: '2025-07-01',
    hasPhoto: false,
    gender: 'Male',
    driverGenderPreference: null,
    city: 'Riyadh',
    address: 'Al Batha District, Riyadh',
    device: 'Redmi 12C · Android 13',
    appLanguage: 'Arabic',
    lastIp: '46.31.11.4',
    ipLocation: 'Riyadh, SA',
    walletBalanceHalalas: 1_000,
    heldHalalas: 0,
    movementLog: [
      { at: '2025-07-01', action: 'Account registered', location: 'Riyadh, SA' },
      { at: '2026-06-21', action: 'Complaint filed', location: 'Riyadh, SA' },
    ],
    totalTrips: 45,
    lifetimeValueHalalas: 38_900,
    renewalRatePercent: null,
    quickRides: 45,
    lastTripAt: '2026-06-21T22:48:00+03:00',
    subscriptionIds: [],
    tripIds: [],
    paymentIds: [],
    /* **The only rider with more than one complaint.**
       `management.churn.repeatComplaintRate` divides this population by the
       whole rider base and, with nobody in it, has only ever read 0.0 %.
       Complaint ids follow the established shape — legacy carries them as ids
       on the party, with no complaints collection of their own (`:2597`). */
    complaintIds: ['CMP-341', 'CMP-347'],
    corporateAccountId: null,
  },
]

/**
 * Volume rows for pagination — the riders index and Financials › Rider Wallets
 * are the same population and both were stuck on one page at thirteen rows.
 *
 * **Built the paired way** (`cycle.ts`): the id, the name and the phone are all
 * functions of the same `i` and are assembled in one object literal, so there
 * is no second sequence to fall out of phase with the first.
 *
 * Two constraints that are not decoration:
 *
 *  - `walletBalanceHalalas: 0` on every row. The wallet index reads the balance
 *    from the ledger, and these riders have no postings.
 *  - `joinedAt` is never later than `2026-06-19`. `management.growth.newRiders`
 *    is a measured **zero** for the current window (AC-606) and its baseline is
 *    the three days before it; a filler that joined inside either window would
 *    silently destroy the one measured-zero tile in the set.
 */
const FILLER_RIDER_GIVEN = ['Sultan', 'Danah', 'Rakan', 'Jawaher', 'Ziyad', 'Munirah', 'Talal']
const FILLER_RIDER_FAMILY = [
  'Al-Harthi',
  'Al-Sudairi',
  'Al-Rasheed',
  'Al-Suwailem',
  'Al-Nafisi',
  'Al-Turki',
  'Al-Fadhli',
  'Al-Muhaideb',
]
const FILLER_RIDER_DISTRICTS = [
  'Al Malqa',
  'Hittin',
  'Al Yasmin',
  'Qurtubah',
  'Al Nakheel',
  'Olaya',
  'Al Wurud',
  'Al Rabwah',
  'Al Sahafa',
]

/**
 * **The city each filler rider lives in.** Every one of the 55 riders used to
 * be Riyadh, and two boards paid for it: `/operations/people` showed one
 * distinct `City` across every visible row, and
 * `management.zones.unservedDemandCities` — riders in a city we have supply
 * signal in and no service — could only ever report `0`, because there was no
 * second city for it to count.
 *
 * Weighted the way the demand is: Riyadh first, then the two cities
 * `DB.cities` (`:13946`) names as declared-but-unlaunched, then a tail. It is
 * **deliberately not the captains' distribution** — riders ask for trips in
 * places we have no captains, which is the whole content of the unserved-demand
 * tile.
 *
 * `fixtures/zones.ts` stays all-Riyadh and must: R4-6b §6.6.5 keeps that as
 * **L-6**'s evidence, and a rider's home city is not a tracked zone.
 */
const FILLER_RIDER_CITIES = [
  'Riyadh',
  'Riyadh',
  'Jeddah',
  'Riyadh',
  'Dammam',
  'Riyadh',
  'Jeddah',
  'Makkah',
  'Riyadh',
  'Al Khobar',
  'Riyadh',
  'Jeddah',
  'Madinah',
  'Riyadh',
  'Dammam',
  'Taif',
  'Riyadh',
] as const

/** A district that exists in that city, so the address never contradicts it. */
const RIDER_CITY_DISTRICTS: Record<string, string> = {
  Jeddah: 'Al Hamra',
  Dammam: 'Al Shatea',
  Makkah: 'Al Nuzha',
  'Al Khobar': 'Al Aqrabiyah',
  Madinah: 'Al Aqiq',
  Taif: 'Al Rudaf',
}

/**
 * The wallet balance each filler rider closes on — the running sum of that
 * rider's rows in `walletTopUpSeeds` (`fixtures/ledger.ts`), stated here as a
 * literal on purpose. **`financials.test.ts` asserts the two agree for every
 * rider (AC-347)**, and that assertion is only worth running because the two
 * numbers are written independently. A rider absent from this map has never
 * topped up and closes at zero, which is a state, not a gap.
 */
const FILLER_RIDER_WALLET_BALANCES: Record<string, number> = {
  'RDR-5101': 5_000,
  'RDR-5102': 25_000,
  'RDR-5103': 1_500,
  'RDR-5104': 12_000,
  'RDR-5106': 4_000,
  'RDR-5108': 50_000,
  'RDR-5110': 2_000,
  'RDR-5112': 15_000,
  'RDR-5114': 6_500,
  'RDR-5117': 9_000,
  'RDR-5120': 3_000,
  'RDR-5124': 40_000,
  'RDR-5128': 1_750,
  'RDR-5132': 22_500,
}

export const fillerRiders: Rider[] = Array.from({ length: 34 }, (_, i) => {
  const n = i + 1
  const given = cycle(FILLER_RIDER_GIVEN, i)
  const family = cycle(FILLER_RIDER_FAMILY, i)
  const female = i % 3 === 1
  const trips = 2 + ((i * 11) % 90)
  const id = `RDR-5${String(100 + n).padStart(3, '0')}`
  const city = cycle(FILLER_RIDER_CITIES, i)
  const district = RIDER_CITY_DISTRICTS[city] ?? cycle(FILLER_RIDER_DISTRICTS, i)
  /* Hoisted out of the literal below because `churnReason` has to agree with
     both of them, and a reason that contradicts the level it explains is worse
     than no reason at all. */
  const rating = i % 8 === 0 ? null : Number((3.2 + ((i * 3) % 18) / 10).toFixed(1))
  const churnRisk: Rider['churnRisk'] = i % 4 === 0 ? 'high' : i % 3 === 0 ? 'medium' : 'low'
  /* `low` carries no reason — the absence is the state (`types/rider.ts`).
     Every filler holds `subscriptionIds: []`, so `noSubscription` is a true
     statement about every one of them; a below-4 rating outranks it, which is
     the order legacy scores the two signals in (`:4058`–`:4059`). */
  const churnReason: Rider['churnReason'] =
    churnRisk === 'low'
      ? null
      : rating !== null && rating < 4
        ? { key: 'rider.churn.ratingBelowFour' }
        : { key: 'rider.churn.noSubscription' }
  return {
    id,
    name: `${given} ${family}`,
    phone: `+966 5${i % 10} ${String(300 + n).padStart(3, '0')} ${String(4000 + n * 13).slice(-4)}`,
    rating,
    tier: i % 7 === 0 ? 'gold' : i % 5 === 0 ? 'bronze' : i % 2 === 0 ? 'silver' : 'new',
    status: 'on-demand',
    churnRisk,
    churnReason,
    joinedAt: `2026-0${(i % 5) + 1}-${String((i % 27) + 1).padStart(2, '0')}`,
    hasPhoto: i % 2 === 0,
    gender: female ? 'Female' : 'Male',
    driverGenderPreference: female && i % 6 === 1 ? 'female' : null,
    city,
    address: `${district} District, ${city}`,
    device: i % 2 === 0 ? 'iPhone 14 · iOS 17.4' : 'Samsung Galaxy A54 · Android 13',
    appLanguage: i % 5 === 0 ? 'English' : 'Arabic',
    lastIp: `92.96.${(i * 7) % 200}.${(i * 11) % 250}`,
    ipLocation: `${city}, SA`,
    walletBalanceHalalas: FILLER_RIDER_WALLET_BALANCES[id] ?? 0,
    /* No filler rider has a payment at all — `fixtures/payments.ts` names only
       the seeded rows — so nothing is held on any of them. `0` is the answer,
       not a placeholder. */
    heldHalalas: 0,
    movementLog: [
      {
        at: `2026-0${(i % 5) + 1}-${String((i % 27) + 1).padStart(2, '0')}`,
        action: 'Account registered',
        location: `${city}, SA`,
      },
    ],
    totalTrips: trips,
    lifetimeValueHalalas: 1_200 * trips + i * 90,
    renewalRatePercent: i % 3 === 0 ? null : 25 + ((i * 9) % 70),
    quickRides: Math.max(0, trips - (i % 12)),
    lastTripAt: offsetFromNow({ days: -(i % 40), hours: -(i % 17), minutes: -(i % 51) }),
    subscriptionIds: [],
    tripIds: [],
    paymentIds: [],
    complaintIds: [],
    corporateAccountId: null,
  } satisfies Rider
})

/** 55 rows — three pages at the default 25, for the index and for Rider Wallets. */
export const riderFixtures: Rider[] = [...namedRiders, ...fillerRiders]

/**
 * New riders — legacy `DB.newRiders` (`:2744`–`:2748`), verbatim. A separate
 * collection with a separate shape; see `types/rider.ts` for why it is not a
 * `Rider` with nulls.
 */
export const newRiderFixtures: NewRider[] = [
  {
    id: 'RDR-3001',
    name: 'Abdullah Al-Rasheed',
    phone: '+966 55 600 7788',
    joinedAt: '2026-06-25',
    firstAction: 'No trips yet',
    dateOfBirth: '1995-05-11',
    nationalId: '1093456712',
    address: 'Al Yasmin District, Riyadh',
    city: 'Riyadh',
    hasPhoto: false,
    gender: 'Male',
    device: 'iPhone 12 · iOS 17.1',
    appLanguage: 'Arabic',
    lastIp: '92.96.71.30',
    ipLocation: 'Riyadh, SA',
    movementLog: [{ at: '2026-06-25', action: 'Account registered', location: 'Riyadh, SA' }],
  },
  {
    id: 'RDR-3002',
    name: 'Hind Al-Sulaiman',
    phone: '+966 53 220 9911',
    joinedAt: '2026-06-25',
    firstAction: '1 quick ride completed',
    dateOfBirth: '1999-08-30',
    nationalId: '1108765432',
    address: 'Al Narjis District, Riyadh',
    city: 'Riyadh',
    hasPhoto: true,
    gender: 'Female',
    device: 'Samsung Galaxy Z Flip5 · Android 14',
    appLanguage: 'Arabic',
    lastIp: '185.45.91.4',
    ipLocation: 'Riyadh, SA',
    movementLog: [
      { at: '2026-06-25', action: 'Account registered', location: 'Riyadh, SA' },
      { at: '2026-06-25', action: 'First trip completed', location: 'Riyadh, SA' },
    ],
  },
  {
    id: 'RDR-3003',
    name: 'Yara Al-Mansour',
    phone: '+966 56 334 5500',
    joinedAt: '2026-06-24',
    firstAction: 'Browsing — no trips yet',
    dateOfBirth: '2001-02-22',
    nationalId: '1115678234',
    address: 'Al Rabwah District, Riyadh',
    city: 'Riyadh',
    hasPhoto: false,
    gender: 'Female',
    device: 'iPhone 14 Plus · iOS 17.4',
    appLanguage: 'English',
    lastIp: '37.36.22.8',
    ipLocation: 'Riyadh, SA',
    movementLog: [{ at: '2026-06-24', action: 'Account registered', location: 'Riyadh, SA' }],
  },
]
