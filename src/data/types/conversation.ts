/**
 * The support conversation model — **P5-T1**, `OPERATOR-EXPERIENCE-PLAN.md`
 * §0.2 finding 5 and Phase 5a.
 *
 * ## Why this exists before anyone has decided which channels ship
 *
 * **P0-T4 is open.** Nobody has said whether web chat ships alone, whether
 * WhatsApp and email come with it, or whether there is a vendor (Twilio,
 * Intercom) or the console owns the transport. The plan's own instruction is
 * that the answer *"changes the transport and the sizing, **not** the schema"*
 * (§0.2, Phase 5 preamble) — so every channel-specific thing on this page is
 * either a value in one closed union or a nullable field, and there is not one
 * `if (channel === 'whatsapp')` shaped hole for a vendor to fill later.
 *
 * ## The three defects this shape exists to prevent
 *
 * **1. A reply composed with no idea where it goes.** `Ticket` has no channel
 * (`types/ticket.ts` before this pass), so `replyTicket()` writes a message
 * into a thread and the operator cannot tell whether the customer will read it
 * in an email client, a chat bubble or never. Channel is on the conversation
 * **and** restated on each message, because a conversation can be answered on
 * a second channel — a chat escalated to an email is one conversation with two
 * message channels, and losing that is losing the audit trail.
 *
 * **2. A failed send that looks identical to a delivered one.** Every outbound
 * message carries a `MessageDelivery`, and `failed` is a state in it. A console
 * that renders "sent" for a message the gateway bounced is worse than one with
 * no chat at all: the operator closes the ticket believing the customer was
 * answered.
 *
 * **3. An internal note leaking to the customer.** `visibility` is a field on
 * the message, never a convention about who the author is or what the body
 * starts with. `internal` and `customer` are the two values and there is no
 * third, so a renderer that forgets the check is a compile-visible omission
 * rather than a silent leak.
 *
 * ## What it reuses rather than reinvents
 *
 *   - the entity it is about → `ProfileEntityType` (`types/profile.ts`). A
 *     rider, a captain and a corporate contact are `rider`, `driver` and
 *     `corporate-account` — the same eleven-value union `?entity=` resolves and
 *     global search returns. **No parallel entity union.**
 *   - ownership → `Claim` (`types/common.ts`) and the claim state machine in
 *     `clients/requests.ts` (`nextClaim`, `liveClaim`). A chat queue is a
 *     queue; claim, release and take-over already exist, are tested, and mean
 *     one thing across five sub-tabs.
 *   - the clocks → `SlaTracked` (`types/workQueue.ts`), so `screens/queues/`
 *     renders a waiting chat's countdown with the component it already has.
 */

import type { Claim, IsoDateTime } from './common'
import type { ProfileEntityType } from './profile'
import type { WorkQueueRow } from './workQueue'

/* ──────────────────────────── the channel ───────────────────────────── */

/**
 * Where the conversation physically happens.
 *
 * A closed four-value union **decided by the product, not by a vendor**. If
 * P0-T4 comes back "web chat only", the other three values keep existing and
 * simply have no rows — which is strictly better than adding them back later,
 * because every switch, badge map and filter would have to be revisited.
 *
 *   `chat`      in-app / web chat. Session-scoped, presence and typing apply.
 *   `email`     threaded by subject. No presence, no typing, delivery is
 *               asynchronous and can bounce hours later.
 *   `whatsapp`  message-shaped like chat, delivered like email — a send can
 *               fail long after it was accepted, and read receipts are real.
 *   `phone`     a call. Carries **no customer-visible message**; the thread is
 *               the operator's call notes, which is why `CNV-106` in the
 *               fixtures is a conversation whose every message is internal.
 */
export type ConversationChannel = 'chat' | 'email' | 'whatsapp' | 'phone'

export const CONVERSATION_CHANNELS: readonly ConversationChannel[] = [
  'chat',
  'email',
  'whatsapp',
  'phone',
] as const

