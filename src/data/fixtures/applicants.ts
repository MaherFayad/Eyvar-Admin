/**
 * Captain applications — legacy `DB.pendingDrivers`
 * (`eyvar_ops_panel_v40_fixed.html:2712`–`:2743`), five rows, plus the states
 * the five cannot reach.
 *
 * All five legacy rows are `status: 'pending'` with `acceptedTrips: 0` and
 * `cancelledTrips: 0`, so approved, rejected, claimed and SLA-breached have all
 * never been rendered. APP-2206…2209 fix that.
 *
 * Doc statuses become an enum: legacy stores `'✓ Verified'` / `'⏳ Pending'`
 * (`:2717`), an emoji inside a data field.
 */

import { offsetFromNow } from '../mock/clock'
import { claimFixtures } from './claims'
import { cycle, cycleRecord } from './cycle'
import { fillerDrivers } from './drivers'
import type { Applicant } from '../types/applicant'

/** 48 h from submission. **Not in the legacy data** — the work-queue pattern needs one; the window is product-owner's. */
const SLA_HOURS = 48

function sla(appliedAt: string): string {
  return new Date(Date.parse(appliedAt) + SLA_HOURS * 3_600_000).toISOString()
}

const namedApplicants: Applicant[] = [
  {
    id: 'APP-2201',
    name: 'Saad Al-Quraishi',
    phone: '+966 58 010 2030',
    email: null,
    vehicle: 'Elantra 2024 · Blue',
    plate: 'ABC 4521',
    vehicleClass: 'Economy',
    status: 'in-review',
    appliedAt: '2026-06-24T10:15:00+03:00',
    slaStartedAt: '2026-06-24T10:15:00+03:00',
    slaDueAt: sla('2026-06-24T10:15:00+03:00'),
    slaTargetMinutes: SLA_HOURS * 60,
    slaBreachedAt: null,
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
    dateOfBirth: '1994-03-14',
    nationalId: '1098234567',
    address: 'Al Olaya District, Riyadh',
    city: 'Riyadh',
    gender: 'Male',
    hasPhoto: true,
    device: 'iPhone 13 · iOS 17.2',
    appLanguage: 'Arabic',
    lastIp: '92.96.41.9',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'Al Rajhi Bank',
      iban: 'SA44 8000 0000 6080 1016 7519',
      holder: 'Saad Al-Quraishi',
      status: 'Verified',
    },
    docs: [
      { type: 'license', status: 'verified', expiresOn: '2028-01-20' },
      { type: 'id_card', status: 'verified', expiresOn: null },
      { type: 'vehicle_reg', status: 'verified', expiresOn: '2027-05-11' },
      /* Background check pending — the one blocker on an otherwise clean file. */
      { type: 'background', status: 'pending', expiresOn: null },
      { type: 'insurance', status: 'verified', expiresOn: '2026-12-01' },
    ],
    movementLog: [{ at: '2026-06-24', action: 'Application submitted', location: 'Riyadh, SA' }],
    acceptedTrips: 0,
    cancelledTrips: 0,
    /* Claimed by me. Release / work-it affordance. */
    claim: claimFixtures.find((c) => c.entityId === 'APP-2201') ?? null,
    approvedDriverId: null,
    rejectionReason: null,
    decidedAt: null,
    decidedByUserId: null,
  },
  {
    id: 'APP-2202',
    name: 'Mona Al-Tamimi',
    phone: '+966 59 445 6677',
    email: null,
    vehicle: 'Tucson 2023 · White',
    plate: 'KLM 7790',
    vehicleClass: 'Comfort',
    status: 'pending',
    appliedAt: '2026-06-25T08:40:00+03:00',
    slaStartedAt: '2026-06-25T08:40:00+03:00',
    slaDueAt: sla('2026-06-25T08:40:00+03:00'),
    slaTargetMinutes: SLA_HOURS * 60,
    slaBreachedAt: null,
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
    dateOfBirth: '1991-09-02',
    nationalId: '1087345210',
    address: 'Al Nuzha District, Riyadh',
    city: 'Riyadh',
    gender: 'Female',
    hasPhoto: false,
    device: 'Samsung Galaxy S23 · Android 14',
    appLanguage: 'Arabic',
    lastIp: '185.45.22.61',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'SNB (Al Ahli)',
      iban: 'SA03 1000 0000 0654 3219 8765',
      holder: 'Mona Al-Tamimi',
      status: 'Verified',
    },
    docs: [
      { type: 'license', status: 'verified', expiresOn: '2027-11-30' },
      { type: 'id_card', status: 'verified', expiresOn: null },
      { type: 'vehicle_reg', status: 'pending', expiresOn: null },
      { type: 'background', status: 'verified', expiresOn: null },
      { type: 'insurance', status: 'verified', expiresOn: '2027-02-14' },
    ],
    movementLog: [{ at: '2026-06-25', action: 'Application submitted', location: 'Riyadh, SA' }],
    acceptedTrips: 0,
    cancelledTrips: 0,
    claim: null,
    approvedDriverId: null,
    rejectionReason: null,
    decidedAt: null,
    decidedByUserId: null,
  },
  {
    id: 'APP-2203',
    name: 'Fares Al-Subaie',
    phone: '+966 50 998 1122',
    email: null,
    vehicle: 'Accent 2021 · Grey',
    plate: 'XYZ 1102',
    vehicleClass: 'Economy',
    /* Approved yesterday — became DRV-0203 (Faisal Al-Amri is a different row;
       this one links to a driver record that exists). */
    status: 'approved',
    appliedAt: '2026-06-23T09:00:00+03:00',
    slaStartedAt: '2026-06-23T09:00:00+03:00',
    slaDueAt: sla('2026-06-23T09:00:00+03:00'),
    slaTargetMinutes: SLA_HOURS * 60,
    slaBreachedAt: null,
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
    dateOfBirth: '1996-11-27',
    nationalId: '1102456781',
    address: 'Al Malaz District, Riyadh',
    city: 'Riyadh',
    gender: 'Male',
    hasPhoto: true,
    device: 'OnePlus 12 · Android 14',
    appLanguage: 'Arabic',
    lastIp: '46.31.55.3',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'Riyad Bank',
      iban: 'SA77 2000 0000 0123 4567 8901',
      holder: 'Fares Al-Subaie',
      status: 'Pending verification',
    },
    docs: [
      { type: 'license', status: 'verified', expiresOn: '2029-04-02' },
      { type: 'id_card', status: 'verified', expiresOn: null },
      { type: 'vehicle_reg', status: 'verified', expiresOn: '2027-08-19' },
      { type: 'background', status: 'verified', expiresOn: null },
      { type: 'insurance', status: 'verified', expiresOn: '2027-01-05' },
    ],
    movementLog: [{ at: '2026-06-23', action: 'Application submitted', location: 'Riyadh, SA' }],
    acceptedTrips: 0,
    cancelledTrips: 0,
    claim: claimFixtures.find((c) => c.entityId === 'APP-2203') ?? null,
    approvedDriverId: 'DRV-0203',
    rejectionReason: null,
    decidedAt: '2026-06-24T11:20:00+03:00',
    decidedByUserId: 'USR-5',
  },
  {
    id: 'APP-2204',
    name: 'Naif Al-Dawsari',
    phone: '+966 55 230 8841',
    email: null,
    vehicle: 'Sonata 2022 · Black',
    plate: 'QRS 3387',
    vehicleClass: 'Comfort',
    status: 'in-review',
    /* Submitted 3 days ago against a 48 h SLA — **breached**. This is the row
       that needs the §8.4 row-level critical marker (R5a's one sanctioned
       exception), not a red badge. */
    appliedAt: '2026-06-22T13:05:00+03:00',
    slaStartedAt: '2026-06-22T13:05:00+03:00',
    slaDueAt: sla('2026-06-22T13:05:00+03:00'),
    slaTargetMinutes: SLA_HOURS * 60,
    slaBreachedAt: sla('2026-06-22T13:05:00+03:00'),
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
    dateOfBirth: '1989-01-19',
    nationalId: '1075123498',
    address: 'Al Wurud District, Riyadh',
    city: 'Riyadh',
    gender: 'Male',
    hasPhoto: false,
    device: 'iPhone 12 · iOS 16.7',
    appLanguage: 'Arabic',
    lastIp: '92.96.60.18',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'Bank Albilad',
      iban: 'SA55 1500 0000 0987 6543 2100',
      holder: 'Naif Al-Dawsari',
      status: 'Verified',
    },
    docs: [
      { type: 'license', status: 'verified', expiresOn: '2027-06-30' },
      { type: 'id_card', status: 'pending', expiresOn: null },
      { type: 'vehicle_reg', status: 'verified', expiresOn: '2026-09-14' },
      { type: 'background', status: 'verified', expiresOn: null },
      { type: 'insurance', status: 'pending', expiresOn: null },
    ],
    movementLog: [{ at: '2026-06-22', action: 'Application submitted', location: 'Riyadh, SA' }],
    acceptedTrips: 0,
    cancelledTrips: 0,
    /* **Claimed by another operator** (USR-5). Every action on this row is a
       take-over, and the design has to say so. */
    claim: claimFixtures.find((c) => c.entityId === 'APP-2204') ?? null,
    approvedDriverId: null,
    rejectionReason: null,
    decidedAt: null,
    decidedByUserId: null,
  },
  {
    id: 'APP-2205',
    name: 'Rakan Al-Otaibi',
    phone: '+966 56 771 2290',
    email: null,
    vehicle: 'Yaris 2023 · Silver',
    plate: 'TUV 5512',
    vehicleClass: 'Economy',
    status: 'pending',
    appliedAt: '2026-06-21T16:30:00+03:00',
    slaStartedAt: '2026-06-21T16:30:00+03:00',
    slaDueAt: sla('2026-06-21T16:30:00+03:00'),
    slaTargetMinutes: SLA_HOURS * 60,
    slaBreachedAt: sla('2026-06-21T16:30:00+03:00'),
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
    dateOfBirth: '1998-07-05',
    nationalId: '1110987654',
    address: 'Al Sahafa District, Riyadh',
    city: 'Riyadh',
    gender: 'Male',
    hasPhoto: true,
    device: 'Xiaomi 14 · Android 14',
    appLanguage: 'Arabic',
    lastIp: '46.31.10.27',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'STC Pay',
      iban: 'SA20 6000 0000 0011 2233 4455',
      holder: 'Rakan Al-Otaibi',
      status: 'Verified',
    },
    docs: [
      { type: 'license', status: 'pending', expiresOn: null },
      { type: 'id_card', status: 'verified', expiresOn: null },
      { type: 'vehicle_reg', status: 'verified', expiresOn: '2028-03-22' },
      { type: 'background', status: 'pending', expiresOn: null },
      { type: 'insurance', status: 'verified', expiresOn: '2026-10-30' },
    ],
    movementLog: [{ at: '2026-06-21', action: 'Application submitted', location: 'Riyadh, SA' }],
    acceptedTrips: 0,
    cancelledTrips: 0,
    claim: null,
    approvedDriverId: null,
    rejectionReason: null,
    decidedAt: null,
    decidedByUserId: null,
  },

  /* ── added rows ─────────────────────────────────────────────────────── */
  {
    id: 'APP-2206',
    /* Long Arabic name in a queue row that also carries a claim chip, an SLA
       countdown and five doc pills. This is the row that finds out whether the
       work-queue row layout survives at 1280 px. */
    name: 'محمد بن عبد الرحمن بن سليمان آل الشيخ المطيري',
    phone: '+966 59 776 4433',
    email: null,
    vehicle: 'Hyundai Sonata 2023 · Phantom Black Pearl',
    plate: 'ح ط ك ٩٩٤٤',
    vehicleClass: 'Comfort',
    status: 'rejected',
    appliedAt: '2026-06-19T07:45:00+03:00',
    slaStartedAt: '2026-06-19T07:45:00+03:00',
    slaDueAt: sla('2026-06-19T07:45:00+03:00'),
    slaTargetMinutes: SLA_HOURS * 60,
    slaBreachedAt: null,
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
    dateOfBirth: '1987-12-02',
    nationalId: '1066998877',
    address: 'حي الياسمين، الرياض',
    city: 'Riyadh',
    gender: 'Male',
    hasPhoto: false,
    device: 'Samsung Galaxy S21 · Android 13',
    appLanguage: 'Arabic',
    lastIp: '160.156.77.9',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'مصرف الإنماء',
      iban: 'SA35 0500 0000 1122 3344 5566',
      holder: 'محمد بن عبد الرحمن بن سليمان آل الشيخ المطيري',
      status: 'Rejected',
    },
    docs: [
      { type: 'license', status: 'rejected', expiresOn: '2026-05-01' },
      { type: 'id_card', status: 'verified', expiresOn: null },
      { type: 'vehicle_reg', status: 'missing', expiresOn: null },
      { type: 'background', status: 'rejected', expiresOn: null },
      { type: 'insurance', status: 'missing', expiresOn: null },
    ],
    movementLog: [
      { at: '2026-06-19', action: 'Application submitted', location: 'Riyadh, SA' },
      { at: '2026-06-20', action: 'Application rejected', location: 'Riyadh, SA' },
    ],
    acceptedTrips: 0,
    cancelledTrips: 0,
    claim: null,
    approvedDriverId: null,
    rejectionReason: 'Driving licence expired 2026-05-01 and background check returned a disqualifying result',
    decidedAt: '2026-06-20T14:10:00+03:00',
    decidedByUserId: 'USR-1',
  },
  {
    id: 'APP-2207',
    name: 'Ali Hassan',
    phone: '+966 54 001 9090',
    email: null,
    vehicle: 'Corolla 2020 · White',
    plate: 'DEF 2211',
    vehicleClass: 'Economy',
    status: 'withdrawn',
    appliedAt: '2026-06-16T12:00:00+03:00',
    /* Withdrawn before a decision, so the SLA no longer applies. */
    slaStartedAt: null,
    slaDueAt: null,
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
    dateOfBirth: '1993-04-08',
    nationalId: '1099887766',
    address: 'Al Rabwah District, Riyadh',
    city: 'Riyadh',
    gender: 'Male',
    hasPhoto: false,
    device: 'Realme 11 · Android 13',
    appLanguage: 'Arabic',
    lastIp: '46.31.4.180',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'Al Rajhi Bank',
      iban: 'SA44 8000 0000 4433 2211 0099',
      holder: 'Ali Hassan',
      status: 'Pending verification',
    },
    /* Every document missing — the empty-file case, distinct from "all pending". */
    docs: [
      { type: 'license', status: 'missing', expiresOn: null },
      { type: 'id_card', status: 'missing', expiresOn: null },
      { type: 'vehicle_reg', status: 'missing', expiresOn: null },
      { type: 'background', status: 'missing', expiresOn: null },
      { type: 'insurance', status: 'missing', expiresOn: null },
    ],
    movementLog: [{ at: '2026-06-16', action: 'Application submitted', location: 'Riyadh, SA' }],
    acceptedTrips: 0,
    cancelledTrips: 0,
    claim: null,
    approvedDriverId: null,
    rejectionReason: null,
    decidedAt: null,
    decidedByUserId: null,
  },
  {
    id: 'APP-2208',
    name: 'Yazeed Al-Nasser',
    phone: '+966 55 313 2244',
    email: null,
    vehicle: 'Elantra 2023 · Grey',
    plate: 'GHJ 8080',
    vehicleClass: 'Economy',
    status: 'pending',
    /* Submitted 11 minutes ago. The freshest row in the queue — pairs with
       APP-2204's breach to give the SLA column both extremes on one screen. */
    appliedAt: offsetFromNow({ minutes: -11 }),
    slaStartedAt: offsetFromNow({ minutes: -11 }),
    slaDueAt: offsetFromNow({ hours: SLA_HOURS, minutes: -11 }),
    slaTargetMinutes: SLA_HOURS * 60,
    slaBreachedAt: null,
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
    dateOfBirth: '2000-06-15',
    nationalId: '1123344556',
    address: 'Al Aqiq District, Riyadh',
    city: 'Riyadh',
    gender: 'Male',
    hasPhoto: true,
    device: 'iPhone 15 · iOS 17.5',
    appLanguage: 'English',
    lastIp: '92.96.203.14',
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'SNB (Al Ahli)',
      iban: 'SA03 1000 0000 9911 8822 7733',
      holder: 'Yazeed Al-Nasser',
      status: 'Verified',
    },
    docs: [
      { type: 'license', status: 'verified', expiresOn: '2030-02-11' },
      { type: 'id_card', status: 'verified', expiresOn: null },
      { type: 'vehicle_reg', status: 'verified', expiresOn: '2028-09-01' },
      { type: 'background', status: 'pending', expiresOn: null },
      { type: 'insurance', status: 'verified', expiresOn: '2027-07-19' },
    ],
    movementLog: [{ at: '2026-06-25', action: 'Application submitted', location: 'Riyadh, SA' }],
    acceptedTrips: 0,
    cancelledTrips: 0,
    claim: null,
    approvedDriverId: null,
    rejectionReason: null,
    decidedAt: null,
    decidedByUserId: null,
  },
]

