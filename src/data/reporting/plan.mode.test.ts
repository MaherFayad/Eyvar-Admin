/**
 * **P7-T2's acceptance, as tests.**
 *
 * The legality contract this file guards is the one `LegalityOptions.tsx`
 * already renders: an illegal combination is **disabled in place with a
 * reason**, never hidden, and the reason is a `{ code, field, reasonKey,
 * reasonParams }` object rather than a sentence assembled from fragments
 * (D9 CQ-3, AC-816, AC-836, AC-894). Every assertion below checks the code
 * *and* the field, because the field is what decides which control the reason
 * sits beside — a right reason in the wrong place is a reason nobody reads.
 *
 * `trend` and `table` keep today's rules, and the last block proves it: the
 * five queries seeded before `mode` existed still plan exactly as they did.
 */

import { describe, expect, it } from 'vitest'
import { dimensionFixtures, measureFixtures } from '../fixtures/measures'
import { savedReportFixtures } from '../fixtures/reports'
import { EYVAR_TODAY } from '../mock/clock'
import {
  MAX_COHORT_HORIZON,
  MAX_CURRENT_SERIES,
  MAX_FUNNEL_STEPS,
  MAX_JOURNEY_DEPTH,
  MIN_FUNNEL_STEPS,
  cohortIntervals,
  planQuery,
  type Catalogue,
} from './plan'
import type { Measure } from '../types/measure'
import type { FunnelStep, QueryViolation, ReportQuery } from '../types/report'

const CATALOGUE: Catalogue = { measures: measureFixtures, dimensions: dimensionFixtures }

const plan = (query: ReportQuery) => planQuery(query, CATALOGUE, EYVAR_TODAY)
const codes = (query: ReportQuery) => plan(query).violations.map((v) => v.code)
const violation = (query: ReportQuery, code: QueryViolation['code']) =>
  plan(query).violations.find((v) => v.code === code)

/** v2 (WP-1.4) tests below plan against a catalogue extended with one synthetic measure —
    for the units and capabilities no fixture measure happens to combine with `additive`. */
const planIn = (query: ReportQuery, catalogue: Catalogue) => planQuery(query, catalogue, EYVAR_TODAY)
const catalogueWith = (...extra: Measure[]): Catalogue => ({
  measures: [...measureFixtures, ...extra],
  dimensions: dimensionFixtures,
})
const syntheticMeasure = (overrides: Partial<Measure>): Measure => ({
  ...measureFixtures.find((m) => m.key === 'trips.completed')!,
  key: 'test.synthetic',
  dimensions: [{ key: 'trip.pickup', cardinalityHint: 12 }],
  ...overrides,
})

/** Everything common to the four non-trend modes. Each block varies one thing. */
const base: ReportQuery = {
  measures: [],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-90d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'bar',
  mode: 'trend',
}

const step = (measureKey: string): FunnelStep => ({ measureKey, filters: [] })

/** The v2 `FunnelSpec` at its defaults, for tests that only vary `steps` or one v2 field. */
const funnelSpec = (
  steps: FunnelStep[],
  overrides: Partial<NonNullable<ReportQuery['funnel']>> = {},
): NonNullable<ReportQuery['funnel']> => ({
  steps,
  conversionWindow: null,
  mode: 'ordered',
  holdConstant: null,
  exclude: [],
  measuredAs: 'conversion',
  groupBy: null,
  ...overrides,
})

/* ────────────────────────────── funnel ─────────────────────────────────── */

