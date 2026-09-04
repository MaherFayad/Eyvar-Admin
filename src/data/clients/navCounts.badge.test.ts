/**
 * **O8 / T1.4** — each badge is computed by its sub-tab's own client, and a
 * write moves it. **T1.6** — a claim made from My Work is the claim the source
 * queue reports. The old badges were seeded literals nobody could reconcile
 * with the page they opened (X3).
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { disableMockLatency, mockFailures } from '../config'
import { getNavCounts } from './navCounts'
import { captainCount } from './drivers'
import { listWorkItems, myWorkBacklogSize } from './myWork'
import { openRequestCount, listRequests } from './requests'
import { listSubscriptions } from './subscriptions'
import { starvedZoneCount } from './zones'
import { claimTicket, getTicket, releaseTicket, resetTickets } from './tickets'
import { switchMockUser, resetMockSession } from './session'

beforeEach(async () => {
  disableMockLatency()
  mockFailures.clear()
  /* The fixture chunk has to have landed before a reset can seed from it. */
  await getNavCounts()
  resetTickets()
  resetMockSession()
})

async function badge(subTabId: string): Promise<number | null> {
  const counts = await getNavCounts()
  return counts.subTabs.find((s) => s.subTabId === subTabId)!.count
}

describe('O8 — every badge equals the open work its default view shows, or is absent', () => {
  it('operations-my-work is the backlog the screen renders', async () => {
    expect(await badge('operations-my-work')).toBe(myWorkBacklogSize())
  })

  it('the two request tabs each equal their own open queue', async () => {
    expect(await badge('operations-ride-requests')).toBe(openRequestCount('instant'))
    expect(await badge('operations-subscription-requests')).toBe(
      openRequestCount('subscription'),
    )
    const open = await listRequests({ view: 'needs-decision', pageSize: 500 })
    expect(openRequestCount('instant') + openRequestCount('subscription')).toBe(open.total)
  })

  it('gives a roster sub-tab no badge at all', async () => {
    /**
     * **O8 refined.** People and Subscriptions open on a roster, not a backlog.
     * A roster's size is not work owed, so the chip carried a number that never
     * moved — the X3 failure in its purest form. `null` renders nothing; the
     * page's own meta line still counts the rows.
     */
    expect(await badge('operations-people'), 'People').toBeNull()
    expect(await badge('operations-subscriptions'), 'Subscriptions').toBeNull()

    /* Both rosters are still non-empty, so this is a decision about the badge
       and not an artefact of empty fixtures. */
    expect(captainCount()).toBeGreaterThan(0)
    expect((await listSubscriptions({ view: 'all', pageSize: 1 })).total).toBeGreaterThan(0)
  })

  it('management-zones stays the starved-zone count', async () => {
    expect(await badge('management-zones')).toBe(starvedZoneCount())
  })
})

describe('T1.4 — a claim moves the badge', () => {
  it('drops operations-my-work when another operator takes a ticket', async () => {
    const before = (await badge('operations-my-work'))!
    const open = await listWorkItems({ view: 'everything', pageSize: 500 })
    const ticket = open.items.find((w) => w.queue === 'ticket' && w.claim === null)!

    /* Somebody else picks it up. My Work counts what is open and in nobody
       else's name, so the badge owes one fewer item. */
    switchMockUser('USR-3')
    await claimTicket(ticket.id)
    switchMockUser('USR-1')

    expect(await badge('operations-my-work')).toBe(before - 1)
  })

  it('restores it when they release', async () => {
    const before = (await badge('operations-my-work'))!
    const open = await listWorkItems({ view: 'everything', pageSize: 500 })
    const ticket = open.items.find((w) => w.queue === 'ticket' && w.claim === null)!

    switchMockUser('USR-3')
    await claimTicket(ticket.id)
    await releaseTicket(ticket.id)
    switchMockUser('USR-1')

    expect(await badge('operations-my-work')).toBe(before)
  })
})

describe('T1.6 — My Work claims through the source queue, never a second path', () => {
  it('claims a ticket from the projection and finds it claimed on Tickets', async () => {
    const work = await listWorkItems({ view: 'unassigned', pageSize: 500 })
    const row = work.items.find((w) => w.queue === 'ticket')!
    expect(row.claim).toBeNull()

    /* The exact call `MyWorkScreen`'s `CLAIM_CLIENTS` makes: the claimant is
       left to the client, which resolves the signed-in session. */
    await claimTicket(row.id, undefined, undefined, { takeOver: false })

    const onTicketsClient = await getTicket(row.id)
    expect(onTicketsClient.ownerId, 'the ticket client reports the claim').toBe('USR-1')

    const reread = await listWorkItems({ view: 'mine', pageSize: 500 })
    expect(reread.items.map((w) => w.key), 'and the projection agrees').toContain(row.key)
  })

  it('refuses 409 when another operator holds it and no take-over is asked for', async () => {
    const work = await listWorkItems({ view: 'unassigned', pageSize: 500 })
    const row = work.items.find((w) => w.queue === 'ticket')!

    switchMockUser('USR-3')
    await claimTicket(row.id)
    switchMockUser('USR-1')

    await expect(claimTicket(row.id)).rejects.toMatchObject({
      status: 409,
      code: 'claimed_by_other',
    })
    /* A claim is not a lock: a deliberate take-over still works. */
    const taken = await claimTicket(row.id, undefined, undefined, { takeOver: true })
    expect(taken.ownerId).toBe('USR-1')
  })
})
