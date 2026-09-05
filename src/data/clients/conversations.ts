/**
 * Support conversations — **P5-T3**, the client for `types/conversation.ts`.
 *
 * Structurally a sibling of `clients/tickets.ts`: one `DATA_SOURCE` branch per
 * function, an endpoint comment above each, one operation id per call so QA can
 * fail it from the URL, and a mutable `dynamicConversations` array so a reply
 * sticks for the length of a session.
 *
 * What it adds that no other client has: **the write side has two halves.** A
 * mutation returns its result over the request seam, *and* announces it over
 * the subscription seam (`clients/realtime.ts`), because a second operator's
 * console has to stop offering a conversation the moment somebody grabs it. In
 * `http` mode the server does the announcing; in mock mode this file does, and
 * a screen cannot tell the difference.
 *
 * ## Claim semantics are not new here
 *
 * `nextClaim` and `liveClaim` come from `clients/requests.ts`, which is where
 * the four wave-2 queues already share them. That buys three properties for
 * free and they are the ones a chat queue needs most:
 *
 *   - **claimed by another operator** throws a `409 claimed_by_other` naming
 *     the holder, unless `takeOver: true` was sent deliberately;
 *   - a take-over is **recorded** as a `ClaimTakeover`, so "who had this before
 *     me" survives;
 *   - a claim idle past `OWNERSHIP_STALE_MINUTES` (30) is **already free**, so
 *     an operator who walked away at 02:00 does not hold a waiting customer
 *     hostage.
 *
 * `transfer` is the one operation `nextClaim` cannot express, because it names
 * an owner who is not the caller. It is written out below rather than bent into
 * the shared helper.
 *
 * ## The five §8.6 controls that used to ship dead
 *
 * The conversation console renders each of these and disables it in place with
 * a stated reason, because the seam could not express them. That is the right
 * interim and a poor destination, and this is where each one landed:
 *
 *   **`retryMessage`** — §8.6.7 `Send again`, design finding **F-2**. The
 *     message id is **re-used** and the failed attempt is preserved on
 *     `Message.deliveryHistory`; see the operation for why that departs from
 *     `clients/emails.ts`'s resend precedent at the record level and keeps it at
 *     the principle level.
 *   **`reopenConversation`** — §3.5's header primary on a closed thread. The
 *     other half of `close`, which has existed alone since P5.
 *   **`createTicketForConversation`** — D19's `Create ticket` and **AC-964**,
 *     writing `ticketId` on the conversation and `conversationId` on the ticket
 *     **in one mutation**. `createTicket` wrote `null` unconditionally and
 *     nothing stamped the conversation, so the specified control could not do
 *     its job.
 *   **`ReplyInput.channel` and `.subject`** — D19's `Reply by email` and finding
 *     **F-6**. A chat escalated to email can now carry a subject the operator
 *     wrote, on a conversation whose own `subject` is `null` by design.
 *   **`read`** — `scriptDelivery` advances into it where the channel reports
 *     receipts and the customer has not left (**F-7**). It was seeded on three
 *     rows and produced by nothing.
 *
 * ## Who is signed in
 *
 * `view=mine`, `heldByMe`, the reply author, the transfer record, typing and
 * presence all read **`currentMockUserId()`**, not `CURRENT_USER_ID`.
 * `clients/session.ts` names the defect that constant caused for older clients;
 * on this one it meant `switchMockUser` changed the shell and changed nothing
 * here — and since **D22 exempts `Owner` from the concurrent-chat cap and the
 * only seeded signed-in operator is an `Owner`**, the cap could not fire in the
 * running app at all.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW, toInstant } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { computeFacets, paginate, runQuery, type QueryShape } from '../mock/query'
import { ApiError, type Claim, type Facets, type IsoDateTime, type Paginated, type QueryParams } from '../types/common'
import { channelReportsRead } from '../types/conversation'
import type {
  AgentPresence,
  Conversation,
  ConversationChannel,
  ConversationCloseReason,
  ConversationEvent,
  ConversationStatus,
  Message,
  MessageDelivery,
  MessageVisibility,
  PresenceState,
} from '../types/conversation'
import type { ProfileEntityType } from '../types/profile'
import type { Ticket, TicketPriority } from '../types/ticket'
import { http } from './http'
import { liveClaim, nextClaim } from './requests'
import { currentMockUserId } from './session'
import { mintTicket, mirrorConversationReply } from './tickets'
import {
  emitMockEvent,
  enqueueMockEvent,
  publish,
  subscribe,
  type RealtimeEnvelope,
  type SubscribeOptions,
  type Unsubscribe,
} from './realtime'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let CNV_108_MESSAGES!: Fixtures['CNV_108_MESSAGES']
let agentPresenceFixtures!: Fixtures['agentPresenceFixtures']
let conversationFixtures!: Fixtures['conversationFixtures']
let teamUserFixtures!: Fixtures['teamUserFixtures']
onFixturesLoaded((f) => {
  CNV_108_MESSAGES = f.CNV_108_MESSAGES
  agentPresenceFixtures = f.agentPresenceFixtures
  conversationFixtures = f.conversationFixtures
  teamUserFixtures = f.teamUserFixtures
  /* Seeded here rather than at module load: these locals are built from
     late-bound fixtures, which are undefined until the fixture chunk lands. */
  dynamicConversations = [...conversationFixtures]
})

export const CONVERSATION_OPERATIONS = {
  list: 'conversations.list',
  get: 'conversations.get',
  messages: 'conversations.messages',
  facets: 'conversations.facets',
  claim: 'conversations.claim',
  release: 'conversations.release',
  transfer: 'conversations.transfer',
  close: 'conversations.close',
  snooze: 'conversations.snooze',
  reopen: 'conversations.reopen',
  reply: 'conversations.reply',
  retry: 'conversations.retry',
  createTicket: 'conversations.createTicket',
  typing: 'conversations.typing',
  presence: 'conversations.presence',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(CONVERSATION_OPERATIONS))

/* ──────────────────────────── the topics ────────────────────────────── */

/** Every unassigned conversation. What the grab-queue watches. */
export const CONVERSATION_QUEUE_TOPIC = 'conversations:queue'

/** Operator availability. Not per-conversation, so it is its own topic. */
export const PRESENCE_TOPIC = 'presence:agents'

/** One thread — messages, delivery, typing, claim changes. */
export function conversationTopic(id: string): string {
  return `conversation:${id}`
}

/* ──────────────────────────── the query ─────────────────────────────── */

export interface ConversationQuery extends QueryParams {
  channel?: ConversationChannel
  status?: ConversationStatus
  /** Only conversations linked to this ticket. */
  ticketId?: string
}

let dynamicConversations!: Conversation[]
let scenario: 'default' | 'empty' = 'default'

/**
 * Ids for messages minted in this session, `CMSG-9001` upward.
 *
 * **Not `CMSG-${Date.now()}`**, for the reason `clients/tickets.ts` sets out at
 * length and `mock/clock.ts` states as a rule: a clock-derived id differs on
 * every run, so nothing that diffs output can tell a real change from time
 * passing. Seeded at `9000` so a session-minted id is greppably distinct from
 * the fixtures' `CMSG-1xxx` and `CMSG-8xxx` and cannot collide with either.
 */
let messageSequence = 9_000

function nextMessageId(): string {
  return `CMSG-${(messageSequence += 1)}`
}

function rows(): Conversation[] {
  return scenario === 'empty' ? [] : dynamicConversations
}

