/**
 * Filterability — the owner's *"filters for everything in the table, whether
 * it's text filters, or dropdowns"*.
 *
 * `runQuery` throws on any field a client has not declared `filterable`, and
 * that throw reaches the operator as the error state. So the contract worth
 * testing is not "filtering works" — it is that **every field the table can
 * show can actually be filtered**, and that all six control kinds have a real
 * field to bind to.
 *
 * The list checked here is §4.1 of
 * `docs/05-restructure/build/03-table-controls.md`.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { disableMockLatency, mockFailures } from '../config'
import { EYVAR_TZ_OFFSET, toInstant } from '../mock/clock'
import { listApplicants } from './applicants'
import {
  getAssuranceFacets,
  listAbsences,
  listAssuranceTrips,
  resetAssurance,
  useAbsenceHistory,
} from './assurance'
import { getCorporateFacets, listCorporateAccounts } from './corporateAccounts'
import { getFairnessFacets, listFairnessCases } from './fairness'
import { getMetricFacets, listMetrics } from './metrics'
import { getWorkFacets, listWorkItems } from './myWork'
import { getRequestFacets, listRequests } from './requests'
import { getSafetyFacets, listSafetyIncidents } from './safety'
import { getDriverFacets, listDriverCompliance, listDrivers } from './drivers'
import { getRiderFacets, listRiders } from './riders'
import { getSubscriptionFacets, listSubscriptions } from './subscriptions'
import { getTripFacets, listTrips } from './trips'
import type { FilterSpec } from '../types/common'

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
})

/** Every field §4.1 named, per client. */
const REQUIRED: Array<{ name: string; list: (f: FilterSpec[]) => Promise<unknown>; fields: string[] }> = [
  {
    name: 'drivers',
    list: (filters) => listDrivers({ filters, pageSize: 5 }),
    fields: [
      'name', 'id', 'totalTrips', 'monthEarningsHalalas', 'onTimePercent',
      'activeSubscriptions', 'lastTripAt', 'joinedAt',
      'status', 'rating', 'city', 'tier', 'vehicleClass', 'suspended', 'openComplaints',
    ],
  },
  {
    name: 'compliance',
    list: (filters) => listDriverCompliance({ filters, pageSize: 5 }),
    fields: ['driverId', 'driverName', 'worstState', 'suspended', 'soonestExpiry', 'docCount'],
  },
  {
    name: 'riders',
    list: (filters) => listRiders({ filters, pageSize: 5 }),
    fields: [
      'name', 'id', 'totalTrips', 'lifetimeValueHalalas', 'renewalRatePercent',
      'lastTripAt', 'joinedAt',
      'status', 'churnRisk', 'tier', 'city', 'walletBalanceHalalas', 'corporateAccountId',
    ],
  },
  {
    name: 'applicants',
    list: (filters) => listApplicants({ filters, pageSize: 5 }),
    fields: [
      'name', 'id', 'appliedAt', 'slaDueAt', 'status', 'vehicleClass', 'city', 'unclaimed',
      /* wave 2 — the shared SLA block, retro-fitted onto the first work queue */
      'slaStartedAt', 'slaBreachedAt', 'slaTargetMinutes', 'slaSource', 'breached', 'hasSla',
    ],
  },
  {
    name: 'trips',
    list: (filters) => listTrips({ filters, pageSize: 5 }),
    fields: ['id', 'riderName', 'driverName', 'startedAt', 'endedAt', 'fareHalalas', 'kind', 'status'],
  },
  {
    name: 'subscriptions',
    list: (filters) => listSubscriptions({ filters, pageSize: 5 }),
    fields: ['id', 'riderName', 'endsOn', 'startedOn', 'paidHalalas', 'status', 'planKey'],
  },
  {
    name: 'corporate',
    list: (filters) => listCorporateAccounts({ filters, pageSize: 5 }),
    fields: ['id', 'companyName', 'contactName', 'createdAt', 'totalSpendHalalas', 'status'],
  },

  /* ── wave 2 — the work queues ─────────────────────────────────────────
     Same contract as §4.1: every column the table can show is filterable,
     grouped by control kind, closed sets faceted, every date through
     `toInstant`. A second round of this is what the wave-1 handoff said must
     not happen. */
  {
    name: 'requests',
    list: (filters) => listRequests({ filters, pageSize: 5 }),
    fields: [
      /* text */
      'id', 'riderId', 'riderName', 'pickup', 'destination', 'notes',
      'assignedSubscriptionId', 'assignedDriverName',
      /* select / multi-select */
      'channel', 'status', 'vehicleClass', 'planKey', 'slaSource', 'claimedBy',
      'assignedDriverId', 'assignedByUserId', 'offeredToDriverId',
      /* boolean */
      'vip', 'riderHasPriorSubscription', 'unclaimed', 'breached', 'open', 'hasRating',
      /* number-range */
      'riderRating', 'slaTargetMinutes', 'waitedMinutes',
      /* date-range */
      'requestedAt', 'slaStartedAt', 'slaDueAt', 'slaBreachedAt', 'offerExpiresAt',
      'assignedAt', 'expiredAt', 'cancelledAt',
    ],
  },
  {
    name: 'safety',
    list: (filters) => listSafetyIncidents({ filters, pageSize: 5 }),
    fields: [
      'id', 'summary', 'tripId', 'reporterId', 'reporterName', 'againstId', 'againstName',
      'type', 'severity', 'status', 'reporterKind', 'reasonCode', 'workSeverity', 'slaSource',
      'claimedBy', 'closedByUserId', 'suspendedDriverId',
      'unclaimed', 'breached', 'resolveBreached', 'firstResponseBreached', 'hasReporter',
      'hasCounterparty', 'precautionarySuspension', 'hasSla', 'protocolComplete',
      'stepsComplete', 'stepsOutstanding', 'slaTargetMinutes',
      'openedAt', 'closedAt', 'slaStartedAt', 'slaDueAt', 'slaBreachedAt',
      'firstResponseDueAt', 'firstResponseAt', 'firstResponseBreachedAt',
    ],
  },
  {
    name: 'fairness',
    list: (filters) => listFairnessCases({ filters, pageSize: 5 }),
    fields: [
      'id', 'driverId', 'driverName', 'subjectId', 'subjectName', 'detail', 'tripId',
      'rationale', 'suspensionReason',
      'kind', 'status', 'reasonCode', 'slaSource', 'claimedBy', 'decidedByUserId',
      'unclaimed', 'breached', 'firstResponseBreached', 'open', 'averageAdjusted',
      'hasRationale', 'reinstated',
      'disputedRating', 'slaTargetMinutes',
      'openedAt', 'decidedAt', 'reinstatedAt', 'slaStartedAt', 'slaDueAt', 'slaBreachedAt',
      'firstResponseDueAt', 'firstResponseAt', 'firstResponseBreachedAt',
    ],
  },
  {
    name: 'assurance',
    list: (filters) => listAssuranceTrips({ filters, pageSize: 5 }),
    fields: [
      'id', 'subscriptionId', 'riderId', 'riderName', 'driverId', 'driverName', 'route',
      'pickup', 'destination', 'backupIneligibleReason', 'captainUnavailableReason',
      'planKey', 'planName', 'captainDepartureState', 'ackSource', 'ackWeight', 'offerState',
      'backupDriverId', 'claimedBy', 'slaSource',
      'riderConfirmed', 'captainAcknowledged', 'ackAssumed', 'autoHandedOff', 'backupEligible',
      'backupRegistered', 'coverageNominal', 'uncovered', 'unclaimed', 'breached',
      'minutesToPickup', 'nearbyEligibleCount', 'nearestEligibleKm', 'hoursToDeparture',
      'slaTargetMinutes',
      'departsAt', 'riderConfirmedAt', 'acknowledgedAt', 'offerExpiresAt',
      'slaStartedAt', 'slaDueAt', 'slaBreachedAt',
    ],
  },
  {
    name: 'absences',
    list: (filters) => listAbsences({ filters, pageSize: 5 }),
    fields: [
      'id', 'driverId', 'driverName', 'subscriptionId', 'waivedReason', 'appealCaseId',
      'emergencyClaimId', 'tier',
      'waived', 'decayed', 'terminated', 'counting', 'appealed',
      'forfeitedHalalas', 'reserveForfeitedHalalas', 'freezeDays', 'liveStrikesAtEvent',
      'occurredAt',
    ],
  },
  {
    name: 'work-items',
    list: (filters) => listWorkItems({ filters, pageSize: 5 }),
    fields: [
      'key', 'id', 'title', 'subtitle', 'entityId', 'route',
      'queue', 'severity', 'entityType', 'slaSource', 'claimedBy',
      'breached', 'unclaimed', 'heldByMe', 'routedToMyRole', 'hasDeadline',
      'slaTargetMinutes',
      'dueAt', 'slaStartedAt', 'slaDueAt', 'slaBreachedAt',
      'firstResponseDueAt', 'firstResponseAt', 'firstResponseBreachedAt',
    ],
  },

  /* ── wave 4 — the metrics library (§3.7 customise mode) ───────────────
     A board of charts is not a table, but the metric *catalogue* is: the
     library sidebar is a filterable list grouped by category. */
  {
    name: 'metrics',
    list: (filters) => listMetrics({ filters, pageSize: 5 }),
    fields: [
      'key', 'drilldownRoute',
      'subTabId', 'category', 'unit', 'currency', 'sourceResource', 'comparisonKind',
      'noComparisonReason', 'direction',
      'higherIsBetter', 'hasValue', 'hasComparison', 'hasDrilldown', 'derived', 'improving',
      'value', 'deltaPercent', 'comparisonValue',
      'asOf', 'periodStart', 'periodEnd', 'comparisonPeriodStart', 'targetEffectiveFrom',
    ],
  },
]