describe('1 — a funnel needs ordered steps', () => {
  const funnel = (steps: FunnelStep[]): ReportQuery => ({
    ...base,
    mode: 'funnel',
    funnel: funnelSpec(steps),
  })

  it('refuses a funnel with no configuration at all', () => {
    expect(codes({ ...base, mode: 'funnel' })).toContain('funnel-needs-steps')
  })

  it('refuses one rung — a funnel of one is a number', () => {
    const v = violation(funnel([step('riders.joined')]), 'funnel-needs-steps')
    expect(v).toMatchObject({
      field: 'funnel',
      reasonKey: 'rb.funnel.needsSteps',
      reasonParams: { steps: 1, min: MIN_FUNNEL_STEPS },
    })
  })

  it('accepts two rungs', () => {
    expect(codes(funnel([step('riders.joined'), step('trips.completed')]))).toEqual([])
  })

  it('refuses more rungs than the picker ever offered', () => {
    const seven = [
      'riders.joined',
      'trips.completed',
      'subscriptions.started',
      'captains.joined',
      'trips.quickRides',
      'subscriptions.cancelled',
      'riders.activated',
    ].map(step)
    const v = violation(funnel(seven), 'funnel-too-many-steps')
    expect(v).toMatchObject({
      field: 'funnel',
      reasonKey: 'rb.funnel.tooManySteps',
      reasonParams: { steps: 7, max: MAX_FUNNEL_STEPS },
    })
  })

  it('refuses a repeated rung, and names the second one', () => {
    const v = violation(
      funnel([step('riders.joined'), step('trips.completed'), step('riders.joined')]),
      'funnel-duplicate-step',
    )
    /* Position 3, not 1: the first occurrence is the one the operator meant. */
    expect(v).toMatchObject({
      field: 'funnel',
      reasonKey: 'rb.funnel.duplicateStep',
      reasonParams: { key: 'riders.joined', position: 3 },
    })
  })

  it('allows the same measure twice when the rungs are filtered differently', () => {
    /* *Completed a Quick Ride, then completed a scheduled trip* is a real
       funnel over one measure, and it is not a duplicate. */
    const query: ReportQuery = {
      ...base,
      mode: 'funnel',
      funnel: funnelSpec([
        { measureKey: 'trips.completed', filters: [{ field: 'trip.kind', op: 'eq', value: 'quick' }] },
        { measureKey: 'trips.completed', filters: [] },
      ]),
    }
    expect(codes(query)).toEqual([])
  })

  it('names a rung whose measure does not exist, beside the funnel control', () => {
    const v = violation(funnel([step('riders.joined'), step('not.a.measure')]), 'unknown-measure')
    expect(v).toMatchObject({ field: 'funnel', reasonParams: { key: 'not.a.measure' } })
  })

  it('does not ask a funnel for `measures`, and does not cap it at two', () => {
    /* §6.1's cap is about two series on one canvas. Six rungs is not six
       series, and `no-measure` is a trend-mode reason. */
    const six = [
      'riders.joined',
      'trips.completed',
      'subscriptions.started',
      'captains.joined',
      'trips.quickRides',
      'riders.activated',
    ].map(step)
    expect(codes(funnel(six))).toEqual([])
  })
})

/* ────────────────────────────── cohort ─────────────────────────────────── */

