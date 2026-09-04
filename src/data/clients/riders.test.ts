/**
 * **The rider profile's two derived reads, and the arithmetic under them.**
 *
 * `getRiderMoneyMovements` merges two ledgers into one list, and a merged money
 * list has exactly one way to go wrong that nobody notices: the rows stop
 * adding up to the balance printed above them. This file is the guard on that.
 * The load-bearing test is *"the wallet rows sum to the balance"* — it fails if
 * a fixture amount is edited on one side and not the other, which is the defect
 * this codebase has been burned by before.
 *
 * It also pins the thing the reference design got wrong, deliberately and with
 * the arithmetic written out: **the four movements do NOT sum to 200.00.** Two
 * of them are card money that never touched the wallet. A test that only
 * asserted the happy identity would let somebody "fix" the balance to 38.00 and
 * stay green.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { disableMockLatency, mockFailures } from '../config'
import { fixtures } from '../mock/fixtures'
import { isPendingSettlement } from '../types/ledger'
import { OPEN_TRIP_STATUSES, isOpenTripStatus } from '../types/trip'
import { getRider, getRiderMoneyMovements, getRiderTimeline, listRiders } from './riders'
import { listSubscriptions } from './subscriptions'

/** The rider both profile surfaces are designed against. */
const R = 'RDR-4002'

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
})

/* ── the seam's four properties, for the two operations this file adds ──── */

describe('the two new operations are seam-shaped', () => {
  it('returns Promises', async () => {
    await expect(getRiderTimeline(R)).resolves.toBeDefined()
    await expect(getRiderMoneyMovements(R)).resolves.toBeDefined()
  })

  it.each([
    ['riders.timeline', () => getRiderTimeline(R)],
    ['riders.movements', () => getRiderMoneyMovements(R)],
  ])('%s failure is injectable', async (op, call) => {
    mockFailures.always(op)
    await expect(call()).rejects.toThrow()
    mockFailures.clear(op)
    await expect(call()).resolves.toBeDefined()
  })

  it('404s on an unknown rider, naming the id', async () => {
    await expect(getRiderTimeline('RDR-NOPE')).rejects.toMatchObject({ status: 404 })
    await expect(getRiderMoneyMovements('RDR-NOPE')).rejects.toMatchObject({ status: 404 })
  })

  it('is deterministic — two calls, identical data', async () => {
    expect(await getRiderMoneyMovements(R)).toStrictEqual(await getRiderMoneyMovements(R))
    expect(await getRiderTimeline(R)).toStrictEqual(await getRiderTimeline(R))
  })
})

/* ── the reconciliation ─────────────────────────────────────────────────── */

