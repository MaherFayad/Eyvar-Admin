/**
 * The pagination arithmetic every index table, ledger and queue shares.
 *
 * Design spec §9.1: `Showing 1–50 of 4,218` at the inline-start, `‹ Previous` /
 * `Next ›` at the inline-end, and — the clause that matters — *"A truncated list
 * states its truncation in words"*. The legacy silent row cap at
 * `eyvar_ops_panel_v40_fixed.html:12250` is the defect this closes: it slices to
 * a fixed length and says nothing.
 *
 * The numbers here are one-based and inclusive, because that is what the sentence
 * says. The slice indices are the caller's problem, and in this product they are
 * the server's.
 */

import { invariant } from './invariant'

export interface PageRange {
  /** 1-based, inclusive. `0` for both when there are no rows at all. */
  from: number
  to: number
  total: number
  hasPrevious: boolean
  hasNext: boolean
  totalPages: number
}

export function pageRange(page: number, pageSize: number, total: number): PageRange {
  invariant(Number.isInteger(page) && page >= 1, `pageRange needs a 1-based page, got ${page}.`)
  invariant(Number.isInteger(pageSize) && pageSize >= 1, `pageRange needs a positive pageSize, got ${pageSize}.`)
  invariant(Number.isInteger(total) && total >= 0, `pageRange needs a non-negative total, got ${total}.`)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const clampedPage = Math.min(page, totalPages)

  if (total === 0) {
    return { from: 0, to: 0, total: 0, hasPrevious: false, hasNext: false, totalPages: 1 }
  }

  const from = (clampedPage - 1) * pageSize + 1
  const to = Math.min(clampedPage * pageSize, total)

  return {
    from,
    to,
    total,
    hasPrevious: clampedPage > 1,
    hasNext: clampedPage < totalPages,
    totalPages,
  }
}