/** Whether a channel can carry presence and typing at all. Email cannot; a UI must not draw a dot for it. */
export function channelIsLive(channel: ConversationChannel): boolean {
  return channel === 'chat'
}

/**
 * Whether the transport reports a **read** receipt on this channel.
 *
 * `MessageDeliveryState` has always carried `read` with the caveat *"only some
 * channels report this"*, and the caveat was never written down anywhere a
 * `switch` could reach — so `scriptDelivery()` stopped at `delivered` and `read`
 * was reachable only from stored fixture data (design finding **F-7**).
 *
 *   `chat`      yes — the session is live and the client acknowledges.
 *   `whatsapp`  yes — *"read receipts are real"*, the channel union's own words.
 *   `email`     **no.** An open-tracking pixel is a guess about a mail client's
 *               image settings, not a fact about a human, and recording a guess
 *               as `read` is the same class of lie as a tick on an undelivered
 *               message.
 *   `phone`     no — there is no customer-visible message to read.
 *
 * A channel that does not report it is not *"unread"*: `delivered` is terminal
 * there, and a UI that renders a greyed-out read tick for email is inventing a
 * state the transport never had.
 */
export function channelReportsRead(channel: ConversationChannel): boolean {
  return channel === 'chat' || channel === 'whatsapp'
}

/* ──────────────────────────── the status ────────────────────────────── */

/**
 * The conversation's own state. **Not the same axis as ownership** — an
 * `active` conversation can be unclaimed (the operator released it mid-thread)
 * and a `waiting` one can be claimed (the operator holds it and has not
 * replied yet). Two fields, because collapsing them is how a queue loses the
 * row that somebody grabbed and then abandoned.
 *
 *   `waiting`   the customer spoke last and nobody has answered. **This is
 *               what the unassigned queue counts**, ordered by `waitingSince`.
 *   `active`    a live exchange, both sides have spoken since it opened.
 *   `snoozed`   deliberately parked until `snoozedUntil`. Not closed, not in
 *               the queue, and it comes back on its own.
 *   `closed`    disposed. `closedAt` and `closeReason` are stamped.
 *
 * Badge tones (DESIGN.md **R7**, five tones, no sixth):
 *   `waiting` → `warning` · `active` → `info` · `snoozed` → `neutral` ·
 *   `closed` → `success`.
 * If product-designer disagrees the map moves, but no status here needs a tone
 * the palette does not have.
 */
export type ConversationStatus = 'waiting' | 'active' | 'snoozed' | 'closed'

export const CONVERSATION_STATUSES: readonly ConversationStatus[] = [
  'waiting',
  'active',
  'snoozed',
  'closed',
] as const

/**
 * Why a conversation was closed. Deliberately short: these four are the
 * dispositions the console can *observe*. A reason taxonomy per channel is
 * Admin › Reasons (**P6-T3**) and belongs there, not here.
 */
export type ConversationCloseReason = 'resolved' | 'no-response' | 'duplicate' | 'spam'

/* ────────────────────────── the participants ────────────────────────── */

/**
 * What kind of thing is speaking. `system` covers the transport's own notices
 * ("the customer left the chat"), which are neither the operator nor the
 * customer and must not be attributed to either.
 */
export type ParticipantKind = 'customer' | 'operator' | 'system'

/**
 * One party to the conversation.
 *
 * `handle` is **the address on this channel** — an email address, an E.164
 * phone number, a chat session id — and it is `null` when there is none on
 * file. That is not a hypothetical: an email conversation opened from a ticket
 * whose rider has no email address is a real row (`CNV-110`), and the console
 * must refuse to send rather than queue a message into nothing. It is the
 * source of the one delivery failure a mock can produce honestly.
 */
