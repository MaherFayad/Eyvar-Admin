/**
 * Support › Tickets, on the work-queue contract (SUPPORT-UX-PLAN.md §3.1–3.3).
 * Ownership is the shared `Claim` (30-minute expiry, take-over recorded);
 * the three clocks are stamped from policy at creation and paused by
 * `Waiting on customer`; a breach is stamped once by `sweepTicketSla`, with one
 * audit entry and one notification per crossing (§8.4.3).
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { runQuery, type QueryShape } from '../mock/query'
import {
  ApiError,
  type Claim,
  type IsoDateTime,
  type Paginated,
  type QueryParams,
} from '../types/common'
import type { ConversationChannel } from '../types/conversation'
import {
  PRIORITY_BY_TIER,
  addMinutes,
  stampTicketClocks,
  ticketIsLive,
  ticketSlaTargets,
  type Ticket,
  type TicketCallLog,
  type TicketCallOutcome,
  type TicketMessage,
  type TicketPriority,
  type TicketStatus,
} from '../types/ticket'
import { appendAudit } from './audit'
import { conversationThread, mirrorTicketCall, mirrorTicketReply } from './conversations'
import { claimFor as claimForEntity, doneClaim, releasedClaim } from './claims'
import { http } from './http'
import { pushNotification } from './notifications'
import { currentPolicy } from './policy'
import { liveClaim } from './requests'
import { currentMockUserId } from './session'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows: a static import would pin seeded data into the
   http build. Bound before any mock read, because `mock()` awaits `loadFixtures()`. */
let ticketFixtures!: Fixtures['ticketFixtures']
let teamUserFixtures!: Fixtures['teamUserFixtures']
let riderFixtures!: Fixtures['riderFixtures']
let allDriverFixtures!: Fixtures['allDriverFixtures']
onFixturesLoaded((f) => {
  riderFixtures = f.riderFixtures
  allDriverFixtures = f.allDriverFixtures
  ticketFixtures = f.ticketFixtures
  teamUserFixtures = f.teamUserFixtures
  dynamicTickets = ticketFixtures.map(normalise)
})

export const TICKET_OPERATIONS = {
  list: 'tickets.list',
  get: 'tickets.get',
  claim: 'tickets.claim',
  release: 'tickets.release',
  transfer: 'tickets.transfer',
  reply: 'tickets.reply',
  resolve: 'tickets.resolve',
  reopen: 'tickets.reopen',
  create: 'tickets.create',
  logCall: 'tickets.logCall',
  takeNext: 'tickets.takeNext',
  setStatus: 'tickets.setStatus',
  recode: 'tickets.recode',
  setPriority: 'tickets.setPriority',
} as const

/* Registered at module load so `?mockFail=` can name any of them before the first call. */
registerOperations(...Object.values(TICKET_OPERATIONS))

export interface TicketQuery extends QueryParams {
  status?: TicketStatus
  priority?: TicketPriority
  reasonCode?: string
}

let dynamicTickets!: Ticket[]

/* Session-minted ids count from 900 so they are greppably distinct from the
   fixtures' `MSG-01`, `CALL-01` and never derive from the clock. */
let messageSequence = 900
let callSequence = 900

function nextMessageId(): string {
  return `MSG-${++messageSequence}`
}

function nextCallId(): string {
  return `CALL-${++callSequence}`
}

/** Back to fixtures, and back to the first minted id. */
export function resetTickets(): void {
  if (!fixturesLoaded()) return
  dynamicTickets = ticketFixtures.map(normalise)
  messageSequence = 900
  callSequence = 900
}

/** The session's rows, synchronously, for `clients/myWork.ts`'s projection. Mock only. */
export function currentTickets(): readonly Ticket[] {
  return dynamicTickets ?? []
}

/* ─────────────────────────────── projections ──────────────────────────── */

/**
 * `ownerId`/`ownerName` follow the live claim (a stale one is already free),
 * except on a decided ticket, where the claim records who decided it.
 * `slaBreached` is either stamp. Applied on every write so no reader re-derives.
 */
