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
  MAX_FUNNEL_STEPS,
  MAX_JOURNEY_DEPTH,
  MIN_FUNNEL_STEPS,
  cohortIntervals,
  planQuery,
  type Catalogue,
} from './plan'
import type { FunnelStep, QueryViolation, ReportQuery } from '../types/report'

const CATALOGUE: Catalogue = { measures: measureFixtures, dimensions: dimensionFixtures }

const plan = (query: ReportQuery) => planQuery(query, CATALOGUE, EYVAR_TODAY)
const codes = (query: ReportQuery) => plan(query).violations.map((v) => v.code)
const violation = (query: ReportQuery, code: QueryViolation['code']) =>
  plan(query).violations.find((v) => v.code === code)

/** Everything common to the four non-trend modes. Each block varies one thing. */
const base: ReportQuery = {
  measures: [],
  groupBy: null,
  filters: [],
  window: { kind: 'preset', preset: 'last-90d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'bar',
  mode: 'trend',
}

const step = (measureKey: string): FunnelStep => ({ measureKey, filters: [] })

/* ────────────────────────────── funnel ─────────────────────────────────── */

describe('1 — a funnel needs ordered steps', () => {
  const funnel = (steps: FunnelStep[]): ReportQuery => ({
    ...base,
    mode: 'funnel',
    funnel: { steps, conversionWindowDays: null },
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
      funnel: {
        steps: [
          { measureKey: 'trips.completed', filters: [{ field: 'trip.kind', op: 'eq', value: 'quick' }] },
          { measureKey: 'trips.completed', filters: [] },
        ],
        conversionWindowDays: null,
      },
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
      returnMeasureKey: null,
      cohortGrain: 'month',
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
    funnel: {
      steps: [step('riders.joined'), step('trips.completed')],
      conversionWindowDays: null,
    },
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
    /* Present, not removed. AC-836. */
    expect(p.chartTypes.map((c) => c.value)).toEqual(['line', 'bar', 'pie', 'table'])
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
