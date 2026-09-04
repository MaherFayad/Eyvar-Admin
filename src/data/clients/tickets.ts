import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { runQuery, type QueryShape } from '../mock/query'
import { ApiError, type Paginated, type QueryParams } from '../types/common'
import type { ConversationChannel } from '../types/conversation'
import type {
  Ticket,
  TicketCallLog,
  TicketCallOutcome,
  TicketMessage,
  TicketPriority,
  TicketStatus,
} from '../types/ticket'
import { http } from './http'
import { signalled } from '../signals'
import { currentMockUserId } from './session'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let ticketFixtures!: Fixtures['ticketFixtures']
let teamUserFixtures!: Fixtures['teamUserFixtures']
onFixturesLoaded((f) => {
  ticketFixtures = f.ticketFixtures
  teamUserFixtures = f.teamUserFixtures
  /* Seeded here rather than at module load: these locals are built from
     late-bound fixtures, which are undefined until the fixture chunk lands. */
  dynamicTickets = [...ticketFixtures]
})

export const TICKET_OPERATIONS = {
  list: 'tickets.list',
  get: 'tickets.get',
  claim: 'tickets.claim',
  release: 'tickets.release',
  reply: 'tickets.reply',
  resolve: 'tickets.resolve',
  reopen: 'tickets.reopen',
  create: 'tickets.create',
  logCall: 'tickets.logCall',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(TICKET_OPERATIONS))

export interface TicketQuery extends QueryParams {
  status?: TicketStatus
  priority?: TicketPriority
  reasonCode?: string
}

let dynamicTickets!: typeof ticketFixtures

/**
 * Ids for messages minted in this session, `MSG-901` upward.
 *
 * **Not `MSG-${Date.now()}`.** A clock-derived id is a different id on every
 * run, so two runs of the same script produce two different documents and
 * nothing that diffs output — a visual regression, a snapshot, a QA repro —
 * can tell a real change from the clock ticking. `src/data/mock/clock.ts` says
 * it plainly: there is no ambient time in `src/data/`, and `ledger.ts` mints
 * `JE-9…` the same way (`nextEntryId`, `:210`) for the same reason.
 *
 * Seeded at `900` so a session-minted id is greppably distinct from the
 * fixtures' `MSG-01`…`MSG-06` and can never collide with them, exactly as
 * ledger's `9` prefix separates session entries from fixture ones. The
 * timestamp on the message is `EYVAR_NOW`; the id carries no time at all.
 */
let messageSequence = 900

function nextMessageId(): string {
  return `MSG-${++messageSequence}`
}

/**
 * Call-log ids minted in this session, `CALL-901` upward. Same reasoning as
 * `messageSequence` above, and seeded past the fixtures' `CALL-01`…`CALL-03`
 * for the same reason: a session-minted id has to be greppably distinct from a
 * seeded one and can never collide with it.
 */
let callSequence = 900

function nextCallId(): string {
  return `CALL-${++callSequence}`
}

/**
 * Back to fixtures, and back to the first minted id.
 *
 * Both halves matter: a test that reset the array but not the counter would
 * see `MSG-901` in its first run and `MSG-904` in its second, which is the
 * non-determinism this file just removed arriving by another door.
 */
export function resetTickets(): void {
  /* Nothing seeded yet: the fixture chunk has not landed, so there is no
     state to reset and the rows this would read are still undefined. The
     binder in this module seeds fresh state when it does land. */
  if (!fixturesLoaded()) return
  dynamicTickets = [...ticketFixtures]
  messageSequence = 900
  callSequence = 900
}

/**
 * The session's ticket rows, synchronously, for the cross-queue projection in
 * `clients/myWork.ts` (T1.6). Reads the same array `claimTicket` writes, so a
 * claim made from My Work is the claim Tickets reports.
 *
 * Mock only. In http mode My Work is one server query and this is never called.
 */
export function currentTickets(): readonly Ticket[] {
  return dynamicTickets ?? []
}

