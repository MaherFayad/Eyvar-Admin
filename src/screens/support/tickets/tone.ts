/**
 * The two tone maps both ticket screens read.
 *
 * They are **exhaustive `Record`s over the closed unions**, not
 * `Record<string, …>` with a `?? 'neutral'` at every call site. The difference
 * is not style: a sixth `TicketStatus` is a compile error here and a silent
 * grey badge there, and a status nobody assigned a tone to is exactly the
 * defect R7 exists to catch.
 *
 * Rules applied
 *   R7         the five-tone badge palette is CLOSED. `Critical` and `High`
 *              share `warning` because there is no red badge to escalate into
 *              (R5a) — the WORD carries the distinction, which is R4-10's
 *              ruling for Safety and holds here for the same reason.
 */

import type { BadgeTone, TicketPriority, TicketStatus } from '@/data/types'

export const STATUS_TONE: Record<TicketStatus, BadgeTone> = {
  open: 'warning',
  'in-progress': 'info',
  waiting: 'neutral',
  resolved: 'success',
  closed: 'neutral',
}

export const PRIORITY_TONE: Record<TicketPriority, BadgeTone> = {
  Critical: 'warning',
  High: 'warning',
  Medium: 'info',
  Low: 'neutral',
}