function normalise(ticket: Ticket): Ticket {
  const held = ticketIsLive(ticket) ? liveClaim(ticket.claim) : ticket.claim
  return {
    ...ticket,
    requesterPhone: ticket.requesterPhone ?? phoneOf(ticket),
    ownerId: held?.ownerId ?? null,
    ownerName: held?.ownerName ?? null,
    slaBreached: ticket.slaBreachedAt !== null || ticket.firstResponseBreachedAt !== null,
  }
}

/* §7.5: the mock joins the number from the person's record; the server sends it. */
function phoneOf(ticket: Pick<Ticket, 'entityType' | 'entityId'>): string | null {
  if (ticket.entityType === 'rider') return riderFixtures?.find((r) => r.id === ticket.entityId)?.phone ?? null
  if (ticket.entityType === 'driver') return allDriverFixtures?.find((d) => d.id === ticket.entityId)?.phone ?? null
  return null
}

const digitsOf = (value: string | null): string => (value ?? '').replace(/\D/g, '')

function find(id: string): { index: number; ticket: Ticket } {
  const index = dynamicTickets.findIndex((t) => t.id === id)
  const ticket = dynamicTickets[index]
  if (index === -1 || !ticket) throw notFound('ticket', id)
  return { index, ticket }
}

function commit(index: number, next: Ticket): Ticket {
  const stored = normalise(next)
  dynamicTickets[index] = stored
  return stored
}

function operator(userId?: string, userName?: string): { id: string; name: string } {
  const id = userId ?? currentMockUserId()
  return { id, name: userName ?? teamUserFixtures?.find((u) => u.id === id)?.name ?? id }
}

function refuseDecided(ticket: Ticket, code: string, message: string): void {
  if (!ticketIsLive(ticket)) {
    throw new ApiError({ status: 409, kind: 'conflict', code, message, retryable: false })
  }
}

function audit(
  action: Parameters<typeof appendAudit>[0]['action'],
  ticket: Ticket,
  note: string | null,
  detailParams: Record<string, string> = {},
  actorId?: string,
): void {
  appendAudit({
    action,
    subjectType: 'ticket',
    subjectId: ticket.id,
    amountHalalas: null,
    reasonCode: ticket.reasonCode,
    note,
    detail: { key: `audit.${action}`, params: { id: ticket.id, ...detailParams } },
    ...(actorId === undefined ? {} : { actorId }),
  })
}

function claimFor(ticket: Ticket, owner: { id: string; name: string }, takeOver: boolean): Claim {
  return claimForEntity('ticket', ticket.id, ticket.claim, owner, takeOver)
}

/** A customer-visible act answers the first-response promise and restarts the update clock. */
function touchedCustomer(ticket: Ticket, at: IsoDateTime): Partial<Ticket> {
  const targets = ticketSlaTargets(currentPolicy(), ticket.reasonCode)
  return {
    firstResponseAt: ticket.firstResponseAt ?? at,
    lastUpdateAt: at,
    updateDueAt:
      targets.updateEveryMinutes === null ? null : addMinutes(at, targets.updateEveryMinutes),
  }
}

/** Milliseconds for the sort: a breach counts from its stamp, far below any deadline. */
function urgencyOf(ticket: Ticket): number {
  if (!ticketIsLive(ticket) || ticket.pausedAt !== null) return Number.MAX_SAFE_INTEGER
  const breach = ticket.firstResponseBreachedAt ?? ticket.slaBreachedAt
  if (breach !== null) return Date.parse(breach) - 1e14
  const due = ticket.firstResponseAt === null ? ticket.firstResponseDueAt : ticket.slaDueAt
  return due === null ? Number.MAX_SAFE_INTEGER : Date.parse(due)
}

/* ─────────────────────────────── the shape ────────────────────────────── */

