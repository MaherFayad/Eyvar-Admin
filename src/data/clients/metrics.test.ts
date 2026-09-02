/**
 * Metric tiles and chart cards — the four §3.7 rules that are cheap to state
 * and expensive to discover broken.
 *
 *   1. **Every metric knows when it was computed.** No KPI anywhere in the
 *      legacy app has an `asOf`, and an overview that cannot say when it was
 *      computed is one an operator cannot trust during an incident.
 *   2. **`deltaPercent` is `null` if and only if there is no comparison.**
 *      §3.7: an em-dash when no comparison is possible, *never `0%` and never
 *      blank*. A seeded delta can contradict its own comparison; a computed one
 *      cannot, and this is the test that keeps it computed.
 *   3. **A series has at most two windows.** One hue, the comparison dotted in
 *      the same hue; `globals.css:919` deletes shadcn's `--chart-1…5` ramp
 *      rather than remapping it, so **there is no `--chart-3`** to ask for.
 *   4. **"No data" is four states, not one.** No comparison period · a gap in
 *      the middle · a range that is genuinely all zero · nothing at all. They
 *      render differently and each has a fixture.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { disableMockLatency, mockFailures } from '../config'
import { EYVAR_TODAY } from '../mock/clock'
import {
  SNAPSHOT_CURRENT,
  SNAPSHOT_PREVIOUS,
  dailySnapshotFixtures,
  snapshotsBetween,
} from '../fixtures/dailySnapshots'
import { allDriverFixtures } from '../fixtures/drivers'
import { applicantFixtures } from '../fixtures/applicants'
import { fairnessCaseFixtures } from '../fixtures/fairness'
import { allTripFixtures } from '../fixtures/trips'
import { riderFixtures } from '../fixtures/riders'
import { allSubscriptionFixtures } from '../fixtures/subscriptions'
import { listDrivers } from './drivers'
import { listSafetyIncidents } from './safety'
import { listSubscriptions } from './subscriptions'
import { listWorkItems } from './myWork'
import {
  METRIC_BOARD_SUB_TABS,
  getMetricBoard,
  getMetricSeries,
  listMetrics,
} from './metrics'
import { getRouteTable } from './routes'

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
})

const allMetrics = async () => (await listMetrics({ pageSize: 500 })).items

describe('1 — every metric says when it was computed', () => {
  it('carries an asOf on every metric and every series', async () => {
    for (const metric of await allMetrics()) {
      expect(metric.asOf, metric.key).toBe('2026-06-25T09:14:00+03:00')
    }
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      const board = await getMetricBoard(subTabId)
      expect(board.asOf).toBe('2026-06-25T09:14:00+03:00')
      for (const chart of board.charts) expect(chart.asOf, chart.key).toBe(board.asOf)
    }
  })
})

describe('2 — the delta and the comparison cannot disagree', () => {
  /**
   * **The one metric that is allowed out of the biconditional, by name.**
   *
   * A target of `0` has a real comparison and no percentage — see `resolve()`.
   * Naming it rather than writing a general escape clause is deliberate: a
   * second metric arriving in this state should fail these tests and be
   * argued for, not slip through a predicate.
   */
  const ZERO_TARGET = 'admin.overview.operatorsWithoutTwoFactor'

  it('has a delta exactly when it has a comparison', async () => {
    for (const m of await allMetrics()) {
      if (m.key === ZERO_TARGET) continue
      const comparable = m.comparison.kind !== 'none' && m.value !== null
      expect(m.deltaPercent === null, `${m.key}: delta`).toBe(!comparable)
      expect(m.direction === null, `${m.key}: direction`).toBe(!comparable)
    }
  })

  it('R5-1 — a value is absent exactly when there is a reason for it', async () => {
    /**
     * **The biconditional `absenceReason` exists to carry.** `Metric.value` is
     * `null` **iff** `absenceReason` is non-null, asserted over the resolved
     * metrics rather than over the seeds — a *derived* tile can resolve to
     * `null` on data the seed cannot see (`worstDemandSupplyRatio` documents
     * exactly that), and it is the resolved tile a screen renders.
     *
     * **This is also the guard on the removals.** Five tiles left this pass
     * under R4-11 §11.2 because their measure has no store; the class this
     * assertion refuses — a `null` with nothing to say about itself — is that
     * class. A tile that cannot state an honest reason does not render, and a
     * regression that re-adds one fails here rather than on the board.
     */
    for (const m of await allMetrics()) {
      expect(m.absenceReason !== null, `${m.key}: absenceReason vs value`).toBe(m.value === null)
    }
  })

  it('R5-6 — a bar is drawn only where one is legal, and it is share of the largest row', async () => {
    /**
     * Three conditions, and the third is the one R5-6 added: `max > min` across
     * **the rows shown**. Zero rows cannot meet it either.
     *
     * **Share-of-max, not share-of-total** — so the top row is always exactly
     * `1`, on every board. Before this ruling three breakdowns divided by three
     * different things (largest row, total, and a literal 42) and all three were
     * legal under *"one denominator"*, which only ever constrained them within a
     * list.
     */
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      for (const b of (await getMetricBoard(subTabId)).breakdowns) {
        const values = b.rows.map((r) => r.value)
        /* `max > min` is **necessary and not sufficient** — the other two
           conditions, one unit and one denominator, are properties of the list
           that no assertion over values can see. `captainsByLateShare` is five
           percentages over five different trip counts and carries `false` for
           that reason, not this one. */
        if (b.bar) {
          expect(values.length, `${b.key}: rows`).toBeGreaterThan(0)
          expect(Math.max(...values), `${b.key}: max > min`).toBeGreaterThan(Math.min(...values))
        }
        if (!b.bar) {
          expect(b.rows.every((r) => r.barFraction === null), `${b.key}: no fractions`).toBe(true)
          continue
        }
        const max = Math.max(...values)
        for (const r of b.rows) {
          expect(r.barFraction, `${b.key} / ${r.id}`).toBe(Math.round((r.value / max) * 1000) / 1000)
        }
        expect(Math.max(...b.rows.map((r) => r.barFraction ?? 0)), `${b.key}: top is full`).toBe(1)
      }
    }
  })

  it('keeps a target of zero instead of throwing it away — the only owned target on any board', async () => {
    /**
     * **The defect this replaces.** `resolve()` collapsed *any* zero baseline
     * to `{ kind: 'none', reason: 'insufficient-data' }` so it would never
     * divide by zero. Right for a previous period — `0 → 5` is "new", not "up
     * 500 %" — and wrong for a target: it deleted the target, its owner and
     * its effective date, and printed *"Too little data to compare"* under a
     * number `USR-1` had set an explicit goal of zero for.
     *
     * Three of the five operators have two-factor off, including `USR-2`, who
     * moves money. The tile is three over a target of nought and now says so.
     */
    const tile = (await allMetrics()).find((m) => m.key === ZERO_TARGET)!
    expect(tile.value).toBe(3)
    expect(tile.comparison).toEqual({
      kind: 'target',
      value: 0,
      setByUserId: 'USR-1',
      effectiveFrom: '2026-01-01',
    })
    /* No percentage exists from a base of zero — but the DIRECTION does, and it
       is what the screen reader hears (`up, which is worse`). */
    expect(tile.deltaPercent).toBeNull()
    expect(tile.direction).toBe('up')
    expect(tile.higherIsBetter).toBe(false)
  })

  it('still refuses to divide by a zero PREVIOUS PERIOD, which is the case the guard was for', async () => {
    /* Belt and braces: the fix narrowed the guard rather than removing it. No
       metric on any board carries a zero previous-period baseline today, so
       this asserts the property that keeps it that way. */
    for (const m of await allMetrics()) {
      if (m.comparison.kind !== 'previous-period') continue
      expect(m.comparison.value, `${m.key}: a zero baseline must resolve to no comparison`).not.toBe(
        0,
      )
      expect(Number.isFinite(m.deltaPercent ?? 0), m.key).toBe(true)
    }
  })

  it('never renders 0% in place of "no comparison"', async () => {
    /* §3.7's actual sentence: the delta is an em-dash when no comparison is
       possible, "never `0%` and never blank". `0` and `null` are different
       answers and the UI has to be able to tell them apart. */
    const none = (await allMetrics()).filter((m) => m.comparison.kind === 'none')
    expect(none.length).toBeGreaterThan(0)
    expect(none.every((m) => m.deltaPercent === null)).toBe(true)
  })

  it('computes the delta from the comparison it names', async () => {
    for (const m of await allMetrics()) {
      if (m.comparison.kind === 'none' || m.value === null) continue
      if (m.comparison.value === 0) continue
      const expected =
        Math.round(((m.value - m.comparison.value) / Math.abs(m.comparison.value)) * 1000) / 10
      expect(m.deltaPercent, m.key).toBe(expected)
    }
  })

  it('carries higherIsBetter on every metric, including the counter-intuitive one', async () => {
    const metrics = await allMetrics()
    /* Overturn rate: higher is *better*. "A high overturn rate on this page is
       not a failure — it means the appeal route is doing its job" (`:15690`).
       No screen can derive that, which is the whole reason for the field. */
    expect(metrics.find((m) => m.key === 'support.overview.overturnRate')!.higherIsBetter).toBe(true)
    /* And its opposite, on a metric that looks identical in shape. */
    /* `management.risk.openSignals` was this counter-example until AC-720
       deleted the tile; `revenueAtRisk` is the same shape on the same board. */
    expect(metrics.find((m) => m.key === 'management.risk.revenueAtRisk')!.higherIsBetter).toBe(
      false,
    )
  })

  it('names the period a comparison covers, so the legend can print dates', async () => {
    /* §3.7 requires the legend to name both periods explicitly with dates. A
       bare `previousValue: number` cannot fill that in. */
    for (const m of await allMetrics()) {
      if (m.comparison.kind !== 'previous-period') continue
      expect(m.comparison.periodStart, m.key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(m.comparison.periodEnd, m.key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe('3 — two series, and no way to ask for a third', () => {
  it('exposes exactly `current` and `comparison` on every chart', async () => {
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      const board = await getMetricBoard(subTabId)
      for (const chart of board.charts) {
        const windows = Object.keys(chart).filter((k) => k === 'current' || k === 'comparison')
        expect(windows.sort(), chart.key).toEqual(['comparison', 'current'])
        expect(Array.isArray((chart as unknown as { series?: unknown }).series)).toBe(false)
      }
    }
  })

  it('keeps both windows the same length when both exist, so the dotted line aligns', async () => {
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      for (const chart of (await getMetricBoard(subTabId)).charts) {
        if (!chart.comparison || chart.current.points.length === 0) continue
        expect(chart.comparison.points.length, chart.key).toBe(chart.current.points.length)
      }
    }
  })
})

describe('4 — "no data" is four states and each has a fixture', () => {
  it('a — a metric with no comparison period yet', async () => {
    const series = await getMetricSeries('management.growth.newSubscriptions')
    expect(series.comparison).toBeNull()
    expect(series.current.points.length).toBeGreaterThan(0)
  })

  it('b — a gap in the middle of a populated range', async () => {
    /* `null` is a break in the line. **Not** a dip to the axis: rendering a
       missing reading as zero reports an outage as a collapse in demand. */
    const series = await getMetricSeries('management.performance.onTimePickup')
    const values = series.current.points.map((p) => p.value)
    expect(values[0]).not.toBeNull()
    expect(values.at(-1)).not.toBeNull()
    expect(values.filter((v) => v === null).length).toBe(1)
    expect(values.indexOf(null)).toBeGreaterThan(0)
    expect(values.indexOf(null)).toBeLessThan(values.length - 1)
  })

  it('c — a range whose every value is a real zero', async () => {
    /* Nothing failed all week. A flat line on the axis, and emphatically not
       the no-data sentence, which would say we stopped measuring. */
    const series = await getMetricSeries('management.zones.unservedRequests')
    expect(series.current.points.length).toBeGreaterThan(0)
    expect(series.current.points.every((p) => p.value === 0)).toBe(true)
  })

  it('d — genuinely nothing to plot', async () => {
    /* §3.7: keep the card, the title and the report link; one centred sentence
       in the plot area. Distinct from (c) in the data, not just in the copy. */
    const series = await getMetricSeries('support.overview.contactsPerThousandTrips')
    expect(series.current.points).toEqual([])
  })

  it('distinguishes a value of null from a value of zero', async () => {
    const metrics = await allMetrics()
    /* CPT has no numerator at all — `DB.contacts` ships empty (`:14719`). Zero
       would claim a perfect support record. */
    expect(metrics.find((m) => m.key === 'support.overview.contactsPerThousandTrips')!.value).toBeNull()
    /* And a genuine zero exists elsewhere, so `null` is not just "unset". */
    expect(metrics.some((m) => m.value === 0)).toBe(true)
  })
})

describe('derived metrics agree with the resource they are derived from', () => {
  it('counts active captains the same way the People table does', async () => {
    const metrics = await allMetrics()
    const tile = metrics.find((m) => m.key === 'management.overview.activeCaptains')!
    const table = await listDrivers({ filters: [{ field: 'status', op: 'eq', value: 'active' }], pageSize: 500 })
    expect(tile.sourceResource).toBe('drivers')
    expect(tile.value).toBe(table.total)
  })

  it('counts active subscriptions the same way the Subscriptions table does', async () => {
    const tile = (await allMetrics()).find((m) => m.key === 'management.overview.activeSubscriptions')!
    const table = await listSubscriptions({ status: 'active', pageSize: 500 })
    expect(tile.value).toBe(table.total)
  })

  it('counts open incidents the same way the Safety queue does', async () => {
    const tile = (await allMetrics()).find((m) => m.key === 'support.overview.openIncidents')!
    const queue = await listSafetyIncidents({ view: 'open', pageSize: 100 })
    expect(tile.value).toBe(queue.total)
  })

  it('counts breached work the same way My Work does', async () => {
    const tile = (await allMetrics()).find((m) => m.key === 'operations.overview.breachedWorkItems')!
    const work = await listWorkItems({
      view: 'breached',
      pageSize: 500,
      includeOtherRoles: true,
    })
    expect(tile.value).toBe(work.total)
  })

  it('marks every derived metric with the resource it came from', async () => {
    for (const m of await allMetrics()) {
      if (m.value === null) continue
      /* A metric with a value and no `sourceResource` is a literal, which is
         fine — but a metric *with* a source must actually resolve, or the tile
         silently shows the seed instead of the data. */
      if (m.sourceResource === null) continue
      expect(typeof m.value, m.key).toBe('number')
    }
  })
})

describe('board coverage', () => {
  it('serves a board for every table-less sub-tab', async () => {
    const shape = new Map(getRouteTable().subTabs.map((r) => [r.subTabId, r]))
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      expect(shape.has(subTabId), subTabId).toBe(true)
      const board = await getMetricBoard(subTabId)
      expect(board.metrics.length + board.charts.length, subTabId).toBeGreaterThan(0)
    }
  })

  it('404s for a sub-tab that has a table instead, rather than serving an empty board', async () => {
    /* A table screen calling this is a bug. An empty board would hide it. */
    await expect(getMetricBoard('operations-people')).rejects.toMatchObject({ status: 404 })
  })

  it('keeps Risk & Signals a reading surface — metrics and series, no rows', async () => {
    /* M1: "Risk & Signals has no work queue" — every legacy action on the page
       is a `go()` elsewhere (`:14320`). Its tiles therefore all carry a
       `drilldownRoute` to the queue that owns the work, or none at all. */
    const board = await getMetricBoard('management-risk')
    expect(board.metrics.length).toBeGreaterThan(0)
    expect(board.metrics.every((m) => m.category === 'risk')).toBe(true)
    expect(board.charts.every((c) => c.comparison === null)).toBe(true)
  })
})

describe('5 — the history is anchored to the fixed clock (AC-604)', () => {
  /**
   * **The correction spec §4.2 item 4 calls the prerequisite for everything
   * else.** `DB.dailySnapshots` (`:13803`–`:13832`) runs 26 Jun → 25 Jul 2026
   * while `EYVAR_NOW` is 25 Jun: thirty consecutive days sitting entirely in
   * the *future* of the clock. A comparison window cannot end after the instant
   * the board claims to have been computed, and a chart cannot plot tomorrow.
   *
   * The port in `fixtures/dailySnapshots.ts` shifts the window −30 days and
   * changes nothing else. These are the assertions that keep it there.
   */

  it('ends on the fixed clock\'s day and never runs past it', () => {
    expect(dailySnapshotFixtures.at(-1)!.date).toBe(EYVAR_TODAY)
    expect(dailySnapshotFixtures.filter((s) => s.date > EYVAR_TODAY)).toEqual([])
  })

  it('holds thirty consecutive ascending days, so the shift did not drop or duplicate one', () => {
    expect(dailySnapshotFixtures.length).toBe(30)
    const days = dailySnapshotFixtures.map((s) => s.date)
    expect(days).toEqual([...days].sort())
    expect(new Set(days).size).toBe(30)
    for (let i = 1; i < days.length; i += 1) {
      const gap = (Date.parse(days[i]!) - Date.parse(days[i - 1]!)) / 86_400_000
      expect(gap, `${days[i - 1]} → ${days[i]}`).toBe(1)
    }
  })

  it('preserves the legacy shape rather than regenerating it', () => {
    /* Spot-checks against `:13803` and `:13832`, first row and last, with the
       SAR strings converted to halalas exactly once. If someone "tidies" the
       numbers these fail, which is the point. */
    expect(dailySnapshotFixtures[0]).toMatchObject({
      riders: 6, drivers: 4, activeSubs: 2, quickRides: 8, cancelRatePct: 7,
      totalRevenueHalalas: 29_505, quickRideRevenueHalalas: 18_588, subRevenueHalalas: 10_917,
    })
    expect(dailySnapshotFixtures.at(-1)).toMatchObject({
      riders: 10, drivers: 7, activeSubs: 6, quickRides: 21, cancelRatePct: 9,
      totalRevenueHalalas: 64_737, quickRideRevenueHalalas: 24_600, subRevenueHalalas: 40_137,
    })
  })

  it('splits into two full fifteen-day windows with no overlap and no gap', () => {
    const current = snapshotsBetween(SNAPSHOT_CURRENT.start, SNAPSHOT_CURRENT.end)
    const previous = snapshotsBetween(SNAPSHOT_PREVIOUS.start, SNAPSHOT_PREVIOUS.end)
    expect(current.length).toBe(15)
    expect(previous.length).toBe(15)
    expect(current.length + previous.length).toBe(dailySnapshotFixtures.length)
    expect(previous.at(-1)!.date < current[0]!.date).toBe(true)
  })

  it('AC-604 — no comparison window on any board starts or ends after the board asOf', async () => {
    /* The criterion as written, over every board rather than over the fixture
       file, so a metric added later is covered without touching this test. */
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      const board = await getMetricBoard(subTabId)
      const asOfDay = board.asOf.slice(0, 10)
      for (const metric of board.metrics) {
        if (metric.comparison.kind !== 'previous-period') continue
        expect(metric.comparison.periodStart <= metric.comparison.periodEnd, metric.key).toBe(true)
        expect(metric.comparison.periodEnd <= asOfDay, metric.key).toBe(true)
      }
      for (const chart of board.charts) {
        for (const window of [chart.current, chart.comparison]) {
          if (!window) continue
          expect(window.periodEnd <= asOfDay, chart.key).toBe(true)
          for (const point of window.points) {
            expect(point.at <= asOfDay, `${chart.key} @ ${point.at}`).toBe(true)
          }
        }
      }
    }
  })
})

describe('6 — previous-period baselines are derived, not typed in', () => {
  /**
   * **Four tiles moved off `reason: 'no-history'` and each carries a literal
   * baseline.** A literal is right for a fixture — flat, greppable, editable by
   * hand to reproduce a bug — but a literal that nobody checks is how the
   * overview and the table end up disagreeing. So each one is asserted here
   * against the *same fixture its value comes from*, evaluated at the close of
   * the previous window.
   *
   * **Not against `dailySnapshots`.** Those rows describe the legacy demo — 10
   * riders, 7 captains, 6 subscriptions — where this layer holds 13, 52 and 47.
   * A delta across two populations that size apart is the L-3 defect (`:6969`)
   * with different numbers, and the snapshots say so in their own header.
   */

  const asOf = SNAPSHOT_PREVIOUS.end
  const baselineOf = async (key: string) => {
    const metric = (await allMetrics()).find((m) => m.key === key)!
    expect(metric.comparison.kind, key).toBe('previous-period')
    return metric.comparison.kind === 'previous-period' ? metric.comparison.value : null
  }

  it('active subscriptions — the subscriptions live on 10 Jun', async () => {
    const live = allSubscriptionFixtures.filter(
      (sub) =>
        sub.startedOn <= asOf &&
        sub.endsOn >= asOf &&
        (sub.cancelledAt === null || sub.cancelledAt.slice(0, 10) > asOf),
    )
    expect(await baselineOf('management.overview.activeSubscriptions')).toBe(live.length)
  })

  it('active captains — the active captains who had joined by 10 Jun', async () => {
    const joined = allDriverFixtures.filter((d) => d.status === 'active' && d.joinedAt <= asOf)
    expect(await baselineOf('management.overview.activeCaptains')).toBe(joined.length)
  })

  it('registered riders — the riders who had joined by 10 Jun', async () => {
    /* The tile moved from Overview to Growth this pass (§5.4: *"a cumulative
       census is an acquisition number, not a board number"*), and the key moved
       with it — `Metric.key` is namespaced by sub-tab. */
    const joined = riderFixtures.filter((r) => r.joinedAt <= asOf)
    expect(await baselineOf('management.growth.registeredRiders')).toBe(joined.length)
  })

  it('gross revenue — the snapshot rows of the previous fortnight, summed', async () => {
    /**
     * **The first tile to take a baseline from `dailySnapshots` rather than
     * from the fixture its value comes from**, and it is allowed to because the
     * *value* comes from the same place. The level mismatch that bars every
     * other snapshot field — 10 demo riders against this layer's 13 — cannot
     * bite when both sides of the delta are the same series.
     */
    const previous = snapshotsBetween(SNAPSHOT_PREVIOUS.start, SNAPSHOT_PREVIOUS.end).reduce(
      (total, s) => total + s.totalRevenueHalalas,
      0,
    )
    expect(await baselineOf('management.overview.grossRevenue')).toBe(previous)
    const tile = (await allMetrics()).find((m) => m.key === 'management.overview.grossRevenue')!
    const current = snapshotsBetween(SNAPSHOT_CURRENT.start, SNAPSHOT_CURRENT.end).reduce(
      (total, s) => total + s.totalRevenueHalalas,
      0,
    )
    expect(tile.value).toBe(current)
  })

  it('net subscription movement — started less cancelled, both inside the window', async () => {
    /* Spec §5.1 tile 4, replacing legacy defect L-3 (`:6969`), which compares a
       current-state active count against a cumulative cancelled one. Two
       period-scoped counts over one population is the whole fix. */
    const inWindow = (iso: string | null, start: string, end: string) =>
      iso !== null && iso.slice(0, 10) >= start && iso.slice(0, 10) <= end
    const net = (start: string, end: string) =>
      allSubscriptionFixtures.filter((s) => inWindow(s.startedOn, start, end)).length -
      allSubscriptionFixtures.filter((s) => inWindow(s.cancelledAt, start, end)).length

    const tile = (await allMetrics()).find(
      (m) => m.key === 'management.overview.netSubscriptionMovement',
    )!
    expect(tile.value).toBe(net(SNAPSHOT_CURRENT.start, SNAPSHOT_CURRENT.end))
    expect(await baselineOf('management.overview.netSubscriptionMovement')).toBe(
      net(SNAPSHOT_PREVIOUS.start, SNAPSHOT_PREVIOUS.end),
    )
    /* +30 against +31. Growing, and growing very slightly slower. */
    expect(tile.value).toBe(30)
    expect(tile.deltaPercent).toBe(-3.2)
  })

  it('new riders — the three days before the three the tile covers', async () => {
    /* And the measured-zero case (AC-606): nobody joined in the current window,
       so the tile reads `0` with a real delta, not an em-dash. */
    const prior = riderFixtures.filter((r) => r.joinedAt >= '2026-06-20' && r.joinedAt <= '2026-06-22')
    expect(await baselineOf('management.growth.newRiders')).toBe(prior.length)
    const metric = (await allMetrics()).find((m) => m.key === 'management.growth.newRiders')!
    expect(metric.value).toBe(0)
    expect(metric.deltaPercent).toBe(-100)
  })

  it('states a true reason wherever a comparison is still absent', async () => {
    /**
     * **Rewritten, and the two changes are deliberate rather than a repair.**
     * `docs/audit/PAGE-SWEEP.md` §2 S5 measured what the old truth cost: **40
     * of the 79 tiles** across the eight boards rendered an em-dash where a
     * delta belongs, twelve of twelve on `/operations/overview` — about 432px
     * of a 973px page reserved to say *"No comparison period yet"*.
     *
     * 1. **The queue-depth list is gone**, because its premise is gone. Those
     *    seven tiles now carry a **prior-window reading** — the row a server's
     *    metric history keeps at each period close — seeded on
     *    `comparison.value` with the window named. Each says in its own comment
     *    whether it is *recorded* or *reconstructed* from the fixture the value
     *    comes from. `spec 05 §4.2`'s *"where `no-history` remains correct"*
     *    list was a claim about the **ported legacy data**, and it is escalated
     *    to product-owner as an amendment rather than quietly overridden.
     * 2. **`support.overview.overturnRate` had gone stale.** Its
     *    `insufficient-data` was written when three fairness cases had been
     *    decided; the fixture now holds **42**, thirteen of them inside the
     *    previous window. A reason that was true is not the same thing as a
     *    reason that is true, and this is the assertion that should have caught
     *    it.
     *
     * What this test now guards is the thing that actually matters: **all three
     * `NoComparisonReason` members stay reachable from the fixtures**, so
     * AC-605's em-dash branch cannot be tested only in a mock.
     */
    const metrics = await allMetrics()
    const reasonOf = (key: string) => {
      const c = metrics.find((m) => m.key === key)!.comparison
      return c.kind === 'none' ? c.reason : c.kind
    }

    /* `insufficient-data`, and it is L-4 in the comparison slot: the stored
       per-rider renewal percentage carries no period at all, so there is no
       previous-period figure to compare against — not at any population. Not
       the same claim as "too few records", which is the one that went stale. */
    expect(reasonOf('management.performance.avgRenewalRate')).toBe('insufficient-data')

    /* And the client's own arm of it: a zero *previous-period* baseline has no
       percentage to take, so `resolve()` re-states the comparison. No steer
       offer was live a fortnight ago and none is live now. */
    expect(reasonOf('management.zones.steerOffersLive')).toBe('insufficient-data')

    /* `no-history`, still true and now rare: a ratio nothing in the dataset
       held a fortnight ago, and the contact log that has never been written to
       at all. */
    expect(reasonOf('management.overview.tripMix')).toBe('no-history')
    expect(reasonOf('support.overview.contactsPerThousandTrips')).toBe('no-history')

    /* And the one `no-target`: a promotion budget with a warning threshold in
       legacy and no board target anybody has set (M-1). Distinct from
       `no-history`, and the only tile in the product carrying it — which is
       what makes all three reasons reachable from the fixtures. */
    expect(reasonOf('management.growth.promoBudgetConsumed')).toBe('no-target')

    /* The seven that used to be here, each now naming the window it is
       measured against. Asserted as a group because the property that matters
       is the one the audit measured: an operational tile shows a delta. */
    for (const key of [
      'operations.overview.openRequests',
      'operations.overview.breachedWorkItems',
      'operations.overview.legsUncovered',
      'operations.overview.pendingApplications',
      'support.overview.openIncidents',
      'support.overview.openFairnessCases',
      'admin.overview.erasureOverdue',
    ]) {
      const metric = metrics.find((m) => m.key === key)!
      expect(metric.comparison.kind, key).toBe('previous-period')
      expect(metric.deltaPercent, key).not.toBeNull()
      if (metric.comparison.kind === 'previous-period') {
        expect(metric.comparison.periodStart, key).toBe(SNAPSHOT_PREVIOUS.start)
        expect(metric.comparison.periodEnd, key).toBe(SNAPSHOT_PREVIOUS.end)
      }
    }
  })

  it('no board keeps more than two tiles without a delta — the audit\'s S5 number', async () => {
    /**
     * The regression guard for `docs/audit/PAGE-SWEEP.md` §2 S5. Before this
     * pass: 12/12 on Operations, 8/8 on Risk, 9/11 on Growth, 5/8 on Support,
     * 5/6 on Admin, 4/6 on Performance. `/financials/overview` and
     * `/management/overview` were the two that were already right, and two is
     * now the ceiling for every board.
     *
     * Counted on `deltaPercent === null` rather than on `comparison.kind`,
     * because that is the field the tile branches on — including
     * `admin.overview.operatorsWithoutTwoFactor`, whose target of zero has no
     * percentage and is the documented break in the biconditional.
     */
    const byBoard = new Map<string, { total: number; withoutDelta: number }>()
    for (const metric of await allMetrics()) {
      const board = byBoard.get(metric.subTabId) ?? { total: 0, withoutDelta: 0 }
      board.total += 1
      if (metric.deltaPercent === null) board.withoutDelta += 1
      byBoard.set(metric.subTabId, board)
    }
    expect(byBoard.size).toBeGreaterThan(0)
    for (const [subTabId, board] of byBoard) {
      expect(board.withoutDelta, `${subTabId} — ${board.withoutDelta} of ${board.total}`).toBeLessThanOrEqual(2)
    }
  })

  it('reconstructs the three baselines that the fixtures can date', async () => {
    /**
     * A prior-window reading that the fixture can corroborate is not typed in,
     * it is **checked**. These three are evaluated over the same array their
     * value comes from, as at the close of the previous window, so a change to
     * `fixtures/applicants.ts` or `fixtures/fairness.ts` fails here rather than
     * drifting into a delta nobody re-derives.
     *
     * The rest of the prior-window readings on the six boards are **recorded**
     * and say so at the seed: their fixtures hold current state only — a
     * `suspended` flag with no stamp, a queue depth with no history — and there
     * is no date in them to reconstruct from.
     */
    const baselineOf2 = async (key: string) => {
      const metric = (await allMetrics()).find((m) => m.key === key)!
      return metric.comparison.kind === 'previous-period' ? metric.comparison.value : null
    }

    /* Applications submitted by 10 Jun and still undecided on it. */
    const pending = applicantFixtures.filter(
      (a) => a.appliedAt.slice(0, 10) <= asOf && (a.decidedAt === null || a.decidedAt.slice(0, 10) > asOf),
    )
    expect(await baselineOf2('operations.overview.pendingApplications')).toBe(pending.length)

    /* Fairness cases opened by 10 Jun and still undecided on it. */
    const openCases = fairnessCaseFixtures.filter(
      (c) => c.openedAt.slice(0, 10) <= asOf && (c.decidedAt === null || c.decidedAt.slice(0, 10) > asOf),
    )
    expect(await baselineOf2('support.overview.openFairnessCases')).toBe(openCases.length)

    /**
     * The overturn rate is **cumulative** — its tile declares no period — so the
     * baseline is the same cumulative rate evaluated at the close of 10 Jun,
     * not the rate *within* those fifteen days. Those are two different
     * populations and comparing them would be defect L-3 with better manners.
     */
    const decidedBy = fairnessCaseFixtures.filter(
      (c) =>
        c.decidedAt !== null &&
        c.decidedAt.slice(0, 10) <= asOf &&
        (c.status === 'upheld' || c.status === 'overturned'),
    )
    const overturnedBy = decidedBy.filter((c) => c.status === 'overturned')
    expect(decidedBy.length).toBeGreaterThan(0)
    expect(await baselineOf2('support.overview.overturnRate')).toBe(
      Math.round((overturnedBy.length / decidedBy.length) * 100),
    )
    /* And the two boards that carry this number agree, because they must. */
    expect(await baselineOf2('support.fairness.overturnRate')).toBe(
      await baselineOf2('support.overview.overturnRate'),
    )
  })
})

describe('7 — the cancellation rate, which is the tile this pass exists for', () => {
  /**
   * Spec §6.1 tile 1 — *"currently on no board at all. That is the
   * 'cancellations spiking' the business owner asked for."*
   *
   * The number is not seeded and it is not drawn: it is the mean of
   * `cancelRatePct` over snapshot rows ported verbatim from `:13803`–`:13832`.
   * These assertions recompute it from the rows, so editing a snapshot moves
   * the tile and this test together, and editing the tile alone fails.
   */

  const meanOf = (start: string, end: string) => {
    const rows = snapshotsBetween(start, end)
    return Math.round((rows.reduce((t, s) => t + s.cancelRatePct, 0) / rows.length) * 10) / 10
  }

  it('is the fifteen-day mean of the snapshot rows, both sides', async () => {
    const tile = (await allMetrics()).find(
      (m) => m.key === 'management.performance.cancellationRate',
    )!
    expect(tile.value).toBe(meanOf(SNAPSHOT_CURRENT.start, SNAPSHOT_CURRENT.end))
    expect(tile.comparison.kind === 'previous-period' && tile.comparison.value).toBe(
      meanOf(SNAPSHOT_PREVIOUS.start, SNAPSHOT_PREVIOUS.end),
    )
  })

  it('reads 5.2 % then 6.7 %, and knows that a rise is the bad direction', async () => {
    /* A **rate**, so it is level-independent — 3–9 % is as true of 47
       subscriptions as of the legacy demo's 6. That is why this one field
       survives the mismatch that keeps twenty-two other comparisons on
       `no-history`, and why the tile could ship at all. */
    const tile = (await allMetrics()).find(
      (m) => m.key === 'management.performance.cancellationRate',
    )!
    expect(tile.value).toBe(6.7)
    expect(tile.comparison.kind === 'previous-period' && tile.comparison.value).toBe(5.2)
    expect(tile.deltaPercent).toBe(28.8)
    expect(tile.direction).toBe('up')
    /* The field R4-5 spends on the screen-reader phrase rather than on colour:
       the operator hears "up, which is worse". */
    expect(tile.higherIsBetter).toBe(false)
  })

  it('has a chart plotting the same field over the same two windows', async () => {
    const chart = await getMetricSeries('management.performance.cancellationRate')
    expect(chart.current.points.length).toBe(15)
    expect(chart.comparison!.points.length).toBe(15)
    expect(chart.higherIsBetter).toBe(false)
    /* Every point is a real reading, in plot order, ending on the fixed clock's
       day. No gaps and no invention. */
    expect(chart.current.points.every((p) => typeof p.value === 'number')).toBe(true)
    expect(chart.current.points.at(-1)!.at).toBe(EYVAR_TODAY)
    expect(chart.current.points.map((p) => p.value)).toEqual(
      snapshotsBetween(SNAPSHOT_CURRENT.start, SNAPSHOT_CURRENT.end).map((s) => s.cancelRatePct),
    )
  })
})

describe('8 — trips completed is scoped to the window it declares (defect fix)', () => {
  /**
   * **It read `+157.9 %`**: 98 all-time completed trips against a literal 38
   * over a seven-day window. Two populations, one delta — legacy defect **L-3**
   * (`:6969`) in a new place, and the tile's own `periodStart` said seven days
   * while its value said "ever".
   *
   * `Trip.endedAt` is set on every completed trip in the fixture, so the fix is
   * to use it rather than to widen the label.
   */
  it('counts trips that FINISHED inside the window, not every trip ever', async () => {
    const finishedIn = (start: string, end: string) =>
      allTripFixtures.filter(
        (t) =>
          t.status === 'done' &&
          t.endedAt !== null &&
          t.endedAt.slice(0, 10) >= start &&
          t.endedAt.slice(0, 10) <= end,
      ).length

    const tile = (await allMetrics()).find((m) => m.key === 'management.performance.tripsCompleted')!
    expect(tile.periodStart).toBe(SNAPSHOT_CURRENT.start)
    expect(tile.periodEnd).toBe(SNAPSHOT_CURRENT.end)
    expect(tile.value).toBe(finishedIn(SNAPSHOT_CURRENT.start, SNAPSHOT_CURRENT.end))
    expect(tile.comparison.kind === 'previous-period' && tile.comparison.value).toBe(
      finishedIn(SNAPSHOT_PREVIOUS.start, SNAPSHOT_PREVIOUS.end),
    )
    /* 40 against 35, and emphatically not 98 against 38. */
    expect(tile.value).toBe(40)
    expect(tile.deltaPercent).toBe(14.3)
    expect(tile.value).not.toBe(allTripFixtures.filter((t) => t.status === 'done').length)
  })

  it('shares its window with the tiles it is the denominator of', async () => {
    /* §6.1 ranks this tile last because *"this is the denominator the other
       three are shares of, and it is here so those shares can be read
       honestly"* — which only holds if it covers the same fortnight. */
    const board = await getMetricBoard('management-performance')
    const trips = board.metrics.find((m) => m.key === 'management.performance.tripsCompleted')!
    const rate = board.metrics.find((m) => m.key === 'management.performance.cancellationRate')!
    expect(trips.periodStart).toBe(rate.periodStart)
    expect(trips.periodEnd).toBe(rate.periodEnd)
  })
})

describe('9 — breakdowns, the shape R4-4 added (AC-690 – AC-697)', () => {
  const boards = async () =>
    Promise.all(METRIC_BOARD_SUB_TABS.map((subTabId) => getMetricBoard(subTabId)))

  const allBreakdowns = async () => (await boards()).flatMap((b) => b.breakdowns)

  it('gives six of the eight boards a ranked list, which is the number F-1 predicted', async () => {
    const withOne = (await boards()).filter((b) => b.breakdowns.length > 0).map((b) => b.subTabId)
    expect(withOne.sort()).toEqual([
      'admin-overview',
      'management-performance',
      'management-risk',
      'management-zones',
      'operations-overview',
      'support-overview',
    ])
  })

  it('leaves Overview and Growth without one, on the spec\'s own instruction', async () => {
    /* §5.3: Overview is six tiles and two charts and that is the whole board.
       §8.3: Growth's two ranked lists carry row actions and are the sub-tab's
       `P1` table — a read-only top five above a table of the same rows is the
       duplication the spec exists to prevent. */
    for (const subTabId of ['management-overview', 'management-growth']) {
      expect((await getMetricBoard(subTabId)).breakdowns, subTabId).toEqual([])
    }
  })

  it('AC-691 — never pads to the cut-off, and never claims more rows than it has', async () => {
    for (const b of await allBreakdowns()) {
      expect(b.rows.length, `${b.key}: rows beyond the cut-off`).toBeLessThanOrEqual(b.rowsShown)
      expect(b.rowsTotal, `${b.key}: total below what is shown`).toBeGreaterThanOrEqual(
        b.rows.length,
      )
    }
  })

  it('AC-692 — a breakdown with zero rows exists, and it is the honest one', async () => {
    /**
     * Contact reasons: *"the most valuable list in the product"* (§11.3), and
     * it ships empty because `DB.contacts` is `[]` (`:14718`). The registry of
     * 26 reason codes with their root-cause owners is real; the volume is not.
     * Seeding plausible numbers here would put a ranking of invented product
     * problems in front of the person who has to act on it.
     */
    const board = await getMetricBoard('support-overview')
    const contacts = board.breakdowns.find((b) => b.key === 'support.contactReasons')!
    expect(contacts.rows).toEqual([])
    expect(contacts.rowsTotal).toBe(0)
  })

  it('AC-693 — a row either links to something filtered to it, or is not a link', async () => {
    for (const b of await allBreakdowns()) {
      for (const row of b.rows) {
        if (row.drilldownRoute === null) continue
        /**
         * A destination either carries a `?view=` that narrows it to the row,
         * or is a surface whose DEFAULT landing already is that row. Two
         * qualify and both are named rather than matched by a loose pattern:
         * Captain Fairness opens on its open cases, and Admin › Team opens on
         * the rota pane the gap rows point at.
         *
         * Anything else linking to a bare list would be worse than not linking
         * at all, because it looks like it worked (F-8, AC-653).
         */
        const DEFAULT_LANDS_ON_THE_ROW = ['/support/fairness', '/admin/team']
        if (DEFAULT_LANDS_ON_THE_ROW.includes(row.drilldownRoute)) continue
        expect(row.drilldownRoute, `${b.key} / ${row.id}`).toContain('?view=')
      }
    }
  })

  it('AC-697 — a label is a key or an entity name, and never a key that is one parameter', async () => {
    /* **R5-7.** The old form of this assertion was *every label is a key*, and
       it passed because every entity name went through `breakdown.row.entity`,
       whose whole English string was `{name}`. The clause AC-697 gains is the
       one that would have caught that: **a row label is never a key whose whole
       string is a parameter.** The union makes it structural — a `text` label
       cannot be a key at all. */
    for (const b of await allBreakdowns()) {
      for (const row of b.rows) {
        if (row.label.kind === 'key') {
          expect(row.label.key, `${b.key} / ${row.id}`).toMatch(/^breakdown\./)
          expect(row.label.key, `${b.key} / ${row.id}`).not.toBe('breakdown.row.entity')
        } else {
          expect(row.label.text.length, `${b.key} / ${row.id}`).toBeGreaterThan(0)
        }
        if (row.subLabelKey !== null) {
          expect(row.subLabelKey, `${b.key} / ${row.id}`).toMatch(/^breakdown\./)
        }
      }
    }
  })

  it('draws a bar only where the rows share one unit and one denominator', async () => {
    /**
     * R4-4's rule, and it does real work rather than being quoted: **three of
     * the six breakdowns carry `bar: false`** because their rows are rates over
     * their own bases — five captains' late-trip shares over five different
     * trip counts, five subscriptions' own renewal probabilities, four cities
     * whose failure rate three of them cannot fill. A bar there is a lie about
     * a shared scale.
     */
    for (const b of await allBreakdowns()) {
      if (b.bar) {
        expect(new Set(b.rows.map((r) => r.unit)).size, `${b.key}: mixed units under a bar`)
          .toBeLessThanOrEqual(1)
        for (const row of b.rows) {
          expect(row.barFraction, `${b.key} / ${row.id}`).not.toBeNull()
          expect(row.barFraction!, `${b.key} / ${row.id}`).toBeGreaterThanOrEqual(0)
          expect(row.barFraction!, `${b.key} / ${row.id}`).toBeLessThanOrEqual(1)
        }
      } else {
        /* A row may not draw a bar the breakdown forbids. */
        for (const row of b.rows) expect(row.barFraction, `${b.key} / ${row.id}`).toBeNull()
      }
    }
    expect((await allBreakdowns()).filter((b) => !b.bar).length).toBeGreaterThan(0)
  })

  it('AC-695 — the Operations breakdown sums to the two tiles above it', async () => {
    /**
     * The criterion that makes a breakdown worth having rather than a second
     * opinion. Both the breakdown and the tiles are built from
     * `workBacklogByQueue()`, so this is arithmetic rather than a coincidence
     * somebody has to maintain — and if the two ever separate, this fails
     * before an operator sees two numbers for one thing.
     */
    const board = await getMetricBoard('operations-overview')
    const queues = board.breakdowns.find((b) => b.key === 'operations.backlogByQueue')!
    expect(queues.rows.length).toBe(5)

    const breachedTile = board.metrics.find(
      (m) => m.key === 'operations.overview.breachedWorkItems',
    )!
    const unclaimedTile = board.metrics.find((m) => m.key === 'operations.overview.unclaimedWork')!

    const breached = await listWorkItems({ view: 'breached', pageSize: 500, includeOtherRoles: true })
    const unassigned = await listWorkItems({
      view: 'unassigned',
      pageSize: 500,
      includeOtherRoles: true,
    })

    /* **R5-5 withdrew the secondary column**, so the breached count now lives
       in the sub-label's params. AC-695 is unchanged as an obligation — the
       list still states the same total as the tile — only the slot moved. */
    expect(
      queues.rows.reduce((t, r) => t + Number(r.subLabelParams?.past ?? 0), 0),
    ).toBe(breachedTile.value)
    expect(breachedTile.value).toBe(breached.total)
    expect(unclaimedTile.value).toBe(unassigned.total)
  })

  it('AC-695 — the rota breakdown sums to the rota tile', async () => {
    /* 7 days × 6 slots = 42, and `DB.onCallSchedule.assign` is `{}` (`:19604`),
       so every slot is a gap and nobody is on call at any hour (L-9, AC-682). */
    const board = await getMetricBoard('admin-overview')
    const rota = board.breakdowns.find((b) => b.key === 'admin.rotaGapsByDay')!
    const tile = board.metrics.find((m) => m.key === 'admin.overview.rotaGaps')!
    expect(rota.rows.reduce((t, r) => t + r.value, 0)).toBe(tile.value)
    expect(tile.value).toBe(42)
    /* `WEEKEND` is `['fri','sat']` (`:19596`) and the night block is high-risk
       every day, so 6 + 6 + 2×5 = 22 high-risk gaps — `rotaStats().highRisk`. */
    expect(rota.rows.reduce((t, r) => t + Number(r.subLabelParams?.count ?? 0), 0)).toBe(22)
    /* **V-13, by rule.** Seven rows all valued 6 means `max === min`, so R5-6
       forbids the bar and no row may carry a fraction. */
    expect(rota.bar).toBe(false)
    expect(rota.rows.every((r) => r.barFraction === null)).toBe(true)
  })

  it('AC-694 — no row carries anything that could mutate a record', async () => {
    /* Structural rather than aspirational: `MetricBreakdownRow` has no action
       field at all, so a row cannot carry one. The assertion is that nobody has
       smuggled one in as a route that performs something. */
    for (const b of await allBreakdowns()) {
      for (const row of b.rows) {
        expect(Object.keys(row).sort()).toEqual([
          'barFraction',
          'currency',
          'drilldownRoute',
          'id',
          'label',
          'subLabelKey',
          'subLabelParams',
          'unit',
          'value',
        ])
      }
    }
  })

  it('keeps Market & Zones free of a zone-dimension list — R4-6', async () => {
    /* R4-6: Market & Zones is an index table with a metric strip and *"a ranked
       top-5 above a full table of the same rows is the same data twice"*. So
       §9.3's first two breakdowns do not ship. Cities do — a different
       dimension, and the reason for the prohibition does not reach them. */
    const board = await getMetricBoard('management-zones')
    expect(board.breakdowns.map((b) => b.dimension)).toEqual(['city'])
  })
})

describe('10 — a board declares conditions; the page renders at most one (R4-4 §4.3)', () => {
  it('declares at most three per board, and never more than the ruling allows', async () => {
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      const board = await getMetricBoard(subTabId)
      expect(board.notices.length, subTabId).toBeLessThanOrEqual(3)
    }
  })

  it('only declares a condition the board already shows a number for', async () => {
    /**
     * **The ruling's own test, and the one worth automating**: *"a notice may
     * only exist for a condition the board already shows a number for. A banner
     * saying something no tile on the page can corroborate is a banner the
     * operator cannot act on."*
     *
     * Both notices carry a `count` param, and both counts must equal a tile on
     * the same board.
     */
    const corroborates: Record<string, string> = {
      'notice.support.unacknowledgedSos': 'support.overview.unacknowledgedCriticalIncidents',
      'notice.admin.erasureOverdue': 'admin.overview.erasureOverdue',
      'notice.operations.applicationsPastWindow': 'operations.overview.applicationsPastWindow',
      'notice.operations.complianceExpired': 'operations.overview.complianceExpired',
    }
    let checked = 0
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      const board = await getMetricBoard(subTabId)
      for (const notice of board.notices) {
        const tileKey = corroborates[notice.key]
        expect(tileKey, `${notice.key} corroborates no tile`).toBeDefined()
        const tile = board.metrics.find((m) => m.key === tileKey)
        expect(tile, `${tileKey} is not on ${subTabId}`).toBeDefined()
        expect(notice.params?.count, notice.key).toBe(tile!.value)
        checked += 1
      }
    }
    expect(checked).toBe(4)
  })

  it('sends every notice somewhere, in a tone R7 has a fill for', async () => {
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      for (const notice of (await getMetricBoard(subTabId)).notices) {
        expect(['critical', 'warning', 'info', 'success']).toContain(notice.tone)
        expect(notice.action, notice.key).not.toBeNull()
        expect(notice.action!.route, notice.key).toMatch(/^\//)
        expect(typeof notice.severity).toBe('number')
      }
    }
  })

  it('gives ONE board two competing notices, so the tie-break runs on real data', async () => {
    /**
     * **The gap `fixtures/metrics.ts` recorded and this closes.** Until this
     * pass no board declared two, so every multi-notice case in
     * `src/screens/metrics/board.test.ts` was `SYNTHETIC` and the selection
     * rule had never chosen between two real conditions.
     *
     * The assertion that matters is the **declaration order**: the `warning` is
     * declared first, because it corroborates tile 1 and the `critical`
     * corroborates tile 7. An implementation that took the first notice, or
     * that ordered by `severity` before `tone`, would render the wrong banner
     * and this fails.
     */
    const board = await getMetricBoard('operations-overview')
    expect(board.notices.map((n) => n.key)).toEqual([
      'notice.operations.applicationsPastWindow',
      'notice.operations.complianceExpired',
    ])
    expect(board.notices.map((n) => n.tone)).toEqual(['warning', 'critical'])
    /* Both counts are 2 and both are DERIVED — a fixture edit to an applicant
       or a compliance row moves the tile and the notice together, or this
       fails. That is the corroboration rule, made structural. */
    expect(board.notices.every((n) => n.params?.count === 2)).toBe(true)
  })

  it('leaves the rota gaps a tile rather than a notice, though all 42 are empty', async () => {
    /* R4-4 §4.3: severe, visible, and **recoverable** — somebody can be
       assigned at any moment. A notice is for a condition where the delay
       itself does the damage. Same test as R4-10b, one level up. */
    const board = await getMetricBoard('admin-overview')
    expect(board.metrics.find((m) => m.key === 'admin.overview.rotaGaps')!.value).toBe(42)
    expect(board.notices.map((n) => n.key)).toEqual(['notice.admin.erasureOverdue'])
  })
})