/* ── volume ──────────────────────────────────────────────────────────── */

const FILLER_APPLICANT_NAMES: ReadonlyArray<{ readonly given: string; readonly family: string }> = [
  { given: 'Nasser', family: 'Al-Harthi' },
  { given: 'Rakan', family: 'Al-Suwaidan' },
  { given: 'Waleed', family: 'Al-Jubair' },
  { given: 'Hind', family: 'Al-Salem' },
  { given: 'Basem', family: 'Al-Rasheed' },
  { given: 'Tala', family: 'Al-Munajjed' },
  { given: 'Mazen', family: 'Al-Hazmi' },
  { given: 'Ghada', family: 'Al-Sabban' },
  { given: 'Ammar', family: 'Al-Duwaish' },
  { given: 'Latifa', family: 'Al-Ghannam' },
  { given: 'Bassam', family: 'Al-Khudair' },
]

const FILLER_APPLICANT_VEHICLES: ReadonlyArray<{ readonly model: string; readonly klass: 'Economy' | 'Comfort' }> = [
  { model: 'Corolla 2022 · White', klass: 'Economy' },
  { model: 'Camry 2023 · Silver', klass: 'Comfort' },
  { model: 'Elantra 2023 · Grey', klass: 'Economy' },
  { model: 'Sonata 2024 · Black', klass: 'Comfort' },
  { model: 'Yaris 2021 · White', klass: 'Economy' },
]

