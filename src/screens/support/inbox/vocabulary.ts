/**
 * The console's closed sets, as maps — one source for the queue row, the thread
 * pane and the close confirmation.
 *
 * Three files render a channel badge and a status badge. Three copies of the
 * tone map is three chances for the drawer to disagree with the row about what
 * `snoozed` looks like, which is the class of drift `DESIGN.md` R7 exists to
 * stop.
 *
 * **The tone map is `types/conversation.ts`'s, not this file's.** Its own header
 * states it: *"Badge tones (DESIGN.md R7, five tones, no sixth): `waiting` →
 * `warning` · `active` → `info` · `snoozed` → `neutral` · `closed` →
 * `success`."* Copied here as code because a comment is not enforceable, and
 * annotated so a change goes back to the type first.
 */

import type {
  BadgeTone,
  ConversationChannel,
  ConversationCloseReason,
  ConversationStatus,
} from '@/data/types'

export const CHANNEL_KEY: Readonly<Record<ConversationChannel, string>> = {
  chat: 'conversations.channel.chat',
  email: 'conversations.channel.email',
  whatsapp: 'conversations.channel.whatsapp',
  phone: 'conversations.channel.phone',
}

export const STATUS_KEY: Readonly<Record<ConversationStatus, string>> = {
  waiting: 'conversations.status.waiting',
  active: 'conversations.status.active',
  snoozed: 'conversations.status.snoozed',
  closed: 'conversations.status.closed',
}

/** R7's five tones, no sixth. See the header: this map belongs to the type. */
export const STATUS_TONE: Readonly<Record<ConversationStatus, BadgeTone>> = {
  waiting: 'warning',
  active: 'info',
  snoozed: 'neutral',
  closed: 'success',
}

/**
 * The four dispositions `ConversationCloseReason` permits. Deliberately short:
 * a per-channel reason taxonomy is Admin › Reasons (**P6-T3**) and belongs
 * there, which is the type's own note.
 */
export const CLOSE_REASONS: readonly ConversationCloseReason[] = [
  'resolved',
  'no-response',
  'duplicate',
  'spam',
]

export const CLOSE_REASON_KEY: Readonly<Record<ConversationCloseReason, string>> = {
  resolved: 'conversations.reason.resolved',
  'no-response': 'conversations.reason.noResponse',
  duplicate: 'conversations.reason.duplicate',
  spam: 'conversations.reason.spam',
}
