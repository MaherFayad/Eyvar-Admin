/**
 * **The summary column rendered `1,200% total` on a shipped dashboard, and
 * this is the test that would have caught it.**
 *
 * `ResultTable` closed each row with `Measure.bucketAggregate` applied across
 * buckets, keyed on `series.measureKey`. That is right for a trend and wrong
 * for every mode whose resolver re-declares what the series carries. A cohort's
 * anchor is `riders.joined` — `bucketAggregate: 'count'`, `unit: 'count'` — but
 * the cohort resolver emits **retention percentages** and says so with
 * `unit: 'percent'`. Summing twelve of them produced `1,200%`, labelled
 * `total`, in the same type and the same weight as a measured figure. Measured
 * in Chromium on `/management/reports/dashboards/DSH-3` before the fix:
 * `1,200% total`, `1,087.5% total`, `977.8% total`, `877.8% total`.
 *
 * ## Why this file runs a real report through the client
 *
 * A hand-built `ReportSeries` proves the guard fires; it does not prove the
 * guard is aimed at anything that ships. So the load-bearing block below fetches
 * **`RPT-7` — the saved report pinned to `DSH-3`** — through `getReport`, runs
 * its query through `runReport`, and renders what comes back. If a future
 * resolver change makes a cohort series look summable again, this fails on the
 * shipped fixture rather than on a mock of it.
 *
 * **Everything crosses the client seam** (`seam.test.ts` §4): a file outside
 * `src/data` may not import a fixture module or a mock internal, tests
 * included, so the catalogue arrives from `listMeasures` and the result from
 * `runReport` — the same two calls `ReportBuilder` makes.
 *
 * The assertion is deliberately not `toBe('1,200%')`. It is **no rendered
 * percentage exceeds 100** — a retention rate cannot, arithmetically — because
 * a bound catches the next version of this defect rather than this one.
 */

import { render, screen, within } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { EYVAR_TODAY, getReport, listMeasures, runReport } from '@/data/clients'
import type { Measure, ReportPanel, ReportQuery, ReportResult, ReportSeries } from '@/data/types'
import { ResultTable } from './ResultTable'
import { declaredAggregate } from './rollup'

const t = createTranslator({ dictionary: EN })
const copy = (key: string) => EN[key] as string
const SUMMARY_HEADER = copy('rb.table.window')
const UNDECLARED = copy('rb.table.window.undeclared')
const EM_DASH = '—'
/** `riders.joined` is the anchor `RPT-7` is built on. */
const ANCHOR_KEY = 'riders.joined'

let measuresByKey: Record<string, Measure> = {}
let anchor: Measure

beforeAll(async () => {
  /* The catalogue the builder holds, fetched the way the builder fetches it. */
  const page = await listMeasures({ pageSize: 100 })
  measuresByKey = Object.fromEntries(page.items.map((m) => [m.key, m]))
  anchor = measuresByKey[ANCHOR_KEY] as Measure
})

function renderTable(result: ReportResult) {
  return render(<ResultTable result={result} measuresByKey={measuresByKey} t={t} language="en" />)
}

/* ════════ the guard itself: does this catalogue entry describe THESE numbers ════ */

describe('declaredAggregate — the catalogue entry has to be about the series', () => {
  const seriesOf = (over: Partial<ReportSeries> = {}): ReportSeries => ({
    id: 's',
    measureKey: ANCHOR_KEY,
    groupValue: null,
    role: 'current',
    panelId: 'p',
    unit: anchor.unit,
    currency: anchor.currency,
    temporality: anchor.temporality,
    points: [1, 2, 3],
    partialBucketIndexes: [],
    blocked: null,
    failed: null,
    ...over,
  })

  it('hands back the declared aggregate when the series is the measure’s own numbers', () => {
    /* The trend case, which is every report the column was designed for. The
       guard must not be so wide that it withholds the column it exists for. */
    expect(declaredAggregate(seriesOf(), anchor)).toBe(anchor.bucketAggregate)
  })

  it('withholds it when the series re-declares the UNIT — the cohort case', () => {
    /* The cohort resolver: "A retention matrix is per cent whatever the anchor
       measure counts." `riders.joined` declares `count`. Applying it here is
       the defect. */
    expect(declaredAggregate(seriesOf({ unit: 'percent' }), anchor)).toBeNull()
  })

  it('withholds it when the series re-declares the CURRENCY — the followed-funnel case', () => {
    /* A followed funnel drops the currency, because the rung counts people
       rather than riyals. */
    const money = { ...anchor, unit: 'money', currency: 'SAR' } as Measure
    expect(declaredAggregate(seriesOf({ unit: 'money', currency: null }), money)).toBeNull()
  })

  it('withholds it when the series re-declares the TEMPORALITY', () => {
    /* No resolver does this today. It is in the guard because a stock's
       aggregate is `end-of-period` BECAUSE it is a stock — the two are one
       declaration, and separating them is how a level gets summed. */
    const flipped = anchor.temporality === 'stock' ? 'flow' : 'stock'
    expect(declaredAggregate(seriesOf({ temporality: flipped }), anchor)).toBeNull()
  })

  it('withholds it when the caller could not resolve the measure at all', () => {
    expect(declaredAggregate(seriesOf(), undefined)).toBeNull()
  })
})

/* ═══════════ the shipped report: RPT-7, the tile that rendered 1,200% ═════ */

