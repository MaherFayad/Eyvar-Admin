/**
 * 20 v1 URLs, AC-1101. `reports.ts` seeds only 10 real `ReportQuery`
 * literals; `V1-1`…`V1-10` copy those verbatim (cited by line), `V1-11`…
 * `V1-20` recombine individually-real field values (flagged in the WP-1.5
 * report as a seeded-set gap, not invented here). `encodeV1` replicates the
 * pre-WP-1.5 `serialiseReportQuery`, gone now that `serialise.ts` writes v2.
 */

import type { CohortSpecV1, FunnelSpecV1, ReportQueryInput } from '../types/report'

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** The exact v1 wire shape: no `v` key, `groupBy` a bare string, `fn.w` a day count, `co.r` a single key. */
function encodeV1(query: ReportQueryInput): string {
  const ordered: Record<string, unknown> = {
    m: query.measures.map((m) => m.key),
    g: query.groupBy,
    f: query.filters.map((f) => [f.field, f.op, f.value]),
    w: query.window,
    gr: query.grain,
    c: query.periodComparison,
    ct: query.chartType,
  }
  const mode = query.mode ?? 'trend'
  if (mode !== 'trend') ordered.mo = mode
  if (query.funnel) {
    const funnel = query.funnel as FunnelSpecV1
    ordered.fn = {
      s: funnel.steps.map((step) => [step.measureKey, step.filters.map((f) => [f.field, f.op, f.value])]),
      w: funnel.conversionWindowDays,
    }
  }
  if (query.cohort) {
    const cohort = query.cohort as CohortSpecV1
    ordered.co = {
      a: cohort.anchorMeasureKey,
      r: cohort.returnMeasureKey,
      g: cohort.cohortGrain,
      h: cohort.horizon,
    }
  }
  if (query.journey) {
    ordered.jo = { r: query.journey.rootMeasureKey, d: query.journey.depth }
  }
  return toBase64Url(JSON.stringify(ordered))
}

export interface V1UrlFixture {
  id: string
  method: 'captured' | 'recombined'
  /** File and line the query (or every field value, for a recombined case) is drawn from. */
  source: string
  v1Query: ReportQueryInput
  url: string
}

