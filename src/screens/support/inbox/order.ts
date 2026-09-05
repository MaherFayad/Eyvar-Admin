/**
 * The inbox list's order (design 12 §3.1, D22): first-response breaches first,
 * oldest waiting first among them; then the nearest running clock; then
 * `waitingSince` ascending with `null` last. Not user-sortable.
 */

import type { Conversation, IsoDateTime } from '@/data/types'
import { conversationSla, runningClock, type ConversationSla } from '../conversations/sla'

export interface InboxRow {
  conversation: Conversation
  sla: ConversationSla
  /** The one running clock's deadline, or `null` when nothing is running. */
  dueAt: IsoDateTime | null
}

export function decorateRow(conversation: Conversation, now: IsoDateTime): InboxRow {
  const sla = conversationSla(conversation)
  const running = runningClock(conversation, sla, now)
  return {
    conversation,
    sla,
    dueAt: running.result.clock.kind === 'no-clock' ? null : running.input?.dueAt ?? null,
  }
}

export function compareInboxRows(a: InboxRow, b: InboxRow): number {
  if (a.sla.firstResponseBreached !== b.sla.firstResponseBreached) {
    return a.sla.firstResponseBreached ? -1 : 1
  }
  if (a.sla.firstResponseBreached) {
    return rank(a.conversation.waitingSince) - rank(b.conversation.waitingSince)
  }
  const byClock = rank(a.dueAt) - rank(b.dueAt)
  if (byClock !== 0) return byClock
  return rank(a.conversation.waitingSince) - rank(b.conversation.waitingSince)
}

function rank(at: IsoDateTime | null): number {
  return at === null ? Number.MAX_SAFE_INTEGER : Date.parse(at)
}
