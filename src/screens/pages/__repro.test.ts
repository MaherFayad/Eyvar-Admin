import { describe, expect, it, beforeEach } from 'vitest'
import { disableMockLatency, getReport, mockFailures, resetDataLayer } from '@/data/clients'
import { listPages } from '@/data/clients/pages'

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

describe('repro', () => {
  it('fails when injected', async () => {
    const pages = (await listPages({ pageSize: 50 })).items
    const page = pages.find((p) => p.blocks.some((b) => b.type === 'report'))!
    const block = page.blocks.find((b) => b.type === 'report') as { reportId: string }
    mockFailures.always('reports.get')
    await expect(getReport(block.reportId)).rejects.toBeTruthy()
  })
})
