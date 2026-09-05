/**
 * Support › Tickets on the work-queue contract (SUPPORT-UX-PLAN.md §3.1–3.3).
 * One test per acceptance criterion, named after it.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { EYVAR_NOW, offsetFromNow } from '../mock/clock'
import { addMinutes, ticketSlaTargets } from '../types/ticket'
import { isApiError } from '../types/common'
import { listAuditEntries, resetAudit } from './audit'
import { listNotifications, resetNotifications } from './notifications'
import { disableMockLatency, mockFailures } from '../config'
import { currentPolicy } from './policy'
import { resetMockSession, switchMockUser } from './session'
import { getConversation, replyConversation, resetConversations } from './conversations'
import {
  claimTicket,
  createTicket,
  getTicket,
  listTickets,
  logTicketCall,
  recodeTicket,
  reopenTicket,
  rederiveOpenTicketClocks,
  replyTicket,
  resetTickets,
  resolveTicket,
  setTicketStatus,
  sweepTicketSla,
  takeNextTicket,
  transferTicket,
} from './tickets'

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
  resetTickets()
  resetConversations()
  resetAudit()
  resetNotifications()
  resetMockSession()
})

const minutesBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 60_000)

async function fresh(reasonCode = 'CAP_LATE') {
  return createTicket({
    subject: 'A test ticket',
    entityId: 'RDR-1041',
    entityName: 'Nora Al-Harbi',
    entityType: 'rider',
    category: 'Captain',
    reasonCode,
    channel: 'email',
  })
}

describe('AC-S-06 — a created ticket carries three clocks stamped from policy', () => {
  it('stamps first response, resolution and next update from CAP_LATE', async () => {
    const ticket = await fresh('CAP_LATE')
    expect(ticket.slaSource).toBe('legacy-reason-code')
    expect(minutesBetween(ticket.createdAt, ticket.firstResponseDueAt!)).toBe(60)
    expect(minutesBetween(ticket.createdAt, ticket.slaDueAt!)).toBe(2880)
    expect(ticket.slaTargetMinutes).toBe(2880)
    expect(minutesBetween(ticket.createdAt, ticket.updateDueAt!)).toBe(15)
    expect(ticket.priority).toBe('Medium')
  })

  it('reads the queue grid override, not only the tier default', async () => {
    /* The ticket queue overrides T4 resolution to 5760 in the policy fixture. */
    const t4 = currentPolicy().reasonCodes.find((c) => c.tier === 'T4')!
    const ticket = await fresh(t4.key)
    expect(ticket.slaTargetMinutes).toBe(5760)
    expect(ticket.priority).toBe('Low')
  })

  it('gives an unknown code the uncoded targets rather than no clock', async () => {
    const ticket = await fresh('NOT_A_CODE')
    expect(ticket.slaDueAt).not.toBeNull()
    expect(ticket.firstResponseDueAt).not.toBeNull()
  })

  it('never defaults a channel', async () => {
    const ticket = await createTicket({
      subject: 'No channel',
      entityId: 'RDR-1041',
      entityName: 'Nora Al-Harbi',
      entityType: 'rider',
      category: 'Captain',
      reasonCode: 'CAP_LATE',
    })
    expect(ticket.channel).toBeNull()
    await expect(replyTicket(ticket.id, 'hello', 'USR-1', 'Sarah')).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.code === 'no_channel',
    )
  })
})

