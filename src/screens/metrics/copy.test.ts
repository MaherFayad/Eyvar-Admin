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
import { placeholdersIn } from '@/lib'
import { OVERVIEW_EN } from './copy'

let metricKeys: string[] = []
let chartKeys: string[] = []
let breakdownKeys: string[] = []
let dimensionKeys: string[] = []
let rowKeys: string[] = []
let noticeKeys: string[] = []
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

  /**
   * **R4-4's three new shapes reach the same cliff the tiles do.** A breakdown
   * heading, a dimension noun, a row label, a row sub-label and a notice
   * sentence are all keys the fixture names and this file has to carry, and
   * `createTranslator` throws on a missing one in dev — so a board declaring a
   * seventh dimension with no noun here takes the *board* down, not the suite.
   * That is the wrong place to find out, which is what these collections fix.
   */
  const breakdowns = boards.flatMap((board) => board.breakdowns)
  breakdownKeys = breakdowns.map((b) => `breakdown.${b.key}`)
  dimensionKeys = [...new Set(breakdowns.map((b) => `breakdown.dimension.${b.dimension}`))]
  /**
   * **A row LABEL is only sometimes a key now — R5-7.** `BreakdownLabel` is a
   * union: `kind: 'key'` is copy and belongs in this dictionary; `kind: 'text'`
   * is an entity name carried as data, and nothing translates it, so collecting
   * it here would demand a string for `Abdulaziz Al-Suwailem`. The sub-label is
   * always a key.
   */
  rowKeys = [
    ...new Set(
      breakdowns.flatMap((b) =>
        b.rows.flatMap((r) => [
          ...(r.label.kind === 'key' ? [r.label.key] : []),
          ...(r.subLabelKey ? [r.subLabelKey] : []),
        ]),
      ),
    ),
  ]
  /* Two keys per count, `.one` and `.many` (AC-713). Both must exist: a board
     whose count falls to one must not blank its own banner. */
  noticeKeys = boards.flatMap((board) =>
    board.notices.flatMap((n) => [
      ...(typeof n.params?.['count'] === 'number' ? [`${n.key}.one`, `${n.key}.many`] : [n.key]),
      ...(n.action ? [n.action.labelKey] : []),
    ]),
  )

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

  it('has a heading for every breakdown a board declares (AC-690)', () => {
    const missing = breakdownKeys.filter((key) => !(key in OVERVIEW_EN))
    expect(missing, `add these to src/screens/metrics/copy.ts`).toEqual([])
  })

  it('has a plural noun for every breakdown DIMENSION, which AC-696’s sentence names', () => {
    const missing = dimensionKeys.filter((key) => !(key in OVERVIEW_EN))
    expect(missing, `add these to src/screens/metrics/copy.ts`).toEqual([])
    expect(dimensionKeys.length).toBeGreaterThan(0)
  })

  it('has a string for every KEYED row label and every row sub-label (AC-697)', () => {
    const missing = rowKeys.filter((key) => !(key in OVERVIEW_EN))
    expect(missing, `add these to src/screens/metrics/copy.ts`).toEqual([])
  })

  /**
   * **R5-7's clause, as a test: *a row label is never a key whose whole string
   * is a parameter.*** That is what `breakdown.row.entity` — `'{name}'` — was,
   * and it is why AC-697 needed redrafting. The key is deleted; this is what
   * stops the next one being written.
   *
   * `placeholdersIn` is the same helper `createTranslator` uses to find them,
   * so this asks the question the interpolator would answer rather than a
   * regular expression's opinion of it.
   */
  it('carries no row label that is nothing but a parameter (R5-7)', () => {
    const figLeaves = Object.entries(OVERVIEW_EN)
      .filter(([key]) => key.startsWith('breakdown.row.'))
      .filter(([, value]) => placeholdersIn(value).length === 1 && /^\{[^{}]+\}$/u.test(value.trim()))
      .map(([key]) => key)
    expect(figLeaves, `an entity name is data — carry it as BreakdownLabel text`).toEqual([])
  })

  /**
   * **R5-5's retirement list, asserted rather than trusted.** Seven sub-label
   * keys were withdrawn when the secondary numeric column was, and a dictionary
   * rots by keeping the ones nobody deleted. The first check above cannot see
   * them: it only looks for keys that are MISSING.
   */
  it('has dropped the sub-label keys R5-5 retired, and kept the one §18.7 reinstated', () => {
    const retired = [
      'breakdown.sub.queueStanding',
      'breakdown.sub.weekend',
      'breakdown.sub.nightBlock',
      'breakdown.sub.churnHigh',
      'breakdown.sub.churnMedium',
      /* `breakdown.sub.cityLive` is NOT here. §11.4 retired it and §18.7
         reinstated it for the state §11.4 did not know about — a live city with
         no reading. Seven retired, not eight. */
      'breakdown.sub.documentExpired',
      'breakdown.row.entity',
    ]
    expect(retired.filter((key) => key in OVERVIEW_EN)).toEqual([])
    expect(OVERVIEW_EN['breakdown.sub.cityLive']).toBe('Live')
  })

  /**
   * **R5-4 §4.1's budget, measured rather than eyeballed.** 38 characters is
   * the 4-up box at 1440, and the old figure of 60 was R9's toast budget
   * borrowed by analogy without measuring anything — which is why the one
   * caption whose content matters clipped on the WIDE viewport and survived the
   * narrow one. The count is a drafting aid and Arabic is checked per string by
   * eye; this is the aid, enforced.
   */
  it('keeps every caption inside R5-4’s 38-character budget', () => {
    const over = Object.entries(OVERVIEW_EN)
      .filter(([key]) => key.startsWith('caption.'))
      .filter(([, value]) => value.length > 38)
      .map(([key, value]) => `${key} (${value.length})`)
    expect(over).toEqual([])
  })

  it('has BOTH count keys and the action label for every notice a board declares', () => {
    const missing = noticeKeys.filter((key) => !(key in OVERVIEW_EN))
    expect(missing, `add these to src/screens/metrics/copy.ts`).toEqual([])
    expect(noticeKeys.length).toBeGreaterThan(0)
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
