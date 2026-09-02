/**
 * Fleet compliance — legacy `DB.driverDocs` (`eyvar_ops_panel_v40_fixed.html:13278`),
 * five captains × five document types, with real ISO expiry dates.
 *
 * The `state` on each doc is the bucket `docState(days)` computes (`:13291`)
 * against the fixed clock (`2026-06-25`):
 *   `< 0` expired · `≤ 7` critical · `≤ 30` expiring · else valid
 *
 * Legacy computes this at render from `REQ_NOW_REF`, which is the same fixed
 * clock — so the buckets below are the values the legacy app actually shows,
 * not an invention.
 *
 * DRV-0106 and every added captain have **no doc record at all** in legacy: the
 * collection covers 0101–0105 only, so a captain with no compliance file is the
 * normal case and the screen has to say so rather than showing five green pills.
 */

import type { IsoDate } from '../types/common'
import type { ComplianceDocState, ComplianceDocType, DriverCompliance } from '../types/driver'
import { cycleRecord } from './cycle'
import { fillerDrivers } from './drivers'

const namedCompliance: DriverCompliance[] = [
  {
    driverId: 'DRV-0101',
    driverName: 'Ahmed Salem',
    vehicle: 'Corolla 2022 · White',
    docs: [
      { type: 'license', expiresOn: '2027-03-12', state: 'valid' },
      /* 24 days out — `expiring`. */
      { type: 'vehicle_reg', expiresOn: '2026-07-19', state: 'expiring' },
      { type: 'inspection', expiresOn: '2026-08-02', state: 'valid' },
      { type: 'insurance', expiresOn: '2026-11-30', state: 'valid' },
      { type: 'operating_card', expiresOn: '2027-01-15', state: 'valid' },
    ],
    worstState: 'expiring',
    suspendedReason: null,
  },
  {
    driverId: 'DRV-0102',
    driverName: 'Omar Farouk',
    vehicle: 'Camry 2023 · Silver',
    docs: [
      /* 19 days — `expiring`. */
      { type: 'license', expiresOn: '2026-07-14', state: 'expiring' },
      { type: 'vehicle_reg', expiresOn: '2026-12-01', state: 'valid' },
      { type: 'inspection', expiresOn: '2026-09-10', state: 'valid' },
      /* 10 days — `expiring`, one bucket above critical. The boundary row. */
      { type: 'insurance', expiresOn: '2026-07-05', state: 'expiring' },
      { type: 'operating_card', expiresOn: '2026-10-22', state: 'valid' },
    ],
    worstState: 'expiring',
    suspendedReason: null,
  },
  {
    driverId: 'DRV-0103',
    driverName: 'Khalid Mansour',
    vehicle: 'Yaris 2021 · Black',
    docs: [
      { type: 'license', expiresOn: '2028-01-20', state: 'valid' },
      { type: 'vehicle_reg', expiresOn: '2026-08-15', state: 'valid' },
      /* 30 days exactly — the `expiring` boundary. Off-by-one lives here. */
      { type: 'inspection', expiresOn: '2026-07-25', state: 'expiring' },
      { type: 'insurance', expiresOn: '2027-02-28', state: 'valid' },
      { type: 'operating_card', expiresOn: '2026-12-05', state: 'valid' },
    ],
    worstState: 'expiring',
    suspendedReason: null,
  },
  {
    driverId: 'DRV-0104',
    driverName: 'Hassan Al-Ghamdi',
    vehicle: 'Sonata 2023 · Grey',
    docs: [
      { type: 'license', expiresOn: '2026-09-30', state: 'valid' },
      { type: 'vehicle_reg', expiresOn: '2027-04-11', state: 'valid' },
      /* **Expired five days ago.** A gold-tier captain with 524 trips and 98%
         on-time, driving on a lapsed inspection certificate. The row that
         justifies the §8.4 row-level marker. */
      { type: 'inspection', expiresOn: '2026-06-20', state: 'expired' },
      /* 45 days — valid. */
      { type: 'insurance', expiresOn: '2026-08-09', state: 'valid' },
      { type: 'operating_card', expiresOn: '2027-03-01', state: 'valid' },
    ],
    worstState: 'expired',
    suspendedReason: null,
  },
  {
    driverId: 'DRV-0105',
    driverName: 'Youssef Nouri',
    vehicle: 'Sunny 2020 · White',
    docs: [
      { type: 'license', expiresOn: '2027-06-18', state: 'valid' },
      /* 13 days. */
      { type: 'vehicle_reg', expiresOn: '2026-07-08', state: 'expiring' },
      { type: 'inspection', expiresOn: '2026-10-14', state: 'valid' },
      { type: 'insurance', expiresOn: '2026-09-22', state: 'valid' },
      { type: 'operating_card', expiresOn: '2026-11-11', state: 'valid' },
    ],
    worstState: 'expiring',
    suspendedReason: null,
  },

  /* ── added rows ─────────────────────────────────────────────────────── */
  {
    driverId: 'DRV-0202',
    driverName: 'Majed Al-Shamrani',
    vehicle: 'Accent 2019 · Silver',
    docs: [
      { type: 'license', expiresOn: '2027-08-04', state: 'valid' },
      { type: 'vehicle_reg', expiresOn: '2026-09-19', state: 'valid' },
      { type: 'inspection', expiresOn: '2026-06-30', state: 'critical' },
      { type: 'insurance', expiresOn: '2026-07-01', state: 'critical' },
      /* Expired a week ago and the captain is suspended for it. The one row
         where compliance has already acted. */
      { type: 'operating_card', expiresOn: '2026-06-18', state: 'expired' },
    ],
    worstState: 'expired',
    suspendedReason: 'Transport authority operating card expired 7 days ago',
  },
  {
    driverId: 'DRV-0201',
    driverName: 'عبد الرحمن بن محمد بن عبد الله آل عبد الله القحطاني الدوسري',
    vehicle: 'Hyundai Azera 2024 · Pearl White Metallic',
    /* Everything valid and far out — the all-clear row, so the screen has a
       "nothing to do here" case beside the four that need work. */
    docs: [
      { type: 'license', expiresOn: '2029-05-30', state: 'valid' },
      { type: 'vehicle_reg', expiresOn: '2028-02-14', state: 'valid' },
      { type: 'inspection', expiresOn: '2027-09-01', state: 'valid' },
      { type: 'insurance', expiresOn: '2028-11-20', state: 'valid' },
      { type: 'operating_card', expiresOn: '2029-01-08', state: 'valid' },
    ],
    worstState: 'valid',
    suspendedReason: null,
  },
  {
    driverId: 'DRV-0203',
    driverName: 'Faisal Al-Amri',
    vehicle: 'Elantra 2024 · Blue',
    /**
     * **No documents on file at all.** Approved yesterday; the compliance
     * record has not been created. This is the *filtered-to-zero vs first-run*
     * distinction from R8 in one row: the captain exists, the file does not.
     * It is also the normal case for every captain outside 0101–0105 in the
     * legacy data.
     */
    docs: [],
    /* `null`, not `valid`. Reporting a captain with no file as compliant is the
       most dangerous default this screen could have. */
    worstState: null,
    suspendedReason: null,
  },
  {
    /**
     * **The first captain whose `worstState` is `critical`.**
     *
     * `critical` existed at document level — `DRV-0202` carries two — but that
     * captain's operating card is *expired*, so their worst is `expired` and
     * the `critical` **row** badge had never rendered. A state that exists on a
     * child and never on the parent is invisible: the index shows one badge per
     * captain, the filter facets on `worstState`, and the sort orders by it.
     *
     * The distinction is the entire point of the bucket. `expired` means the
     * captain should not be driving today. `critical` means they will be
     * illegal within the week and **nothing has happened yet** — it is the only
     * bucket where an operator can still act in time, which is why it needs to
     * be reachable more than any of the other three.
     *
     * Six days out on the insurance, seven on the inspection: the `≤ 7`
     * boundary from `docState` (`:13291`) sits on that second document, so this
     * row also pins the off-by-one.
     */
    driverId: 'DRV-0204',
    driverName: 'Turki Al-Mutairi',
    vehicle: 'Sunny 2021 · White',
    docs: [
      { type: 'license', expiresOn: '2027-11-02', state: 'valid' },
      { type: 'vehicle_reg', expiresOn: '2026-08-28', state: 'valid' },
      /* 7 days exactly — the `critical` boundary. */
      { type: 'inspection', expiresOn: '2026-07-02', state: 'critical' },
      /* 6 days. */
      { type: 'insurance', expiresOn: '2026-07-01', state: 'critical' },
      { type: 'operating_card', expiresOn: '2026-10-30', state: 'valid' },
    ],
    worstState: 'critical',
    suspendedReason: null,
  },
]

