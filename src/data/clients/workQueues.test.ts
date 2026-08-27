/**
 * The work-queue contract — **one shape, six queues**.
 *
 * `Applicant` landed first and invented `claim` + `slaDueAt` for itself. Wave 2
 * generalised that into `SlaTracked` (`types/workQueue.ts`) and retro-fitted
 * `Applicant` onto it rather than letting a second shape grow beside the first.
 * This file is what keeps them one shape: every assertion below runs over all
 * six queues, so a seventh cannot quietly diverge and the sixth cannot quietly
 * drift back.
 *
 * The three things a work queue needs beyond a list — **ownership, an SLA, a
 * disposition** — get a section each, plus the one that is easy to get wrong:
 * **breach is a state, not a comparison**.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { disableMockLatency, mockFailures } from '../config'
import { isApiError, type Claim } from '../types/common'
import type { SlaTracked } from '../types/workQueue'
import {
  approveApplicant,
  claimApplicant,
  listApplicants,
  rejectApplicant,
  releaseApplicant,
} from './applicants'
import {
  acknowledgeLeg,
  claimAssuranceTrip,
  listAssuranceTrips,
  offerBackup,
  releaseAssuranceTrip,
  resetAssurance,
  useAbsenceHistory,
  waiveAbsence,
} from './assurance'
import { claimFairnessCase, decideFairnessCase, listFairnessCases, releaseFairnessCase } from './fairness'
import { listWorkItems, myWorkBacklogSize } from './myWork'
import { assignRequest, claimRequest, expireRequest, listRequests, releaseRequest } from './requests'

import {
  claimSafetyIncident,
  closeSafetyIncident,
  listSafetyIncidents,
  precautionarilySuspend,
  releaseSafetyIncident,
  resetSafetyIncidents,
  setSafetyProtocolStep,
} from './safety'

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
  resetSafetyIncidents()
  resetAssurance()
})

/** The four wave-2 queues that carry a claim, plus the wave-1 one that started it. */
const QUEUES = [
  {
    name: 'applications',
    list: () => listApplicants({ pageSize: 200 }),
    claim: claimApplicant,
    release: releaseApplicant,
    /** A row this queue holds for somebody who is not the current user. */
    heldByOther: 'APP-2204',
  },
  {
    name: 'requests',
    list: () => listRequests({ pageSize: 500 }),
    claim: claimRequest,
    release: releaseRequest,
    heldByOther: 'REQ-503',
  },
  {
    name: 'safety',
    list: () => listSafetyIncidents({ pageSize: 100 }),
    claim: claimSafetyIncident,
    release: releaseSafetyIncident,
    heldByOther: 'INC-016',
  },
  {
    name: 'fairness',
    list: () => listFairnessCases({ pageSize: 100 }),
    claim: claimFairnessCase,
    release: releaseFairnessCase,
    heldByOther: 'FC-0002',
  },
  {
    name: 'assurance',
    list: () => listAssuranceTrips({ pageSize: 100 }),
    claim: claimAssuranceTrip,
    release: releaseAssuranceTrip,
    heldByOther: 'UST-3',
  },
] as const

type QueueRow = SlaTracked & { id: string; claim: Claim | null }

describe('one shape — every queue satisfies the same contract', () => {
  it.each(QUEUES)('$name carries the full SLA block on every row', async ({ list }) => {
    const rows = (await list()).items as unknown as QueueRow[]
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      /* Present-and-nullable, not optional. An absent field and a null one read
         the same in a component and mean different things on the wire. */
      for (const field of [
        'slaStartedAt',
        'slaDueAt',
        'slaTargetMinutes',
        'slaBreachedAt',
        'firstResponseDueAt',
        'firstResponseAt',
        'firstResponseBreachedAt',
        'claim',
      ] as const) {
        expect(row, `${row.id}.${field}`).toHaveProperty(field)
      }
      expect(['legacy-policy', 'legacy-reason-code', 'unset']).toContain(row.slaSource)
    }
  })

  it.each(QUEUES)('$name says where its SLA number came from', async ({ name, list }) => {
    /* `unset` is the honest answer where nobody has decided (Q8). What must not
       happen is a queue with a confident-looking deadline and no provenance. */
    const rows = (await list()).items as unknown as QueueRow[]
    const sources = new Set(rows.map((r) => r.slaSource))
    expect(sources.size, `${name} has no slaSource at all`).toBeGreaterThan(0)
  })

  it('spends `unset` only where the window really is undecided', async () => {
    /* Applications: the 48-hour placeholder — Q8.
       Safety: `harassment` and `other`, which no §6 reason code covers.
       Everything else has a number the legacy app actually enforces. */
    const applicants = (await listApplicants({ pageSize: 200 })).items
    expect(applicants.every((a) => a.slaSource === 'unset')).toBe(true)

    const incidents = (await listSafetyIncidents({ pageSize: 100 })).items
    for (const i of incidents) {
      const expected = i.type === 'harassment' || i.type === 'other' ? 'unset' : 'legacy-reason-code'
      expect(i.slaSource, i.id).toBe(expected)
    }

    const requests = (await listRequests({ pageSize: 500 })).items
    expect(requests.every((r) => r.slaSource === 'legacy-policy')).toBe(true)

    const cases = (await listFairnessCases({ pageSize: 100 })).items
    expect(cases.every((c) => c.slaSource === 'legacy-reason-code')).toBe(true)
  })
})