describe('AC-S-07 — a breach is stamped once, audited once, notified once', () => {
  it('stamps the first-response breach at the crossing and not again', async () => {
    const ticket = await fresh('CAP_LATE')
    const later = addMinutes(EYVAR_NOW, 61)
    const before = (await listNotifications({ pageSize: 50 })).total
    const first = sweepTicketSla(later)
    expect(first).toContainEqual({ ticketId: ticket.id, kind: 'first_response' })
    const stamped = await getTicket(ticket.id)
    expect(stamped.firstResponseBreachedAt).toBe(ticket.firstResponseDueAt)
    expect(stamped.slaBreached).toBe(true)

    const second = sweepTicketSla(addMinutes(EYVAR_NOW, 120))
    expect(second.find((c) => c.ticketId === ticket.id)).toBeUndefined()

    const audit = await listAuditEntries({ subjectId: ticket.id, action: 'ticket.slaBreach' })
    expect(audit.total).toBe(1)
    /* One sweep, one notification, however many promises broke in it (§8.4.3). */
    expect((await listNotifications({ pageSize: 50 })).total).toBe(before + 1)
    sweepTicketSla(addMinutes(EYVAR_NOW, 120))
    expect((await listNotifications({ pageSize: 50 })).total).toBe(before + 1)
  })

  it('batches several crossings in one sweep into one notification', async () => {
    const a = await fresh('CAP_LATE')
    const b = await fresh('CAP_LATE')
    const before = (await listNotifications({ pageSize: 50 })).total
    sweepTicketSla(addMinutes(EYVAR_NOW, 61))
    const after = await listNotifications({ pageSize: 50 })
    expect(after.total).toBe(before + 1)
    expect(after.items[0]?.title).toContain('2')
    expect((await getTicket(a.id)).slaBreached).toBe(true)
    expect((await getTicket(b.id)).slaBreached).toBe(true)
  })

  it('does not breach an answered ticket or a paused one', async () => {
    const answered = await fresh('CAP_LATE')
    await replyTicket(answered.id, 'On it', 'USR-1', 'Sarah Al-Rashid')
    const paused = await fresh('CAP_LATE')
    await setTicketStatus(paused.id, 'waiting')
    sweepTicketSla(addMinutes(EYVAR_NOW, 3000))
    expect((await getTicket(answered.id)).firstResponseBreachedAt).toBeNull()
    expect((await getTicket(paused.id)).slaBreachedAt).toBeNull()
  })
})

describe('AC-S-09 / AC-S-10 — ownership is the shared claim', () => {
  it('projects the owner from a live claim and frees a stale one', async () => {
    const ticket = await claimTicket((await fresh()).id)
    expect(ticket.claim?.state).toBe('claimed')
    expect(ticket.ownerId).toBe('USR-1')
    expect(ticket.status).toBe('in-progress')
  })

  it('refuses a second operator without a take-over, and records one with it', async () => {
    const ticket = await claimTicket((await fresh()).id)
    await switchMockUser('USR-3')
    await expect(claimTicket(ticket.id)).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.code === 'claimed_by_other',
    )
    const taken = await claimTicket(ticket.id, undefined, undefined, { takeOver: true })
    expect(taken.ownerId).toBe('USR-3')
    expect(taken.claim?.takeovers).toHaveLength(1)
    expect(taken.claim?.takeovers[0]?.fromUserId).toBe('USR-1')
  })

  it('writes an audit line for the claim', async () => {
    const ticket = await claimTicket((await fresh()).id)
    const audit = await listAuditEntries({ subjectId: ticket.id, action: 'ticket.claim' })
    expect(audit.total).toBe(1)
  })
})

describe('AC-S-11 — waiting on the customer pauses the resolution clock only', () => {
  it('pauses and resumes with the paused span added to the deadline', async () => {
    const ticket = await fresh('CAP_LATE')
    const waiting = await setTicketStatus(ticket.id, 'waiting')
    expect(waiting.status).toBe('waiting')
    expect(waiting.pausedAt).toBe(EYVAR_NOW)
    expect(waiting.firstResponseDueAt).toBe(ticket.firstResponseDueAt)
    const resumed = await setTicketStatus(ticket.id, 'in-progress')
    expect(resumed.pausedAt).toBeNull()
    expect(resumed.slaDueAt).toBe(ticket.slaDueAt)
  })

  it('never pauses a suspension appeal (Q-81)', async () => {
    const ticket = await fresh('DRV_SUSPENSION_APPEAL')
    const waiting = await setTicketStatus(ticket.id, 'waiting')
    expect(waiting.pausedAt).toBeNull()
  })

  it('refuses on a decided ticket', async () => {
    const ticket = await resolveTicket((await fresh()).id)
    await expect(setTicketStatus(ticket.id, 'waiting')).rejects.toSatisfy(isApiError)
  })
})