/**
 * **Who is signed in — read from the session, not from `CURRENT_USER_ID`.**
 *
 * `clients/session.ts` states the rule and names the defect this repairs:
 * *"Reading `CURRENT_USER_ID` instead — as some older clients do — would make
 * `switchMockUser` invisible to it."* This client was one of the older clients,
 * and it mattered more here than anywhere else: `view=mine` and the `heldByMe`
 * filter both resolved against a module constant, so switching operator changed
 * the shell and changed nothing on this screen.
 *
 * **It is what makes D22's concurrent-chat cap reachable at all.** The cap
 * counts live chats held by the signed-in operator, D22 exempts `Owner` from it,
 * and `USR-1` — the only seeded signed-in operator — is an `Owner`. So the cap
 * could not fire in the running app under any sequence of clicks. Switching to
 * `USR-3` or `USR-4` (`Support`) now moves `view=mine` with it, which is the
 * whole of what the cap reads.
 *
 * In `http` mode none of this exists: the server resolves the caller from the
 * auth cookie and `view=mine` is its problem. Every reader below is inside a
 * `DATA_SOURCE === 'mock'` branch.
 */
function currentUserId(): string {
  return currentMockUserId()
}

/** The signed-in operator's team record, for an author name. `undefined` is tolerated by every caller. */
function currentUser(): { id: string; name: string } | undefined {
  const id = currentUserId()
  return teamUserFixtures.find((u) => u.id === id)
}

const conversationShape: QueryShape<Conversation> = {
  searchable: [
    (c) => c.id,
    (c) => c.entityName,
    (c) => c.entityId,
    (c) => c.subject,
    (c) => c.lastMessagePreview,
    (c) => c.ticketId,
  ],
  sortable: {
    id: (c) => c.id,
    entityName: (c) => c.entityName,
    channel: (c) => c.channel,
    status: (c) => c.status,
    createdAt: (c) => c.createdAt,
    lastMessageAt: (c) => c.lastMessageAt,
    /**
     * **The queue's order.** Oldest unanswered first; a conversation nobody is
     * waiting on has `null` here and `compare()` sorts nulls last, which is the
     * same rule My Work applies to an item with no clock — *"it has no clock,
     * so it cannot be more urgent than something that has one"*.
     */
    waitingSince: (c) => c.waitingSince,
    unreadCount: (c) => c.unreadCount,
    messageCount: (c) => c.messageCount,
  },
  filterable: {
    id: (c) => c.id,
    channel: (c) => c.channel,
    status: (c) => c.status,
    entityId: (c) => c.entityId,
    entityType: (c) => c.entityType,
    entityName: (c) => c.entityName,
    ticketId: (c) => c.ticketId,
    subject: (c) => c.subject,
    claimedBy: (c) => liveClaim(c.claim)?.ownerId ?? null,
    unclaimed: (c) => liveClaim(c.claim) === null,
    heldByMe: (c) => liveClaim(c.claim)?.ownerId === currentUserId(),
    unreadCount: (c) => c.unreadCount,
    messageCount: (c) => c.messageCount,
    hasTicket: (c) => c.ticketId !== null,
    breached: (c) => c.slaBreachedAt !== null || c.firstResponseBreachedAt !== null,
    createdAt: (c) => toInstant(c.createdAt),
    lastMessageAt: (c) => toInstant(c.lastMessageAt),
    waitingSince: (c) => toInstant(c.waitingSince),
    slaDueAt: (c) => toInstant(c.slaDueAt),
    firstResponseDueAt: (c) => toInstant(c.firstResponseDueAt),
  },
  facetable: ['channel', 'status', 'entityType', 'claimedBy'],
  views: {
    all: () => true,
    /**
     * The grab queue: nobody is holding it and the customer is waiting. **A
     * stale claim counts as unheld** — `liveClaim` is what decides, exactly as
     * it does on Requests, Safety, Fairness and Assurance.
     */
    unassigned: (c) => liveClaim(c.claim) === null && c.status !== 'closed',
    mine: (c) => liveClaim(c.claim)?.ownerId === currentUserId() && c.status !== 'closed',
    waiting: (c) => c.status === 'waiting',
    active: (c) => c.status === 'active',
    snoozed: (c) => c.status === 'snoozed',
    closed: (c) => c.status === 'closed',
  },
}

/* ───────────────────────────── derived ──────────────────────────────── */

/**
 * Who owns this conversation right now, or `null` for unassigned.
 *
 * **The assignee is a view of the claim, not a second field.** `Conversation`
 * carries `claim` and nothing else, so there is no `assigneeId` to fall out of
 * step with it after a take-over. Read it through here and the 30-minute stale
 * window applies for free.
 */
export function conversationAssignee(conversation: Conversation): { id: string; name: string } | null {
  const held = liveClaim(conversation.claim)
  return held ? { id: held.ownerId, name: held.ownerName } : null
}

/** Customer-visible messages only. The preview an operator screen-shares must never be an internal note. */
export function customerVisible(messages: readonly Message[]): Message[] {
  return messages.filter((m) => m.visibility === 'customer')
}

/** Every message of a conversation, fixtures included. `CNV-108` keeps its 64 elsewhere for size. */
function allMessages(conversation: Conversation): Message[] {
  if (conversation.id === 'CNV-108' && conversation.messageCount === CNV_108_MESSAGES.length) {
    return [...CNV_108_MESSAGES]
  }
  return [...conversation.messages]
}

/* ───────────────────────────── the reads ────────────────────────────── */

/**
 * GET /api/v1/conversations
 *   params: q · channel · status · ticketId · page · pageSize · sort · filter ·
 *           view=all|unassigned|mine|waiting|active|snoozed|closed
 *   -> Paginated<Conversation>
 *
 * Sortable: id · entityName · channel · status · createdAt · lastMessageAt ·
 * waitingSince · unreadCount · messageCount. **Default sort is `waitingSince`
 * ascending** — oldest waiting first, nothing-waiting last — which is P5-T4's
 * queue order stated once, here, rather than in each screen.
 *
 * `messages` on a list row is the **most recent page**, never the whole thread;
 * `messageCount` is the total. See `types/conversation.ts`.
 */
export async function listConversations(
  params: ConversationQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<Conversation>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Conversation>>('/conversations', { ...params }, { signal })
  }
  return mock(CONVERSATION_OPERATIONS.list, signal, () => {
    const scoped = rows().filter(
      (c) =>
        (params.channel === undefined || c.channel === params.channel) &&
        (params.status === undefined || c.status === params.status) &&
        (params.ticketId === undefined || c.ticketId === params.ticketId),
    )
    return runQuery(scoped, { sort: { field: 'waitingSince', dir: 'asc' }, ...params }, conversationShape)
  })
}

/**
 * GET /api/v1/conversations/:id
 *   -> Conversation
 *   404 naming the id
 */
export async function getConversation(id: string, signal?: AbortSignal): Promise<Conversation> {
  if (DATA_SOURCE === 'http') {
    return http.get<Conversation>(`/conversations/${id}`, undefined, { signal })
  }
  return mock(CONVERSATION_OPERATIONS.get, signal, () => find(id))
}

/**
 * GET /api/v1/conversations/:id/messages
 *   params: page · pageSize
 *   -> Paginated<Message>
 *
 * **Newest first.** Page 1 is the bottom of the thread, which is what a chat
 * opens on; the pane reverses it for display and asks for page 2 when the
 * operator scrolls up. Offset paging is modelled here because that is what the
 * rest of the seam speaks — **a real chat API should offer a cursor** keyed on
 * message id, because a message arriving mid-scroll shifts every offset. That
 * is a note for whoever builds the endpoint, not a reason to invent a second
 * pagination envelope now.
 */
