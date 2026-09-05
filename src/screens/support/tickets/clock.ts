/**
 * The one clock a ticket row shows (AC-211): the first-response promise until
 * somebody answers, then the resolution promise. Paused and decided tickets
 * show no countdown; the status badge says why (Q-11's rule, borrowed).
 */

import type { IsoDateTime, Ticket } from '@/data/types'
import { queueClock, type QueueClockInput, type QueueClockResult } from '@/lib'

export type TicketPromise = 'first-response' | 'resolution' | 'update' | 'paused' | 'none'

export interface TicketClock {
  result: QueueClockResult
  input: QueueClockInput | null
  promise: TicketPromise
}

const NONE: QueueClockInput = { startedAt: null, dueAt: null, targetMinutes: null, breachedAt: null }

export function firstResponseInput(ticket: Ticket): QueueClockInput {
  return {
    startedAt: ticket.createdAt,
    dueAt: ticket.firstResponseDueAt,
    targetMinutes: null,
    breachedAt: ticket.firstResponseBreachedAt,
  }
}

export function resolutionInput(ticket: Ticket): QueueClockInput {
  return {
    startedAt: ticket.slaStartedAt,
    dueAt: ticket.slaDueAt,
    targetMinutes: ticket.slaTargetMinutes,
    breachedAt: ticket.slaBreachedAt,
  }
}

/** The update promise carries no breach stamp; it is a countdown only. */
export function updateInput(ticket: Ticket): QueueClockInput {
  return {
    startedAt: ticket.lastUpdateAt ?? ticket.createdAt,
    dueAt: ticket.updateDueAt,
    targetMinutes: null,
    breachedAt: null,
  }
}

export function ticketIsDecided(ticket: Pick<Ticket, 'status'>): boolean {
  return ticket.status === 'resolved' || ticket.status === 'closed'
}

export function runningTicketClock(ticket: Ticket, now: IsoDateTime): TicketClock {
  const decided = ticketIsDecided(ticket)
  if (decided) {
    return { result: queueClock(NONE, now, { terminal: true }), input: null, promise: 'none' }
  }
  if (ticket.pausedAt !== null) {
    return { result: queueClock(NONE, now, { terminal: true }), input: null, promise: 'paused' }
  }
  const input = ticket.firstResponseAt === null ? firstResponseInput(ticket) : resolutionInput(ticket)
  return {
    result: queueClock(input, now, { terminal: false }),
    input,
    promise: ticket.firstResponseAt === null ? 'first-response' : 'resolution',
  }
}