const REJECTION_REASONS: readonly string[] = [
  'Background check returned an unspent traffic conviction',
  'Vehicle is older than the eight-year limit for the class applied for',
  'Insurance certificate names a policyholder who is not the applicant',
  'Identity document and bank account holder do not match',
]

/**
 * Volume for Operations › People › Applications — 43 decided applications, so
 * the queue pages and its `approved` / `rejected` / `withdrawn` views have
 * populations rather than one row each.
 *
 * **Not one of them is `pending` or `in-review`, and that is a hard
 * constraint.** `fixtures/navCounts.ts` pins `operations-people` to *five
 * applications awaiting a decision plus two lapsed compliance documents*, and
 * `navCounts.test.ts:292` asserts the five against this collection while
 * `metrics.test.ts` asserts the same five against the
 * `operations.overview.pendingApplications` tile. A forty-fourth undecided
 * application would falsify a badge, a tile and the argument in AC-721 that
 * they differ legitimately.
 *
 * It is also the true shape. An applications queue is five open files and
 * several hundred decided ones, and a fixture where every row is undecided
 * makes the decided views — the ones an operator uses to answer *"why was this
 * captain rejected?"* — untestable.
 *
 * Deterministic: name, vehicle and bank holder come off **one** record per row,
 * and every timestamp descends from a single per-row offset, so a decision
 * cannot precede its application.
 */
