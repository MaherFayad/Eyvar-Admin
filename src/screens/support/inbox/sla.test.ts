/**
 * D22's two numbers and its breach asymmetry, as pure-function tests on
 * `sla.ts` (AC-963..AC-966). Ported unchanged from the retired console suite;
 * the rendered consequence (breached first, then oldest waiting) is asserted
 * on the list in `inbox.test.tsx`. No fixture is imported: every row comes
 * back through the client.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { EYVAR_NOW, disableMockLatency, listConversations, resetDataLayer } from '@/data/clients'
import type { Conversation } from '@/data/types'
import { compareForQueue, conversationSla, runningClock } from './sla'

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

/** A clock's window in milliseconds: the promise itself. Never compare `dueAt` as a string. */
function windowMs(clock: { startedAt: string | null; dueAt: string | null } | null): number | null {
  if (clock === null || clock.startedAt === null || clock.dueAt === null) return null
  return Date.parse(clock.dueAt) - Date.parse(clock.startedAt)
}

async function byId(id: string): Promise<Conversation> {
  const page = await listConversations({ pageSize: 200 })
  const found = page.items.find((conversation) => conversation.id === id)
  if (!found) throw new Error(`No conversation ${id}`)
  return found
}

describe('the SLA comes from D22 and is not invented', () => {
  it('promises a chat with no ticket 45 seconds and 20 minutes', async () => {
    const conversation = await byId('CNV-101')
    const sla = conversationSla(conversation)
    expect(sla.source).toBe('chat-policy')
    expect(windowMs(sla.firstResponse)).toBe(45_000)
    expect(windowMs(sla.resolution)).toBe(20 * 60_000)
    expect(sla.firstResponseBreached).toBe(true)
  })

  it('builds the first-response clock with its window, so the pill can count in seconds', async () => {
    const conversation = await byId('CNV-101')
    const sla = conversationSla(conversation)
    const { clock } = runningClock(conversation, sla, EYVAR_NOW).result
    expect(clock.kind).not.toBe('no-clock')
    expect(clock.kind === 'no-clock' ? null : clock.windowMs).toBe(45_000)
  })

  it('promises an email with no ticket four hours, not forty-five seconds', async () => {
    const conversation = await byId('CNV-110')
    const sla = conversationSla(conversation)
    expect(sla.source).toBe('chat-policy')
    expect(windowMs(sla.firstResponse)).toBe(4 * 60 * 60_000)
    expect(sla.firstResponseBreached).toBe(false)
  })

  it('takes a ticket-backed conversation clocks from the row, not from the policy', async () => {
    const conversation = await byId('CNV-104')
    const sla = conversationSla(conversation)
    expect(sla.source).toBe('legacy-reason-code')
    expect(sla.firstResponse?.dueAt).toBe(conversation.firstResponseDueAt)
    expect(sla.resolution?.dueAt).toBe(conversation.slaDueAt)
    expect(sla.resolution?.targetMinutes).toBe(conversation.slaTargetMinutes)
  })

  it('gives a phone conversation no clock of either kind', async () => {
    const sla = conversationSla(await byId('CNV-106'))
    expect(sla.firstResponse).toBeNull()
    expect(sla.resolution).toBeNull()
    expect(sla.firstResponseBreached).toBe(false)
    expect(sla.resolutionBreached).toBe(false)
  })

  it('pauses both clocks while a conversation is snoozed', async () => {
    const sla = conversationSla(await byId('CNV-111'))
    expect(sla.paused).toBe(true)
    expect(sla.firstResponse).toBeNull()
    expect(sla.firstResponseBreached).toBe(false)
    expect(sla.resolutionBreached).toBe(false)
  })
})

describe('a first-response breach reorders and a resolution breach does not', () => {
  it('leaves a resolution-breached row where waitingSince put it', async () => {
    const answeredLate = await byId('CNV-102')
    const sla = conversationSla(answeredLate)
    expect(sla.resolutionBreached).toBe(true)
    expect(sla.firstResponseBreached).toBe(false)
    const fresher = await byId('CNV-110')
    const order = compareForQueue(
      { conversation: answeredLate, sla },
      { conversation: fresher, sla: conversationSla(fresher) },
    )
    expect(order).toBeGreaterThan(0)
  })

  it('sorts a first-response-breached row above a longer-waiting unbreached one', async () => {
    const breached = await byId('CNV-107')
    const waitingLonger = await byId('CNV-110')
    expect(Date.parse(breached.waitingSince as string)).toBeGreaterThan(Date.parse(waitingLonger.waitingSince as string))
    const order = compareForQueue(
      { conversation: breached, sla: conversationSla(breached) },
      { conversation: waitingLonger, sla: conversationSla(waitingLonger) },
    )
    expect(order).toBeLessThan(0)
  })
})
