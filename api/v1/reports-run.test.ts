/**
 * `reports.run` end-to-end (AC-1276, AC-1277, AC-1278): deep-compares the
 * mock's `resolveReport` against the real handler over shared fixtures and
 * a fixed clock. `sequential`/`holdConstant` assert a hand-checked value instead — no mock exists to compare against (F-V2-63).
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase, seedSession, seedUser } from '../_test/db'
import type { Database } from '../_lib/db'
import { createApiHandler } from './[...route]'
import { signSessionId } from '../_lib/auth'
import type { ApiErrorBody } from '../_lib/errors'
import type { RequestContext } from '../_lib/auth'
import { createRunReportHandler } from '../_lib/handlers/reportsRun'
import { DEFAULT_ROW_CAP, loadCatalogue } from '../_lib/compile'
import { resolveFunnel } from '../_lib/handlers/reportsFunnel'
import { measureFixtures, dimensionFixtures } from '@/data/fixtures/measures'
import { savedReportFixtures } from '@/data/fixtures/reports'
import { resolveReport, type ResolveContext } from '@/data/mock/resolveReport'
import { EYVAR_NOW, EYVAR_TODAY } from '@/data/mock/clock'
import { resolveWindow } from '@/data/reporting/buckets'
import { normaliseReportQuery, type RecordRunOutcome, type ReportQuery, type ReportResult } from '@/data/types/report'
import type { Measure } from '@/data/types/measure'
import type { PermissionKey } from '@/data/types/navigation'
import type { Catalogue } from '@/data/reporting/plan'

const SESSION_SECRET = 'wp-6.4-test-secret'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXAMPLES_DIR = path.resolve(__dirname, '../../docs/09-analytics-v2/examples')

const OPS_MANAGER_PERMISSIONS: PermissionKey[] = [
  'view_analytics', 'view_operations', 'view_finance', 'view_support', 'view_admin',
  'view_profiles', 'approve_drivers', 'manage_subscriptions', 'live_ops', 'manage_plans',
  'manage_tickets', 'contact_users', 'manage_ops_policy',
]

const TRUST_AND_SAFETY_PERMISSIONS: PermissionKey[] = [
  'view_analytics', 'view_operations', 'view_support', 'view_profiles',
  'approve_drivers', 'manage_tickets', 'contact_users',
]

const CATALOGUE: Catalogue = { measures: measureFixtures, dimensions: dimensionFixtures }

let pglite: PGlite
let db: Database
let handler: (req: Request) => Promise<Response>
let analystCookie: string
let restrictedCookie: string

async function seedAll(): Promise<void> {
  const files = [
    'measures.seed.sql',
    'dimensions.seed.sql',
    'drivers.seed.sql',
    'riders.seed.sql',
    'subscriptions.seed.sql',
    'trips.seed.sql',
    'dailySnapshots.seed.sql',
    'requests.seed.sql',
    'segments.seed.sql',
  ]
  for (const file of files) {
    const sql = await readFile(path.join(EXAMPLES_DIR, file), 'utf8')
    await pglite.exec(sql)
  }
}

beforeAll(() => {
  process.env.SESSION_SECRET = SESSION_SECRET
})

beforeEach(async () => {
  const setup = await createTestDatabase()
  pglite = setup.pglite
  db = setup.db
  await seedAll()
  handler = createApiHandler({ db, reportsClock: { today: () => EYVAR_TODAY, now: () => EYVAR_NOW } })

  const analyst = await seedUser(db, { email: 'analyst@eyvar.test', password: 'pw-correct', roleId: 'Ops Manager' })
  const analystSession = await seedSession(db, { userId: analyst.id })
  analystCookie = `eyvar_session=${encodeURIComponent(signSessionId(analystSession, SESSION_SECRET))}`

  const restricted = await seedUser(db, { email: 'safety@eyvar.test', password: 'pw-correct', roleId: 'Trust & Safety' })
  const restrictedSession = await seedSession(db, { userId: restricted.id })
  restrictedCookie = `eyvar_session=${encodeURIComponent(signSessionId(restrictedSession, SESSION_SECRET))}`
})

afterEach(async () => {
  await pglite.close()
})

function run(query: unknown, cookie: string): Request {
  return new Request('http://localhost/api/v1/reports/run', {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify(query),
  })
}

/** Nothing excluded: every saved report, including `RPT-6`/`RPT-7`/`RPT-8` (funnel/cohort/journey), equality-tests the same way. */
const allSavedReports = savedReportFixtures

