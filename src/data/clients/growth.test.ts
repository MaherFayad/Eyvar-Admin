/**
 * The Growth seam — the four lists, their facets and the two writes (T7.1).
 * Every assertion is over the client's own answer, never over a fixture array,
 * so a shape that stops sorting or filtering fails here rather than on a screen.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import {
  GROWTH_OPERATIONS,
  disableMockLatency,
  getGrowthIncentiveFacets,
  getGrowthPromoFacets,
  listGrowthBulkMessages,
  listGrowthIncentives,
  listGrowthPromos,
  listGrowthReferrals,
  mockFailures,
  resetDataLayer,
  setGrowthIncentiveActive,
  setGrowthPromoStatus,
} from '.'
import { isApiError } from '../types/common'

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
  resetDataLayer()
})

describe('promos', () => {
  it('returns every seeded campaign with its burn and return computed', async () => {
    const page = await listGrowthPromos()
    expect(page.total).toBe(10)
    const eyvar = page.items.find((p) => p.code === 'EYVAR30')
    /* 418 000 of 500 000 halalas. */
    expect(eyvar?.burnPercent).toBe(84)
    /* 61 subs x 8 650 halalas over 418 000 spent. */
    expect(eyvar?.roi).toBe(1.3)
  })

  it('reports a real zero return for a campaign that has spent nothing', async () => {
    const page = await listGrowthPromos()
    const welcome = page.items.find((p) => p.code === 'WELCOME5')
    expect(welcome?.roi).toBe(0)
    expect(welcome?.burnPercent).toBe(0)
  })

  it('sorts and filters through the query engine', async () => {
    const sorted = await listGrowthPromos({ sort: { field: 'roi', dir: 'desc' } })
    expect(sorted.items[0]?.code).toBe('MONTHLY10')
    const active = await listGrowthPromos({
      filters: [{ field: 'status', op: 'eq', value: 'active' }],
    })
    expect(active.items.every((p) => p.status === 'active')).toBe(true)
    expect(active.total).toBe(5)
  })

  it('searches on the code', async () => {
    const found = await listGrowthPromos({ q: 'narjis' })
    expect(found.items.map((p) => p.code)).toEqual(['NARJIS15'])
  })

  it('offers status as a facet with counts', async () => {
    const facets = await getGrowthPromoFacets()
    expect(facets.status?.find((f) => f.value === 'active')?.count).toBe(5)
  })

  it('pauses a campaign and leaves it on the list', async () => {
    const paused = await setGrowthPromoStatus('EYVAR30', 'paused')
    expect(paused.status).toBe('paused')
    const page = await listGrowthPromos()
    expect(page.items.find((p) => p.code === 'EYVAR30')?.status).toBe('paused')
    expect(page.total).toBe(10)
  })

  it('refuses to pause a campaign whose budget is spent', async () => {
    await expect(setGrowthPromoStatus('BACK2WORK', 'paused')).rejects.toSatisfy(
      (error: unknown) => isApiError(error) && error.code === 'campaign_not_pausable',
    )
  })

  it('resets between runs, so one test cannot pause a campaign for the next', async () => {
    const page = await listGrowthPromos()
    expect(page.items.find((p) => p.code === 'EYVAR30')?.status).toBe('active')
  })

  it('surfaces an injected failure so the screen can reach its error state', async () => {
    mockFailures.once(GROWTH_OPERATIONS.listPromos)
    await expect(listGrowthPromos()).rejects.toBeDefined()
    await expect(listGrowthPromos()).resolves.toBeDefined()
  })
})

describe('referrals', () => {
  it('sums both bonuses and flags the shared-device pairs', async () => {
    const page = await listGrowthReferrals()
    expect(page.total).toBe(7)
    const seed = page.items.find((r) => r.id === 'REF-seed-1')
    expect(seed?.totalBonusHalalas).toBe(3_000)
    expect(page.items.filter((r) => r.sharedDeviceFlag)).toHaveLength(2)
  })

  it('filters on the flag', async () => {
    const flagged = await listGrowthReferrals({
      filters: [{ field: 'sharedDeviceFlag', op: 'eq', value: true }],
    })
    expect(flagged.total).toBe(2)
  })
})

describe('incentives', () => {
  it('carries the reward as structure rather than as prose', async () => {
    const page = await listGrowthIncentives()
    const gold = page.items.find((i) => i.id === 'INV-3')
    expect(gold?.reward).toEqual({
      kind: 'commission-cut',
      amountHalalas: null,
      fromPercent: 20,
      toPercent: 17,
    })
  })

  it('activates and deactivates a rule, and the list reflects it', async () => {
    await setGrowthIncentiveActive('INV-1', false)
    const page = await listGrowthIncentives()
    expect(page.items.find((i) => i.id === 'INV-1')?.active).toBe(false)
    const facets = await getGrowthIncentiveFacets()
    expect(facets.active?.find((f) => f.value === 'false')?.count).toBe(2)
  })
})

describe('bulk messages', () => {
  it('returns the send log newest first when asked', async () => {
    const page = await listGrowthBulkMessages({ sort: { field: 'sentAt', dir: 'desc' } })
    expect(page.items[0]?.id).toBe('MSG-0008')
    expect(page.total).toBe(8)
  })

  it('keeps a send that reached nobody as a real zero', async () => {
    const page = await listGrowthBulkMessages()
    expect(page.items.find((m) => m.id === 'MSG-0005')?.recipientCount).toBe(0)
  })
})