describe('2 — a cohort needs an anchor event and a window', () => {
  const cohort = (
    spec: Partial<NonNullable<ReportQuery['cohort']>>,
    window: ReportQuery['window'] = { kind: 'preset', preset: 'last-365d' },
  ): ReportQuery => ({
    ...base,
    chartType: 'table',
    window,
    mode: 'cohort',
    cohort: {
      anchorMeasureKey: 'riders.joined',
      returnMeasureKeys: [],
      cohortGrain: 'month',
      method: 'rolling',
      brackets: null,
      horizon: 3,
      ...spec,
    },
  })

  it('refuses a cohort with no configuration at all', () => {
    const v = plan({ ...base, mode: 'cohort' }).violations.find(
      (x) => x.code === 'cohort-needs-anchor',
    )
    expect(v).toMatchObject({ field: 'cohort', reasonKey: 'rb.cohort.needsAnchor' })
  })

  it('refuses a null anchor', () => {
    expect(codes(cohort({ anchorMeasureKey: null }))).toContain('cohort-needs-anchor')
  })

  it('accepts an anchor, a legal grain and a window long enough', () => {
    expect(codes(cohort({}))).toEqual([])
  })

  it('refuses a window shorter than the horizon it is asked to show', () => {
    /* `M0…M3` needs four calendar months. Thirty days holds one or two. */
    const v = violation(
      cohort({ horizon: 3 }, { kind: 'preset', preset: 'last-30d' }),
      'cohort-window-too-short',
    )
    expect(v?.field).toBe('window')
    expect(v?.reasonKey).toBe('rb.cohort.windowTooShort')
    expect(v?.reasonParams.needed).toBe(4)
    expect(Number(v?.reasonParams.periods)).toBeLessThan(4)
  })

  it('refuses a horizon past the matrix’s width', () => {
    const v = violation(cohort({ horizon: 24 }), 'cohort-horizon-out-of-range')
    expect(v).toMatchObject({
      field: 'cohort',
      reasonKey: 'rb.cohort.horizonOutOfRange',
      reasonParams: { horizon: 24, max: MAX_COHORT_HORIZON },
    })
  })

  it('refuses `M0` alone — a column of 100 percents', () => {
    expect(codes(cohort({ horizon: 0 }))).toContain('cohort-horizon-out-of-range')
  })

  it('offers day and week and disables them with the reason, rather than hiding them', () => {
    /* `reporting/cohorts.ts` measures age with `monthDiff`. Day and week stay
       on screen so the operator learns the rule (D9 CQ-3). */
    const grains = plan(cohort({})).cohortGrains
    expect(grains.map((g) => g.value)).toEqual(['day', 'week', 'month'])
    expect(grains.find((g) => g.value === 'month')?.legal).toBe(true)
    expect(grains.find((g) => g.value === 'day')).toMatchObject({
      legal: false,
      reasonKey: 'rb.cohort.grainUnavailable',
      reasonParams: { grain: 'day' },
    })
  })

  it('refuses a query that picks one of them anyway, with the same reason', () => {
    /* AC-825: a hand-edited URL gets the sentence the greyed control carries. */
    const v = violation(cohort({ cohortGrain: 'day' }), 'cohort-grain-unavailable')
    expect(v).toMatchObject({ field: 'cohort', reasonKey: 'rb.cohort.grainUnavailable' })
  })

  it('hands `reporting/cohorts.ts` its own column vocabulary', () => {
    /* The retention maths does not move. `buildCohortMatrix`'s fourth argument
       is exactly this array, and the plan is what produces it. */
    expect(plan(cohort({ horizon: 3 })).cohortIntervals).toEqual(['M0', 'M1', 'M2', 'M3'])
    expect(cohortIntervals(5)).toEqual(['M0', 'M1', 'M2', 'M3', 'M4', 'M5'])
  })

  it('clamps the interval list even for a horizon it is about to refuse', () => {
    /* A hand-edited URL asking for `M9999` must not build ten thousand column
       headers on the way to reporting the violation. */
    expect(plan(cohort({ horizon: 9_999 })).cohortIntervals.length).toBeLessThanOrEqual(
      MAX_COHORT_HORIZON + 1,
    )
  })

  it('is empty in every other mode, because the control is not on screen', () => {
    expect(plan({ ...base, measures: [{ key: 'trips.completed' }], grain: 'day' }).cohortGrains).toEqual([])
    expect(plan({ ...base, measures: [{ key: 'trips.completed' }], grain: 'day' }).cohortIntervals).toEqual([])
  })
})

/* ───────────────────────────── journey ─────────────────────────────────── */

describe('3 — a journey needs a root', () => {
  const journey = (spec: Partial<NonNullable<ReportQuery['journey']>>): ReportQuery => ({
    ...base,
    chartType: 'table',
    mode: 'journey',
    journey: { rootMeasureKey: 'riders.joined', depth: 2, ...spec },
  })

  it('refuses a journey with no configuration at all', () => {
    const v = plan({ ...base, mode: 'journey' }).violations.find(
      (x) => x.code === 'journey-needs-root',
    )
    expect(v).toMatchObject({ field: 'journey', reasonKey: 'rb.journey.needsRoot' })
  })

  it('refuses a null root', () => {
    expect(codes(journey({ rootMeasureKey: null }))).toContain('journey-needs-root')
  })

  it('accepts a root and a depth inside the range', () => {
    expect(codes(journey({}))).toEqual([])
  })

  it('refuses a depth of zero and a depth past the ceiling', () => {
    expect(codes(journey({ depth: 0 }))).toContain('journey-depth-out-of-range')
    const v = violation(journey({ depth: 9 }), 'journey-depth-out-of-range')
    expect(v).toMatchObject({
      field: 'journey',
      reasonKey: 'rb.journey.depthOutOfRange',
      reasonParams: { depth: 9, max: MAX_JOURNEY_DEPTH },
    })
  })

  it('names an unknown root beside the journey control', () => {
    const v = violation(journey({ rootMeasureKey: 'not.a.measure' }), 'unknown-measure')
    expect(v).toMatchObject({ field: 'journey', reasonParams: { key: 'not.a.measure' } })
  })
})