export interface ConversationParticipant {
  /** `RDR-1041`, `USR-3`, or a transport-scoped id for a system participant. */
  id: string
  name: string
  kind: ParticipantKind
  /**
   * For a `customer`, which profile this is — the same union `?entity=`
   * resolves. `null` for an operator and for a system participant, neither of
   * which is a profile.
   */
  entityType: ProfileEntityType | null
  /**
   * **Every address this party is reachable at, by channel — F-3.**
   *
   * `handle` below is one address, on *this* conversation's channel, and that
   * is not enough for the control the composer already ships. `Reply by email`
   * on a **chat** conversation has to decide whether it can send at all, and
   * the only handle on the row is a chat session id — so the control could
   * neither enable itself honestly nor state why it was disabled. A composer
   * that offers a second channel needs the second channel's address.
   *
   * All keys optional, and the distinction between the two absences is the
   * point:
   *
   *   - **key missing** — we have never learned an address on that channel.
   *     *"No email address on file"*, and the operator can go and get one.
   *   - **key present, value `null`** — we looked and there is none.
   *     `CNV-110` is that row: an email conversation opened from a ticket whose
   *     rider has no email address, where the console must refuse to send
   *     rather than queue a message into nothing.
   *
   * A `Partial<Record<...>>` rather than four nullable fields, so adding a
   * channel is a change to `ConversationChannel` and nothing else — the same
   * reason P0-T4 could be left open in the first place.
   */
  handles: Partial<Record<ConversationChannel, string | null>>
  /**
   * The address on **this** conversation's channel — `handles[conversation.channel]`,
   * flattened onto the row so the thread header does not have to know the
   * channel to render the address.
   *
   * **It is an alias, not a second source of truth.** Where the two could
   * disagree, `handles` wins; `fixtures/integrity.test.ts` asserts they never
   * do. Kept because every existing reader uses it and because a header that
   * had to look up the channel to print one string would be worse.
   *
   * `null` = unreachable on this channel; a send must be refused, not queued.
   */
  handle: string | null
  joinedAt: IsoDateTime
  /** `null` while still in the conversation. A customer who closed the chat tab has left. */
  leftAt: IsoDateTime | null
}

/* ─────────────────────────── the messages ───────────────────────────── */

/**
 * **The field that stops an internal note from being sent to a customer.**
 *
 * Not `senderType === 'agent'` (an agent's reply is customer-visible), not a
 * `[internal]` prefix, not a UI-only toggle that never reaches the wire. One
 * field, two values, on the message, set at compose time and never inferred.
 */
export type MessageVisibility = 'customer' | 'internal'

/** Which way it travelled. An operator's internal note is `outbound` and undelivered — see `MessageDelivery`. */
export type MessageDirection = 'inbound' | 'outbound'

/**
 * The delivery lifecycle of one outbound message.
 *
 *   `queued`     accepted by us, not yet handed to the transport
 *   `sent`       handed over; the transport has it
 *   `delivered`  the transport confirms the device/mailbox has it
 *   `read`       the customer opened it. Only some channels report this
 *   `failed`     it will not arrive. `failureCode` says why
 *
 * **Forward-only except into `failed`**, which any state can enter: a WhatsApp
 * message accepted at 09:00 can bounce at 09:40. `deliveredAt` and friends are
 * not modelled as separate timestamps — `state` plus `updatedAt` is the pair
 * the UI renders, and a per-state timestamp set nobody reads is four more
 * fields to keep consistent.
 */
export type MessageDeliveryState = 'queued' | 'sent' | 'delivered' | 'read' | 'failed'

export const MESSAGE_DELIVERY_STATES: readonly MessageDeliveryState[] = [
  'queued',
  'sent',
  'delivered',
  'read',
  'failed',
] as const

/**
 * Terminal for the purposes of a retry affordance: only `failed` offers `Send
 * again`.
 *
 * **It now has an operation behind it** — `retryMessage()` in
 * `clients/conversations.ts`, which enforces the same predicate server-side and
 * refuses anything else with a 409. It was a predicate with nothing behind it
 * for the whole of P5, which is why §8.6.7 shipped an interim where `Send
 * again` restored the body into the composer and did not send.
 */
export function deliveryCanRetry(delivery: MessageDelivery | null): boolean {
  return delivery?.state === 'failed'
}

