/**
 * The seam's own tests. Four properties, and if any one of them fails the seam
 * has stopped being a seam:
 *
 *   1. Every client returns a Promise. A synchronous mock hides the loading
 *      state, and a loading state that never renders never gets built.
 *   2. Every client's failure is injectable. QA cannot reach the error state
 *      otherwise, and an unreachable state is an unbuilt state.
 *   3. Nothing is random or clock-dependent. Two calls return identical data,
 *      or visual regression cannot diff it.
 *   4. **No component imports a fixture.** Enforced by walking `src/`.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'

import { disableMockLatency, mockFailures } from '../config'
import { isApiError } from '../types/common'
import { listApplicants } from './applicants'
import { listAbsences, listAssuranceTrips, resetAssurance, useAbsenceHistory } from './assurance'
import { listCorporateAccounts } from './corporateAccounts'
import { listFairnessCases } from './fairness'
import { getMetricBoard, getMetricSeries, listMetrics } from './metrics'
import { listWorkItems } from './myWork'
import { listRequests } from './requests'
import { listSafetyIncidents, resetSafetyIncidents, useQuietSafetyQueue } from './safety'
import { listDriverCompliance, listDrivers } from './drivers'
import { getNavCounts, resetNavCounts, useEmptyNavCounts } from './navCounts'
import { getNotificationSummary, listNotifications, resetNotifications } from './notifications'
import { resolveProfile, search } from './profile'
import {
  getRiderMoneyMovements,
  getRiderSupportPresence,
  getRiderTimeline,
  listNewRiders,
  listRiders,
} from './riders'
import { getPreferences, getSession, listTeamUsers, resetMockSession, switchMockUser } from './session'
import { listSubscriptions } from './subscriptions'
import { listTrips } from './trips'

/** Every read the shell and wave 1 make, with the operation id that fails it. */
const CLIENTS: Array<{ op: string; call: () => Promise<unknown> }> = [
  { op: 'session.current', call: () => getSession() },
  { op: 'session.teamUsers', call: () => listTeamUsers() },
  { op: 'session.preferences', call: () => getPreferences() },
  { op: 'navCounts.list', call: () => getNavCounts() },
  { op: 'notifications.list', call: () => listNotifications() },
  { op: 'notifications.summary', call: () => getNotificationSummary() },
  { op: 'profile.resolve', call: () => resolveProfile('RDR-1041') },
  { op: 'search.query', call: () => search('Nora') },
  { op: 'drivers.list', call: () => listDrivers() },
  { op: 'compliance.list', call: () => listDriverCompliance() },
  { op: 'riders.list', call: () => listRiders() },
  { op: 'riders.listNew', call: () => listNewRiders() },
  /* The 360 profile's three rider-scoped reads. Listed here and not only in
     `riders.test.ts` because properties 1-3 are the seam's, not the
     resource's: every client must be async, must be failable and must be
     deterministic, and a client that is absent from this list is a client
     nobody checked. */
  { op: 'riders.timeline', call: () => getRiderTimeline('RDR-4002') },
  { op: 'riders.movements', call: () => getRiderMoneyMovements('RDR-4002') },
  { op: 'riders.support', call: () => getRiderSupportPresence('RDR-4002') },
  { op: 'applicants.list', call: () => listApplicants() },
  { op: 'trips.list', call: () => listTrips() },
  { op: 'subscriptions.list', call: () => listSubscriptions() },
  { op: 'corporate.list', call: () => listCorporateAccounts() },

  /* wave 2 — the work queues */
  { op: 'requests.list', call: () => listRequests() },
  { op: 'safety.list', call: () => listSafetyIncidents() },
  { op: 'fairness.list', call: () => listFairnessCases() },
  { op: 'assurance.list', call: () => listAssuranceTrips() },
  { op: 'assurance.absences', call: () => listAbsences() },
  { op: 'work.list', call: () => listWorkItems() },

  /* wave 4 — metric tiles and chart cards */
  { op: 'metrics.list', call: () => listMetrics() },
  { op: 'metrics.board', call: () => getMetricBoard('management-overview') },
  { op: 'metrics.series', call: () => getMetricSeries('management.overview.quickRideRevenue') },
]

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
  resetMockSession()
  resetNavCounts()
  resetNotifications()
  resetSafetyIncidents()
  resetAssurance()
})

describe('1 — async always', () => {
  it.each(CLIENTS)('$op returns a Promise', async ({ call }) => {
    const result = call()
    expect(result).toBeInstanceOf(Promise)
    await expect(result).resolves.toBeDefined()
  })
})

