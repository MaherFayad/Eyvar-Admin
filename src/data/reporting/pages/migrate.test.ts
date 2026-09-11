import { describe, expect, it } from 'vitest'
import { dashboardFixtures } from '../../fixtures/reports'
import { tileSpan } from '../../types/report'
import { dashboardToPage } from './migrate'
import { validatePage } from './validate'

/** Every `report` block in the page, in document order, depth-first. */
function reportBlocks(page: ReturnType<typeof dashboardToPage>) {
  const found: { reportId: string; title: string | null }[] = []
  const walk = (blocks: typeof page.blocks): void => {
    for (const block of blocks) {
      if (block.type === 'report') found.push({ reportId: block.reportId, title: block.title })
      else if (block.type === 'toggle') walk(block.blocks)
      else if (block.type === 'columns') for (const column of block.columns) walk(column.blocks)
    }
  }
  walk(page.blocks)
  return found
}

describe('dashboardToPage', () => {
  it.each(dashboardFixtures.map((d) => [d.id, d] as const))(
    '%s round-trips through validatePage with no violations',
    (_id, dashboard) => {
      expect(validatePage(dashboardToPage(dashboard))).toEqual([])
    },
  )

  it.each(dashboardFixtures.map((d) => [d.id, d] as const))(
    '%s produces exactly one report block per tile, in tile order',
    (_id, dashboard) => {
      const page = dashboardToPage(dashboard)
      const expectedOrder = [...dashboard.tiles].sort((a, b) => a.order - b.order).map((t) => t.reportId)
      expect(reportBlocks(page).map((b) => b.reportId)).toEqual(expectedOrder)
    },
  )

  it('carries the board scope (range and filters) onto the page', () => {
    const growth = dashboardFixtures.find((d) => d.id === 'DSH-3')!
    const page = dashboardToPage(growth)
    expect(page.scope).toEqual({ range: growth.range, filters: growth.filters })
  })

  it('pairs consecutive half tiles into a two-column, 6-width columns block (DSH-1)', () => {
    const dashboard = dashboardFixtures.find((d) => d.id === 'DSH-1')!
    const ordered = [...dashboard.tiles].sort((a, b) => a.order - b.order)
    expect(ordered.map((t) => tileSpan(t))).toEqual(['full', 'half', 'half'])

    const page = dashboardToPage(dashboard)
    expect(page.blocks).toHaveLength(2)
    expect(page.blocks[0]).toMatchObject({ type: 'report', reportId: ordered[0]!.reportId })
    const columns = page.blocks[1]
    if (columns?.type !== 'columns') throw new Error('expected the second block to be a columns block')
    expect(columns.columns).toHaveLength(2)
    expect(columns.columns.map((c) => c.width)).toEqual([6, 6])
    expect(columns.columns[0]!.blocks[0]).toMatchObject({ type: 'report', reportId: ordered[1]!.reportId })
    expect(columns.columns[1]!.blocks[0]).toMatchObject({ type: 'report', reportId: ordered[2]!.reportId })
  })

  it('produces no blocks for a dashboard with no tiles (DSH-2)', () => {
    const dashboard = dashboardFixtures.find((d) => d.id === 'DSH-2')!
    expect(dashboard.tiles).toHaveLength(0)
    expect(dashboardToPage(dashboard).blocks).toEqual([])
  })

  it('carries a dangling tile\'s pinnedName into its report block\'s title (DSH-3, AC-1180)', () => {
    const dashboard = dashboardFixtures.find((d) => d.id === 'DSH-3')!
    const dangling = dashboard.tiles.find((t) => t.reportId === 'RPT-DELETED')!
    const page = dashboardToPage(dashboard)
    const block = reportBlocks(page).find((b) => b.reportId === 'RPT-DELETED')
    expect(block).toBeDefined()
    expect(block!.title).toBe(dangling.pinnedName)
  })

  it('keeps a full tile standing alone even when it directly follows a half tile (DSH-3)', () => {
    const dashboard = dashboardFixtures.find((d) => d.id === 'DSH-3')!
    const ordered = [...dashboard.tiles].sort((a, b) => a.order - b.order)
    expect(ordered.map((t) => tileSpan(t))).toEqual(['half', 'half', 'full'])

    const page = dashboardToPage(dashboard)
    expect(page.blocks).toHaveLength(2)
    expect(page.blocks[0]!.type).toBe('columns')
    expect(page.blocks[1]).toMatchObject({ type: 'report', reportId: ordered[2]!.reportId })
  })

  it('is pure: the same dashboard produces deep-equal pages on every call, and the input is untouched', () => {
    const dashboard = dashboardFixtures[0]!
    const before = JSON.stringify(dashboard)
    const first = dashboardToPage(dashboard)
    const second = dashboardToPage(dashboard)
    expect(first).toEqual(second)
    expect(JSON.stringify(dashboard)).toBe(before)
  })

  it('reuses the dashboard id so a dashboard route can alias a page route', () => {
    for (const dashboard of dashboardFixtures) {
      expect(dashboardToPage(dashboard).id).toBe(dashboard.id)
    }
  })
})