export interface MessageDelivery {
  state: MessageDeliveryState
  /** When it entered `state`. The only timestamp; see the note above. */
  updatedAt: IsoDateTime
  /**
   * Machine-readable, `null` unless `state === 'failed'`. Values seen so far:
   * `no_handle` (nowhere to send it), `bounced`, `rejected`, `expired`.
   * Not a closed union — a vendor will invent codes we have not met, and a
   * union here would force a schema change to record one.
   */
  failureCode: string | null
  /** Human-readable failure, for the row error. `null` unless `failed`. */
  failureMessage: string | null
  /**
   * The transport's own id for this message, once there is a transport.
   * `null` in mock mode and `null` until P0-T4 names a vendor. It exists now so
   * a support escalation can quote it without a migration.
   */
  providerMessageId: string | null
}

/**
 * One message in a conversation.
 *
 * Replaces `TicketMessage` as the thing a thread is made of. `TicketMessage`
 * survives this pass unchanged (another agent owns `clients/tickets.ts`); the
 * fold is the follow-up recorded on `Ticket.conversationId`.
 */
export interface Message {
  id: string
  conversationId: string
  /**
   * Restated per message, not only on the conversation. A chat escalated to
   * email keeps both halves in one thread and each message says which pipe it
   * actually went down.
   */
  channel: ConversationChannel
  direction: MessageDirection
  /** `null` for a `system` author, which has no identity to attribute. */
  authorId: string | null
  authorName: string
  authorKind: ParticipantKind
  /**
   * The message text, as typed. **Not pre-formatted and not concatenated** —
   * see `LocalisedText` in `types/common.ts` for why a server-assembled
   * sentence is untranslatable. A customer's own words are exempt: they are
   * content, not copy.
   */
  body: string
  visibility: MessageVisibility
  /**
   * The **current** delivery attempt.
   *
   * `null` **exactly when** `visibility === 'internal'` or `direction ===
   * 'inbound'`. An internal note is not delivered anywhere and an inbound
   * message already arrived, so a delivery state on either would be a
   * fabricated fact — and a `delivered` tick on a note is the exact confusion
   * that makes an operator think the customer saw it.
   */
  delivery: MessageDelivery | null
  /**
   * **Every superseded attempt, oldest first. Empty on a message nobody has
   * retried.**
   *
   * `retryMessage()` re-uses the message id — the transcript must show one
   * bubble for one sentence — but the failure it retries is a fact that
   * happened and **must not be rewritten**. That rule comes from
   * `clients/emails.ts`, where a resend is a **new** `EmailDelivery` row linked
   * by `resendOf` and the original bounce is never touched. The principle
   * transfers; the record does not, because an `EmailDelivery` *is* an attempt
   * and a `Message` is a **transcript line**. Minting a second `Message` to
   * record a second attempt would put the same sentence in the thread twice
   * while the customer received it once.
   *
   * So the attempt moves rather than being overwritten: on retry, the failed
   * `delivery` is pushed here and `delivery` becomes a fresh `queued`. The list
   * only grows, and `[...deliveryHistory, delivery]` is the full attempt log in
   * order.
   *
   * `[]` — never `null` — on a message with a delivery, **and** on one without.
   * A note has nothing to retry and an inbound message was never sent, so both
   * carry an empty list rather than a nullable field a renderer has to guard.
   */
  deliveryHistory: MessageDelivery[]
  /**
   * The email subject line **this message** was sent under, or `null` where the
   * channel has none.
   *
   * `Conversation.subject` is the *thread's* subject; this is the *message's*,
   * and the two are not the same the moment a chat is escalated to email
   * (**D19**: *"a chat escalated to an email is one conversation with two
   * message channels"*). On that conversation `Conversation.subject` is `null`
   * by design — chat has no subject — so without this field the escalated email
   * has no subject line an operator can author, which is design finding
   * **F-6**.
   *
   * **Non-null only where `channel === 'email'`.** Chat, WhatsApp and phone have
   * no subject and a fabricated one would be rendered as though the customer
   * had seen it; `messageSubjectIsWellFormed` below is the invariant and
   * `replyConversation` refuses a subject on any other channel with a 422.
   *
   * `null` on an **email** message is a real and different state: nothing was
   * authored, and the transport threads it under `Conversation.subject` or
   * derives one. That is v1's behaviour and it stays representable.
   */
  subject: string | null
  sentAt: IsoDateTime
  /**
   * Attachments, by reference. The console renders a chip and a download; the
   * bytes never cross this seam.
   */
  attachments: MessageAttachment[]
}