describe('AC-S-12 — re-coding re-derives priority and the clocks', () => {
  it('moves a T3 ticket to a T1 code and clears its breach stamp', async () => {
    const ticket = await fresh('CAP_LATE')
    sweepTicketSla(addMinutes(EYVAR_NOW, 61))
    const recoded = await recodeTicket(ticket.id, 'CAP_CONDUCT')
    expect(recoded.priority).toBe('Critical')
    expect(recoded.reasonCode).toBe('CAP_CONDUCT')
    expect(minutesBetween(recoded.createdAt, recoded.firstResponseDueAt!)).toBe(0)
    expect(minutesBetween(recoded.createdAt, recoded.slaDueAt!)).toBe(240)
    expect(recoded.firstResponseBreachedAt).toBeNull()
    expect(recoded.updateDueAt).toBeNull()
  })
})

describe('AC-S-13 — transfer hands the claim over and posts an internal note', () => {
  it('names both operators on the claim and puts the note on the thread', async () => {
    const ticket = await claimTicket((await fresh()).id)
    const moved = await transferTicket(ticket.id, 'USR-3', { note: 'Rider prefers Arabic.' })
    expect(moved.ownerId).toBe('USR-3')
    expect(moved.claim?.takeovers[0]).toMatchObject({ fromUserId: 'USR-1', toUserId: 'USR-3' })
    const note = moved.messages[moved.messages.length - 1]!
    expect(note.visibility).toBe('internal')
    expect(note.body).toBe('Rider prefers Arabic.')
  })

  it('refuses without a note and refuses an unknown operator', async () => {
    const ticket = await fresh()
    await expect(transferTicket(ticket.id, 'USR-3', { note: '  ' })).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.code === 'note_required',
    )
    await expect(transferTicket(ticket.id, 'USR-NOPE', { note: 'x' })).rejects.toSatisfy(isApiError)
  })
})

describe('AC-S-21 — resolve and reopen', () => {
  it('records who resolved it and reopening leaves the row unassigned', async () => {
    const ticket = await claimTicket((await fresh()).id)
    const resolved = await resolveTicket(ticket.id)
    expect(resolved.status).toBe('resolved')
    expect(resolved.resolvedAt).toBe(EYVAR_NOW)
    expect(resolved.ownerName).toBe('Sarah Al-Rashid')
    expect(resolved.claim?.state).toBe('done')
    await expect(resolveTicket(ticket.id)).rejects.toSatisfy(isApiError)

    const reopened = await reopenTicket(ticket.id)
    expect(reopened.status).toBe('open')
    expect(reopened.ownerId).toBeNull()
    expect(reopened.resolvedAt).toBeNull()
    await expect(reopenTicket(ticket.id)).rejects.toSatisfy(isApiError)
  })

  it('a reply answers the first-response promise', async () => {
    const ticket = await fresh('TRP_LOST_ITEM')
    const replied = await replyTicket(ticket.id, 'Looking now', 'USR-1', 'Sarah Al-Rashid')
    expect(replied.firstResponseAt).toBe(EYVAR_NOW)
    expect(minutesBetween(EYVAR_NOW, replied.updateDueAt!)).toBe(30)
    expect(replied.messages[replied.messages.length - 1]?.visibility).toBe('customer')
  })

  it('a logged call that reached the customer answers it too; no answer does not', async () => {
    const reached = await logTicketCall(
      { ticketId: (await fresh()).id, outcome: 'escalated', notes: 'Called.' },
      'USR-3',
      'Lina Al-Otaibi',
    )
    expect(reached.firstResponseAt).toBe(EYVAR_NOW)
    expect(reached.ownerId).toBe('USR-3')
    const missed = await logTicketCall(
      { ticketId: (await fresh()).id, outcome: 'no-answer', notes: null },
      'USR-3',
      'Lina Al-Otaibi',
    )
    expect(missed.firstResponseAt).toBeNull()
  })
})

