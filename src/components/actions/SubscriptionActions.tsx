/**
 * **A subscription's three commands, mounted on the record sheet** — the footer
 * row and the two forms behind it.
 *
 * The queue offers `Freeze`, `Change captain` and `Cancel and settle` on every
 * row; the owner asked for the same three on the sheet that row opens. This is
 * that, and every part of it that could have become a second answer is instead
 * a call into `./subscription.ts`:
 *
 * | | comes from |
 * |---|---|
 * | who may run it, and the sentence when they may not | `freezeRefusal` · `cancelRefusal` · `reassignRefusal` |
 * | the write, its toast, its error contract | `runFreeze` · `runCancel` |
 * | the five termination reasons | `SETTLE_REASONS` |
 * | the form | `FreezeModal` · `CancelSettleModal` · `ChangeDriverModal`, the queue's own |
 *
 * So there is nothing here for the two surfaces to disagree about. What is
 * local is only which controls are on this footer and what happens after a
 * write lands — the sheet re-reads its one record, where the queue holds an
 * override over a paged list.
 *
 * ## §5.5, suspended knowingly
 *
 * A modal may not open inside a drawer. These forms are modals, and mounting
 * them here breaks that rule. It was put to the owner as a choice against the
 * in-place expansion §4.7 / §6.4 would otherwise give, and **the owner chose to
 * reuse the existing modals** — one confirmation implementation, at the cost of
 * being two surfaces deep while it is open. `ActionBar`'s header carries the
 * full reasoning and what the way back looks like.
 *
 * ## `onDone` and why it is not a refetch here
 *
 * A write returns the updated record, and this component hands it up rather
 * than re-reading. The sheet's record is owned by `ProfileLayer`'s
 * `useProfileRecord`, and the honest way to refresh it is that read's own
 * `refetch` — one owner for the record, one for the write, and no third copy of
 * a `Subscription` living in this file.
 */

import { useState } from 'react'
import type { Subscription } from '@/data/types'
import type { Language, Translate } from '@/lib'
import { ActionBar, type SheetAction } from './ActionBar'
import { CancelSettleModal } from './CancelSettleModal'
import { ChangeDriverModal } from './ChangeDriverModal'
import { FreezeModal } from './FreezeModal'
import {
  SETTLE_REASONS,
  cancelRefusal,
  freezeRefusal,
  reassignRefusal,
  runCancel,
  runFreeze,
} from './subscription'

export interface SubscriptionActionsProps {
  subscription: Subscription
  /** Whether this operator holds the write permission. Gates every command. */
  canWrite: boolean
  onOpenFullRecord: () => void
  /** Called after a write lands, so the owner of the record can re-read it. */
  onDone: () => void
  t: Translate
  language: Language
}

export function SubscriptionActions({
  subscription,
  canWrite,
  onOpenFullRecord,
  onDone,
  t,
  language,
}: SubscriptionActionsProps) {
  const [freezing, setFreezing] = useState(false)
  const [settling, setSettling] = useState(false)
  const [reassigning, setReassigning] = useState(false)

  /* D17 / D21 rule 5 — a permission refusal outranks every domain refusal, and
     the same `roleReason` the queue builds. */
  const context = {
    roleReason: canWrite ? null : t('subs.action.noPermission'),
    t,
    language,
  }
  /* **A set of one.** The predicates take an array because the queue's bulk bar
     does, and passing `[record]` here is what makes a single record impossible
     to refuse differently from the same record inside a selection. */
  const one = [subscription]
  const freeze = freezeRefusal(one, context)
  const cancel = cancelRefusal(one, context)
  const reassign = reassignRefusal(context)

  const actions: SheetAction[] = [
    {
      id: 'subscription-change-driver',
      label: t('subs.action.changeDriver'),
      onSelect: () => setReassigning(true),
      /* §11.2 — rendered, refused, and the sentence says the write does not
         exist rather than implying the operator lacks a permission. */
      disabled: true,
      reason: reassign,
    },
    {
      id: 'subscription-freeze',
      label: t('subs.action.freeze'),
      onSelect: () => setFreezing(true),
      disabled: freeze.refused,
      reason: freeze.reason,
    },
    {
      id: 'subscription-cancel',
      label: t('subs.action.cancel'),
      onSelect: () => setSettling(true),
      disabled: cancel.refused,
      reason: cancel.reason,
    },
  ]

  return (
    <>
      <ActionBar
        onOpenFullRecord={onOpenFullRecord}
        openLabel={t('shell.layer.openFullProfile')}
        actions={actions}
      />

      <FreezeModal
        subscriptions={freezing ? one : []}
        onClose={() => setFreezing(false)}
        onConfirm={async (subs, until) => {
          await runFreeze(subs, until, { onRecord: onDone, t, language })
          setFreezing(false)
        }}
        language={language}
        t={t}
      />

      <CancelSettleModal
        subscription={subscription}
        reasonKeys={SETTLE_REASONS}
        open={settling}
        onClose={() => setSettling(false)}
        onConfirm={async (_id, reason) => {
          await runCancel(subscription, reason, { onRecord: onDone, t, language })
          setSettling(false)
        }}
        language={language}
        t={t}
      />

      {/* Refused for every row and every role — there is no client operation
          behind it. Mounted anyway, because §11.2 puts the refusal on a control
          an operator can see rather than removing the control. */}
      <ChangeDriverModal
        subscription={reassigning ? subscription : null}
        open={reassigning}
        onClose={() => setReassigning(false)}
        onConfirm={() => Promise.reject(new Error(reassign))}
        unavailableReason={reassign}
        t={t}
      />
    </>
  )
}