describe('reports.run (AC-1276): server equals the mock, bucket for bucket', () => {
  for (const report of allSavedReports) {
    it(`${report.id} — ${report.name}`, async () => {
      const mockCtx: ResolveContext = { permissions: OPS_MANAGER_PERMISSIONS, today: EYVAR_TODAY }
      const expected = resolveReport(report.query, CATALOGUE, mockCtx)

      const response = await handler(run(report.query, analystCookie))
      expect(response.status).toBe(200)
      const actual = (await response.json()) as ReportResult

      // `asOf` is a real timestamp on the server and the fixed clock on the
      // mock; both are pinned to `EYVAR_NOW` by `reportsClock`, so they must
      // agree exactly — proven once here rather than per-field below.
      expect(actual.asOf).toBe(expected.asOf)
      expect(actual).toEqual(expected)
    })
  }
})

/**
 * Neither `financials.arpa` nor `requests.timeToAssign` is named by a
 * seeded saved report, so the loop above never runs them through the
 * equality check (F-V2-95) — these ad-hoc queries close that AC-1276 gap.
 */
describe('reports.run (AC-1276): the two 2026-09-16 wrong-number fixes, ad hoc', () => {
  it('financials.arpa — same-row ratio, mock and server agree bucket for bucket', async () => {
    const query: ReportQuery = {
      measures: [{ key: 'financials.arpa' }],
      groupBy: [],
      filters: [],
      window: { kind: 'absolute', from: '2026-05-27', to: '2026-06-24' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    }
    const mockCtx: ResolveContext = { permissions: OPS_MANAGER_PERMISSIONS, today: EYVAR_TODAY }
    const expected = resolveReport(query, CATALOGUE, mockCtx)
    const response = await handler(run(query, analystCookie))
    expect(response.status).toBe(200)
    const actual = (await response.json()) as ReportResult
    expect(actual).toEqual(expected)
    // Not the constant `revenue.subscription` series any more (F5).
    const points = actual.series.find((s) => s.role === 'current')!.points
    expect(new Set(points)).not.toEqual(new Set([10917, 10788, 11410]))
  })

  it('requests.timeToAssign — real requestedAt/assignedAt minutes, mock and server agree bucket for bucket', async () => {
    const query: ReportQuery = {
      measures: [{ key: 'requests.timeToAssign' }],
      groupBy: [],
      filters: [],
      window: { kind: 'absolute', from: '2026-06-20', to: '2026-06-24' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    }
    const mockCtx: ResolveContext = { permissions: OPS_MANAGER_PERMISSIONS, today: EYVAR_TODAY }
    const expected = resolveReport(query, CATALOGUE, mockCtx)
    const response = await handler(run(query, analystCookie))
    expect(response.status).toBe(200)
    const actual = (await response.json()) as ReportResult
    expect(actual).toEqual(expected)
    // Not the constant placeholder `1` on every bucket any more (H4).
    const points = actual.series.find((s) => s.role === 'current')!.points
    expect(points.some((p) => p !== null && p !== 1)).toBe(true)
  })
})

describe('reports.run: the non-negotiables', () => {
  it('a bucket with no rows at all is null, never 0 — revenue.total outside the snapshot store’s 30-day coverage (RPT-3)', async () => {
    const rpt3 = savedReportFixtures.find((r) => r.id === 'RPT-3')!
    const response = await handler(run(rpt3.query, analystCookie))
    const result = (await response.json()) as ReportResult
    const series = result.series.find((s) => s.role === 'current')!
    expect(series.points.some((p) => p === null)).toBe(true)
    expect(result.warnings).toContain('gaps-outside-fixture-range')
  })

  it('money is integer halalas — never a float, never rounded in SQL (revenue.total, RPT-3)', async () => {
    const rpt3 = savedReportFixtures.find((r) => r.id === 'RPT-3')!
    const response = await handler(run(rpt3.query, analystCookie))
    const result = (await response.json()) as ReportResult
    const series = result.series.find((s) => s.role === 'current')!
    for (const point of series.points) {
      if (point !== null) expect(Number.isInteger(point)).toBe(true)
    }
  })

  it('a partial bucket is marked, and excluded from the comparison delta — subscriptions.started, percent-change (RPT-13)', async () => {
    // `DEFAULT_COMPARISON_DISPLAY` is `'series'`, which shows the raw prior
    // value at a partial index rather than nulling it — only `'difference'`/
    // `'percent-change'` null the partial bucket (`transforms.ts`'s
    // `percentChange`). RPT-13 is the one seeded report that sets
    // `comparisonDisplay: 'percent-change'`.
    const rpt13 = savedReportFixtures.find((r) => r.id === 'RPT-13')
    expect(rpt13).toBeTruthy()
    const response = await handler(run(rpt13!.query, analystCookie))
    const result = (await response.json()) as ReportResult
    const current = result.series.find((s) => s.role === 'current')!
    const comparison = result.series.find((s) => s.role === 'comparison')!
    expect(current.partialBucketIndexes.length).toBeGreaterThan(0)
    for (const i of current.partialBucketIndexes) {
      expect(comparison.points[i]).toBeNull()
    }
  })

  it('AC-1278: a measure the operator may not see returns blocked with no points, resolved against the requesting session', async () => {
    const rpt3 = savedReportFixtures.find((r) => r.id === 'RPT-3')!
    const mockCtx: ResolveContext = { permissions: TRUST_AND_SAFETY_PERMISSIONS, today: EYVAR_TODAY }
    const expected = resolveReport(rpt3.query, CATALOGUE, mockCtx)

    const response = await handler(run(rpt3.query, restrictedCookie))
    const actual = (await response.json()) as ReportResult

    expect(actual).toEqual(expected)
    const series = actual.series.find((s) => s.role === 'current')!
    expect(series.blocked).toBe('view_finance')
    expect(series.points).toEqual([])
  })

  it('AC-1277: a leg over the row cap returns truncated: true with truncatedAtRows', async () => {
    const smallCapHandler = createRunReportHandler(db, {
      today: () => EYVAR_TODAY,
      now: () => EYVAR_NOW,
      rowCap: 5,
    })
    const rpt2 = savedReportFixtures.find((r) => r.id === 'RPT-2')!
    const ctx: RequestContext = {
      operator: { userId: 'usr_test', role: 'Ops Manager', permissions: OPS_MANAGER_PERMISSIONS, sessionId: 'sess_test' },
      requestId: 'req_test',
    }
    const response = await smallCapHandler(run(rpt2.query, ''), { ...ctx, params: {} })
    expect(response.status).toBe(200)
    const result = (await response.json()) as ReportResult
    expect(result.truncated).toBe(true)
    expect(result.truncatedAtRows).toBe(5)
  })

  it('AC-1277: a leg that fails is reported per series, the rest of the result intact', async () => {
    // A measure whose population `measure_sources` cannot read at all
    // (R5-15's server-side belt in `compile.ts`'s `fetchMeasureRows`) —
    // constructed by removing the row after seeding, so the failure is
    // genuinely reached and not merely asserted.
    const query = {
      measures: [{ key: 'captains.registered' }, { key: 'riders.registered' }],
      groupBy: [],
      filters: [],
      window: { kind: 'preset' as const, preset: 'last-30d' as const },
      grain: 'day' as const,
      periodComparison: 'none' as const,
      chartType: 'line' as const,
    }
    await pglite.exec(`DELETE FROM measure_sources WHERE resource = 'drivers'`)

    const response = await handler(run(query, analystCookie))
    expect(response.status).toBe(200)
    const result = (await response.json()) as ReportResult
    const failedSeries = result.series.find((s) => s.measureKey === 'captains.registered')!
    const okSeries = result.series.find((s) => s.measureKey === 'riders.registered')!
    expect(failedSeries.failed).toEqual({ code: 'series_failed', retryable: true })
    expect(failedSeries.points).toEqual([])
    expect(okSeries.failed).toBeNull()
    expect(okSeries.points.length).toBeGreaterThan(0)
  })
})

describe('reports.run: auth and legality', () => {
  it('401s an unauthenticated request', async () => {
    const response = await handler(run(savedReportFixtures[0]!.query, ''))
    expect(response.status).toBe(401)
    const body = (await response.json()) as ApiErrorBody
    expect(body.retryable).toBe(false)
  })

  it('422s an illegal query rather than resolving it', async () => {
    const illegal = {
      measures: [{ key: 'captains.registered' }, { key: 'revenue.total' }], // mixed temporality
      groupBy: [],
      filters: [],
      window: { kind: 'preset' as const, preset: 'last-30d' as const },
      grain: 'day' as const,
      periodComparison: 'none' as const,
      chartType: 'line' as const,
    }
    const response = await handler(run(illegal, analystCookie))
    expect(response.status).toBe(422)
  })

  it('persists the run to report_runs with a real id', async () => {
    const rpt1 = savedReportFixtures.find((r) => r.id === 'RPT-1')!
    await handler(run(rpt1.query, analystCookie))
    const rows = await db.sql<{ id: string; user_id: string }>`SELECT id, user_id FROM report_runs`
    expect(rows.length).toBe(1)
    expect(rows[0]!.id).toMatch(/^run_/)
  })
})

/**
 * `sequential`/`holdConstant` (F-V2-63) have no mock to equality-test
 * against, so these seed isolated fixture rows and hand-trace expected
 * numbers, calling `resolveFunnel` directly — the planner refuses both without `funnelCapabilities`, which cannot be seeded without breaking AC-1275, so it is patched onto an in-memory catalogue copy instead.
 */
/**
 * F-V2-90: proves the header's behaviour for real, not by shape alone —
 * the id it hands back names a row `report_runs` actually holds, and T5's
 * "always records" rule (§5) means a second call never reuses one. A
 * shape-only check cannot catch the server silently answering a bare `ReportResult`. */
describe('reports.run: X-Eyvar-Record-Run header (F-V2-90)', () => {
  function recordRunRequest(query: unknown, cookie: string): Request {
    return new Request('http://localhost/api/v1/reports/run', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json', 'x-eyvar-record-run': '1' },
      body: JSON.stringify(query),
    })
  }

  it('the runId names a real report_runs row, and a second call mints a different one', async () => {
    const rpt1 = savedReportFixtures.find((r) => r.id === 'RPT-1')!

    const first = await handler(recordRunRequest(rpt1.query, analystCookie))
    expect(first.status).toBe(200)
    const firstOutcome = (await first.json()) as RecordRunOutcome
    expect(firstOutcome.status).toBe('ok')
    if (firstOutcome.status !== 'ok') throw new Error('unreachable')

    const firstRow = await db.sql<{ id: string }>`SELECT id FROM report_runs WHERE id = ${firstOutcome.runId}`
    expect(firstRow.length).toBe(1)

    const second = await handler(recordRunRequest(rpt1.query, analystCookie))
    const secondOutcome = (await second.json()) as RecordRunOutcome
    expect(secondOutcome.status).toBe('ok')
    if (secondOutcome.status !== 'ok') throw new Error('unreachable')

    expect(secondOutcome.runId).not.toBe(firstOutcome.runId)
    const secondRow = await db.sql<{ id: string }>`SELECT id FROM report_runs WHERE id = ${secondOutcome.runId}`
    expect(secondRow.length).toBe(1)
    const allRows = await db.sql<{ id: string }>`SELECT id FROM report_runs`
    expect(allRows.length).toBe(2)
  })

  it('the summary is real arithmetic over the returned series, partial buckets excluded (RPT-13)', async () => {
    const rpt13 = savedReportFixtures.find((r) => r.id === 'RPT-13')!
    const response = await handler(recordRunRequest(rpt13.query, analystCookie))
    const outcome = (await response.json()) as RecordRunOutcome
    expect(outcome.status).toBe('ok')
    if (outcome.status !== 'ok') throw new Error('unreachable')

    const current = outcome.result.series.find((s) => s.role === 'current')!
    expect(current.partialBucketIndexes.length).toBeGreaterThan(0)
    const usableValues = current.points
      .map((value, i) => ({ value, partial: current.partialBucketIndexes.includes(i) }))
      .filter((p): p is { value: number; partial: boolean } => !p.partial && p.value !== null)
      .map((p) => p.value)

    const summary = outcome.summary[current.id]!
    expect(summary.total).toBe(usableValues.reduce((a, b) => a + b, 0))
    expect(summary.partialExcluded).toBe(true)
  })

  it('without the header, reports.run answers the bare ReportResult it always has', async () => {
    const rpt1 = savedReportFixtures.find((r) => r.id === 'RPT-1')!
    const response = await handler(run(rpt1.query, analystCookie))
    const body = (await response.json()) as Record<string, unknown>
    expect(body.series).toBeDefined()
    expect(body.result).toBeUndefined()
    expect(body.runId).toBeUndefined()
  })
})

describe('reports.run: funnel server-only options (WP-6.4c)', () => {
  /** Loads the real catalogue, patches `funnelCapabilities` onto specific measures in memory only, and calls `resolveFunnel` directly — never through `planQuery`. */
  async function resolveFunnelDirect(
    query: ReportQuery,
    capabilities: Record<string, { sequential?: boolean; holdConstant?: boolean; exclude?: boolean }>,
  ) {
    const catalogue = await loadCatalogue(db)
    const byKey = new Map<string, Measure>(
      catalogue.measures.map((m) => {
        const extra = capabilities[m.key]
        if (!extra) return [m.key, m]
        return [
          m.key,
          {
            ...m,
            funnelCapabilities: {
              sequential: false,
              holdConstant: false,
              exclude: false,
              ...m.funnelCapabilities,
              ...extra,
            },
          },
        ]
      }),
    )
    const dimByKey = new Map(catalogue.dimensions.map((d) => [d.key, d]))
    const q = normaliseReportQuery(query)
    const window = resolveWindow(query.window, EYVAR_TODAY)
    return resolveFunnel(
      db,
      query,
      q,
      window,
      { permissions: OPS_MANAGER_PERMISSIONS, today: EYVAR_TODAY, asOf: EYVAR_NOW, rowCap: DEFAULT_ROW_CAP },
      byKey,
      dimByKey,
    )
  }

  it(
    'sequential: an interleaving trip between the matched trip and the matched subscription drops that rider, ' +
      'ordered would have kept — RDR-TEST-SEQ-A joins 06-01, trips (done) 06-05, subscribes 06-10: no other rung ' +
      'event falls strictly between 06-05 and 06-10, so all 3 rungs count it. RDR-TEST-SEQ-B joins 06-01, trips ' +
      '06-05 AND AGAIN 06-07, subscribes 06-10: rung 2 (trips) still matches at 06-07 is not in play — the FIRST ' +
      'trip (06-05) is what matches rung 2 either way — but rung 3 sees its OWN second trip (06-07) sitting ' +
      'strictly between rung 2\'s matched date (06-05) and the subscription (06-10), so sequential drops it: ' +
      'expected rung counts [2, 2, 1], not [2, 2, 2]',
    async () => {
      await pglite.exec(`
        INSERT INTO fixture_riders (id, "joinedAt", "rider.city", "rider.status") VALUES
          ('RDR-TEST-SEQ-A', '2026-06-01', 'TestSeqCity', 'on-demand'),
          ('RDR-TEST-SEQ-B', '2026-06-01', 'TestSeqCity', 'on-demand');
        INSERT INTO fixture_trips (id, "riderId", "endedAt", "trip.kind", "trip.status", "trip.pickup", "fareHalalas") VALUES
          ('TRP-TEST-SEQ-A1', 'RDR-TEST-SEQ-A', '2026-06-05T10:00:00+03:00', 'Quick Ride', 'done', 'TestDistrict', 1000),
          ('TRP-TEST-SEQ-B1', 'RDR-TEST-SEQ-B', '2026-06-05T10:00:00+03:00', 'Quick Ride', 'done', 'TestDistrict', 1000),
          ('TRP-TEST-SEQ-B2', 'RDR-TEST-SEQ-B', '2026-06-07T10:00:00+03:00', 'Quick Ride', 'done', 'TestDistrict', 1000);
        INSERT INTO fixture_subscriptions (id, "riderId", "startedOn", "endsOn", "subscription.plan", "subscription.vehicleClass", "subscription.status", "paidHalalas") VALUES
          ('SUB-TEST-SEQ-A', 'RDR-TEST-SEQ-A', '2026-06-10', '2026-12-31', 'basic', 'economy', 'active', 9900),
          ('SUB-TEST-SEQ-B', 'RDR-TEST-SEQ-B', '2026-06-10', '2026-12-31', 'basic', 'economy', 'active', 9900);
      `)

      const query = {
        measures: [],
        groupBy: [],
        filters: [],
        window: { kind: 'preset' as const, preset: 'last-30d' as const },
        grain: 'none' as const,
        periodComparison: 'none' as const,
        chartType: 'bar' as const,
        mode: 'funnel' as const,
        funnel: {
          steps: [
            { measureKey: 'riders.joined', filters: [{ field: 'rider.city', op: 'eq' as const, value: 'TestSeqCity' }] },
            { measureKey: 'trips.completed', filters: [] },
            { measureKey: 'subscriptions.started', filters: [] },
          ],
          conversionWindow: null,
          mode: 'sequential' as const,
          holdConstant: null,
          exclude: [],
          measuredAs: 'conversion' as const,
          groupBy: null,
        },
      }

      const result: ReportResult = await resolveFunnelDirect(query, {
        'riders.joined': { sequential: true },
        'trips.completed': { sequential: true },
        'subscriptions.started': { sequential: true },
      })
      const points = result.series.map((s) => s.points[0])
      expect(points).toEqual([2, 2, 1])
      expect(result.warnings).not.toContain('funnel-counted-not-followed')
    },
  )

  it(
    'holdConstant on trip.pickup: RDR-TEST-HC-A\'s second trip (kind Subscription, so the entry trip itself — ' +
      'kind Quick Ride — cannot satisfy rung 2\'s own filter and self-match) repeats the entry pickup ' +
      '(TestHcEntryDistrict) and is kept; RDR-TEST-HC-B\'s second trip is at a different pickup ' +
      '(TestHcOtherDistrict) and is dropped — expected rung counts [2, 1], not [2, 2]',
    async () => {
      await pglite.exec(`
        INSERT INTO fixture_trips (id, "riderId", "endedAt", "trip.kind", "trip.status", "trip.pickup", "fareHalalas") VALUES
          ('TRP-TEST-HC-A1', 'RDR-TEST-HC-A', '2026-06-05T10:00:00+03:00', 'Quick Ride', 'done', 'TestHcEntryDistrict', 1000),
          ('TRP-TEST-HC-B1', 'RDR-TEST-HC-B', '2026-06-05T10:00:00+03:00', 'Quick Ride', 'done', 'TestHcEntryDistrict', 1000),
          ('TRP-TEST-HC-A2', 'RDR-TEST-HC-A', '2026-06-10T10:00:00+03:00', 'Subscription', 'done', 'TestHcEntryDistrict', 1000),
          ('TRP-TEST-HC-B2', 'RDR-TEST-HC-B', '2026-06-10T10:00:00+03:00', 'Subscription', 'done', 'TestHcOtherDistrict', 1000);
      `)

      const query = {
        measures: [],
        groupBy: [],
        filters: [],
        window: { kind: 'preset' as const, preset: 'last-30d' as const },
        grain: 'none' as const,
        periodComparison: 'none' as const,
        chartType: 'bar' as const,
        mode: 'funnel' as const,
        funnel: {
          steps: [
            { measureKey: 'trips.completed', filters: [{ field: 'trip.pickup', op: 'eq' as const, value: 'TestHcEntryDistrict' }] },
            { measureKey: 'trips.completed', filters: [{ field: 'trip.kind', op: 'eq' as const, value: 'Subscription' }] },
          ],
          conversionWindow: null,
          mode: 'ordered' as const,
          holdConstant: 'trip.pickup',
          exclude: [],
          measuredAs: 'conversion' as const,
          groupBy: null,
        },
      }

      const result: ReportResult = await resolveFunnelDirect(query, {
        'trips.completed': { holdConstant: true },
      })
      const points = result.series.map((s) => s.points[0])
      expect(points).toEqual([2, 1])
      expect(result.warnings).not.toContain('funnel-counted-not-followed')
    },
  )
})