describe('the money movements reconcile', () => {
  /**
   * **The test that must fail if a fixture amount is edited on one side only.**
   *
   * `financials.test.ts` already asserts `Rider.walletBalanceHalalas` against
   * the wallet ledger's closing balance. This asserts the *movements card*
   * against the same number, so the list an operator reads and the figure above
   * it cannot disagree.
   */
  it('sums the wallet rows to the rider’s wallet balance, for every rider', async () => {
    const page = await listRiders({ pageSize: 200 })
    const wrong: string[] = []
    for (const rider of page.items) {
      const { movements, walletBalanceHalalas } = await getRiderMoneyMovements(rider.id)
      const summed = movements
        .filter((m) => m.inWalletBalance)
        .reduce((s, m) => s + (m.direction === 'credit' ? m.amountHalalas : -m.amountHalalas), 0)
      if (summed !== rider.walletBalanceHalalas) {
        wrong.push(`${rider.id}: rows sum to ${summed}, record says ${rider.walletBalanceHalalas}`)
      }
      if (walletBalanceHalalas !== rider.walletBalanceHalalas) {
        wrong.push(`${rider.id}: envelope ${walletBalanceHalalas} vs record ${rider.walletBalanceHalalas}`)
      }
    }
    expect(wrong, 'a movements list that does not add up to the balance above it').toEqual([])
  })

  it('states `heldHalalas` on the record and the envelope as one number, derived from payments', async () => {
    const { paymentFixtures } = fixtures()
    const page = await listRiders({ pageSize: 200 })
    const wrong: string[] = []
    for (const rider of page.items) {
      const derived = paymentFixtures
        .filter((p) => p.riderId === rider.id && isPendingSettlement(p.settlement))
        .reduce((s, p) => s + (p.direction === 'inbound' ? p.amountHalalas : -p.amountHalalas), 0)
      if (derived !== rider.heldHalalas) {
        wrong.push(`${rider.id}: payments hold ${derived}, record says ${rider.heldHalalas}`)
      }
      const { heldHalalas } = await getRiderMoneyMovements(rider.id)
      if (heldHalalas !== rider.heldHalalas) {
        wrong.push(`${rider.id}: envelope ${heldHalalas} vs record ${rider.heldHalalas}`)
      }
    }
    expect(wrong).toEqual([])
  })

  /**
   * **`RDR-4002`, with the arithmetic spelled out, because the reference design
   * asserts that these four sum to the balance and they do not.**
   *
   *     +120.00  31 May  wallet top-up   settled   → in the balance
   *      +80.00  19 Jun  wallet top-up   settled   → in the balance
   *                                                  ─────── 200.00 ✓
   *      −64.00  17 Jun  quick-ride fare released  → mada card, never the wallet
   *      −98.00  23 Jun  quick-ride fare held      → mada card, never the wallet
   *
   *     signed sum of all four = +38.00, which is the balance of nothing.
   *
   * The `38.00` is asserted **on purpose**. If a later edit "reconciles" the
   * list by moving the balance to 38.00, or by dropping the two card rows to
   * make the sum come out, this fails and says which.
   */
  it('RDR-4002: four movements, 200.00 balance, 98.00 held, and 38.00 that is not a balance', async () => {
    const { movements, walletBalanceHalalas, heldHalalas } = await getRiderMoneyMovements(R)

    expect(movements.map((m) => [m.id, m.direction, m.amountHalalas, m.state])).toEqual([
      ['PAY-6150', 'debit', 9_800, 'held'],
      ['WTX-4002-T2', 'credit', 8_000, 'settled'],
      ['PAY-6151', 'debit', 6_400, 'released'],
      ['WTX-4002-T1', 'credit', 12_000, 'settled'],
    ])

    /* Newest first — 23 Jun, 19 Jun, 17 Jun, 31 May. */
    expect(movements.map((m) => m.at.slice(0, 10))).toEqual([
      '2026-06-23',
      '2026-06-19',
      '2026-06-17',
      '2026-05-31',
    ])

    const signed = (rows: typeof movements) =>
      rows.reduce((s, m) => s + (m.direction === 'credit' ? m.amountHalalas : -m.amountHalalas), 0)

    expect(signed(movements.filter((m) => m.inWalletBalance))).toBe(20_000)
    expect(walletBalanceHalalas).toBe(20_000)
    expect(heldHalalas).toBe(9_800)
    expect(
      signed(movements),
      'the whole list does not sum to the balance, and the card must not claim it does',
    ).toBe(3_800)

    /* The two card rows are in the list and out of the balance. */
    expect(movements.filter((m) => m.source === 'payment').every((m) => !m.inWalletBalance)).toBe(true)
    expect(movements.filter((m) => m.source === 'payment').every((m) => m.balanceAfterHalalas === null)).toBe(true)
    expect(movements.find((m) => m.id === 'PAY-6150')!.paymentId).toBe('PAY-6150')
  })

  it('never lists one movement of money twice', async () => {
    /* A payment that names a wallet posting is the same money seen from two
       sides. `PAY-6110`/`WTX-0003` is the pair; the posting wins. */
    const page = await listRiders({ pageSize: 200 })
    for (const rider of page.items) {
      const { movements } = await getRiderMoneyMovements(rider.id)
      const ids = movements.map((m) => m.id)
      expect(new Set(ids).size, rider.id).toBe(ids.length)
      const walletIds = new Set(movements.filter((m) => m.source === 'wallet').map((m) => m.id))
      const dupes = movements.filter((m) => m.source === 'payment' && walletIds.has(m.id))
      expect(dupes, `${rider.id} lists a payment that already has a wallet row`).toEqual([])
    }
  })

  it('carries positive integer amounts only — the sign is `direction`', async () => {
    const page = await listRiders({ pageSize: 200 })
    const bad: string[] = []
    for (const rider of page.items) {
      const { movements } = await getRiderMoneyMovements(rider.id)
      for (const m of movements) {
        if (!Number.isInteger(m.amountHalalas) || m.amountHalalas <= 0) {
          bad.push(`${rider.id}/${m.id}: ${m.amountHalalas}`)
        }
      }
    }
    expect(bad, 'types/ledger.ts §3.1 — postings are unsigned').toEqual([])
  })
})

