/**
 * Captains — legacy `DB.drivers` (`eyvar_ops_panel_v40_fixed.html:2633`–`:2673`),
 * six rows, plus the rows the six cannot reach.
 *
 * DRV-0101…0106 are the seeded captains, converted (money → halalas, dates →
 * ISO, `activeSubs:'4/5'` → two integers, derived status → the enum). Everything
 * after DRV-0201 is added, and each says what state it exists to reach.
 *
 * Ugly on purpose. If no row here breaks a column, visual QA will pass a screen
 * that real data will break:
 *   DRV-0201  a 61-character Arabic name that will not fit any name column
 *   DRV-0202  suspended, with a reason
 *   DRV-0203  a captain with **no trips at all** — the "never driven" row
 *   DRV-0204  under review, three open complaints
 *   DRV-0205  rating `null` (new captain), plan access terminated
 *   DRV-0206  a European name with diacritics next to Arabic, in one table
 *   DRV-0207  plan frozen until a date in the future
 *
 * Pagination volume comes from `fillerDrivers` at the bottom — deliberately
 * separated so the interesting rows above stay hand-editable.
 *
 * ## A lifetime total larger than the trips we hold is expected — not a defect
 *
 * Same reading as `fixtures/riders.ts`, which states it in full: `totalTrips`
 * is lifetime, `fixtures/trips.ts` is a 137-row sample, and
 * `agree.aggregate-vs-records` reporting the difference is the level mismatch
 * rather than a fault. Legacy's own reclassification says so (`:20441`) — *"a
 * total larger than the window is expected and must not shout"* — and
 * `clients/integrity.test.ts:215` asserts only the half that matters: nobody
 * **with** trips on file may be flagged.
 *
 * The half that is a fault — a non-zero `totalTrips` beside a `null`
 * `lastTripAt` — is asserted in `denormalisation.test.ts`.
 */

import { offsetFromNow } from '../mock/clock'
import { cycle } from './cycle'
import type { Driver } from '../types/driver'