export async function listConversationMessages(
  id: string,
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<Message>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Message>>(`/conversations/${id}/messages`, { ...params }, { signal })
  }
  return mock(CONVERSATION_OPERATIONS.messages, signal, () => {
    const conversation = find(id)
    const newestFirst = allMessages(conversation).sort(
      (a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt),
    )
    return paginate(newestFirst, params)
  })
}

/**
 * GET /api/v1/conversations/facets
 *   params: view
 *   -> Facets
 *
 * `channel` is the facet that matters: it is the only way an operator can see
 * that email exists and is empty, rather than assuming chat is all there is.
 */
export async function getConversationFacets(view?: string | null, signal?: AbortSignal): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/conversations/facets', { view: view ?? undefined }, { signal })
  }
  return mock(CONVERSATION_OPERATIONS.facets, signal, () => computeFacets(rows(), conversationShape, view))
}

/* ─────────────────────────── the mutations ──────────────────────────── */

/**
 * POST /api/v1/conversations/:id/claim
 *   body: { takeOver?: boolean }
 *   -> Conversation
 *   409 `claimed_by_other` when another operator holds it and `takeOver` was
 *       not sent. The message names the holder, because "somebody has this"
 *       is not an answer an operator can act on
 *
 * Claiming does **not** change `status`. Grabbing a conversation is not
 * answering it, and a queue that moves a row out of `waiting` on claim loses
 * every customer whose operator grabbed and then got distracted.
 */
export async function claimConversation(
  id: string,
  opts: { takeOver?: boolean } = {},
  signal?: AbortSignal,
): Promise<Conversation> {
  if (DATA_SOURCE === 'http') {
    return http.post<Conversation>(`/conversations/${id}/claim`, opts, { signal })
  }
  return mockMutation(CONVERSATION_OPERATIONS.claim, signal, () => {
    const existing = find(id)
    const claim = nextClaim('conversation', id, existing.claim, opts.takeOver)
    return commit({ ...existing, claim }, { type: 'conversation.claim', conversationId: id, claim })
  })
}

/**
 * POST /api/v1/conversations/:id/release
 *   -> Conversation
 *
 * Back to the unassigned queue. Announced on the **queue** topic as well as the
 * conversation's, because the row has to reappear for everyone else without a
 * refresh — that is the whole point of the subscription seam.
 */
export async function releaseConversation(id: string, signal?: AbortSignal): Promise<Conversation> {
  if (DATA_SOURCE === 'http') {
    return http.post<Conversation>(`/conversations/${id}/release`, undefined, { signal })
  }
  return mockMutation(CONVERSATION_OPERATIONS.release, signal, () => {
    const existing = find(id)
    if (!existing.claim) return existing
    const claim: Claim = {
      ...existing.claim,
      state: 'released',
      releasedAt: EYVAR_NOW,
      releaseReason: 'manual',
    }
    const updated = commit({ ...existing, claim }, { type: 'conversation.claim', conversationId: id, claim: null })
    emitMockEvent<ConversationEvent>(CONVERSATION_QUEUE_TOPIC, 'conversation.queued', {
      type: 'conversation.queued',
      conversationId: id,
      waitingSince: updated.waitingSince,
    })
    return updated
  })
}

/**
 * POST /api/v1/conversations/:id/transfer
 *   body: { toUserId: string, note?: string }
 *   -> Conversation
 *   422 when `toUserId` is not an operator
 *   409 when the conversation is closed
 *
 * The one operation that writes an owner who is not the caller, which is why it
 * does not go through `nextClaim`. The hand-off is recorded as a
 * `ClaimTakeover` in the same shape a take-over produces, so a thread's
 * ownership history is one list and not two.
 *
 * `note` is appended as an **internal** message. A transfer note is context for
 * the next operator and the customer must never see it.
 */
export async function transferConversation(
  id: string,
  toUserId: string,
  opts: { note?: string } = {},
  signal?: AbortSignal,
): Promise<Conversation> {
  if (DATA_SOURCE === 'http') {
    return http.post<Conversation>(`/conversations/${id}/transfer`, { toUserId, ...opts }, { signal })
  }
  return mockMutation(CONVERSATION_OPERATIONS.transfer, signal, () => {
    const existing = find(id)
    const target = teamUserFixtures.find((u) => u.id === toUserId)
    if (!target) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'unknown_operator',
        message: `No operator with id ${toUserId}`,
        details: [{ field: 'toUserId', code: 'unknown', message: 'Choose an operator' }],
        retryable: false,
      })
    }
    if (existing.status === 'closed') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'conversation_closed',
        message: `${id} is closed and cannot be transferred`,
        retryable: false,
      })
    }
    const held = liveClaim(existing.claim)
    const me = currentUser()
    const claim: Claim = {
      key: `conversation:${id}`,
      entityType: 'conversation',
      entityId: id,
      ownerId: target.id,
      ownerName: target.name,
      claimedAt: EYVAR_NOW,
      touchedAt: EYVAR_NOW,
      state: 'claimed',
      releasedAt: null,
      releaseReason: null,
      takeovers: [
        ...(existing.claim?.takeovers ?? []),
        {
          fromUserId: held?.ownerId ?? me?.id ?? currentUserId(),
          fromUserName: held?.ownerName ?? me?.name ?? currentUserId(),
          toUserId: target.id,
          toUserName: target.name,
          at: EYVAR_NOW,
        },
      ],
    }
    const messages = opts.note
      ? [...existing.messages, internalNote(id, existing.channel, opts.note, me?.id ?? currentUserId(), me?.name ?? 'Operator')]
      : existing.messages
    return commit(
      {
        ...existing,
        claim,
        messages,
        messageCount: existing.messageCount + (opts.note ? 1 : 0),
      },
      { type: 'conversation.claim', conversationId: id, claim },
    )
  })
}

/**
 * POST /api/v1/conversations/:id/close
 *   body: { reason: ConversationCloseReason }
 *   -> Conversation
 *   409 when already closed — closing twice would restamp `closedAt` and lose
 *       when it actually happened
 *
 * **Closing does not clear `firstResponseBreachedAt`.** A conversation answered
 * late is closed *and* late, and the operations review needs both — the same
 * rule `assignRequest` states for `slaBreachedAt`.
 */
export async function closeConversation(
  id: string,
  reason: ConversationCloseReason,
  signal?: AbortSignal,
): Promise<Conversation> {
  if (DATA_SOURCE === 'http') {
    return http.post<Conversation>(`/conversations/${id}/close`, { reason }, { signal })
  }
  return mockMutation(CONVERSATION_OPERATIONS.close, signal, () => {
    const existing = find(id)
    if (existing.status === 'closed') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'conversation_closed',
        message: `${id} is already closed`,
        retryable: false,
      })
    }
    const claim: Claim | null = existing.claim ? { ...existing.claim, state: 'done' } : null
    const updated: Conversation = {
      ...existing,
      status: 'closed',
      closedAt: EYVAR_NOW,
      closeReason: reason,
      waitingSince: null,
      unreadCount: 0,
      claim,
    }
    return commit(updated, { type: 'conversation.updated', conversationId: id, conversation: updated })
  })
}

/**
 * POST /api/v1/conversations/:id/snooze
 *   body: { until }
 *   -> Conversation
 *   409 when the conversation is closed
 *
 * O6 / D22: parked until `until`; both clocks pause while it is snoozed.
 */