/* ── the timeline ───────────────────────────────────────────────────────── */

describe('the record’s history', () => {
  it('RDR-4002: four events, newest first, each with a record id and no rendered sentence', async () => {
    const page = await getRiderTimeline(R)
    expect(page.items.map((e) => [e.at.slice(0, 10), e.kind, e.recordId])).toEqual([
      ['2026-06-25', 'trip-requested', 'TRP-9104'],
      ['2026-06-22', 'account-registered', null],
      ['2026-06-08', 'subscription-expired', 'SUB-2003'],
      ['2026-06-01', 'subscription-started', 'SUB-2003'],
    ])

    const [trip, registered, expired, started] = page.items
    /* The open trip: unassigned, and both ends of the route separately. */
    expect(trip!.detail).toEqual({
      pickup: 'حي حطين',
      destination: 'مستشفى الملك فيصل التخصصي',
      captainAssigned: false,
    })
    expect(trip!.recordType).toBe('trip')
    expect(registered!.detail).toEqual({ location: 'Riyadh, SA', tier: 'new' })
    /* `0 of 5` as two numbers, because the meter draws five segments. */
    expect(expired!.detail).toEqual({ planName: 'Weekly Economy', tripsUsed: 0, tripsIncluded: 5 })
    expect(started!.detail).toEqual({
      planName: 'Weekly Economy',
      startedOn: '2026-06-01',
      endsOn: '2026-06-08',
    })
  })

  it('reads the related records by riderId, not through the rider’s link arrays', async () => {
    /* `RDR-4002.subscriptionIds` and `.tripIds` are `[]` — deliberately, because
       `management.growth.dormantRiderShare` counts on it — while `SUB-2003` and
       `TRP-9104` both name the rider. A timeline built from the arrays would be
       one event long. This is the assertion that stops it regressing to that. */
    const rider = await getRider(R)
    expect(rider.subscriptionIds).toEqual([])
    expect(rider.tripIds).toEqual([])
    const page = await getRiderTimeline(R)
    expect(page.items.filter((e) => e.recordId !== null).length).toBeGreaterThan(0)
  })

  it('is newest-first and stable across two reads', async () => {
    const page = await getRiderTimeline(R)
    const times = page.items.map((e) => Date.parse(e.at))
    expect([...times].sort((a, b) => b - a)).toEqual(times)
    expect((await getRiderTimeline(R)).items.map((e) => e.id)).toEqual(page.items.map((e) => e.id))
  })

  it('pages, so a rider with a long history does not return all of it', async () => {
    const page = await getRiderTimeline(R, { pageSize: 2 })
    expect(page.items).toHaveLength(2)
    expect(page.total).toBe(4)
    expect(page.totalPages).toBe(2)
  })

  it('dates an open trip by its request and a finished one by its end', async () => {
    const { allTripFixtures } = fixtures()
    /* `RDR-1041` has both: `TRP-7741` in-trip and `TRP-7720` done. */
    const page = await getRiderTimeline('RDR-1041', { pageSize: 100 })
    for (const event of page.items.filter((e) => e.recordId?.startsWith('TRP-'))) {
      const trip = allTripFixtures.find((t) => t.id === event.recordId)!
      const expected = isOpenTripStatus(trip.status) ? trip.startedAt : (trip.endedAt ?? trip.startedAt)
      expect(event.at, event.recordId!).toBe(expected)
    }
  })
})