/* ─────────────────── what the mode decides for the operator ────────────── */

describe('4 — the mode fixes the chart and, where there is no calendar, the grain', () => {
  const funnelQuery: ReportQuery = {
    ...base,
    mode: 'funnel',
    funnel: funnelSpec([step('riders.joined'), step('trips.completed')]),
  }

  it('leaves the chart choice with the operator in trend mode only', () => {
    const trend = plan({
      ...base,
      mode: 'trend',
      measures: [{ key: 'trips.completed' }],
      grain: 'day',
      chartType: 'line',
    })
    expect(trend.chartTypes.filter((c) => c.legal).map((c) => c.value)).toContain('line')
    expect(trend.chartTypes.find((c) => c.value === 'line')?.reasonKey).toBeNull()
  })

  it('fixes a funnel to bars, and disables the rest in place with the reason', () => {
    const p = plan(funnelQuery)
    expect(p.effectiveChartType).toBe('bar')
    /* Present, not removed. AC-836. v2 (WP-1.4) widens `CHART_TYPES` to all
       nine (02 §2.8); the count changed, not the rule this asserts. */
    expect(p.chartTypes.map((c) => c.value)).toEqual([
      'line',
      'area',
      'bar',
      'stacked-bar',
      'stacked-100',
      'horizontal-bar',
      'pie',
      'kpi',
      'table',
    ])
    expect(p.chartTypes.find((c) => c.value === 'pie')).toMatchObject({
      legal: false,
      reasonKey: 'rb.chart.modeFixed',
      reasonParams: { chart: 'bar', mode: 'funnel' },
    })
  })

  it('fixes a cohort and a journey to a table', () => {
    expect(plan({ ...base, mode: 'cohort' }).effectiveChartType).toBe('table')
    expect(plan({ ...base, mode: 'journey' }).effectiveChartType).toBe('table')
  })

  it('collapses the window to one period where the x-axis is not a calendar', () => {
    const p = plan(funnelQuery)
    expect(p.grains.find((g) => g.value === 'none')?.legal).toBe(true)
    expect(p.grains.find((g) => g.value === 'day')).toMatchObject({
      legal: false,
      reasonKey: 'rb.grain.modeFixed',
      reasonParams: { grain: 'day', mode: 'funnel' },
    })
  })

  it('says `mode-fixes-grain` when a query asks for a calendar grain anyway', () => {
    const v = violation({ ...funnelQuery, grain: 'day' }, 'mode-fixes-grain')
    expect(v).toMatchObject({ field: 'grain', reasonKey: 'rb.grain.modeFixed' })
  })

  it('keeps the grain in `table` mode, because a daily table is the point', () => {
    const p = plan({
      ...base,
      mode: 'table',
      chartType: 'table',
      measures: [{ key: 'trips.completed' }],
      grain: 'day',
    })
    expect(p.grains.find((g) => g.value === 'day')?.legal).toBe(true)
    expect(p.violations).toEqual([])
  })

  it('draws one panel for a funnel, a cohort and a journey', () => {
    expect(plan(funnelQuery).panelCount).toBe(1)
    expect(plan({ ...base, mode: 'cohort' }).panelCount).toBe(1)
    expect(plan({ ...base, mode: 'journey' }).panelCount).toBe(1)
  })

  it('echoes the mode it planned for, and defaults an absent one to trend', () => {
    expect(plan({ ...base, mode: undefined }).mode).toBe('trend')
    expect(plan(funnelQuery).mode).toBe('funnel')
  })
})

/* ───────────────────── trend and table are unchanged ───────────────────── */