export const driverFixtures: Driver[] = [
  {
    id: 'DRV-0101',
    name: 'Ahmed Salem',
    phone: '+966 53 001 0101',
    email: 'ahmed.salem86@gmail.com',
    rating: 4.9,
    tier: 'gold',
    /* Derived from `openComplaints: 1` below — see the note there. */
    status: 'under-review',
    vehicle: 'Corolla 2022 · White',
    vehicleClass: 'Economy',
    joinedAt: '2025-02-01',
    hasPhoto: true,
    gender: 'Male',
    city: 'Riyadh',
    address: 'Al Malaz District, Riyadh',
    device: 'iPhone 14 · iOS 17.4',
    appLanguage: 'Arabic',
    lastIp: '92.96.7.40',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'Al Rajhi Bank',
      iban: 'SA44 8000 0000 6080 1016 7519',
      holder: 'Ahmed Salem',
      status: 'Verified',
    },
    bankHistory: [],
    movementLog: [
      { at: '2025-02-01', action: 'Account registered', location: 'Riyadh, SA' },
      { at: '2026-06-25', action: 'App opened', location: 'Riyadh, SA' },
    ],
    activeSubscriptions: 4,
    maxSubscriptions: 5,
    multiSubException: true,
    suspended: false,
    suspensionReason: null,
    planAccess: 'granted',
    planFrozenUntil: null,
    flaggedForDeclines: false,
    manualFlag: false,
    /**
     * **Was `0`, and the driver record was the wrong witness.** `CMP-330` is
     * `status: 'Open'` in legacy (`:2711`) and notification **N6** names it
     * *"CMP-330 against Ahmed Salem"*, so two independent records said this
     * captain had an open complaint while this one said he had none.
     *
     * The count carries a consequence: `types/driver.ts` states the legacy
     * derivation — `open complaints ∨ flaggedForDeclines ∨ manualFlag` →
     * **Under review** (`:6394`) — so `status` moves with it. Leaving `active`
     * beside a non-zero count would have traded one contradiction for another.
     */
    openComplaints: 1,
    totalTrips: 412,
    monthEarningsHalalas: 284_000,
    onTimePercent: 96,
    openSubscriptionSlots: 1,
    lastTripAt: '2026-06-25T07:00:00+03:00',
    tripIds: ['TRP-7741', 'TRP-9005', 'TRP-7720'],
    paymentIds: ['PAY-W640'],
    /* Filed against this account and held by `fixtures/complaints.ts`. The id list
       was empty beside a non-zero count until that collection existed. */
    complaintIds: ['CMP-330'],
  },
  {
    id: 'DRV-0102',
    name: 'Omar Farouk',
    phone: '+966 53 002 0202',
    email: 'omar.farouk@outlook.com',
    rating: 4.5,
    tier: 'silver',
    status: 'active',
    vehicle: 'Camry 2023 · Silver',
    vehicleClass: 'Comfort',
    joinedAt: '2025-06-01',
    hasPhoto: false,
    gender: 'Male',
    city: 'Riyadh',
    address: 'Al Nuzha District, Riyadh',
    device: 'Samsung Galaxy S22 · Android 13',
    appLanguage: 'Arabic',
    lastIp: '185.45.30.7',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'SNB (Al Ahli)',
      iban: 'SA03 1000 0000 0654 3219 8765',
      holder: 'Omar Farouk',
      status: 'Verified',
    },
    bankHistory: [],
    movementLog: [{ at: '2025-06-01', action: 'Account registered', location: 'Riyadh, SA' }],
    activeSubscriptions: 3,
    maxSubscriptions: 5,
    multiSubException: false,
    suspended: false,
    suspensionReason: null,
    planAccess: 'granted',
    planFrozenUntil: null,
    flaggedForDeclines: false,
    manualFlag: false,
    openComplaints: 0,
    totalTrips: 318,
    monthEarningsHalalas: 362_000,
    onTimePercent: 91,
    openSubscriptionSlots: 2,
    lastTripAt: '2026-06-25T09:02:00+03:00',
    tripIds: ['TRP-9012', 'TRP-7735'],
    paymentIds: ['PAY-W820'],
    complaintIds: [],
  },
  {
    id: 'DRV-0103',
    name: 'Khalid Mansour',
    phone: '+966 53 003 0303',
    email: 'khalid.mansour21@gmail.com',
    rating: 4.4,
    tier: 'silver',
    /* One open complaint (CMP-301) → `Under review` under `renderDriversTable` (`:6394`). */
    status: 'under-review',
    vehicle: 'Yaris 2021 · Black',
    vehicleClass: 'Economy',
    joinedAt: '2025-08-01',
    hasPhoto: true,
    gender: 'Male',
    city: 'Riyadh',
    address: 'Al Malaz District, Riyadh',
    device: 'Xiaomi 13 · Android 14',
    appLanguage: 'Arabic',
    lastIp: '46.31.20.18',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'Riyad Bank',
      iban: 'SA77 2000 0000 0123 4567 8901',
      holder: 'Khalid Mansour',
      status: 'Verified',
    },
    bankHistory: [],
    movementLog: [
      { at: '2025-08-01', action: 'Account registered', location: 'Riyadh, SA' },
      { at: '2026-06-24', action: 'Complaint received', location: 'Riyadh, SA' },
    ],
    /* Legacy seeds `activeSubs: '6/6'` — over the ops limit of 5 (`:2591`), with
       no `multiSubException`. An inconsistency in the seed data, preserved
       because the Captains screen has to render it either way. */
    activeSubscriptions: 6,
    maxSubscriptions: 6,
    multiSubException: false,
    suspended: false,
    suspensionReason: null,
    planAccess: 'granted',
    planFrozenUntil: null,
    flaggedForDeclines: false,
    manualFlag: false,
    openComplaints: 1,
    totalTrips: 286,
    monthEarningsHalalas: 215_000,
    onTimePercent: 88,
    openSubscriptionSlots: 0,
    lastTripAt: '2026-06-25T07:45:00+03:00',
    tripIds: ['TRP-7738', 'TRP-7742'],
    paymentIds: [],
    complaintIds: ['CMP-301'],
  },
  {
    id: 'DRV-0104',
    name: 'Hassan Al-Ghamdi',
    phone: '+966 53 004 0404',
    email: 'hassan.ghamdi@gmail.com',
    rating: 4.8,
    tier: 'gold',
    status: 'active',
    vehicle: 'Sonata 2023 · Grey',
    vehicleClass: 'Comfort',
    joinedAt: '2025-03-01',
    hasPhoto: true,
    gender: 'Male',
    city: 'Riyadh',
    address: 'Al Wurud District, Riyadh',
    device: 'iPhone 15 · iOS 17.5',
    appLanguage: 'Arabic',
    lastIp: '92.96.18.92',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'Bank Albilad',
      iban: 'SA55 1500 0000 0987 6543 2100',
      holder: 'Hassan Al-Ghamdi',
      status: 'Verified',
    },
    /* The one seeded bank change (`:2653`). The only row that exercises the history card. */
    bankHistory: [
      {
        bankName: 'Riyad Bank',
        iban: 'SA21 2000 0000 0011 2233 4400',
        holder: 'Hassan Al-Ghamdi',
        status: 'Verified',
        replacedAt: '2026-03-10',
        reason: 'Driver requested change',
      },
    ],
    movementLog: [{ at: '2025-03-01', action: 'Account registered', location: 'Riyadh, SA' }],
    activeSubscriptions: 5,
    maxSubscriptions: 5,
    multiSubException: false,
    suspended: false,
    suspensionReason: null,
    planAccess: 'granted',
    planFrozenUntil: null,
    flaggedForDeclines: false,
    manualFlag: false,
    openComplaints: 0,
    totalTrips: 524,
    monthEarningsHalalas: 410_000,
    onTimePercent: 98,
    openSubscriptionSlots: 0,
    lastTripAt: '2026-06-25T08:41:00+03:00',
    tripIds: ['TRP-9008'],
    paymentIds: ['PAY-W900'],
    complaintIds: [],
  },
  {
    id: 'DRV-0105',
    name: 'Youssef Nouri',
    phone: '+966 53 005 0505',
    email: 'youssef.nouri@hotmail.com',
    rating: 4.2,
    tier: 'standard',
    status: 'under-review',
    vehicle: 'Sunny 2020 · White',
    vehicleClass: 'Economy',
    joinedAt: '2025-10-01',
    hasPhoto: false,
    gender: 'Male',
    city: 'Riyadh',
    address: 'Al Aqiq District, Riyadh',
    device: 'Huawei Nova 11 · HarmonyOS 4',
    appLanguage: 'Arabic',
    lastIp: '160.156.9.4',
    ipLocation: 'Riyadh, SA',
    /* The one unverified bank account. Blocks payout — a real, reachable state. */
    bank: {
      bankName: 'STC Pay',
      iban: 'SA20 6000 0000 0011 2233 4455',
      holder: 'Youssef Nouri',
      status: 'Pending verification',
    },
    bankHistory: [],
    movementLog: [
      { at: '2025-10-01', action: 'Account registered', location: 'Riyadh, SA' },
      { at: '2026-06-25', action: 'No-show flagged', location: 'Riyadh, SA' },
    ],
    activeSubscriptions: 0,
    maxSubscriptions: 3,
    multiSubException: false,
    suspended: false,
    suspensionReason: null,
    planAccess: 'granted',
    planFrozenUntil: null,
    flaggedForDeclines: true,
    manualFlag: false,
    openComplaints: 1,
    totalTrips: 45,
    monthEarningsHalalas: 52_000,
    onTimePercent: 84,
    openSubscriptionSlots: 3,
    lastTripAt: '2026-06-25T07:55:00+03:00',
    tripIds: ['TRP-9003'],
    paymentIds: [],
    complaintIds: ['CMP-318'],
  },
  {
    id: 'DRV-0106',
    name: 'Reem Al-Otaibi',
    phone: '+966 54 220 6631',
    email: 'reem.otaibi@gmail.com',
    rating: 4.7,
    tier: 'gold',
    status: 'active',
    vehicle: 'Corolla 2023 · Silver',
    vehicleClass: 'Economy',
    joinedAt: '2026-01-01',
    hasPhoto: true,
    gender: 'Female',
    city: 'Riyadh',
    address: 'King Fahd District, Riyadh',
    device: 'iPhone 15 · iOS 17.5',
    appLanguage: 'Arabic',
    lastIp: '92.96.14.208',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'Al Rajhi Bank',
      iban: 'SA44 8000 0000 0033 4455 6677',
      holder: 'Reem Al-Otaibi',
      status: 'Verified',
    },
    bankHistory: [],
    movementLog: [{ at: '2026-01-01', action: 'Account registered', location: 'Riyadh, SA' }],
    activeSubscriptions: 0,
    maxSubscriptions: 2,
    multiSubException: false,
    suspended: false,
    suspensionReason: null,
    planAccess: 'granted',
    planFrozenUntil: null,
    flaggedForDeclines: false,
    manualFlag: false,
    openComplaints: 0,
    totalTrips: 145,
    monthEarningsHalalas: 218_000,
    onTimePercent: 97,
    openSubscriptionSlots: 2,
    /**
     * 145 lifetime trips and **no trip ids** — the seeded contradiction at
     * `:2671`. Preserved: the profile's trips card must handle a captain whose
     * history is not loadable, and today it renders an empty card with a
     * non-zero counter above it.
     *
     * **`lastTripAt` is not part of that contradiction and no longer shares in
     * it.** Legacy has no such field — there is no `lastTrip` anywhere in
     * `DB.drivers` (`:2633`–`:2673`) — so it is ours, and `types/driver.ts`
     * defines `null` as *"has never driven"*. A row saying 145 trips and never
     * driven is not a preserved legacy defect, it is this layer contradicting
     * its own field definition, and it makes `lastTripAt`-based sorting and
     * date filtering silently wrong for the row. The value below is the
     * captain's last recorded activity; the empty `tripIds` stays exactly as
     * it was.
     */
    lastTripAt: '2026-06-22T17:35:00+03:00',
    tripIds: [],
    paymentIds: [],
    complaintIds: [],
  },

  /* ── added rows: states the seeded six cannot reach ─────────────────── */
  {
    id: 'DRV-0201',
    /* 61 characters. Full Arabic naming convention — given name, patronymic
       chain, tribal name. This is what a real Saudi legal name looks like and
       it will not fit a 180 px name column at 1280 px. */
    name: 'عبد الرحمن بن محمد بن عبد الله آل عبد الله القحطاني الدوسري',
    phone: '+966 55 401 9922',
    email: 'a.alqahtani.aldosari.riyadh.operations@example-domain-that-is-long.com',
    rating: 4.6,
    tier: 'gold',
    status: 'active',
    vehicle: 'Hyundai Azera 2024 · Pearl White Metallic',
    vehicleClass: 'Comfort',
    joinedAt: '2024-11-01',
    hasPhoto: false,
    gender: 'Male',
    city: 'Riyadh',
    address: 'حي الملقا، طريق الأمير محمد بن سلمان بن عبد العزيز، الرياض',
    device: 'Samsung Galaxy S24 Ultra · Android 14',
    appLanguage: 'Arabic',
    lastIp: '92.96.120.14',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'مصرف الراجحي',
      iban: 'SA44 8000 0000 1122 3344 5566',
      holder: 'عبد الرحمن بن محمد بن عبد الله آل عبد الله القحطاني الدوسري',
      status: 'Verified',
    },
    bankHistory: [],
    movementLog: [{ at: '2024-11-01', action: 'Account registered', location: 'Riyadh, SA' }],
    activeSubscriptions: 5,
    maxSubscriptions: 5,
    multiSubException: false,
    suspended: false,
    suspensionReason: null,
    planAccess: 'granted',
    planFrozenUntil: null,
    flaggedForDeclines: false,
    manualFlag: false,
    openComplaints: 0,
    totalTrips: 1_284,
    monthEarningsHalalas: 1_240_050,
    onTimePercent: 99,
    openSubscriptionSlots: 0,
    lastTripAt: '2026-06-25T06:40:00+03:00',
    tripIds: [],
    paymentIds: [],
    complaintIds: [],
  },
  {
    id: 'DRV-0202',
    name: 'Majed Al-Shamrani',
    phone: '+966 50 778 3311',
    email: null,
    rating: 2.9,
    tier: 'standard',
    /* Suspended. Note the tone: `neutral` badge plus the §8.4 row marker —
       **not** a red badge. R5a permits red in four places and a badge is not
       one of them. */
    status: 'suspended',
    vehicle: 'Accent 2019 · Silver',
    vehicleClass: 'Economy',
    joinedAt: '2025-04-01',
    hasPhoto: false,
    gender: 'Male',
    city: 'Riyadh',
    address: 'Al Shifa District, Riyadh',
    device: 'Redmi Note 12 · Android 13',
    appLanguage: 'Arabic',
    lastIp: '46.31.99.201',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'Riyad Bank',
      iban: 'SA77 2000 0000 5544 3322 1100',
      holder: 'Majed Al-Shamrani',
      status: 'Verified',
    },
    bankHistory: [],
    movementLog: [
      { at: '2025-04-01', action: 'Account registered', location: 'Riyadh, SA' },
      { at: '2026-06-18', action: 'Suspended — expired operating card', location: 'Riyadh, SA' },
    ],
    activeSubscriptions: 0,
    maxSubscriptions: 5,
    multiSubException: false,
    suspended: true,
    suspensionReason: 'Transport authority operating card expired 7 days ago',
    planAccess: 'terminated',
    planFrozenUntil: null,
    flaggedForDeclines: false,
    manualFlag: true,
    openComplaints: 2,
    totalTrips: 88,
    monthEarningsHalalas: 0,
    onTimePercent: 71,
    openSubscriptionSlots: 0,
    lastTripAt: '2026-06-18T14:20:00+03:00',
    /* The leg `INC-019` is about, and the one `lastTripAt` names. It was an
       empty array beside a non-null timestamp until `TRP-9108` was given a
       record. */
    tripIds: ['TRP-9108'],
    paymentIds: [],
    /* Filed against this account and held by `fixtures/complaints.ts`. The id list
       was empty beside a non-zero count until that collection existed. */
    complaintIds: ['CMP-343', 'CMP-344'],
  },
  {
    id: 'DRV-0203',
    name: 'Faisal Al-Amri',
    phone: '+966 56 100 4040',
    email: 'faisal.amri@example.com',
    /* Approved yesterday, never driven. Every stat is zero and every related
       collection is empty — the "captain with no trips" case the profile's
       eight cards each have to render an empty state for. */
    rating: null,
    tier: 'standard',
    status: 'active',
    vehicle: 'Elantra 2024 · Blue',
    vehicleClass: 'Economy',
    joinedAt: '2026-06-24',
    hasPhoto: true,
    gender: 'Male',
    city: 'Riyadh',
    address: 'Al Narjis District, Riyadh',
    device: 'iPhone 13 · iOS 17.2',
    appLanguage: 'Arabic',
    lastIp: '92.96.41.9',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'Al Rajhi Bank',
      iban: 'SA44 8000 0000 9988 7766 5544',
      holder: 'Faisal Al-Amri',
      status: 'Verified',
    },
    bankHistory: [],
    movementLog: [{ at: '2026-06-24', action: 'Application approved', location: 'Riyadh, SA' }],
    activeSubscriptions: 0,
    maxSubscriptions: 5,
    multiSubException: false,
    suspended: false,
    suspensionReason: null,
    planAccess: 'granted',
    planFrozenUntil: null,
    flaggedForDeclines: false,
    manualFlag: false,
    openComplaints: 0,
    totalTrips: 0,
    monthEarningsHalalas: 0,
    onTimePercent: null,
    openSubscriptionSlots: 5,
    lastTripAt: null,
    tripIds: [],
    paymentIds: [],
    complaintIds: [],
  },
  {
    id: 'DRV-0204',
    name: 'Turki Al-Mutairi',
    phone: '+966 53 909 1177',
    email: 'turki.mutairi@example.com',
    /* Below 3.5 — the `limited` tier bucket `renderDriversTable` computes
       (`:6350`) but that no `lvl` value expresses. Tier stays `standard`;
       the limitation is a rating threshold, not a tier. */
    rating: 3.1,
    tier: 'standard',
    status: 'under-review',
    vehicle: 'Sunny 2021 · White',
    vehicleClass: 'Economy',
    joinedAt: '2025-09-01',
    hasPhoto: false,
    gender: 'Male',
    city: 'Riyadh',
    address: 'Al Suwaidi District, Riyadh',
    device: 'Oppo A78 · Android 13',
    appLanguage: 'Arabic',
    lastIp: '160.156.44.7',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'STC Pay',
      iban: 'SA20 6000 0000 7788 9900 1122',
      holder: 'Turki Al-Mutairi',
      status: 'Rejected',
    },
    bankHistory: [],
    movementLog: [{ at: '2025-09-01', action: 'Account registered', location: 'Riyadh, SA' }],
    activeSubscriptions: 1,
    maxSubscriptions: 3,
    multiSubException: false,
    suspended: false,
    suspensionReason: null,
    planAccess: 'granted',
    planFrozenUntil: null,
    flaggedForDeclines: true,
    manualFlag: true,
    openComplaints: 3,
    totalTrips: 132,
    monthEarningsHalalas: 98_750,
    onTimePercent: 62,
    openSubscriptionSlots: 2,
    lastTripAt: '2026-06-23T18:10:00+03:00',
    tripIds: [],
    paymentIds: [],
    /* Filed against this account and held by `fixtures/complaints.ts`. The id list
       was empty beside a non-zero count until that collection existed. */
    complaintIds: ['CMP-350', 'CMP-351', 'CMP-352'],
  },
  {
    id: 'DRV-0205',
    name: 'Nawaf Al-Juhani',
    phone: '+966 55 020 6060',
    email: null,
    rating: null,
    tier: 'standard',
    status: 'pending',
    vehicle: 'Yaris 2022 · Grey',
    vehicleClass: 'Economy',
    joinedAt: '2026-06-20',
    hasPhoto: false,
    gender: 'Male',
    city: 'Jeddah',
    address: 'Al Rawdah District, Jeddah',
    device: 'Samsung Galaxy A34 · Android 13',
    appLanguage: 'Arabic',
    lastIp: '188.55.12.6',
    /* IP location disagrees with the stated city — the fraud signal Risk &
       Signals reads, and the one row that makes it visible. */
    ipLocation: 'Dubai, AE',
    bank: {
      bankName: 'Bank Albilad',
      iban: 'SA55 1500 0000 3344 5566 7788',
      holder: 'Nawaf Al-Juhani',
      status: 'Pending verification',
    },
    bankHistory: [],
    movementLog: [{ at: '2026-06-20', action: 'Account registered', location: 'Jeddah, SA' }],
    activeSubscriptions: 0,
    maxSubscriptions: 5,
    multiSubException: false,
    suspended: false,
    suspensionReason: null,
    planAccess: 'terminated',
    planFrozenUntil: null,
    flaggedForDeclines: false,
    manualFlag: false,
    openComplaints: 0,
    totalTrips: 0,
    monthEarningsHalalas: 0,
    onTimePercent: null,
    openSubscriptionSlots: 0,
    lastTripAt: null,
    tripIds: [],
    paymentIds: [],
    complaintIds: [],
  },
  {
    id: 'DRV-0206',
    /* A non-Arabic name with diacritics, sitting in the same column as
       DRV-0201's 61 Arabic characters. Bidirectional text in one table is the
       normal case in Riyadh, not an edge case. */
    name: 'Ibrahim Diarra Coulibaly',
    phone: '+966 59 313 8080',
    email: 'i.coulibaly@example.com',
    rating: 4.85,
    tier: 'gold',
    status: 'active',
    vehicle: 'Camry 2024 · Black',
    vehicleClass: 'Comfort',
    joinedAt: '2025-01-01',
    hasPhoto: true,
    gender: 'Male',
    city: 'Riyadh',
    address: 'Al Sahafa District, Riyadh',
    device: 'Pixel 8 Pro · Android 14',
    appLanguage: 'English',
    lastIp: '37.36.140.22',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'SNB (Al Ahli)',
      iban: 'SA03 1000 0000 2233 4455 6677',
      holder: 'Ibrahim Diarra Coulibaly',
      status: 'Verified',
    },
    bankHistory: [],
    movementLog: [{ at: '2025-01-01', action: 'Account registered', location: 'Riyadh, SA' }],
    activeSubscriptions: 2,
    maxSubscriptions: 5,
    multiSubException: false,
    suspended: false,
    suspensionReason: null,
    planAccess: 'granted',
    planFrozenUntil: null,
    flaggedForDeclines: false,
    manualFlag: false,
    openComplaints: 0,
    totalTrips: 967,
    monthEarningsHalalas: 512_300,
    onTimePercent: 95,
    openSubscriptionSlots: 3,
    lastTripAt: '2026-06-25T08:05:00+03:00',
    tripIds: [],
    paymentIds: [],
    complaintIds: [],
  },
  {
    id: 'DRV-0207',
    name: 'Saud Al-Harbi',
    phone: '+966 50 660 2020',
    email: 'saud.harbi@example.com',
    rating: 4.3,
    tier: 'silver',
    status: 'active',
    vehicle: 'Sonata 2022 · White',
    vehicleClass: 'Comfort',
    joinedAt: '2025-07-01',
    hasPhoto: false,
    gender: 'Male',
    city: 'Riyadh',
    address: 'Al Yasmin District, Riyadh',
    device: 'iPhone 12 · iOS 16.7',
    appLanguage: 'Arabic',
    lastIp: '92.96.66.3',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'Riyad Bank',
      iban: 'SA77 2000 0000 6655 4433 2211',
      holder: 'Saud Al-Harbi',
      status: 'Verified',
    },
    bankHistory: [],
    movementLog: [{ at: '2025-07-01', action: 'Account registered', location: 'Riyadh, SA' }],
    activeSubscriptions: 0,
    maxSubscriptions: 5,
    multiSubException: false,
    suspended: false,
    suspensionReason: null,
    /* Plan access frozen with an end date in the future — a state legacy can
       write (`planFreezeUntilMs`) and never seeds, so no screen has rendered it. */
    planAccess: 'frozen',
    planFrozenUntil: offsetFromNow({ days: 9 }),
    flaggedForDeclines: false,
    manualFlag: false,
    openComplaints: 0,
    totalTrips: 203,
    monthEarningsHalalas: 141_200,
    onTimePercent: 89,
    openSubscriptionSlots: 0,
    lastTripAt: '2026-06-14T11:30:00+03:00',
    tripIds: [],
    paymentIds: [],
    complaintIds: [],
  },
]

