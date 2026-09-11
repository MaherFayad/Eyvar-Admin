/**
 * `validatePage(page)` — pure, never throws (D39, §11: same function runs
 * client-side and server-side on the stored JSONB).
 */

import {
  PAGE_BLOCK_MAX,
  PAGE_COLUMNS_MAX,
  PAGE_COLUMNS_MIN,
  PAGE_COLUMN_WIDTH_MAX,
  PAGE_HEADING_MAX,
  PAGE_TEXT_MD_MAX,
  type Block,
  type Page,
} from '../../types/page'

/** The smallest legal column width — the ten values (3…12) §3 names. */
const PAGE_COLUMN_WIDTH_MIN = 3

export type PageViolationCode =
  | 'too-many-blocks'
  | 'toggle-in-toggle'
  | 'columns-in-columns'
  | 'columns-count'
  | 'columns-width-sum'
  | 'columns-width-invalid'
  | 'text-too-long'
  | 'heading-too-long'
  | 'report-id-invalid'
  | 'duplicate-block-id'
  | 'unknown-block-type'
  | 'malformed-block'

export interface PageViolation {
  code: PageViolationCode
  /** Where in the block tree, e.g. `blocks[1].columns[0].blocks[0]`. */
  path: string
  blockId?: string
  message: string
}

type Container = 'toggle' | 'columns'

/** True for anything that has the shape `{ blocks: unknown }`, defensively — untrusted input is never assumed clean. */
function childList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/**
 * Walks one block and its descendants, pushing violations. Never throws: every
 * field is read defensively because this also validates data that crossed a
 * wire (§11), not only data this module produced.
 */