/* ── volume ──────────────────────────────────────────────────────────── */

const DOC_TYPES: readonly ComplianceDocType[] = [
  'license',
  'vehicle_reg',
  'inspection',
  'insurance',
  'operating_card',
]

/**
 * `docState(days)` (`:13291`), verbatim: `< 0` expired · `≤ 7` critical ·
 * `≤ 30` expiring · else valid.
 *
 * Written out here rather than reused from a client because the `state` on a
 * document is a **stored** field — the server buckets it once so three screens
 * cannot bucket it three ways — and a fixture that computed it at read time
 * would be modelling a different contract from the one the type declares.
 */
function docStateFor(daysOut: number): ComplianceDocState {
  if (daysOut < 0) return 'expired'
  if (daysOut <= 7) return 'critical'
  if (daysOut <= 30) return 'expiring'
  return 'valid'
}

/** `2026-06-25` plus `daysOut`, as a bare date. No host clock; the base is the fixed one. */
function expiryFor(daysOut: number): IsoDate {
  const d = new Date(Date.UTC(2026, 5, 25) + daysOut * 86_400_000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
}

const WORST_ORDER: readonly ComplianceDocState[] = ['expired', 'critical', 'expiring', 'valid']

/**
 * Volume for the Compliance view — 43 more captains, so it pages and its
 * `worstState` filter has a population to divide.
 *
 * **The captain and their vehicle come off one `Driver` record.** A compliance
 * row denormalises three fields — id, name, vehicle — and reading them from the
 * canonical captain is the same rule the trip and subscription fillers now
 * follow. A compliance file describing a car the captain does not drive is a
 * dispute waiting to happen.
 *
 * `worstState` is **derived from the documents rather than asserted**, so a row
 * cannot claim a badge its own dates deny — which is exactly the defect that
 * kept `critical` unreachable at row level.
 */
export const fillerCompliance: DriverCompliance[] = Array.from({ length: 43 }, (_, i) => {
  const captain = cycleRecord(fillerDrivers, i)
  const docs = DOC_TYPES.map((type, d) => {
    /**
     * One document in roughly six is inside thirty days; the rest are months
     * out. The offsets are a pure function of the row and the slot, so the
     * distribution is fixed and a snapshot can be diffed.
     *
     * **Never negative, and that is a constraint from another file.**
     * `fixtures/navCounts.ts` pins `operations-people` to *applications waiting
     * + captains with a lapsed document*, and `navCounts.test.ts` asserts the
     * lapsed half is exactly 2 — `DRV-0104`'s inspection and `DRV-0202`'s
     * operating card, both hand-written and both argued for by name. A filler
     * that expired a document would move a badge three files reason about and
     * would drown the two rows the count is *about*. So the volume reaches
     * `critical` and `expiring` and stops there; `expired` stays the property
     * of the two captains who earned it.
     */
    const daysOut = (i + d) % 6 === 0 ? ((i * 7 + d * 13) % 40) + 1 : 45 + ((i * 29 + d * 41) % 900)
    return { type, expiresOn: expiryFor(daysOut), state: docStateFor(daysOut) }
  })
  const worstState =
    WORST_ORDER.find((state) => docs.some((doc) => doc.state === state)) ?? null
  return {
    driverId: captain.id,
    driverName: captain.name,
    vehicle: captain.vehicle,
    docs,
    worstState,
    /* Nobody in the filler population is suspended — `fillerDrivers` are all
       `status: 'active'`, and a suspension reason here without one there would
       be two records disagreeing about the same captain. */
    suspendedReason: null,
  } satisfies DriverCompliance
})

/** 52 rows — nine hand-written captains and forty-three of fleet. */
export const complianceFixtures: DriverCompliance[] = [...namedCompliance, ...fillerCompliance]