const ticketShape: QueryShape<Ticket> = {
  searchable: [(t) => t.id, (t) => t.subject, (t) => t.entityName, (t) => t.entityId, (t) => t.reasonCode],
  sortable: {
    createdAt: (t) => t.createdAt,
    priority: (t) => t.priority,
    status: (t) => t.status,
    subject: (t) => t.subject,
    /* **Added by the sort/filter sweep.** A column the operator can read is a
       column they can order by, unless ordering it is meaningless — see
       `docs/TABLE-SORT-AUDIT.md` for the three kinds this sweep left alone. */
    id: (r) => r.id,
    category: (r) => r.category,
  },
  filterable: {
    id: (t) => t.id,
    status: (t) => t.status,
    priority: (t) => t.priority,
    category: (t) => t.category,
    reasonCode: (t) => t.reasonCode,
    entityId: (t) => t.entityId,
    entityType: (t) => t.entityType,
    ownerId: (t) => t.ownerId,
    slaBreached: (t) => t.slaBreached,
    /* An SLA console has to be able to ask "which tickets have no reply
       destination", because those are the ones the composer will refuse. */
    channel: (t) => t.channel ?? null,
  },
  facetable: ['status', 'priority', 'category', 'reasonCode'],
  views: {
    all: () => true,
    open: (t) => t.status === 'open',
    'in-progress': (t) => t.status === 'in-progress',
    waiting: (t) => t.status === 'waiting',
    resolved: (t) => t.status === 'resolved' || t.status === 'closed',
    'by-reason-code': () => true,
  },
}

/**
 * GET /api/v1/tickets
 *   params: q, view, page, pageSize, sort, filter
 *   -> Paginated<Ticket>
 */
export async function listTickets(
  params: TicketQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<Ticket>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Ticket>>('/tickets', { ...params }, { signal })
  }
  return mock(TICKET_OPERATIONS.list, signal, () => {
    return runQuery(dynamicTickets, params, ticketShape)
  })
}

/**
 * GET /api/v1/tickets/:id
 *   -> Ticket
 *   404 when the id does not exist
 */
export async function getTicket(id: string, signal?: AbortSignal): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.get<Ticket>(`/tickets/${id}`, undefined, { signal })
  }
  return mock(TICKET_OPERATIONS.get, signal, () => {
    const row = dynamicTickets.find((t) => t.id === id)
    if (!row) throw notFound('ticket', id)
    return row
  })
}

/**
 * The signed-in operator, when the caller does not name one. Every other work
 * queue resolves the claimant this way (`nextClaim`, `clients/requests.ts`), so
 * My Work can claim a ticket without asserting who is acting.
 */
function sessionOperator(): { id: string; name: string } {
  const id = currentMockUserId()
  return { id, name: teamUserFixtures?.find((u) => u.id === id)?.name ?? id }
}

/**
 * POST /api/v1/tickets/:id/claim
 *   body: { userId, takeOver }
 *   -> Ticket
 *   404 when the id does not exist
 *   409 `claimed_by_other` when another operator holds it and `takeOver` is unset
 *
 * Omit `userId` and the claimant is the authenticated session, as on the other
 * five queues. `userName` is a display value and is not on the wire.
 */
export async function claimTicket(
  id: string,
  userId?: string,
  userName?: string,
  opts: { takeOver?: boolean } = {},
  signal?: AbortSignal,
): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return signalled('queue.item.claimed', http.post<Ticket>(`/tickets/${id}/claim`, { userId, takeOver: opts.takeOver }, { signal }))
  }
  return signalled('queue.item.claimed', mockMutation(TICKET_OPERATIONS.claim, signal, () => {
    const idx = dynamicTickets.findIndex((t) => t.id === id)
    if (idx === -1) throw notFound('ticket', id)
    const existing = dynamicTickets[idx]
    if (!existing) throw notFound('ticket', id)
    const me = sessionOperator()
    const owner = userId ?? me.id
    /* A claim is not a lock, but a take-over is deliberate and recorded
       (`nextClaim`, `clients/requests.ts`). */
    if (existing.ownerId !== null && existing.ownerId !== owner && !opts.takeOver) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'claimed_by_other',
        message: `${existing.ownerName ?? existing.ownerId} is holding this ticket`,
        retryable: false,
      })
    }
    const updated: Ticket = {
      ...existing,
      ownerId: owner,
      ownerName: userName ?? (userId === undefined ? me.name : userId),
      status: existing.status === 'open' ? 'in-progress' : existing.status,
    }
    dynamicTickets[idx] = updated
    return updated
  }))
}

/**
 * POST /api/v1/tickets/:id/release
 *   -> Ticket
 *   404 when the id does not exist
 *
 * Ownership only. A released ticket goes back to `open` so it reappears in the
 * queue's open scope; nothing else about it changes.
 */
export async function releaseTicket(id: string, signal?: AbortSignal): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.post<Ticket>(`/tickets/${id}/release`, undefined, { signal })
  }
  return mockMutation(TICKET_OPERATIONS.release, signal, () => {
    const idx = dynamicTickets.findIndex((t) => t.id === id)
    const existing = dynamicTickets[idx]
    if (!existing) throw notFound('ticket', id)
    const updated: Ticket = {
      ...existing,
      ownerId: null,
      ownerName: null,
      status: existing.status === 'in-progress' ? 'open' : existing.status,
    }
    dynamicTickets[idx] = updated
    return updated
  })
}