const ticketShape: QueryShape<Ticket> = {
  searchable: [
    (t) => t.id,
    (t) => t.subject,
    (t) => t.entityName,
    (t) => t.entityId,
    (t) => t.reasonCode,
    (t) => t.conversationId ?? '',
    (t) => t.requesterPhone ?? '',
    (t) => digitsOf(t.requesterPhone),
  ],
  sortable: {
    createdAt: (t) => t.createdAt,
    priority: (t) => t.priority,
    status: (t) => t.status,
    subject: (t) => t.subject,
    id: (t) => t.id,
    category: (t) => t.category,
    slaDueAt: (t) => t.slaDueAt ?? '9999',
    firstResponseDueAt: (t) => t.firstResponseDueAt ?? '9999',
    /* AC-217: breached first (most overdue first), then the running deadline,
       `No clock` last. The running clock is the answer promise until answered. */
    urgency: (t) => urgencyOf(t),
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
    breached: (t) => t.slaBreached && ticketIsLive(t),
    unclaimed: (t) => t.ownerId === null && ticketIsLive(t),
    channel: (t) => t.channel,
  },
  facetable: ['status', 'priority', 'category', 'reasonCode'],
  views: {
    all: () => true,
    /* §4.6 Q-32: a queue lands on the work nobody holds. */
    unassigned: (t) => ticketIsLive(t) && t.ownerId === null,
    mine: (t) => ticketIsLive(t) && t.ownerId === currentMockUserId(),
    open: (t) => ticketIsLive(t),
    'in-progress': (t) => t.status === 'in-progress',
    waiting: (t) => t.status === 'waiting',
    resolved: (t) => t.status === 'resolved' || t.status === 'closed',
    done: (t) => t.status === 'resolved' || t.status === 'closed',
  },
}

/* ────────────────────────────────── reads ─────────────────────────────── */

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
  return mock(TICKET_OPERATIONS.list, signal, () => runQuery(dynamicTickets, params, ticketShape))
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
  return mock(TICKET_OPERATIONS.get, signal, () => withThread(find(id).ticket))
}

/**
 * S-3 (AC-S-16): the ticket's thread is the union of what was written on the
 * ticket and what the customer and operators wrote on the linked conversation,
 * in time order, deduplicated by id. Internal conversation notes stay there.
 */
function withThread(ticket: Ticket): Ticket {
  if (ticket.conversationId === null) return ticket
  const known = new Set(ticket.messages.map((m) => m.id))
  const merged: TicketMessage[] = conversationThread(ticket.conversationId)
    .filter((m) => !known.has(m.id) && m.visibility === 'customer')
    .map((m) => ({
      id: m.id,
      senderId: m.authorId ?? 'system',
      senderName: m.authorName,
      senderType: m.authorKind === 'customer' ? 'customer' : m.authorKind === 'operator' ? 'agent' : 'system',
      body: m.body,
      sentAt: m.sentAt,
      visibility: 'customer',
    }))
  if (merged.length === 0) return ticket
  const messages = [...ticket.messages, ...merged].sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt))
  return { ...ticket, messages }
}

/**
 * S-3 (AC-S-16): a customer-visible reply written on the conversation lands on
 * the linked ticket as an agent message and counts as touching the customer.
 * A closed ticket keeps the line without changing state.
 */
export function mirrorConversationReply(
  ticketId: string,
  message: { id: string; authorId: string | null; authorName: string; body: string; sentAt: IsoDateTime },
): void {
  const found = dynamicTickets.findIndex((t) => t.id === ticketId)
  if (found < 0) return
  const ticket = dynamicTickets[found]!
  if (ticket.messages.some((m) => m.id === message.id)) return
  const line: TicketMessage = {
    id: message.id,
    senderId: message.authorId ?? 'system',
    senderName: message.authorName,
    senderType: 'agent',
    body: message.body,
    sentAt: message.sentAt,
    visibility: 'customer',
  }
  const live = ticket.status !== 'closed' && ticket.status !== 'resolved'
  commit(found, {
    ...ticket,
    ...(live ? touchedCustomer(ticket, message.sentAt) : {}),
    messages: [...ticket.messages, line],
    status: ticket.status === 'open' ? 'in-progress' : ticket.status,
  })
}

