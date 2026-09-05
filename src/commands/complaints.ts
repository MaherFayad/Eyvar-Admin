/**
 * The two verdicts on a **rider complaint** — D9, F6.
 *
 * Legacy had one button, `Mark resolved` (`eyvar_ops_panel_v40_fixed.html:4375`),
 * which recorded that somebody had dealt with it and **not what they decided**.
 * `ComplaintResolution` is the type that fixed that, and these are the two
 * commands that write it: the outcome is a closed set, so it is two commands
 * rather than one with a picker — D8's paired decision affordance, the same
 * shape `cash.ts` uses.
 *
 * `partially-upheld` is deliberately not a third command. It is the same
 * decision as `upheld` with a smaller number in the amount field, and the
 * operator states the number either way; three rows to express two facts is
 * furniture.
 *
 * ## Compensation is bounded, and dismissal pays nothing
 *
 * `resolveComplaint` refuses a positive amount on `dismissed` (422,
 * `dismissed_pays_nothing`) — restated here by **not offering the field** on
 * that command, which is stronger than validating it. The upheld path carries
 * the amount, capped by the wallet authority envelope, because a compensation
 * credit is spent from the same ceiling as any other (§6.6, AC-384/AC-439).
 *
 * ## Neither offers an undo
 *
 * Money moves on the upheld path (`expense.compensation`), and there is no
 * reopen operation for a resolved complaint on either. D18 fails on both
 * clauses; the confirmation is the net.
 *
 * ## CQ-7
 *
 * `unavailable` reads `status` and nothing else — `isOpenComplaint`, the data
 * layer's own predicate, so the render-time refusal and the 409 cannot word the
 * rule differently.
 */

import { ApproveIcon, RejectIcon } from '@/components/icons'
import { checkAdjustmentAuthority, resolveComplaint } from '@/data/clients'
import { isOpenComplaint, type Complaint } from '@/data/types'
import { formatMoney } from '@/lib'
import { blockedBy } from './refusal'
import { roleRefusal, type Command, type CommandRegistry } from './registry'

/** The permission `ComplaintsScreen` computes `canWrite` from — **Q4**. */
const WRITE_PERMISSION = 'handle_complaints'

/** What the compensation field opens on, in halalas. 25.00 SAR. */
const DEFAULT_COMPENSATION_HALALAS = 2_500

function isDisposed(complaint: Complaint): boolean {
  return !isOpenComplaint(complaint.status)
}

/* ──────────────────────────────── commands ──────────────────────────────── */

/**
 * The rider was right. Compensation is optional — `0` with `outcome: 'upheld'`
 * says *"you were right and an apology is what this warrants"*, which is a real
 * verdict the type exists to allow.
 */
const uphold: Command<Complaint> = {
  id: 'complaint.uphold',
  titleKey: 'complaint.action.uphold',
  compactTitleKey: 'complaint.bulk.uphold',
  section: 'do',
  keywords: [
    'uphold complaint',
    'compensate rider',
    'agree',
    'side with rider',
    'pay out',
    /* Legacy's one button, verbatim (`:4375`), and the legacy page id. */
    'mark resolved',
    'complaints',
    'قبول الشكوى',
    'تعويض',
    'الموافقة',
    'شكوى',
  ],
  icon: ApproveIcon,
  scope: { kind: 'entity', entityType: 'complaint', plural: false },
  affordance: 'decision-affirm',
  arity: 'needs-input',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'complaint.action.noPermission') ??
    blockedBy(ctx, isDisposed, 'complaint.action.uphold.blocked'),
  async run(ctx) {
    const target = ctx.targets[0]
    if (target === undefined) return null

    /* The compensation ceiling is the wallet authority envelope's, server
       computed, read inside `run` (CQ-4). The rider is the payee. */
    const envelope = await checkAdjustmentAuthority(target.riderId, 0, 'compensation')
    let compensationHalalas = Math.min(DEFAULT_COMPENSATION_HALALAS, envelope.perCaseCapHalalas)

    const note = await ctx.host.confirm({
      title: ctx.t('complaint.uphold.title', { id: target.id, rider: target.riderName }),
      /* §5.7 rule 9 — what does NOT change: the captain's rating and their
         standing are decided by a fairness case, not by this. */
      body: ctx.t('complaint.uphold.body', { captain: target.driverName }),
      confirmLabel: ctx.t('complaint.uphold.confirm'),
      amount: {
        label: ctx.t('complaint.uphold.amount.label'),
        help: ctx.t('complaint.uphold.amount.help', {
          cap: formatMoney(envelope.perCaseCapHalalas),
        }),
        message: ctx.t('complaint.uphold.amount.message', {
          role: envelope.appliedRole,
          cap: formatMoney(envelope.perCaseCapHalalas),
        }),
        maxHalalas: envelope.perCaseCapHalalas,
        initialHalalas: compensationHalalas,
        onChange: (value) => {
          compensationHalalas = value
        },
      },
      reason: {
        label: ctx.t('complaint.note.label'),
        help: ctx.t('complaint.note.help'),
        message: ctx.t('complaint.note.message'),
      },
    })
    if (note === null) return null

    const changed = await resolveComplaint(target.id, {
      outcome: 'upheld',
      compensationHalalas,
      note,
    })
    return {
      message: ctx.t('complaint.toast.upheld', {
        id: changed.id,
        amount: formatMoney(changed.resolution?.compensationHalalas ?? 0),
      }),
      changed: [changed],
    }
  },
}

/**
 * The complaint does not stand. **Claimant-neutral by design** — `dismissed`
 * says what happened to the complaint, not what anyone thinks of the person who
 * filed it, and the copy follows the type.
 *
 * No amount field: `resolveComplaint` refuses a positive amount on this outcome
 * by contract, and a field that can only hold zero is a field that will one day
 * hold something else.
 */
const dismiss: Command<Complaint> = {
  id: 'complaint.dismiss',
  titleKey: 'complaint.action.dismiss',
  compactTitleKey: 'complaint.bulk.dismiss',
  section: 'do',
  keywords: [
    'dismiss complaint',
    'reject complaint',
    'no case',
    'close without action',
    'unfounded',
    'mark resolved',
    'complaints',
    'رفض الشكوى',
    'إغلاق دون إجراء',
    'لا أساس',
    'شكوى',
  ],
  icon: RejectIcon,
  scope: { kind: 'entity', entityType: 'complaint', plural: false },
  affordance: 'decision-reject',
  arity: 'needs-input',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'complaint.action.noPermission') ??
    blockedBy(ctx, isDisposed, 'complaint.action.dismiss.blocked'),
  async run(ctx) {
    const target = ctx.targets[0]
    if (target === undefined) return null
    const note = await ctx.host.confirm({
      title: ctx.t('complaint.dismiss.title', { id: target.id, rider: target.riderName }),
      body: ctx.t('complaint.dismiss.body', { rider: target.riderName }),
      confirmLabel: ctx.t('complaint.dismiss.confirm'),
      reason: {
        label: ctx.t('complaint.note.label'),
        help: ctx.t('complaint.note.help'),
        message: ctx.t('complaint.note.message'),
      },
    })
    if (note === null) return null
    const changed = await resolveComplaint(target.id, {
      outcome: 'dismissed',
      compensationHalalas: 0,
      note,
    })
    return {
      message: ctx.t('complaint.toast.dismissed', { id: changed.id }),
      changed: [changed],
    }
  },
}

export const COMPLAINT_COMMANDS: CommandRegistry<Complaint> = [uphold, dismiss]
