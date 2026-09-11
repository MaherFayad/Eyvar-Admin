import { describe, it, expect } from 'vitest'
import { disableMockLatency, listPages, resetDataLayer } from '@/data/clients'

describe('debug', () => {
  it('lists dashboard pages', async () => {
    disableMockLatency()
    resetDataLayer()
    const res = await listPages({ pageSize: 100, filters: [{ field: 'kind', op: 'eq', value: 'dashboard' }] })
    console.log(JSON.stringify(res.items.map(p => ({id: p.id, title: p.title, kind: p.kind})), null, 2))
    expect(res.items.length).toBeGreaterThan(0)
  })
})