/* ─────────────────────────────── ownership ────────────────────────────── */

/**
 * POST /api/v1/tickets/:id/claim
 *   body: { takeOver? }
 *   -> Ticket
 *   404 when the id does not exist
 *   409 `claimed_by_other` when another operator holds a live claim and `takeOver` is unset
 *   409 `ticket_decided` on a resolved or closed ticket
 */
export async function claimTicket(
  id: string,
  userId?: string,
  userName?: string,
  opts: { takeOver?: boolean } = {},
  signal?: AbortSignal,
): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.post<Ticket>(`/tickets/${id}/claim`, { takeOver: opts.takeOver }, { signal })
  }
  return mockMutation(TICKET_OPERATIONS.claim, signal, () => {
    const { index, ticket } = find(id)
    refuseDecided(ticket, 'ticket_decided', 'A decided ticket is not claimed. Reopen it first.')
    const me = operator(userId, userName)
    const claim = claimFor(ticket, me, opts.takeOver === true)
    const next = commit(index, {
      ...ticket,
      claim,
      status: ticket.status === 'open' ? 'in-progress' : ticket.status,
    })
    audit('ticket.claim', next, null, { owner: me.name }, me.id)
    return next
  })
}

/**
 * POST /api/v1/tickets/:id/release
 *   -> Ticket
 *   404 when the id does not exist
 *
 * Ownership only: the ticket goes back to `open` so it reappears in the
 * unassigned scope; its clocks do not reset.
 */
export async function releaseTicket(id: string, signal?: AbortSignal): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.post<Ticket>(`/tickets/${id}/release`, undefined, { signal })
  }
  return mockMutation(TICKET_OPERATIONS.release, signal, () => {
    const { index, ticket } = find(id)
    const next = commit(index, {
      ...ticket,
      claim: releasedClaim(ticket.claim),
      status: ticket.status === 'in-progress' ? 'open' : ticket.status,
    })
    audit('ticket.release', next, null)
    return next
  })
}

/**
 * POST /api/v1/tickets/:id/transfer
 *   body: { toUserId, note }
 *   -> Ticket
 *   404 when the id or the operator does not exist
 *   409 `ticket_decided` on a resolved or closed ticket
 *   422 `note_required` when the note is empty. The note lands as an internal message (AC-S-13).
 */
export async function transferTicket(
  id: string,
  toUserId: string,
  opts: { note: string },
  signal?: AbortSignal,
): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.post<Ticket>(`/tickets/${id}/transfer`, { toUserId, note: opts.note }, { signal })
  }
  return mockMutation(TICKET_OPERATIONS.transfer, signal, () => {
    const { index, ticket } = find(id)
    refuseDecided(ticket, 'ticket_decided', 'A decided ticket is not transferred.')
    const target = teamUserFixtures.find((u) => u.id === toUserId)
    if (!target) throw notFound('operator', toUserId)
    if (opts.note.trim() === '') {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'note_required',
        message: 'Write a note for the receiving operator.',
        details: [{ field: 'note', code: 'required', message: 'Required' }],
        retryable: false,
      })
    }
    const from = operator()
    const claim = claimFor(ticket, { id: target.id, name: target.name }, true)
    const note: TicketMessage = {
      id: nextMessageId(),
      senderId: from.id,
      senderName: from.name,
      senderType: 'agent',
      body: opts.note.trim(),
      sentAt: EYVAR_NOW,
      visibility: 'internal',
    }
    const next = commit(index, {
      ...ticket,
      claim,
      status: ticket.status === 'open' ? 'in-progress' : ticket.status,
      messages: [...ticket.messages, note],
    })
    audit('ticket.transfer', next, opts.note.trim(), { from: from.name, to: target.name })
    return next
  })
}