export interface MessageAttachment {
  id: string
  filename: string
  /** IANA media type, as the transport reported it. Never guessed from the extension. */
  contentType: string
  sizeBytes: number
  /** Signed, short-lived, resolved by the server. `null` while the upload is still in flight. */
  url: string | null
}

/** The delivery invariant above, as a predicate — asserted in `conversations.test.ts`. */
export function deliveryIsWellFormed(message: Message): boolean {
  const shouldHaveDelivery = message.visibility === 'customer' && message.direction === 'outbound'
  if (shouldHaveDelivery) return message.delivery !== null
  return message.delivery === null && message.deliveryHistory.length === 0
}

/**
 * `subject` is non-null **only** on an `email` message — the invariant stated
 * on the field, as a predicate, so a fixture and a mutation are checked by the
 * same code. Asserted in `conversations.test.ts`.
 */
export function messageSubjectIsWellFormed(message: Message): boolean {
  return message.channel === 'email' || message.subject === null
}

/**
 * Every delivery attempt for a message, oldest first — the superseded ones and
 * then the current one. `[]` on a message that was never delivered anywhere.
 *
 * The reader for `deliveryHistory`, so nothing outside this file has to
 * remember which end the current attempt goes on.
 */
export function deliveryAttempts(message: Message): MessageDelivery[] {
  return message.delivery === null
    ? [...message.deliveryHistory]
    : [...message.deliveryHistory, message.delivery]
}

/* ───────────────────────── the conversation ─────────────────────────── */

/**
 * A conversation with one customer on one channel.
 *
 * **Extends `WorkQueueRow`**, so it arrives with `id`, `claim` and the full
 * `SlaTracked` block and `screens/queues/` can render it with the claim
 * affordance, the confirm dialog and the SLA countdown that already exist
 * (P5-T4: *"a chat queue is a queue"*).
 *
 * ## Ownership is `claim`, and `assignee` is a view of it
 *
 * The plan asks for "an assignee (nullable — unassigned is the state the queue
 * works from)". That assignee is `claim.ownerId` when the claim is live, and
 * `null` otherwise — **one field, not two**. A separate `assigneeId` beside a
 * `claim` is two sources of truth for the same fact and they drift the first
 * time a take-over is recorded on one and not the other. Read it through
 * `conversationAssignee()` in `clients/conversations.ts`, which applies the
 * same 30-minute stale window (`liveClaim`) every other queue does.
 *
 * `transfer` is the one operation that writes an owner who is not the caller,
 * and it records a `ClaimTakeover` exactly as a take-over does.
 *
 * ## The SLA fields
 *
 * A chat carries D22's promise (`stampChatClocks`, `slaSource: 'chat-policy'`).
 * A conversation that belongs to a ticket inherits that ticket's reason-code
 * SLA (`slaSource: 'legacy-reason-code'`). Phone promises nothing (`unset`).
 */
export interface Conversation extends WorkQueueRow {
  /** `CNV-101`. Stable, string, server-minted. */
  id: string

  channel: ConversationChannel
  status: ConversationStatus

  /**
   * The email subject line, or `null` on a channel that has no such thing.
   * Chat and WhatsApp have no subject and a UI must render the first message
   * instead of an invented one.
   */
  subject: string | null

  /* ── who it is about ────────────────────────────────────────────────── */
  /**
   * The `ProfileRef` key, flattened. Three fields rather than an embedded
   * `ProfileRef` because a list of 200 conversations must not force the server
   * to resolve 200 profile section-stacks; the drawer calls `resolveProfile`
   * with exactly these two ids when it opens.
   */
  entityId: string
  entityType: ProfileEntityType
  /** The name as it should appear in the list. Denormalised on purpose — a list must not N+1. */
  entityName: string

