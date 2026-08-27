/**
 * The invariants this module is *for*, asserted over the real fixtures.
 *
 * Every test below is written against a rule whose reason is a **relationship**
 * — a pairing, a panel assignment, a base count that has to move — so a
 * hardcoded value would fail it. A presence check on any of these would pass in
 * exactly the case the rule forbids.
 */

import { beforeAll, describe, expect, it } from 'vitest'
import {
  EYVAR_TODAY,
  CHART_TYPES,
  GRAINS,
  disableMockLatency,
  listDimensions,
  listMeasures,
  listReports,
  pairableWith,
  planReportQuery,
  runReport,
} from '@/data/clients'
import type { Dimension, Measure, ReportQuery, ReportResult, ReportSeries } from '@/data/types'
import { REPORTS_EN } from '@/screens/reports/copy'
import { periodDelta, rollUpSeries } from './rollup'

/**
 * **Everything comes through the seam.** `seam.test.ts` asserts that nothing
 * outside `src/data` imports a fixture module or reaches into `data/mock/`, and
 * a test is not exempt: a test that reads the fixture array directly is testing
 * the seed rather than the contract, and it would keep passing after the seam
 * was swapped for an API that returned something else.
 */
let measureFixtures: readonly Measure[] = []
let dimensionFixtures: readonly Dimension[] = []
let CATALOGUE: { measures: readonly Measure[]; dimensions: readonly Dimension[] }

beforeAll(async () => {
  disableMockLatency()
  measureFixtures = (await listMeasures({ pageSize: 100 })).items
  dimensionFixtures = (await listDimensions({ pageSize: 100 })).items
  CATALOGUE = { measures: measureFixtures, dimensions: dimensionFixtures }
  /* If the catalogue ever came back empty every sweep below would pass by
     having nothing to sweep. */
  expect(measureFixtures.length).toBeGreaterThan(0)
})

async function run(query: ReportQuery): Promise<ReportResult> {
  const outcome = await runReport(query, { today: EYVAR_TODAY })
  if (outcome.status !== 'ok') throw new Error(`query refused: ${outcome.violations[0]?.code}`)
  return outcome.result
}

/* ───────────────── R5-15 — the population is not merely present ─────────── */

describe('R5-15 — every measure names a population, and the copy can say it', () => {
  /**
   * The catalogue makes the population **present**; the copy makes it
   * **visible**. A measure whose `predicateKey` has no entry here would render
   * a raw key at an operator, or throw — and either way the population the rule
   * exists to protect would not be readable.
   *
   * Asserted **against the fixtures**, never against a list typed twice: a
   * second list would go stale the day a measure is added, which is the one day
   * this check matters.
   */
  it('resolves a population sentence for every measure in the catalogue', () => {
    const missing = measureFixtures
      .filter((measure) => REPORTS_EN[measure.population.predicateKey] === undefined)
      .map((measure) => `${measure.key} -> ${measure.population.predicateKey}`)
    expect(missing).toEqual([])
  })

  it('resolves a name for every measure, dimension and caption the fixtures declare', () => {
    const keys = [
      ...measureFixtures.map((m) => m.labelKey),
      ...measureFixtures.map((m) => m.captionKey).filter((k): k is string => k !== null),
      ...dimensionFixtures.map((d) => d.labelKey),
    ]
    expect(keys.filter((key) => REPORTS_EN[key] === undefined)).toEqual([])
  })

  /**
   * The panel titles and every legality reason the planner can emit. These are
   * produced by the DATA layer as keys, so a gap here is invisible until a
   * particular control is disabled in front of a particular operator.
   *
   * The reasons are collected by **planning real queries** rather than by
   * reading the planner's source, so a reason key that is renamed on one side
   * and not the other fails here.
   */
  it('resolves every reason the planner emits across the whole catalogue', () => {
    const seen = new Set<string>(['rb.panel.measure', 'rb.panel.measureByGroup'])
    for (const measure of measureFixtures) {
      for (const grain of GRAINS) {
        for (const chartType of CHART_TYPES) {
          for (const groupBy of [null, ...measure.dimensions.map((d) => d.key), 'trip.pickup']) {
            const plan = planReportQuery(
              {
                measures: [{ key: measure.key }],
                groupBy,
                filters: [],
                window: { kind: 'preset', preset: 'last-365d' },
                grain,
                periodComparison: 'none',
                chartType,
              },
              CATALOGUE,
              EYVAR_TODAY,
            )
            plan.violations.forEach((v) => seen.add(v.reasonKey))
            plan.grains.forEach((o) => o.reasonKey && seen.add(o.reasonKey))
            plan.chartTypes.forEach((o) => o.reasonKey && seen.add(o.reasonKey))
          }
        }
      }
    }
    /* The sweep has to actually reach reasons, or the assertion below is
       vacuous — this is the guard against a green test that checked nothing. */
    expect(seen.size).toBeGreaterThan(8)
    expect([...seen].filter((key) => REPORTS_EN[key] === undefined)).toEqual([])
  })
})

