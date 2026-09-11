/**
 * **The width contract for the result table — the half of it jsdom can see.**
 *
 * The defect this guards was invisible to every test in this repository and
 * shipped because of it. At 1440 the builder's table was **32 `<th>` at 23px
 * wide and 109px tall inside a 734px card**: header text overprinting itself,
 * row labels overprinting the first data column, summary values overprinting
 * the last buckets. 19px at 1280, 38px at 1920. `overflow-x: auto` was on the
 * wrapper and never engaged, because the `<table>` was `w-full table-fixed` —
 * a table pinned to its scrollport's width can never be wider than it, so the
 * scrollbar had nothing to scroll.
 *
 * **jsdom cannot see any of that.** It does no layout: every `getBoundingClientRect`
 * is zero, `scrollWidth` is zero, and `table-layout` is a string nobody
 * consumes. So the measurement lives in Chromium and is recorded where the fix
 * is (`ResultTable.tsx`'s §9.1 note): after the change the same table is
 * **2,853px wide with 78–90px columns and a 37px header row at 1280, 1440 and
 * 1920**, its own container scrolls, and the page still does not.
 *
 * What is left for this file is the **contract that produced those numbers** —
 * three class-level facts that a future edit can silently undo and that a
 * screenshot review would not catch either:
 *
 *   1. the table asks for intrinsic width, floored at its card;
 *   2. there is exactly ONE scrollport, and it is the primitive's;
 *   3. a header cell does not wrap, which is what made them 109px tall.
 *
 * A class assertion is a weak test in general and the right one here: these are
 * not styling preferences, they are the three inputs to a layout that was
 * measured.
 */

import { render } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { listMeasures } from '@/data/clients'
import type { Measure, ReportPanel, ReportResult, ReportSeries } from '@/data/types'
import { ResultTable } from './ResultTable'

const t = createTranslator({ dictionary: EN })
const ANCHOR_KEY = 'riders.joined'

/* Through the client, never the fixture module: `seam.test.ts` §4 holds for a
   test file too, and a test that reached past the seam would be the one place
   the seam is not proved. */
let anchor: Measure
let measuresByKey: Record<string, Measure>

beforeAll(async () => {
  const page = await listMeasures({ pageSize: 100 })
  anchor = page.items.find((m) => m.key === ANCHOR_KEY) as Measure
  measuresByKey = { [anchor.key]: anchor }
})

/* Thirty buckets — the shape that broke. `last-30d` is the builder's default
   range and the one `shot-table.png` was taken of. */
const BUCKETS = Array.from({ length: 30 }, (_, i) => `2026-05-${String(i + 1).padStart(2, '0')}`)

function result(): ReportResult {
  const panel: ReportPanel = {
    panelId: 'p1',
    titleKey: 'rb.panel.measure',
    titleParams: { measure: anchor.labelKey },
    unit: 'count',
    currency: null,
    seriesIds: ['s1'],
  }
  const series: ReportSeries = {
    id: 's1',
    measureKey: anchor.key,
    groupValue: null,
    role: 'current',
    panelId: 'p1',
    unit: anchor.unit,
    currency: anchor.currency,
    temporality: anchor.temporality,
    points: BUCKETS.map((_, i) => 50 + i),
    partialBucketIndexes: [],
    blocked: null,
    failed: null,
  }
  return {
    query: {
      measures: [{ key: anchor.key }],
      groupBy: [],
      filters: [],
      window: { kind: 'absolute', from: BUCKETS[0] as string, to: BUCKETS[29] as string },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    },
    asOf: '2026-06-25T09:14:00+03:00',
    buckets: BUCKETS,
    panels: [panel],
    series: [series],
    truncated: false,
    truncatedAtRows: null,
    warnings: [],
    foldedGroupCount: null,
  }
}

function renderTable() {
  const view = render(
    <ResultTable result={result()} chrome measuresByKey={measuresByKey} t={t} language="en" />,
  )
  const table = view.container.querySelector('table') as HTMLTableElement
  return { ...view, table }
}

describe('§9.1 — 32 columns scroll rather than shrink', () => {
  it('lets the table take its intrinsic width, floored at the card', () => {
    const { table } = renderTable()
    const cls = table.className
    /* `table-auto` is the whole fix: fixed layout hands the residual to the
       columns, auto layout hands the residual to the SCROLLPORT. */
    expect(cls).toContain('table-auto')
    expect(cls).not.toContain('table-fixed')
    /* `min-w-full`, not `w-full`: a 3-bucket result still fills the card, a
       30-bucket one is allowed past it. If `w-full` survives the merge the
       table is pinned again and nothing else in this file matters. */
    expect(cls).toContain('min-w-full')
    expect(cls.split(/\s+/)).not.toContain('w-full')
  })

  it('has exactly one horizontal scrollport, and it is the primitive’s own', () => {
    /* The `Table` primitive's doc: *"a caller that wrapped its own would nest
       two scrollports."* This component did, which is also why the card kept
       its radius while the header ground squared off the corners. */
    const { container } = renderTable()
    const ports = container.querySelectorAll('.overflow-x-auto')
    expect(ports).toHaveLength(1)
    expect((ports[0] as HTMLElement).dataset['slot']).toBe('table-container')
    /* And the radius travels with it, so the header's ground clips. */
    expect((ports[0] as HTMLElement).className).toContain('rounded-xl')
  })

  it('keeps every header cell on one line', () => {
    /* `25 Jun` broken across two lines is what made the header row 109px, and
       the primitive's `whitespace-normal` is correct for the six-column index
       screens it was written for. */
    const { table } = renderTable()
    const heads = [...table.querySelectorAll('thead th')]
    expect(heads.length).toBe(1 + BUCKETS.length + 1)
    for (const th of heads) {
      expect(th.className).toContain('whitespace-nowrap')
      expect(th.className.split(/\s+/)).not.toContain('whitespace-normal')
    }
  })

  it('keeps a row label and every reading on one line — and lets the summary wrap', () => {
    const { table } = renderTable()
    const cells = [...table.querySelectorAll('tbody tr:first-child td')]
    expect(cells.length).toBe(1 + BUCKETS.length + 1)
    /* The label and the thirty readings: one line each, so the row is one row
       high and a number is never broken across two. */
    for (const td of cells.slice(0, -1)) {
      expect(td.className).toContain('whitespace-nowrap')
    }
    /* **The trailing summary cell is the one exception, deliberately.** It can
       hold a sentence rather than a word — `no stated way to combine these`
       where no aggregate is declared — and pinning that to one line would make
       the widest column in the table the one carrying the least data. It wraps
       inside the width its own header sets. */
    expect((cells[cells.length - 1] as HTMLElement).className).not.toContain('whitespace-nowrap')
  })
})