/* ─────────────────────────────── the thread ───────────────────────────── */

/**
 * POST /api/v1/tickets/:id/reply
 *   body: { body }
 *   -> Ticket
 *   404 when the id does not exist
 *   409 `ticket_closed` on a closed ticket
 *   422 `no_channel` when the ticket has no reply destination
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
    const { index, ticket } = find(id)
    if (ticket.status === 'closed') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'ticket_closed',
        message: 'A closed ticket does not take replies. Reopen it first.',
        retryable: false,
      })
    }
    if (ticket.channel === null) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'no_channel',
        message: 'This ticket has no reply destination.',
        details: [{ field: 'channel', code: 'required', message: 'No channel' }],
        retryable: false,
      })
    }
    const message: TicketMessage = {
      id: nextMessageId(),
      senderId,
      senderName,
      senderType: 'agent',
      body,
      sentAt: EYVAR_NOW,
      visibility: 'customer',
    }
    const next = commit(index, {
      ...ticket,
      ...touchedCustomer(ticket, EYVAR_NOW),
      messages: [...ticket.messages, message],
      status: ticket.status === 'open' ? 'in-progress' : ticket.status,
    })
    audit('ticket.reply', next, null, { channel: ticket.channel }, senderId)
    if (ticket.conversationId !== null) mirrorTicketReply(ticket.conversationId, message)
    return withThread(next)
  })
}

/**
 * POST /api/v1/tickets/take-next
 * body: none
 * -> Ticket
 * 404 nothing is waiting to be claimed
 * §6.5: the most urgent unheld live ticket, in the queue's own order, becomes the caller's.
 */
export async function takeNextTicket(signal?: AbortSignal): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.post<Ticket>('/tickets/take-next', {}, { signal })
  }
  return mockMutation(TICKET_OPERATIONS.takeNext, signal, () => {
    const me = operator()
    const candidates = dynamicTickets
      .map((ticket, index) => ({ ticket, index }))
      .filter(({ ticket }) => ticketIsLive(ticket) && liveClaim(ticket.claim) === null)
      .sort((a, b) => urgencyOf(a.ticket) - urgencyOf(b.ticket))
    const first = candidates[0]
    if (!first) throw notFound('ticket', 'next')
    const next = commit(first.index, {
      ...first.ticket,
      claim: claimFor(first.ticket, me, false),
      status: first.ticket.status === 'open' ? 'in-progress' : first.ticket.status,
    })
    audit('ticket.claim', next, null, { via: 'take-next' }, me.id)
    return withThread(next)
  })
}

/**
 * POST /api/v1/tickets/:id/call-log
 *   body: { outcome, notes }
 *   -> Ticket
 *   422 on an outcome outside the closed set. A call moves the ticket on as a
 *   reply does; `no-answer` is the exception because nobody was reached.
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
    const { index, ticket } = find(input.ticketId)
    const entry: TicketCallLog = {
      id: nextCallId(),
      outcome: input.outcome,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      loggedAt: EYVAR_NOW,
      loggedByUserId: userId,
      loggedByUserName: userName,
    }
    const reached = input.outcome !== 'no-answer'
    const status = nextStatusAfterCall(ticket.status, input.outcome)
    const held = liveClaim(ticket.claim)
    const next = commit(index, {
      ...ticket,
      ...(reached ? touchedCustomer(ticket, EYVAR_NOW) : {}),
      ...pauseFor(ticket, status),
      callLogs: [...ticket.callLogs, entry],
      status,
      resolvedAt: status === 'resolved' ? (ticket.resolvedAt ?? EYVAR_NOW) : ticket.resolvedAt,
      claim:
        held === null && ticketIsLive(ticket)
          ? claimFor(ticket, { id: userId, name: userName }, false)
          : ticket.claim,
    })
    audit('ticket.callLog', next, entry.notes, { outcome: input.outcome }, userId)
    if (ticket.conversationId !== null) {
      mirrorTicketCall(ticket.conversationId, {
        id: entry.id,
        body: callLine(entry),
        loggedAt: entry.loggedAt,
      })
    }
    return next
  })
}

/* The seam's own words for a call, as the fixtures write system lines. */
function callLine(entry: TicketCallLog): string {
  const outcome: Record<TicketCallOutcome, string> = {
    'resolved-on-call': 'resolved on the call',
    'waiting-on-customer': 'waiting on the customer',
    escalated: 'escalated',
    'no-answer': 'no answer',
  }
  const head = `Call logged by ${entry.loggedByUserName}: ${outcome[entry.outcome]}.`
  return entry.notes ? `${head} ${entry.notes}` : head
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
      return status
  }
}

