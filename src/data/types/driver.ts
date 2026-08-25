/**
 * Captain (driver) — Operations › People, view *Captains*.
 *
 * Derived from `DB.drivers` (`eyvar_ops_panel_v40_fixed.html:2633`–`:2673`) and
 * from `renderDriversTable()` (`:6344`), which is what actually decides which
 * fields are real.
 *
 * Four legacy shapes are corrected on the way across the seam, each noted at
 * the field:
 *   money strings   `'2,840 SAR'`  → integer halalas
 *   date strings    `'Feb 2025'`   → ISO
 *   derived status  three booleans → one server-returned enum
 *   `stats.activeSubs: '4/5'`      → two integers
 */

import type { Halalas, IsoDate, IsoDateTime } from './common'

/** Legacy `lvl` (`:2634`), rendered as the tier badge. `renderDriversTable` also computes a fifth bucket. */
export type DriverTier = 'gold' | 'silver' | 'standard'

/**
 * **Derived in legacy, a server field here.** `renderDriversTable` (`:6394`)
 * computes the status cell from three independent signals:
 *   `d.suspended`                                   → Suspended
 *   open complaints ∨ `flaggedForDeclines` ∨ `manualFlag` → Under review
 *   otherwise                                       → Active
 * plus a `status !== 'pending'` filter on the collection itself (`:6346`).
 *
 * Recomputing that in three screens guarantees three answers, so the API owns
 * it. The contributing flags stay on the record because the detail page shows
 * *why*.
 *
 * Badge tones (R7, five-tone palette): active → `success`, under-review →
 * `warning`, suspended → `neutral` (**there is no red badge** — a suspension is
 * a standing condition and gets the §8.4 row marker, not a sixth tone),
 * pending → `new`.
 */
export type DriverStatus = 'active' | 'under-review' | 'suspended' | 'pending'

/** Legacy `type` (`:2634`). Two vehicle classes, everywhere in the product. */
export type VehicleClass = 'Economy' | 'Comfort'

/** Legacy `bank.status` (`:2637`). */
export type BankAccountStatus = 'Verified' | 'Pending verification' | 'Rejected'

/**
 * Legacy `planAccess` — only `'terminated'` is ever written (`:6379`), the other
 * states are implied by its absence. Named here so the enum is complete rather
 * than "the string or undefined".
 */
export type PlanAccess = 'granted' | 'frozen' | 'terminated'

export interface BankAccount {
  bankName: string
  iban: string
  holder: string
  status: BankAccountStatus
}

/** Legacy `bankHistory[]` (`:2653`) — present on exactly one seeded driver. */
export interface BankAccountChange extends BankAccount {
  replacedAt: IsoDate
  reason: string
}

/** Legacy `movementLog[]` (`:2634`), on every person record. `{date,action,location}`. */
export interface MovementLogEntry {
  at: IsoDate
  action: string
  location: string
}

export interface Driver {
  id: string
  name: string
  phone: string
  /** Riders have none; drivers do (`:2634`). Nullable because the applicant flow does not require one. */
  email: string | null
  /**
   * `0` is a real, seeded value meaning **no rating yet** — `RDR-2090` carries
   * `rating: 0` (`:2607`) and the renderer branches on it (`:6393`). It is not
   * a zero-star rating, and `null` would be the honest wire form; kept as
   * `number | null` so the distinction survives.
   */
  rating: number | null
  tier: DriverTier
  status: DriverStatus
  /** `'Corolla 2022 · White'` — one display string in legacy, and genuinely one field. */
  vehicle: string
  vehicleClass: VehicleClass
  /** Legacy `joined: 'Feb 2025'` — month precision only, so the day is 01. */
  joinedAt: IsoDate
  hasPhoto: boolean
  gender: 'Male' | 'Female'
  city: string
  address: string
  /** `'iPhone 14 · iOS 17.4'` (`:2634`). */
  device: string
  appLanguage: 'Arabic' | 'English'
  lastIp: string
  ipLocation: string

  bank: BankAccount
  /** Empty for most; one seeded driver has a change record (`:2653`). */
  bankHistory: BankAccountChange[]
  movementLog: MovementLogEntry[]