describe('breach is a state, not a comparison', () => {
  it.each(QUEUES)('$name never stamps a breach on a row inside its window', async ({ list }) => {
    const rows = (await list()).items as unknown as QueueRow[]
    for (const row of rows) {
      if (row.slaBreachedAt === null) continue
      expect(row.slaDueAt, `${row.id} is breached with no deadline`).not.toBeNull()
      expect(
        Date.parse(row.slaBreachedAt) >= Date.parse(row.slaDueAt!),
        `${row.id} breached before it was due`,
      ).toBe(true)
    }
  })

  it('keeps `no-drivers` and the breach stamp as one event, never two', async () => {
    /* Legacy sets the status *at* the breach and logs `sla_breach` in the same
       statement (`:9832`). If one is ever written without the other, the queue
       shows a row that is stuck and not late, or late and not stuck. */
    const rows = (await listRequests({ pageSize: 500 })).items
    for (const row of rows.filter((r) => r.status === 'no-drivers')) {
      expect(row.slaBreachedAt, row.id).not.toBeNull()
    }
  })

  it('counts fewer breaches than rows-past-their-deadline, on every queue', async () => {
    /* The property that makes the distinction load-bearing rather than
       decorative: if the two counts were equal everywhere, `slaBreachedAt`
       would be a cached comparison and could be deleted. */
    const now = Date.parse('2026-06-25T09:14:00+03:00')
    let pastDue = 0
    let breached = 0
    for (const { list } of QUEUES) {
      const rows = (await list()).items as unknown as QueueRow[]
      pastDue += rows.filter((r) => r.slaDueAt !== null && Date.parse(r.slaDueAt) < now).length
      breached += rows.filter((r) => r.slaBreachedAt !== null).length
    }
    expect(breached).toBeLessThan(pastDue)
  })
})

describe('ownership — a claim is not a lock', () => {
  it.each(QUEUES)('$name refuses a claim another operator holds', async ({ claim, heldByOther }) => {
    await expect(claim(heldByOther)).rejects.toMatchObject({
      status: 409,
      code: 'claimed_by_other',
    })
  })

  it.each(QUEUES)('$name allows a deliberate take-over and records it', async ({ claim, heldByOther }) => {
    const row = (await claim(heldByOther, { takeOver: true })) as unknown as QueueRow
    expect(row.claim?.ownerId).toBe('USR-1')
    expect(row.claim?.takeovers.at(-1)).toMatchObject({ toUserId: 'USR-1' })
  })

  it.each(QUEUES)('$name releases a claim without destroying it', async ({ release, heldByOther }) => {
    const row = (await release(heldByOther)) as unknown as QueueRow
    expect(row.claim?.state).toBe('released')
    expect(row.claim?.releaseReason).toBe('manual')
  })

  it.each(QUEUES)('$name is failure-injectable on claim as well as on list', async ({ name, claim, heldByOther }) => {
    /* An error state QA can only reach on reads is an error state half-built.
       A claim conflict and a claim *failure* are different screens. */
    const op = `${name === 'applications' ? 'applicants' : name}.claim`
    mockFailures.always(op)
    await expect(claim(heldByOther, { takeOver: true })).rejects.toSatisfy(isApiError)
    mockFailures.clear(op)
    await expect(claim(heldByOther, { takeOver: true })).resolves.toBeDefined()
  })
})

