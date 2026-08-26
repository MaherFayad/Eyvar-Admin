/**
 * Fairness case — Support › Captain Fairness, four views
 * (`suspension-appeals`, `rating-disputes`, `rider-reports`,
 * `captain-economics`).
 *
 * Derived from `DB.fairnessCases` (`eyvar_ops_panel_v40_fixed.html:15505`),
 * `fcNew()` (`:15507`), `decideFairness()` (`:15592`) and
 * `renderFairnessPage()` (`:15636`).
 *
 * ## Three of the four views are this queue; the fourth is not
 *
 * `captain-economics` is a **reading surface** — legacy `renderCaptainEconomics`
 * shows earnings per engaged hour, not a list of cases anyone disposes of. It
 * has no rows, no claim and no SLA, and it is served as a metric board
 * (`clients/metrics.ts`), not from here. Modelling it as a fourth case kind
 * would put a chart behind a claim button.
 *
 * ## This is the queue whose SLA is real
 *
 * `Applicant.slaDueAt` had no denominator and Q8 is still open on it. Fairness
 * does not have that problem: every case carries a `reasonCode`, and
 * `rcTargets(code).res` is a shipped per-code resolve window in minutes
 * (`:14730`, over `DB.reasonCodes` `:14703`–`:14711`). The legacy page already
 * renders `⚠ past 24h SLA` off exactly that arithmetic (`:15648`), and the
 * inbox sorts on it (`:19144`). So `slaSource` here is `legacy-reason-code`
 * and the numbers below are measured, not chosen.
 */

import type { Claim, IsoDateTime } from './common'
import type { SlaTracked } from './workQueue'

/**
 * Legacy `kind` is a **display string passed to `fcNew`** — `'Rating dispute'`
 * (`:15525`), `'Suspension appeal'` (`:15583`), `'Rider report'` (`:15563`).
 * Closed and slugged here; the label is UI copy.
 *
 * The three map one-to-one onto the three queue views.
 */
export type FairnessCaseKind = 'suspension-appeal' | 'rating-dispute' | 'rider-report'

/**
 * Legacy: `'Open'` → `'Upheld' | 'Overturned'` (`:15597`). Verbatim, slugged.
 *
 * **`upheld` and `overturned` are both dispositions, and neither is a
 * failure.** The page says so in its own empty state: *"A high overturn rate on
 * this page is not a failure — it means the appeal route is doing its job"*
 * (`:15690`).
 *
 * `withdrawn` is added so the enum is closed: a captain can drop an appeal, and
 * without a value for it the row would have to be deleted, which destroys the
 * record an appeals process exists to keep.
 *
 * Tones (R7): open → `info`, upheld → `neutral`, overturned → `success`,
 * withdrawn → `neutral`.
 */
export type FairnessCaseStatus = 'open' | 'upheld' | 'overturned' | 'withdrawn'

export interface FairnessCase extends SlaTracked {
  id: string
  kind: FairnessCaseKind
  status: FairnessCaseStatus

  /** The captain the case is *about* or *from*. Always set — `fcNew` requires it (`:15509`). */
  driverId: string
  driverName: string

  /**
   * The other party. A rider on a `rating-dispute` or `rider-report`;
   * **`null` on a `suspension-appeal`**, where the counterparty is Eyvar itself
   * (`commitDriverAppeal` passes `null`, `:15583`).
   */
  subjectId: string | null
  subjectName: string | null

  /** Legacy `detail` — the statement, free text. `'No statement given'` when the captain typed nothing (`:15583`). */
  detail: string
  /** The `DRV_*` code from `DB.reasonCodes`. Always set; it is what carries the SLA. */
  reasonCode: FairnessReasonCode

  openedAt: IsoDateTime

  /* ── disposition ────────────────────────────────────────────────────── */
  decidedAt: IsoDateTime | null
  /** Legacy stores `decidedBy` as a **name string** (`:15598`). Both here. */
  decidedByUserId: string | null
  decidedByUserName: string | null
  /**
   * Why. Legacy declares the field in `fcNew` and **never writes it** —
   * `decideFairness` sets status, decider and timestamp and leaves `rationale`
   * at `null` (`:15597`–`:15599`). So every decided case in the legacy app is
   * unexplained. Kept nullable rather than required because that is the truth;
   * whether the UI should *require* it is a product decision.
   */
  rationale: string | null

  /* ── rating-dispute only ────────────────────────────────────────────── */
  tripId: string | null
  /** The score being contested, 1–5. `null` on the other two kinds. */
  disputedRating: number | null
  /**
   * Whether overturning actually moved the captain's average.
   *
   * `null` until decided. On an overturn it is `true` only when the captain had
   * a real `ratingCount > 1` to reverse against; otherwise the score is voided
   * and the historical average is left alone, and the case says so (`:15606`–
   * `:15618`). **This is the one place the legacy app refuses to fake an
   * arithmetic it cannot do** — *"removing a 2★ from 4.5 over an assumed n=2
   * yields 7★"* — and the field exists so the UI can be equally honest.
   */
  averageAdjusted: boolean | null

  /* ── suspension-appeal only ─────────────────────────────────────────── */
  /** The reason that was served on the captain. `null` on the other two kinds. */
  suspensionReason: string | null
  /** Set when an overturn reinstated the account (`:15625`). */
  reinstatedAt: IsoDateTime | null

  claim: Claim | null
}

/**
 * Resolve windows in minutes, from `DB.reasonCodes` via `rcTargets` (`:14730`).
 * Measured, not chosen — each is the `res` field on the code named.
 */
export type FairnessReasonCode =
  | 'DRV_SUSPENSION_APPEAL'
  | 'DRV_RATING_DISPUTE'
  | 'DRV_RIDER_NOSHOW'
  | 'DRV_RIDER_CONDUCT'
  | 'DRV_VEHICLE_DAMAGE'
  | 'DRV_DEDUCTION_DISPUTE'

export const FAIRNESS_RESOLVE_MINUTES: Record<FairnessReasonCode, number> = {
  /* T2 · res 1440 — "Driver appeals a suspension" (`:14710`). */
  DRV_SUSPENSION_APPEAL: 1440,
  /* T3 · res 2880 — "Captain disputes an unfair rating" (`:14708`). */
  DRV_RATING_DISPUTE: 2880,
  /* T3 · res 1440 — "Driver reports rider no-show" (`:14704`). */
  DRV_RIDER_NOSHOW: 1440,
  /* T2 · res 1440 — "Driver reports rider behaviour" (`:14705`). */
  DRV_RIDER_CONDUCT: 1440,
  /* T3 · res 2880 — "Vehicle damage or cleaning claim" (`:14706`). */
  DRV_VEHICLE_DAMAGE: 2880,
  /* T2 · res 1440 — "Driver disputes a deduction" (`:14709`). */
  DRV_DEDUCTION_DISPUTE: 1440,
}

/**
 * `DB.commitPolicy.appealWindowDays` / `appealResponseHours` (`:16552`–`:16553`)
 * — 7 days to file, 24 h to answer. The 24 h agrees with
 * `DRV_SUSPENSION_APPEAL`'s 1440 minutes above, which is the corroboration that
 * makes it a policy and not a coincidence.
 */
export const APPEAL_WINDOW_DAYS = 7
