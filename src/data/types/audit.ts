/**
 * The audit entry every money-moving action writes (AC-437).
 *
 * It exists in the data layer rather than in a screen because AC-437 is
 * checkable only if the log is readable: *"a test that performs each in turn
 * observes one new audit entry per action"*. A log a component keeps in state
 * is not that.
 *
 * Two legacy gaps it closes: `recordRefund` writes no audit entry of its own
 * (`12a` R16) and `waiveDeduction` writes none at all (`12b` R1).
 *
 * Modelled on `logAction(type, entityType, entityId, detail)` (`:19903` and
 * ~200 call sites), with the differences that matter: `detail` is a key plus
 * params rather than an assembled English sentence, the amount is integer
 * halalas rather than text, and `reasonCode` is a first-class field because
 * every money movement in this wave requires one.
 */

import type { Halalas, IsoDateTime, LocalisedText } from './common'

/**
 * The act being recorded. A closed set: an audit log whose `action` is free
 * text cannot be filtered, and an unfilterable audit log is a text file.
 */
export type AuditAction =
  | 'payout.pay'
  | 'payout.reverse'
  | 'escrow.release'
  | 'escrow.rehold'
  | 'deduction.apply'
  | 'deduction.waive'
  | 'refund.issue'
  | 'refund.reverse'
  | 'wallet.adjust'
  | 'posting.reverse'
  | 'cash.resolve'
  | 'cash.escalate'
  | 'cash.repayment'
  | 'gateway.toggle'
  | 'gateway.setDefault'
  | 'plan.save'
  | 'permission.denied'

export interface AuditEntry {
  id: string
  at: IsoDateTime
  action: AuditAction
  actorId: string
  actorName: string
  /** What was acted on — `rider` / `captain` / `posting` / `plan` / `gateway`. */
  subjectType: string
  subjectId: string
  /** `null` on acts that move no money (a gateway toggle). Integer halalas otherwise. */
  amountHalalas: Halalas | null
  /** Required on every money movement in this wave (§10.3 rule 2). */
  reasonCode: string | null
  /** Free-text operator note, when the surface asks for one. */
  note: string | null
  /** Keyed, not assembled. See `LocalisedText`. */
  detail: LocalisedText
}