export async function snoozeConversation(
  id: string,
  until: IsoDateTime,
  signal?: AbortSignal,
): Promise<Conversation> {
  if (DATA_SOURCE === 'http') {
    return http.post<Conversation>(`/conversations/${id}/snooze`, { until }, { signal })
  }
  return mockMutation(CONVERSATION_OPERATIONS.snooze, signal, () => {
    const existing = find(id)
    if (existing.status === 'closed') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'conversation_closed',
        message: `${id} is closed and cannot be snoozed`,
        retryable: false,
      })
    }
    const updated: Conversation = {
      ...existing,
      status: 'snoozed',
      snoozedUntil: until,
      waitingSince: null,
    }
    return commit(updated, { type: 'conversation.updated', conversationId: id, conversation: updated })
  })
}

export interface ReplyInput {
  body: string
  /**
   * `internal` is an internal note. **Defaulting is deliberate and it defaults
   * to `customer`** — a compose box that silently defaults to internal is how a
   * customer never gets an answer, and one that has no default at all is how a
   * caller forgets the field. The console must render the two as visibly
   * different controls, never one checkbox nobody notices.
   */
  visibility?: MessageVisibility
  /**
   * **Send this one message down a different pipe — D19's `Reply by email`.**
   *
   * Defaults to the conversation's own channel. Naming another one stamps
   * `message.channel` and leaves `conversation.channel` alone, which is the
   * shape `types/conversation.ts` was built for: *"a chat escalated to an email
   * is one conversation with two message channels, and losing that is losing
   * the audit trail."*
   *
   * Only `chat` and `email` are composable (**D19**). `whatsapp` is modelled
   * with no vendor — *"a compose box for a pipe that does not exist is the
   * worst possible state"* — and `phone` carries no customer-visible message at
   * all. Both are refused with a 422 rather than silently downgraded.
   *
   * The customer must have an address on the named channel. **This is the one
   * place a missing handle is a refusal rather than a delivery failure**, and
   * the asymmetry is deliberate: sending on the conversation's own channel with
   * no address produces a `failed` message with `no_handle`, which is a real
   * event with a `Send again` beside it; *choosing* a channel we have no
   * address for is a mistake to catch before anything is queued.
   */
  channel?: ConversationChannel
  /**
   * The email subject line to send under — **F-6**.
   *
   * Only on an `email` message. `undefined` falls back to
   * `Conversation.subject`, which is `null` on a chat and is the v1 behaviour
   * the design recorded: the transport threads it or derives one. A subject on
   * any other channel, or on an internal note, is a 422 rather than a field
   * quietly dropped — a composer that accepted a subject and did not send one is
   * how an operator finds out from the customer.
   */
  subject?: string | null
}

/**
 * POST /api/v1/conversations/:id/messages
 *   body: { body: string, visibility: 'customer' | 'internal' }
 *   -> Message
 *   422 when `body` is empty
 *   409 when the conversation is closed
 *
 * **Returns the `Message`, not the `Conversation`**, because the message's
 * delivery state is the thing that changes after the response: it comes back
 * `queued` and advances to `sent` and then `delivered` (or `failed`) over the
 * subscription seam. A console that rendered the returned conversation and
 * stopped would show a tick that never means anything.
 *
 * ## What the mock scripts, and why
 *
 * A customer-visible reply enqueues two `message.delivery` events on the
 * conversation topic, delivered by `advanceRealtime()`:
 *
 *   - `queued → sent → delivered → read` when the customer has a `handle`, the
 *     channel reports read receipts (`chat`, `whatsapp`) and the customer is
 *     still in the conversation;
 *   - `queued → sent → delivered` when it does not, or when they have left;
 *   - `queued → failed` with `failureCode: 'no_handle'` when they have no
 *     address (`CNV-110`), because there is genuinely nowhere for it to go.
 *
 * That is the only delivery outcome the mock decides, and it decides it from
 * data rather than from a coin toss — there is no `Math.random()` in this
 * directory and a flaky mock delivery would be untestable anyway.
 *
 * ## An internal note is not a reply
 *
 * It leaves `status`, `waitingSince` and `firstResponseAt` **untouched**. A
 * console that treated a note as an answer would drop a waiting customer out of
 * the queue with nobody having spoken to them, which is the worst failure this
 * whole phase exists to prevent.
 */
export async function replyConversation(
  id: string,
  input: ReplyInput,
  signal?: AbortSignal,
): Promise<Message> {
  if (DATA_SOURCE === 'http') {
    return http.post<Message>(`/conversations/${id}/messages`, input, { signal })
  }
  return mockMutation(CONVERSATION_OPERATIONS.reply, signal, () => {
    const existing = find(id)
    if (!input.body.trim()) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'body_required',
        message: 'Write a message before sending',
        details: [{ field: 'body', code: 'required', message: 'Write a message' }],
        retryable: false,
      })
    }
    if (existing.status === 'closed') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'conversation_closed',
        message: `${id} is closed — reopen it before replying`,
        retryable: false,
      })
    }

    const me = currentUser()
    const visibility = input.visibility ?? 'customer'
    const internal = visibility === 'internal'
    const channel = input.channel ?? existing.channel
    /* The channel is settled before the subject, because a subject is only
       legal on one of them and the caller should hear about the wrong pipe
       before hearing about the wrong field. */
    if (input.channel !== undefined && input.channel !== existing.channel) {
      assertComposable(input.channel)
      assertReachable(existing, input.channel)
    }
    const subject = resolveSubject(existing, input, channel, internal)

    const message: Message = {
      id: nextMessageId(),
      conversationId: id,
      channel,
      direction: 'outbound',
      authorId: me?.id ?? currentUserId(),
      authorName: me?.name ?? 'Operator',
      authorKind: 'operator',
      body: input.body,
      visibility,
      delivery: internal
        ? null
        : {
            state: 'queued',
            updatedAt: EYVAR_NOW,
            failureCode: null,
            failureMessage: null,
            providerMessageId: null,
          },
      deliveryHistory: [],
      subject,
      sentAt: EYVAR_NOW,
      attachments: [],
    }

    const updated: Conversation = internal
      ? {
          ...existing,
          messages: [...existing.messages, message],
          messageCount: existing.messageCount + 1,
        }
      : {
          ...existing,
          messages: [...existing.messages, message],
          messageCount: existing.messageCount + 1,
          status: 'active',
          waitingSince: null,
          unreadCount: 0,
          lastMessageAt: EYVAR_NOW,
          lastMessagePreview: input.body,
          firstResponseAt: existing.firstResponseAt ?? EYVAR_NOW,
        }

    commit(updated, { type: 'message.created', conversationId: id, message })
    if (!internal) scriptDelivery(existing, message)
    /* S-3: one thread. A customer-visible reply reaches the linked ticket too (AC-S-16). */
    if (!internal && existing.ticketId !== null) mirrorConversationReply(existing.ticketId, message)
    return message
  })
}

/**
 * S-3 (AC-S-16): the linked conversation's messages, read synchronously by
 * `clients/tickets.ts` so a ticket's thread carries the customer's own words.
 * Empty when the conversation is unknown; never throws from a read.
 */
export function conversationThread(conversationId: string): readonly Message[] {
  return rows().find((c) => c.id === conversationId)?.messages ?? []
}

/**
 * S-3 (AC-S-16): a reply written on the ticket goes down the conversation's
 * pipe with the same id, so neither side shows it twice.
 */