describe('5 — `trend` and `table` keep today’s rules', () => {
  it('still refuses a query with no measure', () => {
    expect(codes({ ...base, mode: 'trend', grain: 'day', chartType: 'line' })).toContain('no-measure')
  })

  it('still refuses a third measure', () => {
    const three: ReportQuery = {
      ...base,
      mode: 'trend',
      grain: 'day',
      chartType: 'line',
      measures: [
        { key: 'captains.registered' },
        { key: 'riders.registered' },
        { key: 'subscriptions.active' },
      ],
    }
    expect(codes(three)).toContain('too-many-measures')
  })

  it('still refuses a stock and a flow on one axis (§6.2, AC-825)', () => {
    const mixed: ReportQuery = {
      ...base,
      mode: 'trend',
      grain: 'day',
      chartType: 'line',
      measures: [{ key: 'captains.registered' }, { key: 'trips.completed' }],
    }
    expect(codes(mixed)).toContain('mixed-temporality')
  })

  it('plans every report seeded before `mode` existed exactly as before', () => {
    /* The five pre-P7 fixtures carry no `mode`. None of them may pick up a
       mode violation, and none may lose a control it had. */
    for (const report of savedReportFixtures.filter((r) => r.query.mode === undefined)) {
      const p = plan(report.query)
      expect(p.mode).toBe('trend')
      expect(p.violations).toEqual([])
      expect(p.cohortGrains).toEqual([])
      expect(p.funnelStepKeys).toEqual([])
      /* Trend mode never fixes the chart, so nothing is coerced by the mode. */
      expect(p.chartTypes.find((c) => c.reasonKey === 'rb.chart.modeFixed')).toBeUndefined()
    }
  })

  it('plans every seeded report in a named mode without violations', () => {
    for (const report of savedReportFixtures.filter((r) => r.query.mode !== undefined)) {
      expect({ id: report.id, violations: plan(report.query).violations }).toEqual({
        id: report.id,
        violations: [],
      })
    }
  })
})

/* ═══════════════════ v2, WP-1.4 (`02-report-builder-v2.md` §2, §3) ═══════════ */

/** A trend query with sane defaults, `chartType: 'table'` so a chart gate never fires uninvited. */
const trend = (overrides: Partial<ReportQuery> = {}): ReportQuery => ({
  measures: [{ key: 'trips.completed' }],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-90d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'table',
  mode: 'trend',
  ...overrides,
})

/* ─────────────── 6 — chart legality v2 (AC-1113 … AC-1120) ─────────────── */

describe('6 — the series ceiling (AC-1113)', () => {
  it('refuses measures × segments × groups above 12 current series, carrying the count', () => {
    const query = trend({
      measures: [{ key: 'trips.completed' }],
      groupBy: ['trip.pickup'], // 12 parts, folded to 9 at MAX_GROUPS + 1
      segments: [0, 1, 2, 3].map((i) => ({ kind: 'inline' as const, label: `seg${i}`, filters: [] })),
    })
    const v = violation(query, 'too-many-series')
    expect(v).toMatchObject({
      field: 'segments',
      reasonKey: 'rb.violation.tooManySeries',
      reasonParams: { count: 36, max: MAX_CURRENT_SERIES },
    })
  })

  it('is silent exactly at the ceiling', () => {
    // 1 measure × 2 segments × 6 parts (`subscription.status`) = 12, not > 12.
    const query = trend({
      measures: [{ key: 'subscriptions.started' }],
      groupBy: ['subscription.status'],
      segments: [
        { kind: 'inline', label: 'a', filters: [] },
        { kind: 'inline', label: 'b', filters: [] },
      ],
    })
    expect(codes(query)).not.toContain('too-many-series')
  })
})

describe('7 — a second split level (AC-1114)', () => {
  it('makes `line` and `bar` illegal and leaves `stacked-bar`, `stacked-100`, `table` legal', () => {
    const p = plan(trend({ groupBy: ['trip.kind', 'trip.pickup'] }))
    expect(p.chartTypes.find((c) => c.value === 'line')).toMatchObject({
      legal: false,
      reasonKey: 'rb.chart.twoLevelsNeedStack',
    })
    expect(p.chartTypes.find((c) => c.value === 'bar')).toMatchObject({
      legal: false,
      reasonKey: 'rb.chart.twoLevelsNeedStack',
    })
    expect(p.chartTypes.find((c) => c.value === 'stacked-bar')?.legal).toBe(true)
    expect(p.chartTypes.find((c) => c.value === 'stacked-100')?.legal).toBe(true)
    expect(p.chartTypes.find((c) => c.value === 'table')?.legal).toBe(true)
  })
})

