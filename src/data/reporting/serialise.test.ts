/**
 * **P7-T1's acceptance, as tests.**
 *
 * `serialiseReportQuery` is what makes a report shareable, bookmarkable and
 * alertable — §9.2 makes the URL the storage adapter, AC-853 says a reload does
 * not lose the question, AC-854 says Back steps through previous questions, and
 * AC-855 says sharing works with no share feature. Before P7-T1 only `trend`
 * had any of that. A mode that does not serialise is a mode nobody can send to
 * anyone, so the round trip is the acceptance criterion and not an
 * implementation detail.
 *
 * Three properties, in order of how much breaks when one fails:
 *
 *   1. **every mode round-trips losslessly**, up to `normaliseReportQuery`;
 *   2. **`trend` never reaches the URL**, so the encoding of every query that
 *      existed before this field is byte-identical;
 *   3. **a link written before `mode` existed still parses**, to the same
 *      report it always named.
 */

import { describe, expect, it } from 'vitest'
import {
  REPORT_QUERY_PARAM,
  deserialiseReportQuery,
  reportQueryPath,
  serialiseReportQuery,
} from './serialise'
import { normaliseReportQuery } from '../types/report'
import { savedReportFixtures } from '../fixtures/reports'
import type { ReportQuery } from '../types/report'

