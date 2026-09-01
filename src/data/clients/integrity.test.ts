/**
 * The integrity checks — P6-T4.
 *
 * Four properties are worth more than the rest, and each has a test that fails
 * loudly if it stops holding:
 *
 *   1. **Every finding names the check that produced it.** The defining rule.
 *      Asserted over every finding, not a sample.
 *   2. **The `TKT-501` contradiction is found.** Ticket `TKT-501` names rider
 *      `RDR-1041` as *"Mohammed Al-Ghamdi"*; `fixtures/riders.ts:22` calls that
 *      same id *"Nora Al-Harbi"*. It is the acceptance test for the whole pane.
 *   3. **Two runs over unchanged data are identical.** An integrity report that
 *      cannot be diffed cannot be acted on: nobody can tell a new finding from
 *      an old one. This is the test that catches a `Date.now()` or a
 *      `Math.random()` creeping into the check path.
 *   4. **A check reports; it does not repair.** Running every check twice
 *      leaves every collection byte-identical.
 *
 * `mockFailures` is used rather than a spy on a barrel export — a bare
 * `vi.spyOn` on `@/data/clients` does not intercept the live binding, so the
 * negative assertion would pass vacuously.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { disableMockLatency, mockFailures } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { isApiError } from '../types/common'
import { INTEGRITY_CHECK_IDS } from '../types/integrity'
import type { IntegrityFinding } from '../types/integrity'
import { listIntegrityChecks, resetIntegrity, runIntegrityChecks } from './integrity'
import { listDrivers } from './drivers'
import { listRiders } from './riders'
import { listSubscriptions } from './subscriptions'
import { listTickets } from './tickets'
import { listTrips } from './trips'

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
  resetIntegrity()
})

const findingsOf = (findings: readonly IntegrityFinding[], checkId: string) =>
  findings.filter((f) => f.checkId === checkId)

describe('the rule: every finding names the check that produced it', () => {
  it('carries a checkId from the closed set on every single row', async () => {
    const run = await runIntegrityChecks()
    expect(run.findings.length).toBeGreaterThan(0)
    for (const finding of run.findings) {
      expect(INTEGRITY_CHECK_IDS).toContain(finding.checkId)
      /* The id encodes its own provenance too, so a row copied out of the table
         into a bug report still says where it came from. */
      expect(finding.id.startsWith(`${finding.checkId}|`)).toBe(true)
    }
  })

  it('exposes one catalogue entry per check id, and no strays', async () => {
    const checks = await listIntegrityChecks()
    expect(checks.map((c) => c.id).sort()).toEqual([...INTEGRITY_CHECK_IDS].sort())
  })
})

describe('the acceptance test — TKT-501 contradicts RDR-1041', () => {
  it('finds the ticket that calls a rider by another person’s name', async () => {
    const run = await runIntegrityChecks()
    const found = run.findings.find((f) => f.entityId === 'TKT-501' && f.field === 'entityName')

    expect(found).toBeDefined()
    expect(found?.checkId).toBe('agree.party-name')
    expect(found?.entityType).toBe('ticket')
    expect(found?.counterpartId).toBe('RDR-1041')
    /* Keyed, never an assembled sentence: the wording is the screen's. */
    expect(found?.detail.key).toBe('integrity.detail.nameDisagrees')
    expect(found?.detail.params).toMatchObject({
      id: 'RDR-1041',
      carried: 'Mohammed Al-Ghamdi',
      canonical: 'Nora Al-Harbi',
    })
  })

  it('finds the same fault on TKT-504, which nobody had recorded', async () => {
    const run = await runIntegrityChecks()
    const found = run.findings.find((f) => f.entityId === 'TKT-504' && f.field === 'entityName')
    expect(found?.detail.params).toMatchObject({ id: 'DRV-0104', carried: 'Sultan Al-Harbi' })
  })

  /**
   * A dangling id is `ref.*`'s finding. Reporting it a second time as a name
   * disagreement would double-count one fault and would put a nonsense sentence
   * on the row — *"the record's own name is undefined"*.
   *
   * Asserted as a **property over every row** rather than against a named
   * fixture: this suite ran against a book where `RDR-1042` did not exist and
   * against one where it does, and the invariant is the same in both.
   */
  it('compares a name only when the id resolves, so a dangling id is never counted twice', async () => {
    const run = await runIntegrityChecks()
    const [riders, drivers] = await Promise.all([
      listRiders({ pageSize: 1000 }),
      listDrivers({ pageSize: 1000 }),
    ])
    const known = new Set([...riders.items.map((r) => r.id), ...drivers.items.map((d) => d.id)])

    const names = findingsOf(run.findings, 'agree.party-name')
    expect(names.length).toBeGreaterThan(0)
    for (const finding of names) {
      expect(finding.counterpartId).not.toBeNull()
      expect(known.has(finding.counterpartId ?? '')).toBe(true)
      expect(finding.detail.params?.canonical).toBeTypeOf('string')
    }
  })
})