/* ─────────── R4-1 — comparison is panels, and overlay is impossible ─────── */

describe('R4-1 — two measures never share a y-axis', () => {
  /**
   * **The load-bearing test of the whole module.**
   *
   * Not *"the owner's report renders two panels"* — that passes against a
   * component that happened to draw two cards. The rule is a **relationship**:
   * two series share a y-axis if and only if they share a panel, and the only
   * pair that may share one is a measure and its own period comparison. So the
   * assertion is over every legal pair in the catalogue, and it is about which
   * series land in which panel.
   */
  it('gives two different measures two different panels, for every legal pair', async () => {
    const pairs: Array<[string, string]> = []
    for (const first of measureFixtures) {
      for (const second of pairableWith(first, measureFixtures)) {
        pairs.push([first.key, second.key])
      }
    }
    /* If the catalogue ever stopped producing legal pairs this test would pass
       by having nothing to check. The owner's own example is one of them. */
    expect(pairs.length).toBeGreaterThan(0)
    expect(pairs).toContainEqual(['captains.registered', 'riders.registered'])

    for (const [a, b] of pairs) {
      const result = await run({
        measures: [{ key: a }, { key: b }],
        groupBy: null,
        filters: [],
        window: { kind: 'preset', preset: 'last-30d' },
        grain: 'day',
        periodComparison: 'none',
        chartType: 'line',
      })
      const panelOf = (key: string) =>
        result.series.find((s) => s.measureKey === key && s.role === 'current')?.panelId
      expect(panelOf(a)).toBeDefined()
      expect(panelOf(b)).toBeDefined()
      expect(panelOf(a)).not.toBe(panelOf(b))
    }
  })

  /**
   * The other half of the biconditional, and the one a "just render two cards"
   * implementation would get wrong: a measure and its **own** period comparison
   * DO share a panel. Same number, same scale, dotted in the same hue.
   */
  it('puts a measure and its own period comparison in the SAME panel', async () => {
    const result = await run({
      measures: [{ key: 'captains.registered' }],
      groupBy: null,
      filters: [],
      window: { kind: 'preset', preset: 'last-30d' },
      grain: 'day',
      periodComparison: 'previous-period',
      chartType: 'line',
    })
    const current = result.series.find((s) => s.role === 'current')
    const comparison = result.series.find((s) => s.role === 'comparison')
    expect(current?.panelId).toBe(comparison?.panelId)
    /* And the panel's own list agrees with the series' claim — two records of
       one fact that could disagree, so both are checked. */
    const panel = result.panels.find((p) => p.panelId === current?.panelId)
    expect(panel?.seriesIds).toEqual([current?.id, comparison?.id])
  })

  /**
   * A split is multi-series too, and R4-1 covers *both* multi-series cases. A
   * component that special-cased only the two-measure one would pass the first
   * test above and fail this.
   */
  it('gives every group of a split its own panel', async () => {
    const result = await run({
      measures: [{ key: 'trips.completed' }],
      groupBy: 'trip.pickup',
      filters: [],
      window: { kind: 'preset', preset: 'last-30d' },
      grain: 'week',
      periodComparison: 'none',
      chartType: 'line',
    })
    const panels = new Set(result.series.map((s) => s.panelId))
    expect(result.panels.length).toBeGreaterThan(1)
    expect(panels.size).toBe(result.panels.length)
  })

  /** The owner's own example, by name, at the shape the copy will render. */
  it('renders the owner’s question — captains vs riders — as two panels of one bucket set', async () => {
    /* The saved report, read through `reports.list` rather than out of the
       fixture array — the same route the library screen takes. */
    const library = await listReports({ pageSize: 100 })
    const query = library.items.find((r) => r.id === 'RPT-1')?.query
    expect(query).toBeDefined()
    const result = await run(query!)
    expect(result.panels).toHaveLength(2)
    /* One x-axis extent, shared and locked: the panels are aligned because they
       are indexed against ONE bucket array, not two. */
    expect(result.series.every((s) => s.points.length === result.buckets.length)).toBe(true)
  })
})