describe('the seeded rows reach every reading', () => {
  it('opens on the unassigned view with only unheld live tickets', async () => {
    const { items } = await listTickets({ view: 'unassigned', pageSize: 50 })
    expect(items.length).toBeGreaterThan(0)
    expect(items.every((t) => t.ownerId === null && t.status !== 'resolved')).toBe(true)
  })

  it('carries a breached ticket whose stamp predates now', async () => {
    const breached = await getTicket('TKT-505')
    expect(breached.firstResponseBreachedAt).not.toBeNull()
    expect(Date.parse(breached.firstResponseBreachedAt!)).toBeLessThan(Date.parse(EYVAR_NOW))
    expect(breached.slaBreached).toBe(true)
  })

  it('carries a ticket with a next-update promise still to keep', async () => {
    const lost = await getTicket('TKT-502')
    expect(lost.updateDueAt).not.toBeNull()
    expect(Date.parse(lost.updateDueAt!)).toBeGreaterThan(Date.parse(offsetFromNow({ minutes: 0 })))
  })
})

describe('one thread across the ticket and its conversation (S-3)', () => {
  /* AC-S-16: TKT-501 is linked to CNV-104, an email thread that is waiting. */
  it('shows what the customer wrote on the conversation, on the ticket', async () => {
    const ticket = await getTicket('TKT-501')
    const conversation = await getConversation('CNV-104')
    const visible = conversation.messages.filter((m) => m.visibility === 'customer')
    expect(visible.length).toBeGreaterThan(0)
    for (const message of visible) {
      expect(ticket.messages.map((m) => m.id)).toContain(message.id)
    }
    const stamps = ticket.messages.map((m) => Date.parse(m.sentAt))
    expect([...stamps].sort((a, b) => a - b)).toEqual(stamps)
  })

  it('sends a ticket reply down the conversation, once, with the same id', async () => {
    const before = (await getConversation('CNV-104')).messages.length
    const replied = await replyTicket('TKT-501', 'We have refunded the charge.', 'USR-1', 'Sarah Al-Rashid')
    const conversation = await getConversation('CNV-104')
    expect(conversation.messages.length).toBe(before + 1)
    const last = conversation.messages.at(-1)!
    expect(last.body).toBe('We have refunded the charge.')
    expect(last.direction).toBe('outbound')
    expect(replied.messages.filter((m) => m.id === last.id).length).toBe(1)
    expect((await getTicket('TKT-501')).messages.filter((m) => m.id === last.id).length).toBe(1)
  })

  it('lands a conversation reply on the ticket and counts it as touching the customer', async () => {
    const message = await replyConversation('CNV-104', { body: 'Checking the receipt now.' })
    const ticket = await getTicket('TKT-501')
    const mirrored = ticket.messages.filter((m) => m.id === message.id)
    expect(mirrored.length).toBe(1)
    expect(mirrored[0]!.visibility).toBe('customer')
    expect(ticket.firstResponseAt).not.toBeNull()
  })

  it('keeps an internal note on the conversation off the ticket thread', async () => {
    const note = await replyConversation('CNV-104', { body: 'Card issuer says pending.', visibility: 'internal' })
    const ticket = await getTicket('TKT-501')
    expect(ticket.messages.some((m) => m.id === note.id)).toBe(false)
  })

  /* AC-S-18 / O4: TKT-502 is linked to CNV-106, a phone conversation. */
  it('records a logged call on the phone conversation as an internal system line', async () => {
    await logTicketCall(
      { ticketId: 'TKT-502', outcome: 'no-answer', notes: 'Rang twice.' },
      'USR-3',
      'Lina Al-Otaibi',
    )
    const conversation = await getConversation('CNV-106')
    const line = conversation.messages.at(-1)!
    expect(line.authorKind).toBe('system')
    expect(line.visibility).toBe('internal')
    expect(line.body).toContain('Lina Al-Otaibi')
    expect(line.body).toContain('Rang twice.')
  })
})