  /* ── the people in it ───────────────────────────────────────────────── */
  participants: ConversationParticipant[]

  /* ── the thread ─────────────────────────────────────────────────────── */
  /**
   * **The most recent page of messages, oldest-first within the page** — not
   * necessarily the whole thread. `messageCount` is the true total and
   * `hasMoreBefore` says whether earlier messages exist.
   *
   * A screen that renders `messages.length` as the message count is wrong on
   * `CNV-108`, which is why both fields are here and why the fixture with 64
   * messages exists.
   */
  messages: Message[]
  /** Every message ever, including internal notes. Not `messages.length`. */
  messageCount: number
  /** `true` when `messages[0]` is not the first message in the thread. */
  hasMoreBefore: boolean

  /* ── freshness ──────────────────────────────────────────────────────── */
  /** `null` on a conversation with no messages at all — a real state (`CNV-107`). */
  lastMessageAt: IsoDateTime | null
  /**
   * One line for the list row. **Customer-visible messages only** — an internal
   * note must never surface as the preview, because the preview is the thing an
   * operator screen-shares.
   */
  lastMessagePreview: string | null
  /**
   * Who wrote the message `lastMessagePreview` shows — the newest
   * customer-visible one — so the list can tint a preview as ours or theirs
   * without loading the thread (CONTACT-CENTRE-REDESIGN-PLAN §2.1, §4).
   * `null` exactly when the preview is `null`. Derived, never stored.
   */
  lastMessageAuthorKind: ParticipantKind | null
  /**
   * When the oldest unanswered inbound arrived. **This is the queue's sort
   * key** — "oldest waiting first" (P5-T4). `null` when nothing is waiting,
   * which sorts last, exactly as `dueAt: null` does in My Work.
   */
  waitingSince: IsoDateTime | null
  /**
   * Inbound messages the reader has not opened. `0`, never `null`. The rule
   * (CONTACT-CENTRE-REDESIGN-PLAN §2.1, §4): an inbound customer message adds
   * one unless the reader holds the conversation; an outbound reply, a close
   * and `markConversationRead` reset it; an internal note leaves it alone.
   */
  unreadCount: number

  /* ── links ──────────────────────────────────────────────────────────── */
  /** The ticket this conversation is the thread of, when there is one. */
  ticketId: string | null

  /* ── lifecycle ──────────────────────────────────────────────────────── */
  createdAt: IsoDateTime
  /** `null` unless `status === 'snoozed'`. */
  snoozedUntil: IsoDateTime | null
  closedAt: IsoDateTime | null
  closeReason: ConversationCloseReason | null
}

/* ─────────────────────── the chat promise (D22) ─────────────────────── */

/** D22: a chat is answered within 45 s. Seconds, because `slaTargetMinutes` cannot carry 0.75 honestly. */
export const CHAT_FIRST_RESPONSE_SECONDS = 45

/** D22: a chat is finished within 20 min — a conversion prompt, not an escalation. */
export const CHAT_RESOLUTION_MINUTES = 20

/**
 * A chat's clock fields from the instant it opened, stamped from D22 the way
 * `stampTicketClocks` stamps a ticket. The SLA policy grid is keyed on
 * `WorkQueueId`, which has no chat member, so the two constants above stand in.
 * Breach fields stay `null`: a breach is a stamp, never `dueAt < now` (R5a).
 */
export function stampChatClocks(
  openedAt: IsoDateTime,
): Pick<
  Conversation,
  | 'slaStartedAt'
  | 'slaDueAt'
  | 'slaTargetMinutes'
  | 'slaBreachedAt'
  | 'slaSource'
  | 'firstResponseDueAt'
  | 'firstResponseBreachedAt'