export const fillerApplicants: Applicant[] = Array.from({ length: 43 }, (_, i) => {
  const person = cycle(FILLER_APPLICANT_NAMES, i)
  const vehicle = cycle(FILLER_APPLICANT_VEHICLES, i)
  const name = `${person.given} ${person.family}`
  const female = person.given === 'Hind' || person.given === 'Tala' || person.given === 'Ghada' || person.given === 'Latifa'
  /* Two rejected and one withdrawn in every seven; the rest approved. A queue
     that only ever approves teaches nobody what a rejection looks like. */
  const status = i % 7 === 6 ? 'withdrawn' : i % 7 < 2 ? 'rejected' : 'approved'
  const appliedMinutesAgo = 1_440 * (3 + (i % 45)) + ((i * 83) % 1_400)
  const decidedAfter = 120 + ((i * 197) % 3_600)
  const appliedAt = offsetFromNow({ minutes: -appliedMinutesAgo })
  return {
    id: `APP-${3100 + i}`,
    name,
    phone: `+966 5${i % 10} ${String(200 + i).padStart(3, '0')} ${String(5000 + i * 17).slice(-4)}`,
    email: i % 3 === 0 ? null : `${person.given.toLowerCase()}.${person.family.toLowerCase().replace('al-', '')}@example.com`,
    vehicle: vehicle.model,
    plate: `${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i * 3) % 26))}${String.fromCharCode(65 + ((i * 7) % 26))} ${String(1000 + i * 37).slice(-4)}`,
    vehicleClass: vehicle.klass,
    status,
    appliedAt,
    slaStartedAt: appliedAt,
    slaDueAt: sla(appliedAt),
    slaTargetMinutes: SLA_HOURS * 60,
    /* Decided late in roughly a third of cases. Computed from the two offsets
       rather than asserted, so a row cannot claim a breach its dates deny. */
    slaBreachedAt: decidedAfter > SLA_HOURS * 60 ? offsetFromNow({ minutes: -appliedMinutesAgo + SLA_HOURS * 60 }) : null,
    /**
     * **`unset`, like every row above it.** Q8 is still open: nothing in the
     * legacy app states a decision window for an application, so `slaDueAt`
     * here is a *modelled* deadline and `slaSource` says so. Volume does not
     * change that — forty-three more rows carrying an invented source would
     * have made an unanswered question look settled.
     */
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
    dateOfBirth: `19${85 + (i % 15)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
    nationalId: `10${String(10_000_000 + i * 7_919).slice(0, 8)}`,
    address: `District ${(i % 12) + 1}, Riyadh`,
    city: 'Riyadh',
    gender: female ? 'Female' : 'Male',
    hasPhoto: i % 3 !== 0,
    device: i % 2 === 0 ? 'iPhone 13 · iOS 17.2' : 'Samsung Galaxy A54 · Android 13',
    appLanguage: i % 6 === 0 ? 'English' : 'Arabic',
    lastIp: `92.96.${(i * 11) % 200}.${(i * 5) % 250}`,
    ipLocation: 'Riyadh, SA',
    bank: {
      bankName: 'Al Rajhi Bank',
      iban: `SA44 8000 0000 ${String(4000 + i)} ${String(5000 + i)} ${String(6000 + i)}`,
      /* The holder is the applicant, read off the same record as the name. A
         mismatch between the two is a rejection reason, not a filler accident —
         see `REJECTION_REASONS`. */
      holder: name,
      status: 'Verified',
    },
    docs: [
      { type: 'license', status: 'verified', expiresOn: `202${8 + (i % 2)}-0${(i % 9) + 1}-1${i % 9}` },
      { type: 'id_card', status: 'verified', expiresOn: null },
      { type: 'vehicle_reg', status: 'verified', expiresOn: `2027-0${(i % 9) + 1}-2${i % 8}` },
      { type: 'background', status: status === 'rejected' ? 'rejected' : 'verified', expiresOn: null },
      { type: 'insurance', status: 'verified', expiresOn: `2027-1${i % 3}-0${(i % 8) + 1}` },
    ],
    movementLog: [
      { at: appliedAt.slice(0, 10), action: 'Application submitted', location: 'Riyadh, SA' },
    ],
    acceptedTrips: 0,
    cancelledTrips: 0,
    /* A decided application is in nobody's name. The claim states live on the
       five undecided rows above, where they mean something. */
    claim: null,
    /* An approval mints a captain. These point at the filler captains, which
       exist — an `approvedDriverId` naming nobody would be the same dangling
       link the trip fillers used to carry. */
    approvedDriverId: status === 'approved' ? cycleRecord(fillerDrivers, i).id : null,
    rejectionReason: status === 'rejected' ? cycle(REJECTION_REASONS, i) : null,
    decidedAt: offsetFromNow({ minutes: -appliedMinutesAgo + decidedAfter }),
    decidedByUserId: status === 'withdrawn' ? null : cycle(['USR-1', 'USR-5'], i),
  } satisfies Applicant
})

/** 51 rows — eight hand-written files and forty-three decided. */
export const applicantFixtures: Applicant[] = [...namedApplicants, ...fillerApplicants]
