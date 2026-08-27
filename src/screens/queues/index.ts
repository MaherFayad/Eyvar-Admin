/**
 * The §4 work-queue contract's public surface.
 *
 * Five sub-tabs across two workspaces consume this: Operations › Requests,
 * Trip Assurance and My Work; Support › Safety & Incidents and Captain
 * Fairness. A per-queue file may **narrow** what it takes from here; it may not
 * contradict it (`specs/02-work-queues.md` §4).
 *
 * **The copy dictionary is deliberately NOT re-exported here.** `copy.ts`
 * imports one type and nothing else; a barrel that also exports the components
 * would drag `ShellContext` — which imports the dictionary — into a cycle. That
 * is `operations/people`'s note and it is the same hazard.
 */

export { Absent, Cell, DateCell, Identity, MutedCell, NumCell, PairCell, SubjectIdentity } from './cells'
export { ConfirmDialog, type ConfirmChoiceOption, type ConfirmRequest } from './ConfirmDialog'
export { useNowIso, useRowActions, useRowOverrides, type RowActions, type RowFailure } from './hooks'
export {
  BreachBanner,
  QueuePage,
  QueueTable,
  useQueueMeta,
  useQueueViews,
  type QueueTableProps,
  type QueueViews,
} from './QueuePage'
export {
  CLAIM_EXPIRY_MINUTES,
  DecisionBadge,
  OwnerChip,
  SeverityBadge,
  SlaCell,
  SlaCountdown,
  queueClock,
  type QueueClockResult,
} from './queue'