> {
  const opened = Date.parse(openedAt)
  return {
    slaStartedAt: openedAt,
    slaDueAt: new Date(opened + CHAT_RESOLUTION_MINUTES * 60_000).toISOString(),
    slaTargetMinutes: CHAT_RESOLUTION_MINUTES,
    slaBreachedAt: null,
    slaSource: 'chat-policy',
    firstResponseDueAt: new Date(opened + CHAT_FIRST_RESPONSE_SECONDS * 1_000).toISOString(),
    firstResponseBreachedAt: null,
  }
}

/**
 * `Conversation.lastMessageAuthorKind`, derived: the author of the newest
 * customer-visible message, which is the message the preview shows. `null`
 * when there is none — an empty thread, or a phone thread of call notes.
 */
export function lastMessageAuthorKindOf(messages: readonly Message[]): ParticipantKind | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (message !== undefined && message.visibility === 'customer') return message.authorKind
  }
  return null
}

/* ─────────────────────── presence and typing ────────────────────────── */

/**
 * An operator's availability. Three values, from **P5-T6**'s own wording
 * ("Online / away / offline"), modelled here because `typing` and `presence`
 * ride the same subscription seam as messages (P5-T3).
 *
 * **The concurrent-chat cap is deliberately not here.** P5-T6 asks for "a
 * concurrent-chat cap per agent, and routing that respects both" — the cap is a
 * policy number nobody has set and routing is an unwritten rule. `activeCount`
 * is observable and is included; the cap is a question for product-owner.
 */
export type PresenceState = 'online' | 'away' | 'offline'

export interface AgentPresence {
  userId: string
  userName: string
  state: PresenceState
  /** Live conversations this operator holds a claim on. Derived, never stored. */
  activeCount: number
  /** Last observed activity. `null` for an operator who has never been online. */
  lastSeenAt: IsoDateTime | null
}

/** Who is typing, in which conversation, as of `at`. Expires on its own — see `TYPING_TTL_SECONDS`. */
export interface TypingState {
  conversationId: string
  actorId: string
  actorName: string
  actorKind: ParticipantKind
  typing: boolean
  at: IsoDateTime
}

/**
 * How long a `typing: true` stays true without a refresh.
 *
 * A typing indicator with no expiry is the classic bug: the customer closes
 * the tab mid-sentence and the operator watches "typing…" forever. Six seconds
 * matches the interval a client should re-publish at (three seconds), doubled.
 */
export const TYPING_TTL_SECONDS = 6

/* ──────────────────── the events, over the seam ─────────────────────── */

/**
 * Everything that can happen to a conversation while a screen is looking at
 * it, as a discriminated union on `type`.
 *
 * This is the **payload** vocabulary; the envelope (`topic`, `seq`, `at`)
 * belongs to `clients/realtime.ts`, exactly as `QueryParams` belongs to the
 * types and the wire encoding of it belongs to `clients/http.ts`.
 *
 * Every variant carries `conversationId` even when the topic implies it, so a
 * handler subscribed to the queue topic and one subscribed to a single
 * conversation read the same object.
 */
export type ConversationEvent =
  /** A message arrived or was accepted. `message.delivery` may still be `queued`. */
  | { type: 'message.created'; conversationId: string; message: Message }
  /** A delivery state moved. The only event that can turn a tick into a failure. */
  | {
      type: 'message.delivery'
      conversationId: string
      messageId: string
      delivery: MessageDelivery
    }
  /** Any scalar on the row changed — status, unread count, waiting clock. */
  | { type: 'conversation.updated'; conversationId: string; conversation: Conversation }
  /** Ownership moved. `claim: null` is a release. */
  | { type: 'conversation.claim'; conversationId: string; claim: Claim | null }
  /** A conversation entered the unassigned queue, or left it. Queue-topic only. */
  | { type: 'conversation.queued'; conversationId: string; waitingSince: IsoDateTime | null }
  | { type: 'typing'; conversationId: string; typing: TypingState }
  | { type: 'presence'; conversationId: string | null; presence: AgentPresence }

/** Narrowing helper, so a handler can switch without repeating the literal. */
export function isConversationEvent(value: unknown): value is ConversationEvent {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string'
}