describe('determinism', () => {
  it('two runs over unchanged data produce identical findings', async () => {
    const first = await runIntegrityChecks()
    const second = await runIntegrityChecks()
    expect(second.findings).toEqual(first.findings)
    expect(second.recordsScanned).toBe(first.recordsScanned)
  })

  it('stamps the fixed clock, never the wall clock', async () => {
    const run = await runIntegrityChecks()
    expect(run.ranAt).toBe(EYVAR_NOW)
    for (const check of run.checks) {
      expect(check.lastRunAt).toBe(EYVAR_NOW)
    }
  })

  it('mints run ids from a counter that the reset takes back to one', async () => {
    expect((await runIntegrityChecks()).id).toBe('IRUN-0001')
    expect((await runIntegrityChecks()).id).toBe('IRUN-0002')
    resetIntegrity()
    expect((await runIntegrityChecks()).id).toBe('IRUN-0001')
  })

  it('orders findings by severity first, so an alert is never below a warning', async () => {
    const run = await runIntegrityChecks()
    const rank = { critical: 0, warning: 1, advisory: 2 }
    const ranks = run.findings.map((f) => rank[f.severity])
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks)
  })
})

describe('a check reports; it does not repair', () => {
  it('leaves every collection it read exactly as it found it', async () => {
    const before = {
      tickets: await listTickets({ pageSize: 1000 }),
      riders: await listRiders({ pageSize: 1000 }),
      trips: await listTrips({ pageSize: 1000 }),
    }
    await runIntegrityChecks()
    await runIntegrityChecks()
    expect(await listTickets({ pageSize: 1000 })).toEqual(before.tickets)
    expect(await listRiders({ pageSize: 1000 })).toEqual(before.riders)
    expect(await listTrips({ pageSize: 1000 })).toEqual(before.trips)
  })
})

describe('"not run" and "found nothing" are different facts', () => {
  it('reports null before a run and a number after one', async () => {
    const before = await listIntegrityChecks()
    for (const check of before) {
      expect(check.lastRunAt).toBeNull()
      expect(check.findingCount).toBeNull()
      expect(check.recordsScanned).toBeNull()
    }

    const run = await runIntegrityChecks()
    /* At least one check passes against the seeded data, and it must report
       `0` — not `null`, which would read as "never run". */
    const clean = run.checks.filter((c) => c.findingCount === 0)
    expect(clean.length).toBeGreaterThan(0)
    for (const check of clean) {
      expect(check.lastRunAt).toBe(EYVAR_NOW)
      expect(check.recordsScanned).not.toBeNull()
    }
  })

  it('a single-check run stamps only that check', async () => {
    const run = await runIntegrityChecks({ checkIds: ['money.journal-balance'] })
    expect(run.checkIds).toEqual(['money.journal-balance'])
    const stamped = run.checks.filter((c) => c.lastRunAt !== null)
    expect(stamped.map((c) => c.id)).toEqual(['money.journal-balance'])
    expect(run.findings.every((f) => f.checkId === 'money.journal-balance')).toBe(true)
  })
})