/**
 * Volume rows, so the index table has more than one page and the sort/filter/
 * page controls are exercised.
 *
 * **Deterministic by construction** — every value is a pure function of the
 * index. No `Math.random()`, no clock. Run it twice and get the same 44 rows in
 * the same order, which is what makes a Playwright snapshot diffable.
 *
 * Kept separate from the literals above so nobody has to read a generator to
 * hand-edit an interesting row.
 */
/**
 * **One list of whole names, not two lists cycled apart.**
 *
 * This was a given-name list of four cycled against a family-name list of
 * eleven. Nothing on a captain row contradicted itself as a result — the id is
 * generated per index and the email and bank holder are both derived from the
 * same two locals — but it is the identical pattern that put the wrong
 * `driverName` on 80 filler trips, and leaving it here is leaving the pattern
 * in the codebase as an example to copy. The 44 pairs below are exactly the 44
 * the two cycles produced, written out: boring, greppable, and hand-editable
 * when somebody needs to reproduce a bug on one row.
 */
const FILLER_CAPTAIN_NAMES: ReadonlyArray<{ given: string; family: string }> = [
  { given: 'Fahad', family: 'Al-Zahrani' },
  { given: 'Bandar', family: 'Al-Otaibi' },
  { given: 'Sultan', family: 'Al-Ghamdi' },
  { given: 'Meshal', family: 'Al-Shehri' },
  { given: 'Fahad', family: 'Al-Qahtani' },
  { given: 'Bandar', family: 'Al-Dosari' },
  { given: 'Sultan', family: 'Al-Harbi' },
  { given: 'Meshal', family: 'Al-Mutairi' },
  { given: 'Fahad', family: 'Al-Subaie' },
  { given: 'Bandar', family: 'Al-Balawi' },
  { given: 'Sultan', family: 'Al-Anazi' },
  { given: 'Meshal', family: 'Al-Zahrani' },
  { given: 'Fahad', family: 'Al-Otaibi' },
  { given: 'Bandar', family: 'Al-Ghamdi' },
  { given: 'Sultan', family: 'Al-Shehri' },
  { given: 'Meshal', family: 'Al-Qahtani' },
  { given: 'Fahad', family: 'Al-Dosari' },
  { given: 'Bandar', family: 'Al-Harbi' },
  { given: 'Sultan', family: 'Al-Mutairi' },
  { given: 'Meshal', family: 'Al-Subaie' },
  { given: 'Fahad', family: 'Al-Balawi' },
  { given: 'Bandar', family: 'Al-Anazi' },
  { given: 'Sultan', family: 'Al-Zahrani' },
  { given: 'Meshal', family: 'Al-Otaibi' },
  { given: 'Fahad', family: 'Al-Ghamdi' },
  { given: 'Bandar', family: 'Al-Shehri' },
  { given: 'Sultan', family: 'Al-Qahtani' },
  { given: 'Meshal', family: 'Al-Dosari' },
  { given: 'Fahad', family: 'Al-Harbi' },
  { given: 'Bandar', family: 'Al-Mutairi' },
  { given: 'Sultan', family: 'Al-Subaie' },
  { given: 'Meshal', family: 'Al-Balawi' },
  { given: 'Fahad', family: 'Al-Anazi' },
  { given: 'Bandar', family: 'Al-Zahrani' },
  { given: 'Sultan', family: 'Al-Otaibi' },
  { given: 'Meshal', family: 'Al-Ghamdi' },
  { given: 'Fahad', family: 'Al-Shehri' },
  { given: 'Bandar', family: 'Al-Qahtani' },
  { given: 'Sultan', family: 'Al-Dosari' },
  { given: 'Meshal', family: 'Al-Harbi' },
  { given: 'Fahad', family: 'Al-Mutairi' },
  { given: 'Bandar', family: 'Al-Subaie' },
  { given: 'Sultan', family: 'Al-Balawi' },
  { given: 'Meshal', family: 'Al-Anazi' },
]

