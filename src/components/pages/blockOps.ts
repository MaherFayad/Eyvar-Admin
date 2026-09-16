/**
 * Pure tree operations over `Block[]` (D39): the one place that treats a
 * toggle's children and a columns column's children alike as "a container".
 * Undo is snapshot-based (`usePageEditor.ts`), so writes need no inverse.
 */

import { ulid } from '@/lib/ids'
import type { Block, ColumnsBlock, ToggleBlock } from '@/data/types/page'

interface Location {
  container: Block[]
  index: number
}

function childLists(block: Block): Block[][] {
  if (block.type === 'toggle') return [block.blocks]
  if (block.type === 'columns') return block.columns.map((c) => c.blocks)
  return []
}

/** Depth-first search for `id`. `null` when the tree does not hold it. */
export function findBlock(blocks: readonly Block[], id: string): Block | null {
  for (const block of blocks) {
    if (block.id === id) return block
    for (const children of childLists(block)) {
      const found = findBlock(children, id)
      if (found) return found
    }
  }
  return null
}

function locate(blocks: Block[], id: string): Location | null {
  for (let i = 0; i < blocks.length; i += 1) {
    if (blocks[i]!.id === id) return { container: blocks, index: i }
    for (const children of childLists(blocks[i]!)) {
      const found = locate(children, id)
      if (found) return found
    }
  }
  return null
}

function cloneShallow(block: Block): Block {
  if (block.type === 'toggle') return { ...block, blocks: block.blocks.map(cloneShallow) }
  if (block.type === 'columns') {
    return { ...block, columns: block.columns.map((c) => ({ ...c, blocks: c.blocks.map(cloneShallow) })) }
  }
  return { ...block }
}

/** Rebuilds the tree from the root, handing the found block's own sibling array and index to `mutate`. Never mutates the input. */
function rebuild(blocks: readonly Block[], id: string, mutate: (container: Block[], index: number) => void): Block[] {
  const next = blocks.map(cloneShallow)
  const loc = locate(next, id)
  if (loc) mutate(loc.container, loc.index)
  return next
}

/** Inserts at the top level. */
export function insertBlock(blocks: readonly Block[], index: number, block: Block): Block[] {
  const next = blocks.map(cloneShallow)
  next.splice(Math.max(0, Math.min(index, next.length)), 0, block)
  return next
}

/**
 * Inserts into a named container: page root, a toggle's list, or one column
 * of a columns block. Every insertion entry point resolves to this one call.
 */
export function insertIntoContainer(
  blocks: readonly Block[],
  parentId: string | null,
  columnIndex: number | null,
  index: number,
  block: Block,
): Block[] {
  if (parentId === null) return insertBlock(blocks, index, block)
  return rebuild(blocks, parentId, (container, at) => {
    const parent = container[at]
    if (parent?.type === 'toggle') {
      parent.blocks.splice(Math.max(0, Math.min(index, parent.blocks.length)), 0, block)
    } else if (parent?.type === 'columns' && columnIndex !== null) {
      const column = parent.columns[columnIndex]
      if (column) column.blocks.splice(Math.max(0, Math.min(index, column.blocks.length)), 0, block)
    }
  })
}

/** Moves an EXISTING block into another column — the block menu's "Move to column…". A no-op if `id` names its own current column already. */
export function moveToContainer(
  blocks: readonly Block[],
  id: string,
  parentId: string,
  columnIndex: number,
): Block[] {
  const found = findBlock(blocks, id)
  if (!found) return blocks.map(cloneShallow)
  const removed = removeBlock(blocks, id) ?? blocks.map(cloneShallow)
  return insertIntoContainer(removed, parentId, columnIndex, Number.MAX_SAFE_INTEGER, found)
}

/** Every `columns` block in the tree, for the "Move to column…" picker — id, column count, and each column's current block count. */
export function listColumnsBlocks(
  blocks: readonly Block[],
): Array<{ id: string; columns: Array<{ count: number }> }> {
  const found: Array<{ id: string; columns: Array<{ count: number }> }> = []
  for (const block of blocks) {
    if (block.type === 'columns') {
      found.push({ id: block.id, columns: block.columns.map((c) => ({ count: c.blocks.length })) })
      for (const column of block.columns) found.push(...listColumnsBlocks(column.blocks))
    } else {
      for (const children of childLists(block)) found.push(...listColumnsBlocks(children))
    }
  }
  return found
}

