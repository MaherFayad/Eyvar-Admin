/**
 * The two settlements on a **money dispute** — D9, F6.
 *
 * Legacy offered `Uphold — refund 1 trip` and `Goodwill credit (50%)` as two
 * buttons with the amount computed into the label
 * (`eyvar_ops_panel_v40_fixed.html:14424`, `:14426`). The amount is now the
 * operator's, bounded by the claim, because `resolveDispute` refuses a
 * settlement above `dispute.amountHalalas` (422, `amount_above_claim`) and
 * refuses any amount at all on a declined claim (422, `amount_not_zero`).
 * Both refusals are restated by the **shape of the two commands**: one carries
 * an amount field, the other has none.
 *
 * ## `scope: 'route'`, hidden from the palette — CM-4
 *
 * A dispute has **no `ProfileEntityType`**, so `search()` cannot rank one and
 * `TARGET_SOURCES` has nowhere to put it. Same sentence as `safety.ts` and
 * `cash.ts`; same report to mock-data-engineer. The complaint a dispute
 * escalated from *is* findable (`complaints.ts`), which is the nearest ⌘K can
 * currently get.
 *
 * ## Neither offers an undo
 *
 * *"The money moves before the verdict is recorded"* — `clients/disputes.ts`
 * mints a `Refund`, posts to the ledger and, on the captain path, writes a
 * settlement entry. Money left the console on the refund arm; on the declined
 * arm there is no reopen operation. D18 fails both ways.
 */

import { ApproveIcon, RejectIcon } from '@/components/icons'
import { resolveDispute } from '@/data/clients'
import type { Dispute } from '@/data/types'
import { formatMoney } from '@/lib'
import { blockedBy } from './refusal'
import { roleRefusal, type Command, type CommandRegistry } from './registry'

/** The permission `DisputesScreen` computes `canWrite` from — **Q4**. */
const WRITE_PERMISSION = 'handle_disputes'

const NO_PROFILE_ENTITY =
  'A dispute has no ProfileEntityType, so the palette has no way to find one as a target.'

/** `resolveDispute`'s own 409, restated at render. */
function isResolved(dispute: Dispute): boolean {
  return dispute.status === 'resolved'
}

/* ──────────────────────────────── commands ──────────────────────────────── */

/**
 * Pay the claim. The field opens on the **full amount claimed** and may be
 * lowered — which is how `partial-refund` is reached without a third command:
 * the outcome follows the number, and the number is the operator's.
 */
const refund: Command<Dispute> = {
  id: 'dispute.refund',
  titleKey: 'dispute.action.refund',
  compactTitleKey: 'dispute.bulk.refund',
  section: 'do',
  keywords: [
    'refund dispute',
    'uphold claim',
    'settle',
    'pay claim',
    'partial refund',
    /* Legacy's own button, verbatim (`:14424`), and the legacy page id. */
    'uphold refund 1 trip',
    'disputes',
    'استرداد',
    'قبول المطالبة',
    'تسوية',
    'نزاع',
  ],
  icon: ApproveIcon,
  scope: { kind: 'route', subTabId: 'support-disputes' },
  affordance: 'decision-affirm',
  arity: 'needs-input',
  hiddenFromPalette: NO_PROFILE_ENTITY,
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'dispute.action.noPermission') ??
    blockedBy(ctx, isResolved, 'dispute.action.refund.blocked'),
  async run(ctx) {
    const target = ctx.targets[0]
    if (target === undefined) return null
    let refundHalalas = target.amountHalalas

    const note = await ctx.host.confirm({
      title: ctx.t('dispute.refund.title', {
        id: target.id,
        amount: formatMoney(target.amountHalalas),
      }),
      /* §5.7 rule 9 — the body says the money moves and cannot be recalled
         from here, and that the captain's standing is not decided by this. */
      body: ctx.t('dispute.refund.body'),
      confirmLabel: ctx.t('dispute.refund.confirm'),
      amount: {
        label: ctx.t('dispute.refund.amount.label'),
        help: ctx.t('dispute.refund.amount.help', { claim: formatMoney(target.amountHalalas) }),
        /* The client's `amount_above_claim`, said before the press. */
        message: ctx.t('dispute.refund.amount.message', {
          claim: formatMoney(target.amountHalalas),
        }),
        maxHalalas: target.amountHalalas,
        initialHalalas: target.amountHalalas,
        onChange: (value) => {
          refundHalalas = value
        },
      },
      reason: {
        label: ctx.t('dispute.note.label'),
        help: ctx.t('dispute.note.help'),
        message: ctx.t('dispute.note.message'),
      },
    })
    if (note === null) return null

    const { dispute } = await resolveDispute({
      disputeId: target.id,
      /* The outcome follows the number: anything short of the claim is a
         partial refund, and the record must say which it was. */
      outcome: refundHalalas >= target.amountHalalas ? 'full-refund' : 'partial-refund',
      refundHalalas,
      note,
    })
    return {
      message: ctx.t('dispute.toast.refunded', {
        id: dispute.id,
        amount: formatMoney(dispute.resolution?.refundHalalas ?? 0),
      }),
      changed: [dispute],
    }
  },
}

/**
 * The claim does not stand. No amount field at all: `resolveDispute` refuses a
 * non-zero settlement on this outcome by contract, and offering a box that may
 * only hold zero invites the 422 rather than preventing it.
 */
const decline: Command<Dispute> = {
  id: 'dispute.decline',
  titleKey: 'dispute.action.decline',
  compactTitleKey: 'dispute.bulk.decline',
  section: 'do',
  keywords: [
    'decline dispute',
    'reject claim',
    'no refund',
    'close claim',
    'unfounded',
    'disputes',
    'رفض المطالبة',
    'دون استرداد',
    'إغلاق النزاع',
    'نزاع',
  ],
  icon: RejectIcon,
  scope: { kind: 'route', subTabId: 'support-disputes' },
  affordance: 'decision-reject',
  arity: 'needs-input',
  hiddenFromPalette: NO_PROFILE_ENTITY,
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'dispute.action.noPermission') ??
    blockedBy(ctx, isResolved, 'dispute.action.decline.blocked'),
  async run(ctx) {
    const target = ctx.targets[0]
    if (target === undefined) return null
    const note = await ctx.host.confirm({
      title: ctx.t('dispute.decline.title', { id: target.id }),
      body: ctx.t('dispute.decline.body'),
      confirmLabel: ctx.t('dispute.decline.confirm'),
      reason: {
        label: ctx.t('dispute.note.label'),
        help: ctx.t('dispute.note.help'),
        message: ctx.t('dispute.note.message'),
      },
    })
    if (note === null) return null
    const { dispute } = await resolveDispute({
      disputeId: target.id,
      outcome: 'declined',
      refundHalalas: 0,
      note,
    })
    return {
      message: ctx.t('dispute.toast.declined', { id: dispute.id }),
      changed: [dispute],
    }
  },
}

export const DISPUTE_COMMANDS: CommandRegistry<Dispute> = [refund, decline]