/* ───────────────────────────── the lifecycle ──────────────────────────── */

/**
 * The pause bookkeeping for a status change (legacy `slaMarkStatus`, `:14863`).
 * Entering `waiting` pauses the resolution clock when the tier pauses; leaving
 * it adds the paused span to the deadline. The first-response clock never pauses.
 */
function pauseFor(ticket: Ticket, status: TicketStatus): Partial<Ticket> {
  const targets = ticketSlaTargets(currentPolicy(), ticket.reasonCode)
  if (status === 'waiting' && ticket.status !== 'waiting') {
    return targets.pausesOnCustomer ? { pausedAt: EYVAR_NOW } : {}
  }
  if (status !== 'waiting' && ticket.pausedAt !== null) {
    const paused = Math.max(0, (Date.parse(EYVAR_NOW) - Date.parse(ticket.pausedAt)) / 60_000)
    return {
      pausedAt: null,
      pausedMinutes: ticket.pausedMinutes + paused,
      slaDueAt: ticket.slaDueAt === null ? null : addMinutes(ticket.slaDueAt, paused),
    }
  }
  return {}
}

/**
 * POST /api/v1/tickets/:id/status
 *   body: { status: 'waiting' | 'in-progress' }
 *   -> Ticket
 *   409 `ticket_decided` on a resolved or closed ticket. `waiting` pauses the
 *   resolution clock where the tier says so; `in-progress` resumes it.
 */
export async function setTicketStatus(
  id: string,
  status: 'waiting' | 'in-progress',
  signal?: AbortSignal,
): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.post<Ticket>(`/tickets/${id}/status`, { status }, { signal })
  }
  return mockMutation(TICKET_OPERATIONS.setStatus, signal, () => {
    const { index, ticket } = find(id)
    refuseDecided(ticket, 'ticket_decided', 'A decided ticket has no waiting state. Reopen it first.')
    if (ticket.status === status) return ticket
    const next = commit(index, { ...ticket, ...pauseFor(ticket, status), status })
    audit('ticket.status', next, null, { status })
    return next
  })
}

/**
 * POST /api/v1/tickets/:id/reason-code
 *   body: { reasonCode }
 *   -> Ticket
 *   409 `ticket_decided` on a resolved or closed ticket. Re-derives the priority
 *   and all three clocks from opening and clears the breach stamps.
 */
export async function recodeTicket(id: string, reasonCode: string, signal?: AbortSignal): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.post<Ticket>(`/tickets/${id}/reason-code`, { reasonCode }, { signal })
  }
  return mockMutation(TICKET_OPERATIONS.recode, signal, () => {
    const { index, ticket } = find(id)
    refuseDecided(ticket, 'ticket_decided', 'A decided ticket is not re-coded.')
    const targets = ticketSlaTargets(currentPolicy(), reasonCode)
    const stamped = stampTicketClocks(targets, ticket.createdAt)
    const next = commit(index, {
      ...ticket,
      ...stamped,
      /* The update clock counts from the last update, not from opening. */
      updateDueAt:
        targets.updateEveryMinutes === null
          ? null
          : addMinutes(ticket.lastUpdateAt ?? ticket.createdAt, targets.updateEveryMinutes),
      /* A paused ticket stays paused; the span already paused stays spent. */
      slaDueAt:
        stamped.slaDueAt === null ? null : addMinutes(stamped.slaDueAt, ticket.pausedMinutes),
      reasonCode,
      priority: PRIORITY_BY_TIER[targets.tier],
    })
    audit('ticket.recode', next, null, { from: ticket.reasonCode, to: reasonCode })
    return next
  })
}