describe('8 — `stacked-bar` (AC-1115)', () => {
  it('is illegal for a non-additive measure', () => {
    const p = plan(trend({ measures: [{ key: 'trips.cancellationRate' }] }))
    expect(p.chartTypes.find((c) => c.value === 'stacked-bar')).toMatchObject({
      legal: false,
      reasonKey: 'rb.chart.stackNeedsAdditive',
    })
  })

  it('is illegal with one additive measure and no split', () => {
    const p = plan(trend({ measures: [{ key: 'trips.completed' }], groupBy: [] }))
    expect(p.chartTypes.find((c) => c.value === 'stacked-bar')).toMatchObject({
      legal: false,
      reasonKey: 'rb.chart.stackNeedsParts',
    })
  })

  it.each(['percent', 'ratio', 'rating'] as const)('is illegal for unit %s, each with its own reason key', (unit) => {
    const measure = syntheticMeasure({ key: `test.${unit}`, unit })
    const catalogue = catalogueWith(measure)
    const p = planIn(trend({ measures: [{ key: measure.key }], groupBy: ['trip.pickup'] }), catalogue)
    expect(p.chartTypes.find((c) => c.value === 'stacked-bar')).toMatchObject({
      legal: false,
      reasonKey: 'rb.chart.stackUnit',
      reasonParams: { unit },
    })
  })
})

describe('9 — `kpi` (AC-1116)', () => {
  it('is legal for one measure, no split, no segment, at any grain', () => {
    for (const grain of ['day', 'none'] as const) {
      const p = plan(trend({ measures: [{ key: 'trips.completed' }], groupBy: [], segments: [], grain }))
      expect(p.chartTypes.find((c) => c.value === 'kpi')?.legal).toBe(true)
    }
  })

  it('is illegal with a split', () => {
    const p = plan(trend({ groupBy: ['trip.pickup'] }))
    expect(p.chartTypes.find((c) => c.value === 'kpi')).toMatchObject({
      legal: false,
      reasonKey: 'rb.chart.kpiOneSeries',
    })
  })

  it('is illegal with a segment', () => {
    const p = plan(trend({ segments: [{ kind: 'inline', label: 'x', filters: [] }] }))
    expect(p.chartTypes.find((c) => c.value === 'kpi')).toMatchObject({
      legal: false,
      reasonKey: 'rb.chart.kpiOneSeries',
    })
  })

  it('is illegal with a second measure', () => {
    const p = plan(trend({ measures: [{ key: 'trips.completed' }, { key: 'trips.quickRides' }] }))
    expect(p.chartTypes.find((c) => c.value === 'kpi')).toMatchObject({
      legal: false,
      reasonKey: 'rb.chart.kpiOneSeries',
    })
  })
})

describe('10 — `horizontal-bar` (AC-1117)', () => {
  it('is legal with a single-period split of one measure', () => {
    const p = plan(trend({ groupBy: ['trip.pickup'], grain: 'none' }))
    expect(p.chartTypes.find((c) => c.value === 'horizontal-bar')?.legal).toBe(true)
  })

  it('is illegal without a split', () => {
    const p = plan(trend({ groupBy: [], grain: 'none' }))
    expect(p.chartTypes.find((c) => c.value === 'horizontal-bar')).toMatchObject({
      legal: false,
      reasonKey: 'rb.chart.hbarNeedsSplit',
    })
  })

  it('is illegal when the grain is not `none`', () => {
    const p = plan(trend({ groupBy: ['trip.pickup'], grain: 'day' }))
    expect(p.chartTypes.find((c) => c.value === 'horizontal-bar')).toMatchObject({
      legal: false,
      reasonKey: 'rb.chart.hbarSinglePeriod',
    })
  })
})

describe('11 — `area` (AC-1118)', () => {
  it('is legal for one measure', () => {
    const p = plan(trend({ measures: [{ key: 'trips.completed' }], groupBy: [] }))
    expect(p.chartTypes.find((c) => c.value === 'area')?.legal).toBe(true)
  })

  it('is illegal for two measures', () => {
    const p = plan(trend({ measures: [{ key: 'trips.completed' }, { key: 'trips.quickRides' }] }))
    expect(p.chartTypes.find((c) => c.value === 'area')).toMatchObject({
      legal: false,
      reasonKey: 'rb.chart.areaOneMeasure',
    })
  })
})

