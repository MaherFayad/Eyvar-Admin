/**
 * **The captain profile's three derived reads, and the arithmetic under them.**
 *
 * `clients/riders.test.ts` guards one merged money list against one balance.
 * This guards a harder shape: `getDriverMoneyMovements` merges **two subject
 * ledgers with opposite normal sides** plus two off-ledger sources, and states
 * five figures over the top of them. There are five ways for the rows to stop
 * adding up to the numbers printed above them, and each one has a test here.
 *
 * It also pins, with the arithmetic written out, the things that **do not
 * reconcile in the fixtures** — a hold whose trip count disagrees with its own
 * subscription, forty-six escrow releases and thirty-seven applied deductions
 * that never reached the captain's payable ledger, and a payout document that
 * disagrees with its posting. Those are asserted at their present values so
 * that "fixing" one by editing a figure fails here and says which. The rule is
 * the one `riders.test.ts` set: a test that only asserted the happy identity
 * would let somebody reconcile the books by moving a number.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { disableMockLatency, mockFailures } from '../config'
import { fixtures } from '../mock/fixtures'
import { DRIVER_BALANCE_ACCOUNT } from '../types/driver'
import { CHART_OF_ACCOUNTS, isPendingSettlement } from '../types/ledger'
import { isOpenTripStatus } from '../types/trip'
import {
  getDriver,
  getDriverMoneyMovements,
  getDriverSupportPresence,
  getDriverTimeline,
  listDrivers,
} from './drivers'

/** The captain both profile surfaces are designed against — `RDR-4002`'s twin. */
const D = 'DRV-0101'

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
})

/** Every captain, once, so an invariant is checked against the population and not a sample. */
async function everyCaptain(): Promise<string[]> {
  const page = await listDrivers({ pageSize: 200 })
  return page.items.map((d) => d.id)
}

/** `credit` on a credit-normal account, `debit` on a debit-normal one. */
function signedOnNormalSide(
  rows: ReadonlyArray<{ direction: 'debit' | 'credit'; amountHalalas: number }>,
  balance: 'payable' | 'cash-debt',
): number {
  const normalSide = CHART_OF_ACCOUNTS.find((a) => a.key === DRIVER_BALANCE_ACCOUNT[balance])!.normalSide
  return rows.reduce(
    (sum, r) => sum + (r.direction === normalSide ? r.amountHalalas : -r.amountHalalas),
    0,
  )
}

/* ── the seam's four properties, for the three operations this file adds ── */

describe('the three new operations are seam-shaped', () => {
  it('returns Promises', async () => {
    await expect(getDriverTimeline(D)).resolves.toBeDefined()
    await expect(getDriverMoneyMovements(D)).resolves.toBeDefined()
    await expect(getDriverSupportPresence(D)).resolves.toBeDefined()
  })

  it.each([
    ['drivers.timeline', () => getDriverTimeline(D)],
    ['drivers.movements', () => getDriverMoneyMovements(D)],
    ['drivers.support', () => getDriverSupportPresence(D)],
  ])('%s failure is injectable', async (op, call) => {
    mockFailures.always(op)
    await expect(call()).rejects.toThrow()
    mockFailures.clear(op)
    await expect(call()).resolves.toBeDefined()
  })

  it('404s on an unknown captain, naming the id', async () => {
    await expect(getDriverTimeline('DRV-NOPE')).rejects.toMatchObject({ status: 404 })
    await expect(getDriverMoneyMovements('DRV-NOPE')).rejects.toMatchObject({ status: 404 })
    await expect(getDriverSupportPresence('DRV-NOPE')).rejects.toMatchObject({ status: 404 })
  })

  it('is deterministic — two calls, identical data', async () => {
    expect(await getDriverMoneyMovements(D)).toStrictEqual(await getDriverMoneyMovements(D))
    expect(await getDriverTimeline(D)).toStrictEqual(await getDriverTimeline(D))
    expect(await getDriverSupportPresence(D)).toStrictEqual(await getDriverSupportPresence(D))
  })
})