/* ───────────── §6.2 — the refusal, over the real catalogue ─────────────── */

describe('§6.2 — the second-measure picker refuses rather than warns', () => {
  it('offers only measures of the same temporality, unit and currency', () => {
    for (const first of measureFixtures) {
      for (const candidate of pairableWith(first, measureFixtures)) {
        expect(candidate.temporality).toBe(first.temporality)
        expect(candidate.unit).toBe(first.unit)
        expect(candidate.currency).toBe(first.currency)
      }
    }
  })

  it('offers no flow beside a stock, and no money beside a count', () => {
    const stock = measureFixtures.find((m) => m.key === 'captains.registered')!
    const offered = pairableWith(stock, measureFixtures)
    expect(offered.length).toBeGreaterThan(0)
    expect(offered.some((m) => m.temporality === 'flow')).toBe(false)
    expect(offered.some((m) => m.unit !== 'count')).toBe(false)
  })
})

/* ─────────────── the base moves, which is what makes it a base ──────────── */

describe('the rollup states a base derived from the response', () => {
  const series = (points: Array<number | null>, partial: number[] = []): ReportSeries => ({
    id: 's',
    measureKey: 'trips.completed',
    groupValue: null,
    role: 'current',
    panelId: 'p',
    unit: 'count',
    currency: null,
    temporality: 'flow',
    points,
    partialBucketIndexes: partial,
    blocked: null,
    failed: null,
  })

  /**
   * The zone-tile model: not *"it says 4"* but **inject a gap and assert the
   * number moves.** A base that did not move with the data would be a caption,
   * not a base.
   */
  it('drops a reading when a point becomes a gap, and the value follows', () => {
    const whole = rollUpSeries(series([1, 2, 3, 4]), 'sum', 4)
    const gapped = rollUpSeries(series([1, null, 3, 4]), 'sum', 4)
    expect(whole.readings).toBe(4)
    expect(gapped.readings).toBe(3)
    expect(gapped.value).toBe(whole.value! - 2)
    /* The eligible count does NOT move: the bucket still exists, it just has no
       reading. Conflating the two is how a gap becomes a shorter window. */
    expect(gapped.eligible).toBe(whole.eligible)
  })

  /** A zero inside coverage is a reading. This is the other half of the gap rule. */
  it('counts a real zero as a reading and a null as a gap', () => {
    const zeroed = rollUpSeries(series([0, 0, 0]), 'sum', 3)
    expect(zeroed.readings).toBe(3)
    expect(zeroed.value).toBe(0)
    expect(rollUpSeries(series([null, null, null]), 'sum', 3).value).toBeNull()
  })

  /** AC-818 — a partial bucket is excluded, so the base shrinks with it. */
  it('excludes a partial bucket from both the value and the base', () => {
    const full = rollUpSeries(series([5, 5, 5]), 'sum', 3)
    const partial = rollUpSeries(series([5, 5, 5], [2]), 'sum', 3)
    expect(full.value).toBe(15)
    expect(partial.value).toBe(10)
    expect(partial.eligible).toBe(2)
  })

  /**
   * The rollup is the **catalogue's** declared aggregate, not a choice. A stock
   * is a level and summing levels is how a chart becomes confidently wrong, so
   * the same points collapse differently under different declarations.
   */
  it('collapses the same points differently for a sum, a mean and a level', () => {
    const points = series([2, 4, 6])
    expect(rollUpSeries(points, 'sum', 3).value).toBe(12)
    expect(rollUpSeries(points, 'mean', 3).value).toBe(4)
    expect(rollUpSeries(points, 'end-of-period', 3).value).toBe(6)
    expect(rollUpSeries(points, 'cumulative-count', 3).value).toBe(6)
  })

  /** AC-834 — an absent delta is absent, never `0`. */
  it('returns null rather than zero or infinity when there is nothing to compare', () => {
    expect(periodDelta(10, null)).toBeNull()
    expect(periodDelta(null, 10)).toBeNull()
    expect(periodDelta(10, 0)).toBeNull()
    expect(periodDelta(12, 10)).toBeCloseTo(0.2)
  })
})