describe('12 — `NEAREST` fallbacks follow 02 §3 (AC-1119)', () => {
  it('area falls back to line when only the one-measure gate fails', () => {
    const p = plan(
      trend({
        measures: [{ key: 'trips.completed' }, { key: 'trips.quickRides' }],
        chartType: 'area',
      }),
    )
    expect(p.effectiveChartType).toBe('line')
    expect(p.chartTypeCoerced).toBe(true)
  })

  it('stacked-100 falls back through stacked-bar to table when there are no parts', () => {
    const p = plan(trend({ measures: [{ key: 'trips.completed' }], groupBy: [], chartType: 'stacked-100' }))
    expect(p.effectiveChartType).toBe('table')
    expect(p.chartTypeCoerced).toBe(true)
  })

  it('horizontal-bar falls back to bar when the grain is not `none`', () => {
    const p = plan(trend({ groupBy: ['trip.pickup'], grain: 'day', chartType: 'horizontal-bar' }))
    expect(p.effectiveChartType).toBe('bar')
    expect(p.chartTypeCoerced).toBe(true)
  })
})

describe('13 — `illegal-aggregate` (AC-1120)', () => {
  it('refuses an aggregate outside the measure’s `bucketAggregateOptions`', () => {
    const v = violation(trend({ measures: [{ key: 'trips.completed', aggregate: 'sum' }] }), 'illegal-aggregate')
    expect(v).toMatchObject({
      field: 'measures',
      reasonKey: 'rb.violation.illegalAggregate',
      reasonParams: { key: 'trips.completed', aggregate: 'sum' },
    })
  })

  it('accepts an aggregate the measure lists in `bucketAggregateOptions`', () => {
    const measure = syntheticMeasure({ key: 'test.aggregable', bucketAggregateOptions: ['count', 'sum'] })
    const catalogue = catalogueWith(measure)
    const query = trend({ measures: [{ key: measure.key, aggregate: 'sum' }] })
    expect(planIn(query, catalogue).violations).toEqual([])
  })
})

/* ───────────────────── 14 — formula legality delegates ─────────────────── */

describe('14 — formula legality delegates to `formulaUnit`', () => {
  it('surfaces a parse error at its position (`formula-parse`)', () => {
    const v = violation(trend({ formula: { expression: 'A /', label: 'x' } }), 'formula-parse')
    expect(v?.field).toBe('formula')
    expect(v?.reasonKey).toBe('rb.violation.formulaParse')
    expect(typeof v?.reasonParams.position).toBe('number')
  })

  it('refuses `B` with no second measure (`formula-unknown-ref`)', () => {
    const v = violation(trend({ formula: { expression: 'B', label: 'x' } }), 'formula-unknown-ref')
    expect(v).toMatchObject({ field: 'formula', reasonKey: 'rb.violation.formulaUnknownRef' })
  })

  it('refuses mismatched units (`formula-unit`)', () => {
    const query = trend({
      measures: [{ key: 'trips.completed' }, { key: 'trips.fareCollected' }],
      formula: { expression: 'A - B', label: 'x' },
    })
    const v = violation(query, 'formula-unit')
    expect(v).toMatchObject({ field: 'formula', reasonKey: 'rb.violation.formulaUnit' })
  })

  it('refuses CUMSUM on a non-additive measure (`formula-needs-additive`)', () => {
    const query = trend({
      measures: [{ key: 'trips.cancellationRate' }],
      formula: { expression: 'CUMSUM(A)', label: 'x' },
    })
    const v = violation(query, 'formula-needs-additive')
    expect(v).toMatchObject({ field: 'formula', reasonKey: 'rb.violation.formulaNeedsAdditive' })
  })

  it('refuses PCT with no split (`formula-needs-split`)', () => {
    const query = trend({ groupBy: [], formula: { expression: 'PCT(A)', label: 'x' } })
    const v = violation(query, 'formula-needs-split')
    expect(v).toMatchObject({ field: 'formula', reasonKey: 'rb.violation.formulaNeedsSplit' })
  })

  it('is silent for a legal formula', () => {
    const query = trend({ formula: { expression: 'A / 2', label: 'x' } })
    expect(codes(query).some((c) => c.startsWith('formula-'))).toBe(false)
  })
})

