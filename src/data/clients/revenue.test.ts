/**
 * **Document numbering — the only thing this file is about.**
 *
 * `issueRefund`'s money behaviour is covered by `financials.test.ts`
 * (AC-336 – AC-338, AC-356, AC-357). What is covered here is the rule those
 * tests depend on and none of them states: **the next document number comes
 * from a seeded constant, not from `fixtures.length`.**
 *
 * The defect this closes is a test that could not be satisfied and a fixture
 * that could not grow. `financials.test.ts:569` asserts the first issued refund
 * is `REF-0004`; while the sequence read `refundFixtures.length`, a fourth
 * seeded refund silently renamed it `REF-0005` and that assertion failed — so
 * `refundFixtures` and `creditNoteFixtures` stayed frozen at three rows, and
 * `fixtures/disputes.ts` had to write `refundId: null` on every seeded
 * resolution to avoid naming a number the mint would later reissue.
 *
 * So the fixtures module is **mocked here, with rows added**, because that is
 * exactly the scenario. This file proves the mint does not move when the
 * fixtures grow — a claim no test against the real three-row fixture can make.
 *
 * ## Two mechanics that look like ceremony and are not
 *
 * 1. **The mocked arrays are mutated, not replaced.** A `vi.mock` factory runs
 *    once and its module instance is cached, so returning a fresh array per
 *    rebuild would freeze the rows at whatever the first call saw. The arrays
 *    the factory returns are these two, and a test pushes into them.
 * 2. **The client is imported dynamically, after `vi.resetModules()`.**
 *    `src/test/setup.ts` imports `@/data/clients` for its `resetDataLayer`
 *    hook, which loads `revenue.ts` — and the **real** fixtures module — before
 *    any test file's `vi.mock` is registered. A statically imported client has
 *    already closed over the real arrays and never sees the mock, which makes
 *    every assertion here pass for the wrong reason. Rebuilding the graph is
 *    what makes the test able to fail.
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreditNote, Refund } from '../types/financials'

/** The arrays the mocked module hands the client. Mutated, never replaced. */
const live = vi.hoisted(() => ({
  refunds: [] as Refund[],
  creditNotes: [] as CreditNote[],
  seededRefunds: 0,
  seededCreditNotes: 0,
}))

vi.mock('../fixtures/financials', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../fixtures/financials')>()
  live.refunds.push(...actual.refundFixtures)
  live.creditNotes.push(...actual.creditNoteFixtures)
  live.seededRefunds = live.refunds.length
  live.seededCreditNotes = live.creditNotes.length
  return { ...actual, refundFixtures: live.refunds, creditNoteFixtures: live.creditNotes }
})

/** The refunds client, rebuilt against whatever the mocked arrays now hold. */
async function loadClient() {
  vi.resetModules()
  const config = await import('../config')
  config.disableMockLatency()
  config.mockFailures.clear()
  return import('./revenue')
}

/** A seeded row that is not a copy of anything these tests issue. */
function seededRefund(id: string): Refund {
  return {
    id,
    issuedAt: '2026-06-23T10:00:00+03:00',
    riderId: 'RDR-2087',
    riderName: 'Layla Al-Faraj',
    amountHalalas: 1_234,
    reasonCode: 'BKG_NO_SUPPLY',
    destination: 'instrument',
    sourcePaymentId: 'PAY-5988',
    relatedId: 'SUB-0998',
    processedByUserId: 'USR-2',
    processedByUserName: 'Fahad Al-Dosari',
    postingId: `${id}-P`,
    creditNoteId: `CN-${id.slice(-4)}`,
    settlement: 'settled',
  }
}

function seededCreditNote(id: string, refundId: string): CreditNote {
  return {
    id,
    noteNumber: `EYV-CN-2026-${id.slice(-4).padStart(6, '0')}`,
    refundId,
    buyerId: 'RDR-2087',
    buyerName: 'Layla Al-Faraj',
    subtotalHalalas: 1_073,
    vatHalalas: 161,
    totalHalalas: 1_234,
    againstInvoice: null,
    againstPaymentId: null,
    unlinked: true,
    issuedAt: '2026-06-23T10:00:00+03:00',
    issuedByUserId: 'USR-2',
  }
}

type RevenueClient = Awaited<ReturnType<typeof loadClient>>

const issue = (client: RevenueClient, amountHalalas: number) =>
  client.issueRefund({
    riderId: 'RDR-1041',
    amountHalalas,
    reasonCode: 'PAY_REFUND_REQ',
    destination: 'wallet',
  })

/** Run the factory once, so the seeded counts are known before any test adds a row. */
beforeAll(async () => {
  await import('../fixtures/financials')
})

beforeEach(() => {
  live.refunds.length = live.seededRefunds
  live.creditNotes.length = live.seededCreditNotes
})