describe('every declared field is reachable — runQuery does not throw', () => {
  for (const { name, list, fields } of REQUIRED) {
    it(`${name}: ${fields.length} fields`, async () => {
      for (const field of fields) {
        await expect(
          list([{ field, op: 'isNotNull', value: null }]),
          `${name}.${field} is not declared filterable — the filter menu would ` +
            'render a control that throws into the error state',
        ).resolves.toBeDefined()
      }
    })
  }

  it('still throws on a field nobody declared, so a typo stays loud', async () => {
    await expect(
      listDrivers({ filters: [{ field: 'notAField', op: 'eq', value: 'x' }] }),
    ).rejects.toThrow(/Unknown filter field/)
  })
})

describe('date-range — the kind that had no reachable field', () => {
  /** What `toFilterSpec` emits: Riyadh instants, upper bound at end of day. */
  const range = (from: string, to: string): FilterSpec => ({
    field: 'joinedAt',
    op: 'between',
    value: [`${from}T00:00:00${EYVAR_TZ_OFFSET}`, `${to}T23:59:59.999${EYVAR_TZ_OFFSET}`],
  })

  it('filters captains by join date', async () => {
    const page = await listDrivers({ filters: [range('2025-02-01', '2025-02-28')], pageSize: 200 })
    expect(page.items.length).toBeGreaterThan(0)
    for (const d of page.items) expect(d.joinedAt.startsWith('2025-02')).toBe(true)
  })

  it('includes the closing day — a bare upper bound would silently drop it', async () => {
    /* DRV-0101 joined 2025-02-01. A single-day range over exactly that day must
       return it. `Date.parse('2025-02-01')` is UTC midnight, so this is the
       assertion that catches a regression back to naive parsing. */
    const page = await listDrivers({ filters: [range('2025-02-01', '2025-02-01')], pageSize: 200 })
    expect(page.items.map((d) => d.id)).toContain('DRV-0101')
  })

  it('excludes the day after the upper bound', async () => {
    const page = await listDrivers({ filters: [range('2025-01-01', '2025-01-31')], pageSize: 200 })
    expect(page.items.map((d) => d.id)).not.toContain('DRV-0101')
  })

  it('compares an instant field the same way', async () => {
    const page = await listTrips({
      filters: [
        {
          field: 'startedAt',
          op: 'between',
          value: [
            `2026-06-25T00:00:00${EYVAR_TZ_OFFSET}`,
            `2026-06-25T23:59:59.999${EYVAR_TZ_OFFSET}`,
          ],
        },
      ],
      pageSize: 200,
    })
    for (const t of page.items) expect(t.startedAt.startsWith('2026-06-25')).toBe(true)
    /**
     * **This is the assertion that makes the end-of-day bound load-bearing.**
     * TRP-9012 starts 09:02 Riyadh = 06:02Z. A bare `2026-06-25` upper bound
     * parses to 00:00Z, so every trip after 03:00 Riyadh — which is nearly all
     * of them — silently vanishes. Asserting only `length > 0` passes anyway,
     * because filler rows land in the 00:00–03:00 sliver that survives.
     */
    expect(page.items.map((t) => t.id)).toContain('TRP-9012')
    expect(page.items.map((t) => t.id)).toContain('TRP-9008')
  })

  /**
   * Note on the date-only case: because Riyadh is UTC+3, a bare `2025-02-01`
   * parsed as UTC midnight lands at 03:00 local — inside its own day — so it
   * happens to fall within a Riyadh-bounded range even without `toInstant`.
   * `toInstant` is here so that stays true by construction rather than by the
   * sign of the offset, and so the value aligns exactly with the lower bound.
   */
  it('widens a bare date to Riyadh midnight, not UTC midnight', () => {
    expect(toInstant('2026-06-25')).toBe('2026-06-25T00:00:00+03:00')
    expect(toInstant('2026-06-25T09:14:00+03:00')).toBe('2026-06-25T09:14:00+03:00')
    expect(toInstant(null)).toBeNull()
  })
})

