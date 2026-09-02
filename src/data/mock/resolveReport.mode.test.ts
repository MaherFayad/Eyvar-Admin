/**
 * **P7-T3's acceptance: all five modes resolve, and none of them resolves as a
 * trend wearing another name.**
 *
 * This file used to pin the *seam* — `mode-not-resolved` on the wire for the
 * three modes the mock could not answer. That seam is closed, so the assertions
 * now pin the thing the seam was protecting: a funnel that **follows subjects**
 * rather than lining up three totals, a cohort matrix that comes from
 * `reporting/cohorts.ts` rather than from a literal, and a journey whose paths
 * are read off recorded rows rather than typed into a fixture.
 *
 * Every assertion is over the **shape one result has in every mode**, because
 * that shape is what makes a funnel exportable, alertable and pinnable with no
 * mode-specific code anywhere downstream.
 */

import { describe, expect, it } from 'vitest'
import { dimensionFixtures, measureFixtures } from '../fixtures/measures'
import { EYVAR_TODAY } from './clock'
import { NO_PATH, resolveReport } from './resolveReport'
import { planQuery, type Catalogue } from '../reporting/plan'
import type { ReportQuery } from '../types/report'

const catalogue: Catalogue = { measures: measureFixtures, dimensions: dimensionFixtures }

/* Every permission, so nothing below is confused with §13.1's redaction. */
const ctx = {
  permissions: measureFixtures
    .map((m) => m.permission?.key)
    .filter((k): k is NonNullable<typeof k> => Boolean(k)),
  today: EYVAR_TODAY,
}