/**
 * POST /api/v1/tickets/:id/priority
 *   body: { priority }
 *   -> Ticket
 */
export async function setTicketPriority(
  id: string,
  priority: TicketPriority,
  signal?: AbortSignal,
): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.post<Ticket>(`/tickets/${id}/priority`, { priority }, { signal })
  }
  return mockMutation(TICKET_OPERATIONS.setPriority, signal, () => {
    const { index, ticket } = find(id)
    const next = commit(index, { ...ticket, priority })
    audit('ticket.priority', next, null, { from: ticket.priority, to: priority })
    return next
  })
}

/**
 * POST /api/v1/tickets/:id/resolve
 *   -> Ticket
 *   404 when the id does not exist
 *   409 `ticket_decided` when already resolved or closed. The claim becomes
 *   `done` so the row records who decided it (legacy `slaMarkStatus`, `:14875`).
 */
export async function resolveTicket(id: string, signal?: AbortSignal): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.post<Ticket>(`/tickets/${id}/resolve`, {}, { signal })
  }
  return mockMutation(TICKET_OPERATIONS.resolve, signal, () => {
    const { index, ticket } = find(id)
    refuseDecided(ticket, 'ticket_decided', 'This ticket is already decided.')
    const me = operator()
    const next = commit(index, {
      ...ticket,
      ...pauseFor(ticket, 'resolved'),
      status: 'resolved',
      resolvedAt: EYVAR_NOW,
      firstResponseAt: ticket.firstResponseAt ?? EYVAR_NOW,
      claim: doneClaim(ticket.claim, claimFor(ticket, me, true)),
    })
    audit('ticket.resolve', next, null)
    return next
  })
}

/**
 * POST /api/v1/tickets/:id/reopen
 *   -> Ticket
 *   404 when the id does not exist
 *   409 `ticket_open` when the ticket is not decided. Releases the decided claim;
 *   neither restarts a clock nor clears a breach (§8.4.3).
 */
export async function reopenTicket(id: string, signal?: AbortSignal): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.post<Ticket>(`/tickets/${id}/reopen`, {}, { signal })
  }
  return mockMutation(TICKET_OPERATIONS.reopen, signal, () => {
    const { index, ticket } = find(id)
    if (ticketIsLive(ticket)) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'ticket_open',
        message: 'This ticket is already open.',
        retryable: false,
      })
    }
    const next = commit(index, {
      ...ticket,
      status: 'open',
      resolvedAt: null,
      claim:
        ticket.claim === null
          ? null
          : { ...ticket.claim, state: 'released', releasedAt: EYVAR_NOW, releaseReason: 'manual' },
    })
    audit('ticket.reopen', next, null)
    return next
  })
}

/* ─────────────────────────────── creation ─────────────────────────────── */

export interface NewTicketInput {
  subject: string
  entityId: string
  entityName: string
  entityType: 'rider' | 'driver' | 'corporate'
  category: string
  reasonCode: string
  priority?: TicketPriority
  initialMessage?: string
  conversationId?: string | null
  channel?: ConversationChannel | null
}

/**
 * POST /api/v1/tickets
 *   body: NewTicketInput
 *   -> Ticket
 *   Clocks are stamped from policy (AC-S-06); `priority` defaults to the code's
 *   tier; `channel` stays `null` when unknown, never a default.
 */
export async function createTicket(input: NewTicketInput, signal?: AbortSignal): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.post<Ticket>('/tickets', input, { signal })
  }
  return mockMutation(TICKET_OPERATIONS.create, signal, () => mintTicket(input))
}