describe('the other five kinds reach real fields', () => {
  it('text — contains, on a name', async () => {
    const page = await listDrivers({ filters: [{ field: 'name', op: 'contains', value: 'Salem' }] })
    expect(page.items.map((d) => d.id)).toContain('DRV-0101')
  })

  it('number-range — between, on trips', async () => {
    const page = await listDrivers({
      filters: [{ field: 'totalTrips', op: 'between', value: [400, 600] }],
      pageSize: 200,
    })
    expect(page.items.length).toBeGreaterThan(0)
    for (const d of page.items) expect(d.totalTrips).toBeGreaterThanOrEqual(400)
  })

  it('money-range — halalas, on an overdrawn wallet', async () => {
    const page = await listRiders({
      filters: [{ field: 'walletBalanceHalalas', op: 'lt', value: 0 }],
      pageSize: 200,
    })
    expect(page.items.map((r) => r.id)).toContain('RDR-4001')
  })

  it('select — one value', async () => {
    const page = await listDrivers({ filters: [{ field: 'status', op: 'eq', value: 'suspended' }] })
    expect(page.items.length).toBeGreaterThan(0)
    expect(page.items.every((d) => d.status === 'suspended')).toBe(true)
  })

  it('multi-select — in', async () => {
    const page = await listDrivers({
      filters: [{ field: 'tier', op: 'in', value: ['gold', 'silver'] }],
      pageSize: 200,
    })
    expect(page.items.every((d) => d.tier === 'gold' || d.tier === 'silver')).toBe(true)
  })

  it('boolean', async () => {
    const page = await listDrivers({ filters: [{ field: 'suspended', op: 'eq', value: true }] })
    expect(page.items.every((d) => d.suspended)).toBe(true)
  })
})

