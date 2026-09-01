/**
 * **The two halves of "who is this row about" cannot drift apart.**
 *
 * `reporting/subjects.ts` declares which stores name a person, one layer above
 * the mock, so `planQuery` can refuse a cohort anchored on a subject-less
 * measure *before a request exists*. `mock/resolveReport.ts` declares how to
 * read the id off a row. Two declarations of one fact is two declarations that
 * can disagree — and the way they would disagree is silent: a store the table
 * calls a subject store, whose rows carry no id, resolves to a cohort of nobody
 * and renders an empty matrix that looks like a fact about the business.
 *
 * So the guard is behavioural rather than a comparison of two tables: every
 * measure the table says has a subject must actually produce one, and every
 * measure it says has none must be refused by the planner with the reason
 * beside the control the operator would fix.
 */

import { describe, expect, it } from 'vitest'
import { dimensionFixtures, measureFixtures } from '../fixtures/measures'
import { EYVAR_TODAY } from '../mock/clock'
import { resolveReport } from '../mock/resolveReport'
import { planQuery, type Catalogue } from './plan'
import { subjectKindOf } from './subjects'
import type { ReportQuery } from '../types/report'

const catalogue: Catalogue = { measures: measureFixtures, dimensions: dimensionFixtures }
const ctx = {
  permissions: measureFixtures
    .map((m) => m.permission?.key)
    .filter((k): k is NonNullable<typeof k> => Boolean(k)),
  today: EYVAR_TODAY,
}

const cohortOn = (anchorMeasureKey: string): ReportQuery => ({
  measures: [],
  groupBy: null,
  filters: [],
  window: { kind: 'preset', preset: 'last-365d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'table',
  mode: 'cohort',
  cohort: { anchorMeasureKey, returnMeasureKey: null, cohortGrain: 'month', horizon: 1 },
})

const withSubject = measureFixtures.filter((m) => subjectKindOf(m.population.resource) !== null)
const withoutSubject = measureFixtures.filter((m) => subjectKindOf(m.population.resource) === null)

describe('the subject table and the row sources agree', () => {
  it('has both kinds of measure in the catalogue, or the test below proves nothing', () => {
    expect(withSubject.length).toBeGreaterThan(0)
    expect(withoutSubject.length).toBeGreaterThan(0)
  })

  it.each(withSubject.map((m) => [m.key] as const))(
    'resolves a cohort anchored on %s to real rows, because its store names a person',
    (key) => {
      const query = cohortOn(key)
      expect(planQuery(query, catalogue, EYVAR_TODAY).violations).toEqual([])
      const result = resolveReport(query, catalogue, ctx)
      /* A cohort of nobody is what a store whose rows carry no readable subject
         id produces, and it is indistinguishable on screen from a real answer.
         Every measure the table calls a subject measure has to produce cohorts. */
      expect(result.buckets.length).toBeGreaterThan(0)
      expect(result.cohortSizes?.some((n) => n > 0)).toBe(true)
    },
  )

  it.each(withoutSubject.map((m) => [m.key] as const))(
    'refuses a cohort anchored on %s in the planner, not with an empty matrix',
    (key) => {
      const violations = planQuery(cohortOn(key), catalogue, EYVAR_TODAY).violations
      const refusal = violations.find((v) => v.code === 'cohort-anchor-not-subject')
      /* D9 CQ-3 — disabled in place with a reason, beside the control that
         chose it, rather than a run that comes back empty. */
      expect(refusal).toMatchObject({ field: 'cohort', reasonKey: 'rb.cohort.anchorNotSubject' })
    },
  )
})