/* ──────────── 15 — a `performed` segment needs the server support ──────── */

describe('15 — segment-performed-unsupported', () => {
  it('refuses `performed` on a measure whose `supportsPerformed` is not `true`', () => {
    const query = trend({
      segments: [
        {
          kind: 'inline',
          label: 'active riders',
          filters: [],
          performed: { measureKey: 'trips.completed', op: 'gte', count: 1, window: 'each-bucket' },
        },
      ],
    })
    const v = violation(query, 'segment-performed-unsupported')
    expect(v).toMatchObject({
      field: 'segments',
      reasonKey: 'rb.violation.segmentPerformedUnsupported',
      reasonParams: { measure: 'trips.completed' },
    })
  })

  it('is silent once the catalogue declares `supportsPerformed`', () => {
    const measure = syntheticMeasure({ key: 'test.performable', supportsPerformed: true })
    const catalogue = catalogueWith(measure)
    const query = trend({
      segments: [
        {
          kind: 'inline',
          label: 'active riders',
          filters: [],
          performed: { measureKey: measure.key, op: 'gte', count: 1, window: 'each-bucket' },
        },
      ],
    })
    expect(planIn(query, catalogue).violations).toEqual([])
  })
})

/* ───────── 16 — a fixed comparison window must match the primary's ─────── */

describe('16 — comparison-length', () => {
  // Same dates `buckets.test.ts`'s "fixed comparison length" primitive proves disagree.
  const current: ReportQuery['window'] = { kind: 'absolute', from: '2026-06-01', to: '2026-06-30' }

  it('refuses a fixed comparison window of a different bucket count', () => {
    const query = trend({
      window: current,
      periodComparison: { kind: 'fixed', from: '2025-01-01', to: '2025-01-10' },
    })
    const v = violation(query, 'comparison-length')
    expect(v).toMatchObject({
      field: 'periodComparison',
      reasonKey: 'rb.violation.comparisonLength',
      reasonParams: { required: 30, got: 10 },
    })
  })

  it('is silent when the fixed window has the same bucket count', () => {
    const query = trend({
      window: current,
      periodComparison: { kind: 'fixed', from: '2025-01-01', to: '2025-01-30' },
    })
    expect(codes(query)).not.toContain('comparison-length')
  })
})

/* ───────── 17 — a funnel's server-only options (§5, `funnel-needs-server`) ─ */

describe('17 — funnel-needs-server', () => {
  const twoSteps = [step('riders.joined'), step('trips.completed')]

  it('refuses `mode: "sequential"` when no rung declares `funnelCapabilities.sequential`', () => {
    const query: ReportQuery = {
      ...base,
      mode: 'funnel',
      funnel: funnelSpec(twoSteps, { mode: 'sequential' }),
    }
    expect(violation(query, 'funnel-needs-server')).toMatchObject({
      field: 'funnel',
      reasonKey: 'rb.funnel.needsServer',
    })
  })

  it('refuses a `holdConstant` no rung declares support for', () => {
    const query: ReportQuery = {
      ...base,
      mode: 'funnel',
      funnel: funnelSpec(twoSteps, { holdConstant: 'trip.kind' }),
    }
    expect(violation(query, 'funnel-needs-server')).toBeDefined()
  })

  it('refuses `exclude` unconditionally — no capability flag could ever satisfy it', () => {
    const query: ReportQuery = {
      ...base,
      mode: 'funnel',
      funnel: funnelSpec(twoSteps, { exclude: ['captains.joined'] }),
    }
    expect(violation(query, 'funnel-needs-server')).toBeDefined()
  })

  it('is silent at the v2 defaults — ordered, no hold, nothing excluded', () => {
    const query: ReportQuery = { ...base, mode: 'funnel', funnel: funnelSpec(twoSteps) }
    expect(codes(query)).not.toContain('funnel-needs-server')
  })
})
