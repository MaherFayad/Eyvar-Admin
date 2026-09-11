import { describe, expect, it } from 'vitest'
import type { Block, Page } from '../../types/page'
import { validatePage } from './validate'

const basePage: Page = {
  id: 'PG-1',
  kind: 'dashboard',
  title: 'Test page',
  icon: null,
  description: null,
  ownerId: 'USR-1',
  visibility: 'team',
  tags: [],
  official: false,
  scope: { range: null, filters: [] },
  blocks: [],
  version: 1,
  publishedAt: '2026-06-01T00:00:00Z',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
  updatedBy: 'USR-1',
}

const withBlocks = (blocks: Block[]): Page => ({ ...basePage, blocks })

describe('validatePage', () => {
  it('returns no violations for a page with no blocks', () => {
    expect(validatePage(withBlocks([]))).toEqual([])
  })

  it('returns no violations for one of every simple block type', () => {
    const page = withBlocks([
      { id: 'b1', type: 'heading', level: 1, text: 'Title' },
      { id: 'b2', type: 'text', md: 'Hello' },
      { id: 'b3', type: 'callout', tone: 'info', md: 'Note' },
      { id: 'b4', type: 'divider' },
      { id: 'b5', type: 'report', reportId: 'RPT-1', view: 'chart', height: 'M', title: null },
      { id: 'b6', type: 'metric', reportId: 'RPT-1', seriesId: null, format: 'value' },
      { id: 'b7', type: 'table', columns: [{ key: 'a', label: 'A', align: 'start' }], rows: [['1']] },
      { id: 'b8', type: 'alert-status', ruleIds: ['ALR-1'] },
      { id: 'b9', type: 'agent-insight', jobId: 'JOB-1', findingId: 'F-1', md: 'x', runIds: ['RUN-1'] },
      { id: 'b10', type: 'bookmark', target: { kind: 'page', id: 'PG-2' } },
    ])
    expect(validatePage(page)).toEqual([])
  })

  it('flags a page over the 200-block cap, counted recursively', () => {
    const many: Block[] = Array.from({ length: 201 }, (_, i) => ({
      id: `b${i}`,
      type: 'divider' as const,
    }))
    const violations = validatePage(withBlocks(many))
    expect(violations).toContainEqual(expect.objectContaining({ code: 'too-many-blocks' }))
  })

  it('flags a toggle nested inside a toggle', () => {
    const page = withBlocks([
      {
        id: 'outer',
        type: 'toggle',
        title: 'Outer',
        open: true,
        blocks: [{ id: 'inner', type: 'toggle', title: 'Inner', open: false, blocks: [] }],
      },
    ])
    expect(validatePage(page)).toContainEqual(
      expect.objectContaining({ code: 'toggle-in-toggle', blockId: 'inner' }),
    )
  })

  it('flags a columns block nested inside a columns block', () => {
    const page = withBlocks([
      {
        id: 'outer',
        type: 'columns',
        columns: [
          {
            width: 6,
            blocks: [{ id: 'inner', type: 'columns', columns: [{ width: 6, blocks: [] }, { width: 6, blocks: [] }] }],
          },
          { width: 6, blocks: [] },
        ],
      },
    ])
    expect(validatePage(page)).toContainEqual(
      expect.objectContaining({ code: 'columns-in-columns', blockId: 'inner' }),
    )
  })

  it('allows a toggle inside a columns block (only columns rejects its own nesting)', () => {
    const page = withBlocks([
      {
        id: 'cols',
        type: 'columns',
        columns: [
          { width: 6, blocks: [{ id: 'tog', type: 'toggle', title: 'T', open: false, blocks: [] }] },
          { width: 6, blocks: [] },
        ],
      },
    ])
    expect(validatePage(page)).toEqual([])
  })

  it('flags a columns block with fewer than 2 children', () => {
    const page = withBlocks([{ id: 'c', type: 'columns', columns: [{ width: 12, blocks: [] }] }])
    expect(validatePage(page)).toContainEqual(expect.objectContaining({ code: 'columns-count' }))
  })

  it('flags a columns block with more than 4 children', () => {
    const page = withBlocks([
      {
        id: 'c',
        type: 'columns',
        columns: [
          { width: 3, blocks: [] },
          { width: 3, blocks: [] },
          { width: 3, blocks: [] },
          { width: 3, blocks: [] },
          { width: 0, blocks: [] },
        ],
      },
    ])
    expect(validatePage(page)).toContainEqual(expect.objectContaining({ code: 'columns-count' }))
  })

  it('flags column widths that sum to more than 12', () => {
    const page = withBlocks([
      {
        id: 'c',
        type: 'columns',
        columns: [
          { width: 8, blocks: [] },
          { width: 8, blocks: [] },
        ],
      },
    ])
    expect(validatePage(page)).toContainEqual(expect.objectContaining({ code: 'columns-width-sum' }))
  })

  it('allows unset widths to share the remainder without violation', () => {
    const page = withBlocks([
      {
        id: 'c',
        type: 'columns',
        columns: [
          { width: 6, blocks: [] },
          { blocks: [] },
        ],
      },
    ])
    expect(validatePage(page)).toEqual([])
  })

  it('flags a non-integer or out-of-range column width', () => {
    const page = withBlocks([
      {
        id: 'c',
        type: 'columns',
        columns: [
          { width: 6.5, blocks: [] },
          { width: 6, blocks: [] },
        ],
      },
    ])
    expect(validatePage(page)).toContainEqual(expect.objectContaining({ code: 'columns-width-invalid' }))
  })

  it('flags a text block over 8000 characters', () => {
    const page = withBlocks([{ id: 't', type: 'text', md: 'x'.repeat(8001) }])
    expect(validatePage(page)).toContainEqual(expect.objectContaining({ code: 'text-too-long', blockId: 't' }))
  })

  it('allows a text block at exactly the 8000-character cap', () => {
    const page = withBlocks([{ id: 't', type: 'text', md: 'x'.repeat(8000) }])
    expect(validatePage(page)).toEqual([])
  })

  it('flags a heading over 200 characters', () => {
    const page = withBlocks([{ id: 'h', type: 'heading', level: 1, text: 'x'.repeat(201) }])
    expect(validatePage(page)).toContainEqual(expect.objectContaining({ code: 'heading-too-long', blockId: 'h' }))
  })

  it('flags a report block whose reportId is empty', () => {
    const page = withBlocks([
      { id: 'r', type: 'report', reportId: '', view: 'chart', height: 'M', title: null },
    ])
    expect(validatePage(page)).toContainEqual(expect.objectContaining({ code: 'report-id-invalid', blockId: 'r' }))
  })

  it('flags a report block whose reportId is not a string', () => {
    const page = withBlocks([
      { id: 'r', type: 'report', reportId: 42 as unknown as string, view: 'chart', height: 'M', title: null },
    ])
    expect(validatePage(page)).toContainEqual(expect.objectContaining({ code: 'report-id-invalid', blockId: 'r' }))
  })

  it('flags a block id repeated within the page, including across nesting', () => {
    const page = withBlocks([
      { id: 'dup', type: 'divider' },
      {
        id: 'wrap',
        type: 'toggle',
        title: 'T',
        open: false,
        blocks: [{ id: 'dup', type: 'divider' }],
      },
    ])
    expect(validatePage(page)).toContainEqual(expect.objectContaining({ code: 'duplicate-block-id', blockId: 'dup' }))
  })

  it('flags an unknown block type instead of throwing', () => {
    const page = withBlocks([{ id: 'x', type: 'not-a-real-type' } as unknown as Block])
    expect(validatePage(page)).toContainEqual(expect.objectContaining({ code: 'unknown-block-type', blockId: 'x' }))
  })

  it('never throws on a wildly malformed page', () => {
    const garbage = { blocks: [null, 42, 'x', { type: 'columns' }] } as unknown as Page
    expect(() => validatePage(garbage)).not.toThrow()
    expect(validatePage(garbage).length).toBeGreaterThan(0)
  })

  it('never throws when blocks is missing entirely', () => {
    const garbage = {} as unknown as Page
    expect(() => validatePage(garbage)).not.toThrow()
  })
})
