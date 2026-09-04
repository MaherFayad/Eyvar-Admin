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
import type { SlaTracked } from './workQueue'
import type { MovementLogEntry, BankAccount, VehicleClass } from './driver'
import type { ComplianceDocFile, DocumentType } from './driver'

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

/**
 * **Why a document was rejected** — legacy's five reason codes (`:11040`), as an
 * enum rather than as the free text the reject dialog used to collect.
 *
 * A code can be counted, filtered and translated; a sentence typed by whoever
 * was on shift can be none of those, and the applicant is told the reason in
 * their own language. `types/driver.ts` records that these five exist in the
 * legacy app and that nothing modelled them.
 */
export type ApplicantDocRejectionCode =
  | 'unclear'
  | 'expired'
  | 'mismatch'
  | 'wrong_type'
  | 'suspected_forgery'

/** The five, with their label keys, in the order the reject form offers them. */
export const APPLICANT_DOC_REJECTION_CODES: ReadonlyArray<{
  key: ApplicantDocRejectionCode
  labelKey: string
}> = [
  { key: 'unclear', labelKey: 'applicant.docReason.unclear' },
  { key: 'expired', labelKey: 'applicant.docReason.expired' },
  { key: 'mismatch', labelKey: 'applicant.docReason.mismatch' },
  { key: 'wrong_type', labelKey: 'applicant.docReason.wrongType' },
  { key: 'suspected_forgery', labelKey: 'applicant.docReason.suspectedForgery' },
]

/**
 * One field **read off the document itself** — a licence number, a class, an
 * issuing city, the name printed on the card.
 *
 * ## Why this is on the record and not derived at render
 *
 * It is the answer to the only question a reviewer opens a scan to ask: *does
 * what the document says match what the application says*. `design/…-captain-profile.md`
 * §6.4 records the defect this closes — a date typed on the application and a
 * date read off the document rendered *in the same grey*, so an operator could
 * not tell which one anybody had actually checked.
 *
 * `labelKey`, never a label: the data layer states the field, the UI states the
 * word. Same rule as `DOCUMENT_TYPES`, and the same reason — a `label` here
 * would be untranslatable for everything that read it.
 *
 * **The value is a string and is never parsed.** A licence number is not a
 * number, an issuing city is a place name in whichever script it was printed
 * in, and a date read off a card is what the card says even when that is not a
 * date the parser likes. Comparing it to the application's own field is the
 * reviewer's job and the UI shows both.
 */
export interface ApplicantDocField {
  labelKey: string
  value: string
}

export interface ApplicantDoc {
  /**
   * **One of the product's four documents, and nothing else** —
   * `DOCUMENT_TYPES` in `types/driver.ts`. This field used to widen the
   * compliance set with `'id_card' | 'background'`, which meant an application
   * could carry a document a captain's file had no way to hold: approve the
   * applicant and the background check vanished, because `approveDriver` copies
   * only what compliance models. One set, both sides of the approval.
   */
  /**
   * `APP-2205-license` — the application and the document, in that order.
   *
   * The same shape and the same rule as `ComplianceDoc.id`: **treat it as
   * opaque**. It exists because a viewer needs something to address — a React
   * key, a `?doc=` param, an id a test can name — and deriving one inside a
   * component would put the format in three places.
   */
  id: string
  type: DocumentType
  status: ApplicantDocStatus
  /**
   * Legacy `docExpiry` (`:11040`) — an **operator-editable** map, filled in on
   * the detail page. `null` until someone enters it, and the detail page's
   * "missing dates" warning (`:11180`) counts the nulls.
   */
  expiresOn: IsoDate | null

  /**
   * The uploaded scan's record, or `null` for **nothing uploaded** — which is
   * exactly `status === 'missing'` and is the ordinary case on a half-finished
   * application, not an error.
   *
   * `ComplianceDocFile` is reused rather than re-declared: an application's
   * upload and a captain's are the same object with the same fields, and
   * `approveDriver` copies one into the other. Two shapes for one file is how
   * the two sides of an approval end up disagreeing about what was uploaded.
   */
  file: ComplianceDocFile | null

  /**
   * What a reviewer read off the document. **Empty until somebody opens it** —
   * which is the honest state of a `pending` document, and the reason the
   * viewer's panel has an empty state at all.
   */
  readFields: readonly ApplicantDocField[]

  /**
   * Why it was rejected. `null` unless `status === 'rejected'`, and the
   * implication runs both ways — a rejected document without a code is a
   * decision nobody can appeal.
   */
  rejectionCode: ApplicantDocRejectionCode | null
}

export interface Applicant extends SlaTracked {
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
   *
   * **Wave 2 update.** `slaDueAt` is now one field of the shared `SlaTracked`
   * block (`types/workQueue.ts`) that the five work queues carry, rather than a
   * lone timestamp this type invented. Nothing about the value changed; what
   * changed is that the placeholder is now *labelled* as one —
   * `slaSource: 'unset'` on every applicant row says the 48-hour window is a
   * shape waiting for **Q8**, not a decision. Every other queue's rows say
   * `legacy-policy` or `legacy-reason-code` and mean it.
   *
   * `slaBreachedAt` is the addition that matters. `APP-2203` was approved
   * 24 Jun 11:20 against a 25 Jun 09:00 deadline — its deadline is in the past
   * and it never breached. A `slaDueAt < now` check calls it breached; the
   * stamp does not.
   */

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