/**
 * POST /api/v1/tickets/:id/reply
 *   body: { body }
 *   -> Ticket
 *   404 when the id does not exist
 *
 * `senderId` and `senderName` are not sent: the sender is the authenticated
 * session, and letting a caller name it would let one operator reply as another.
 */
export async function replyTicket(
  id: string,
  body: string,
  senderId: string,
  senderName: string,
  signal?: AbortSignal,
): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.post<Ticket>(`/tickets/${id}/reply`, { body }, { signal })
  }
  return mockMutation(TICKET_OPERATIONS.reply, signal, () => {
    const idx = dynamicTickets.findIndex((t) => t.id === id)
    if (idx === -1) throw notFound('ticket', id)
    const existing = dynamicTickets[idx]
    if (!existing) throw notFound('ticket', id)
    const newMsg: TicketMessage = {
      id: nextMessageId(),
      senderId,
      senderName,
      senderType: 'agent',
      body,
      sentAt: EYVAR_NOW,
    }
    const updated: Ticket = {
      ...existing,
      messages: [...existing.messages, newMsg],
      status: 'in-progress',
    }
    dynamicTickets[idx] = updated
    return updated
  })
}

/**
 * POST /api/v1/tickets/:id/resolve
 *   -> Ticket
 *   404 when the id does not exist
 *   409 when the ticket is already resolved
 */
export async function resolveTicket(id: string, signal?: AbortSignal): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return signalled('queue.item.disposed', http.post<Ticket>(`/tickets/${id}/resolve`, {}, { signal }))
  }
  return signalled('queue.item.disposed', mockMutation(TICKET_OPERATIONS.resolve, signal, () => {
    const idx = dynamicTickets.findIndex((t) => t.id === id)
    if (idx === -1) throw notFound('ticket', id)
    const existing = dynamicTickets[idx]
    if (!existing) throw notFound('ticket', id)
    const updated: Ticket = {
      ...existing,
      status: 'resolved',
    }
    dynamicTickets[idx] = updated
    return updated
  }))
}

/**
 * POST /api/v1/tickets/:id/reopen
 *   -> Ticket
 *   404 when the id does not exist
 *   409 when the ticket is not resolved
 */
export async function reopenTicket(id: string, signal?: AbortSignal): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.post<Ticket>(`/tickets/${id}/reopen`, {}, { signal })
  }
  return mockMutation(TICKET_OPERATIONS.reopen, signal, () => {
    const idx = dynamicTickets.findIndex((t) => t.id === id)
    if (idx === -1) throw notFound('ticket', id)
    const existing = dynamicTickets[idx]
    if (!existing) throw notFound('ticket', id)
    const updated: Ticket = {
      ...existing,
      status: 'open',
    }
    dynamicTickets[idx] = updated
    return updated
  })
}

/**
 * POST /api/v1/tickets
 *   body: { subject, entityId, entityName, entityType, category, reasonCode,
 *           priority, initialMessage?, conversationId?, channel? }
 *   -> Ticket
 *
 * **`conversationId` and `channel` are the two-way link D19 requires.** They
 * were absent, and `conversationId: null` was written unconditionally, so a
 * ticket raised from the conversation console could not say which conversation
 * it came from and `replyTicket` could not say where a reply would go —
 * `types/ticket.ts`'s *"a reply composed with no idea where it goes"* defect,
 * arriving through the create path instead of the fixture.
 *
 * Both stay **optional and nullable**, because a ticket raised anywhere else
 * genuinely has no thread yet, and the type is explicit that an absent `channel`
 * means *"ask before replying"* rather than a default. Guessing `email` here
 * would be the defect the field exists to prevent. What has changed is only that
 * a caller who **knows** can now say so.
 *
 * The conversation side of the link is written by
 * `createTicketForConversation` in `clients/conversations.ts`, which is the one
 * endpoint that owns both halves. Call that, not this, from the console.
 *
 * `initialMessage` is now optional: a ticket created from a conversation already
 * **has** the thread, and seeding it with a copy of the first message would put
 * the same words in two records and let them drift.
 */
export async function createTicket(input: NewTicketInput, signal?: AbortSignal): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.post<Ticket>('/tickets', input, { signal })
  }
  return mockMutation(TICKET_OPERATIONS.create, signal, () => mintTicket(input))
}

export interface NewTicketInput {
  subject: string
  entityId: string
  entityName: string
  entityType: 'rider' | 'driver' | 'corporate'
  category: string
  reasonCode: string
  priority: TicketPriority
  initialMessage?: string
  conversationId?: string | null
  channel?: ConversationChannel
}

