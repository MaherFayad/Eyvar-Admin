/**
 * Captain application — Operations › People, view *Applications*, and the
 * level-3 detail `/operations/people/applications/:applicantId`.
 *
 * Derived from `DB.pendingDrivers` (`eyvar_ops_panel_v40_fixed.html:2712`–`:2743`)
 * and the applicant detail renderer (`:7151`).
 *
 * **This is a work queue, not an index table** (§5.1, pattern P8): it carries
 * claim, SLA and disposition. Applications share the People route with Captains,
 * Compliance and Riders — four resources, four clients, one screen. Fusing them
 * into one type because they share a route is the error §5.1 names.
 */

import type { Claim, IsoDate, IsoDateTime } from './common'
import type { MovementLogEntry, BankAccount, VehicleClass } from './driver'
import type { ComplianceDocType } from './driver'

/**
 * Legacy `status: 'pending'` is the only seeded value; `'approved'` and
 * `'rejected'` are written by the approve/reject handlers. `withdrawn` is
 * inferred from the flow and is named so the enum is closed.
 *
 * Tones (R7): pending → `new`, in-review → `info`, approved → `success`,
 * rejected → `neutral`, withdrawn → `neutral`.
 */
export type ApplicantStatus = 'pending' | 'in-review' | 'approved' | 'rejected' | 'withdrawn'

/**
 * Legacy `docs` is a record of display strings — `'✓ Verified'`, `'⏳ Pending'`
 * (`:2717`). An emoji in a data field cannot be filtered, sorted or translated.
 * The enum is the fact; the glyph is the UI's.
 */
export type ApplicantDocStatus = 'verified' | 'pending' | 'rejected' | 'missing'

export interface ApplicantDoc {
  type: ComplianceDocType | 'id_card' | 'background'
  status: ApplicantDocStatus
  /**
   * Legacy `docExpiry` (`:11040`) — an **operator-editable** map, filled in on
   * the detail page. `null` until someone enters it, and the detail page's
   * "missing dates" warning (`:11180`) counts the nulls.
   */
  expiresOn: IsoDate | null
}

export interface Applicant {
  id: string
  name: string
  phone: string
  /** Legacy applicants carry no email field. Added because the approval flow creates a `Driver`, which has one. */
  email: string | null
  vehicle: string
  /** Legacy `plate: 'ABC 4521'` (`:2713`) — applicants have it, active drivers do not. */
  plate: string
  vehicleClass: VehicleClass
  status: ApplicantStatus

  /** Legacy `applied: '24 Jun · 2 days ago'` — a value and its own relative rendering, in one string. */
  appliedAt: IsoDateTime
  /**
   * SLA deadline for a first decision. **Not in the legacy data**: the work-queue
   * pattern (§8.4) requires an SLA and `all-pending` has none. Modelled so the
   * queue can be built; the actual SLA window is a **product-owner question**,
   * flagged in the handoff. `null` means no SLA has been set.
   */
  slaDueAt: IsoDateTime | null

  dateOfBirth: IsoDate
  /** Saudi national id. PII. */
  nationalId: string
  address: string
  city: string
  gender: 'Male' | 'Female'
  hasPhoto: boolean
  device: string
  appLanguage: 'Arabic' | 'English'
  lastIp: string
  ipLocation: string

  bank: BankAccount
  docs: ApplicantDoc[]
  movementLog: MovementLogEntry[]

  /** Legacy `acceptedTrips` / `cancelledTrips`, both `0` on every seeded row (`:2719`). */
  acceptedTrips: number
  cancelledTrips: number

  /**
   * Who is working this application right now. `null` = unclaimed. A row
   * claimed by another operator is the §8.4 state the design has to solve, and
   * the fixtures include one.
   */
  claim: Claim | null

  /** Set on approval — the `DRV-*` id the applicant became. `null` until then. */
  approvedDriverId: string | null
  /** Set on rejection. `null` otherwise. Free text today; a reason code is a product decision. */
  rejectionReason: string | null
  decidedAt: IsoDateTime | null
  decidedByUserId: string | null
}
