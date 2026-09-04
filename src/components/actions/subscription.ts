/**
 * **A subscription's three commands, as one declaration each.**
 *
 * `Freeze`, `Cancel and settle` and `Change captain` are now offered on two
 * surfaces — the Subscriptions queue and the record sheet the queue opens — and
 * the owner asked for exactly that (*"add the actions in the table to be
 * present also in the side sheet"*). The moment a command has two callers it
 * needs one declaration, or the two surfaces start disagreeing about **who may
 * run it and what happens when they do**.
 *
 * That is not a hypothetical. `SubscriptionsScreen`'s own comment already made
 * the argument for the row menu and the bulk bar: *"There is no separate
 * single-record path, which is what makes 'the two surfaces agree' structural
 * rather than a promise."* This file is that sentence extended one surface
 * further.
 *
 * ## What lives here, and what deliberately does not
 *
 * | here | not here |
 * |---|---|
 * | the refusal predicate — who may run it, and why not | which control renders it |
 * | the write, its toast and its error contract | where the control sits |
 * | the reason-code list, as copy KEYS | the form that collects one |
 *
 * The forms are the four components beside this file, and they stayed pure
 * presentation: they take records, a reason list and an `onConfirm` that does
 * the write. That split is why the sheet can reuse the queue's own modal
 * rather than growing a second confirmation — which is what the owner chose
 * when the two options were put to them, over the in-place expansion §5.5
 * would otherwise prefer. **§5.5 forbids a modal opening inside a drawer**, and
 * that conflict is real and is recorded at `SubscriptionActions`, where the
 * modals are actually mounted, rather than buried here.
 *
 * ## `record` is the caller's, and that is deliberate
 *
 * Every write returns the updated row, and each surface holds it differently —
 * the queue keeps an override map over its paged list, the sheet re-reads its
 * one record. Passing `onRecord` rather than owning the update is what lets one
 * write serve both without this file knowing what a table is.
 */

import { toast } from 'sonner'
import { cancelSubscription, freezeSubscription } from '@/data/clients'
import type { Subscription, SubscriptionStatus } from '@/data/types'
import { formatCount, formatMoney, type Language, type Translate } from '@/lib'
import { setRefusal, type SetRefusal } from '@/screens/operations/bulkRefusal'

/** The five termination reasons the settle form offers, as copy KEYS (AC-74). */
export const SETTLE_REASONS: readonly string[] = [
  'subs.reason.noDriver',
  'subs.reason.serviceFailure',
  'subs.reason.relocated',
  'subs.reason.vehicleBreakdown',
  'subs.reason.riderViolation',
]

/** The statuses no write can act on. The client raises 409 on both. */
const TERMINAL: readonly SubscriptionStatus[] = ['cancelled', 'expired']

export function isTerminalSubscription(sub: Subscription): boolean {
  return TERMINAL.includes(sub.status)
}

/** What every predicate below needs, and nothing about where it is rendered. */
export interface SubscriptionCommandContext {
  /** D17 / D21 rule 5 — a permission refusal outranks every domain refusal. */
  roleReason: string | null
  t: Translate
  language: Language
}

/**
 * **D21 over a set, and a set of one is the row's own answer.**
 *
 * The row menu passes an array of one and the bulk bar passes the selection, so
 * a single record can never be refused differently from the same record inside
 * a selection.
 */
export function freezeRefusal(
  targets: readonly Subscription[],
  { roleReason, t, language }: SubscriptionCommandContext,
): SetRefusal {
  return setRefusal({
    targets,
    getId: (sub) => sub.id,
    /* The client's own 409: `cancelled` and `expired` cannot be frozen. The
       predicate is the client's contract restated, not a second policy. */
    isBlocked: isTerminalSubscription,
    roleReason,
    blockedKeyPrefix: 'subs.action.freeze.blocked',
    t,
    language,
  })
}

export function cancelRefusal(
  targets: readonly Subscription[],
  { roleReason, t, language }: SubscriptionCommandContext,
): SetRefusal {
  return setRefusal({
    targets,
    getId: (sub) => sub.id,
    isBlocked: isTerminalSubscription,
    roleReason,
    blockedKeyPrefix: 'subs.action.cancel.blocked',
    t,
    language,
  })
}

/**
 * **The one refusal that is not about the record.** `Change captain` has no
 * client operation behind it at all, so it is refused for every row and every
 * role, and the sentence says which — *not connected yet*, rather than a
 * permission or a status. §11.2: never hidden.
 */
export function reassignRefusal({ roleReason, t }: SubscriptionCommandContext): string {
  return roleReason ?? t('subs.action.changeDriver.unavailable')
}

/* ── the writes ────────────────────────────────────────────────────────── */

export interface SubscriptionWriteContext {
  /** What the caller does with the updated rows. See the header. */
  onRecord: (updated: readonly Subscription[]) => void
  t: Translate
  language: Language
}

/**
 * **`Promise.all` over the client, never a toast on its own.** A bulk action
 * that only fires a toast is worse than none: it teaches an operator that
 * twelve records changed when nothing did.
 */
export async function runFreeze(
  subs: readonly Subscription[],
  until: string,
  { onRecord, t, language }: SubscriptionWriteContext,
): Promise<void> {
  const updated = await Promise.all(subs.map((sub) => freezeSubscription(sub.id, until)))
  onRecord(updated)
  toast(
    subs.length === 1
      ? t('subs.toast.frozen.one')
      : t('subs.toast.frozen.other', { count: formatCount(subs.length, language) }),
  )
}

export async function runCancel(
  sub: Subscription,
  reason: string,
  { onRecord, t }: SubscriptionWriteContext,
): Promise<void> {
  const updated = await cancelSubscription(sub.id, reason)
  onRecord([updated])
  /**
   * **The toast names the SERVER's refund, not the browser's estimate.**
   * `cancelSubscription` computes the settlement and returns it on
   * `refundedHalalas`; `CancelSettleModal` shows an estimate derived from
   * unused trips, and the two can disagree. Quoting the response is the only
   * figure a caller is entitled to assert.
   */
  toast(
    t('subs.toast.cancelled', {
      /* `formatMoney` deliberately takes NO language: §8.3.1 fixes `,`
         thousands and `.` decimals, and AC-73 requires a money value to read in
         the same character order in Arabic as in English. */
      amount: formatMoney(updated.refundedHalalas ?? 0),
    }),
  )
}