/**
 * **The home city of each filler captain, and the reason this list exists.**
 *
 * Every filler captain used to be `city: 'Riyadh'`, which made `City` a dead
 * column on `/operations/people`: **one distinct value across 25 visible rows,
 * 128px of table width carrying nothing** (`docs/audit/PAGE-SWEEP.md` §2 S8).
 * A column that can only say one thing is a column nobody reads, and it is a
 * fixture fault rather than a table fault.
 *
 * **A city on a captain is not a zone.** `fixtures/zones.ts` stays all-Riyadh
 * on purpose — R4-6b §6.6.5 keeps that as **L-6**'s evidence — and nothing
 * here contradicts it: a captain registers a home city whether or not we track
 * a zone in it, and `DB.cities` (`:13946`) already names four. The weighting is
 * Riyadh-first because the service is: **19 of 44 Riyadh**, a real Jeddah
 * cluster, and a thin tail through the Eastern Province, the Hejaz and the
 * north.
 *
 * It is also what makes `management.zones.unservedDemandCities` a measurement
 * rather than a zero. That tile counts riders in cities where we have supply
 * signal and no service; with one city in the fixture it could only ever read
 * `0`, and it did.
 *
 * Twenty-four entries, cycled over forty-four rows — deterministic, and
 * hand-editable one row at a time.
 */
