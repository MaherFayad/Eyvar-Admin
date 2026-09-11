/**
 * **P7-T1 and WP-1.5's acceptance, as tests.** `serialiseReportQuery` is what
 * makes a report shareable, bookmarkable and alertable (§9.2, AC-853/854/855);
 * WP-1.5 (AC-1100–1102) adds `v: 2` and the v2 query-model fields without
 * breaking a byte a v1 link already carries. AC-1101's fixtures live in
 * `serialise.v1.fixtures.ts`; AC-1102 is proven in §6 below.
 */

import { describe, expect, it } from 'vitest'
import {
  REPORT_QUERY_PARAM,
  deserialiseReportQuery,
  reportQueryPath,
  serialiseReportQuery,
} from './serialise'
import { v1UrlFixtures } from './serialise.v1.fixtures'
import { normaliseReportQuery } from '../types/report'
import { savedReportFixtures } from '../fixtures/reports'
import type { ReportQuery } from '../types/report'

/* A trend query with nothing exotic in it. Every case below is this, varied. */
const trend: ReportQuery = {
  measures: [{ key: 'captains.registered' }, { key: 'riders.registered' }],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

const funnel: ReportQuery = {
  measures: [],
  groupBy: [],
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
    conversionWindow: { value: 14, unit: 'day' },
    mode: 'ordered',
    holdConstant: null,
    exclude: [],
    measuredAs: 'conversion',
    groupBy: null,
  },
}

const cohort: ReportQuery = {
  measures: [],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-365d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'table',
  mode: 'cohort',
  cohort: {
    anchorMeasureKey: 'riders.joined',
    returnMeasureKeys: [],
    cohortGrain: 'month',
    method: 'rolling',
    brackets: null,
    horizon: 3,
  },
}