describe('F-5 — "no file" is expressible again, as a count', () => {
  it('finds the captain with no compliance documents via docCount', async () => {
    const page = await listDriverCompliance({
      filters: [{ field: 'docCount', op: 'eq', value: 0 }],
      pageSize: 100,
    })
    expect(page.items.map((c) => c.driverId)).toContain('DRV-0203')
    for (const c of page.items) expect(c.worstState).toBeNull()
  })
})

describe('F-6 — select options come from the data, not a hand-written list', () => {
  it('returns cities as facets rather than a literal Riyadh/Jeddah pair', async () => {
    const facets = await getDriverFacets()
    const cities = facets.city!.map((f) => f.value)
    /* Asserted as "whatever the data holds", never as a literal: seed a third
       city and it appears here with no screen edit. */
    const page = await listDrivers({ pageSize: 500 })
    expect(new Set(cities)).toEqual(new Set(page.items.map((d) => d.city)))
    expect(cities.length).toBeGreaterThan(1)
  })

  it('counts each value, so a dropdown can show the size of each option', async () => {
    const facets = await getDriverFacets()
    const total = facets.city!.reduce((sum, f) => sum + f.count, 0)
    const page = await listDrivers({ pageSize: 500 })
    expect(total).toBe(page.total)
  })

  it('orders count-descending then value-ascending, so a dropdown never reshuffles', async () => {
    const facets = await getDriverFacets()
    const counts = facets.status!.map((f) => f.count)
    expect([...counts].sort((a, b) => b - a)).toEqual(counts)
    expect(await getDriverFacets()).toStrictEqual(facets)
  })

  it('omits null — the select control already reserves null for Any', async () => {
    const facets = await getRiderFacets()
    const values = facets.corporateAccountId!.map((f) => f.value)
    expect(values).not.toContain('null')
    expect(values).toContain('CORP-002')
  })

  it('covers every resource that has a closed-set column', async () => {
    for (const [name, load] of [
      ['drivers', getDriverFacets],
      ['riders', getRiderFacets],
      ['trips', getTripFacets],
      ['subscriptions', getSubscriptionFacets],
      ['corporate', getCorporateFacets],
      ['requests', getRequestFacets],
      ['safety', getSafetyFacets],
      ['fairness', getFairnessFacets],
      ['assurance', getAssuranceFacets],
      ['work-items', getWorkFacets],
      ['metrics', getMetricFacets],
    ] as const) {
      const facets = await load()
      expect(Object.keys(facets).length, name).toBeGreaterThan(0)
      for (const values of Object.values(facets)) expect(values.length).toBeGreaterThan(0)
    }
  })

  it('scopes to a view, so each view offers only the options it holds', async () => {
    const all = await getTripFacets()
    const quick = await getTripFacets('quick-rides')
    expect(all.kind!.map((f) => f.value).sort()).toEqual(['Quick ride', 'Subscription'])
    expect(quick.kind!.map((f) => f.value)).toEqual(['Quick ride'])
  })

  it('makes every facetable field filterable too, or the dropdown would throw', async () => {
    const facets = await getDriverFacets()
    for (const field of Object.keys(facets)) {
      await expect(
        listDrivers({ filters: [{ field, op: 'isNotNull', value: null }] }),
        field,
      ).resolves.toBeDefined()
    }
  })
})