const FILLER_CAPTAIN_CITIES = [
  'Riyadh',
  'Jeddah',
  'Riyadh',
  'Dammam',
  'Riyadh',
  'Makkah',
  'Jeddah',
  'Riyadh',
  'Al Khobar',
  'Riyadh',
  'Madinah',
  'Jeddah',
  'Riyadh',
  'Abha',
  'Dammam',
  'Riyadh',
  'Taif',
  'Jeddah',
  'Riyadh',
  'Buraydah',
  'Riyadh',
  'Jeddah',
  'Tabuk',
  'Riyadh',
] as const

/**
 * A district that exists in that city, so the address, the IP location and the
 * movement log agree with the `city` beside them. A Riyadh district on a
 * Jeddah captain is the kind of detail an operator spots immediately and the
 * kind a generated fixture gets wrong.
 */
const CITY_DISTRICTS: Record<string, string> = {
  Riyadh: 'Al Malaz',
  Jeddah: 'Al Salamah',
  Dammam: 'Al Faisaliyah',
  Makkah: 'Al Aziziyah',
  'Al Khobar': 'Al Ulaya',
  Madinah: 'Qurban',
  Abha: 'Al Sadd',
  Taif: 'Al Shafa',
  Buraydah: 'Al Rayyan',
  Tabuk: 'Al Rawdah',
}

