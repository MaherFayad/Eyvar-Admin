/**
 * **The second copy of `1,200% total` — the one that was set at 28px.**
 *
 * `ResultTable`'s summary column shipped a sum of twelve retention percentages
 * labelled `total`; `cohortSummary.test.tsx` closed it and its note names this
 * component as carrying the same computation with the same inputs. `PanelCard`
 * called `rollUpSeries(current, measure.bucketAggregate, …)` — the aggregate of
 * whatever measure the panel is KEYED to, applied to whatever numbers the
 * series happens to carry. For a cohort those are not the same claim:
 * `resolveCohort` emits retention percentages against `measureKey:
 * 'riders.joined'`, whose catalogue entry declares `bucketAggregate: 'count'`
 * over `unit: 'count'`.
 *
 * The table's version put the invented figure in a cell. This one puts it in
 * the headline slot, at `--text-kpi`, directly under the panel title — the
 * largest, most quotable number on the card. *An invented figure is
 * indistinguishable from a measured one once it is on screen*, and this is the
 * screen position where that costs the most.
 *
 * ## It is latent today, and the guard is still the right shape
 *
 * `ReportBuilder.isSeriesMode` routes `cohort`, `funnel` and `journey` to
 * `ReportModeCanvas`, and `DashboardTile` routes a pinned report on the same
 * exported predicate — so no production path puts a cohort series into this
 * component **today**. That is a property of one predicate in another file, not
 * of this one: the defect is one routing change away from being visible, the
 * series shape that triggers it ships in the fixtures, and the fix costs a
 * call. The first block below asserts the shape is real on `RPT-7` so the rest
 * cannot pass for the wrong reason.
 *
 * Everything crosses the client seam (`seam.test.ts` §4): the catalogue arrives
 * from `listMeasures` and the result from `runReport`, the same two calls
 * `ReportBuilder` makes.
 */

import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { EYVAR_TODAY, getReport, listMeasures, runReport } from '@/data/clients'
import type { Measure, ReportPanel, ReportQuery, ReportResult, ReportSeries } from '@/data/types'
import { PanelCard } from './PanelCard'

const t = createTranslator({ dictionary: EN })
const copy = (key: string) => EN[key] as string
const NO_DATA = copy('overview.noData')
/** `riders.joined` is the anchor `RPT-7` is built on. */
const ANCHOR_KEY = 'riders.joined'

let measuresByKey: Record<string, Measure> = {}
let anchor: Measure

beforeAll(async () => {
  const page = await listMeasures({ pageSize: 100 })
  measuresByKey = Object.fromEntries(page.items.map((m) => [m.key, m]))
  anchor = measuresByKey[ANCHOR_KEY] as Measure
})

function renderPanel(result: ReportResult, panel: ReportPanel, measure: Measure | null) {
  return render(
    <MemoryRouter>
      <PanelCard
        panel={panel}
        result={result}
        measure={measure}
        kind="line"
        coercedFrom={null}
        onRetrySeries={() => {}}
        noDataSentence={NO_DATA}
        t={t}
        language="en"
      />
    </MemoryRouter>,
  )
}

/** Every figure the card renders with a `%` after it. */
function percentages(container: HTMLElement): number[] {
  return [...(container.textContent ?? '').matchAll(/([\d,]+(?:\.\d+)?)\s*%/g)].map((m) =>
    Number((m[1] as string).replace(/,/g, '')),
  )
}

/* ══════════ 1 — the shipped cohort, rendered as a panel it must refuse ═════ */