  /* ── subscription capacity ─────────────────────────────────────────── */
  /** Legacy `stats.activeSubs: '4/5'` split into two integers. A string here cannot be compared or sorted. */
  activeSubscriptions: number
  maxSubscriptions: number
  /** Legacy `multiSubException` (`:2634`) — a per-driver override of the ops limit. */
  multiSubException: boolean

  /* ── flags feeding `status` ────────────────────────────────────────── */
  suspended: boolean
  /** Why, for the banner. `null` when not suspended. Legacy `DB.complianceSuspensions[driverId]` (`:13285`). */
  suspensionReason: string | null
  planAccess: PlanAccess
  /** Legacy `planFreezeUntilMs` — epoch in legacy, ISO here. `null` when not frozen. */
  planFrozenUntil: IsoDateTime | null
  flaggedForDeclines: boolean
  manualFlag: boolean
  openComplaints: number

  /* ── performance ───────────────────────────────────────────────────── */
  totalTrips: number
  /** Legacy `stats.monthEarn: '2,840 SAR'` → halalas. Formatting is the UI's (§8.3). */
  monthEarningsHalalas: Halalas
  /** Legacy `stats.onTime: '96%'` → integer percent. `null` when there is no history to compute from. */
  onTimePercent: number | null
  /** Legacy `capacity: '1 open' | 'Full'` → the number. `Full` is `0`. */
  openSubscriptionSlots: number
  /** `null` for a captain who has never driven — a real fixture case. */
  lastTripAt: IsoDateTime | null

  /** Related ids. The profile's sections fetch their own data from these. */
  tripIds: string[]
  paymentIds: string[]
  complaintIds: string[]
}

/* ── Compliance: Operations › People, view *Compliance* ────────────────── */

/**
 * Separate resource, separate client, **same screen**. Compliance is document
 * expiry per captain (`DB.driverDocs`, `:13278`); it is not a field on `Driver`
 * because the two are different queries with different cardinality, and fusing
 * them because they share a route is the mistake §5.1 warns about.
 */
export type ComplianceDocType =
  | 'license'
  | 'vehicle_reg'
  | 'inspection'
  | 'insurance'
  | 'operating_card'

/** Legacy `DOC_TYPES` (`:13277`) — the five, with their real labels. */
export const COMPLIANCE_DOC_TYPES: ReadonlyArray<{ key: ComplianceDocType; label: string }> = [
  { key: 'license', label: 'Driving license' },
  { key: 'vehicle_reg', label: 'Vehicle registration (Istimara)' },
  { key: 'inspection', label: 'Periodic inspection (Fahs)' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'operating_card', label: 'Transport authority operating card' },
]

/**
 * Legacy `docState(days)` (`:13291`) buckets by days remaining:
 *   `< 0` expired · `≤ 7` critical · `≤ 30` expiring · else valid.
 *
 * The buckets are the domain's, so they are a field. The **days remaining** is
 * not — it depends on the clock and is computed by the UI from `expiresOn`
 * against a passed clock, never from a module-scope `Date.now()`.
 *
 * Tones (R7): valid → `success`, expiring → `warning`, critical → `warning`
 * (**one warning tone**, R17 — separate the two with the label, not a second
 * fill), expired → `neutral` plus the §8.4 row marker.
 */
export type ComplianceDocState = 'valid' | 'expiring' | 'critical' | 'expired'

export interface ComplianceDoc {
  type: ComplianceDocType
  expiresOn: IsoDate
  state: ComplianceDocState
}

export interface DriverCompliance {
  driverId: string
  driverName: string
  vehicle: string
  docs: ComplianceDoc[]
  /**
   * The worst state across all five. **`null` when `docs` is empty** — a
   * captain with no file on record has no worst state, and reporting `valid`
   * for one would be the most dangerous possible default.
   */
  worstState: ComplianceDocState | null
  /** Set when compliance has suspended the captain. Legacy `DB.complianceSuspensions` (`:13285`). */
  suspendedReason: string | null
}