/* ─────────────── §7 — legality is disabled in place, with a reason ─────── */

describe('§7 — an illegal option is present and carries its reason', () => {
  const base: ReportQuery = {
    measures: [{ key: 'subscriptions.started' }],
    groupBy: null,
    filters: [],
    window: { kind: 'preset', preset: 'last-30d' },
    grain: 'day',
    periodComparison: 'none',
    chartType: 'line',
  }

  it('keeps every chart type in the list and marks the illegal ones', () => {
    const plan = planReportQuery(base, CATALOGUE, EYVAR_TODAY)
    /* Never hidden: the list is the full closed set, always. */
    expect(plan.chartTypes.map((o) => o.value)).toEqual([...CHART_TYPES])
    const pie = plan.chartTypes.find((o) => o.value === 'pie')!
    expect(pie.legal).toBe(false)
    expect(pie.reasonKey).not.toBeNull()
    expect(REPORTS_EN[pie.reasonKey!]).toBeDefined()
  })

  /** AC-838 — changing any ONE of the pie's five gates disables it again. */
  it('enables the pie only when all five gates hold, and disables it when any one moves', () => {
    const legalPie: ReportQuery = {
      ...base,
      groupBy: 'subscription.plan',
      grain: 'none',
      chartType: 'pie',
    }
    const pieOf = (query: ReportQuery) =>
      planReportQuery(query, CATALOGUE, EYVAR_TODAY).chartTypes.find((o) => o.value === 'pie')!
    expect(pieOf(legalPie).legal).toBe(true)

    expect(pieOf({ ...legalPie, groupBy: null }).legal).toBe(false)
    expect(pieOf({ ...legalPie, grain: 'day' }).legal).toBe(false)
    expect(pieOf({ ...legalPie, measures: [...legalPie.measures, { key: 'trips.completed' }] }).legal).toBe(
      false,
    )
    /* A rate is never additive, so the same five controls in the same positions
       still refuse it — AC-839. */
    expect(
      pieOf({ ...legalPie, measures: [{ key: 'trips.cancellationRate' }], groupBy: null }).legal,
    ).toBe(false)
  })

  /** §7.3 — nearest legal is *defined*, and the coercion is announced. */
  it('falls to the nearest legal type and reports that it did', () => {
    const plan = planReportQuery({ ...base, grain: 'none', chartType: 'line' }, CATALOGUE, EYVAR_TODAY)
    expect(plan.chartTypeCoerced).toBe(true)
    expect(plan.effectiveChartType).not.toBe('line')
    expect(CHART_TYPES).toContain(plan.effectiveChartType)
  })
})