/* ── the invariants the fixtures have to keep ───────────────────────────── */

describe('rider fixture invariants', () => {
  /**
   * **The designer's ruling, written precisely.**
   *
   * `Rider.status` derives from *live* subscriptions, not from `subs.length` —
   * legacy's `subs.length` test (`:6428`) is what calls a rider with a single
   * cancelled plan *Active*, and `RDR-2087`'s fixture records that correction.
   *
   * So the rule is **not** "on-demand implies no subscriptions". `RDR-4002`
   * holds an expired `SUB-2003` and reads `on-demand`, and that must stay
   * legal. What must not happen is a rider reading `on-demand` while holding a
   * plan that is still running.
   */
  const LIVE_SUBSCRIPTION_STATUSES = ['active', 'expiring', 'at-risk', 'frozen'] as const

  it('reads `subscriber` if and only if a live plan is on the record', async () => {
    const page = await listRiders({ pageSize: 200 })
    const wrong: string[] = []
    for (const rider of page.items) {
      const held = await listSubscriptions({ riderId: rider.id, pageSize: 100 })
      const live = held.items.filter((s) =>
        (LIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(s.status),
      )
      /* Against the rider's OWN link array, which is what `clients/integrity.ts`
         reads and what the fixtures were corrected against. The `riderId` join
         disagrees for three riders and that is a reported finding, not this
         test's subject — see the note below. */
      const linked = live.filter((s) => rider.subscriptionIds.includes(s.id))
      if (rider.status === 'subscriber' && linked.length === 0) {
        wrong.push(`${rider.id}: subscriber with no live plan linked`)
      }
      if (rider.status === 'on-demand' && linked.length > 0) {
        wrong.push(`${rider.id}: on-demand while holding ${linked.map((s) => s.id).join(', ')}`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('keeps the expired-plan-and-still-on-demand case reachable', async () => {
    /* The case the invariant above has to permit, named so that tightening it
       to "on-demand implies no subscriptions" fails here rather than silently
       forbidding the record both designs are drawn against. */
    const rider = await getRider(R)
    expect(rider.status).toBe('on-demand')
    const held = await listSubscriptions({ riderId: R, pageSize: 10 })
    expect(held.items.map((s) => s.status)).toEqual(['expired'])
  })

  it('names a reason wherever the churn level is not `low`', async () => {
    const page = await listRiders({ pageSize: 200 })
    const silent = page.items
      .filter((r) => r.churnRisk !== 'low' && r.churnReason === null)
      .map((r) => `${r.id} (${r.churnRisk})`)
    expect(silent, 'a badge that states a level must state why').toEqual([])
  })

  it('carries a rider with no churn reason at all, so the absent case is reachable', async () => {
    const page = await listRiders({ pageSize: 200 })
    expect(page.items.some((r) => r.churnReason === null)).toBe(true)
  })

  it('carries a rider with no device on record, as `null` and never as an empty string', async () => {
    const page = await listRiders({ pageSize: 200 })
    expect(page.items.some((r) => r.device === null)).toBe(true)
    expect(page.items.every((r) => r.device !== '')).toBe(true)
  })

  it('keeps `heldHalalas` non-negative and integral', async () => {
    const page = await listRiders({ pageSize: 200 })
    const bad = page.items
      .filter((r) => !Number.isInteger(r.heldHalalas) || r.heldHalalas < 0)
      .map((r) => `${r.id}: ${r.heldHalalas}`)
    expect(bad).toEqual([])
  })
})

/* ── the shared open-trip predicate ─────────────────────────────────────── */

describe('one answer to "is this trip open"', () => {
  it('includes `requested` — the state DispatchScreen’s local constant excluded', () => {
    /* `screens/operations/dispatch/DispatchScreen.tsx:94` declares
       `ACTIVE_TRIP_STATUSES = ['assigned','en-route','in-trip']`, which excludes
       `TRP-9104` — the exact trip the rider profile calls open. */
    expect(isOpenTripStatus('requested')).toBe(true)
    expect(OPEN_TRIP_STATUSES).toEqual(['requested', 'assigned', 'en-route', 'in-trip'])
  })

  it('excludes every terminal state, `late` included', () => {
    for (const status of ['done', 'late', 'cancelled', 'no-show'] as const) {
      expect(isOpenTripStatus(status), status).toBe(false)
    }
  })

  it('agrees with the data: nothing it calls open has already ended', () => {
    const { allTripFixtures } = fixtures()
    const wrong = allTripFixtures
      .filter((t) => isOpenTripStatus(t.status) && t.endedAt !== null)
      .map((t) => `${t.id} (${t.status}) is open and has ended`)
    expect(wrong).toEqual([])
  })

  it('gives every finished trip an end time — TRP-7742 included, which it was not', () => {
    /**
     * **The tripwire fired, and this is what it fired for.**
     *
     * It used to assert the DEFECT: `TRP-7742` was the one `late` trip with
     * `endedAt: null`, and the assertion existed so that setting it could not
     * pass unnoticed — *"when someone sets it, this test fails and points at
     * `types/trip.ts`"*. Somebody set it, deliberately, and the test now
     * asserts the corrected state instead of the broken one.
     *
     * Legacy `DB.trips['TRP-7742']` (`:2677`) is `status:'Late +8'` with
     * `km:'11.0'`, `min:'30'`, `fare:'29.40'`, `driverEarn:'23.52'` and
     * `pay:'PAY-5475'`. A measured, priced, paid-out, settled trip is finished,
     * and all sixteen filler `late` trips already said so.
     *
     * What forced it was the ride record: the stage log drew `Drop-off · Not
     * yet` under a fare of 29.40 that had already been paid, which is a surface
     * reproducing a contradiction rather than a fixture quietly holding one.
     *
     * **Two things moved with it, both named rather than discovered later:**
     * `'route-history'` (`clients/trips.ts`) selects on `endedAt !== null &&
     * distanceKm !== null`, so this row is in that view now; and
     * `INCIDENT_SUBJECTS` (`fixtures/safety.ts`) projects finished trips, so one
     * more filler incident lands on `DRV-0103` — `drivers.test.ts` carries that
     * count and says so.
     */
    const { allTripFixtures } = fixtures()
    const openEnded = allTripFixtures
      .filter((t) => !isOpenTripStatus(t.status) && t.endedAt === null)
      .map((t) => `${t.id} (${t.status}) has finished and has no end time`)
    /* `cancelled` is the one terminal status that legitimately has none — a
       ride cancelled before it started never ended. `TRP-9003` and `TRP-9105`
       are those, and they are excluded by carrying no fare. */
    expect(openEnded.filter((line) => !line.includes('(cancelled)'))).toEqual([])

    const row = allTripFixtures.find((t) => t.id === 'TRP-7742')!
    expect(row.endedAt, 'startedAt + durationMinutes + the 8 minutes of lateness').toBe(
      '2026-06-25T08:23:00+03:00',
    )
    expect(row.fareHalalas, 'a trip with a fare and a settled payment has finished').toBeGreaterThan(0)
    expect(row.paymentId).toBe('PAY-5475')
  })

  it('finds TRP-9104 as RDR-4002’s open trip', async () => {
    const { allTripFixtures } = fixtures()
    const open = allTripFixtures.filter((t) => t.riderId === R && isOpenTripStatus(t.status))
    expect(open.map((t) => t.id)).toEqual(['TRP-9104'])
    expect(open[0]!.driverId, 'no captain assigned').toBeNull()
    expect(open[0]!.fareHalalas).toBe(0)
  })
})