describe('wave 2 — the SLA fields a work queue is actually sorted and filtered by', () => {
  /**
   * The point of `slaBreachedAt` is that it is **not** `slaDueAt < now`. Four
   * rows across three queues have a deadline in the past and no breach, because
   * they were disposed of inside their window. A screen that computes breach
   * from the deadline marks all four wrong.
   */
  it('separates "breached" from "merely past its deadline"', async () => {
    const now = Date.parse('2026-06-25T09:14:00+03:00')

    const requests = await listRequests({ pageSize: 500 })
    const merelyOld = requests.items.filter(
      (r) => r.slaDueAt !== null && Date.parse(r.slaDueAt) < now && r.slaBreachedAt === null,
    )
    expect(merelyOld.map((r) => r.id)).toContain('SREQ-002')
    expect(merelyOld.map((r) => r.id)).toContain('REQ-505')

    const incidents = await listSafetyIncidents({ pageSize: 100 })
    expect(
      incidents.items.find((i) => i.id === 'INC-018'),
    ).toMatchObject({ slaBreachedAt: null, status: 'closed' })

    const cases = await listFairnessCases({ pageSize: 100 })
    expect(cases.items.find((c) => c.id === 'FC-0005')).toMatchObject({ slaBreachedAt: null })

    const applicants = await listApplicants({ pageSize: 100 })
    expect(applicants.items.find((a) => a.id === 'APP-2203')).toMatchObject({ slaBreachedAt: null })
  })

  it('keeps a breach visible after the work was finished', async () => {
    /* Resolved *and* late. Both facts survive, because an operations review
       asks for exactly this row. */
    const page = await listRequests({ pageSize: 500 })
    const late = page.items.find((r) => r.id === 'SREQ-005')!
    expect(late.status).toBe('assigned')
    expect(late.slaBreachedAt).not.toBeNull()
    expect(Date.parse(late.assignedAt!)).toBeGreaterThan(Date.parse(late.slaBreachedAt!))
  })

  it('models two clocks, and lets the first break while the second still runs', async () => {
    const page = await listSafetyIncidents({ view: 'critical-sos', pageSize: 100 })
    const sos = page.items.find((i) => i.id === 'INC-015')!
    expect(sos.firstResponseBreachedAt).not.toBeNull()
    expect(sos.slaBreachedAt).toBeNull()
    expect(Date.parse(sos.slaDueAt!)).toBeGreaterThan(Date.parse('2026-06-25T09:14:00+03:00'))
  })

  it('carries a deadline with no denominator, rather than inventing one', async () => {
    /* Trip Assurance knows *when* (21:00 the evening before, `:16545`) and not
       *how long* — nothing says when the confirmation window opens. A screen
       can render the deadline and must not render a progress track. Q8. */
    const page = await listAssuranceTrips({ pageSize: 100 })
    expect(page.items.every((t) => t.slaDueAt !== null)).toBe(true)
    expect(page.items.every((t) => t.slaTargetMinutes === null)).toBe(true)
  })

  it('distinguishes an auto-handoff from a breach on identical inputs', async () => {
    /* UST-3 and UST-5 share a cut-off and both have no acknowledgement. One is
       breached; the other was handed to a backup, which legacy calls "a managed
       withdrawal, not an absence" (`:16601`). */
    const page = await listAssuranceTrips({ pageSize: 100 })
    const breached = page.items.find((t) => t.id === 'UST-3')!
    const handedOff = page.items.find((t) => t.id === 'UST-5')!
    expect(breached.acknowledgement).toBeNull()
    expect(handedOff.acknowledgement).toBeNull()
    expect(breached.slaDueAt).toBe(handedOff.slaDueAt)
    expect(breached.slaBreachedAt).not.toBeNull()
    expect(handedOff.slaBreachedAt).toBeNull()
    expect(handedOff.autoHandedOff).toBe(true)
  })

  it('finds the registered-but-ineligible backup with one filter', async () => {
    /* The gap `renderCoverage` calls the only number that matters (`:17520`).
       Without `coverageNominal` a screen has to compute it from two booleans,
       and the two screens that do will disagree. */
    const page = await listAssuranceTrips({
      filters: [{ field: 'coverageNominal', op: 'eq', value: true }],
      pageSize: 100,
    })
    expect(page.items.map((t) => t.id)).toContain('UST-2')
    expect(page.items.every((t) => t.backupDriverId !== null && !t.backupEligible)).toBe(true)
  })

  it('reaches the absence ledger fields even though the queue is empty by default', async () => {
    /* An empty queue must still declare its filters, or the first populated day
       is the day the filter menu throws into the error state. */
    useAbsenceHistory()
    const page = await listAbsences({
      filters: [{ field: 'counting', op: 'eq', value: true }],
      pageSize: 100,
    })
    expect(page.items.every((e) => !e.waived && !e.decayed)).toBe(true)
    expect(page.items.length).toBeGreaterThan(0)
    resetAssurance()
  })
})