/* A trend query with nothing exotic in it. Every case below is this, varied. */
const trend: ReportQuery = {
  measures: [{ key: 'captains.registered' }, { key: 'riders.registered' }],
  groupBy: null,
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

const funnel: ReportQuery = {
  measures: [],
  groupBy: null,
  filters: [],
  window: { kind: 'preset', preset: 'last-90d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'bar',
  mode: 'funnel',
  funnel: {
    steps: [
      { measureKey: 'riders.joined', filters: [] },
      { measureKey: 'trips.completed', filters: [{ field: 'trip.kind', op: 'eq', value: 'quick' }] },
      { measureKey: 'subscriptions.started', filters: [] },
    ],
    conversionWindowDays: 14,
  },
}

const cohort: ReportQuery = {
  measures: [],
  groupBy: null,
  filters: [],
  window: { kind: 'preset', preset: 'last-365d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'table',
  mode: 'cohort',
  cohort: {
    anchorMeasureKey: 'riders.joined',
    returnMeasureKey: null,
    cohortGrain: 'month',
    horizon: 3,
  },
}

const journey: ReportQuery = {
  measures: [],
  groupBy: null,
  filters: [],
  window: { kind: 'preset', preset: 'last-90d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'table',
  mode: 'journey',
  journey: { rootMeasureKey: 'riders.joined', depth: 2 },
}

const table: ReportQuery = { ...trend, chartType: 'table', mode: 'table' }

const roundTrip = (query: ReportQuery) => deserialiseReportQuery(serialiseReportQuery(query))

/** The payload, readable. Base64url, so the two substituted characters come back first. */
function decode(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
  return atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
}

describe('1 — every mode round-trips losslessly', () => {
  const cases: Array<[string, ReportQuery]> = [
    ['trend', { ...trend, mode: 'trend' }],
    ['funnel', funnel],
    ['table', table],
    ['cohort', cohort],
    ['journey', journey],
  ]

  it.each(cases)('%s survives the URL unchanged', (_name, query) => {
    expect(roundTrip(query)).toEqual(normaliseReportQuery(query))
  })

  it('keeps a funnel step’s own filters attached to that step', () => {
    /* The rung-level filter is the one thing a query-level filter cannot
       express, so losing it would silently widen the funnel rather than break
       it — the failure that looks like data. */
    const back = roundTrip(funnel)
    expect(back?.funnel?.steps.map((s) => s.measureKey)).toEqual([
      'riders.joined',
      'trips.completed',
      'subscriptions.started',
    ])
    expect(back?.funnel?.steps[1]?.filters).toEqual([
      { field: 'trip.kind', op: 'eq', value: 'quick' },
    ])
    expect(back?.funnel?.steps[0]?.filters).toEqual([])
  })

  it('keeps the funnel’s step order, because the order is the funnel', () => {
    const reversed: ReportQuery = {
      ...funnel,
      funnel: { ...funnel.funnel!, steps: [...funnel.funnel!.steps].reverse() },
    }
    expect(roundTrip(reversed)?.funnel?.steps.map((s) => s.measureKey)).toEqual([
      'subscriptions.started',
      'trips.completed',
      'riders.joined',
    ])
    expect(serialiseReportQuery(reversed)).not.toBe(serialiseReportQuery(funnel))
  })

  it('distinguishes “no funnel yet” from “a funnel with no steps”', () => {
    /* Two different states of the panel, and they render differently. An absent
       configuration must not come back as an empty one. */
    expect(roundTrip({ ...trend, mode: 'funnel' })?.funnel).toBeUndefined()
    expect(
      roundTrip({ ...trend, mode: 'funnel', funnel: { steps: [], conversionWindowDays: null } })
        ?.funnel,
    ).toEqual({ steps: [], conversionWindowDays: null })
  })

  it('is deterministic — one question, one link', () => {
    /* §9.2. Two panels that built the same query in a different property order
       must produce the same string, or `Back` deduplication breaks and two
       identical bug reports look like two bugs. */
    const a: ReportQuery = { ...cohort }
    const b: ReportQuery = {
      cohort: cohort.cohort,
      mode: 'cohort',
      chartType: 'table',
      periodComparison: 'none',
      grain: 'none',
      window: { kind: 'preset', preset: 'last-365d' },
      filters: [],
      groupBy: null,
      measures: [],
    }
    expect(serialiseReportQuery(a)).toBe(serialiseReportQuery(b))
  })
})

describe('2 — `trend` is the default and stays out of the URL', () => {
  it('encodes a query with no mode and a query with mode `trend` identically', () => {
    expect(serialiseReportQuery(trend)).toBe(serialiseReportQuery({ ...trend, mode: 'trend' }))
  })

  it('writes no `mo` key for a trend query', () => {
    expect(decode(serialiseReportQuery({ ...trend, mode: 'trend' }))).not.toContain('"mo"')
  })

  it('writes `mo` for every mode that is not the default', () => {
    for (const query of [funnel, table, cohort, journey]) {
      expect(decode(serialiseReportQuery(query))).toContain('"mo"')
    }
  })

  it('resolves an absent mode to trend on the way back', () => {
    expect(roundTrip(trend)?.mode).toBe('trend')
  })
})

describe('3 — existing links keep working, byte for byte', () => {
  /**
   * The literal a browser had in its address bar **before `mode` existed**,
   * produced by the seven-key serialiser this file replaced. It is pinned as a
   * string rather than recomputed, because recomputing it with the current code
   * would only prove the current code agrees with itself.
   *
   * It is `RPT-1`'s query — *"number of drivers vs passengers trend"*, the
   * business owner's own example and the most likely link to exist in someone's
   * chat history.
   */
  const LEGACY_RPT1 =
    'eyJtIjpbImNhcHRhaW5zLnJlZ2lzdGVyZWQiLCJyaWRlcnMucmVnaXN0ZXJlZCJdLCJnIjpudWxsLCJmIjpbXSwidyI6eyJraW5kIjoicHJlc2V0IiwicHJlc2V0IjoibGFzdC0zMGQifSwiZ3IiOiJkYXkiLCJjIjoibm9uZSIsImN0IjoibGluZSJ9'

  /** A second legacy link, with the three things `RPT-1` does not exercise:
      an absolute window, a filter, and a period comparison. */
  const LEGACY_ABSOLUTE =
    'eyJtIjpbInRyaXBzLmNvbXBsZXRlZCJdLCJnIjoidHJpcC5waWNrdXAiLCJmIjpbWyJ0cmlwLmtpbmQiLCJlcSIsInF1aWNrIl1dLCJ3Ijp7ImtpbmQiOiJhYnNvbHV0ZSIsImZyb20iOiIyMDI2LTAxLTAxIiwidG8iOiIyMDI2LTAzLTMxIn0sImdyIjoid2VlayIsImMiOiJwcmV2aW91cy15ZWFyIiwiY3QiOiJiYXIifQ'

  it('parses a link written before `mode` existed, unchanged', () => {
    expect(deserialiseReportQuery(LEGACY_RPT1)).toEqual({
      measures: [{ key: 'captains.registered' }, { key: 'riders.registered' }],
      groupBy: null,
      filters: [],
      window: { kind: 'preset', preset: 'last-30d' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
      mode: 'trend',
    })
  })

  it('parses a legacy link carrying an absolute window, a filter and a comparison', () => {
    expect(deserialiseReportQuery(LEGACY_ABSOLUTE)).toEqual({
      measures: [{ key: 'trips.completed' }],
      groupBy: 'trip.pickup',
      filters: [{ field: 'trip.kind', op: 'eq', value: 'quick' }],
      window: { kind: 'absolute', from: '2026-01-01', to: '2026-03-31' },
      grain: 'week',
      periodComparison: 'previous-year',
      chartType: 'bar',
      mode: 'trend',
    })
  })

  it('still emits those exact bytes, so an old link and a new one are the same link', () => {
    /* This is the property that keeps a bookmark, a runbook entry and a pasted
       chat message all pointing at the same place. If P7-T1 had written `mo`
       for the default, every one of them would have become a second link to
       one question. */
    expect(serialiseReportQuery(deserialiseReportQuery(LEGACY_RPT1)!)).toBe(LEGACY_RPT1)
    expect(serialiseReportQuery(deserialiseReportQuery(LEGACY_ABSOLUTE)!)).toBe(LEGACY_ABSOLUTE)
  })

  it('leaves every seeded trend report’s link untouched', () => {
    /* The five queries seeded before P7-T1 carry no `mode` field, on purpose.
       None of them may acquire a `mo` param. */
    const preModeReports = savedReportFixtures.filter((r) => r.query.mode === undefined)
    expect(preModeReports).toHaveLength(5)
    for (const report of preModeReports) {
      expect(decode(serialiseReportQuery(report.query))).not.toContain('"mo"')
    }
  })

  it('round-trips every seeded report, in whatever mode it names', () => {
    for (const report of savedReportFixtures) {
      expect(roundTrip(report.query)).toEqual(normaliseReportQuery(report.query))
    }
  })
})

describe('4 — the alert route is a serialised query, in any mode', () => {
  it('routes a funnel the same way it routes a trend (§12.5)', () => {
    /* One function produces both the address bar and an alert notification's
       `route`. Both properties had to survive P7-T1 and this is the second. */
    const path = reportQueryPath(funnel)
    expect(path.startsWith(`/management/reports?${REPORT_QUERY_PARAM}=`)).toBe(true)
    const encoded = path.split('=')[1]!
    expect(deserialiseReportQuery(encoded)).toEqual(normaliseReportQuery(funnel))
  })

  it('returns null for a mangled link rather than throwing', () => {
    expect(deserialiseReportQuery('not-a-report')).toBeNull()
  })
})