describe('a cohort report never produces a summed percentage', () => {
  let result: ReportResult
  let pinnedTo: string[]

  beforeAll(async () => {
    const saved = await getReport('RPT-7')
    pinnedTo = saved.data.pinnedToDashboardIds
    const outcome = await runReport(saved.data.query as ReportQuery, { today: EYVAR_TODAY })
    /* A refused query would make every assertion below vacuous. */
    expect(outcome.status).toBe('ok')
    result = (outcome as { status: 'ok'; result: ReportResult }).result
  })

  it('is the retention report DSH-3 renders, in per cent, over a count anchor', () => {
    /* The premise, asserted rather than assumed: if the fixture stops being a
       cohort, or stops re-declaring its unit, the assertions below would pass
       for the wrong reason. */
    expect(pinnedTo).toContain('DSH-3')
    expect(result.query.mode).toBe('cohort')
    expect(result.series.length).toBeGreaterThan(0)
    for (const series of result.series) {
      expect(series.unit).toBe('percent')
      expect(measuresByKey[series.measureKey]?.unit).toBe('count')
      expect(measuresByKey[series.measureKey]?.bucketAggregate).toBe('count')
    }
  })

  it('draws no summary column at all — nothing in the table resolves a rollup', () => {
    renderTable(result)
    expect(screen.queryByText(SUMMARY_HEADER)).not.toBeInTheDocument()
  })

  it('renders no percentage above 100, which is what 1,200% was', () => {
    const { container } = renderTable(result)
    const rendered = [...(container.textContent ?? '').matchAll(/([\d,]+(?:\.\d+)?)%/g)].map((m) =>
      Number((m[1] as string).replace(/,/g, '')),
    )
    /* The report does render percentages — an empty match set would make this
       assertion vacuous, which is how the original defect survived a green
       suite. */
    expect(rendered.length).toBeGreaterThan(0)
    expect(rendered.filter((n) => n > 100)).toEqual([])
  })

  it('leaves every bucket cell exactly the number the resolver produced', () => {
    /* Withholding the summary must not touch the readings. The row is still
       the matrix. */
    renderTable(result)
    const rows = screen.getAllByRole('row')
    const cells = within(rows[1] as HTMLElement).getAllByRole('cell')
    /* One label cell, then one per bucket. No trailing summary cell. */
    expect(cells).toHaveLength(1 + result.buckets.length)
  })
})

/* ═════════ the mixed table: an empty cell that says why, beside a real one ═ */

describe('a series with no declared rollup states that, beside one that has it', () => {
  const BUCKETS = ['2026-06-19', '2026-06-20', '2026-06-21']

  function mixedResult(): ReportResult {
    const panel: ReportPanel = {
      panelId: 'p1',
      titleKey: 'rb.panel.measure',
      titleParams: { measure: anchor.labelKey },
      unit: 'count',
      currency: null,
      seriesIds: ['countable', 'redeclared'],
    }
    const base: ReportSeries = {
      id: 'countable',
      measureKey: ANCHOR_KEY,
      groupValue: null,
      role: 'current',
      panelId: 'p1',
      unit: anchor.unit,
      currency: anchor.currency,
      temporality: anchor.temporality,
      points: [10, 20, 30],
      partialBucketIndexes: [],
      blocked: null,
      failed: null,
    }
    return {
      query: {
        measures: [{ key: ANCHOR_KEY }],
        groupBy: [],
        filters: [],
        window: { kind: 'absolute', from: BUCKETS[0] as string, to: BUCKETS[2] as string },
        grain: 'day',
        periodComparison: 'none',
        chartType: 'line',
      },
      asOf: '2026-06-25T09:14:00+03:00',
      buckets: BUCKETS,
      panels: [panel],
      series: [base, { ...base, id: 'redeclared', unit: 'percent', points: [40, 50, 60] }],
      truncated: false,
      truncatedAtRows: null,
      warnings: [],
      foldedGroupCount: null,
    }
  }

  const summaryCell = (rowIndex: number) => {
    const rows = screen.getAllByRole('row')
    const cells = within(rows[rowIndex + 1] as HTMLElement).getAllByRole('cell')
    return cells[cells.length - 1] as HTMLElement
  }

  it('keeps the column, because one row in it is honest', () => {
    renderTable(mixedResult())
    expect(screen.getByText(SUMMARY_HEADER)).toBeInTheDocument()
    expect(summaryCell(0).textContent).toContain('60')
    expect(summaryCell(0).textContent).toContain(copy('rb.table.window.sum'))
  })

  it('gives the other row an em dash AND the reason, never a number', () => {
    renderTable(mixedResult())
    const cell = summaryCell(1)
    expect(cell.textContent).toContain(EM_DASH)
    expect(cell.textContent).toContain(UNDECLARED)
    /* 40 + 50 + 60. The exact figure the old code would have written here. */
    expect(cell.textContent).not.toContain('150')
    /* And it must not borrow one of the three aggregate WORDS either: a cell
       reading `— total` claims a total was computed and came back empty. */
    expect(cell.textContent).not.toContain(copy('rb.table.window.sum'))
    expect(cell.textContent).not.toContain(copy('rb.table.window.mean'))
    expect(cell.textContent).not.toContain(copy('rb.table.window.latest'))
  })

  it('hides the dash from a screen reader, so the reason is what is announced', () => {
    /* `PanelCard`'s pairing for an absent delta: the glyph is drawn, the words
       are read. A dash announced on its own is a cell that sounds broken. */
    renderTable(mixedResult())
    const dash = within(summaryCell(1)).getByText(EM_DASH)
    expect(dash).toHaveAttribute('aria-hidden', 'true')
    expect(within(summaryCell(0)).getByText(/60/)).not.toHaveAttribute('aria-hidden')
  })
})