describe('wave 2 — My Work is derived from the queues, never seeded twice', () => {
  it('carries no row that its own queue does not also serve', async () => {
    const [work, requests, incidents, cases, trips, applicants] = await Promise.all([
      listWorkItems({ view: 'everything', pageSize: 500, includeOtherRoles: true }),
      listRequests({ pageSize: 500 }),
      listSafetyIncidents({ pageSize: 100 }),
      listFairnessCases({ pageSize: 100 }),
      listAssuranceTrips({ pageSize: 100 }),
      listApplicants({ pageSize: 100 }),
    ])
    const known: Record<string, Set<string>> = {
      request: new Set(requests.items.map((r) => r.id)),
      incident: new Set(incidents.items.map((i) => i.id)),
      fairness: new Set(cases.items.map((c) => c.id)),
      assurance: new Set(trips.items.map((t) => t.id)),
      application: new Set(applicants.items.map((a) => a.id)),
    }
    for (const item of work.items) {
      expect(known[item.queue]?.has(item.id), `${item.key} has no source row`).toBe(true)
    }
  })

  it('agrees with each queue about which rows are breached', async () => {
    const work = await listWorkItems({ view: 'everything', pageSize: 500, includeOtherRoles: true })
    const incidents = await listSafetyIncidents({ view: 'open', pageSize: 100 })
    for (const incident of incidents.items) {
      const item = work.items.find((w) => w.key === `incident:${incident.id}`)!
      expect(item.breached, incident.id).toBe(
        incident.firstResponseBreachedAt !== null || incident.slaBreachedAt !== null,
      )
    }
  })

  it('sorts breached first and undated last, never by severity label', async () => {
    /* "A 'critical' incident with four hours left is less urgent than a High
       ticket breaching in ninety seconds" (`:19074`). */
    const page = await listWorkItems({
      view: 'everything',
      sort: { field: 'urgency', dir: 'asc' },
      pageSize: 500,
      includeOtherRoles: true,
    })
    const firstUnbreached = page.items.findIndex((w) => !w.breached)
    expect(page.items.slice(0, firstUnbreached).every((w) => w.breached)).toBe(true)
    const undatedFirst = page.items.findIndex((w) => w.dueAt === null)
    if (undatedFirst >= 0) {
      expect(page.items.slice(undatedFirst).every((w) => w.dueAt === null)).toBe(true)
    }
  })
})