export function mirrorTicketReply(
  conversationId: string,
  reply: { id: string; senderId: string; senderName: string; body: string; sentAt: IsoDateTime },
): void {
  const existing = rows().find((c) => c.id === conversationId)
  if (!existing || existing.status === 'closed') return
  if (existing.messages.some((m) => m.id === reply.id)) return
  const message: Message = {
    id: reply.id,
    conversationId,
    channel: existing.channel,
    direction: 'outbound',
    authorId: reply.senderId,
    authorName: reply.senderName,
    authorKind: 'operator',
    body: reply.body,
    visibility: 'customer',
    delivery: {
      state: 'queued',
      updatedAt: reply.sentAt,
      failureCode: null,
      failureMessage: null,
      providerMessageId: null,
    },
    deliveryHistory: [],
    subject: existing.channel === 'email' ? existing.subject : null,
    sentAt: reply.sentAt,
    attachments: [],
  }
  const updated: Conversation = {
    ...existing,
    messages: [...existing.messages, message],
    messageCount: existing.messageCount + 1,
    status: 'active',
    waitingSince: null,
    unreadCount: 0,
    lastMessageAt: reply.sentAt,
    lastMessagePreview: reply.body,
    firstResponseAt: existing.firstResponseAt ?? reply.sentAt,
  }
  commit(updated, { type: 'message.created', conversationId, message })
  scriptDelivery(existing, message)
}

/**
 * S-3 / O4 (AC-S-18): a call logged on the ticket is a system line on the phone
 * conversation, so the two consoles tell the same story of the call.
 */
export function mirrorTicketCall(
  conversationId: string,
  entry: { id: string; body: string; loggedAt: IsoDateTime },
): void {
  const existing = rows().find((c) => c.id === conversationId)
  if (!existing || existing.messages.some((m) => m.id === entry.id)) return
  const message: Message = {
    id: entry.id,
    conversationId,
    channel: existing.channel,
    direction: 'outbound',
    authorId: null,
    authorName: 'System',
    authorKind: 'system',
    body: entry.body,
    visibility: 'internal',
    delivery: null,
    deliveryHistory: [],
    subject: null,
    sentAt: entry.loggedAt,
    attachments: [],
  }
  commit(
    { ...existing, messages: [...existing.messages, message], messageCount: existing.messageCount + 1 },
    { type: 'message.created', conversationId, message },
  )
}

/* ─────────────────────────── the retry ──────────────────────────────── */

/**
 * POST /api/v1/conversations/:id/messages/:messageId/retry
 *   -> Message   (the **same** message, with a fresh delivery attempt)
 *   404 naming the conversation, or the message inside it
 *   409 `conversation_closed`
 *   409 `retry_refused` when the message's current delivery is not `failed` —
 *       there is nothing to retry, and retrying a `delivered` message would
 *       send it twice
 *
 * **Design finding F-2, closed.** `deliveryCanRetry()` has been a predicate
 * with no operation behind it since the type shipped, so §8.6.7's `Send again`
 * ships an interim that restores the body into the composer and does not send.
 * This is the real operation.
 *
 * ## The identity decision: the message id is **re-used**
 *
 * `replyConversation` cannot substitute — it mints a new `CMSG` id, duplicates
 * the body, and re-runs the status side effects (`status: 'active'`,
 * `waitingSince: null`, `firstResponseAt`), which on `CNV-110` stacks identical
 * failures without bound.
 *
 * `clients/emails.ts` rules the opposite way for a resend: *"a resend is a new
 * row — it does not mutate the failed delivery, because the failed delivery is
 * what happened"*, threaded by `resendOf`. **The principle carries over; the
 * record does not.** An `EmailDelivery` *is* a delivery attempt, so a second
 * attempt is a second row. A `Message` is a **transcript line**, and the
 * customer received the sentence once — a thread showing it twice is wrong
 * about the conversation, and worse, an operator reading it cannot tell whether
 * they sent it twice.
 *
 * So the split lands where the two models differ: **one message, many
 * attempts.** The failed `MessageDelivery` is pushed onto `deliveryHistory`
 * intact and `delivery` becomes a fresh `queued`. Nothing is rewritten, which
 * is the half of the email precedent that does transfer.
 *
 * ## What it deliberately does not touch
 *
 * `status`, `waitingSince`, `firstResponseAt`, `lastMessageAt`,
 * `lastMessagePreview` and `messageCount` are all **unchanged**. The message was
 * already accepted; those were stamped when it was composed, and a retry is a
 * second attempt at delivery, not a second answer to the customer.
 *
 * **Mock-mode limit, stated rather than hidden:** it can only retry a message on
 * the conversation's loaded page (`conversation.messages`). `CNV-108` keeps its
 * 64 messages in a separate readonly array for size, and the two off-page failed
 * messages there are not retryable. A real server has no such distinction.
 */
export async function retryMessage(
  conversationId: string,
  messageId: string,
  signal?: AbortSignal,
): Promise<Message> {
  if (DATA_SOURCE === 'http') {
    return http.post<Message>(
      `/conversations/${conversationId}/messages/${messageId}/retry`,
      undefined,
      { signal },
    )
  }
  return mockMutation(CONVERSATION_OPERATIONS.retry, signal, () => {
    const existing = find(conversationId)
    if (existing.status === 'closed') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'conversation_closed',
        message: `${conversationId} is closed — reopen it before sending`,
        retryable: false,
      })
    }
    const index = existing.messages.findIndex((m) => m.id === messageId)
    const original = existing.messages[index]
    if (index < 0 || !original) throw notFound('message', messageId)

    const failed = original.delivery
    if (failed === null || failed.state !== 'failed') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'retry_refused',
        message:
          failed === null
            ? `${messageId} was never sent, so there is nothing to retry`
            : `${messageId} is ${failed.state}, not failed — retrying would send it twice`,
        retryable: false,
      })
    }

    const retried: Message = {
      ...original,
      /* Same id, same body, same `sentAt`. Only the attempt is new. */
      delivery: {
        state: 'queued',
        updatedAt: EYVAR_NOW,
        failureCode: null,
        failureMessage: null,
        providerMessageId: null,
      },
      /* The failure is **moved, not overwritten** — `clients/emails.ts`'s rule,
         honoured on the field this model has for it. */
      deliveryHistory: [...original.deliveryHistory, failed],
    }

    const messages = [...existing.messages]
    messages[index] = retried

    commit(
      { ...existing, messages },
      {
        type: 'message.delivery',
        conversationId,
        messageId,
        delivery: retried.delivery as MessageDelivery,
      },
    )
    scriptDelivery(existing, retried)
    return retried
  })
}

/* ──────────────────────── reopen, and the ticket ────────────────────── */

/**
 * POST /api/v1/conversations/:id/reopen
 *   -> Conversation
 *   409 `conversation_not_closed` — reopening an open conversation would
 *       recompute `status` and `waitingSince` from nothing and is a no-op the
 *       caller should know failed
 *
 * §3.5's header primary on a closed conversation, and the other half of
 * `closeConversation`. Until now the composer could say *"This conversation is
 * closed. Reopen it to reply"* and there was no reopen.
 *
 * ## What it restores, and what it refuses to guess
 *
 * **`status` is derived, not remembered.** A conversation does not store what
 * it was before it closed, and adding a field to remember would be a second
 * source of truth for something the thread already says. So: if the last
 * customer-visible message is **inbound**, the customer spoke last and nobody
 * answered — `waiting`, with `waitingSince` set to the **oldest** message in
 * that unanswered run, which is what the field is documented to mean and what
 * the queue sorts on. Otherwise `active`. A conversation with no messages at all
 * (`CNV-107`) reopens as `waiting` from `createdAt`.
 *
 * **`closedAt` and `closeReason` are cleared.** They describe a close that has
 * been undone; leaving them would make `status !== 'closed' && closedAt !== null`
 * representable, and every reader would then need to know which field wins.
 *
 * **The SLA stamps are NOT cleared.** A conversation that breached before it was
 * closed breached; `closeConversation` already refuses to clear
 * `firstResponseBreachedAt` for the same reason, and un-breaching a row by
 * closing and reopening it would be a way to launder a missed promise.
 *
 * **Ownership is left exactly as it is — and that is a question, not an
 * answer.** `closeConversation` sets the claim to `state: 'done'`, so
 * `liveClaim` already reads it as unheld: a reopened conversation is unclaimed
 * and the pane's own precedence offers `Grab` next. Whether pressing `Reopen`
 * should also claim it for the operator who pressed it is a product decision
 * nobody has made, and inventing it here would be inventing a domain rule.
 * Raised in the handoff.
 */