describe('2 — failure is injectable per client', () => {
  it.each(CLIENTS)('$op can be made to fail', async ({ op, call }) => {
    mockFailures.always(op)
    await expect(call()).rejects.toSatisfy(isApiError)
    mockFailures.clear(op)
    await expect(call()).resolves.toBeDefined()
  })

  it('failOnce fails exactly once, so retry can be tested', async () => {
    mockFailures.once('drivers.list')
    await expect(listDrivers()).rejects.toSatisfy(isApiError)
    await expect(listDrivers()).resolves.toBeDefined()
  })

  it('seeds failures from ?mockFail=', async () => {
    const { seedMockFailuresFromLocation } = await import('../config')
    expect(seedMockFailuresFromLocation('?mockFail=drivers.list,trips.list')).toEqual([
      'drivers.list',
      'trips.list',
    ])
    await expect(listDrivers()).rejects.toSatisfy(isApiError)
    await expect(listTrips()).rejects.toSatisfy(isApiError)
  })

  it('throws ApiError and nothing else, with a machine-readable kind', async () => {
    mockFailures.always('drivers.list')
    await listDrivers().catch((e) => {
      expect(isApiError(e)).toBe(true)
      expect(e.kind).toBe('server')
      expect(e.retryable).toBe(true)
      expect(e.status).toBe(503)
    })
  })

  it('surfaces not-found as a 404 naming the id that was searched', async () => {
    await resolveProfile('RDR-DOES-NOT-EXIST').catch((e) => {
      expect(e.status).toBe(404)
      expect(e.message).toContain('RDR-DOES-NOT-EXIST')
      expect(e.retryable).toBe(false)
    })
  })
})

