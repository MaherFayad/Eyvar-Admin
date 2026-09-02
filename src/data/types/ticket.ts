import type { IsoDateTime } from './common'
import type { ConversationChannel } from './conversation'

export type TicketPriority = 'Critical' | 'High' | 'Medium' | 'Low'
export type TicketStatus = 'open' | 'in-progress' | 'waiting' | 'resolved' | 'closed'

export interface TicketMessage {
  id: string
  senderId: string
  senderName: string
  senderType: 'customer' | 'agent' | 'system'
  body: string
  sentAt: IsoDateTime
}

/* ── the call wrap-up (P5-T2) ─────────────────────────────────────────
 *
 * `LogCallModal` collected an outcome and a note and threw both away:
 * `TicketDetailScreen.tsx:86` declared `handleLogCallConfirm = () =>
 * toast.success(…)` — **no parameters at all**, so the arguments the modal
 * passed could not reach the handler even in principle. The operator saw
 * "Support call logged successfully" and nothing was logged.
 */

/**
 * How the call ended. A **closed** union, because the four options were already
 * a closed list inside the modal's `<Select>` and a free string cannot be
 * counted — *"how many calls end with the customer unreachable"* is the first
 * question anyone asks of a call log.
 *
 * Values are the modal's own, renamed from `snake_case` to the hyphenated form
 * every other union in this folder uses.
 */
export type TicketCallOutcome =
  | 'resolved-on-call'
  | 'escalated'
  | 'waiting-on-customer'
  | 'no-answer'

export const TICKET_CALL_OUTCOMES: readonly TicketCallOutcome[] = [
  'resolved-on-call',
  'escalated',
  'waiting-on-customer',
  'no-answer',
]

/**
 * One recorded call. It is **not** a `TicketMessage`: a message has a body an
 * operator wrote to a customer, and a call log has an outcome nobody typed and
 * a note nobody sent. Folding one into the other would make the outcome a
 * sentence, and a sentence cannot be filtered or translated.
 *
 * It renders **on the ticket's timeline**, interleaved with the messages by
 * time, which is the whole point of recording it.
 */
export interface TicketCallLog {
  /** `CALL-nnn`. Minted from a counter, never from the clock. */
  id: string
  outcome: TicketCallOutcome
  /** The operator's summary. `null` when they logged an outcome and no note. */
  notes: string | null
  loggedAt: IsoDateTime
  loggedByUserId: string
  loggedByUserName: string
}

export interface Ticket {
  id: string
  subject: string
  entityId: string
  entityName: string
  entityType: 'rider' | 'driver' | 'corporate'
  category: string
  reasonCode: string
  priority: TicketPriority
  status: TicketStatus
  ownerId: string | null
  ownerName: string | null
  createdAt: IsoDateTime
  slaDueAt: IsoDateTime | null
  slaBreached: boolean

  /* ── the conversation link (P5-T1) ───────────────────────────────────
   *
   * **Optional in this pass, and that is a deliberate, temporary compromise.**
   * `clients/tickets.ts` is being edited by another agent right now; a required
   * field would break every `Ticket` literal in it the moment both branches
   * meet. So both fields are `?` here, every fixture sets them explicitly, and
   * the follow-up is recorded below.
   *
   * **Follow-up, once `clients/tickets.ts` is free:**
   *   1. make both required (`conversationId: string | null`,
   *      `channel: ConversationChannel`) — an optional channel is exactly the
   *      "a reply composed with no idea where it goes" defect, only quieter;
   *   2. fold `TicketMessage` into `Message` (`types/conversation.ts`), which
   *      is P5-T1's other half. `TicketMessage` has no delivery state and no
   *      `visibility`, so a ticket reply today cannot be shown as failed and an
   *      internal note on a ticket is not expressible at all;
   *   3. `replyTicket()` becomes `replyConversation()` against the ticket's
   *      `conversationId`, so there is one reply path and not two.
   */

  /**
   * The thread this ticket is discussed in, when there is one. `null` for a
   * ticket raised internally that nobody has contacted the customer about —
   * a real state, and not the same as "not yet migrated".
   */
  conversationId?: string | null

  /**
   * Where a reply to this ticket **goes**. Absent today on tickets created
   * before the conversation model; treat absent as "unknown, ask before
   * replying" and never as a default channel.
   */
  channel?: ConversationChannel
  callGuideScript?: {
    scenario: string
    say: string
    do: string
    policyRef: string
  }
  messages: TicketMessage[]

  /**
   * Every call wrap-up recorded against this ticket, oldest first.
   *
   * **Required, not optional.** An optional array would let a ticket exist with
   * no answer to *"has anyone phoned this person"* — and `[]` is that answer,
   * clearly, where `undefined` is only the absence of the question.
   */
  callLogs: TicketCallLog[]
}