describe('issueRefund — document numbering', () => {
  it('starts from the real three seeded rows', () => {
    expect(live.seededRefunds).toBe(3)
    expect(live.seededCreditNotes).toBe(3)
    expect(live.refunds.map((r) => r.id)).toEqual(['REF-0001', 'REF-0002', 'REF-0003'])
  })

  it('mints REF-0004 and CN-0004 first, the numbers the suite names', async () => {
    const client = await loadClient()
    const { refund, creditNote } = await issue(client, 4_000)
    expect(refund.id).toBe('REF-0004')
    expect(creditNote.id).toBe('CN-0004')
    expect(creditNote.noteNumber).toBe('EYV-CN-2026-000004')
    expect(refund.creditNoteId).toBe('CN-0004')
    expect(creditNote.refundId).toBe('REF-0004')
  })

  it('does not move REF-0004 when a fourth refund fixture is seeded', async () => {
    // The exact change the fixture owner could not make. Under the old
    // `refundFixtures.length` rule this line renamed the minted refund
    // `REF-0005` and `financials.test.ts:569` failed.
    live.refunds.push(seededRefund('REF-0011'))
    const client = await loadClient()

    const { refund, creditNote } = await issue(client, 4_000)
    expect(refund.id).toBe('REF-0004')
    expect(creditNote.id).toBe('CN-0004')
  })

  it('does not move CN-0004 when credit notes grow with the refunds', async () => {
    // A CreditNote requires a refundId, so the two fixtures grow together —
    // that coupling is real and stays. The coupling to array *length* is gone.
    live.refunds.push(seededRefund('REF-0011'))
    live.creditNotes.push(seededCreditNote('CN-0011', 'REF-0011'))
    const client = await loadClient()

    const { refund, creditNote } = await issue(client, 4_000)
    expect(refund.id).toBe('REF-0004')
    expect(creditNote.id).toBe('CN-0004')
    expect(creditNote.noteNumber).toBe('EYV-CN-2026-000004')
  })

  it('holds while either fixture grows by three', async () => {
    for (const id of ['REF-0007', 'REF-0011', 'REF-0099']) live.refunds.push(seededRefund(id))
    live.creditNotes.push(
      seededCreditNote('CN-0007', 'REF-0007'),
      seededCreditNote('CN-0011', 'REF-0011'),
      seededCreditNote('CN-0099', 'REF-0099'),
    )
    const client = await loadClient()

    const { refund, creditNote } = await issue(client, 4_000)
    expect(refund.id).toBe('REF-0004')
    expect(creditNote.id).toBe('CN-0004')
    expect(live.refunds).toHaveLength(live.seededRefunds + 3)
  })

  it('steps past an id already on file rather than issuing it twice', async () => {
    // The other half of the fix: a fixture may take any free number, including
    // one inside the minted range, and the mint deterministically skips it
    // instead of minting a second document with the same id.
    live.refunds.push(seededRefund('REF-0004'), seededRefund('REF-0005'))
    const client = await loadClient()

    const { refund } = await issue(client, 4_000)
    expect(refund.id).toBe('REF-0006')
    const ids = [...live.refunds.map((r) => r.id), refund.id]
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('skips a taken credit-note number independently of the refund number', async () => {
    live.creditNotes.push(seededCreditNote('CN-0004', 'REF-0003'))
    const client = await loadClient()

    const { refund, creditNote } = await issue(client, 4_000)
    expect(refund.id).toBe('REF-0004')
    expect(creditNote.id).toBe('CN-0005')
    expect(creditNote.noteNumber).toBe('EYV-CN-2026-000005')
    expect(refund.creditNoteId).toBe('CN-0005')
  })

  it('names the posting it actually wrote, whatever number it minted', async () => {
    live.refunds.push(seededRefund('REF-0004'))
    const client = await loadClient()

    const { refund } = await issue(client, 4_000)
    expect(refund.id).toBe('REF-0005')
    expect(refund.postingId).toBe('REF-0005-P')
  })

  it('carries the sequence forward within a session, gaplessly', async () => {
    const client = await loadClient()
    const first = await issue(client, 4_000)
    const second = await issue(client, 5_000)
    const third = await issue(client, 6_000)
    expect([first.refund.id, second.refund.id, third.refund.id]).toEqual([
      'REF-0004',
      'REF-0005',
      'REF-0006',
    ])
    expect([first.creditNote.id, second.creditNote.id, third.creditNote.id]).toEqual([
      'CN-0004',
      'CN-0005',
      'CN-0006',
    ])
  })

  it('returns to the seeded constant on reset, so one test never numbers the next', async () => {
    const client = await loadClient()
    await issue(client, 4_000)
    await issue(client, 5_000)

    /* The ledger holds `REF-0004-P` and is reset with the refunds — the two go
       together, exactly as `resetDataLayer` does it. */
    const ledger = await import('./ledger')
    client.resetRevenue()
    ledger.resetLedger()

    const { refund } = await issue(client, 4_000)
    expect(refund.id).toBe('REF-0004')
  })
})