const trend: ReportQuery = {
  measures: [{ key: 'trips.completed' }],
  groupBy: null,
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

const funnel: ReportQuery = {
  ...trend,
  measures: [],
  grain: 'none',
  chartType: 'bar',
  window: { kind: 'preset', preset: 'last-365d' },
  mode: 'funnel',
  funnel: {
    steps: [
      { measureKey: 'riders.joined', filters: [] },
      { measureKey: 'trips.completed', filters: [] },
    ],
    conversionWindowDays: null,
  },
}

const cohort: ReportQuery = {
  ...trend,
  measures: [],
  grain: 'none',
  chartType: 'table',
  window: { kind: 'preset', preset: 'last-365d' },
  mode: 'cohort',
  cohort: {
    anchorMeasureKey: 'riders.joined',
    returnMeasureKey: null,
    cohortGrain: 'month',
    horizon: 3,
  },
}

const journey: ReportQuery = {
  ...trend,
  measures: [],
  grain: 'none',
  chartType: 'table',
  window: { kind: 'preset', preset: 'last-365d' },
  mode: 'journey',
  journey: { rootMeasureKey: 'riders.joined', depth: 2 },
}

const run = (query: ReportQuery) => resolveReport(query, catalogue, ctx)

/* ─────────────────── what every mode owes every consumer ───────────────── */

describe('1 — one result shape, five modes', () => {
  it.each([
    ['funnel', funnel],
    ['cohort', cohort],
    ['journey', journey],
    ['table', { ...trend, chartType: 'table', mode: 'table' } as ReportQuery],
    ['trend', trend],
  ])('%s resolves to panels and series, and never says it could not', (_name, query) => {
    const result = run(query)
    expect(result.warnings).not.toContain('mode-not-resolved')
    expect(result.panels.length).toBeGreaterThan(0)
    expect(result.series.length).toBeGreaterThan(0)
    expect(result.buckets.length).toBeGreaterThan(0)
    /* The query is echoed, so a stale response is detectable (§8.3 state 2). */
    expect(result.query).toBe(query)
  })

  it.each([
    ['funnel', funnel],
    ['cohort', cohort],
    ['journey', journey],
  ])('%s files every series in a panel that lists it, so a tile can render it', (_name, query) => {
    const result = run(query)
    const listed = result.panels.flatMap((p) => p.seriesIds)
    expect(result.series.map((s) => s.id).sort()).toEqual([...listed].sort())
    /* Every point lines up with a bucket. `reportToCsv` walks the two together
       and a mismatch would emit rows against the wrong period. */
    for (const series of result.series) {
      expect(series.points).toHaveLength(result.buckets.length)
    }
  })

  it.each([
    ['funnel', funnel],
    ['cohort', cohort],
    ['journey', journey],
  ])('%s gives every series a distinct, stable id an alert can point at', (_name, query) => {
    const ids = run(query).series.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    /* Stable: the same question asked twice produces the same ids, so a saved
       alert rule keeps pointing at the series it was written against. */
    expect(run(query).series.map((s) => s.id)).toEqual(ids)
  })

  it.each([
    ['funnel', funnel],
    ['cohort', cohort],
    ['journey', journey],
  ])('%s plans legally, so `reports.run` reaches the resolver at all', (_name, query) => {
    expect(planQuery(query, catalogue, EYVAR_TODAY).violations).toEqual([])
  })
})

/* ──────────────────────────────  funnel  ───────────────────────────────── */

describe('2 — a funnel follows subjects', () => {
  it('draws one rung per step, in the step order', () => {
    const result = run(funnel)
    expect(result.series.map((s) => s.measureKey)).toEqual(['riders.joined', 'trips.completed'])
    expect(result.series.map((s) => s.groupValue)).toEqual(['1', '2'])
    expect(result.panels).toHaveLength(1)
  })

  it('counts people, not rows — rung two is riders who rode, not trips', () => {
    const result = run(funnel)
    const rung2 = result.series[1]?.points[0] ?? 0
    /* The same window as a TREND over completed trips. A trend counts trips and
       a funnel counts the riders behind them, so the funnel cannot be larger —
       and if it were equal for every fixture the test would be measuring
       nothing, so the trip total is asserted to be the larger of the two. */
    const trips = resolveReport(
      { ...trend, window: funnel.window, grain: 'none', measures: [{ key: 'trips.completed' }] },
      catalogue,
      ctx,
    ).series[0]?.points[0]
    expect(typeof trips).toBe('number')
    expect(Number(rung2)).toBeLessThan(Number(trips))
  })

  it('never widens down the funnel', () => {
    const points = run(funnel).series.map((s) => Number(s.points[0] ?? 0))
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i]!).toBeLessThanOrEqual(points[i - 1]!)
    }
  })

  it('counts a rung twice over one measure when the rungs are filtered differently', () => {
    /* *Completed a Quick Ride, then completed a scheduled trip* is a real
       funnel over one measure. Two rungs, two ids, no collision. */
    const twoWays: ReportQuery = {
      ...funnel,
      funnel: {
        steps: [
          { measureKey: 'trips.completed', filters: [{ field: 'trip.kind', op: 'eq', value: 'quick' }] },
          { measureKey: 'trips.completed', filters: [] },
        ],
        conversionWindowDays: null,
      },
    }
    const ids = run(twoWays).series.map((s) => s.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('says out loud when it counted totals instead of following anybody', () => {
    /* A rung over `daily-snapshots` names nobody. The query is legal — it is a
       real question — so the resolver answers it and admits what it measured. */
    const counted: ReportQuery = {
      ...funnel,
      funnel: {
        steps: [
          { measureKey: 'trips.quickRides', filters: [] },
          { measureKey: 'trips.completed', filters: [] },
        ],
        conversionWindowDays: null,
      },
    }
    expect(run(counted).warnings).toContain('funnel-counted-not-followed')
    /* And a followed funnel does NOT carry it, or the caveat would be noise. */
    expect(run(funnel).warnings).not.toContain('funnel-counted-not-followed')
  })

  it('narrows the funnel when the conversion window is shorter than the range', () => {
    const oneDay: ReportQuery = {
      ...funnel,
      funnel: { steps: funnel.funnel!.steps, conversionWindowDays: 1 },
    }
    const wide = Number(run(funnel).series[1]?.points[0] ?? 0)
    const narrow = Number(run(oneDay).series[1]?.points[0] ?? 0)
    expect(narrow).toBeLessThanOrEqual(wide)
  })

  it('redacts a rung the viewer may not read, and every rung after it', () => {
    const finance: ReportQuery = {
      ...funnel,
      funnel: {
        steps: [
          { measureKey: 'riders.joined', filters: [] },
          { measureKey: 'trips.fareCollected', filters: [] },
          { measureKey: 'trips.completed', filters: [] },
        ],
        conversionWindowDays: null,
      },
    }
    const result = resolveReport(finance, catalogue, { permissions: [], today: EYVAR_TODAY })
    /* §13.1 — no points in the response, not a client-side filter over one. */
    expect(result.series[1]?.blocked).toBe('view_finance')
    expect(result.series[1]?.points).toEqual([])
    /* Rung three would let the blocked number be recovered by subtraction. */
    expect(result.series[2]?.points).toEqual([])
  })
})

/* ──────────────────────────────  cohort  ───────────────────────────────── */

describe('3 — a cohort is `reporting/cohorts.ts`, transposed onto the result', () => {
  it('puts the cohorts on the buckets and the columns on the series', () => {
    const result = run(cohort)
    expect(result.series.map((s) => s.groupValue)).toEqual(['M0', 'M1', 'M2', 'M3'])
    /* Buckets are dates, ascending, and a cohort is named by its first day. */
    expect(result.buckets).toEqual([...result.buckets].sort())
    for (const bucket of result.buckets) expect(bucket).toMatch(/^\d{4}-\d{2}-01$/)
  })

  it('carries the size of every cohort, because a percentage needs its base', () => {
    const result = run(cohort)
    expect(result.cohortSizes).toHaveLength(result.buckets.length)
    expect(result.cohortSizes?.every((n) => n > 0)).toBe(true)
  })

  it('reads M0 as a hundred per cent and never rises down a row', () => {
    const result = run(cohort)
    const columns = result.series.map((s) => s.points)
    result.buckets.forEach((_bucket, row) => {
      expect(columns[0]?.[row]).toBe(100)
      for (let c = 1; c < columns.length; c += 1) {
        const previous = columns[c - 1]?.[row]
        const current = columns[c]?.[row]
        if (typeof previous === 'number' && typeof current === 'number') {
          expect(current).toBeLessThanOrEqual(previous)
        }
      }
    })
  })

  it('reports in per cent whatever the anchor measure counts', () => {
    expect(run(cohort).series.every((s) => s.unit === 'percent')).toBe(true)
  })

  it('follows a named return event instead of the subject’s own activity', () => {
    const bySubscription: ReportQuery = {
      ...cohort,
      cohort: { ...cohort.cohort!, returnMeasureKey: 'subscriptions.started' },
    }
    const a = run(cohort).series.map((s) => s.points)
    const b = run(bySubscription).series.map((s) => s.points)
    /* Two different definitions of *still here* must not produce one matrix, or
       the control does nothing and the operator cannot tell. */
    expect(b).not.toEqual(a)
  })

  it('redacts the whole matrix when the anchor is blocked', () => {
    const blocked: ReportQuery = {
      ...cohort,
      cohort: { ...cohort.cohort!, anchorMeasureKey: 'trips.fareCollected' },
    }
    const result = resolveReport(blocked, catalogue, { permissions: [], today: EYVAR_TODAY })
    expect(result.series.every((s) => s.blocked === 'view_finance')).toBe(true)
    expect(result.series.every((s) => s.points.length === 0)).toBe(true)
  })
})

/* ─────────────────────────────  journey  ──────────────────────────────── */

describe('4 — a journey reads its paths off recorded rows', () => {
  it('counts subjects on distinct paths, and every path is a real one', () => {
    const result = run(journey)
    const keys = new Set(measureFixtures.map((m) => m.key))
    for (const series of result.series) {
      const path = series.groupValue ?? ''
      if (path === NO_PATH || path === '__other__') continue
      for (const step of path.split('>')) expect(keys.has(step)).toBe(true)
    }
  })

  it('never draws a step deeper than the depth it was asked for', () => {
    for (const depth of [1, 2, 3]) {
      const result = run({ ...journey, journey: { rootMeasureKey: 'riders.joined', depth } })
      for (const series of result.series) {
        const path = series.groupValue ?? ''
        if (path === NO_PATH || path === '__other__') continue
        expect(path.split('>').length).toBeLessThanOrEqual(depth)
      }
    }
  })

  it('counts the subjects who did nothing, rather than dropping them', () => {
    /* Dropping them is how a journey diagram claims a 100 % continuation rate.
       Every subject with a root event lands on exactly one path, so the paths
       sum to the number of subjects who entered. */
    const result = run(journey)
    const total = result.series.reduce((sum, s) => sum + Number(s.points[0] ?? 0), 0)
    const entered = resolveReport(
      { ...trend, measures: [{ key: 'riders.joined' }], window: journey.window, grain: 'none' },
      catalogue,
      ctx,
    ).series[0]?.points[0]
    expect(total).toBe(entered)
  })

  it('never lets the root event be its own first step', () => {
    const result = run(journey)
    for (const series of result.series) {
      const path = series.groupValue ?? ''
      if (path === NO_PATH || path === '__other__') continue
      /* *Joined → joined* is one `joinedAt` read twice, not a journey. */
      expect(path.split('>')[0]).not.toBe('riders.joined')
    }
  })

  it('counts people, in whole numbers, whatever its steps measure', () => {
    expect(run(journey).series.every((s) => s.unit === 'count')).toBe(true)
  })
})

/* ─────────────────── trend and table are still untouched ───────────────── */

describe('5 — the two modes that always resolved', () => {
  it('resolves a trend exactly as it always has', () => {
    const result = run(trend)
    expect(result.series.length).toBeGreaterThan(0)
    expect(result.buckets.length).toBeGreaterThan(0)
    expect(result.cohortSizes).toBeUndefined()
  })

  it('resolves `table` mode to the same numbers as the trend it lists', () => {
    /* `table` is not a third resolution path. It is the trend's numbers,
       rendered as rows — so the two results must agree point for point, or the
       table and the chart of one saved report would disagree. */
    const asTable: ReportQuery = { ...trend, chartType: 'table', mode: 'table' }
    expect(run(asTable).series.map((s) => s.points)).toEqual(run(trend).series.map((s) => s.points))
  })

  it('treats a query with no mode as a trend', () => {
    expect(run({ ...trend, mode: undefined }).series.map((s) => s.points)).toEqual(
      run(trend).series.map((s) => s.points),
    )
  })
})