/**
 * Mint a ticket into the mock store, synchronously, so
 * `createTicketForConversation` can write both halves of the link inside one
 * `mockMutation`. Mock only; not exported from the barrel.
 */
export function mintTicket(input: NewTicketInput): Ticket {
  const targets = ticketSlaTargets(currentPolicy(), input.reasonCode)
  const created: Ticket = normalise({
    id: `TKT-${500 + dynamicTickets.length + 1}`,
    subject: input.subject,
    entityId: input.entityId,
    entityName: input.entityName,
    entityType: input.entityType,
    requesterPhone: null,
    category: input.category,
    reasonCode: input.reasonCode,
    priority: input.priority ?? PRIORITY_BY_TIER[targets.tier],
    status: 'open',
    claim: null,
    ownerId: null,
    ownerName: null,
    createdAt: EYVAR_NOW,
    resolvedAt: null,
    ...stampTicketClocks(targets, EYVAR_NOW),
    firstResponseAt: null,
    lastUpdateAt: null,
    pausedAt: null,
    pausedMinutes: 0,
    slaBreached: false,
    conversationId: input.conversationId ?? null,
    channel: input.channel ?? null,
    callLogs: [],
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
              visibility: 'customer',
            },
          ],
  })
  dynamicTickets = [created, ...dynamicTickets]
  audit('ticket.create', created, null, { reasonCode: input.reasonCode })
  return created
}

/* ─────────────────────────────── the sweep ────────────────────────────── */

export type TicketBreachKind = 'first_response' | 'resolution'

/**
 * Stamp every promise that broke before `now`, once each (§8.4.3): one audit
 * entry per crossing, one batched notification per sweep. Mock only; the
 * console calls it from its tick bucket and the server owns it in http mode.
 */
export function sweepTicketSla(
  now: IsoDateTime = EYVAR_NOW,
): Array<{ ticketId: string; kind: TicketBreachKind }> {
  if (!dynamicTickets) return []
  const nowMs = Date.parse(now)
  const crossings: Array<{ ticketId: string; kind: TicketBreachKind }> = []

  dynamicTickets = dynamicTickets.map((ticket) => {
    if (!ticketIsLive(ticket)) return ticket
    let next = ticket
    if (
      ticket.firstResponseAt === null &&
      ticket.firstResponseBreachedAt === null &&
      ticket.firstResponseDueAt !== null &&
      Date.parse(ticket.firstResponseDueAt) < nowMs
    ) {
      next = { ...next, firstResponseBreachedAt: ticket.firstResponseDueAt }
      crossings.push({ ticketId: ticket.id, kind: 'first_response' })
    }
    if (
      ticket.pausedAt === null &&
      ticket.slaBreachedAt === null &&
      ticket.slaDueAt !== null &&
      Date.parse(ticket.slaDueAt) < nowMs
    ) {
      next = { ...next, slaBreachedAt: ticket.slaDueAt }
      crossings.push({ ticketId: ticket.id, kind: 'resolution' })
    }
    if (next === ticket) return ticket
    const stored = normalise(next)
    audit('ticket.slaBreach', stored, null, {
      kind: crossings.filter((c) => c.ticketId === ticket.id).map((c) => c.kind).join(','),
    })
    return stored
  })

  if (crossings.length === 1) {
    const only = crossings[0]!
    const ticket = dynamicTickets.find((t) => t.id === only.ticketId)
    pushNotification({
      type: 'ticket',
      priority: 'high',
      title: `SLA breach ${only.ticketId}`,
      body: ticket?.subject ?? null,
      route: `/support/tickets/${only.ticketId}`,
      entityId: only.ticketId,
      entityType: 'ticket',
    })
  } else if (crossings.length > 1) {
    pushNotification({
      type: 'ticket',
      priority: 'high',
      title: `SLA breach on ${crossings.length} tickets`,
      body: null,
      route: '/support/tickets?view=open',
      entityId: null,
      entityType: null,
    })
  }
  return crossings
}
