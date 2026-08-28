import { DATA_SOURCE } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { runQuery, type QueryShape } from '../mock/query'
import { ticketFixtures } from '../fixtures/tickets'
import type { Paginated, QueryParams } from '../types/common'
import type { Ticket, TicketMessage, TicketPriority, TicketStatus } from '../types/ticket'
import { http } from './http'

export const TICKET_OPERATIONS = {
  list: 'tickets.list',
  get: 'tickets.get',
  claim: 'tickets.claim',
  reply: 'tickets.reply',
  resolve: 'tickets.resolve',
  reopen: 'tickets.reopen',
  create: 'tickets.create',
} as const

export interface TicketQuery extends QueryParams {
  status?: TicketStatus
  priority?: TicketPriority
  reasonCode?: string
}

let dynamicTickets = [...ticketFixtures]

const ticketShape: QueryShape<Ticket> = {
  searchable: [(t) => t.id, (t) => t.subject, (t) => t.entityName, (t) => t.entityId, (t) => t.reasonCode],
  sortable: {
    createdAt: (t) => t.createdAt,
    priority: (t) => t.priority,
    status: (t) => t.status,
    subject: (t) => t.subject,
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

export async function claimTicket(
  id: string,
  userId: string,
  userName: string,
  signal?: AbortSignal,
): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.post<Ticket>(`/tickets/${id}/claim`, { userId }, { signal })
  }
  return mockMutation(TICKET_OPERATIONS.claim, signal, () => {
    const idx = dynamicTickets.findIndex((t) => t.id === id)
    if (idx === -1) throw notFound('ticket', id)
    const existing = dynamicTickets[idx]
    if (!existing) throw notFound('ticket', id)
    const updated: Ticket = {
      ...existing,
      ownerId: userId,
      ownerName: userName,
      status: existing.status === 'open' ? 'in-progress' : existing.status,
    }
    dynamicTickets[idx] = updated
    return updated
  })
}

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
      id: `MSG-${Date.now()}`,
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

export async function resolveTicket(id: string, signal?: AbortSignal): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.post<Ticket>(`/tickets/${id}/resolve`, {}, { signal })
  }
  return mockMutation(TICKET_OPERATIONS.resolve, signal, () => {
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
  })
}

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

export async function createTicket(
  input: {
    subject: string
    entityId: string
    entityName: string
    entityType: 'rider' | 'driver' | 'corporate'
    category: string
    reasonCode: string
    priority: TicketPriority
    initialMessage: string
  },
  signal?: AbortSignal,
): Promise<Ticket> {
  if (DATA_SOURCE === 'http') {
    return http.post<Ticket>('/tickets', input, { signal })
  }
  return mockMutation(TICKET_OPERATIONS.create, signal, () => {
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
      messages: [
        {
          id: `MSG-${Date.now()}`,
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
  })
}