export async function reopenConversation(id: string, signal?: AbortSignal): Promise<Conversation> {
  if (DATA_SOURCE === 'http') {
    return http.post<Conversation>(`/conversations/${id}/reopen`, undefined, { signal })
  }
  return mockMutation(CONVERSATION_OPERATIONS.reopen, signal, () => {
    const existing = find(id)
    if (existing.status !== 'closed') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'conversation_not_closed',
        message: `${id} is ${existing.status}, not closed`,
        retryable: false,
      })
    }
    const waitingSince = oldestUnansweredInbound(existing)
    const updated: Conversation = {
      ...existing,
      status: waitingSince === null ? 'active' : 'waiting',
      closedAt: null,
      closeReason: null,
      waitingSince,
    }
    commit(updated, { type: 'conversation.updated', conversationId: id, conversation: updated })
    /* Announced on the **queue** topic too, exactly as `release` is: a reopened
       conversation that nobody holds is a customer waiting again, and every
       other console has to see the row come back without a refresh. */
    emitMockEvent<ConversationEvent>(CONVERSATION_QUEUE_TOPIC, 'conversation.queued', {
      type: 'conversation.queued',
      conversationId: id,
      waitingSince: updated.waitingSince,
    })
    return updated
  })
}

export interface ConversationTicketInput {
  /**
   * Optional. `undefined` derives one — see `deriveTicketSubject`. A chat has no
   * subject of its own and the console must not be forced to invent one before
   * it can raise a ticket.
   */
  subject?: string
  category: string
  reasonCode: string
  priority: TicketPriority
}

/**
 * POST /api/v1/conversations/:id/ticket
 *   body: { subject?, category, reasonCode, priority }
 *   -> { conversation: Conversation, ticket: Ticket }
 *   409 `ticket_exists` when this conversation already has one
 *   422 `entity_not_ticketable` for an entity `Ticket` cannot describe
 *
 * **D19's `Create ticket`, and the two-way link it requires**: *"a ticket is
 * created FROM a conversation, never the reverse in v1 — one control, stamping
 * `ticketId` on the conversation and `conversationId` on the ticket."*
 * It is also **AC-964**'s control: a chat past twenty minutes promotes it to the
 * pane's primary, because *"a chat that has run twenty minutes is not a chat; it
 * is a ticket."*
 *
 * `createTicket` wrote `conversationId: null` unconditionally
 * (`clients/tickets.ts`) and nothing stamped `ticketId` back, so a caller could
 * make a ticket but not the link. Two calls would not have fixed it: a link that
 * is two requests is a link that is half-written when the second one fails.
 * **One endpoint, both sides, one response carrying both** — a caller that got
 * only the ticket back would have to refetch the conversation to know it changed.
 *
 * The ticket inherits the conversation's `channel`, which is what makes
 * `replyTicket` know where a reply goes — `types/ticket.ts`'s own reason for the
 * field, and asserted in both directions by `conversations.test.ts`.
 */
export async function createTicketForConversation(
  id: string,
  input: ConversationTicketInput,
  signal?: AbortSignal,
): Promise<{ conversation: Conversation; ticket: Ticket }> {
  if (DATA_SOURCE === 'http') {
    return http.post<{ conversation: Conversation; ticket: Ticket }>(
      `/conversations/${id}/ticket`,
      { ...input },
      { signal },
    )
  }
  /* **One mutation, both halves.** `mintTicket` is the synchronous half of
     `createTicket`, split out of it for exactly this: nesting two mutations
     would double the latency and put `?mockFail=conversations.createTicket`
     *after* the ticket write it is meant to describe, leaving a ticket pointing
     at a conversation that does not point back. */
  return mockMutation(CONVERSATION_OPERATIONS.createTicket, signal, () => {
    const existing = find(id)
    if (existing.ticketId !== null) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'ticket_exists',
        message: `${id} is already linked to ${existing.ticketId}`,
        retryable: false,
      })
    }
    const entityType = ticketEntityType(existing.entityType)
    if (entityType === null) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'entity_not_ticketable',
        message: `A ticket cannot be raised about a ${existing.entityType}`,
        details: [{ field: 'entityType', code: 'unsupported', message: 'Not a ticketable entity' }],
        retryable: false,
      })
    }
    const ticket = mintTicket({
      subject: input.subject ?? deriveTicketSubject(existing),
      entityId: existing.entityId,
      entityName: existing.entityName,
      entityType,
      category: input.category,
      reasonCode: input.reasonCode,
      priority: input.priority,
      /* The conversation is already the thread. Seeding the ticket with a copy
         of its first message would put the same words in two records and let
         them drift; `conversationId` is what a reader follows instead. */
      conversationId: id,
      channel: existing.channel,
    })
    const linked: Conversation = { ...existing, ticketId: ticket.id }
    const conversation = commit(linked, {
      type: 'conversation.updated',
      conversationId: id,
      conversation: linked,
    })
    return { conversation, ticket }
  })
}

/**
 * The delivery lifecycle, as scripted events waiting for `advanceRealtime()`.
 *
 * Deterministic in both what it emits and the order it emits it in. The console
 * drives it from its `useTick` bucket; a test calls `drainRealtime()`.
 */
function scriptDelivery(conversation: Conversation, message: Message): void {
  const topic = conversationTopic(conversation.id)
  const customer = conversation.participants.find((p) => p.kind === 'customer')
  /* **The message's channel, not the conversation's.** A chat escalated to
     email is deliverable when the customer has an *email* address, and reading
     the conversation's channel here would check the chat session id instead. */
  const address = customer === undefined ? null : addressOn(customer.handles, message.channel, customer.handle)
  const deliverable = address !== null

  const step = (delivery: MessageDelivery) =>
    enqueueMockEvent<ConversationEvent>(topic, 'message.delivery', {
      type: 'message.delivery',
      conversationId: conversation.id,
      messageId: message.id,
      delivery,
    })

  if (!deliverable) {
    step({
      state: 'failed',
      updatedAt: EYVAR_NOW,
      failureCode: 'no_handle',
      failureMessage: `No ${message.channel} address on file for this ${conversation.entityType}`,
      providerMessageId: null,
    })
    return
  }
  step({ state: 'sent', updatedAt: EYVAR_NOW, failureCode: null, failureMessage: null, providerMessageId: null })
  step({
    state: 'delivered',
    updatedAt: EYVAR_NOW,
    failureCode: null,
    failureMessage: null,
    providerMessageId: null,
  })

  /**
   * **`read`, which used to be unreachable from any code path — design finding
   * F-7.** It was seeded on two rows, so the *rendering* was testable and the
   * *transition* was not: a state that exists in the type and cannot be produced
   * by the thing that produces states.
   *
   * Two conditions, both read off data rather than tossed for:
   *
   *   - **the channel reports it.** `chat` and `whatsapp` do; email does not,
   *     and an open-tracking pixel is a guess about image settings rather than a
   *     fact about a person (`channelReportsRead`).
   *   - **the customer is still there.** `leftAt !== null` is somebody who
   *     closed the tab — `CNV-111` is that row — and they cannot read what
   *     arrived afterwards. So `delivered` is where that thread stops, and both
   *     branches stay reachable in a running app.
   */
  if (channelReportsRead(message.channel) && customer?.leftAt == null) {
    step({
      state: 'read',
      updatedAt: EYVAR_NOW,
      failureCode: null,
      failureMessage: null,
      providerMessageId: null,
    })
  }

  /* §8.7: on chat the customer starts typing once they have read it. The
     state expires on its own (`TYPING_TTL_SECONDS`); nothing sends `false`. */
  if (message.channel === 'chat' && customer !== undefined && customer.leftAt == null) {
    enqueueMockEvent<ConversationEvent>(topic, 'typing', {
      type: 'typing',
      conversationId: conversation.id,
      typing: {
        conversationId: conversation.id,
        actorId: conversation.entityId,
        actorName: conversation.entityName,
        actorKind: 'customer',
        typing: true,
        at: EYVAR_NOW,
      },
    })
  }
}