const journey: ReportQuery = {
  measures: [],
  groupBy: [],
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

/** Builds a `q` value from an arbitrary JS value — for the hostile-input cases in §7. */
function encodeRaw(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
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
      roundTrip({
        ...trend,
        mode: 'funnel',
        funnel: {
          steps: [],
          conversionWindow: null,
          mode: 'ordered',
          holdConstant: null,
          exclude: [],
          measuredAs: 'conversion',
          groupBy: null,
        },
      })?.funnel,
    ).toEqual({
      steps: [],
      conversionWindow: null,
      mode: 'ordered',
      holdConstant: null,
      exclude: [],
      measuredAs: 'conversion',
      groupBy: null,
    })
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
      groupBy: [],
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

describe('3 — existing v1 links keep decoding to the query they always named', () => {
  /**
   * `RPT-1`'s query — *"number of drivers vs passengers trend"* — as the
   * seven-key v1 serialiser produced it, before `mode` existed. Pinned as a
   * string rather than recomputed, so this proves the current code against a
   * link that was actually issued rather than against itself.
   */
  const MODELESS_RPT1 =
    'eyJtIjpbImNhcHRhaW5zLnJlZ2lzdGVyZWQiLCJyaWRlcnMucmVnaXN0ZXJlZCJdLCJnIjpudWxsLCJmIjpbXSwidyI6eyJraW5kIjoicHJlc2V0IiwicHJlc2V0IjoibGFzdC0zMGQifSwiZ3IiOiJkYXkiLCJjIjoibm9uZSIsImN0IjoibGluZSJ9'

  /** A second legacy link, with the three things `RPT-1` does not exercise:
      an absolute window, a filter, and a period comparison. */
  const MODELESS_ABSOLUTE =
    'eyJtIjpbInRyaXBzLmNvbXBsZXRlZCJdLCJnIjoidHJpcC5waWNrdXAiLCJmIjpbWyJ0cmlwLmtpbmQiLCJlcSIsInF1aWNrIl1dLCJ3Ijp7ImtpbmQiOiJhYnNvbHV0ZSIsImZyb20iOiIyMDI2LTAxLTAxIiwidG8iOiIyMDI2LTAzLTMxIn0sImdyIjoid2VlayIsImMiOiJwcmV2aW91cy15ZWFyIiwiY3QiOiJiYXIifQ'

  it('parses a link written before `mode` existed, unchanged', () => {
    expect(deserialiseReportQuery(MODELESS_RPT1)).toEqual({
      measures: [{ key: 'captains.registered' }, { key: 'riders.registered' }],
      groupBy: [],
      filters: [],
      window: { kind: 'preset', preset: 'last-30d' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
      mode: 'trend',
    })
  })

  it('parses a legacy link carrying an absolute window, a filter and a comparison', () => {
    expect(deserialiseReportQuery(MODELESS_ABSOLUTE)).toEqual({
      measures: [{ key: 'trips.completed' }],
      groupBy: ['trip.pickup'],
      filters: [{ field: 'trip.kind', op: 'eq', value: 'quick' }],
      window: { kind: 'absolute', from: '2026-01-01', to: '2026-03-31' },
      grain: 'week',
      periodComparison: 'previous-year',
      chartType: 'bar',
      mode: 'trend',
    })
  })

  it('re-serialising a decoded v1 link upgrades the wire to v2, without changing what it means', () => {
    /* Before WP-1.5 this test pinned the OLD guarantee: decode → re-encode
       reproduces the identical bytes. `v: 2` is now written on every encode
       (§2.9), so that byte-for-byte property cannot survive — and is not
       meant to: an old link keeps DECODING to the report it always named
       forever (AC-1101), and only upgrades its own wire form the next time
       it is saved or re-shared, which is the point of versioning it at all. */
    for (const legacy of [MODELESS_RPT1, MODELESS_ABSOLUTE]) {
      const decoded = deserialiseReportQuery(legacy)!
      const reEncoded = serialiseReportQuery(decoded)
      expect(decode(reEncoded)).toContain('"v":2')
      expect(deserialiseReportQuery(reEncoded)).toEqual(decoded)
    }
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

describe('5 — AC-1101: every v1 URL decodes to exactly what v1 produced', () => {
  it.each(v1UrlFixtures)('$id ($method, $source) decodes to the v1 code’s own query', (fixture) => {
    expect(deserialiseReportQuery(fixture.url)).toEqual(normaliseReportQuery(fixture.v1Query))
  })
})

describe('6 — AC-1102: every v2 field round-trips, and a default query stays short', () => {
  it('a default query serialises to no key beyond the v1 set plus `v`', () => {
    const raw = JSON.parse(decode(serialiseReportQuery(trend))) as Record<string, unknown>
    expect(Object.keys(raw).sort()).toEqual(['c', 'ct', 'f', 'g', 'gr', 'm', 'v', 'w'])
  })

  it('round-trips a measure’s `aggregate`', () => {
    const q: ReportQuery = { ...trend, measures: [{ key: 'revenue.total', aggregate: 'sum' }] }
    expect(roundTrip(q)).toEqual(normaliseReportQuery(q))
  })

  it('round-trips a two-level `groupBy`', () => {
    const q: ReportQuery = { ...trend, groupBy: ['trip.pickup', 'subscription.plan'] }
    expect(roundTrip(q)).toEqual(normaliseReportQuery(q))
  })

  it('round-trips `formula`', () => {
    const q: ReportQuery = { ...trend, formula: { expression: 'A / B * 100', label: 'Conversion' } }
    expect(roundTrip(q)).toEqual(normaliseReportQuery(q))
  })

  it('round-trips `transform` and omits `tr` at its default', () => {
    const q: ReportQuery = {
      ...trend,
      transform: { cumulative: true, rollingAverage: 7, percentOfTotal: false },
    }
    expect(roundTrip(q)).toEqual(normaliseReportQuery(q))
    const atDefault: ReportQuery = {
      ...trend,
      transform: { cumulative: false, rollingAverage: null, percentOfTotal: false },
    }
    expect(decode(serialiseReportQuery(atDefault))).not.toContain('"tr"')
  })

  it('round-trips `segments`, saved and inline with `performed`', () => {
    const q: ReportQuery = {
      ...trend,
      segments: [
        { kind: 'saved', id: 'SEG-1' },
        {
          kind: 'inline',
          label: 'Power riders',
          filters: [{ field: 'rider.tier', op: 'eq', value: 'gold' }],
          performed: { measureKey: 'trips.completed', op: 'gte', count: 5, window: 'each-bucket' },
        },
        {
          kind: 'inline',
          label: 'Recent joiners',
          filters: [],
          performed: { measureKey: 'riders.joined', op: 'gte', count: 1, window: { rollingDays: 30 } },
        },
      ],
    }
    expect(roundTrip(q)).toEqual(normaliseReportQuery(q))
  })

  it('round-trips `comparisonDisplay` and omits `cd` at its default', () => {
    const q: ReportQuery = { ...trend, comparisonDisplay: 'difference' }
    expect(roundTrip(q)).toEqual(normaliseReportQuery(q))
    expect(decode(serialiseReportQuery({ ...trend, comparisonDisplay: 'series' }))).not.toContain('"cd"')
  })

  it('round-trips a `fixed` `periodComparison`', () => {
    const q: ReportQuery = {
      ...trend,
      periodComparison: { kind: 'fixed', from: '2026-01-01', to: '2026-01-30' },
    }
    expect(roundTrip(q)).toEqual(normaliseReportQuery(q))
  })

  it('round-trips grain `quarter`', () => {
    const q: ReportQuery = { ...trend, grain: 'quarter' }
    expect(roundTrip(q)).toEqual(normaliseReportQuery(q))
  })

  it('round-trips the funnel v2 fields — mode, holdConstant, exclude, measuredAs, groupBy', () => {
    const q: ReportQuery = {
      ...funnel,
      funnel: {
        ...funnel.funnel!,
        mode: 'unordered',
        holdConstant: 'trip.pickup',
        exclude: ['trips.cancellationRate'],
        measuredAs: 'time-to-convert',
        groupBy: 'trip.pickup',
      },
    }
    expect(roundTrip(q)).toEqual(normaliseReportQuery(q))
  })

  it('round-trips the cohort v2 fields — returnMeasureKeys, method, brackets', () => {
    const q: ReportQuery = {
      ...cohort,
      cohort: {
        ...cohort.cohort!,
        returnMeasureKeys: ['trips.completed', 'subscriptions.started'],
        method: 'bracket',
        brackets: [
          [0, 7],
          [7, 14],
        ],
      },
    }
    expect(roundTrip(q)).toEqual(normaliseReportQuery(q))
  })

  it('round-trips `table`', () => {
    const q: ReportQuery = {
      ...trend,
      chartType: 'table',
      mode: 'table',
      table: {
        columns: [
          { kind: 'measure', ref: { key: 'trips.completed' }, label: 'Trips' },
          { kind: 'formula', expression: 'A / B', label: 'Ratio' },
        ],
        rows: ['time', 'trip.pickup'],
        totals: true,
        format: [{ column: 0, bands: [{ lte: 10, tone: 'warning' }] }],
      },
    }
    expect(roundTrip(q)).toEqual(normaliseReportQuery(q))
  })

  it('round-trips a maximal query using every v2 key at once', () => {
    const q: ReportQuery = {
      measures: [
        { key: 'revenue.total', aggregate: 'sum' },
        { key: 'trips.completed' },
      ],
      groupBy: ['trip.pickup', 'subscription.plan'],
      filters: [{ field: 'trip.kind', op: 'eq', value: 'quick' }],
      window: { kind: 'preset', preset: 'last-90d' },
      grain: 'quarter',
      periodComparison: { kind: 'fixed', from: '2025-10-01', to: '2025-12-31' },
      comparisonDisplay: 'percent-change',
      chartType: 'table',
      formula: { expression: 'A / B * 100', label: 'Conversion' },
      transform: { cumulative: true, rollingAverage: 4, percentOfTotal: true },
      segments: [
        { kind: 'saved', id: 'SEG-1' },
        {
          kind: 'inline',
          label: 'Gold riders',
          filters: [],
          performed: { measureKey: 'trips.completed', op: 'gte', count: 3, window: { rollingDays: 14 } },
        },
      ],
      mode: 'table',
      table: {
        columns: [{ kind: 'measure', ref: { key: 'revenue.total', aggregate: 'sum' } }],
        rows: ['time'],
        totals: false,
        format: [],
      },
    }
    expect(roundTrip(q)).toEqual(normaliseReportQuery(q))
  })
})

describe('7 — a malformed `q` is a typed refusal, never a throw', () => {
  it('never throws, and returns `null`, for text that is not base64 at all', () => {
    expect(() => deserialiseReportQuery('not-a-report')).not.toThrow()
    expect(deserialiseReportQuery('not-a-report')).toBeNull()
  })

  it('never throws, and returns `null`, for a truncated `q`', () => {
    const truncated = serialiseReportQuery(trend).slice(0, 10)
    expect(() => deserialiseReportQuery(truncated)).not.toThrow()
    expect(deserialiseReportQuery(truncated)).toBeNull()
  })

  it('never throws, and returns `null`, for base64 that decodes to valid JSON of the wrong shape', () => {
    const wrongShapes = [
      encodeRaw({}),
      encodeRaw([1, 2, 3]),
      encodeRaw('a string'),
      encodeRaw(42),
      encodeRaw(null),
      encodeRaw({ m: 'not-an-array' }),
    ]
    for (const encoded of wrongShapes) {
      expect(() => deserialiseReportQuery(encoded)).not.toThrow()
      expect(deserialiseReportQuery(encoded)).toBeNull()
    }
  })
})