/**
 * Mint a ticket into the mock store, **synchronously**.
 *
 * Split out of `createTicket` so that `createTicketForConversation`
 * (`clients/conversations.ts`) can write both halves of D19's two-way link
 * inside **one** `mockMutation`. Nesting one mutation inside another would
 * double the latency and, worse, put the failure injection on the *outer*
 * operation only — `?mockFail=conversations.createTicket` would fire after the
 * ticket had already been written, leaving a ticket pointing at a conversation
 * that does not point back. A link that is two mutations is a link that is
 * half-written when the second one fails.
 *
 * **Mock-only, and not exported from the barrel.** In `http` mode the server
 * does this and neither caller reaches here.
 */
export function mintTicket(input: NewTicketInput): Ticket {
  {
    const newId = `TKT-${500 + dynamicTickets.length + 1}`
    const created: Ticket = {
      id: newId,
      subject: input.subject,
      entityId: input.entityId,
      entityName: input.entityName,
      entityType: input.entityType,
      category: input.category,
      reasonCode: input.reasonCode,
      priority: input.priority,
      status: 'open',
      ownerId: null,
      ownerName: null,
      createdAt: EYVAR_NOW,
      slaDueAt: null,
      slaBreached: false,
      /* Both `null`/absent unless the caller named them. A ticket raised
         through this operation with no conversation behind it still has no
         thread, and `types/ticket.ts` is explicit that an absent `channel`
         means *"ask before replying"* rather than a default — so guessing
         `email` remains the defect that field exists to prevent. */
      conversationId: input.conversationId ?? null,
      ...(input.channel === undefined ? {} : { channel: input.channel }),
      callLogs: [],
      /* No seeded message when there is none to seed. A ticket created from a
         conversation carries the thread by reference; an empty bubble with the
         customer's name on it would be a message they never sent. */
      messages:
        input.initialMessage === undefined || input.initialMessage.trim() === ''
          ? []
          : [
              {
                id: nextMessageId(),
                senderId: input.entityId,
                senderName: input.entityName,
                senderType: 'customer',
                body: input.initialMessage,
                sentAt: EYVAR_NOW,
              },
            ],
    }
    dynamicTickets = [created, ...dynamicTickets]
    return created
  }
}

/**
 * POST /api/v1/tickets/:id/call-log
 *   body: { outcome, notes }
 *   -> Ticket
 *   422 on an outcome outside the closed set
 *
 * **What `LogCallModal` was missing.** Its `onConfirm` reached
 * `TicketDetailScreen.tsx:86`, a handler declared with **no parameters**, so
 * the outcome and the note were discarded one stack frame after being
 * collected. This writes them onto the ticket, which is what makes them
 * readable afterwards by anyone other than the operator who typed them.
 *
 * A logged call also **moves the ticket on**, exactly as a reply does, because
 * an operator who has just phoned the customer has worked the ticket: an
 * untouched `open` ticket after a call is a queue lying about its own backlog.
 * `no-answer` is the exception — nobody was reached, so nothing progressed.
 */
export async function logTicketCall(
  input: { ticketId: string; outcome: TicketCallOutcome; notes?: string | null },
  userId: string,
  userName: string,
  signal?: AbortSignal,
): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.post<Ticket>(
      `/tickets/${input.ticketId}/call-log`,
      { outcome: input.outcome, notes: input.notes ?? null },
      { signal },
    )
  }
  return mockMutation(TICKET_OPERATIONS.logCall, signal, () => {
    const idx = dynamicTickets.findIndex((t) => t.id === input.ticketId)
    const existing = dynamicTickets[idx]
    if (!existing) throw notFound('ticket', input.ticketId)

    const entry: TicketCallLog = {
      id: nextCallId(),
      outcome: input.outcome,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      loggedAt: EYVAR_NOW,
      loggedByUserId: userId,
      loggedByUserName: userName,
    }
    const updated: Ticket = {
      ...existing,
      callLogs: [...existing.callLogs, entry],
      status: nextStatusAfterCall(existing.status, input.outcome),
      /* Whoever phoned owns it. An unowned ticket somebody has already called
         about is the queue's worst row: it looks untouched and is not. */
      ownerId: existing.ownerId ?? userId,
      ownerName: existing.ownerName ?? userName,
    }
    dynamicTickets[idx] = updated
    return updated
  })
}

function nextStatusAfterCall(status: TicketStatus, outcome: TicketCallOutcome): TicketStatus {
  if (status === 'resolved' || status === 'closed') return status
  switch (outcome) {
    case 'resolved-on-call':
      return 'resolved'
    case 'waiting-on-customer':
      return 'waiting'
    case 'escalated':
      return 'in-progress'
    case 'no-answer':
      /* Nobody was reached. The ticket has not moved and saying it has is how a
         queue quietly loses a person who is still waiting. */
      return status
  }
}