/* ────────────────────── typing and presence ─────────────────────────── */

/**
 * POST /api/v1/conversations/:id/typing        (mock: published on the socket)
 *   body: { typing: boolean }
 *   -> 204
 *
 * Fire-and-forget and **read-latency, not mutation-latency**: a typing
 * indicator that lags behind the typing is worse than none. Re-publish every
 * three seconds while the operator is typing; the state expires on its own
 * after `TYPING_TTL_SECONDS`, so a customer who closes the tab mid-sentence
 * does not leave "typing…" on screen forever.
 */
export async function sendTypingIndicator(
  conversationId: string,
  typing: boolean,
  signal?: AbortSignal,
): Promise<void> {
  const me = currentUser()
  const payload: ConversationEvent = {
    type: 'typing',
    conversationId,
    typing: {
      conversationId,
      actorId: me?.id ?? currentUserId(),
      actorName: me?.name ?? 'Operator',
      actorKind: 'operator',
      typing,
      at: EYVAR_NOW,
    },
  }
  if (DATA_SOURCE === 'http') {
    return publish(conversationTopic(conversationId), 'typing', payload)
  }
  return mock(CONVERSATION_OPERATIONS.typing, signal, () => {
    emitMockEvent<ConversationEvent>(conversationTopic(conversationId), 'typing', payload)
  })
}

/**
 * GET /api/v1/presence/agents
 *   -> AgentPresence[]
 *
 * `activeCount` is **derived** from live claims over the conversation set, not
 * stored: a seeded count and a seeded claim list disagree the moment anybody
 * claims anything, and the number is what P5-T6's routing would divide by.
 *
 * Returns a bare array rather than `Paginated`. There are five operators and
 * there will be dozens, not thousands; a pagination envelope over a roster the
 * UI always renders whole is ceremony. If that stops being true it becomes
 * `Paginated<AgentPresence>` and the screens change once.
 */
export async function listAgentPresence(signal?: AbortSignal): Promise<AgentPresence[]> {
  if (DATA_SOURCE === 'http') {
    return http.get<AgentPresence[]>('/presence/agents', undefined, { signal })
  }
  return mock(CONVERSATION_OPERATIONS.presence, signal, () =>
    agentPresenceFixtures.map((seed) => ({
      userId: seed.userId,
      userName: seed.userName,
      state: presenceOverrides.get(seed.userId) ?? seed.state,
      activeCount: rows().filter(
        (c) => c.status !== 'closed' && liveClaim(c.claim)?.ownerId === seed.userId,
      ).length,
      lastSeenAt: seed.lastSeenAt,
    })),
  )
}

const presenceOverrides = new Map<string, PresenceState>()

/**
 * PUT /api/v1/presence/me
 *   body: { state: 'online' | 'away' | 'offline' }
 *   -> AgentPresence
 *
 * **The concurrent-chat cap is not here and routing is not here.** P5-T6 wants
 * both; the cap is a number nobody has set and the routing rule is unwritten.
 * Setting one's own availability is observable and shippable; deciding what the
 * router does with it is a question for product-owner.
 */
export async function setMyPresence(state: PresenceState, signal?: AbortSignal): Promise<AgentPresence> {
  if (DATA_SOURCE === 'http') {
    return http.put<AgentPresence>('/presence/me', { state }, { signal })
  }
  return mockMutation(CONVERSATION_OPERATIONS.presence, signal, () => {
    const meId = currentUserId()
    presenceOverrides.set(meId, state)
    const me = currentUser()
    const presence: AgentPresence = {
      userId: meId,
      userName: me?.name ?? 'Operator',
      state,
      activeCount: rows().filter(
        (c) => c.status !== 'closed' && liveClaim(c.claim)?.ownerId === meId,
      ).length,
      lastSeenAt: EYVAR_NOW,
    }
    emitMockEvent<ConversationEvent>(PRESENCE_TOPIC, 'presence', {
      type: 'presence',
      conversationId: null,
      presence,
    })
    return presence
  })
}

/* ──────────────────────── the subscriptions ─────────────────────────── */

export type ConversationEventHandler = (
  event: ConversationEvent,
  envelope: RealtimeEnvelope<ConversationEvent>,
) => void

/** Everything happening in one thread. Returns the unsubscribe an effect hands back. */
export function subscribeToConversation(
  id: string,
  handler: ConversationEventHandler,
  options: SubscribeOptions = {},
): Unsubscribe {
  return subscribe<ConversationEvent>(conversationTopic(id), (env) => handler(env.payload, env), options)
}

/**
 * The grab queue. A row appearing here is a customer nobody is talking to, and
 * `onGap` is the signal to refetch — a queue that missed a `conversation.queued`
 * offers an operator a conversation somebody else already took.
 */
export function subscribeToConversationQueue(
  handler: ConversationEventHandler,
  options: SubscribeOptions = {},
): Unsubscribe {
  return subscribe<ConversationEvent>(CONVERSATION_QUEUE_TOPIC, (env) => handler(env.payload, env), options)
}

/** Operator availability, for the roster and for routing once routing exists. */
export function subscribeToPresence(
  handler: ConversationEventHandler,
  options: SubscribeOptions = {},
): Unsubscribe {
  return subscribe<ConversationEvent>(PRESENCE_TOPIC, (env) => handler(env.payload, env), options)
}

/* ─────────────────────────── QA affordances ─────────────────────────── */

/**
 * Serve an **empty queue** — no conversations at all. The console on a quiet
 * afternoon, and the `empty-because-nothing-has-happened` state, which is not
 * the same screen as `empty-because-a-filter-matched-nothing`
 * (`docs/ref/states.md`, the two kinds of empty).
 *
 * The other empty — a conversation with no messages — needs no helper: it is
 * `CNV-107`, seeded, and reachable by opening it.
 */
export function useEmptyConversationQueue(): void {
  scenario = 'empty'
}

/**
 * Back to fixtures, back to the first minted message id, back to the seeded
 * presence. All three matter: a suite that reset the array but not the counter
 * would see `CMSG-9001` in its first run and `CMSG-9004` in its second, which is
 * the per-run drift this file exists to avoid.
 */
export function resetConversations(): void {
  /* Nothing seeded yet: the fixture chunk has not landed, so there is no
     state to reset and the rows this would read are still undefined. The
     binder in this module seeds fresh state when it does land. */
  if (!fixturesLoaded()) return
  dynamicConversations = [...conversationFixtures]
  scenario = 'default'
  messageSequence = 9_000
  presenceOverrides.clear()
}

/* ──────────────────────────── internals ─────────────────────────────── */

function find(id: string): Conversation {
  const row = rows().find((c) => c.id === id)
  if (!row) throw notFound('conversation', id)
  return row
}

