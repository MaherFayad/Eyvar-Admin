import { describe, expect, it } from 'vitest'
import { pageRange } from './pagination'

describe('pageRange', () => {
  it('produces §9.1´s `Showing 1–50 of 4,218` numbers', () => {
    expect(pageRange(1, 50, 4218)).toMatchObject({ from: 1, to: 50, total: 4218, totalPages: 85 })
  })

  it('walks the pages', () => {
    expect(pageRange(2, 50, 4218)).toMatchObject({ from: 51, to: 100 })
    expect(pageRange(85, 50, 4218)).toMatchObject({ from: 4201, to: 4218 })
  })

  /* ── zero ── */

  it('reports 0–0 with no navigation for an empty list', () => {
    expect(pageRange(1, 50, 0)).toEqual({
      from: 0,
      to: 0,
      total: 0,
      hasPrevious: false,
      hasNext: false,
      totalPages: 1,
    })
  })

  /* ── single item, single page ── */

  it('handles one row', () => {
    expect(pageRange(1, 50, 1)).toMatchObject({ from: 1, to: 1, hasNext: false, hasPrevious: false })
  })

  it('handles a total that exactly fills a page', () => {
    expect(pageRange(1, 50, 50)).toMatchObject({ from: 1, to: 50, hasNext: false, totalPages: 1 })
    expect(pageRange(2, 50, 100)).toMatchObject({ from: 51, to: 100, hasNext: false, totalPages: 2 })
  })

  it('handles a page size of one', () => {
    expect(pageRange(3, 1, 5)).toMatchObject({ from: 3, to: 3, totalPages: 5, hasNext: true })
  })

  /* ── out of range ── */

  it('clamps a page beyond the end rather than reporting a range past the total', () => {
    // A row deleted while the operator sat on the last page.
    expect(pageRange(99, 50, 60)).toMatchObject({ from: 51, to: 60, hasNext: false, totalPages: 2 })
  })

  /* ── very large ── */

  it('handles a very large total', () => {
    expect(pageRange(1, 50, 10_000_000)).toMatchObject({ totalPages: 200_000, hasNext: true })
  })

  /* ── bad input ── */

  it('refuses a zero or negative page, page size or total', () => {
    expect(() => pageRange(0, 50, 10)).toThrow(/1-based page/)
    expect(() => pageRange(1, 0, 10)).toThrow(/positive pageSize/)
    expect(() => pageRange(1, 50, -1)).toThrow(/non-negative total/)
    expect(() => pageRange(1.5, 50, 10)).toThrow(/1-based page/)
  })
})
