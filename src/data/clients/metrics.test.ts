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
import { safetyIncidentFixtures } from '../fixtures/safety'
import { addDays } from '../reporting/buckets'
import { listDrivers } from './drivers'
import { listSafetyIncidents } from './safety'
import { listSubscriptions } from './subscriptions'
import { WORK_SOURCES, listWorkItems } from './myWork'
import {
  METRIC_BOARD_SUB_TABS,
  getMetricBoard,
  getMetricSeries,
  listMetrics,
} from './metrics'
import { getRouteTable } from './routes'
import type { TimeSeries } from '../types/metrics'

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
    /* **The guard the title needs.** `[].every()` is vacuously `true`, and the
       length assertion above covers `metrics` only — so `management-risk`
       could stop seeding a single series and this line, in a test that says
       "metrics AND series", would still be green over nothing. */
    expect(board.charts.length, 'the board seeds series, not only tiles').toBeGreaterThan(0)
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

  it('gives five of the eight boards a ranked list: F-1 predicted six, and O-T4 retired the rota one', async () => {
    const withOne = (await boards()).filter((b) => b.breakdowns.length > 0).map((b) => b.subTabId)
    expect(withOne.sort()).toEqual([
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

  it('AC-692 / B3 — the contact reasons list is fed by the ticket store, most first', async () => {
    /**
     * Contact reasons: *"the most valuable list in the product"* (§11.3), and
     * it ships empty because `DB.contacts` is `[]` (`:14718`). The registry of
     * 26 reason codes with their root-cause owners is real; the volume is not.
     * Seeding plausible numbers here would put a ranking of invented product
     * problems in front of the person who has to act on it.
     */
    const board = await getMetricBoard('support-overview')
    const contacts = board.breakdowns.find((b) => b.key === 'support.contactReasons')!
    expect(contacts.rows.length).toBeGreaterThan(0)
    expect(contacts.rowsTotal).toBeGreaterThanOrEqual(contacts.rows.length)
    expect(contacts.awaitingStore).toBeNull()
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
    /* Seven since T1.6: tickets and disputes project into My Work, so the
       shift's backlog has two more queues in it. `WORK_SOURCES` is the one
       list, and this row count reads it rather than restating a number. */
    expect(queues.rows.length).toBe(WORK_SOURCES.length)

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

  it('TA-7 — the on-call tile counts the empty rota slots and moves with the rota', async () => {
    /* O-T4: one on-call model. The seed fills both slots, so the tile reads 0. */
    const { updateOnCallRota, resetTeam } = await import('./team')
    resetTeam()
    let board = await getMetricBoard('admin-overview')
    expect(board.metrics.find((m) => m.key === 'admin.overview.rotaGaps')!.value).toBe(0)
    expect(board.breakdowns.find((b) => b.key === 'admin.rotaGapsByDay')).toBeUndefined()

    await updateOnCallRota({ primaryUserId: null, secondaryUserId: 'USR-3' })
    board = await getMetricBoard('admin-overview')
    expect(board.metrics.find((m) => m.key === 'admin.overview.rotaGaps')!.value).toBe(1)
    resetTeam()
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

  it('leaves the rota gaps a tile rather than a notice', async () => {
    /* R4-4 §4.3: severe, visible, and **recoverable** — somebody can be
       assigned at any moment. A notice is for a condition where the delay
       itself does the damage. Same test as R4-10b, one level up. */
    const board = await getMetricBoard('admin-overview')
    expect(board.metrics.find((m) => m.key === 'admin.overview.rotaGaps')!.value).toBe(0)
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

/**
 * **12 — a window the operator asks for moves what it can, and declares what it
 * cannot.**
 *
 * `windowed()` used to move every metric's `periodStart`/`periodEnd` onto the
 * requested range while leaving `value`, `deltaPercent` and `comparison`
 * exactly as seeded. Pick `Today` and a fifteen-day figure asserted a one-day
 * window: **invented data, produced by relabelling rather than by arithmetic**,
 * which is the cheaper way to tell the same lie.
 *
 * Recomputing was considered and is not available here. Of the seventy-eight
 * seeded metrics, twenty-two declare a period at all, and of those exactly two
 * are derived over a window this layer could re-take (`tripsCompleted` and
 * `cancellationRate`, both over `SNAPSHOT_CURRENT`). Every other value is
 * either a scalar somebody wrote down or a count over a whole fixture
 * population — `allDriverFixtures.filter(d => d.suspended).length` has no date
 * to filter on. **Three of the eleven series share a key with a metric and none
 * of the three declares `windowTotal`**, so even where points exist there is no
 * stated rule for turning them into the tile's one number: `windowTotal` is
 * carried by exactly the eight charts that own no metric. A board where two
 * tiles of twenty-two answered the range, all twenty-two wearing the same
 * label, is less honest than a board where none do and the page says so.
 *
 * So: the figures and their labels are untouched, the charts really do slice,
 * and the divergence is declared as a notice the page renders in words.
 */
describe('12 — a window the operator asks for moves what it can, and declares what it cannot', () => {
  /* Three days inside every seeded current window, so the slice is non-empty on
     every board and the assertions below are never vacuous. */
  const PICKED = { from: '2026-06-23', to: '2026-06-25' }
  const PERIOD_NOTICE_KEY = 'overview.period.figuresUnchanged'

  it('leaves every tile exactly as the unwindowed board served it — value, delta and PERIOD', async () => {
    /* The whole defect, pinned in one assertion. `toEqual` over the array
       covers `value`, `deltaPercent`, `comparison` and both period fields at
       once, so a future edit that moves any of them fails here rather than on
       screen. */
    let compared = 0
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      const own = await getMetricBoard(subTabId)
      const asked = await getMetricBoard(subTabId, PICKED)
      expect(asked.metrics, subTabId).toEqual(own.metrics)
      compared += own.metrics.length
    }
    expect(compared).toBeGreaterThan(0)
  })

  it('is not a vacuous check — tiles really do declare a window other than the one asked for', async () => {
    /* Without this, the assertion above would pass on a dataset of purely
       point-in-time tiles and prove nothing. */
    const board = await getMetricBoard('management-overview', PICKED)
    const dated = board.metrics.filter((m) => m.periodStart !== null)
    expect(dated.length).toBeGreaterThan(0)
    expect(dated.some((m) => m.periodStart !== PICKED.from || m.periodEnd !== PICKED.to)).toBe(true)
  })

  it('never gives a point-in-time metric a period', async () => {
    /* "Active captains right now" is not taken over a window, and a range
       control that appeared to scope it would be claiming a count was. */
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      const own = await getMetricBoard(subTabId)
      const asked = await getMetricBoard(subTabId, PICKED)
      const pointInTime = own.metrics.filter((m) => m.periodStart === null).map((m) => m.key)
      for (const key of pointInTime) {
        const metric = asked.metrics.find((m) => m.key === key)!
        expect(metric.periodStart, key).toBeNull()
        expect(metric.periodEnd, key).toBeNull()
      }
    }
  })

  it('slices each chart to the range and names the range it kept', async () => {
    const board = await getMetricBoard('management-overview', PICKED)
    const chart = board.charts.find((c) => c.key === 'management.overview.quickRideRevenue')!
    expect(chart.current.periodStart).toBe(PICKED.from)
    expect(chart.current.periodEnd).toBe(PICKED.to)
    expect(chart.current.points.map((p) => p.at)).toEqual([
      '2026-06-23',
      '2026-06-24',
      '2026-06-25',
    ])
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      for (const c of (await getMetricBoard(subTabId, PICKED)).charts) {
        for (const point of c.current.points) {
          expect(point.at >= PICKED.from && point.at <= PICKED.to, `${c.key} ${point.at}`).toBe(true)
        }
      }
    }
  })

  it('moves the comparison window by the offset the fixture declares, not onto the range itself', async () => {
    /**
     * Slicing the comparison by the *current* range emptied it — every one of
     * its points is dated in the previous window — and then labelled it with
     * the current range's dates, so §3.7's legend printed two chips naming the
     * same three days over a single line.
     *
     * The offset is read off the two declared `periodStart`s: 11 Jun against
     * 27 May is fifteen days, so 23–25 Jun asks the baseline for 8–10 Jun.
     * That is the correspondence the fixture already asserts by keeping the two
     * windows equal in length and zipping them by index.
     */
    const board = await getMetricBoard('management-overview', PICKED)
    const chart = board.charts.find((c) => c.key === 'management.overview.quickRideRevenue')!
    expect(chart.comparison!.periodStart).toBe('2026-06-08')
    expect(chart.comparison!.periodEnd).toBe('2026-06-10')
    expect(chart.comparison!.points.map((p) => p.at)).toEqual([
      '2026-06-08',
      '2026-06-09',
      '2026-06-10',
    ])
  })

  it('keeps both windows the same length under a window, so the dotted line still aligns', async () => {
    /* The same invariant §3 asserts for the unwindowed board. A comparison left
       whole beside a sliced current would be truncated by index and would draw
       the picked day against the FIRST day of the previous fortnight. */
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      for (const chart of (await getMetricBoard(subTabId, PICKED)).charts) {
        if (!chart.comparison || chart.current.points.length === 0) continue
        expect(chart.comparison.points.length, chart.key).toBe(chart.current.points.length)
      }
    }
  })

  it('leaves a series that declares no comparison without one', async () => {
    const board = await getMetricBoard('management-risk', PICKED)
    expect(board.charts.find((c) => c.key === 'management.risk.openSignals')!.comparison).toBeNull()
  })

  it('declares the divergence as a notice, with no action and no interpolated date', async () => {
    const board = await getMetricBoard('management-overview', PICKED)
    const declared = board.notices.filter((n) => n.key === PERIOD_NOTICE_KEY)
    expect(declared.length).toBe(1)
    expect(declared[0]!.tone).toBe('info')
    /* Nowhere to send anybody — the fixture limit is not an operator's to fix. */
    expect(declared[0]!.action).toBeNull()
    /* `params` reach `t()` unformatted, and `formatDate` owns the calendar and
       the numbering system (§18). A date in here prints Gregorian Latin digits
       inside an Arabic sentence. */
    expect(declared[0]!.params).toBeNull()
  })

  it('adds it to the board own conditions rather than replacing them', async () => {
    const own = await getMetricBoard('support-overview')
    const asked = await getMetricBoard('support-overview', PICKED)
    expect(own.notices.map((n) => n.key)).toEqual(['notice.support.unacknowledgedSos'])
    expect(asked.notices.map((n) => n.key)).toEqual([
      'notice.support.unacknowledgedSos',
      PERIOD_NOTICE_KEY,
    ])
  })

  it('is the only info notice anywhere, so it can displace nothing and collides with nothing', async () => {
    /* `selectNotice` takes the highest TONE first, then the highest severity
       within it. `info` is outranked by every condition the fixtures declare —
       all four are `critical` or `warning` — so this notice can never take a
       banner from an unacknowledged SOS. The consequence runs the other way and
       is a real gap: on a board that already declares one, the caveat is
       SUPPRESSED. It is recorded in the handoff, not fixed by promoting a tone.
       The uniqueness also makes `severity` moot, since severity is only ever
       compared within a tone. */
    const infos: string[] = []
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      for (const board of [
        await getMetricBoard(subTabId),
        await getMetricBoard(subTabId, PICKED),
      ]) {
        for (const n of board.notices) if (n.tone === 'info') infos.push(n.key)
      }
    }
    expect([...new Set(infos)]).toEqual([PERIOD_NOTICE_KEY])
  })

  it('keeps every windowed board inside R4-4 4.3 bound of three', async () => {
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      const board = await getMetricBoard(subTabId, PICKED)
      expect(board.notices.length, subTabId).toBeLessThanOrEqual(3)
    }
  })

  it('declares nothing when the range IS the window the tiles carry', async () => {
    /* Asking for the window a board already answers is not a divergence, and a
       banner stating one would be a banner that is false. */
    const board = await getMetricBoard('support-fairness', { from: '2026-06-19', to: '2026-06-25' })
    /* Without this the `.every()` below is `true` over an empty array, and a
       `getMetricBoard` that returned no tiles at all for a windowed request
       would pass the test written to catch exactly that. */
    expect(board.metrics.length, 'the windowed board still carries its tiles').toBeGreaterThan(0)
    expect(
      board.metrics.every((m) => m.periodStart === null || m.periodStart === '2026-06-19'),
    ).toBe(true)
    expect(board.notices.map((n) => n.key)).not.toContain(PERIOD_NOTICE_KEY)
  })

  it('declares nothing on a board whose tiles carry no period at all', async () => {
    /* Operations and Admin overview are entirely point-in-time. Nothing on them
       claims a window, so nothing on them diverges from one. */
    for (const subTabId of ['operations-overview', 'admin-overview']) {
      const board = await getMetricBoard(subTabId, PICKED)
      /* `[].some()` is `false`, so without this the whole subject of the test
         goes unverified the moment a windowed point-in-time board returns no
         metrics: the claim "nothing on them claims a window" would be carried
         by there being nothing on them at all. The sibling at the top of this
         file guards; this one did not. */
      expect(board.metrics.length, subTabId).toBeGreaterThan(0)
      expect(
        board.metrics.some((m) => m.periodStart !== null),
        subTabId,
      ).toBe(false)
      expect(board.notices.map((n) => n.key), subTabId).not.toContain(PERIOD_NOTICE_KEY)
    }
  })

  it('serves a board asked for no window byte for byte, notices included', async () => {
    /* `undefined` is *do not filter*, and it is what keeps the rest of this
       suite describing the fixtures rather than this function arithmetic. */
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      const board = await getMetricBoard(subTabId)
      expect(board.notices.map((n) => n.key), subTabId).not.toContain(PERIOD_NOTICE_KEY)
    }
  })
})

/* ═══════════════════════ 13 — §E4, the KPI row that drives a chart ═══════
   `BoardHero`'s lead row becomes a `radiogroup` when a board carries TWO OR
   MORE `rank: 'lead'` metrics whose keys a `TimeSeries` also carries
   (`MetricBoardScreen`: `charts.find(c => c.key === metric.key)`). One
   selectable lead hoists its chart under the band and leaves the row the plain
   list it always was; none hoists nothing.

   The join is a fact about THIS FIXTURE and about nothing else, so it is
   pinned here rather than inferred on a screen. Everything below fails in both
   directions — a series that stops matching a metric and a series that starts
   matching one both change what a board renders, and neither should happen
   without somebody deciding it.                                             */

describe('13 — the metric ↔ series join that §E4 selects on', () => {
  const seriesKeys = async () => {
    const keys: string[] = []
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      for (const chart of (await getMetricBoard(subTabId)).charts) keys.push(chart.key)
    }
    return keys
  }

  it('gives every chart a key no other chart uses — `getMetricSeries` finds by key', async () => {
    const keys = await seriesKeys()
    expect(new Set(keys).size).toBe(keys.length)
  })

  /**
   * **The whole join, as one list.**
   *
   * Seven of the fifteen series share a key with a metric; the other eight are
   * the charts that own no tile, and those two facts are the same fact — see
   * the `windowTotal` assertion below, which is its other half.
   *
   * Four of the seven arrived with §E4 and are the reason the radiogroup is
   * reachable from real data at all. They were **not** produced by loosening
   * the join: each is a reconstruction over rows this layer already serves, and
   * each is pinned against the tile it sits under in section 14.
   */
  it('shares a key with a metric on exactly nine of the seventeen series', async () => {
    const metricKeys = new Set((await allMetrics()).map((m) => m.key))
    const shared = (await seriesKeys()).filter((k) => metricKeys.has(k)).sort()
    expect(shared).toEqual([
      'management.overview.grossRevenue',
      'management.performance.cancellationRate',
      'management.performance.tripsCompleted',
      'support.fairness.earningsPerEngagedHour',
      'support.fairness.overturnRate',
      'support.overview.contactsPerThousandTrips',
      'support.overview.openIncidents',
      'support.overview.ticketsBreaching',
      'support.overview.unacknowledgedCriticalIncidents',
    ])
    expect((await seriesKeys()).length).toBe(17)
  })

  /**
   * **Which boards render the radiogroup, per board, with the keys in the order
   * the row draws them.**
   *
   * Read as a table rather than as a predicate. A board is a *choice* at two and
   * a plain list below it, and the difference is announced — a radiogroup of one
   * is *"radio button, checked, 1 of 1"* about a control with no second state,
   * which is why `MetricBoardScreen` sets the threshold at two.
   *
   * **Three boards are live.** `management-performance`, `support-fairness` and
   * `support-overview` each carry two charted leads, so each renders a real
   * radiogroup whose selection redraws the chart under the band.
   *
   * The order matters and is asserted, not incidental: `getMetricBoard` sorts
   * the leads into `BOARD_LEADS` order, so the FIRST entry here is the one the
   * band checks on arrival and the chart it hoists. `tripsCompleted` before
   * `cancellationRate` is that table's editorial sequence — *volume, then the
   * way it failed* — surviving into the rendered row.
   *
   * **`management-overview` is the ONE board with exactly one charted lead**, so
   * it hoists `grossRevenue`'s line under the band and leaves the row a plain
   * list. That case is worth having in the real fixtures and not only in a
   * constructed board — it is what every other board looks like the day it gains
   * a first chartable lead.
   *
   * **Five boards stay a plain list with nothing hoisted, and none is a gap to
   * close.** They carry no lead that anything can honestly chart:
   * `management-risk` and `admin-overview` lead with point-in-time readings
   * nothing records a history of; `management-zones` leads with a 30-day rolling
   * total; `management-growth` and `operations-overview` lead with measures
   * whose daily reconstruction crosses stores that keep no dated rows. Inventing
   * a series for any of them is the one thing this fixture will not do.
   */
  it('gives three boards a real choice, and leaves six a plain list', async () => {
    const joinable: Record<string, string[]> = {}
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      const board = await getMetricBoard(subTabId)
      const charted = new Set(board.charts.map((c) => c.key))
      joinable[subTabId] = board.metrics
        .filter((m) => m.rank === 'lead' && charted.has(m.key))
        .map((m) => m.key)
    }
    expect(joinable).toEqual({
      'management-overview': ['management.overview.grossRevenue'],
      'management-performance': [
        'management.performance.tripsCompleted',
        'management.performance.cancellationRate',
      ],
      'management-risk': [],
      'management-growth': [],
      'management-zones': [],
      'operations-overview': [],
      'support-overview': [
        'support.overview.unacknowledgedCriticalIncidents',
        'support.overview.openIncidents',
      ],
      'admin-overview': [],
      'support-fairness': [
        'support.fairness.overturnRate',
        'support.fairness.earningsPerEngagedHour',
      ],
    })
    const live = Object.entries(joinable)
      .filter(([, leads]) => leads.length >= 2)
      .map(([subTabId]) => subTabId)
    expect(live).toEqual(['management-performance', 'support-overview', 'support-fairness'])
  })

  /**
   * **The chart the band hoists on arrival is a chart the board actually has.**
   *
   * `MetricBoardScreen` falls back to `selectableLeads[0]?.key` when the
   * operator has chosen nothing, and lifts that chart out of the detail row. If
   * a lead were charted by a series on ANOTHER board the find would return
   * nothing and the band would hoist an empty slot, so the join is checked
   * within the board rather than across the fixture.
   */
  it('keeps every joinable lead’s chart on the same board as the figure', async () => {
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      const board = await getMetricBoard(subTabId)
      for (const chart of board.charts) {
        const owner = board.metrics.find((m) => m.key === chart.key)
        if (!owner) continue
        expect(owner.subTabId, chart.key).toBe(chart.subTabId)
        expect(chart.subTabId, chart.key).toBe(subTabId)
      }
    }
  })

  /**
   * **`windowTotal` is declared by exactly the charts that own no tile**, which
   * is what `types/metrics.ts` says it is for: *"a chart whose key matches a
   * metric on the same board shows THAT metric, which is the number the board
   * already owns"*.
   *
   * Stated as a biconditional over the real fixtures rather than as a count of
   * eight, because the count is right by coincidence the moment a series is
   * added and another removed. A twelfth series that shared a key with a metric
   * AND declared a `sum` would print two different numbers for one measure at
   * the top of one card, and only this shape catches that.
   */
  it('declares a windowTotal on a chart if and only if no metric owns its key', async () => {
    const metricKeys = new Set((await allMetrics()).map((m) => m.key))
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      for (const chart of (await getMetricBoard(subTabId)).charts) {
        const ownsATile = metricKeys.has(chart.key)
        const declares = chart.windowTotal !== undefined && chart.windowTotal !== null
        expect(declares, `${chart.key} — owned by a tile: ${ownsATile}`).toBe(!ownsATile)
      }
    }
  })

  it('gives a series that owns a tile that tile’s unit, currency and valence', async () => {
    const metrics = await allMetrics()
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      for (const chart of (await getMetricBoard(subTabId)).charts) {
        const owner = metrics.find((m) => m.key === chart.key)
        if (!owner) continue
        expect(chart.unit, chart.key).toBe(owner.unit)
        expect(chart.currency, chart.key).toBe(owner.currency)
        /* The tile's valence and the card's must agree, or one of them tints a
           trend the other calls good. */
        expect(chart.higherIsBetter, chart.key).toBe(owner.higherIsBetter)
      }
    }
  })

  /**
   * **A gap is `null` and a zero is `0`, on every point of every series.**
   *
   * Section 4 pins the three named cases; this pins the property over the whole
   * fixture, so a series added later cannot quietly fill a missing day with a
   * zero. There is nothing to assert about *which* days are gaps — that is
   * editorial — but there is something to assert about the alternative never
   * being reached for: every point is a finite number or `null`, and both kinds
   * exist, so neither clause is vacuous.
   */
  it('carries a number or a null on every point, and never a stand-in for a gap', async () => {
    let nulls = 0
    let zeros = 0
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      for (const chart of (await getMetricBoard(subTabId)).charts) {
        for (const window of [chart.current, chart.comparison]) {
          if (!window) continue
          for (const point of window.points) {
            expect(point.at, chart.key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
            if (point.value === null) {
              nulls += 1
              continue
            }
            expect(Number.isFinite(point.value), `${chart.key} @ ${point.at}`).toBe(true)
            if (point.value === 0) zeros += 1
          }
        }
      }
    }
    expect(nulls).toBe(1)
    expect(zeros).toBeGreaterThan(0)
  })

  it('keeps a gap and a measured zero in different series, not different days of one', async () => {
    const gap = await getMetricSeries('management.performance.onTimePickup')
    const zeroes = await getMetricSeries('management.zones.unservedRequests')
    expect(gap.current.points.filter((p) => p.value === null)).toHaveLength(1)
    expect(gap.current.points.filter((p) => p.value === 0)).toHaveLength(0)
    expect(zeroes.current.points.filter((p) => p.value === null)).toHaveLength(0)
    expect(zeroes.current.points.filter((p) => p.value === 0)).toHaveLength(7)
  })

  /**
   * **Every scalar on every board, as one fingerprint.**
   *
   * `value`, `deltaPercent`, `direction` and the comparison, for all of them,
   * in board order. A diff here is one of exactly two things and both want a
   * human:
   *
   *   - a number in `fixtures/metrics.ts` moved, which is the case this exists
   *     to catch — **seeding a chart must not move a tile**;
   *   - a fixture this client DERIVES from moved (drivers, riders, trips,
   *     subscriptions, safety, fairness, zones), in which case the owner of
   *     that fixture updates this block deliberately and the change is visible
   *     in their diff rather than absorbed silently.
   */
  it('has not moved a single tile — value, delta, direction or comparison', async () => {
    const fingerprint: string[] = []
    for (const subTabId of METRIC_BOARD_SUB_TABS) {
      for (const m of (await getMetricBoard(subTabId)).metrics) {
        const against =
          m.comparison.kind === 'none'
            ? `none:${m.comparison.reason}`
            : `${m.comparison.kind}:${m.comparison.value}`
        fingerprint.push(`${m.key} = ${m.value} · ${m.deltaPercent} ${m.direction} vs ${against}`)
      }
    }
    expect(fingerprint).toMatchInlineSnapshot(`
      [
        "management.overview.grossRevenue = 807570 · 57 up vs previous-period:514322",
        "management.overview.contributionMargin = 11 · -15.4 down vs previous-period:13",
        "management.overview.activeSubscriptions = 47 · 46.9 up vs previous-period:32",
        "management.overview.activeCaptains = 51 · 2 up vs previous-period:50",
        "management.overview.netSubscriptionMovement = 30 · -3.2 down vs previous-period:31",
        "management.overview.sameCaptainKept = 83 · -12.6 down vs target:95",
        "management.overview.onTimePickup = 91 · -4.2 down vs target:95",
        "management.overview.arpa = 86131 · 435.9 up vs previous-period:16072",
        "management.overview.revenueMix = 50.1 · -19.7 down vs previous-period:62.4",
        "management.overview.revenuePerActiveCaptain = 128186 · 1171.2 up vs previous-period:10084",
        "management.overview.tripMix = 0.5 · null null vs none:no-history",
        "management.performance.tripsCompleted = 40 · 14.3 up vs previous-period:35",
        "management.performance.cancellationRate = 6.7 · 28.8 up vs previous-period:5.2",
        "management.performance.avgCaptainRating = 4 · 2.6 up vs previous-period:3.9",
        "management.performance.avgRenewalRate = 62 · null null vs none:insufficient-data",
        "management.performance.complaintRatePer100Trips = 5.8 · -15.9 down vs previous-period:6.9",
        "management.performance.repeatLatenessConcentration = 62.4 · 7.4 up vs previous-period:58.1",
        "management.risk.revenueAtRisk = 184700 · 13.7 up vs previous-period:162400",
        "management.risk.churnPredictedSubscriptions = 2 · -33.3 down vs previous-period:3",
        "management.risk.atRiskCaptains = 3 · 50 up vs previous-period:2",
        "management.risk.identityCollisions = 0 · -100 down vs previous-period:1",
        "management.risk.repeatIncidentCaptains = 1 · -50 down vs previous-period:2",
        "management.risk.paymentRiskRenewals = 1 · -75 down vs previous-period:4",
        "management.risk.revenueAtRiskShareOfMrr = 11.9 · 14.4 up vs previous-period:10.4",
        "management.risk.daysToRenewalAtRisk = 13 · -23.5 down vs previous-period:17",
        "management.growth.newRiders = 0 · -100 down vs previous-period:1",
        "management.growth.activationRate7d = 1.8 · 20 up vs previous-period:1.5",
        "management.growth.ltvCacRatio = 5.2 · 18.2 up vs previous-period:4.4",
        "management.growth.promoROI = 1.3 · 18.2 up vs previous-period:1.1",
        "management.growth.promoBudgetConsumed = 42 · null null vs none:no-target",
        "management.growth.subscriptionsFromPromos = 219 · 30.4 up vs previous-period:168",
        "management.growth.registeredRiders = 55 · 1.9 up vs previous-period:54",
        "management.growth.dormantRiderShare = 2 · -50 down vs previous-period:4",
        "management.growth.referralAndIncentiveSpend = 9500 · 15.9 up vs previous-period:8200",
        "management.growth.qrToSubConversionRate = 10 · 16.3 up vs previous-period:8.6",
        "management.growth.cacPerSubscription = 13571 · -14.6 down vs previous-period:15900",
        "management.zones.unservedRequests30d = 31 · 29.2 up vs previous-period:24",
        "management.zones.starvedZones = 2 · -33.3 down vs previous-period:3",
        "management.zones.liveCities = 1 · -75 down vs target:4",
        "management.zones.captainsNeeded = 3 · -40 down vs previous-period:5",
        "management.zones.avgFailureRate = 45 · 15.4 up vs previous-period:39",
        "management.zones.steerOffersLive = 0 · null null vs none:insufficient-data",
        "management.zones.worstDemandSupplyRatio = 7 · 34.6 up vs previous-period:5.2",
        "management.zones.unservedDemandCities = 18 · 50 up vs previous-period:12",
        "management.zones.applicantPipelinePerCity = 5 · 66.7 up vs previous-period:3",
        "management.zones.steerOfferAcceptanceRate = 68.5 · -3.8 down vs previous-period:71.2",
        "operations.overview.slaAttainmentPercent = 80.4 · -6.7 down vs previous-period:86.2",
        "operations.overview.breachedWorkItems = 16 · 77.8 up vs previous-period:9",
        "operations.overview.unclaimedWork = 34 · 100 up vs previous-period:17",
        "operations.overview.applicationsPastWindow = 2 · -60 down vs previous-period:5",
        "operations.overview.pendingApplications = 5 · 150 up vs previous-period:2",
        "operations.overview.legsUncovered = 4 · -33.3 down vs previous-period:6",
        "operations.overview.openRequests = 7 · 16.7 up vs previous-period:6",
        "operations.overview.complianceExpired = 2 · -33.3 down vs previous-period:3",
        "operations.overview.captainsAvailable = 50 · 8.7 up vs previous-period:46",
        "operations.overview.oldestItemWaitingMinutes = 7259 · 26 up vs previous-period:5760",
        "operations.overview.medianTimeToAssign = 60 · 15.4 up vs previous-period:52",
        "operations.overview.riderAbandonmentRate = 3.7 · -24.5 down vs previous-period:4.9",
        "support.overview.unacknowledgedCriticalIncidents = 2 · 100 up vs previous-period:1",
        "support.overview.openIncidents = 6 · 50 up vs previous-period:4",
        "support.overview.medianTimeToFirstResponse = 14 · 27.3 up vs previous-period:11",
        "support.overview.ticketsBreaching = 1 · 0 flat vs previous-period:1",
        "support.overview.csat = 4 · -4.8 down vs previous-period:4.2",
        "support.overview.firstContactResolution = 100 · 100 up vs previous-period:50",
        "support.overview.promiseKept = 50 · -37.5 down vs previous-period:80",
        "support.overview.contactsPerThousandTrips = null · null null vs none:no-history",
        "support.overview.uncodedContactShare = null · null null vs target:3",
        "support.overview.openFairnessCases = 14 · 600 up vs previous-period:2",
        "support.overview.overturnRate = 63 · 0 flat vs previous-period:63",
        "support.overview.repeatContactRate = 1.8 · -25 down vs previous-period:2.4",
        "admin.overview.operatorsWithoutTwoFactor = 3 · null up vs target:0",
        "admin.overview.erasureOverdue = 1 · -50 down vs previous-period:2",
        "admin.overview.rotaGaps = 0 · 0 flat vs target:0",
        "admin.overview.activeOperators = 6 · 100 up vs previous-period:3",
        "admin.overview.itemsResolvedPerOperatorHour = 4.8 · 17.1 up vs previous-period:4.1",
        "admin.overview.workloadBalance = 1.4 · 16.7 up vs previous-period:1.2",
        "support.fairness.overturnRate = 63 · 0 flat vs previous-period:63",
        "support.fairness.suspendedCaptains = 1 · -50 down vs previous-period:2",
        "support.fairness.earningsPerEngagedHour = 4180 · -9.5 down vs previous-period:4620",
        "support.fairness.earningsP10 = 417 · 6.4 up vs previous-period:392",
        "support.fairness.earningsP90 = 1474 · -2.9 down vs previous-period:1518",
        "support.fairness.suspensionRatePer100 = 2 · -42.9 down vs previous-period:3.5",
      ]
    `)
  })
})