describe('disposition — every queue can be finished, and can refuse', () => {
  it('safety refuses to close with protocol steps outstanding, and names them', async () => {
    await expect(closeSafetyIncident('INC-014')).rejects.toMatchObject({
      status: 422,
      code: 'protocol_incomplete',
    })
    const error = await closeSafetyIncident('INC-014').catch((e) => e)
    expect(error.details.map((d: { field: string }) => d.field)).toEqual([
      'protocol.contact',
      'protocol.verify',
      'protocol.act',
      'protocol.document',
    ])
  })

  it('safety treats the first protocol tick as the first response', async () => {
    /* The SOS sits in the breached band until somebody actually picks up the
       phone; ticking `contact` is what stops it. */
    const before = (await listSafetyIncidents({ pageSize: 100 })).items.find((i) => i.id === 'INC-015')!
    expect(before.firstResponseBreachedAt).not.toBeNull()
    const after = await setSafetyProtocolStep('INC-015', 'contact', true)
    expect(after.firstResponseAt).toBe('2026-06-25T09:14:00+03:00')
    expect(after.firstResponseBreachedAt).toBeNull()
    /* And it does not rewrite the resolve clock. */
    expect(after.slaDueAt).toBe(before.slaDueAt)
  })

  it('safety treats the CLAIM as the acknowledgement — AC-305', async () => {
    /**
     * **The criterion failed in the client, not on the screen.** Claiming used
     * to set `claim` and nothing else, so an incident could be claimed, worked
     * and closed with the acknowledgement clock still reading as never
     * answered. Claiming an SOS *is* picking it up.
     */
    const before = (await listSafetyIncidents({ pageSize: 100 })).items.find(
      (i) => i.id === 'INC-015',
    )!
    expect(before.firstResponseAt).toBeNull()
    expect(before.firstResponseBreachedAt).not.toBeNull()

    const claimed = await claimSafetyIncident('INC-015')
    expect(claimed.firstResponseAt).toBe('2026-06-25T09:14:00+03:00')
    expect(claimed.firstResponseBreachedAt).toBeNull()
    /* Answering is not resolving — the second clock is untouched. */
    expect(claimed.slaDueAt).toBe(before.slaDueAt)
  })

  it('safety never RE-stamps a first response on a second claim', async () => {
    /* First response is *first*. A release and a re-claim, or a supervisor's
       take-over half an hour in, must not un-answer the phone — a stamp that
       moved would measure the last handler's arrival instead of the response. */
    const first = await claimSafetyIncident('INC-015')
    await releaseSafetyIncident('INC-015')
    const second = await claimSafetyIncident('INC-015', { takeOver: true })
    expect(second.firstResponseAt).toBe(first.firstResponseAt)
  })

  it('safety refuses a precautionary suspension when nobody is named', async () => {
    /* `INC-013` is a captain reporting their own collision; `INC-017` was
       raised by a device. Legacy hides the button; an API has to answer. */
    await expect(precautionarilySuspend('INC-017', 'pending review')).rejects.toMatchObject({
      status: 422,
      code: 'no_counterparty',
    })
  })

  it('safety ticks `act` when a suspension is applied', async () => {
    const row = await precautionarilySuspend('INC-016', 'Precautionary — pending INC-016')
    expect(row.precautionarySuspension?.driverId).toBe('DRV-0101')
    expect(row.protocol.find((s) => s.key === 'act')).toMatchObject({ done: true })
  })

  it('fairness refuses a decision with no reason the captain can read', async () => {
    await expect(decideFairnessCase('FC-0001', 'upheld', '   ')).rejects.toMatchObject({
      status: 422,
      code: 'rationale_required',
    })
  })

  it('fairness reinstates on an overturned suspension appeal', async () => {
    const row = await decideFairnessCase('FC-0001', 'overturned', 'Renewal receipt verified.')
    expect(row.status).toBe('overturned')
    expect(row.reinstatedAt).toBe('2026-06-25T09:14:00+03:00')
  })

  it('fairness refuses to decide a case twice', async () => {
    await expect(decideFairnessCase('FC-0007', 'upheld', 'again')).rejects.toMatchObject({
      status: 409,
      code: 'already_decided',
    })
  })

  it('requests refuse to assign a row that is already closed', async () => {
    await expect(assignRequest('REQ-505', 'DRV-0102')).rejects.toMatchObject({
      status: 409,
      code: 'request_not_open',
    })
  })

  it('requests distinguish an operator expiring a row from a rider cancelling it', async () => {
    /* Two dispositions that both close the row and mean opposite things: one is
       "nobody could serve this", the other is "the rider changed their mind".
       Collapsing them loses the only signal that says whether supply failed. */
    const expired = await expireRequest('REQ-501')
    expect(expired.status).toBe('expired')
    expect(expired.cancelledAt).toBeNull()
    const cancelled = (await listRequests({ pageSize: 500 })).items.find((r) => r.id === 'REQ-508')!
    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.expiredAt).toBeNull()
  })

  it('requests keep the breach stamp after a late assignment', async () => {
    const row = await assignRequest('REQ-503', 'DRV-0102')
    expect(row.status).toBe('assigned')
    expect(row.slaBreachedAt).toBe('2026-06-25T09:12:00+03:00')
  })

  it('assurance refuses an "assumed" acknowledgement with nobody carrying the risk', async () => {
    /* `ACK_SOURCE.assumed`: "Not a confirmation. Use only when the leg must
       proceed and somebody has decided to carry the risk" (`:18135`). The note
       is who that somebody is. */
    await expect(acknowledgeLeg('UST-6', 'assumed')).rejects.toMatchObject({
      status: 422,
      code: 'note_required',
    })
    await expect(acknowledgeLeg('UST-6', 'app')).resolves.toMatchObject({
      acknowledgement: { weight: 'strong' },
    })
  })

  it('assurance refuses a second offer while one is outstanding', async () => {
    await expect(offerBackup('UST-3', 'DRV-0101')).rejects.toMatchObject({
      status: 409,
      code: 'offer_outstanding',
    })
  })

  it('absences are waived by addition, never by deletion', async () => {
    useAbsenceHistory()
    const row = await waiveAbsence('ABS-0001', 'Emergency claim upheld')
    expect(row.waived).toBe(true)
    expect(row.waivedReason).toBe('Emergency claim upheld')
    /* The event itself is untouched — tier, date and amount all survive. */
    expect(row).toMatchObject({ tier: 1, occurredAt: '2026-06-08T06:35:00+03:00' })
    resetAssurance()
  })

  it('applications keep their wave-1 dispositions', async () => {
    await expect(rejectApplicant('APP-2202', '')).rejects.toMatchObject({ code: 'reason_required' })
    await expect(approveApplicant('APP-2202')).rejects.toMatchObject({
      code: 'documents_unverified',
    })
  })

  it.each([
    ['requests.assign', () => assignRequest('REQ-501', 'DRV-0101')],
    ['safety.close', () => closeSafetyIncident('INC-011')],
    ['safety.step', () => setSafetyProtocolStep('INC-014', 'contact', true)],
    ['fairness.decide', () => decideFairnessCase('FC-0001', 'upheld', 'stands')],
    ['assurance.acknowledge', () => acknowledgeLeg('UST-6', 'app')],
  ] as const)('%s can be made to fail', async (op, call) => {
    mockFailures.always(op)
    await expect(call()).rejects.toSatisfy(isApiError)
  })
})

