/**
 * Notification centre — foundation spec §4.3.2.
 *
 * Legacy `DB.notifications` (`eyvar_ops_panel_v40_fixed.html:2773`) is
 * `{id,type,title,desc,time,read}`. Three things change on the way across:
 *
 *   `time: '07:55' | 'Yesterday' | '2 days ago'` → ISO. Display strings cannot
 *      be sorted or localised, and the panel sorts.
 *   `priority` becomes a **field**, not a regex. Legacy infers it from the type
 *      plus keyword matching on the title (`notifPriority`, `:2188`), which
 *      means an Arabic title scores `low` regardless of content. The server
 *      computes it; the client reads it.
 *   `route` replaces `handleNotifClick`'s switch (`:2273`). A notification's
 *      destination is a route in the new table.
 */

import type { IsoDateTime } from './common'

/**
 * Legacy `notifIcon` covers ten (`:2171`). All ten are typed; §4.3.2 records
 * that `renewal`, `approval` and `complaint` have full icon/priority/routing
 * support and **no runtime producer** — they are seeded and nothing else emits
 * them. Kept because the seeds exist and the routing is designed.
 */
export type NotificationType =
  | 'alert'
  | 'ticket'
  | 'renewal'
  | 'approval'
  | 'payout'
  | 'complaint'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'

/** Legacy `NOTIF_PRIORITY_RANK` (`:2186`). Sorting is priority-first, never recency alone. */
export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low'

export const NOTIFICATION_PRIORITY_RANK: Record<NotificationPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export interface Notification {
  id: string
  type: NotificationType
  /** Priority is server-computed and arrives resolved. Do not re-infer it in a component. */
  priority: NotificationPriority
  title: string
  body: string | null
  createdAt: IsoDateTime
  read: boolean
  /**
   * Where clicking goes. `null` is a **real and currently common** case:
   * `alert` is the most-produced runtime type (16 producers) and has no click
   * destination in `handleNotifClick` — §4.3.2 lists it as one of three defects
   * to fix on the way. A null route renders a row with no navigation
   * affordance rather than a row that silently does nothing.
   */
  route: string | null
  /** The entity the notification is about, for the `?entity=` overlay. */
  entityId: string | null
  entityType: string | null
}

/** Bell popover preview size — legacy `NOTIF_PANEL_PREVIEW = 8` (`:2197`). */
export const NOTIFICATION_PREVIEW_SIZE = 8

/** §4.3.2 — the expanded layer's six filter chips, over the four priority tiers. */
export type NotificationFilter = 'all' | 'unread' | NotificationType

export interface NotificationSummary {
  /** Drives the bell badge. **No badge at zero** (§8.3, `notif-unread-zero`). */
  unread: number
  total: number
}
