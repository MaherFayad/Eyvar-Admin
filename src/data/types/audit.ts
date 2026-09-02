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
  /* P6-T3 — Admin › Policy. `policy.save` carries the changed field paths in
     `detail.params.fields`, which is what makes a save that flattens tier
     inheritance (legacy F-014) visible in the log rather than silent. */
  | 'policy.save'
  | 'reasonCode.create'
  | 'reasonCode.save'
  | 'reasonCode.retire'
  | 'reasonCode.restore'
  /* P6-T5 / P6-T8 — Admin › Team & Access, and P6-T1 for Admin › Workspace.
     The lifecycle transitions and the two admin panes that write. The union is
     closed on purpose — *"an audit log whose `action` is free text cannot be
     filtered"* — so a new mutating surface adds its verbs here rather than
     casting past the type. `amountHalalas` is `null` on every one of them:
     none moves money, which is exactly what the Activity table's `—` means. */
  | 'team.invite'
  | 'team.inviteResend'
  | 'team.inviteRevoke'
  | 'team.suspend'
  | 'team.reinstate'
  | 'team.offboard'
  | 'team.permissions'
  | 'team.sessionRevoke'
  | 'team.securityPolicy'
  | 'team.rota'
  | 'workspace.update'
  | 'workspace.logo'
  | 'legal.reconsent'
  /* P6-T2 / P6-T4 — Admin › Communications and Admin › Data & Integrity. Both
     panes shipped their writes before this union had an arm for them, so the
     acts below are **currently unaudited at the call site**: the members exist,
     the `appendAudit` calls do not. That is a gap, not a completed handoff.

     `senderIdentity.setDefault` matters most of the three. Changing which
     address the product sends as is invisible to everyone except the recipient,
     and it is the one act on that screen whose blast radius is every
     transactional email the system sends afterwards.

     Named `<subject>.<verb>` like every other member — `email.sender.setDefault`
     was the shape requested, and three segments would have been the only one
     here. `retention.save` likewise, over `settings.retention`: the subject is
     the policy, not the pane it is edited on. Legacy calls it
     `edit_data_window` (`:20520`). */
  | 'senderIdentity.setDefault'
  | 'emailTemplate.save'
  | 'retention.save'
  /* P6-T10 — Admin › Workspace › Integrations. Seven acts on credentials that
     authenticate a third party against this product, which is why they are here
     rather than left for later: a key issued and revoked with no audit row is a
     credential nobody can prove the lifetime of.

     `apiKey.rotate` carries the most weight. Rotation is the *support path* for
     a lost secret — the credential is shown exactly once and is not stored — so
     the log is the only record that the key an integration is failing on today
     is not the key it was issued with. */
  | 'apiKey.issue'
  | 'apiKey.rotate'
  | 'apiKey.revoke'
  | 'webhook.create'
  | 'webhook.update'
  | 'webhook.rotateSecret'
  | 'webhook.replay'
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
