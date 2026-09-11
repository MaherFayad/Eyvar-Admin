/**
 * Pure tree operations — AC-1198 (move to column, disabled with a reason
 * lives in `BlockMenu`), AC-1199 (move/duplicate/delete), AC-1207 (turn into
 * columns). No rendering: every op is a `Block[] -> Block[]` function.
 */

import { describe, expect, it } from 'vitest'
import type { Block, ColumnsBlock, HeadingBlock, ToggleBlock } from '@/data/types/page'
import {
  collectReportIds,
  countBlocks,
  duplicateBlock,
  findBlock,
  insertIntoContainer,
  listColumnsBlocks,
  moveBlock,
  moveToContainer,
  removeBlock,
  replaceBlock,
  setToggleOpen,
  turnIntoColumns,
} from './blockOps'

function heading(id: string, text = ''): HeadingBlock {
  return { id, type: 'heading', level: 2, text }
}

describe('moveBlock — AC-1199', () => {
  it('swaps a block with its neighbour and is a no-op at either end', () => {
    const blocks = [heading('a'), heading('b'), heading('c')]
    const moved = moveBlock(blocks, 'b', -1)
    expect(moved.map((b) => b.id)).toEqual(['b', 'a', 'c'])

    const atTop = moveBlock(blocks, 'a', -1)
    expect(atTop.map((b) => b.id)).toEqual(['a', 'b', 'c'])
  })

  it('moves a block inside a toggle without touching the root list', () => {
    const toggle: ToggleBlock = { id: 't', type: 'toggle', title: '', open: true, blocks: [heading('x'), heading('y')] }
    const next = moveBlock([toggle], 'y', -1)
    const found = findBlock(next, 't') as ToggleBlock
    expect(found.blocks.map((b) => b.id)).toEqual(['y', 'x'])
  })
})

describe('duplicateBlock — AC-1199 Ctrl+D', () => {
  it('inserts a copy right after the original with a fresh id', () => {
    const blocks = [heading('a', 'Hello')]
    const next = duplicateBlock(blocks, 'a')
    expect(next).toHaveLength(2)
    expect(next[0]!.id).toBe('a')
    expect(next[1]!.id).not.toBe('a')
    expect((next[1] as HeadingBlock).text).toBe('Hello')
  })

  it('duplicates a columns block’s whole subtree with fresh ids throughout', () => {
    const columns: ColumnsBlock = {
      id: 'c',
      type: 'columns',
      columns: [{ width: 6, blocks: [heading('inner')] }, { width: 6, blocks: [] }],
    }
    const next = duplicateBlock([columns], 'c')
    const copy = next[1] as ColumnsBlock
    expect(copy.id).not.toBe('c')
    expect(copy.columns[0]!.blocks[0]!.id).not.toBe('inner')
  })
})

describe('removeBlock', () => {
  it('removes the block and returns null when the id is not found', () => {
    const blocks = [heading('a'), heading('b')]
    expect(removeBlock(blocks, 'a')!.map((b) => b.id)).toEqual(['b'])
    expect(removeBlock(blocks, 'missing')).toBeNull()
  })
})

describe('insertIntoContainer', () => {
  it('inserts at the root when the container is null', () => {
    const next = insertIntoContainer([heading('a')], null, null, 0, heading('b'))
    expect(next.map((b) => b.id)).toEqual(['b', 'a'])
  })

  it('inserts into a specific column of a columns block', () => {
    const columns: ColumnsBlock = { id: 'c', type: 'columns', columns: [{ width: 6, blocks: [] }, { width: 6, blocks: [] }] }
    const next = insertIntoContainer([columns], 'c', 1, 0, heading('new'))
    const found = findBlock(next, 'c') as ColumnsBlock
    expect(found.columns[1]!.blocks.map((b) => b.id)).toEqual(['new'])
    expect(found.columns[0]!.blocks).toEqual([])
  })
})

describe('moveToContainer — the block menu’s Move to column', () => {
  it('moves an existing block from the root into a named column', () => {
    const columns: ColumnsBlock = { id: 'c', type: 'columns', columns: [{ width: 6, blocks: [] }, { width: 6, blocks: [] }] }
    const blocks: Block[] = [heading('a'), columns]
    const next = moveToContainer(blocks, 'a', 'c', 0)
    expect(next.some((b) => b.id === 'a')).toBe(false)
    const found = findBlock(next, 'c') as ColumnsBlock
    expect(found.columns[0]!.blocks.map((b) => b.id)).toEqual(['a'])
  })
})

describe('listColumnsBlocks — the Move to column picker’s source of targets', () => {
  it('finds every columns block, including nested ones, with each column’s count', () => {
    const inner: ColumnsBlock = { id: 'inner', type: 'columns', columns: [{ width: 6, blocks: [] }, { width: 6, blocks: [] }] }
    const outer: ColumnsBlock = { id: 'outer', type: 'columns', columns: [{ width: 6, blocks: [inner] }, { width: 6, blocks: [heading('x')] }] }
    const found = listColumnsBlocks([outer])
    expect(found.map((c) => c.id).sort()).toEqual(['inner', 'outer'])
    const outerEntry = found.find((c) => c.id === 'outer')!
    expect(outerEntry.columns[1]!.count).toBe(1)
  })
})

describe('turnIntoColumns — AC-1207', () => {
  it('wraps the block in a two-column block, original on the start side', () => {
    const next = turnIntoColumns([heading('a')], 'a')
    expect(next).toHaveLength(1)
    const wrapper = next[0] as ColumnsBlock
    expect(wrapper.type).toBe('columns')
    expect(wrapper.columns).toHaveLength(2)
    expect(wrapper.columns[0]!.blocks[0]!.id).toBe('a')
    expect(wrapper.columns[1]!.blocks).toEqual([])
  })
})

describe('setToggleOpen — AC-1192', () => {
  it('flips only the named toggle’s own open flag', () => {
    const toggle: ToggleBlock = { id: 't', type: 'toggle', title: '', open: true, blocks: [] }
    const next = setToggleOpen([toggle], 't', false)
    expect((next[0] as ToggleBlock).open).toBe(false)
  })
})

describe('replaceBlock', () => {
  it('replaces a block in place, keeping its id even if the replacement carries a different one', () => {
    const next = replaceBlock([heading('a', 'old')], 'a', heading('ignored', 'new'))
    expect(next[0]!.id).toBe('a')
    expect((next[0] as HeadingBlock).text).toBe('new')
  })
})

describe('countBlocks — the 200-block cap', () => {
  it('counts recursively across toggle and columns nesting, matching validatePage', () => {
    const toggle: ToggleBlock = { id: 't', type: 'toggle', title: '', open: true, blocks: [heading('a'), heading('b')] }
    const columns: ColumnsBlock = { id: 'c', type: 'columns', columns: [{ width: 6, blocks: [heading('x')] }, { width: 6, blocks: [] }] }
    expect(countBlocks([toggle, columns])).toBe(5)
  })
})

describe('collectReportIds — AC-1204’s already-placed reason', () => {
  it('collects every reportId from report and metric blocks, recursively', () => {
    const toggle: ToggleBlock = {
      id: 't',
      type: 'toggle',
      title: '',
      open: true,
      blocks: [{ id: 'm', type: 'metric', reportId: 'RPT-2', seriesId: null, format: 'value' }],
    }
    const blocks: Block[] = [{ id: 'r', type: 'report', reportId: 'RPT-1', view: 'chart', height: 'M', title: null }, toggle]
    expect(collectReportIds(blocks).sort()).toEqual(['RPT-1', 'RPT-2'])
  })
})