describe('11 — captions state a scope, and nothing else (R4-4 §4.2)', () => {
  it('gives the three tiles F-2 named a caption they cannot ship without', async () => {
    const metrics = await allMetrics()
    const captionOf = (key: string) => metrics.find((m) => m.key === key)!.caption
    /* AC-641 · AC-674 · AC-675 — the dormancy proxy, the uncoded ceiling and
       the reason a high overturn rate is good news. */
    expect(captionOf('management.growth.dormantRiderShare')).toBe('caption.dormancyProxy')
    expect(captionOf('support.overview.uncodedContactShare')).toBe('caption.uncodedCeiling')
    expect(captionOf('support.overview.overturnRate')).toBe('caption.overturnIsNotFailure')
  })

  it('is a key on every tile that has one, and null on the rest', async () => {
    const metrics = await allMetrics()
    for (const m of metrics) {
      if (m.caption === null) continue
      expect(m.caption, m.key).toMatch(/^caption\./)
    }
    /* Most tiles need none. A caption on every tile is a caption nobody reads,
       and it is how the field becomes a slop field. */
    expect(metrics.filter((m) => m.caption === null).length).toBeGreaterThan(metrics.length / 2)
  })
})

describe('money is integer minor units here too', () => {
  it('carries no fractional halalas in any money metric or series', async () => {
    const amounts: number[] = []
    for (const m of await allMetrics()) {
      if (m.unit !== 'money') continue
      expect(m.currency, m.key).toBe('SAR')
      if (m.value !== null) amounts.push(m.value)
      if (m.comparison.kind !== 'none') amounts.push(m.comparison.value)
    }
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      for (const chart of (await getMetricBoard(subTabId)).charts) {
        if (chart.unit !== 'money') continue
        for (const window of [chart.current, chart.comparison]) {
          for (const point of window?.points ?? []) {
            if (point.value !== null) amounts.push(point.value)
          }
        }
      }
    }
    expect(amounts.length).toBeGreaterThan(0)
    expect(amounts.filter((a) => !Number.isInteger(a))).toEqual([])
  })
})
