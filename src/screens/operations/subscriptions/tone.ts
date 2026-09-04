/**
 * A cycle's status → its badge tone, for the Subscriptions table.
 *
 * Lifted out of `SubscriptionDetailDrawer` when that drawer was retired: the
 * record it showed is `?entity=SUB-*` now — one address and one arrangement,
 * the move `TripsScreen` made first for exactly the same reason, so that a
 * cycle opened from this table and the same cycle opened from a rider's profile
 * are not two different sheets showing two subsets of one record. This map was
 * the only thing in that file with a second consumer.
 *
 * **R5a — there is no red badge.** `cancelled` and `expired` are terminal
 * factual outcomes and take `neutral`; `expiring` and `at-risk` are both *needs
 * attention* and take the ONE warning tone (R17), differing by label rather
 * than by hue.
 *
 * It agrees with `components/profile/domain.ts`'s `SUBSCRIPTION_STATUS` by
 * construction — same six states, same readings — and the two are separate only
 * because that one also carries the copy keys the record sheet renders and this
 * table does not.
 */

import type { SubscriptionStatus } from '@/data/types'

export const SUBSCRIPTION_TONE: Readonly<
  Record<SubscriptionStatus, 'success' | 'warning' | 'info' | 'neutral' | 'new'>
> = {
  active: 'success',
  expiring: 'warning',
  'at-risk': 'warning',
  frozen: 'info',
  cancelled: 'neutral',
  expired: 'neutral',
}
