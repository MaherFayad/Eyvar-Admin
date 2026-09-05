/**
 * Sender groups and day dividers for a message thread. Pure: no React, no
 * clock. Plan §2.2 (five-minute groups), design 12 §4.2 (notes and system lines
 * never share a group; a day divider starts one).
 */

import type { IsoDate, IsoDateTime } from '@/data/types/common'
import { RIYADH_TIME_ZONE, calendarDay, toDate } from './format/date'

/**
 * The least a thread needs to know about a message. `Message` satisfies it as
 * is; a `TicketMessage` maps `senderId` / `senderType` onto it. Only the
 * `'system'` kind is interpreted; `visibility` absent means `customer`.
 */
export interface GroupableMessage {
  id: string
  authorId: string | null
  authorKind: string
  sentAt: IsoDateTime
  visibility?: 'customer' | 'internal'
}

export interface MessageGroup<T extends GroupableMessage> {
  kind: 'group'
  authorId: string | null
  authorKind: T['authorKind']
  visibility: 'customer' | 'internal'
  messages: T[]
}

/** Rendered as the day divider before the first message of `date` in the operator's zone. */
export interface DayMarker {
  kind: 'day'
  date: IsoDate
}

export type ThreadItem<T extends GroupableMessage> = DayMarker | MessageGroup<T>

/** Five minutes, plan §2.2. */
export const GROUP_WINDOW_MS = 300_000

export interface GroupMessagesOptions {
  /** Defaults to `GROUP_WINDOW_MS`. */
  windowMs?: number
  /** Defaults to `RIYADH_TIME_ZONE`, as every date helper in `src/lib` does. */
  timeZone?: string
}

/**
 * `messages` in time order, oldest first. A message merges into the open group
 * when both are customer-visible, neither is `system`, the author matches and
 * it arrived within `windowMs` of the previous message on the same calendar
 * day. An out-of-order message is never merged; it starts its own group.
 */
export function groupMessages<T extends GroupableMessage>(
  messages: readonly T[],
  options: GroupMessagesOptions = {},
): ThreadItem<T>[] {
  const { windowMs = GROUP_WINDOW_MS, timeZone = RIYADH_TIME_ZONE } = options
  const items: ThreadItem<T>[] = []
  let open: MessageGroup<T> | null = null
  let previousMs = Number.NEGATIVE_INFINITY
  let day: IsoDate | null = null

  for (const message of messages) {
    const ms = toDate(message.sentAt).getTime()
    const messageDay = calendarDay(message.sentAt, timeZone)
    if (messageDay !== day) {
      items.push({ kind: 'day', date: messageDay })
      day = messageDay
      open = null
    }

    const visibility = message.visibility ?? 'customer'
    const gap = ms - previousMs
    const merges =
      open !== null &&
      visibility === 'customer' &&
      open.visibility === 'customer' &&
      message.authorKind !== 'system' &&
      open.authorKind !== 'system' &&
      open.authorId === message.authorId &&
      open.authorKind === message.authorKind &&
      gap >= 0 &&
      gap <= windowMs

    if (merges && open) {
      open.messages.push(message)
    } else {
      open = {
        kind: 'group',
        authorId: message.authorId,
        authorKind: message.authorKind,
        visibility,
        messages: [message],
      }
      items.push(open)
    }
    previousMs = ms
  }

  return items
}