describe('what the checks find against the seeded data', () => {
  /**
   * The contract of the whole `ref.*` family, asserted as a property rather
   * than against named rows.
   *
   * **This test found real dangling ids and then watched them be fixed** — the
   * fixture layer closed `RDR-1042`…`RDR-1049` and `SUB-1042`…`SUB-1045` while
   * this pane was being built. An assertion pinned to those ids would now be
   * asserting that a defect still exists. What must always hold is the other
   * direction: a reference finding is only ever raised for an id that genuinely
   * does not resolve. Zero findings is the goal state and passes.
   */
  it('never reports a reference that actually resolves', async () => {
    const run = await runIntegrityChecks()
    const [riders, drivers, trips, subs] = await Promise.all([
      listRiders({ pageSize: 1000 }),
      listDrivers({ pageSize: 1000 }),
      listTrips({ pageSize: 1000 }),
      listSubscriptions({ pageSize: 1000 }),
    ])
    const known: Record<string, Set<string>> = {
      rider: new Set(riders.items.map((r) => r.id)),
      driver: new Set(drivers.items.map((d) => d.id)),
      trip: new Set(trips.items.map((t) => t.id)),
      subscription: new Set(subs.items.map((s) => s.id)),
    }

    const refs = run.findings.filter((f) => f.checkId.startsWith('ref.'))
    for (const finding of refs) {
      const collection = finding.counterpartType === null ? null : known[finding.counterpartType]
      if (!collection || finding.counterpartId === null) continue
      expect(collection.has(finding.counterpartId)).toBe(false)
    }
  })

  /**
   * Legacy `:20441`, ported verbatim in intent: *"a gap is only an ALERT when
   * the window itself is empty… a total larger than the window is expected and
   * must not shout, or the alert stops being read."*
   *
   * So the assertion is the **negative** one, and it holds whether the book is
   * dirty or clean: nobody with trips on file may appear here, however far
   * their stored total exceeds what we hold.
   */
  it('reports a lifetime total with nothing behind it, and never a merely larger one', async () => {
    const run = await runIntegrityChecks()
    const trips = await listTrips({ pageSize: 1000 })
    const withTrips = new Set(trips.items.map((t) => t.riderId))
    const rows = findingsOf(run.findings, 'agree.aggregate-vs-records')

    for (const row of rows.filter((r) => r.entityType === 'rider')) {
      expect(withTrips.has(row.entityId)).toBe(false)
    }
    /* `RDR-1041` stores 42 trips and we hold a handful. Expected, not a fault. */
    expect(rows.map((r) => r.entityId)).not.toContain('RDR-1041')
  })

  it('reports a fare that does not split, with the residual in whole halalas', async () => {
    const run = await runIntegrityChecks()
    const rows = findingsOf(run.findings, 'money.trip-split')
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.deltaHalalas).not.toBeNull()
      expect(Number.isInteger(row.deltaHalalas)).toBe(true)
      expect(row.deltaHalalas).not.toBe(0)
    }
  })

  it('finds the subscription still showing escrow that has been released', async () => {
    const run = await runIntegrityChecks()
    const row = findingsOf(run.findings, 'agree.escrow-amount').find((f) => f.entityId === 'SUB-1060')
    expect(row?.detail.key).toBe('integrity.detail.escrowAfterRelease')
    expect(row?.counterpartId).toBe('ESC-1060')
  })

  it('passes on the ledger: every journal entry balances and every subject resolves', async () => {
    const run = await runIntegrityChecks()
    expect(findingsOf(run.findings, 'money.journal-balance')).toHaveLength(0)
    expect(findingsOf(run.findings, 'ref.ledger-subject')).toHaveLength(0)
    expect(findingsOf(run.findings, 'money.wallet-balance')).toHaveLength(0)
  })

  it('money findings carry integer halalas and never a formatted string', async () => {
    const run = await runIntegrityChecks()
    for (const finding of run.findings) {
      for (const [name, value] of Object.entries(finding.detail.params ?? {})) {
        if (!name.endsWith('Halalas')) continue
        expect(typeof value).toBe('number')
        expect(Number.isInteger(value)).toBe(true)
      }
    }
  })
})

describe('the error state is reachable', () => {
  it('fails the run when the scan itself is rigged to fail', async () => {
    mockFailures.once('integrity.run')
    await expect(runIntegrityChecks()).rejects.toSatisfy(isApiError)
  })

  it('fails the run when one of the reads underneath it fails', async () => {
    /* Two distinct error states, and both must be reachable: the scan failing
       and its source failing. A pane that could only reach one would ship one. */
    mockFailures.once('trips.list')
    await expect(runIntegrityChecks()).rejects.toSatisfy(isApiError)
  })

  it('refuses a run that names no known check rather than reporting a clean book', async () => {
    await expect(
      runIntegrityChecks({ checkIds: ['not.a.check' as never] }),
    ).rejects.toThrow(/No integrity check/u)
  })
})