const captured: Array<Omit<V1UrlFixture, 'url' | 'method'>> = [
  {
    id: 'V1-1',
    source: 'reports.ts:68 captainsVsRiders (RPT-1)',
    v1Query: {
      measures: [{ key: 'captains.registered' }, { key: 'riders.registered' }],
      groupBy: null,
      filters: [],
      window: { kind: 'preset', preset: 'last-30d' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    },
  },
  {
    id: 'V1-2',
    source: 'reports.ts:78 tripsByDistrict (RPT-2)',
    v1Query: {
      measures: [{ key: 'trips.completed' }],
      groupBy: 'trip.pickup',
      filters: [],
      window: { kind: 'preset', preset: 'last-30d' },
      grain: 'week',
      periodComparison: 'none',
      chartType: 'line',
    },
  },
  {
    id: 'V1-3',
    source: 'reports.ts:88 revenueNinetyDays (RPT-3)',
    v1Query: {
      measures: [{ key: 'revenue.total' }],
      groupBy: null,
      filters: [],
      window: { kind: 'preset', preset: 'last-90d' },
      grain: 'day',
      periodComparison: 'previous-period',
      chartType: 'line',
    },
  },
  {
    id: 'V1-4',
    source: 'reports.ts:100 subscriptionsByPlan (RPT-4)',
    v1Query: {
      measures: [{ key: 'subscriptions.started' }],
      groupBy: 'subscription.plan',
      filters: [],
      window: { kind: 'preset', preset: 'last-30d' },
      grain: 'none',
      periodComparison: 'none',
      chartType: 'pie',
    },
  },
  {
    id: 'V1-5',
    source: 'reports.ts:112 cancellationTrend (RPT-5)',
    v1Query: {
      measures: [{ key: 'trips.cancellationRate' }],
      groupBy: null,
      filters: [],
      window: { kind: 'preset', preset: 'last-30d' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    },
  },
  {
    id: 'V1-6',
    source: 'reports.ts:148 riderActivationFunnel (RPT-6)',
    v1Query: {
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
        conversionWindowDays: null,
      } as FunnelSpecV1,
    },
  },
  {
    id: 'V1-7',
    source: 'reports.ts:181 riderRetentionCohort (RPT-7)',
    v1Query: {
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
      } as CohortSpecV1,
    },
  },
  {
    id: 'V1-8',
    source: 'reports.ts:204 riderJourney (RPT-8)',
    v1Query: {
      measures: [],
      groupBy: null,
      filters: [],
      window: { kind: 'preset', preset: 'last-90d' },
      grain: 'none',
      periodComparison: 'none',
      chartType: 'table',
      mode: 'journey',
      journey: { rootMeasureKey: 'riders.joined', depth: 2 },
    },
  },
  {
    id: 'V1-9',
    source: 'reports.ts:221 tripsByDistrictTable (RPT-9)',
    v1Query: {
      measures: [{ key: 'trips.completed' }],
      groupBy: 'trip.pickup',
      filters: [],
      window: { kind: 'preset', preset: 'last-30d' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'table',
      mode: 'table',
    },
  },
  {
    id: 'V1-10',
    source: 'reports.ts:246 oneRungFunnel (AC-825, unsaved)',
    v1Query: {
      measures: [],
      groupBy: null,
      filters: [],
      window: { kind: 'preset', preset: 'last-30d' },
      grain: 'none',
      periodComparison: 'none',
      chartType: 'bar',
      mode: 'funnel',
      funnel: { steps: [{ measureKey: 'riders.joined', filters: [] }], conversionWindowDays: null } as FunnelSpecV1,
    },
  },
]

/** Every field value here is drawn from `reports.ts`; the combination is not — see the file docblock. */
const recombined: Array<Omit<V1UrlFixture, 'url' | 'method'>> = [
  {
    id: 'V1-11',
    source: 'measure reports.ts:79, groupBy reports.ts:102, window/comparison reports.ts:94,96',
    v1Query: {
      measures: [{ key: 'trips.completed' }],
      groupBy: 'subscription.plan',
      filters: [],
      window: { kind: 'preset', preset: 'last-90d' },
      grain: 'week',
      periodComparison: 'previous-period',
      chartType: 'bar',
    },
  },
  {
    id: 'V1-12',
    source: 'measure reports.ts:89, filter reports.ts:164 (query-level here, not per-step)',
    v1Query: {
      measures: [{ key: 'revenue.total' }],
      groupBy: null,
      filters: [{ field: 'trip.kind', op: 'eq', value: 'quick' }],
      window: { kind: 'preset', preset: 'last-30d' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    },
  },
  {
    id: 'V1-13',
    source: 'measures reports.ts:69, groupBy reports.ts:80, window reports.ts:185',
    v1Query: {
      measures: [{ key: 'captains.registered' }, { key: 'riders.registered' }],
      groupBy: 'trip.pickup',
      filters: [],
      window: { kind: 'preset', preset: 'last-365d' },
      grain: 'week',
      periodComparison: 'none',
      chartType: 'bar',
    },
  },
  {
    id: 'V1-14',
    source: 'measure reports.ts:101, filter reports.ts:501 (dashboard filter, same file)',
    v1Query: {
      measures: [{ key: 'subscriptions.started' }],
      groupBy: null,
      filters: [{ field: 'subscription.status', op: 'eq', value: 'active' }],
      window: { kind: 'preset', preset: 'last-30d' },
      grain: 'none',
      periodComparison: 'none',
      chartType: 'pie',
    },
  },
  {
    id: 'V1-15',
    source: 'measure reports.ts:113, groupBy reports.ts:80, window/comparison reports.ts:94,96',
    v1Query: {
      measures: [{ key: 'trips.cancellationRate' }],
      groupBy: 'trip.pickup',
      filters: [],
      window: { kind: 'preset', preset: 'last-90d' },
      grain: 'day',
      periodComparison: 'previous-period',
      chartType: 'line',
    },
  },
  {
    id: 'V1-16',
    source: 'steps reports.ts:161,165 (subset), window reports.ts:152; window value 30 is real vocabulary (ReportGrain day count), not seeded on this funnel',
    v1Query: {
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
          { measureKey: 'subscriptions.started', filters: [] },
        ],
        conversionWindowDays: 30,
      } as FunnelSpecV1,
    },
  },
  {
    id: 'V1-17',
    source: 'anchor reports.ts:191, returnMeasureKey reports.ts:79 (trips.completed, set non-null here), grain/horizon reports.ts:198-199',
    v1Query: {
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
        returnMeasureKey: 'trips.completed',
        cohortGrain: 'month',
        horizon: 3,
      } as CohortSpecV1,
    },
  },
  {
    id: 'V1-18',
    source: 'root reports.ts:79 (trips.completed, a different root than riderJourney), depth reports.ts:213',
    v1Query: {
      measures: [],
      groupBy: null,
      filters: [],
      window: { kind: 'preset', preset: 'last-90d' },
      grain: 'none',
      periodComparison: 'none',
      chartType: 'table',
      mode: 'journey',
      journey: { rootMeasureKey: 'trips.completed', depth: 2 },
    },
  },
  {
    id: 'V1-19',
    source: 'measure/filter reports.ts:79,164; table mode reports.ts:229',
    v1Query: {
      measures: [{ key: 'trips.completed' }],
      groupBy: null,
      filters: [{ field: 'trip.kind', op: 'eq', value: 'quick' }],
      window: { kind: 'preset', preset: 'last-30d' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'table',
      mode: 'table',
    },
  },
  {
    id: 'V1-20',
    source: 'measure reports.ts:89, groupBy reports.ts:102, grain/chart reports.ts:107,109',
    v1Query: {
      measures: [{ key: 'revenue.total' }],
      groupBy: 'subscription.plan',
      filters: [],
      window: { kind: 'preset', preset: 'last-90d' },
      grain: 'none',
      periodComparison: 'none',
      chartType: 'pie',
    },
  },
]

export const v1UrlFixtures: V1UrlFixture[] = [
  ...captured.map((f) => ({ ...f, method: 'captured' as const, url: encodeV1(f.v1Query) })),
  ...recombined.map((f) => ({ ...f, method: 'recombined' as const, url: encodeV1(f.v1Query) })),
]