function visit(
  raw: unknown,
  path: string,
  ancestors: readonly Container[],
  violations: PageViolation[],
  idCounts: Map<string, number>,
  countBlock: () => void,
): void {
  countBlock()

  if (raw === null || typeof raw !== 'object') {
    violations.push({ code: 'malformed-block', path, message: 'block is not an object' })
    return
  }
  const block = raw as Partial<Block> & { type?: unknown }
  const id = typeof block.id === 'string' ? block.id : undefined
  if (id) idCounts.set(id, (idCounts.get(id) ?? 0) + 1)

  switch (block.type) {
    case 'heading': {
      const text = typeof (block as Record<string, unknown>).text === 'string' ? (block as { text: string }).text : ''
      if (text.length > PAGE_HEADING_MAX) {
        violations.push({
          code: 'heading-too-long',
          path,
          blockId: id,
          message: `heading text is ${text.length} characters, more than ${PAGE_HEADING_MAX}`,
        })
      }
      break
    }
    case 'text': {
      const md = typeof (block as Record<string, unknown>).md === 'string' ? (block as { md: string }).md : ''
      if (md.length > PAGE_TEXT_MD_MAX) {
        violations.push({
          code: 'text-too-long',
          path,
          blockId: id,
          message: `text.md is ${md.length} characters, more than ${PAGE_TEXT_MD_MAX}`,
        })
      }
      break
    }
    case 'toggle': {
      if (ancestors.includes('toggle')) {
        violations.push({ code: 'toggle-in-toggle', path, blockId: id, message: 'a toggle may not contain a toggle' })
      }
      if (ancestors.includes('columns')) {
        // A toggle may sit inside a column (only `columns` rejects nesting itself),
        // so no violation here — see `ColumnsBlock`'s own comment in page.ts.
      }
      const children = childList((block as Record<string, unknown>).blocks)
      children.forEach((child, i) =>
        visit(child, `${path}.blocks[${i}]`, [...ancestors, 'toggle'], violations, idCounts, countBlock),
      )
      break
    }
    case 'columns': {
      if (ancestors.includes('columns')) {
        violations.push({
          code: 'columns-in-columns',
          path,
          blockId: id,
          message: 'a columns block may not contain a columns block',
        })
      }
      const columns = Array.isArray((block as Record<string, unknown>).columns)
        ? ((block as Record<string, unknown>).columns as unknown[])
        : []
      if (columns.length < PAGE_COLUMNS_MIN || columns.length > PAGE_COLUMNS_MAX) {
        violations.push({
          code: 'columns-count',
          path,
          blockId: id,
          message: `a columns block holds ${PAGE_COLUMNS_MIN}…${PAGE_COLUMNS_MAX} columns, found ${columns.length}`,
        })
      }
      let widthSum = 0
      columns.forEach((rawColumn, ci) => {
        const column = rawColumn as { width?: unknown; blocks?: unknown }
        if (column.width !== undefined) {
          const width = column.width
          if (
            typeof width !== 'number' ||
            !Number.isInteger(width) ||
            width < PAGE_COLUMN_WIDTH_MIN ||
            width > PAGE_COLUMN_WIDTH_MAX
          ) {
            violations.push({
              code: 'columns-width-invalid',
              path: `${path}.columns[${ci}]`,
              blockId: id,
              message: `column width must be an integer ${PAGE_COLUMN_WIDTH_MIN}…${PAGE_COLUMN_WIDTH_MAX}, found ${String(width)}`,
            })
          } else {
            widthSum += width
          }
        }
        const children = childList(column.blocks)
        children.forEach((child, i) =>
          visit(
            child,
            `${path}.columns[${ci}].blocks[${i}]`,
            [...ancestors, 'columns'],
            violations,
            idCounts,
            countBlock,
          ),
        )
      })
      if (widthSum > PAGE_COLUMN_WIDTH_MAX) {
        violations.push({
          code: 'columns-width-sum',
          path,
          blockId: id,
          message: `column widths sum to ${widthSum}, more than ${PAGE_COLUMN_WIDTH_MAX}`,
        })
      }
      break
    }
    case 'report': {
      const reportId = (block as Record<string, unknown>).reportId
      if (typeof reportId !== 'string' || reportId.trim().length === 0) {
        violations.push({
          code: 'report-id-invalid',
          path,
          blockId: id,
          message: 'a report block must reference a report id that is a non-empty string',
        })
      }
      break
    }
    case 'callout':
    case 'divider':
    case 'metric':
    case 'table':
    case 'alert-status':
    case 'agent-insight':
    case 'bookmark':
      break
    default:
      violations.push({
        code: 'unknown-block-type',
        path,
        blockId: id,
        message: `unknown block type ${JSON.stringify(block.type)}`,
      })
  }
}

/**
 * Validates one page, recursively; returns every violation found, never
 * throws (§2). A duplicate id is reported once per offending block, not once
 * per pair, so the count is stable regardless of traversal order.
 */
export function validatePage(page: Page): PageViolation[] {
  try {
    const violations: PageViolation[] = []
    const idCounts = new Map<string, number>()
    let total = 0
    const countBlock = () => {
      total += 1
    }

    const blocks = Array.isArray(page?.blocks) ? page.blocks : []
    blocks.forEach((block, i) => visit(block, `blocks[${i}]`, [], violations, idCounts, countBlock))

    if (total > PAGE_BLOCK_MAX) {
      violations.push({
        code: 'too-many-blocks',
        path: 'blocks',
        message: `page has ${total} blocks, more than ${PAGE_BLOCK_MAX}`,
      })
    }

    for (const [id, count] of idCounts) {
      if (count > 1) {
        violations.push({
          code: 'duplicate-block-id',
          path: '',
          blockId: id,
          message: `block id "${id}" is used ${count} times; every block id must be unique within the page`,
        })
      }
    }

    return violations
  } catch (error) {
    // `validatePage` never throws (§2). An unexpected shape is reported as a
    // violation, not a crash — the same contract untrusted server data gets.
    return [
      {
        code: 'malformed-block',
        path: '',
        message: `validation failed: ${error instanceof Error ? error.message : String(error)}`,
      },
    ]
  }
}