export const fillerDrivers: Driver[] = Array.from({ length: 44 }, (_, i) => {
  const n = i + 1
  const { given, family } = cycle(FILLER_CAPTAIN_NAMES, i)
  const city = cycle(FILLER_CAPTAIN_CITIES, i)
  const district = CITY_DISTRICTS[city] ?? city
  const id = `DRV-${String(300 + n).padStart(4, '0')}`
  const comfort = i % 3 === 0
  return {
    id,
    name: `${given} ${family}`,
    phone: `+966 5${i % 10} ${String(100 + n).padStart(3, '0')} ${String(1000 + n * 7).slice(-4)}`,
    email: i % 4 === 0 ? null : `${given.toLowerCase()}.${family.toLowerCase().replace('al-', '')}@example.com`,
    rating: Number((3.6 + ((i * 7) % 14) / 10).toFixed(1)),
    tier: i % 5 === 0 ? 'gold' : i % 2 === 0 ? 'silver' : 'standard',
    status: 'active',
    vehicle: comfort ? 'Camry 2022 · Silver' : 'Corolla 2021 · White',
    vehicleClass: comfort ? 'Comfort' : 'Economy',
    joinedAt: `2025-${String((i % 12) + 1).padStart(2, '0')}-01`,
    hasPhoto: i % 2 === 0,
    gender: i % 9 === 0 ? 'Female' : 'Male',
    city,
    address: `${district} District, ${city}`,
    device: comfort ? 'iPhone 14 · iOS 17.4' : 'Samsung Galaxy A54 · Android 13',
    appLanguage: i % 6 === 0 ? 'English' : 'Arabic',
    lastIp: `92.96.${i % 200}.${(i * 3) % 250}`,
    ipLocation: `${city}, SA`,
    bank: {
      bankName: 'Al Rajhi Bank',
      iban: `SA44 8000 0000 ${String(1000 + n)} ${String(2000 + n)} ${String(3000 + n)}`,
      holder: `${given} ${family}`,
      status: 'Verified',
    },
    bankHistory: [],
    movementLog: [
      {
        at: `2025-${String((i % 12) + 1).padStart(2, '0')}-01`,
        action: 'Account registered',
        location: `${city}, SA`,
      },
    ],
    activeSubscriptions: i % 6,
    maxSubscriptions: 5,
    multiSubException: false,
    suspended: false,
    suspensionReason: null,
    planAccess: 'granted',
    planFrozenUntil: null,
    flaggedForDeclines: false,
    manualFlag: false,
    openComplaints: 0,
    totalTrips: 40 + i * 13,
    monthEarningsHalalas: 60_000 + i * 4_150,
    onTimePercent: 80 + (i % 20),
    openSubscriptionSlots: Math.max(0, 5 - (i % 6)),
    lastTripAt: offsetFromNow({ days: -(i % 30), hours: -(i % 12) }),
    tripIds: [],
    paymentIds: [],
    complaintIds: [],
  } satisfies Driver
})

/** What the client serves: the interesting rows first, then the volume. 57 in total. */
export const allDriverFixtures: Driver[] = [...driverFixtures, ...fillerDrivers]
