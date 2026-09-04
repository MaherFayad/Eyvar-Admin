/**
 * **Record commands, and the forms that confirm them** — shared by the queue a
 * record is listed on and the sheet that queue opens.
 *
 * The four forms moved here from `screens/operations/trips` and
 * `screens/operations/subscriptions` when the owner asked for the table's
 * actions to appear in the side sheet as well. They were always pure
 * presentation — records in, a reason list in, an `onConfirm` that does the
 * write — so nothing about them changed; what changed is that a component under
 * `components/` may now render them, which a screen-owned file could not have
 * allowed. The screens import them back from here, so their call sites are
 * unchanged.
 *
 * The `*.ts` modules beside them are the half that matters: **one declaration
 * per command** — its refusal predicate, its write, its toast and its reason
 * codes. Two surfaces offering one command must not hold two answers to *who
 * may run it*, and this is where that is made structural rather than promised.
 */

export { ActionBar, type ActionBarProps, type SheetAction } from './ActionBar'
export { CancelSettleModal } from './CancelSettleModal'
export { ChangeDriverModal } from './ChangeDriverModal'
export { FlagTripModal } from './FlagTripModal'
export { FreezeModal } from './FreezeModal'
export { SubscriptionActions, type SubscriptionActionsProps } from './SubscriptionActions'
export { TripActions, type TripActionsProps } from './TripActions'
export {
  SETTLE_REASONS,
  cancelRefusal,
  freezeRefusal,
  isTerminalSubscription,
  reassignRefusal,
  runCancel,
  runFreeze,
  type SubscriptionCommandContext,
  type SubscriptionWriteContext,
} from './subscription'
export {
  FLAG_REASONS,
  flagRefusal,
  runFlag,
  runUnflag,
  unflagRefusal,
  type TripCommandContext,
  type TripWriteContext,
} from './trip'
