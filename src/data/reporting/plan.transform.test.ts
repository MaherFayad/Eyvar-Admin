/**
 * G1/G4: `plan.ts` carried no violation for an illegal transform or a
 * third `groupBy` level, so a hand-edited URL was never refused (D9 CQ-3).
 * `transformOptions` is the one computation both the control and the violation read.
 */

import { describe, expect, it } from 'vitest'
import { dimensionFixtures, measureFixtures } from '../fixtures/measures'
import { EYVAR_TODAY } from '../mock/clock'
import { planQuery, type Catalogue } from './plan'
import { REPORT_GROUP_BY_MAX, type QueryViolation, type ReportQuery } from '../types/report'

const CATALOGUE: Catalogue = { measures: measureFixtures, dimensions: dimensionFixtures }
const plan = (query: ReportQuery) => planQuery(query, CATALOGUE, EYVAR_TODAY)
const violation = (query: ReportQuery, code: QueryViolation['code']) =>
  plan(query).violations.find((v) => v.code === code)

/** `trips.completed` is additive and splits by `trip.kind` — a plain trend query. */
const trend = (overrides: Partial<ReportQuery> = {}): ReportQuery => ({
  measures: [{ key: 'trips.completed' }],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'table',
  mode: 'trend',
  ...overrides,
})

describe('1 — `transform-needs-additive`', () => {
  it('refuses `cumulative` on a measure that does not add up', () => {
    // `trips.cancellationRate` is `additive: false` (fixtures/measures.ts).
    const query = trend({
      measures: [{ key: 'trips.cancellationRate' }],
      transform: { cumulative: true, rollingAverage: null, percentOfTotal: false },
    })
    const v = violation(query, 'transform-needs-additive')
    expect(v).toMatchObject({
      field: 'transform',
      reasonKey: 'rb.control.transform.cumulative.disabled',
    })
  })

  it('is silent for an additive measure', () => {
    const query = trend({ transform: { cumulative: true, rollingAverage: null, percentOfTotal: false } })
    expect(violation(query, 'transform-needs-additive')).toBeUndefined()
  })

  it('`transformOptions.cumulative` is illegal before the checkbox is ever checked', () => {
    const query = trend({ measures: [{ key: 'trips.cancellationRate' }] })
    expect(plan(query).transformOptions.cumulative).toMatchObject({
      legal: false,
      reasonKey: 'rb.control.transform.cumulative.disabled',
    })
  })
})

describe('2 — `transform-needs-buckets`', () => {
  it('refuses a rolling average wider than the window holds', () => {
    // One calendar day at `grain: 'day'` is one bucket; asking for 7 is illegal.
    const query = trend({
      window: { kind: 'absolute', from: '2026-06-01', to: '2026-06-01' },
      transform: { cumulative: false, rollingAverage: 7, percentOfTotal: false },
    })
    const v = violation(query, 'transform-needs-buckets')
    expect(v).toMatchObject({
      field: 'transform',
      reasonKey: 'rb.control.transform.rollingAverage.disabled',
      reasonParams: { count: 1 },
    })
  })

  it('is silent when the window holds at least the requested buckets', () => {
    const query = trend({ transform: { cumulative: false, rollingAverage: 7, percentOfTotal: false } })
    expect(violation(query, 'transform-needs-buckets')).toBeUndefined()
  })
})

describe('3 — `transform-needs-split`', () => {
  it('refuses `percentOfTotal` with no split', () => {
    const query = trend({
      groupBy: [],
      transform: { cumulative: false, rollingAverage: null, percentOfTotal: true },
    })
    const v = violation(query, 'transform-needs-split')
    expect(v).toMatchObject({
      field: 'transform',
      reasonKey: 'rb.control.transform.percentOfTotal.disabled',
    })
  })

  it('is silent once a split exists', () => {
    const query = trend({
      groupBy: ['trip.kind'],
      transform: { cumulative: false, rollingAverage: null, percentOfTotal: true },
    })
    expect(violation(query, 'transform-needs-split')).toBeUndefined()
  })
})

describe('4 — a hand-edited URL carrying an illegal transform is refused', () => {
  it('the query is refused even though nothing ever offered the illegal state', () => {
    // Nobody could have checked this box through the rail — `financials.arpa`
    // never legalises `cumulative` — so this stands in for a hand-edited URL.
    const query = trend({
      measures: [{ key: 'financials.arpa' }],
      transform: { cumulative: true, rollingAverage: null, percentOfTotal: false },
    })
    const p = plan(query)
    expect(p.violations.map((v) => v.code)).toContain('transform-needs-additive')
  })
})

describe('5 — `too-many-group-levels` (WP-2.6b gap 3)', () => {
  it('refuses a third split level with a reason naming the cap', () => {
    // `REPORT_GROUP_BY_MAX` caps the type at 2; a hand-edited URL can still hold 3.
    const query = trend({ groupBy: ['trip.kind', 'trip.status', 'trip.pickup'] })
    const v = violation(query, 'too-many-group-levels')
    expect(v).toMatchObject({
      field: 'groupBy',
      reasonKey: 'rb.violation.tooManyGroupLevels',
      reasonParams: { max: REPORT_GROUP_BY_MAX },
    })
  })

  it('is silent at exactly two levels', () => {
    const query = trend({ groupBy: ['trip.kind', 'trip.pickup'] })
    expect(violation(query, 'too-many-group-levels')).toBeUndefined()
  })
})

describe('6 — G1: which fixture measures the `Measured as` control can ever appear for', () => {
  it('has at least two measures with a genuine, multi-entry `bucketAggregateOptions`', () => {
    const multiOption = measureFixtures.filter((m) => (m.bucketAggregateOptions?.length ?? 0) > 1)
    expect(multiOption.length).toBeGreaterThanOrEqual(2)
    expect(multiOption.map((m) => m.key)).toEqual(expect.arrayContaining(['trips.fareCollected', 'revenue.total']))
  })

  it('every other fixture measure has no `bucketAggregateOptions` or exactly one entry', () => {
    const single = measureFixtures.filter((m) => (m.bucketAggregateOptions?.length ?? 0) <= 1)
    expect(single.find((m) => m.key === 'trips.completed')).toBeDefined()
  })
})