/** Removes `id` from wherever it sits. `null` when not found. */
export function removeBlock(blocks: readonly Block[], id: string): Block[] | null {
  if (!findBlock(blocks, id)) return null
  return rebuild(blocks, id, (container, index) => {
    container.splice(index, 1)
  })
}

/** Moves `id` one step within its own sibling list. No-op at either end (AC-1199). */
export function moveBlock(blocks: readonly Block[], id: string, direction: -1 | 1): Block[] {
  return rebuild(blocks, id, (container, index) => {
    const next = index + direction
    if (next < 0 || next >= container.length) return
    const [moved] = container.splice(index, 1)
    container.splice(next, 0, moved!)
  })
}

function withFreshIds(block: Block): Block {
  const id = ulid()
  if (block.type === 'toggle') return { ...block, id, blocks: block.blocks.map(withFreshIds) }
  if (block.type === 'columns') {
    return { ...block, id, columns: block.columns.map((c) => ({ ...c, blocks: c.blocks.map(withFreshIds) })) }
  }
  return { ...block, id }
}

/** Duplicates `id` immediately after itself, with fresh ids recursively (AC-1199, Ctrl+D). */
export function duplicateBlock(blocks: readonly Block[], id: string): Block[] {
  const found = findBlock(blocks, id)
  if (!found) return blocks.map(cloneShallow)
  const copy = withFreshIds(found)
  return rebuild(blocks, id, (container, index) => {
    container.splice(index + 1, 0, copy)
  })
}

/** Every `reportId` already placed as a `report` or `metric` block — the picker's "already placed" reason (AC-1204). */
export function collectReportIds(blocks: readonly Block[]): string[] {
  const ids: string[] = []
  for (const block of blocks) {
    if (block.type === 'report' || block.type === 'metric') ids.push(block.reportId)
    for (const children of childLists(block)) ids.push(...collectReportIds(children))
  }
  return ids
}

/** Recursively counts every block, matching `validatePage`'s own count — gates the 200-block cap before a save round trip. */
export function countBlocks(blocks: readonly Block[]): number {
  let total = 0
  for (const block of blocks) {
    total += 1
    for (const children of childLists(block)) total += countBlocks(children)
  }
  return total
}

/** Wraps `id` in a new two-column block: the original on the start side, an empty end column (§5 "Turn into columns", AC-1207). */
export function turnIntoColumns(blocks: readonly Block[], id: string): Block[] {
  const found = findBlock(blocks, id)
  if (!found) return blocks.map(cloneShallow)
  const wrapper: ColumnsBlock = {
    id: ulid(),
    type: 'columns',
    columns: [
      { width: 6, blocks: [found] },
      { width: 6, blocks: [] },
    ],
  }
  return rebuild(blocks, id, (container, index) => {
    container.splice(index, 1, wrapper)
  })
}

/** Wraps `id` in a new toggle. */
export function turnIntoToggle(blocks: readonly Block[], id: string, title: string): Block[] {
  const found = findBlock(blocks, id)
  if (!found) return blocks.map(cloneShallow)
  const wrapper: ToggleBlock = { id: ulid(), type: 'toggle', title, open: true, blocks: [found] }
  return rebuild(blocks, id, (container, index) => {
    container.splice(index, 1, wrapper)
  })
}

/** Replaces one block with another that keeps the same id — every field edit, and a non-wrapping "Turn into" (AC-1206). */
export function replaceBlock(blocks: readonly Block[], id: string, next: Block): Block[] {
  return rebuild(blocks, id, (container, index) => {
    container[index] = { ...next, id }
  })
}

/** Toggles a `toggle` block's own `open` flag (AC-1192). */
export function setToggleOpen(blocks: readonly Block[], id: string, open: boolean): Block[] {
  return rebuild(blocks, id, (container, index) => {
    const block = container[index]
    if (block?.type === 'toggle') container[index] = { ...block, open }
  })
}
