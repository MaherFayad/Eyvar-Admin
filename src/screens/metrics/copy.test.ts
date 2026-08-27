/**
 * **The metric boards' copy must stay in step with the metric fixtures, and
 * this is the test that makes a drift fail here rather than in front of an
 * operator.**
 *
 * `Metric` and `TimeSeries` carry a stable dotted `key` and **no label** — by
 * design, because a label is copy and copy is translated. So a tile renders
 * `t('metric.' + metric.key)` and a card renders `t('chart.' + series.key)`,
 * and `createTranslator` throws on a missing key in dev (AC-74: *"rendering
 * with an EMPTY Arabic dictionary shows the English fallback for every one of
 * them and never a raw key"*).
 *
 * That failure mode is correct and it is loud — **it took the board down once
 * during this build**, when `management.zones.failedRequests` was renamed to
 * `unservedRequests` in the fixture. A screen crash is the right consequence of
 * a missing string and the wrong place to discover one.
 *
 * So: two assertions, both mechanical, both naming the offending key.
 *
 *   1. every seeded metric and every seeded series has a label here
 *   2. every label here belongs to a seeded metric or series
 *
 * The second matters as much as the first: a stale entry for a metric that no
 * longer exists is how a dictionary rots, and it is invisible to the first
 * check. **`support.fairness.*` is deliberately included in both directions** —
 * those seeds exist and `METRIC_BOARD_SUB_TABS` lists the sub-tab, even though
 * its board is a view inside a work queue and does not render through
 * `MetricBoardScreen` yet.
 *
 * **It reads through the CLIENTS, not the fixtures.** The first cut imported
 * `@/data/fixtures/metrics` directly and `seam.test.ts` failed it — that rule
 * has no carve-out for test files, and it is right not to: a test that reaches
 * around the seam stops testing what the screen sees. `listMetrics` and
 * `getMetricBoard` are the same two calls the board makes, so what this asserts
 * is exactly "every key that can reach a tile has a label", not "every key in a
 * file has a label".
 */

import { beforeAll, describe, expect, it } from 'vitest'
import {
  METRIC_BOARD_SUB_TABS,
  disableMockLatency,
  getMetricBoard,
  listMetrics,
} from '@/data/clients'
import { OVERVIEW_EN } from './copy'

let metricKeys: string[] = []
let chartKeys: string[] = []
let expected = new Set<string>()

beforeAll(async () => {
  disableMockLatency()
  /* One page big enough to hold the catalogue. The metrics LIBRARY is a table
     (§3.7 customise mode) and this endpoint pages like every other. */
  const all = await listMetrics({ page: 1, pageSize: 500 })
  metricKeys = all.items.map((metric) => `metric.${metric.key}`)

  /* Series are not listable — `getMetricSeries` takes a key — so they are
     collected the way a screen meets them: off the boards. */
  const boards = await Promise.all(
    METRIC_BOARD_SUB_TABS.map((subTabId) => getMetricBoard(subTabId)),
  )
  chartKeys = boards.flatMap((board) => board.charts.map((chart) => `chart.${chart.key}`))
  expected = new Set([...metricKeys, ...chartKeys])
})

describe('metric board copy', () => {
  it('read something, so an empty catalogue cannot pass every check below', () => {
    expect(metricKeys.length).toBeGreaterThan(0)
    expect(chartKeys.length).toBeGreaterThan(0)
  })

  it('has a label for every seeded metric', () => {
    const missing = metricKeys.filter((key) => !(key in OVERVIEW_EN))
    expect(missing, `add these to src/screens/metrics/copy.ts`).toEqual([])
  })

  it('has a title for every seeded time series', () => {
    const missing = chartKeys.filter((key) => !(key in OVERVIEW_EN))
    expect(missing, `add these to src/screens/metrics/copy.ts`).toEqual([])
  })

  it('carries no label for a metric or series that no longer exists', () => {
    const stale = Object.keys(OVERVIEW_EN)
      .filter((key) => key.startsWith('metric.') || key.startsWith('chart.'))
      .filter((key) => !expected.has(key))
    expect(stale, `these no longer match a fixture — delete them`).toEqual([])
  })

  it('gives every string a non-empty value, so no tile renders a blank label', () => {
    const blank = Object.entries(OVERVIEW_EN)
      .filter(([, value]) => value.trim() === '')
      .map(([key]) => key)
    expect(blank).toEqual([])
  })

  /**
   * §3.7: *"No-data copy MUST be identical everywhere, punctuation included"*,
   * and it names the products index strip dropping the trailing period as the
   * inconsistency to avoid. One key means it cannot diverge; this asserts the
   * period, which is the half that gets edited away.
   */
  it('keeps the no-data sentence verbatim, trailing period included', () => {
    expect(OVERVIEW_EN['overview.noData']).toBe(
      'There was no data found for this date range.',
    )
  })

  /**
   * The three "no data" states must not share a string. If two of them are ever
   * edited into the same sentence the distinction is gone from the UI even
   * though it survives in the types, which is the worst of both.
   */
  it('says something different for each kind of missing data', () => {
    const sentences = [
      OVERVIEW_EN['overview.noData'],
      OVERVIEW_EN['overview.allZero'],
      OVERVIEW_EN['overview.gaps'],
      OVERVIEW_EN['overview.noCompare.no-history'],
      OVERVIEW_EN['overview.noCompare.no-target'],
      OVERVIEW_EN['overview.noCompare.insufficient-data'],
    ]
    expect(new Set(sentences).size).toBe(sentences.length)
  })
})