describe('Take next (§6.5)', () => {
  it('claims the most urgent unheld live ticket for the signed-in operator', async () => {
    await switchMockUser('USR-3')
    const queue = await listTickets({ view: 'unassigned', sort: { field: 'urgency', dir: 'asc' }, pageSize: 1 })
    const expected = queue.items[0]!
    const taken = await takeNextTicket()
    expect(taken.id).toBe(expected.id)
    expect(taken.ownerId).toBe('USR-3')
    expect(taken.status).not.toBe('open')
  })

  it('answers not found when nothing is waiting', async () => {
    let open = await listTickets({ view: 'unassigned', pageSize: 50 })
    while (open.items.length > 0) {
      await takeNextTicket()
      open = await listTickets({ view: 'unassigned', pageSize: 50 })
    }
    await expect(takeNextTicket()).rejects.toSatisfy((e: unknown) => isApiError(e) && e.status === 404)
  })
})

describe('search by phone (§7.5)', () => {
  it('finds a ticket by the digits of the requester phone number', async () => {
    const ticket = await getTicket('TKT-501')
    expect(ticket.requesterPhone).not.toBeNull()
    const digits = ticket.requesterPhone!.replace(/\D/g, '').slice(-7)
    const { items } = await listTickets({ q: digits, pageSize: 50 })
    expect(items.map((t) => t.id)).toContain('TKT-501')
  })
})

describe('the policy reaches every open ticket (§9.1)', () => {
  it('re-derives the promises on open tickets when the grid moves, and audits the count', async () => {
    const before = await getTicket('TKT-501')
    const policy = currentPolicy()
    const tier = ticketSlaTargets(policy, before.reasonCode).tier
    const moved = {
      ...policy,
      sla: {
        ...policy.sla,
        queues: policy.sla.queues.map((queue) =>
          queue.queueId !== 'ticket'
            ? queue
            : {
                ...queue,
                tiers: queue.tiers.map((cell) =>
                  cell.tier !== tier
                    ? cell
                    : { ...cell, firstResponseMinutes: ticketSlaTargets(policy, before.reasonCode).firstResponseMinutes + 60 },
                ),
              },
        ),
      },
    }
    const count = rederiveOpenTicketClocks(moved)
    expect(count).toBeGreaterThan(0)
    const after = await getTicket('TKT-501')
    expect(minutesBetween(before.firstResponseDueAt!, after.firstResponseDueAt!)).toBe(60)
    const audit = await listAuditEntries({ subjectType: 'policy' })
    const line = audit.items.find((entry) => entry.action === 'ticket.clocksRederived')
    expect(line?.detail.params?.count).toBe(count)
    const decided = await getTicket('TKT-504')
    expect(decided.status).toBe('resolved')
  })
})

describe('CSAT (§9.4)', () => {
  it('carries a rating on a decided ticket and asks for one when a ticket is resolved', async () => {
    expect((await getTicket('TKT-504')).csat?.score).toBe(4)
    expect((await getTicket('TKT-501')).csat).toBeNull()
    await resolveTicket('TKT-501')
    const audit = await listAuditEntries({ subjectType: 'ticket', subjectId: 'TKT-501' })
    expect(audit.items.some((entry) => entry.action === 'ticket.csatRequested')).toBe(true)
  })
})
