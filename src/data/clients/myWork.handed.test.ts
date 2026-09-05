/**
 * My Work › Handed to me (SUPPORT-UX-PLAN.md §6.4): work that is mine because a
 * colleague handed it over, distinct from work I claimed.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, mockFailures } from '../config'
import { listWorkItems } from './myWork'
import { resetMockSession, switchMockUser } from './session'
import { claimTicket, resetTickets, transferTicket } from './tickets'

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
  resetTickets()
  resetMockSession()
})

describe('Handed to me', () => {
  it('lists a ticket a colleague transferred to me, and not one I claimed myself', async () => {
    await switchMockUser('USR-1')
    await claimTicket('TKT-501', 'USR-1', 'Sarah Al-Rashid')
    await transferTicket('TKT-501', 'USR-3', { note: 'Yours: the rider asked for Lina by name.' })

    await switchMockUser('USR-3')
    await claimTicket('TKT-502', 'USR-3', 'Lina Al-Otaibi')
    const handed = await listWorkItems({ view: 'handed', pageSize: 100 })
    const keys = handed.items.map((w) => w.key)
    expect(keys).toContain('ticket:TKT-501')
    expect(keys).not.toContain('ticket:TKT-502')

    const mine = await listWorkItems({ view: 'mine', pageSize: 100 })
    expect(mine.items.map((w) => w.key)).toEqual(expect.arrayContaining(['ticket:TKT-501', 'ticket:TKT-502']))
  })
})