/**
 * Write the row back and announce it. Both halves, always — a mutation that
 * updated the array and stayed silent leaves every other console stale, and one
 * that announced without writing back is a lie the next `list` contradicts.
 */
function commit(updated: Conversation, event: ConversationEvent): Conversation {
  const index = dynamicConversations.findIndex((c) => c.id === updated.id)
  if (index >= 0) dynamicConversations[index] = updated
  emitMockEvent<ConversationEvent>(conversationTopic(updated.id), event.type, event)
  emitMockEvent<ConversationEvent>(CONVERSATION_QUEUE_TOPIC, 'conversation.updated', {
    type: 'conversation.updated',
    conversationId: updated.id,
    conversation: updated,
  })
  return updated
}

/**
 * The address for a party on one channel, or `null`.
 *
 * `handles` is the source of truth and `handle` is documented as its alias for
 * the conversation's own channel — `fixtures/denormalisation.test.ts` asserts
 * they never disagree — so the map is read first and the flattened field is only
 * a fallback for a row that predates the map.
 *
 * **The two absences collapse here and only here.** A missing key ("we never
 * learned an address") and a present `null` ("we looked and there is none") are
 * different facts and the fixtures keep them apart; for the purpose of *can this
 * be delivered* they are the same answer, and a caller that wants to say which
 * reads `handles` directly.
 */
function addressOn(
  handles: Partial<Record<ConversationChannel, string | null>>,
  channel: ConversationChannel,
  fallback: string | null = null,
): string | null {
  const mapped = handles[channel]
  if (mapped !== undefined) return mapped
  return fallback
}

/** D19: `chat` and `email` compose; `whatsapp` has no vendor and `phone` has no message. */
function assertComposable(channel: ConversationChannel): void {
  if (channel === 'chat' || channel === 'email') return
  throw new ApiError({
    status: 422,
    kind: 'validation',
    code: 'channel_not_composable',
    message:
      channel === 'whatsapp'
        ? 'WhatsApp is not connected yet, so nothing can be sent on it'
        : 'A phone conversation carries no customer-visible message',
    details: [{ field: 'channel', code: 'unsupported', message: 'Choose a channel that can send' }],
    retryable: false,
  })
}

/**
 * Refuse a channel switch to a channel we have no address on.
 *
 * **Deliberately not the same behaviour as sending on the conversation's own
 * channel**, which queues and then fails with `no_handle` (`CNV-110`). That
 * failure is a real event with a `Send again` and an `Add an email address`
 * beside it. Choosing a second channel we cannot reach is a mistake to catch
 * before anything is queued, and D19 says so: `Reply by email` *"requires the
 * customer to have an email `handle`"*.
 */
function assertReachable(conversation: Conversation, channel: ConversationChannel): void {
  const customer = conversation.participants.find((p) => p.kind === 'customer')
  if (customer && addressOn(customer.handles, channel) !== null) return
  throw new ApiError({
    status: 422,
    kind: 'validation',
    code: 'no_handle',
    message: `No ${channel} address on file for this ${conversation.entityType}`,
    details: [{ field: 'channel', code: 'unreachable', message: 'No address on that channel' }],
    retryable: false,
  })
}

/**
 * The subject this message goes out under — **F-6**.
 *
 * `null` on every channel but `email`, and on every internal note, because
 * neither has a line for a mail client to thread on. A caller that supplies one
 * anyway gets a 422: a composer that accepted a subject and dropped it is how an
 * operator learns from the customer that it never arrived.
 *
 * On email with nothing supplied it falls back to `Conversation.subject`, which
 * is v1's recorded behaviour and is `null` on a chat escalated to email — the
 * transport threads it or derives one.
 */
function resolveSubject(
  conversation: Conversation,
  input: ReplyInput,
  channel: ConversationChannel,
  internal: boolean,
): string | null {
  const supplied = input.subject ?? null
  if (channel === 'email' && !internal) return supplied ?? conversation.subject
  if (supplied === null) return null
  throw new ApiError({
    status: 422,
    kind: 'validation',
    code: 'subject_not_supported',
    message: internal
      ? 'An internal note is not sent, so it has no subject line'
      : `A ${channel} message has no subject line`,
    details: [{ field: 'subject', code: 'unsupported', message: 'Leave the subject empty' }],
    retryable: false,
  })
}

/**
 * The oldest message in the trailing run of unanswered **customer** messages, or
 * `null` when the customer is not the one waiting.
 *
 * This is `waitingSince` as the type defines it — *"when the oldest unanswered
 * inbound arrived"*, which is the queue's sort key — computed rather than
 * remembered, because a closed conversation does not store the clock it had
 * before it closed and a field added to remember would be a second source of
 * truth for something the thread already says.
 *
 * **`authorKind === 'customer'`, not just `direction === 'inbound'`.** A system
 * notice (*"the customer left the chat"*) is inbound and customer-visible and
 * **nobody is waiting on it** — `CNV-114` ends with exactly that, and counting
 * it would reopen a duplicate as though a customer had asked something.
 *
 * A conversation with no messages at all (`CNV-107`) waits from `createdAt`:
 * somebody opened a chat and is sitting there, which is a real row.
 */
function oldestUnansweredInbound(conversation: Conversation): string | null {
  const visible = customerVisible(conversation.messages)
  if (visible.length === 0) return conversation.createdAt
  let oldest: string | null = null
  for (let i = visible.length - 1; i >= 0; i -= 1) {
    const message = visible[i]
    if (!message || message.direction !== 'inbound' || message.authorKind !== 'customer') break
    oldest = message.sentAt
  }
  return oldest
}

/**
 * `Ticket.entityType` is a three-value union; `Conversation.entityType` is the
 * eleven-value `ProfileEntityType` that `?entity=` resolves. The narrowing is
 * explicit and returns `null` rather than defaulting, because a ticket about a
 * `corporate-contact` filed as a `rider` is a wrong record, not a rounded one.
 */
function ticketEntityType(entity: ProfileEntityType): 'rider' | 'driver' | 'corporate' | null {
  if (entity === 'rider' || entity === 'driver') return entity
  if (entity === 'corporate-account') return 'corporate'
  return null
}

/**
 * A subject for a ticket raised from a conversation that has none of its own.
 *
 * Chat and WhatsApp have no subject by design, so the first customer-visible
 * message stands in — the same substitution D19 rules for the queue row
 * (*"subject, or the first customer-visible message where the channel has no
 * subject"*), so the ticket and the row it came from read alike. Truncated on a
 * word boundary; a conversation with nothing in it falls back to the customer's
 * name, which is the only fact such a row has.
 */
function deriveTicketSubject(conversation: Conversation): string {
  if (conversation.subject !== null) return conversation.subject
  const first = customerVisible(conversation.messages)[0]
  if (first === undefined) return conversation.entityName
  const body = first.body.trim()
  if (body.length <= 80) return body
  const cut = body.slice(0, 80)
  const space = cut.lastIndexOf(' ')
  return `${space > 40 ? cut.slice(0, space) : cut}…`
}

function internalNote(
  conversationId: string,
  channel: ConversationChannel,
  body: string,
  authorId: string,
  authorName: string,
): Message {
  return {
    id: nextMessageId(),
    conversationId,
    channel,
    direction: 'outbound',
    authorId,
    authorName,
    authorKind: 'operator',
    body,
    visibility: 'internal',
    delivery: null,
    /* A note is never sent, so there is nothing to have failed and nothing to
       retry — `deliveryIsWellFormed` asserts both halves. */
    deliveryHistory: [],
    /* No subject on a note, on any channel. It is not going anywhere, so it has
       no line for a mail client to thread on. */
    subject: null,
    sentAt: EYVAR_NOW,
    attachments: [],
  }
}