/* ── the reconciliation ─────────────────────────────────────────────────── */

describe('the money movements reconcile', () => {
  /**
   * **The test that must fail if a fixture amount is edited on one side only.**
   *
   * Two ledgers, two normal sides, one list. The `payable` rows sum
   * credit-positive to `payableHalalas`; the `cash-debt` rows sum
   * **debit-positive** to `cashDebtHalalas`, because `ar.driver` is an asset.
   * The side is read off `CHART_OF_ACCOUNTS` through `DRIVER_BALANCE_ACCOUNT`
   * rather than written out here, so the test and the type cannot disagree
   * about which way a row counts.
   */
  it('sums each ledger’s rows to its own balance, for every captain', async () => {
    const wrong: string[] = []
    for (const id of await everyCaptain()) {
      const m = await getDriverMoneyMovements(id)
      const payable = signedOnNormalSide(
        m.movements.filter((r) => r.countsToward === 'payable'),
        'payable',
      )
      const debt = signedOnNormalSide(
        m.movements.filter((r) => r.countsToward === 'cash-debt'),
        'cash-debt',
      )
      if (payable !== m.payableHalalas) {
        wrong.push(`${id}: payable rows sum to ${payable}, envelope says ${m.payableHalalas}`)
      }
      if (debt !== m.cashDebtHalalas) {
        wrong.push(`${id}: cash-debt rows sum to ${debt}, envelope says ${m.cashDebtHalalas}`)
      }
    }
    expect(wrong, 'a movements list that does not add up to the balances above it').toEqual([])
  })

  /**
   * The payouts index and the captain profile are two views of two numbers, and
   * they cannot drift because neither carries them: `clients/payouts.ts` and
   * this client both read `subjectClosingBalance`. This is the assertion that
   * stops either one growing a copy.
   */
  it('states the same payable and cash debt as the payouts index', async () => {
    const { captainPayoutFixtures } = fixtures()
    const wrong: string[] = []
    for (const row of captainPayoutFixtures) {
      const m = await getDriverMoneyMovements(row.captainId)
      if (m.payableHalalas !== row.payableHalalas) {
        wrong.push(`${row.captainId}: profile ${m.payableHalalas}, payouts ${row.payableHalalas}`)
      }
      if (m.cashDebtHalalas !== row.cashDebtHalalas) {
        wrong.push(`${row.captainId}: profile debt ${m.cashDebtHalalas}, payouts ${row.cashDebtHalalas}`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('states escrow held, payout in flight and pending deductions as sums of what is on file', async () => {
    const { escrowHoldFixtures, deductionFixtures, paymentFixtures } = fixtures()
    const wrong: string[] = []
    for (const id of await everyCaptain()) {
      const m = await getDriverMoneyMovements(id)
      const escrow = escrowHoldFixtures
        .filter((e) => e.captainId === id && e.settlement === 'held')
        .reduce((s, e) => s + e.amountHalalas, 0)
      const inFlight = paymentFixtures
        .filter((p) => p.captainId === id && p.direction === 'outbound' && isPendingSettlement(p.settlement))
        .reduce((s, p) => s + p.amountHalalas, 0)
      const pending = deductionFixtures
        .filter((d) => d.captainId === id && d.status === 'pending')
        .reduce((s, d) => s + d.amountHalalas, 0)
      if (escrow !== m.escrowHeldHalalas) wrong.push(`${id}: escrow ${escrow} vs ${m.escrowHeldHalalas}`)
      if (inFlight !== m.payoutInFlightHalalas) wrong.push(`${id}: in flight ${inFlight} vs ${m.payoutInFlightHalalas}`)
      if (pending !== m.pendingDeductionsHalalas) {
        wrong.push(`${id}: pending deductions ${pending} vs ${m.pendingDeductionsHalalas}`)
      }
      /* Where the rider's `heldHalalas` has to be summed over the source
         collection because its de-dup drops rows, this one is exactly the
         listed rows — nothing is dropped on the way in. */
      const listedPayouts = m.movements
        .filter((r) => r.source === 'payout')
        .reduce((s, r) => s + r.amountHalalas, 0)
      const listedEscrow = m.movements
        .filter((r) => r.source === 'escrow')
        .reduce((s, r) => s + r.amountHalalas, 0)
      if (listedPayouts !== m.payoutInFlightHalalas) wrong.push(`${id}: payout rows ${listedPayouts}`)
      if (listedEscrow !== m.escrowHeldHalalas) wrong.push(`${id}: escrow rows ${listedEscrow}`)
    }
    expect(wrong).toEqual([])
  })

  /**
   * **`DRV-0101`, with the arithmetic spelled out.**
   *
   *     +640.00  15 Jun  earnings accrual   settled   → payable
   *      +12.60  25 Jun  TRP-9005 earnings  settled   → payable
   *                                                     ─────── 652.60 ✓
   *       +3.15  25 Jun  cash commission    settled   → cash debt
   *      +20.00  25 Jun  cash top-up held   settled   → cash debt
   *                                                     ───────  23.15 ✓
   *      +69.20  05 Jun  ESC-1041 held                → in neither
   *      +69.20  21 Jun  ESC-1075 held                → in neither  138.40 held
   *     −640.00  25 Jun  PAY-W640 pending             → in neither  640.00 in flight
   *
   *     a captain-relative signed sum of all seven = +127.85, the balance of nothing
   *
   * The `127.85` is asserted **on purpose**, the same way `riders.test.ts`
   * asserts a `38.00` that is not a balance. If a later edit "reconciles" the
   * list by moving a figure to it, or by dropping the rows that make the sum
   * come out, this fails and says which.
   */
  it('DRV-0101: seven movements, 652.60 payable, 23.15 owed, 138.40 held, 640.00 in flight', async () => {
    const m = await getDriverMoneyMovements(D)

    expect(m.movements.map((r) => [r.id, r.source, r.direction, r.amountHalalas, r.countsToward])).toEqual([
      ['ARD-0101-2', 'receivable', 'debit', 2_000, 'cash-debt'],
      ['ARD-0101-1', 'receivable', 'debit', 315, 'cash-debt'],
      ['PAY-0101-2', 'payable', 'credit', 1_260, 'payable'],
      ['PAY-W640', 'payout', 'debit', 64_000, null],
      ['ESC-1075', 'escrow', 'credit', 6_920, null],
      ['PAY-0101-1', 'payable', 'credit', 64_000, 'payable'],
      ['ESC-1041', 'escrow', 'credit', 6_920, null],
    ])

    expect(m.payableHalalas).toBe(65_260)
    expect(m.cashDebtHalalas).toBe(2_315)
    expect(m.escrowHeldHalalas).toBe(13_840)
    expect(m.payoutInFlightHalalas).toBe(64_000)
    expect(m.pendingDeductionsHalalas).toBe(0)

    const signed = m.movements.reduce(
      (s, r) => s + (r.direction === 'credit' ? r.amountHalalas : -r.amountHalalas),
      0,
    )
    expect(
      signed,
      'the whole list does not sum to any balance, and the card must not claim it does',
    ).toBe(12_785)

    /* The two off-ledger sources carry no running balance, because neither is
       on a captain-scoped ledger. */
    expect(
      m.movements.filter((r) => r.source === 'escrow' || r.source === 'payout').every((r) => r.balanceAfterHalalas === null),
    ).toBe(true)
    expect(m.movements.find((r) => r.id === 'PAY-W640')!.paymentId).toBe('PAY-W640')
    expect(m.movements.find((r) => r.id === 'ESC-1041')!.escrowId).toBe('ESC-1041')
  })

  it('is newest-first and never lists one movement of money twice', async () => {
    for (const id of await everyCaptain()) {
      const { movements } = await getDriverMoneyMovements(id)
      const ids = movements.map((r) => r.id)
      expect(new Set(ids).size, id).toBe(ids.length)
      const times = movements.map((r) => Date.parse(r.at))
      expect([...times].sort((a, b) => b - a), id).toEqual(times)
    }
  })

  it('carries positive integer amounts only — the sign is `direction`', async () => {
    const bad: string[] = []
    for (const id of await everyCaptain()) {
      const { movements } = await getDriverMoneyMovements(id)
      for (const r of movements) {
        if (!Number.isInteger(r.amountHalalas) || r.amountHalalas <= 0) {
          bad.push(`${id}/${r.id}: ${r.amountHalalas}`)
        }
      }
    }
    expect(bad, 'types/ledger.ts §3.1 — postings are unsigned').toEqual([])
  })

  /**
   * **The judgement this client is mostly about, asserted so it cannot be
   * quietly undone.**
   *
   * `Payment.captainId` on an *inbound* payment means *"the captain who drove
   * the trip that was paid for"* (`types/payment.ts`), not *"the captain whose
   * money this is"*. `DRV-0101` is named on eighteen of them. If somebody
   * widens the payment filter to `captainId === id`, this fails.
   */
  it('lists no inbound payment, however many name the captain', async () => {
    const { paymentFixtures } = fixtures()
    const inbound = paymentFixtures.filter((p) => p.captainId === D && p.direction === 'inbound')
    expect(inbound.length, 'the fixture that makes this test worth having').toBeGreaterThan(10)

    const { movements } = await getDriverMoneyMovements(D)
    const listed = new Set(movements.map((r) => r.id))
    expect(inbound.filter((p) => listed.has(p.id))).toEqual([])
  })

  /**
   * A settled or reversed payout is already in the list **as its posting**, and
   * the ledger is the record. `PAY-W820` names its posting outright;
   * `PAY-W900` does not — which is why the rule is *"the posting always wins"*
   * rather than *"de-dup on `postingId`"*. On the weaker rule `DRV-0104` would
   * read 1,355.00 of payout against 900.00 of movement.
   */
  it('lists only the payout that has not settled, because the ledger cannot hold that one', async () => {
    expect((await getDriverMoneyMovements('DRV-0102')).movements.some((r) => r.id === 'PAY-W820')).toBe(false)
    expect((await getDriverMoneyMovements('DRV-0104')).movements.some((r) => r.id === 'PAY-W900')).toBe(false)
    expect((await getDriverMoneyMovements(D)).movements.some((r) => r.id === 'PAY-W640')).toBe(true)
  })

  it('reaches a negative payable and a negative cash debt without hand-editing a fixture', async () => {
    /* `DRV-0202` owes on the payable — an absentee's forfeited cover cost.
       `DRV-0104` is in credit on the receivable: Eyvar owes them 4.40. Both are
       states a money screen has to render and neither is an error. */
    expect((await getDriverMoneyMovements('DRV-0202')).payableHalalas).toBe(-1_500)
    expect((await getDriverMoneyMovements('DRV-0104')).cashDebtHalalas).toBe(-440)
  })

  it('reaches a captain whose money list is completely empty', async () => {
    /* `DRV-0203` was approved yesterday and has never driven. Every figure is
       `0` and the list is empty — the "nothing has happened yet" empty, which
       is a different sentence from "your filter matched nothing" (R8). */
    const m = await getDriverMoneyMovements('DRV-0203')
    expect(m.movements).toEqual([])
    expect([m.payableHalalas, m.cashDebtHalalas, m.escrowHeldHalalas, m.payoutInFlightHalalas]).toEqual([0, 0, 0, 0])
  })
})

/* ── what the fixtures do NOT reconcile ─────────────────────────────────── */

describe('the reconciliations that fail, pinned at their present values', () => {
  /**
   * **An escrow hold and its own subscription disagree about the trips
   * delivered**, on the reference captain, and the two drive different things:
   * the hold's counts decide whether `Release` is offered (AC-365), the
   * subscription's drive the plan meter.
   *
   * `ESC-1041` says 4 of 5 and `fixtures/financials.ts` says in as many words
   * that *"`Release` renders disabled in place"* because of it. `SUB-1041` says
   * 5 of 5 and is `expiring`. One of them is wrong and **neither is adjusted
   * here** — which is right depends on whether a plan's fifth trip was
   * delivered, and nothing in this layer knows.
   *
   * It is the only hold in the set whose counts disagree with its plan.
   */
  it('names ESC-1041, the one hold whose trip count its subscription denies', () => {
    const { escrowHoldFixtures, allSubscriptionFixtures } = fixtures()
    const disagreeing = escrowHoldFixtures
      .filter((e) => e.settlement === 'held')
      .filter((e) => {
        const sub = allSubscriptionFixtures.find((s) => s.id === e.subscriptionId)
        return !sub || sub.tripsCompleted !== e.tripsCompleted || sub.tripsIncluded !== e.tripsRequired
      })
      .map((e) => e.id)
    expect(disagreeing).toEqual(['ESC-1041'])

    const hold = escrowHoldFixtures.find((e) => e.id === 'ESC-1041')!
    const sub = allSubscriptionFixtures.find((s) => s.id === 'SUB-1041')!
    expect([hold.tripsCompleted, hold.tripsRequired]).toEqual([4, 5])
    expect([sub.tripsCompleted, sub.tripsIncluded]).toEqual([5, 5])
  })

  /**
   * **AC-364 and AC-371 each say *posting*, and the volume rows do not have
   * one.**
   *
   * `releaseEscrow` credits `liability.driver`; `applyDeduction` debits it.
   * Forty-six released holds and thirty-seven applied deductions in the fixture
   * were written as documents without their postings, so 7,903.03 of released
   * escrow and 825.00 of applied deductions never reached a captain's payable
   * ledger. `DRV-0101` carries 2,748.88 and 95.00 of that.
   *
   * It does not break any balance — the payable is read from the ledger, so it
   * is simply *lower than the documents imply* — and it is **not adjusted
   * here**: writing eighty-three postings to make the documents true is a
   * fixture change with a trial-balance consequence, and `financials.test.ts`
   * asserts `liability.driver` at 247,713 (AC-348).
   *
   * The numbers are asserted so the day somebody posts them, this fails and
   * points at the tile that has to move with them.
   */
  it('counts the escrow releases and applied deductions that never posted', () => {
    const { escrowHoldFixtures, deductionFixtures, ledgerPostingFixtures } = fixtures()
    const posted = new Set(
      ledgerPostingFixtures
        .filter((p) => p.subjectAccount === 'liability.driver' && p.sourceId !== null)
        .map((p) => `${p.sourceType}:${p.sourceId}`),
    )
    const releases = escrowHoldFixtures.filter(
      (e) => e.settlement === 'released' && !posted.has(`escrow:${e.id}`),
    )
    const deductions = deductionFixtures.filter(
      (d) => d.status === 'applied' && !posted.has(`deduction:${d.id}`),
    )
    expect([releases.length, releases.reduce((s, e) => s + e.amountHalalas, 0)]).toEqual([46, 790_303])
    expect([deductions.length, deductions.reduce((s, d) => s + d.amountHalalas, 0)]).toEqual([37, 82_500])
    expect(releases.filter((e) => e.captainId === D).reduce((s, e) => s + e.amountHalalas, 0)).toBe(274_888)
    expect(deductions.filter((d) => d.captainId === D).reduce((s, d) => s + d.amountHalalas, 0)).toBe(9_500)
  })

  /**
   * **A payout document and its posting disagree about how much was paid, and
   * nothing links them.**
   *
   * `PAY-W900` is 455.00, `settled`, `postingId: null`. `PAY-0104-2` is a
   * 900.00 payout debit referencing `PO-0001`, and `CaptainPayout.paidOutHalalas`
   * agrees with the posting. The profile shows the posting, so no figure on
   * this screen is wrong — but the document is, and a de-dup written on
   * `postingId` would have listed both.
   */
  it('names PAY-W900, the payout document its own posting contradicts', () => {
    const { paymentFixtures, ledgerPostingFixtures, captainPayoutFixtures } = fixtures()
    const doc = paymentFixtures.find((p) => p.id === 'PAY-W900')!
    const posting = ledgerPostingFixtures.find((p) => p.id === 'PAY-0104-2')!
    expect(doc.postingId, 'nothing links the two').toBeNull()
    expect(doc.amountHalalas).toBe(45_500)
    expect(posting.amountHalalas).toBe(90_000)
    expect(captainPayoutFixtures.find((p) => p.captainId === 'DRV-0104')!.paidOutHalalas).toBe(90_000)
  })

  /**
   * **A payout in flight beside a payout state that says nothing is in
   * flight.** `PAY-W640` was initiated at 06:00 on 25 June and is `pending`;
   * `CaptainPayout.state` for the same captain is `due`, which is the state
   * that offers *Pay*. `processing` exists and is what this row describes —
   * `DRV-0106` carries it — so the vocabulary is not missing, the value is.
   *
   * A screen that offers *Pay* here would issue a second 640.00 transfer.
   */
  it('names PAY-W640, a payout in flight on a captain the payouts index calls `due`', async () => {
    const { captainPayoutFixtures } = fixtures()
    expect((await getDriverMoneyMovements(D)).payoutInFlightHalalas).toBe(64_000)
    expect(captainPayoutFixtures.find((p) => p.captainId === D)!.state).toBe('due')
    expect(captainPayoutFixtures.find((p) => p.captainId === 'DRV-0106')!.state).toBe('processing')
  })
})

/* ── the timeline ───────────────────────────────────────────────────────── */

describe('the record’s history', () => {
  /**
   * **The trap the rider's i18n owner found, closed by construction rather than
   * by documentation.**
   *
   * `interpolate` throws on an *omitted* parameter and renders the word `null`
   * for a nulled one. `DriverTimelineEvent` types `detail` per `kind` with no
   * optional key and no nullable value, so a builder that omits one does not
   * compile. This asserts the same thing at runtime over every event of every
   * captain, because a `Record<string, unknown>` arriving from an http backend
   * has no compiler behind it.
   */
  it('carries no absent, null or empty detail value on any event of any captain', async () => {
    const bad: string[] = []
    for (const id of await everyCaptain()) {
      const page = await getDriverTimeline(id, { pageSize: 1_000 })
      for (const event of page.items) {
        const detail = event.detail as Record<string, unknown>
        if (Object.keys(detail).length === 0 && event.kind !== 'account-registered') {
          bad.push(`${id}/${event.id}: empty detail`)
        }
        for (const [key, value] of Object.entries(detail)) {
          if (value === undefined || value === null || value === '') {
            bad.push(`${id}/${event.id}: ${key} = ${String(value)}`)
          }
        }
      }
    }
    expect(bad, 'an omitted placeholder makes `interpolate` throw on the operator').toEqual([])
  })

  it('gives each kind exactly the keys its sentence declares', async () => {
    const EXPECTED: Record<string, string[]> = {
      'account-registered': ['tier', 'vehicleClass'],
      'trip-requested': ['riderName'],
      'trip-completed': ['riderName'],
      'trip-cancelled': ['riderName'],
      'trip-no-show': ['riderName'],
      'document-expired': ['docType'],
      'bank-account-changed': ['fromBank', 'toBank', 'reason'],
    }
    const wrong: string[] = []
    for (const id of await everyCaptain()) {
      const page = await getDriverTimeline(id, { pageSize: 1_000 })
      for (const event of page.items) {
        const keys = Object.keys(event.detail as Record<string, unknown>).sort()
        const expected = [...EXPECTED[event.kind]!].sort()
        if (keys.join(',') !== expected.join(',')) {
          wrong.push(`${id}/${event.id}: ${keys.join(',')} ≠ ${expected.join(',')}`)
        }
      }
    }
    expect(wrong).toEqual([])
  })

  it('reaches every one of the seven kinds without hand-editing a fixture', async () => {
    const seen = new Set<string>()
    for (const id of await everyCaptain()) {
      for (const event of (await getDriverTimeline(id, { pageSize: 1_000 })).items) seen.add(event.kind)
    }
    expect([...seen].sort()).toEqual([
      'account-registered',
      'bank-account-changed',
      'document-expired',
      'trip-cancelled',
      'trip-completed',
      'trip-no-show',
      'trip-requested',
    ])
  })

  it('DRV-0101: twenty events, newest first, and no rendered sentence anywhere', async () => {
    const page = await getDriverTimeline(D, { pageSize: 100 })
    expect(page.total).toBe(20)
    expect(page.items.map((e) => [e.at.slice(0, 10), e.kind, e.recordId]).slice(0, 3)).toEqual([
      ['2026-06-25', 'trip-cancelled', 'TRP-8001'],
      ['2026-06-25', 'trip-completed', 'TRP-9005'],
      ['2026-06-25', 'trip-requested', 'TRP-7741'],
    ])
    /* The tail is the registration, dated by `joinedAt` — the same date the
       header prints, so the two can never disagree. */
    const last = page.items.at(-1)!
    expect([last.kind, last.at.slice(0, 10), last.recordId]).toEqual(['account-registered', '2025-02-01', null])
    expect(last.detail).toEqual({ tier: 'gold', vehicleClass: 'Economy' })
    expect((await getDriver(D)).joinedAt).toBe('2025-02-01')
  })

  it('DRV-0104: the captain who reaches compliance and banking in one history', async () => {
    const page = await getDriverTimeline('DRV-0104', { pageSize: 100 })
    const lapsed = page.items.find((e) => e.kind === 'document-expired')!
    expect([lapsed.at.slice(0, 10), lapsed.detail]).toEqual(['2026-06-20', { docType: 'id_card' }])
    const bank = page.items.find((e) => e.kind === 'bank-account-changed')!
    expect([bank.at.slice(0, 10), bank.detail]).toEqual([
      '2026-03-10',
      { fromBank: 'Riyad Bank', toBank: 'Bank Albilad', reason: 'Driver requested change' },
    ])
  })

  it('lists no document that has not expired yet', async () => {
    /* A history is what happened. `expiring` and `critical` are dated in the
       future; the compliance card draws those. `DRV-0204`'s two `critical`
       documents are the row that would break this if the filter widened. */
    const { complianceFixtures } = fixtures()
    const future = complianceFixtures
      .find((c) => c.driverId === 'DRV-0204')!
      .docs.filter((d) => d.state === 'critical')
    expect(future.length).toBe(2)
    const page = await getDriverTimeline('DRV-0204', { pageSize: 100 })
    expect(page.items.filter((e) => e.kind === 'document-expired')).toEqual([])
  })

  it('reads the trips by driverId, not through the captain’s link array', async () => {
    /* `DRV-0101.tripIds` names three trips while nineteen name the captain, and
       `DRV-0106.tripIds` is empty beside 145 lifetime trips — the seeded
       contradiction at `:2671`. A timeline built from the array would be three
       events long on the record both surfaces are drawn against. */
    const driver = await getDriver(D)
    expect(driver.tripIds).toHaveLength(3)
    const page = await getDriverTimeline(D, { pageSize: 100 })
    expect(page.items.filter((e) => e.recordType === 'trip').length).toBe(19)
  })

  it('dates an open trip by its request and a finished one by its end', async () => {
    const { allTripFixtures } = fixtures()
    const page = await getDriverTimeline(D, { pageSize: 100 })
    for (const event of page.items.filter((e) => e.recordType === 'trip')) {
      const trip = allTripFixtures.find((t) => t.id === event.recordId)!
      const expected = isOpenTripStatus(trip.status) ? trip.startedAt : (trip.endedAt ?? trip.startedAt)
      expect(event.at, event.recordId!).toBe(expected)
    }
  })

  it('is newest-first and stable across two reads', async () => {
    const page = await getDriverTimeline(D, { pageSize: 100 })
    const times = page.items.map((e) => Date.parse(e.at))
    expect([...times].sort((a, b) => b - a)).toEqual(times)
    expect((await getDriverTimeline(D, { pageSize: 100 })).items.map((e) => e.id)).toEqual(
      page.items.map((e) => e.id),
    )
  })

  it('pages, so a captain with a long history does not return all of it', async () => {
    const page = await getDriverTimeline(D, { pageSize: 6 })
    expect(page.items).toHaveLength(6)
    expect(page.total).toBe(20)
    expect(page.totalPages).toBe(4)
  })

  it('gives a captain who has never driven exactly one event', async () => {
    const page = await getDriverTimeline('DRV-0203')
    expect(page.items.map((e) => e.kind)).toEqual(['account-registered'])
  })
})

/* ── the support presence ───────────────────────────────────────────────── */

describe('what else references this captain', () => {
  it('DRV-0101: nine collections, and `openComplaints` answers for exactly one of them', async () => {
    const presence = await getDriverSupportPresence(D)
    expect({ ...presence, computedAt: undefined }).toEqual({
      driverId: D,
      complaints: { total: 1, open: 1 },
      conversations: { total: 1, open: 0 },
      disputes: { total: 3, open: 3 },
      lostAndFound: { total: 2, open: 2 },
      fairnessCases: { total: 6, open: 2 },
      tickets: { total: 0, open: 0 },
      safetyIncidents: { total: 8, open: 1 },
      cashReports: { total: 6, open: 0 },
      deductions: { total: 7, open: 0 },
      computedAt: undefined,
    })
    /* The field a profile would otherwise have read, and what it would have
       missed: one open complaint, against eight other open records. */
    expect((await getDriver(D)).openComplaints).toBe(1)
  })

  it('carries the `total > 0, open 0` case, which a boolean cannot express', async () => {
    const presence = await getDriverSupportPresence(D)
    expect(presence.deductions).toEqual({ total: 7, open: 0 })
    expect(presence.tickets).toEqual({ total: 0, open: 0 })
  })

  it('agrees with `Driver.openComplaints` on every captain', async () => {
    /* The one number the record already carries. If the presence read and the
       record ever disagree, one of them is a second answer to one question. */
    const page = await listDrivers({ pageSize: 200 })
    const wrong: string[] = []
    for (const driver of page.items) {
      const presence = await getDriverSupportPresence(driver.id)
      if (presence.complaints.open !== driver.openComplaints) {
        wrong.push(`${driver.id}: record ${driver.openComplaints}, counted ${presence.complaints.open}`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('counts a dispute from either side, and an incident from either side', async () => {
    const { disputeFixtures, safetyIncidentFixtures } = fixtures()
    const presence = await getDriverSupportPresence(D)
    expect(presence.disputes.total).toBe(
      disputeFixtures.filter((d) => d.claimantId === D || d.againstId === D).length,
    )
    expect(presence.safetyIncidents.total).toBe(
      safetyIncidentFixtures.filter((i) => i.againstId === D || i.reporterId === D).length,
    )
  })

  it('gives a captain nothing references all-zero counts, not an error', async () => {
    /* Forty-four of the fifty-seven captains are in this state, which is the
       right proportion: most captains are not in trouble, and the profile's
       "nothing here" sentence is the common case rather than the exception.
       `DRV-0203` is *not* one of them — approved yesterday, never driven, and
       already named on two disputes and two lost-and-found searches, which is
       the reminder that "new" does not mean "clean". */
    const presence = await getDriverSupportPresence('DRV-0301')
    const counts = Object.values(presence).filter(
      (v): v is { total: number; open: number } => typeof v === 'object' && v !== null,
    )
    expect(counts).toHaveLength(9)
    expect(counts.every((c) => c.total === 0 && c.open === 0)).toBe(true)
  })
})