describe('3 — deterministic', () => {
  it.each(CLIENTS)('$op returns identical data on two calls', async ({ call }) => {
    expect(await call()).toStrictEqual(await call())
  })

  it('has no Math.random or Date.now in src/data code', () => {
    const offenders: string[] = []
    for (const file of walk(dataDir())) {
      if (file.endsWith('.test.ts')) continue
      // Comments are stripped first: several files *document* why these two are
      // forbidden, and a check that fails on its own rationale is useless.
      const source = stripComments(readFileSync(file, 'utf8'))
      if (/Math\.random\s*\(/.test(source)) offenders.push(`${rel(file)}: Math.random()`)
      // The host clock is read in exactly one place — `systemClock`.
      if (/Date\.now\s*\(/.test(source) && !file.endsWith(`mock${sep}clock.ts`)) {
        offenders.push(`${rel(file)}: Date.now()`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('pins relative times to the fixed clock, not the host clock', async () => {
    const session = await getSession()
    expect(session.issuedAt).toBe('2026-06-25T09:14:00+03:00')
    const counts = await getNavCounts()
    expect(counts.computedAt).toBe('2026-06-25T09:14:00+03:00')
  })
})

describe('4 — no component imports a fixture', () => {
  it('keeps every fixture import inside src/data', () => {
    const offenders: string[] = []
    for (const file of walk(srcDir())) {
      if (file.startsWith(dataDir())) continue
      const source = readFileSync(file, 'utf8')
      const matches = source.match(/from\s+['"][^'"]*data\/fixtures\/[^'"]*['"]/g)
      if (matches) offenders.push(`${rel(file)}: ${matches.join(', ')}`)
    }
    expect(offenders, 'a component importing a fixture means the seam has failed').toEqual([])
  })

  it('keeps every mock-internal import inside src/data', () => {
    const offenders: string[] = []
    for (const file of walk(srcDir())) {
      if (file.startsWith(dataDir())) continue
      const source = readFileSync(file, 'utf8')
      const matches = source.match(/from\s+['"][^'"]*data\/mock\/(?!clock)[^'"]*['"]/g)
      if (matches) offenders.push(`${rel(file)}: ${matches.join(', ')}`)
    }
    expect(offenders).toEqual([])
  })
})

describe('the states QA has to be able to reach without editing a fixture', () => {
  it('reaches an all-empty nav', async () => {
    useEmptyNavCounts()
    const counts = await getNavCounts()
    expect(counts.subTabs.every((c) => c.count === null || c.count === 0)).toBe(true)
  })

  it('distinguishes "no backlog concept" (null) from "empty backlog" (0)', async () => {
    const counts = await getNavCounts()
    expect(counts.subTabs.some((c) => c.count === null)).toBe(true)
    expect(counts.subTabs.some((c) => c.count === 0)).toBe(true)
  })

  it('reaches every role landing route for AC-07', async () => {
    const expected: Record<string, string> = {
      'USR-1': '/management/overview',
      'USR-5': '/operations/overview',
      'USR-2': '/financials/overview',
      'USR-3': '/support/overview',
    }
    for (const [userId, route] of Object.entries(expected)) {
      const session = await switchMockUser(userId)
      expect(session.landingRoute, userId).toBe(route)
    }
  })

  it('carries a record claimed by another operator', async () => {
    const page = await listApplicants({ pageSize: 100 })
    const held = page.items.filter((a) => a.claim?.state === 'claimed' && a.claim.ownerId !== 'USR-1')
    expect(held.length).toBeGreaterThan(0)
  })

  it('carries a claim held by another operator on every wave-2 queue', async () => {
    /* One per queue, so the take-over affordance can be designed once and
       verified everywhere rather than on whichever screen was built first. */
    const heldByOther = <T extends { id: string; claim: { state: string; ownerId: string } | null }>(
      rows: readonly T[],
    ) => rows.filter((r) => r.claim?.state === 'claimed' && r.claim.ownerId !== 'USR-1')

    expect(heldByOther((await listRequests({ pageSize: 500 })).items).map((r) => r.id)).toContain(
      'REQ-503',
    )
    expect(heldByOther((await listSafetyIncidents({ pageSize: 100 })).items).map((i) => i.id)).toContain(
      'INC-016',
    )
    expect(heldByOther((await listFairnessCases({ pageSize: 100 })).items).map((c) => c.id)).toContain(
      'FC-0002',
    )
    expect(heldByOther((await listAssuranceTrips({ pageSize: 100 })).items).map((t) => t.id)).toContain(
      'UST-3',
    )
  })

  it('reaches an empty queue that is empty because nothing went wrong', async () => {
    /* Not a filter that matched nothing — the absence ledger ships empty
       (`DB.absenceEvents = []`, `:16564`) because no captain has stood a rider
       up in the rolling window. Different screen, different copy. */
    const page = await listAbsences({ pageSize: 100 })
    expect(page.total).toBe(0)
    expect(page.totalPages).toBe(1)
  })

  it('reaches a populated strike ledger without hand-editing a fixture', async () => {
    useAbsenceHistory()
    const page = await listAbsences({ pageSize: 100 })
    expect(new Set(page.items.map((e) => e.tier))).toEqual(new Set([1, 2, 3]))
    expect(page.items.some((e) => e.waived)).toBe(true)
    expect(page.items.some((e) => e.decayed)).toBe(true)
    resetAssurance()
  })

  it('reaches a quiet safety queue — every incident closed, nothing breached', async () => {
    useQuietSafetyQueue()
    const page = await listSafetyIncidents({ pageSize: 100 })
    expect(page.items.every((i) => i.status === 'closed')).toBe(true)
    expect(page.items.every((i) => i.firstResponseBreachedAt === null)).toBe(true)
    resetSafetyIncidents()
  })

  it('reaches every wave-2 status the filters offer', async () => {
    const requests = await listRequests({ pageSize: 500 })
    for (const status of ['searching', 'offered', 'assigned', 'no-drivers', 'expired', 'cancelled']) {
      expect(new Set(requests.items.map((r) => r.status)).has(status as never), status).toBe(true)
    }

    const incidents = await listSafetyIncidents({ pageSize: 100 })
    for (const type of ['sos', 'accident', 'harassment', 'unsafe-driving', 'theft']) {
      expect(new Set(incidents.items.map((i) => i.type)).has(type as never), type).toBe(true)
    }
    for (const severity of ['critical', 'high', 'normal']) {
      expect(new Set(incidents.items.map((i) => i.severity)).has(severity as never), severity).toBe(true)
    }

    const cases = await listFairnessCases({ pageSize: 100 })
    for (const status of ['open', 'upheld', 'overturned', 'withdrawn']) {
      expect(new Set(cases.items.map((c) => c.status)).has(status as never), status).toBe(true)
    }
    for (const kind of ['suspension-appeal', 'rating-dispute', 'rider-report']) {
      expect(new Set(cases.items.map((c) => c.kind)).has(kind as never), kind).toBe(true)
    }

    const trips = await listAssuranceTrips({ pageSize: 100 })
    for (const state of ['moving', 'not-started', 'unavailable']) {
      expect(new Set(trips.items.map((t) => t.captainDepartureState)).has(state as never), state).toBe(
        true,
      )
    }
    for (const weight of ['strong', 'attested', 'weak']) {
      expect(
        new Set(trips.items.map((t) => t.acknowledgement?.weight)).has(weight as never),
        weight,
      ).toBe(true)
    }
  })

  it('carries an incident with no reporter at all', async () => {
    /* Automatic crash detection. Legacy renders `nm2(inc.reporter)`
       unconditionally (`:13432`) and would print `undefined` into the list. */
    const page = await listSafetyIncidents({ pageSize: 100 })
    const orphan = page.items.find((i) => i.reporterId === null)
    expect(orphan?.id).toBe('INC-017')
    expect(orphan?.reporterKind).toBe('system')
  })

  it('carries a breach measured in minutes beside one measured in days', async () => {
    const page = await listRequests({ view: 'breached', pageSize: 500 })
    const minutes = page.items.find((r) => r.id === 'REQ-503')!
    const days = page.items.find((r) => r.id === 'SREQ-006')!
    const over = (iso: string) =>
      (Date.parse('2026-06-25T09:14:00+03:00') - Date.parse(iso)) / 60_000
    expect(over(minutes.slaBreachedAt!)).toBeLessThan(10)
    expect(over(days.slaBreachedAt!)).toBeGreaterThan(60 * 24 * 4)
  })

  it('carries an overdrawn wallet', async () => {
    const page = await listRiders({ pageSize: 100 })
    expect(page.items.some((r) => r.walletBalanceHalalas < 0)).toBe(true)
  })

  it('carries a captain with no trips', async () => {
    const page = await listDrivers({ pageSize: 200 })
    expect(page.items.some((d) => d.totalTrips === 0 && d.lastTripAt === null)).toBe(true)
  })

  it('carries a name long enough to break a column', async () => {
    const page = await listDrivers({ pageSize: 200 })
    expect(page.items.some((d) => d.name.length > 40)).toBe(true)
  })

  it('carries enough rows to page', async () => {
    for (const list of [listDrivers, listTrips, listSubscriptions]) {
      const page = await list({ pageSize: 25 })
      expect(page.totalPages, list.name).toBeGreaterThan(1)
    }
  })

  it('reaches every subscription status the filter offers', async () => {
    const page = await listSubscriptions({ pageSize: 200 })
    const statuses = new Set(page.items.map((s) => s.status))
    for (const status of ['active', 'expiring', 'at-risk', 'frozen', 'cancelled', 'expired']) {
      expect(statuses.has(status as never), status).toBe(true)
    }
  })

  it('reaches every applicant status', async () => {
    const page = await listApplicants({ pageSize: 100 })
    const statuses = new Set(page.items.map((a) => a.status))
    for (const status of ['pending', 'in-review', 'approved', 'rejected', 'withdrawn']) {
      expect(statuses.has(status as never), status).toBe(true)
    }
  })

  it('reaches a compliance record with no documents on file, reported as null not valid', async () => {
    const page = await listDriverCompliance({ pageSize: 100 })
    const empty = page.items.find((c) => c.docs.length === 0)
    expect(empty).toBeDefined()
    expect(empty!.worstState).toBeNull()
  })
})

describe('money is integer minor units', () => {
  it('carries no fractional halalas anywhere in the served fixtures', async () => {
    const [drivers, riders, trips, subs, corps] = await Promise.all([
      listDrivers({ pageSize: 200 }),
      listRiders({ pageSize: 200 }),
      listTrips({ pageSize: 200 }),
      listSubscriptions({ pageSize: 200 }),
      listCorporateAccounts({ pageSize: 200 }),
    ])
    const amounts = [
      ...drivers.items.map((d) => d.monthEarningsHalalas),
      ...riders.items.flatMap((r) => [r.walletBalanceHalalas, r.lifetimeValueHalalas]),
      ...trips.items.flatMap((t) => [
        t.fareHalalas,
        t.driverEarningsHalalas,
        t.platformCutHalalas,
        t.tipHalalas,
      ]),
      ...subs.items.map((s) => s.paidHalalas),
      ...corps.items.map((c) => c.totalSpendHalalas),
    ]
    expect(amounts.filter((a) => !Number.isInteger(a))).toEqual([])
  })
})

/* ── helpers ─────────────────────────────────────────────────────────── */

function srcDir(): string {
  return join(process.cwd(), 'src')
}

function dataDir(): string {
  return join(srcDir(), 'data')
}

function rel(file: string): string {
  return relative(process.cwd(), file)
}

/** Good enough for a source audit: block comments, then line comments. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function walk(dir: string): string[] {
  let out: string[] = []
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out = out.concat(walk(full))
    else if (/\.(ts|tsx)$/.test(full)) out.push(full)
  }
  return out
}
