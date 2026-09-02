/**
 * Retention schedules and the operational data window — Admin › Data &
 * Compliance.
 *
 * Legacy ancestor: `DB.dataWindow` (`eyvar_ops_panel_v40_fixed.html:20403`) and
 * `saveDataWindow()` (`:20516`), which is the **only** editable field in the
 * legacy `integrity` pane. Its own comment states the rule the product runs on:
 *
 * > *"13 = twelve months for year-on-year comparison, plus a month of headroom.
 * > The binding constraint is actually the payment network's dispute window: the
 * > rule is LONGEST DISPUTE WINDOW + 1 MONTH."*
 *
 * Why this is a resource rather than three `useState` calls on a screen:
 * retention is *"the setting most likely to be believed and least likely to be
 * checked"*. A save that only raises a toast teaches an operator that the
 * window is 90 days when it is still 30 — and nothing on the screen will ever
 * contradict them, because the screen is reading its own unsaved state back.
 *
 * ## The days are a closed set, and that is deliberate
 *
 * Legacy takes a free `<input type="number">` and runs `parseInt(v,10) || 13`
 * (`:20518`), so `-5` is truthy, is stored, makes `windowStartMs()` a **future**
 * timestamp, and marks every account in the book as an orphan (`16b` §12 item
 * 7). A closed set of options makes that unrepresentable rather than validated.
 */

import type { IsoDateTime } from './common'

/** Audit and operational records. Statutory two years; five for ZATCA. */
export type AuditRetentionDays = 365 | 730 | 1825

/** High-frequency GPS. The shortest of the three, and the largest by volume. */
export type TelemetryRetentionDays = 30 | 90 | 180

/**
 * How much trip history the console holds per customer, in months.
 *
 * Months rather than days because the legacy rule is stated in months and the
 * rationale is a comparison period — *"twelve months for year-on-year
 * comparison, plus a month of headroom"*. Converting it to days here would make
 * the one number an operator has to defend look arbitrary.
 */
export type OperationalWindowMonths = 12 | 13 | 24

export const AUDIT_RETENTION_OPTIONS: readonly AuditRetentionDays[] = [365, 730, 1825]
export const TELEMETRY_RETENTION_OPTIONS: readonly TelemetryRetentionDays[] = [30, 90, 180]
export const OPERATIONAL_WINDOW_OPTIONS: readonly OperationalWindowMonths[] = [12, 13, 24]

export interface RetentionPolicy {
  auditRetentionDays: AuditRetentionDays
  telemetryRetentionDays: TelemetryRetentionDays
  operationalWindowMonths: OperationalWindowMonths
  /**
   * `null` until someone changes it — the seeded policy is the one the product
   * shipped with and nobody signed for it. Rendering `Never changed` is the
   * honest answer, and it is not the same as "saved a long time ago".
   */
  updatedAt: IsoDateTime | null
  updatedByUserId: string | null
  updatedByUserName: string | null
}

/** What a save sends. `updatedAt` and the actor are the server's to set. */
export type RetentionPolicyInput = Pick<
  RetentionPolicy,
  'auditRetentionDays' | 'telemetryRetentionDays' | 'operationalWindowMonths'
>