/* ═════ 14 — the four §E4 series, each against the tile it sits under ═════
   A chart whose key matches a metric shows THAT metric (`types/metrics.ts`), so
   the window's own answer and the figure above it cannot be two numbers. Each
   test below does the same two things: it rebuilds the series from the rows it
   claims to read, and it checks that what the fixture actually serves is that
   rebuild — so a hand-edited point cannot drift away from the store it came
   from — and then it checks the rebuild against the tile's seeded value and,
   where one can honestly exist, its seeded baseline.

   This is the pairing that makes the radiogroup safe to operate. Selecting a
   figure redraws the chart beneath it, and an operator reads the two as one
   claim; a series that agreed with its tile only by coincidence would break
   that the first time somebody edited a trip.                                */

describe('14 — the four §E4 series reconcile with their tiles', () => {
  /** Every calendar day of a window, inclusive, as `YYYY-MM-DD`. */
  const daysOf = (w: { start: string; end: string }): string[] => {
    const out: string[] = []
    for (let at = w.start; at <= w.end; at = addDays(at, 1)) out.push(at)
    return out
  }
  const dayOf = (instant: string | null): string | null => instant?.slice(0, 10) ?? null

  const metric = async (key: string) => (await allMetrics()).find((m) => m.key === key)!
  const baselineOf = async (key: string) => {
    const comparison = (await metric(key)).comparison
    return comparison.kind === 'none' ? null : comparison.value
  }
  const sum = (points: { value: number | null }[]) =>
    points.reduce((total, p) => total + (p.value ?? 0), 0)

  /**
   * **`management.performance.tripsCompleted` — Management › Performance's
   * second joinable lead, and the cleanest of the four.**
   *
   * A FLOW: trips that finished on each day, from `endedAt` on the same trip
   * rows `completedIn()` counts. Both windows reconcile exactly — the current
   * one sums to the tile, the previous one to the tile's own baseline — so the
   * card's line and the figure above it cannot disagree.
   *
   * 4 June is a genuine `0` and not a gap: the trip store covers 12 May to
   * 25 June, so that day was queried and nothing finished on it.
   */
  const completedPerDay = (w: { start: string; end: string }) =>
    daysOf(w).map((at) => ({
      at,
      value: allTripFixtures.filter((t) => t.status === 'done' && dayOf(t.endedAt) === at).length,
    }))

  it('trips completed — the daily counts sum to the tile, both windows', async () => {
    const series = await getMetricSeries('management.performance.tripsCompleted')
    const current = completedPerDay(SNAPSHOT_CURRENT)
    const previous = completedPerDay(SNAPSHOT_PREVIOUS)

    /* What is served IS the reconstruction, day for day. */
    expect(series.current.points).toEqual(current)
    expect(series.comparison!.points).toEqual(previous)
    expect(series.current.periodStart).toBe(SNAPSHOT_CURRENT.start)
    expect(series.current.periodEnd).toBe(SNAPSHOT_CURRENT.end)
    expect(current).toHaveLength(15)
    expect(previous).toHaveLength(15)

    expect(sum(current)).toBe((await metric('management.performance.tripsCompleted')).value)
    expect(sum(previous)).toBe(await baselineOf('management.performance.tripsCompleted'))
    /* A measured zero inside a covered range, which is the point of seeding it
       as `0` rather than as a gap. */
    expect(previous.find((p) => p.at === '2026-06-04')!.value).toBe(0)
    expect(series.current.points.every((p) => p.value !== null)).toBe(true)
  })

  /**
   * **`support.fairness.overturnRate` — Support › Fairness's second joinable
   * lead.**
   *
   * The tile's own definition applied at each date: overturned as a share of
   * *decided* (`upheld` + `overturned`; `withdrawn` is not a decision), over
   * every case decided on or before that day. So the last point of a window IS
   * the number the tile prints for that window, by construction rather than by
   * coincidence — and both ends land: 25 June reproduces the tile, 10 June
   * reproduces the baseline the tile compares against.
   *
   * **The fifteen-day snapshot pair, not the seven-day chart pair.** The
   * seven-day comparison window closes at 62 against a recorded 63, and a
   * dotted line ending one point away from the number the tile names as its
   * baseline is a contradiction an operator can see. Its board-mate
   * `earningsPerEngagedHour` is on the seven-day pair, which makes this an
   * instance of **F-7** — the missing board-level period — and not a new
   * finding.
   */
  const cumulativeOverturnRate = (upTo: string): number | null => {
    const decided = fairnessCaseFixtures.filter(
      (c) =>
        (c.status === 'upheld' || c.status === 'overturned') &&
        c.decidedAt !== null &&
        dayOf(c.decidedAt)! <= upTo,
    )
    if (decided.length === 0) return null
    return Math.round(
      (decided.filter((c) => c.status === 'overturned').length / decided.length) * 100,
    )
  }

  it('overturn rate — the last point of each window is the number the tile prints', async () => {
    const series = await getMetricSeries('support.fairness.overturnRate')
    const current = daysOf(SNAPSHOT_CURRENT).map((at) => ({ at, value: cumulativeOverturnRate(at) }))
    const previous = daysOf(SNAPSHOT_PREVIOUS).map((at) => ({ at, value: cumulativeOverturnRate(at) }))

    expect(series.current.points).toEqual(current)
    expect(series.comparison!.points).toEqual(previous)
    expect(current).toHaveLength(15)
    expect(previous).toHaveLength(15)

    expect(current.at(-1)!.value).toBe((await metric('support.fairness.overturnRate')).value)
    expect(previous.at(-1)!.value).toBe(await baselineOf('support.fairness.overturnRate'))
    /* No gaps: appeals have been decided since 16 May, so every day in both
       windows has a denominator. A rate over nothing would be `null`, and this
       reconstruction is the one that would produce it. */
    expect(current.every((p) => p.value !== null)).toBe(true)
    expect(previous.every((p) => p.value !== null)).toBe(true)
    /* It is not a flat line, which is what makes it worth charting: the rate
       falls four points on 19 June when three appeals are decided and one is
       overturned. */
    expect(new Set(current.map((p) => p.value)).size).toBeGreaterThan(1)
    /* Percent, and mirroring the tile's counter-intuitive valence. */
    expect(series.unit).toBe('percent')
    expect(series.higherIsBetter).toBe(true)
  })

  /**
   * **`support.overview.openIncidents` and
   * `support.overview.unacknowledgedCriticalIncidents` — Support › Overview's
   * pair, and the one board of the three that ships with NO comparison line.**
   *
   * Both are STOCKS reconstructed from `openedAt` / `closedAt` on the incident
   * rows the Safety queue serves, and both close on the number their tile
   * prints.
   *
   * **Their previous windows are not plotted, and the fixture already says
   * why**: the two baselines — 4 open, 1 unacknowledged — are *recorded*
   * numbers, and *"every incident opened before 10 Jun in `fixtures/safety.ts`
   * was closed the same day, so a reconstruction reads zero"*. A dotted line
   * closing at 0 beside a tile naming 4 is two claims about one fortnight on one
   * board. The assertions below are what keep that a decision rather than an
   * omission somebody later "fixes" by seeding the zeros.
   */
  const openIncidentsOn = (at: string) =>
    safetyIncidentFixtures.filter(
      (i) => dayOf(i.openedAt)! <= at && (i.closedAt === null || dayOf(i.closedAt)! > at),
    )

  it('open incidents — the last point is the tile, and the previous window is unplottable', async () => {
    const series = await getMetricSeries('support.overview.openIncidents')
    const current = daysOf(SNAPSHOT_CURRENT).map((at) => ({ at, value: openIncidentsOn(at).length }))

    expect(series.current.points).toEqual(current)
    expect(current).toHaveLength(15)
    expect(current.at(-1)!.value).toBe((await metric('support.overview.openIncidents')).value)
    /* Real zeros, not gaps: the store holds rows over this range and none of
       them was open on those days. */
    expect(current.filter((p) => p.value === 0).length).toBeGreaterThan(0)
    expect(current.every((p) => p.value !== null)).toBe(true)

    /* The reconstruction of the comparison window and the tile's recorded
       baseline disagree, which is why no comparison window is seeded. */
    expect(series.comparison).toBeNull()
    expect(openIncidentsOn(SNAPSHOT_PREVIOUS.end).length).toBe(0)
    expect(await baselineOf('support.overview.openIncidents')).toBe(4)
  })

  it('unacknowledged critical incidents — same shape, same unplottable baseline', async () => {
    const unacknowledgedOn = (at: string) =>
      openIncidentsOn(at).filter(
        (i) =>
          i.severity === 'critical' &&
          i.firstResponseBreachedAt !== null &&
          dayOf(i.firstResponseBreachedAt)! <= at,
      ).length
    const series = await getMetricSeries('support.overview.unacknowledgedCriticalIncidents')
    const current = daysOf(SNAPSHOT_CURRENT).map((at) => ({ at, value: unacknowledgedOn(at) }))

    expect(series.current.points).toEqual(current)
    expect(current).toHaveLength(15)
    expect(current.at(-1)!.value).toBe(
      (await metric('support.overview.unacknowledgedCriticalIncidents')).value,
    )
    /* Fourteen measured zeros and then two, which is the news this board exists
       to carry rather than a defect in the seed. */
    expect(current.slice(0, -1).every((p) => p.value === 0)).toBe(true)

    expect(series.comparison).toBeNull()
    expect(unacknowledgedOn(SNAPSHOT_PREVIOUS.end)).toBe(0)
    expect(await baselineOf('support.overview.unacknowledgedCriticalIncidents')).toBe(1)
  })

  /**
   * **`management.overview.grossRevenue` — seeded, and the only one of the five
   * that makes no radiogroup.**
   *
   * It is the best-reconciled series anywhere in this fixture: every point is
   * `totalRevenueHalalas` off a snapshot row ported verbatim from
   * `:13803`–`:13832`, and the two windows sum exactly to the tile and to its
   * baseline. It is also the sum of the two revenue cards already on that board,
   * which is why it earns the hoisted slot ABOVE them rather than a third place
   * beside them — a total over its own two halves is a check a reader performs
   * by looking.
   *
   * Management › Overview's other two leads cannot be charted honestly
   * (`contributionMargin` is a literal with Q7 open; `activeSubscriptions` is
   * disqualified below), so this board carries **exactly one** charted lead and
   * renders the plain list with a hoisted chart. That is the third of the three
   * states §E4 has, and it is the only board that reaches it from real data.
   */
  it('gross revenue — the snapshot rows sum to the tile and to its baseline', async () => {
    const series = await getMetricSeries('management.overview.grossRevenue')
    const sumOver = (w: { start: string; end: string }) =>
      snapshotsBetween(w.start, w.end).reduce((total, s) => total + s.totalRevenueHalalas, 0)

    expect(series.current.points).toHaveLength(15)
    expect(sum(series.current.points)).toBe(sumOver(SNAPSHOT_CURRENT))
    expect(sum(series.comparison!.points)).toBe(sumOver(SNAPSHOT_PREVIOUS))
    expect(sumOver(SNAPSHOT_CURRENT)).toBe((await metric('management.overview.grossRevenue')).value)
    expect(sumOver(SNAPSHOT_PREVIOUS)).toBe(await baselineOf('management.overview.grossRevenue'))

    /* Integer halalas on every point, so nothing here carries a float through a
       ledger. */
    for (const point of series.current.points) expect(Number.isInteger(point.value)).toBe(true)
    for (const s of dailySnapshotFixtures) expect(Number.isInteger(s.totalRevenueHalalas)).toBe(true)

    /* **And it really is the two cards below it — AC-695's argument one level
       up.** A board that states a total and its parts has to agree with itself,
       and here it does where it matters: the WINDOW totals are equal to the
       halala, both windows.

       Day by day the two halves can miss the total by **one halala**, on 4 of
       the 30 ported rows. That is a property of `:13803`–`:13832` — legacy
       rounded `quickRideRevenue` and `subRevenue` independently from SAR strings
       and the pair does not always re-add to the rounded total — and it is
       recorded here rather than corrected, because correcting it would change a
       seeded number. It is invisible on the chart (one halala on a 44,000-halala
       point) and it cancels out over a window. */
    const quick = await getMetricSeries('management.overview.quickRideRevenue')
    const subs = await getMetricSeries('management.overview.subscriptionRevenue')
    const halves = (series: TimeSeries, i: number) => series.current.points[i]!.value!
    series.current.points.forEach((point, i) => {
      const parts = halves(quick, i) + halves(subs, i)
      expect(Math.abs(point.value! - parts), point.at).toBeLessThanOrEqual(1)
    })
    expect(sum(series.current.points)).toBe(
      sum(quick.current.points) + sum(subs.current.points),
    )
    expect(sum(series.comparison!.points)).toBe(
      sum(quick.comparison!.points) + sum(subs.comparison!.points),
    )
  })

  /**
   * **`management.overview.activeSubscriptions` is disqualified, and the reason
   * is a finding rather than a fixture choice.**
   *
   * The tile counts `status === 'active'`. Its baseline is documented as the
   * *date* predicate — *"`startedOn` on or before it, `endsOn` on or after it,
   * not cancelled by then"* — and section 6 already asserts that predicate
   * reproduces 32 at the close of 10 June. Run the same predicate at 25 June
   * and it gives 60, not the 47 the tile prints.
   *
   * So a stock series built the only way it can be built would close 13 above
   * the figure it sits under. It is not seeded for that reason. What the
   * assertion below records is that **the tile already compares two different
   * definitions of "active"** — a status count against a date-predicate count —
   * which is defect L-3's shape on a tile nobody has looked at from this angle.
   * `DailySnapshot.activeSubs` is a third definition again and reads 6.
   */
  it('active subscriptions — a stock series would close 13 above its own tile', async () => {
    const activeOn = (at: string) =>
      allSubscriptionFixtures.filter(
        (s) =>
          s.startedOn <= at &&
          s.endsOn >= at &&
          (s.cancelledAt === null || dayOf(s.cancelledAt)! > at),
      ).length

    const tile = await metric('management.overview.activeSubscriptions')
    expect(activeOn(SNAPSHOT_PREVIOUS.end)).toBe(
      await baselineOf('management.overview.activeSubscriptions'),
    )
    expect(activeOn(SNAPSHOT_CURRENT.end)).not.toBe(tile.value)
    expect(activeOn(SNAPSHOT_CURRENT.end)).toBe(60)
    expect(tile.value).toBe(47)
    /* And the snapshot rollup is a third answer again. */
    expect(snapshotsBetween(SNAPSHOT_CURRENT.end, SNAPSHOT_CURRENT.end)[0]!.activeSubs).toBe(6)
    /* Unseeded, for the same reason gross revenue is. */
    await expect(getMetricSeries('management.overview.activeSubscriptions')).rejects.toThrow()
  })
})