describe('a cohort panel states no headline, because its aggregate is nobody’s', () => {
  let result: ReportResult
  let panel: ReportPanel

  beforeAll(async () => {
    const saved = await getReport('RPT-7')
    const outcome = await runReport(saved.data.query as ReportQuery, { today: EYVAR_TODAY })
    expect(outcome.status).toBe('ok')
    result = (outcome as { status: 'ok'; result: ReportResult }).result
    panel = result.panels[0] as ReportPanel
  })

  /**
   * The premise, asserted rather than assumed. If the fixture stops being a
   * cohort, or stops re-declaring its unit, every assertion below would pass
   * for a reason that has nothing to do with the defect.
   */
  it('is per cent over a count anchor whose entry declares a count rollup', () => {
    expect(result.query.mode).toBe('cohort')
    expect(result.series.length).toBeGreaterThan(0)
    for (const series of result.series) {
      expect(series.unit).toBe('percent')
      expect(measuresByKey[series.measureKey]?.unit).toBe('count')
      expect(measuresByKey[series.measureKey]?.bucketAggregate).toBe('count')
    }
  })

  it('renders no numeral at all, rather than a sum of retention rates', () => {
    const { container } = renderPanel(result, panel, anchor)
    expect(container.querySelector('[data-slot="metric-value"]')).toBeNull()
  })

  /**
   * The bound rather than the byte, for `cohortSummary`'s reason: a retention
   * rate cannot arithmetically exceed 100, so this catches the *next* version
   * of the defect and not only this one.
   */
  it('renders no percentage above 100 anywhere on the card', () => {
    const { container } = renderPanel(result, panel, anchor)
    expect(percentages(container).filter((n) => n > 100)).toEqual([])
  })

  /**
   * **R5-15 does not travel with the headline.** `readings of eligible` is
   * counted before `rollUpSeries` combines anything, so it is measured whatever
   * the aggregate turns out to be — and withholding a fact that WAS measured
   * because a different one could not be is the opposite of the rule.
   */
  it('keeps the population sentence and the base, with no headline above them', () => {
    const { container } = renderPanel(result, panel, anchor)
    const foot = container.querySelector('[data-slot="panel-population"]') as HTMLElement
    expect(foot).not.toBeNull()
    expect(within(foot).getByText(copy(anchor.population.predicateKey))).toBeInTheDocument()
    expect(within(foot).getByText(/buckets have a reading/)).toBeInTheDocument()
  })

  /** The card is still a card: title, plot, foot. A refusal is not an error state. */
  it('draws the panel, its title and its plot as normal', () => {
    renderPanel(result, panel, anchor)
    expect(screen.getByRole('img')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(NO_DATA)).not.toBeInTheDocument()
  })
})

/* ═══════ 2 — the guard is not so wide that it eats the trend it serves ════ */

describe('a trend panel is untouched — the guard has to be narrow', () => {
  const BUCKETS = ['2026-06-19', '2026-06-20', '2026-06-21']

  function trendPanel(): ReportPanel {
    return {
      panelId: 'p1',
      titleKey: 'rb.panel.measure',
      titleParams: { measure: anchor.labelKey },
      unit: anchor.unit,
      currency: anchor.currency,
      seriesIds: ['current', 'comparison'],
    }
  }

  function seriesOf(over: Partial<ReportSeries> = {}): ReportSeries {
    return {
      id: 'current',
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
      ...over,
    }
  }

  function trendResult(series: ReportSeries[]): ReportResult {
    return {
      query: {
        measures: [{ key: ANCHOR_KEY }],
        groupBy: null,
        filters: [],
        window: { kind: 'absolute', from: BUCKETS[0] as string, to: BUCKETS[2] as string },
        grain: 'day',
        periodComparison: series.length > 1 ? 'previous-period' : 'none',
        chartType: 'line',
      },
      asOf: '2026-06-25T09:14:00+03:00',
      buckets: BUCKETS,
      panels: [trendPanel()],
      series,
      truncated: false,
      truncatedAtRows: null,
      warnings: [],
      foldedGroupCount: null,
    }
  }

  it('still states its number — the measure’s own numbers, summed as declared', () => {
    const result = trendResult([seriesOf()])
    const { container } = renderPanel(result, result.panels[0] as ReportPanel, anchor)
    const value = container.querySelector('[data-slot="metric-value"]') as HTMLElement
    expect(value).not.toBeNull()
    /* `riders.joined` is a `count`, so the window rolls up to 10 + 20 + 30. */
    expect(value.textContent).toBe('60')
  })

  /**
   * A comparison is tested on its own series. Subtracting a run the catalogue
   * does not describe from one it does is the same fabrication with a caret on
   * it, so the delta goes and the number stays.
   */
  it('drops the delta when only the COMPARISON series re-declares its unit', () => {
    const result = trendResult([
      seriesOf(),
      seriesOf({ id: 'comparison', role: 'comparison', unit: 'percent', points: [5, 10, 15] }),
    ])
    const { container } = renderPanel(result, result.panels[0] as ReportPanel, anchor)
    expect((container.querySelector('[data-slot="metric-value"]') as HTMLElement).textContent).toBe(
      '60',
    )
    /* 60 against 30 is +100 %. The figure the unguarded version would print. */
    expect(percentages(container)).toEqual([])
    /* And the sentence says there is no trend, rather than stating one. */
    expect(screen.getByText(copy('overview.chart.read.noBaseline'))).toBeInTheDocument()
  })

  it('keeps the delta when both series are the measure’s own numbers', () => {
    const result = trendResult([
      seriesOf(),
      seriesOf({ id: 'comparison', role: 'comparison', points: [5, 10, 15] }),
    ])
    const { container } = renderPanel(result, result.panels[0] as ReportPanel, anchor)
    /* 60 against 30 — the delta the panel is supposed to state. */
    expect(percentages(container)).toContain(100)
  })
})