describe('My Work is a routing layer, not a sixth queue', () => {
  it('never carries a row its source queue has already disposed of', async () => {
    const work = await listWorkItems({ view: 'everything', pageSize: 500, includeOtherRoles: true })
    const closed = new Set(
      (await listSafetyIncidents({ view: 'closed', pageSize: 100 })).items.map((i) => i.id),
    )
    for (const item of work.items.filter((w) => w.queue === 'incident')) {
      expect(closed.has(item.id), `${item.key} is closed and still in the inbox`).toBe(false)
    }
  })

  it('routes by role without hiding anything', async () => {
    /* "A queue an operator cannot see is a queue nobody owns at 02:00"
       (`:19080`). The default view is narrower; `includeOtherRoles` is one
       call away and is not a permission. */
    const mine = await listWorkItems({ view: 'everything', pageSize: 500 })
    const all = await listWorkItems({ view: 'everything', pageSize: 500, includeOtherRoles: true })
    expect(all.total).toBeGreaterThanOrEqual(mine.total)
    expect(mine.items.every((w) => w.routedToMyRole)).toBe(true)
  })

  it('gives every row a route in the new table, not an executable string', async () => {
    /* Legacy stores `action:"go('safety',null)"` and runs it through
       `new Function` (`:14970`) — a code-injection surface that is also
       unroutable under D1. */
    const work = await listWorkItems({ view: 'everything', pageSize: 500, includeOtherRoles: true })
    for (const item of work.items) {
      expect(item.route, item.key).toMatch(/^\//)
      expect(item.route).not.toContain('(')
    }
  })

  it('backs the nav badge with the same number the screen shows', async () => {
    const mine = await listWorkItems({ view: 'everything', pageSize: 500 })
    const notHeldByOthers = mine.items.filter(
      (w) => w.claim === null || w.claim.state !== 'claimed' || w.claim.ownerId === 'USR-1',
    )
    expect(myWorkBacklogSize()).toBe(notHeldByOthers.length)
  })
})
