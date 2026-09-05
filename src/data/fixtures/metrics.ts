/**
 * Metric tiles, chart cards, breakdowns and board notices — the nine
 * table-less boards.
 *
 * Eight are the sub-tabs with no table: Management × 5 plus the Operations,
 * Support and Admin overviews. The ninth is `support-fairness`, whose
 * `captain-economics` view is a reading surface inside an otherwise
 * queue-shaped sub-tab (`renderCaptainEconomics`, legacy) — a chart behind a
 * claim button is the alternative, so it is served here.
 *
 * ## Values are seeded; several are *derived*
 *
 * A metric whose value is an aggregate over a resource this layer already
 * serves carries `value: null` here and `sourceResource` set. `clients/metrics.ts`
 * computes it **from the same fixture the index client serves**, so the
 * overview and the table cannot disagree about the number of active captains.
 * That is the single most common way two screens end up contradicting each
 * other, and it is avoidable for free.
 *
 * Everything else — anything with a denominator this dataset does not hold — is
 * a literal, and says so, with the legacy line it came from.
 *
 * ## Deltas are not in this file
 *
 * `deltaPercent` and `direction` are computed by the client from `value` and
 * `comparison`, which is what guarantees §3.7's rule: **`deltaPercent` is
 * `null` if and only if `comparison.kind === 'none'`** — em-dash, never `0%`,
 * never blank. A seeded delta could contradict its own comparison; a computed
 * one cannot.
 *
 * One documented exception, added this pass: **a `target` whose value is `0`.**
 * There is no percentage change from zero, but the target itself is real and
 * must survive. See `clients/metrics.ts` `resolve()` — the divide-by-zero guard
 * now belongs to the previous-period arm only.
 *
 * ## Why so many comparisons are `none` — corrected, and narrowed twice
 *
 * The legacy app says of itself: *"The Data Export → Daily Snapshots tool
 * builds a real historical trend the longer it's used — capture one regularly
 * and this section will show true month-over-month growth instead of a
 * single-point read"* (`:6979`). This file once took that as a blanket licence
 * for `reason: 'no-history'` on twenty-five of thirty-six tiles.
 *
 * **The sentence is about automatic capture and it is not true of the seed.**
 * `DB.dailySnapshots` (`:13803`–`:13832`) holds thirty consecutive daily rows,
 * ported and re-anchored in `fixtures/dailySnapshots.ts` (AC-604).
 *
 * Two things narrowed the gain below what spec §4.2 predicted, and this pass
 * closes the second of them:
 *
 *   1. The snapshot **levels** describe the legacy demo — 10 riders, 7 captains,
 *      6 subscriptions — against this layer's 13 / 52 / 47. An absolute
 *      snapshot field cannot be a baseline for a *derived* tile without
 *      becoming the L-3 defect (`:6969`): a delta between two populations. That
 *      is still true and still respected — those baselines come from the same
 *      fixture the value comes from, at the close of the previous window.
 *   2. Five snapshot-native fields mapped to tiles that **did not exist**.
 *      **Four of the five now do**, and they are the honest half of §4.2:
 *      `cancelRatePct` (Performance tile 1 — a **rate**, so it is
 *      level-independent and survives the mismatch outright),
 *      `totalRevenueHalalas` (Overview's gross revenue),
 *      `quickRideRevenueHalalas` and `subRevenueHalalas` (Overview's two
 *      charts). `quickRides` remains unseeded as a tile: spec §6.1 makes it the
 *      denominator of tile 1, not a tile of its own.
 *
 * **The window is fifteen days, not thirty, and the spec is wrong about this.**
 * §4.2 and §5.1 ask tiles for a *"previous 30 days"*; §5.2 correctly notes the
 * same comparison *"needs 60 snapshots"*. Thirty rows are **one** thirty-day
 * window. Fifteen and fifteen is the largest symmetric pair this data supports
 * and it uses all thirty rows. Recorded rather than papered over.
 *
 * ## Prior-window readings — what a `no-history` board costs, measured
 *
 * `docs/audit/PAGE-SWEEP.md` §2 S5 put a number on the position above.
 * **Forty of the seventy-nine tiles across the eight boards rendered an
 * em-dash where a delta belongs**, including *twelve of twelve* on
 * `/operations/overview` — roughly **432px of a 973px page** reserved to say
 * *"No comparison period yet"*, on the screen an operations lead keeps open all
 * day. `/financials/overview` and `/management/overview` were the two boards
 * that were already right.
 *
 * **A board that can never show a delta cannot be designed against, cannot be
 * visually regression-tested, and cannot be shown to an operator.** So the
 * seeds now carry the row a server's metric history keeps at each period close:
 * `comparison.value`, with the window named. Every tile that gained one says
 * **which of two kinds it is**, and no tile mixes them:
 *
 *   **Reconstructed** — the previous window is recoverable from the *same
 *   fixture the value comes from*, so the number is that reconstruction and
 *   `clients/metrics.test.ts` asserts it. Three tiles qualify:
 *   `operations.overview.pendingApplications`,
 *   `support.overview.openFairnessCases`, `support.overview.overturnRate`.
 *
 *   **Recorded** — the fixture holds current state only: a `suspended` flag
 *   with no stamp, a queue depth with no history, a legacy literal with no
 *   store behind either side. The baseline is a seeded reading and the seed
 *   says so in those words.
 *
 * ### This extends spec §4.2, and product-owner owns the amendment
 *
 * §4.2 lists where *"`no-history` remains correct"* — SLA breaches, claim
 * counts, contact volume, promo ROI, zone failure rates, rota gaps, erasure
 * requests. **That list is true of the ported legacy data and it is what the
 * audit measured the cost of.** Q-101/Q-102 govern a tile's *value* — they
 * forbid a plausible literal standing in for a number nobody can compute — and
 * they are respected: no tile gained a value here, and the two that have none
 * still have none. What changed is the *comparison*, which is a fact about
 * history rather than about computability.
 *
 * **Two tiles were left absent on purpose and they are the honest half of
 * S5's finding.** `support.overview.contactsPerThousandTrips` and
 * `uncodedContactShare` render an em-dash as their **headline value at 28px**,
 * which is the most prominent thing on `/support/overview`. Both read
 * `DB.contacts`, seeded empty (`:14718`), and `boardBreakdowns` already records
 * the ruling: *"seeding plausible volumes would put a ranking of made-up
 * product problems in front of the person who has to act on it, which is
 * exactly what Q-101 forbids."* **A contact log is the highest-value capture
 * outstanding in this product**; until product-owner lifts Q-101 for it, those
 * two tiles are correct to be empty and the em-dash is the screen doing its
 * job.
 *
 * ## Five tiles left this file — R5-1 / R4-11 §11.2
 *
 * **A tile with no store behind it does not render.** Not an em-dash, not a
 * skeleton, not a *coming soon*: an em-dash is a claim that the number exists
 * somewhere. Eight tiles carried `value: null` with nothing derived behind
 * them; sorting them by that test removed five and left three, each of which
 * now states why on the line where its delta would be.
 *
 * | Removed | Board | The store it waits on |
 * |---|---|---|
 * | `support.overview.ticketsBreaching` | Support › Overview | a ticket store |
 * | `support.overview.promiseKept` | Support › Overview | the same ticket store |
 * | `admin.overview.integrityOrphans` | Admin › Overview | a per-entity payments ledger **and** a data window |
 * | `admin.overview.impersonationSessions` | Admin › Overview | a session store, or the start/end join |
 * | `admin.overview.legalDocsUnaccepted` | Admin › Overview | legal documents, versions and acceptances |
 *
 * | Kept, with a reason | `absenceReason` | Why |
 * |---|---|---|
 * | `support.overview.contactsPerThousandTrips` | `not-captured` | the contact log exists and is empty |
 * | `support.overview.uncodedContactShare` | `not-computable` | a rate over zero contacts |
 * | ~~`management.performance.avgRenewalRate`~~ | **withdrawn** | **it is a derivation, and the count that justified the absence was wrong.** 8 of 13 riders carry a reading, not 3; the mean is 69.5. What it lacked was a declared population (**R5-14**, **AC-730**), not a value. See the tile |
 *
 * ## R5-14 — fourteen tiles declare no population, and I did not invent one
 *
 * > **An aggregate declares its population in `sourceResource`. `null` there is
 * > an undeclared denominator, not an absent source.**
 *
 * Fourteen of the fifty-one seeds carry `sourceResource: null`. **I have set it
 * on none of them, and the reason is the rule's own second half.** The rule's
 * value comes from *"one population, four expressions — `sourceResource`,
 * label, caption base count, drilldown — three of which are mechanically
 * checkable against each other."* Every one of these fourteen is a **seeded
 * literal** ported from the legacy app, not a computation over a fixture array.
 * Naming a resource on a value that is not derived from it would make the check
 * runnable **and false**: the caption's base count would disagree with a count
 * over the declared resource, and the tile would be lying with a new field
 * rather than silent with an old one. That is a worse failure than the one the
 * rule closes, because it looks audited.
 *
 * They sort into two kinds, and the second is the more serious:
 *
 * | Population nameable, value not derived from it | What it would take |
 * |---|---|
 * | `management.risk.churnPredictedSubscriptions` | subscriptions exist; **the churn prediction does not** — no field encodes it, so the population is nameable and the predicate is not |
 * | `management.risk.paymentRiskRenewals` | same store, same missing predicate |
 * | `management.zones.liveCities` | derivable from `listCities()`; the seed predates the client's own city list and should become a `DERIVED` entry |
 *
 * | **No store for the population at all** | The store it waits on |
 * |---|---|
 * | `management.growth.promoROI` | a promotions store |
 * | `management.growth.promoBudgetConsumed` | the same |
 * | `management.growth.subscriptionsFromPromos` | the same, plus an attribution join |
 * | `management.growth.referralAndIncentiveSpend` | referrals and incentives |
 * | `management.zones.steerOffersLive` | a steer-offer store |
 * | `admin.overview.erasureOverdue` | erasure requests, with their deadlines |
 * | `admin.overview.rotaGaps` | a rota |
 * | `support.fairness.earningsPerEngagedHour` | earnings **and** engaged hours, jointly |
 * | `support.overview.contactsPerThousandTrips` | the contact log — already stated as `not-captured` |
 * | `support.overview.uncodedContactShare` | the same log — already stated as `not-computable` |
 *
 * `management.overview.contributionMargin` is in neither list: it is a margin
 * out of the pricing formula, **not an aggregate over records**, so R5-14 does
 * not reach it and `null` is correct there without qualification.
 *
 * > **The finding, and it is for product-owner, not for me to act on.** §11.2's
 * > test as generalised — *can this measure, as specified, be computed?* —
 * > answers **no** for all nine in the second table, and every one of them
 * > renders a number today because legacy seeded one. They were not caught by
 * > the earlier sort because that sort keyed on `value: null`, and a seeded
 * > literal is not null. **The sort's predicate was wrong, not its conclusion.**
 * > Re-running it on *computability* rather than on *nullity* is the same
 * > question asked properly, and it would take four boards' tile counts with
 * > it — which is why it is a decision and not a cleanup.
 *
 * **Support goes 8 → 6 and Admin goes 7 → 4, and that is the intended
 * outcome.** A four-tile board that answers beats an eight-tile board that
 * half-answers. It does *not* make the boards fuller: four tiles saying
 * `Not captured yet` were four tiles saying nothing, and the thing that
 * actually answers *"there is so much still can be known"* is **a contact log**
 * — one row per contact with a reason code — which is a data capture, not a
 * design change, and the highest-value item outstanding on these boards.
 *
 * Every removal is owed a row in its spec's *deliberately not here* table
 * (R4-11 §11.2, addendum) and an amendment to the AC that enumerates the
 * board's tiles. **A board's tile count is never a surprise to the person
 * reading the spec.**
 *
 * ## Breakdowns and notices arrive with R4-4
 *
 * `boardBreakdowns` and `boardNotices` are keyed by sub-tab and assembled onto
 * the board by `clients/metrics.ts`. Two of the eight boards declare no
 * breakdown, on the spec's own instruction (§5.3 Overview, §8.3 Growth), and
 * `management-zones` declares only its **city** list — R4-6 rules that a ranked
 * list of zones above a table of the same zones is the same data twice.
 */

import type {
  BoardNotice,
  DailySnapshot,
  Metric,
  MetricBreakdown,
  MetricBreakdownRow,
  SeriesPoint,
  SeriesWindow,
  TimeSeries,
} from '../types/metrics'
import type { IsoDate } from '../types/common'
import { EYVAR_NOW } from '../mock/clock'
import { addDays } from '../reporting/buckets'
import { SNAPSHOT_CURRENT, SNAPSHOT_PREVIOUS, snapshotsBetween } from './dailySnapshots'
/* **Fixture rows, read by the four §E4 charts below.** Every one of those is a
   reconstruction over rows this layer already serves rather than a curve
   somebody drew, so the store is imported and queried here exactly as
   `snapshotWindow` queries `dailySnapshots`. No cycle: `trips` reaches drivers,
   riders and subscriptions, `safety` reaches trips, `fairness` reaches drivers
   and riders, and none of the four reaches this file. */
import { allTripFixtures } from './trips'
import { safetyIncidentFixtures } from './safety'
import { fairnessCaseFixtures } from './fairness'

/**
 * What a fixture carries. `deltaPercent` and `direction` are the client's.
 *
 * **`rank` is the client's too, and for the same reason those two are.** All
 * three are *derived* — a seed states what the metric IS, and the client states
 * what follows from it. `rank` follows from `BOARD_LEADS` below, which is one
 * table of nine editorial decisions; carrying a `rank` literal on each of the
 * eighty-nine seeds as well would be the same fact written twice, in two files,
 * free to disagree. Omitting it here is what makes that impossible.
 */
export type MetricSeed = Omit<Metric, 'deltaPercent' | 'direction' | 'rank'>

/** The current chart window: the seven days ending on the fixed clock's day. */
export const CURRENT_PERIOD = { start: '2026-06-19', end: '2026-06-25' } as const
/** The comparison window: the seven days before it. */
export const PREVIOUS_PERIOD = { start: '2026-06-12', end: '2026-06-18' } as const

const CURRENT_DAYS = [
  '2026-06-19',
  '2026-06-20',
  '2026-06-21',
  '2026-06-22',
  '2026-06-23',
  '2026-06-24',
  '2026-06-25',
] as const
const PREVIOUS_DAYS = [
  '2026-06-12',
  '2026-06-13',
  '2026-06-14',
  '2026-06-15',
  '2026-06-16',
  '2026-06-17',
  '2026-06-18',
] as const

/** Pair seven values with the seven days of a window. Flat, greppable, hand-editable. */
const points = (days: readonly string[], values: ReadonlyArray<number | null>): SeriesPoint[] =>
  days.map((at, i) => ({ at, value: values[i] ?? null }))

/**
 * One window of a snapshot-backed chart.
 *
 * **This reads real rows; it does not generate any.** Every point is a field
 * off a `DailySnapshot` that was ported verbatim from `:13803`–`:13832`, so
 * hand-editing a snapshot row moves the chart and nothing else has to change.
 */
const snapshotWindow = (
  window: { start: string; end: string },
  pick: (snapshot: DailySnapshot) => number,
): SeriesWindow => ({
  periodStart: window.start,
  periodEnd: window.end,
  points: snapshotsBetween(window.start, window.end).map((s) => ({ at: s.date, value: pick(s) })),
})

/**
 * One window of a chart whose reading is **reconstructed per day from the rows
 * another store already holds** — trips that finished, incidents still open,
 * appeals decided.
 *
 * Same contract as `snapshotWindow` above, and the same sentence applies: this
 * READS rows, it does not generate any. Hand-edit a trip's `endedAt` or close an
 * incident a day later and the chart moves, with nothing else to update. What
 * differs is only where the rows live — a `DailySnapshot` is already one row per
 * day, so a chart reads a field off it; these stores hold one row per *event*,
 * so the day is the thing being counted over rather than the thing being read.
 *
 * **`readingOn` returns `null` for a day with no reading, and that stays a gap.**
 * A day the store covers and answers zero for returns `0`. The distinction is
 * the whole of `SeriesPoint`'s contract and the reason this helper takes a
 * `number | null` rather than a `number` with a `0` fallback: a fallback is how
 * an outage gets drawn as a collapse in demand.
 */
const reconstructedWindow = (
  window: { start: string; end: string },
  readingOn: (day: IsoDate) => number | null,
): SeriesWindow => {
  const points: SeriesPoint[] = []
  for (let at: IsoDate = window.start; at <= window.end; at = addDays(at, 1)) {
    points.push({ at, value: readingOn(at) })
  }
  return { periodStart: window.start, periodEnd: window.end, points }
}

/** The calendar day an instant falls on. Riyadh, like every other stamp here. */
const dayOf = (instant: string | null): string | null => instant?.slice(0, 10) ?? null

/**
 * Trips that **finished** on a day. `endedAt`, never `startedAt` — the same
 * choice `completedIn()` in `clients/metrics.ts` makes, and for the same reason:
 * a trip that started on the 24th and ended on the 25th is the 25th's work.
 */
const tripsCompletedOn = (day: IsoDate): number =>
  allTripFixtures.filter((t) => t.status === 'done' && dayOf(t.endedAt) === day).length

/**
 * Incidents **still open at the close of a day** — a stock, not a flow. Opened
 * on or before it and either never closed or closed after it.
 */
const incidentsOpenOn = (day: IsoDate) =>
  safetyIncidentFixtures.filter(
    (i) => dayOf(i.openedAt)! <= day && (i.closedAt === null || dayOf(i.closedAt)! > day),
  )

/**
 * Of those, the ones that are critical **and** whose first-response clock had
 * already breached by that day. `02-work-queues` §4.3: this is the one number in
 * the product whose bad value is `1`.
 */
const unacknowledgedCriticalOn = (day: IsoDate): number =>
  incidentsOpenOn(day).filter(
    (i) =>
      i.severity === 'critical' &&
      i.firstResponseBreachedAt !== null &&
      dayOf(i.firstResponseBreachedAt)! <= day,
  ).length

/**
 * **The overturn rate as it stood at the close of a day** — overturned as a
 * share of *decided*, over every appeal decided on or before it.
 *
 * `withdrawn` is not a decision and is not in the denominator, which is the
 * definition `DERIVED['support.fairness.overturnRate']` uses. Applying the
 * tile's own definition at each date is what makes the last point of a window
 * *be* the number the tile prints for that window, rather than merely resemble
 * it.
 *
 * `null` before the first decision exists: a rate over a zero denominator has no
 * answer, and a gap is what that is. Unreachable in both seeded windows — the
 * appeal store goes back to 16 May — and kept because the day it becomes
 * reachable is the day a `0` here would claim a perfect record.
 */
const overturnRateThrough = (day: IsoDate): number | null => {
  const decided = fairnessCaseFixtures.filter(
    (c) =>
      (c.status === 'upheld' || c.status === 'overturned') &&
      c.decidedAt !== null &&
      dayOf(c.decidedAt)! <= day,
  )
  if (decided.length === 0) return null
  return Math.round(
    (decided.filter((c) => c.status === 'overturned').length / decided.length) * 100,
  )
}

/* ═══════════════════════════════ metrics ═══════════════════════════════ */

export const metricSeeds: MetricSeed[] = [
  /* ── Management › Overview ───────────────────────────────────────────────
     "Is the business growing, and is it keeping the two promises it sells?"
     Six tiles, two charts, no breakdown (spec §5.3). `registeredRiders` moved
     to Growth this pass (§5.4: a cumulative census is an acquisition number),
     and `contributionMargin` moved IN from Performance (Q-103: the board whose
     role acts on the number keeps it).                                      */
  {
    /**
     * `contributionMargin()` (`:15731`) — the take rate **after** promos,
     * referral bonuses, incentives, refunds, goodwill and unrecovered
     * emergency cover. Legacy's headline 19.2 % subtracts none of them and its
     * own comment calls it *"structurally overstated"* (`:15714`).
     *
     * **Q7 is open** — four pricing models disagree on what revenue means — so
     * this tile, gross revenue and Growth's ROI all move together if Finance
     * names a different model. Nothing else on the eight boards does.
     */
    key: 'management.overview.contributionMargin',
    subTabId: 'management-overview',
    category: 'revenue',
    value: 11,
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-25',
    comparison: {
      kind: 'previous-period',
      value: 13,
      periodStart: '2026-05-01',
      periodEnd: '2026-05-25',
    },
    higherIsBetter: true,
    caption: 'caption.afterGivebacks',
    sourceResource: null,
    drilldownRoute: '/financials/revenue',
  },
  {
    /**
     * **Was a seeded literal of 4,218,650 halalas that nobody could reproduce
     * (Q-102, M-2). It is now the sum of `totalRevenueHalalas` over the current
     * fifteen snapshot days** — SAR 8,075.70 — against SAR 5,143.22 over the
     * fifteen before it. Small numbers, and they are the real ones: the seed
     * describes a demo whose busiest day took SAR 647.
     *
     * The two Overview charts plot the two halves of exactly this figure, so
     * the tile is the sum of the cards beneath it by construction.
     */
    key: 'management.overview.grossRevenue',
    subTabId: 'management-overview',
    category: 'revenue',
    value: null,
    absenceReason: null,
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    periodStart: SNAPSHOT_CURRENT.start,
    periodEnd: SNAPSHOT_CURRENT.end,
    comparison: {
      kind: 'previous-period',
      value: 514_322,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'daily-snapshots',
    drilldownRoute: '/financials/revenue',
  },
  {
    key: 'management.overview.activeSubscriptions',
    subTabId: 'management-overview',
    category: 'subscriptions',
    /* Derived — `listSubscriptions({ status: 'active' }).total`. */
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * **32** subscriptions were active at the close of 10 Jun — `startedOn` on
     * or before it, `endsOn` on or after it, not cancelled by then. Asserted
     * against the subscription fixture in `clients/metrics.test.ts` under
     * "previous-period baselines are derived, not typed in", so it cannot drift
     * away from the rows the Subscriptions table serves.
     */
    comparison: {
      kind: 'previous-period',
      value: 32,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'subscriptions',
    drilldownRoute: '/operations/subscriptions?view=active',
  },
  {
    /**
     * **Spec §5.1 does not list this tile and §5.4 does not reassign it — a gap
     * in the spec, and it is kept rather than dropped.**
     *
     * §5.4 moves `Registered riders` to Growth with a reason (*"a cumulative
     * census is an acquisition number"*) and says nothing about the captain
     * census, which is the supply side of the same board and the one number
     * four legacy screens compute independently and disagree about whenever the
     * "exclude pending" rule drifts on one of them (`:6903`).
     *
     * It stays because it is the **cross-check**: `metrics.test.ts` asserts
     * this tile equals `listDrivers({ status: 'active' }).total`, so the
     * overview and the People table cannot disagree. Deleting it to match a
     * list of six would delete that guarantee to tidy a table.
     */
    key: 'management.overview.activeCaptains',
    subTabId: 'management-overview',
    category: 'supply',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * **50** active captains had joined on or before 10 Jun; two more joined on
     * the 20th and the 24th. An approximation in one respect and it is worth
     * naming: `status` is *current*, so a captain suspended yesterday is not
     * counted as active a fortnight ago either. The driver fixture holds no
     * status history and inventing one would be worse than the approximation.
     *
     * **Was 51.** `DRV-0101` moved from `active` to `under-review` when
     * `fixtures/complaints.ts` landed `CMP-330` against him — legacy has it
     * `Open` (`:2711`) and notification N6 names it — and
     * `types/driver.ts` derives `under-review` from a non-zero open-complaint
     * count (`:6394`).
     *
     * **Finding for the metrics owner, and the second one on this file:** this
     * baseline and `management.growth.registeredRiders`'s are derived facts
     * kept as literals, so every change to a *different* fixture is a two-file
     * change and `metrics.test.ts` is what discovers it. Both should be
     * computed from the fixture the way their numerators already are.
     */
    comparison: {
      kind: 'previous-period',
      value: 50,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'drivers',
    drilldownRoute: '/operations/people?view=captains',
  },
  {
    /**
     * **Spec §5.1 tile 4, and it replaces legacy defect L-3.** `:6969`–`:6971`
     * states the same idea as prose by comparing a *current-state* count of
     * active subscriptions against a *cumulative* count of cancelled ones —
     * different denominators, so the comparison means nothing. This is two
     * period-scoped counts over one window: started minus cancelled.
     *
     * **+30 this fortnight against +31 the fortnight before.** The business is
     * growing and the rate of growth is a shade off. That is the whole point of
     * the tile — a number that can go negative without the base moving.
     */
    key: 'management.overview.netSubscriptionMovement',
    subTabId: 'management-overview',
    category: 'subscriptions',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: SNAPSHOT_CURRENT.start,
    periodEnd: SNAPSHOT_CURRENT.end,
    comparison: {
      kind: 'previous-period',
      value: 31,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: 'caption.startedLessCancelled',
    sourceResource: 'subscriptions',
    drilldownRoute: '/operations/subscriptions?view=all',
  },
  {
    key: 'management.overview.sameCaptainKept',
    subTabId: 'management-overview',
    category: 'service',
    /* `sameCaptainStats()` (`:15702`) — plans that never changed captain. One
       of the two promises printed on the rider's plan card, and until that
       function was written it was measured nowhere. */
    value: 83,
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-25',
    comparison: { kind: 'target', value: 95, setByUserId: null, effectiveFrom: '2026-01-01' },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'subscriptions',
    drilldownRoute: '/operations/subscriptions',
  },
  {
    key: 'management.overview.onTimePickup',
    subTabId: 'management-overview',
    category: 'service',
    /* `onTimeStats()` (`:15708`). The second printed promise. */
    value: 91,
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-25',
    comparison: { kind: 'target', value: 95, setByUserId: null, effectiveFrom: '2026-01-01' },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'trips',
    drilldownRoute: '/operations/quick-rides',
  },
  {
    key: 'management.overview.arpa',
    subTabId: 'management-overview',
    category: 'revenue',
    value: null,
    absenceReason: null,
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    periodStart: SNAPSHOT_CURRENT.start,
    periodEnd: SNAPSHOT_CURRENT.end,
    comparison: {
      kind: 'previous-period',
      value: 16_072,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'daily-snapshots',
    drilldownRoute: '/operations/subscriptions',
  },
  {
    key: 'management.overview.revenueMix',
    subTabId: 'management-overview',
    category: 'revenue',
    value: null,
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: SNAPSHOT_CURRENT.start,
    periodEnd: SNAPSHOT_CURRENT.end,
    comparison: {
      kind: 'previous-period',
      value: 62.4,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'daily-snapshots',
    drilldownRoute: '/financials/revenue',
  },
  {
    key: 'management.overview.revenuePerActiveCaptain',
    subTabId: 'management-overview',
    category: 'supply',
    value: null,
    absenceReason: null,
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    periodStart: SNAPSHOT_CURRENT.start,
    periodEnd: SNAPSHOT_CURRENT.end,
    comparison: {
      kind: 'previous-period',
      value: 10_084,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'daily-snapshots',
    drilldownRoute: '/operations/people?view=captains',
  },
  {
    key: 'management.overview.tripMix',
    subTabId: 'management-overview',
    category: 'subscriptions',
    value: null,
    absenceReason: null,
    unit: 'ratio',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-25',
    comparison: {
      kind: 'none',
      reason: 'no-history',
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'trips',
    drilldownRoute: '/operations/quick-rides',
  },

  /* ── Management › Performance ────────────────────────────────────────────
     "Is the service getting worse for the people who already pay us?"       */
  {
    /**
     * **The tile this whole pass exists for.** Spec §6.1 tile 1, *"currently on
     * no board at all — that is the 'cancellations spiking' the business owner
     * asked for."*
     *
     * `cancelRatePct` is cancelled quick rides ÷ quick rides, captured daily
     * (`:7650`, rows at `:13803`+). **It is a rate, so it is
     * level-independent** — 3–9 % is as true of 47 subscriptions as of 6 — and
     * it is the one snapshot field that survives the demo-versus-fixture level
     * mismatch that kept twenty-two other comparisons on `no-history`.
     *
     * Fifteen-day means: **5.2 % then 6.7 %**. A real, honest rise of just
     * under 29 %, already sitting in data ported verbatim from the legacy seed.
     * Nothing here was drawn.
     */
    key: 'management.performance.cancellationRate',
    subTabId: 'management-performance',
    category: 'demand',
    value: null,
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: SNAPSHOT_CURRENT.start,
    periodEnd: SNAPSHOT_CURRENT.end,
    comparison: {
      kind: 'previous-period',
      value: 5.2,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: 'caption.quickRidesOnly',
    sourceResource: 'daily-snapshots',
    /* The rate's denominator, which is the population its rows live in. A
       `cancelled` view would be the exact destination and the route table has
       none — F-8, raised rather than faked. */
    drilldownRoute: '/operations/trips?view=quick-rides',
  },
  {
    key: 'management.performance.avgRenewalRate',
    subTabId: 'management-performance',
    category: 'subscriptions',
    /**
     * **A DERIVATION, not an absence — and the reason it was neither for two
     * passes is that the metric declared no population.**
     *
     * ## What was wrong, and the count that was wrong with it
     *
     * This tile carried `absenceReason: 'not-computable'` on the strength of a
     * figure I reported and nobody re-ran: *"three of thirteen riders carry a
     * reading."* **It is eight.**
     *
     * ```
     * $ node -e "…/renewalRatePercent:\s*([^,
]+)/g…"
     *   occurrences 13 · non-null 8 · mean 69.50
     *   values 100 · null · null · null · null · 25 · 93 · 30 · 91 · 85 · 44 · null · 88
     * ```
     *
     * The command is here because that is the lesson: **a count in a report
     * reads like an observation and this one was a claim.** It was relayed
     * onward twice before product-owner re-derived it. For a number that
     * decides whether a tile renders, the command goes beside the number.
     *
     * A mean over eight of thirteen is not *not computable*. §11.2 does not
     * delete this tile, because **the measure as §6.1 specifies it is
     * computable**. What it actually lacked was a **stated denominator**, which
     * is now **AC-730**.
     *
     * ## The population, declared — R5-14 / AC-730 / AC-731
     *
     * `sourceResource: 'riders'`, and the caption states the base **within**
     * that population. Four people computed this tile carefully and got four
     * numbers, seven points apart, because it named none:
     *
     * | n | population | mean |
     * |---:|---|---:|
     * | 8 | riders with a reading | **69.5** |
     * | 6 | a set no predicate produces — **L-12**, now fixed | 63.3 |
     * | 4 | riders holding a plan | 62.0 |
     * | — | active-subscriber mean | uncomputable |
     *
     * **The n=6 set was a fixture defect wearing a definition.** `RDR-4001` and
     * `RDR-4003` carried `status: 'subscriber'` with `subscriptionIds: []`,
     * so *"riders whose status says subscriber"* included two rows with no plan
     * and excluded two others with no plan. Corrected in `fixtures/riders.ts`;
     * it was the whole of the 62.0 / 63.3 gap.
     *
     * **`42.8` — nulls counted as zero — was never one of the four.**
     * `Metric.value`'s own doc names nulls-as-zero as the defect it exists to
     * prevent, and **AC-606** is the criterion. A rider with no renewal history
     * did not renew nothing; they have not been asked yet.
     *
     * ## Which of the two remaining populations is **Q-107**, and it is open
     *
     * The value below is the **riders** branch — the mean over the eight riders
     * who carry a reading — which is the branch **AC-730 spells out**: *"it
     * names riders. The caption states how many of that population carry a
     * reading and how many the population holds."* Copy is final for **both**
     * branches, so nothing waits on the answer, and neither branch is picked
     * here: if Q-107 answers *subscribers*, this becomes a one-line change to
     * `DERIVED` and the label and caption keys swap. **That is the whole cost
     * of the open question**, which is why it is not a blocker.
     *
     * **L-4 stands and no criterion closes it.** `renewalRatePercent` is a
     * stored per-rider percentage whose own numerator and denominator were
     * discarded at write time, so *renewals ÷ opportunities* is not recoverable
     * at **any** population, and a rider with one opportunity weighs the same
     * as a rider with twenty. Declaring the population fixes one of the three
     * doors into being wrong, not all three.
     */
    value: null,
    /* **Derived, so `null` here is the client's job and not an absence.** See
       `DERIVED['management.performance.avgRenewalRate']` in `clients/metrics.ts`. */
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-25',
    /* Still `insufficient-data`: there is no previous-period renewal figure to
       compare against, because the stored stat is a running per-rider value and
       carries no period at all. That is L-4 again, in the comparison slot. */
    comparison: { kind: 'none', reason: 'insufficient-data' },
    higherIsBetter: true,
    /* **AC-730** — the base count within the declared population, `8 of 13`.
       Riders with no reading are excluded from the mean, not counted as zero. */
    caption: 'caption.storedRiderStat',
    /* **R5-14.** The population, declared. `null` here is an *undeclared
       denominator*, not an absent source — which is exactly how one tile
       produced four numbers. */
    sourceResource: 'riders',
    /* **AC-607 / AC-730** — the drilldown lands on the population the mean is
       taken over. It pointed at `/operations/subscriptions`, which is a
       different set from the one being averaged. */
    drilldownRoute: '/operations/people?view=riders',
  },
  {
    key: 'management.performance.avgCaptainRating',
    subTabId: 'management-performance',
    category: 'service',
    value: null,
    absenceReason: null,
    unit: 'rating',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **3.9**. Recorded — `Driver.rating` is a current
     * average with no per-day history behind it.
     */
    comparison: {
      kind: 'previous-period',
      value: 3.9,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'drivers',
    drilldownRoute: '/operations/people?view=captains',
  },
  {
    /**
     * **Was `+157.9 %` and was defect L-3 in a new place.** The value counted
     * every trip in the fixture that had ever finished — 98, all time — and
     * compared it against a literal 38 over a seven-day window. Two
     * populations, one delta.
     *
     * Fixed by scoping the value to the window the tile declares: trips whose
     * **`endedAt`** falls inside it. **40 completed in the current fifteen days
     * against 35 in the fifteen before** — same population, same window length,
     * a real +14 %.
     *
     * The window is deliberately the snapshot pair rather than the seven-day
     * chart pair: spec §6.1 ranks this tile last because *"this is the
     * denominator the other three are shares of, and it is here so those shares
     * can be read honestly"* — which only works if it shares their window.
     */
    key: 'management.performance.tripsCompleted',
    subTabId: 'management-performance',
    category: 'demand',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: SNAPSHOT_CURRENT.start,
    periodEnd: SNAPSHOT_CURRENT.end,
    comparison: {
      kind: 'previous-period',
      value: 35,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'trips',
    drilldownRoute: '/operations/quick-rides',
  },
  {
    key: 'management.performance.complaintRatePer100Trips',
    subTabId: 'management-performance',
    category: 'service',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **6.9** complaints per 100 trips. Recorded, and a
     * rate, so the fall to 5.8 survives the population difference.
     */
    comparison: {
      kind: 'previous-period',
      value: 6.9,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'drivers',
    drilldownRoute: '/operations/people?view=captains',
  },
  {
    key: 'management.performance.repeatLatenessConcentration',
    subTabId: 'management-performance',
    category: 'service',
    value: null,
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **58.1 %** of late trips concentrated in the worst
     * three captains. Recorded.
     */
    comparison: {
      kind: 'previous-period',
      value: 58.1,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'trips',
    drilldownRoute: '/operations/people?view=captains',
  },

  /* ── Management › Risk & Signals ─────────────────────────────────────────
     **M1: Risk & Signals has no work queue.** Every action on the legacy page
     is a `go()` to somewhere else (`:14320`, `:14336`, `:14351`, `:14363`), so
     it computes a flag and routes the operator. That makes it a *reading*
     surface: metrics, series and ranked lists, no rows with claims on them —
     which is why its nav tone is `neutral` and stays that way.

     **`management.risk.openSignals` was here and is deleted — AC-629, AC-720.**
     It was `redSubs + atRiskDrivers + paymentRisk` (`:14375`): the sum of three
     tiles below it, and *already* the sub-tab's nav badge (`navCounts.ts`,
     `management-risk: 6`). A tile whose value equals the badge six pixels away
     is a second copy of the badge in a bigger font.

     **The three parts still add to the badge: 2 + 3 + 1 = 6.** That is the
     point of splitting it — the operator can see which third moved.

     **The `chart.management.risk.openSignals` series is kept.** Spec §7.2 argues
     the board should ship with no chart at all and the argument is good — but
     `src/components/metrics/metrics.test.tsx` builds its `TimeSeries` fixture
     on that exact key and renders it through the real dictionary, so deleting
     the seed and its copy key takes another role's test down. Recorded as a
     finding rather than resolved by editing their file.                     */
  {
    key: 'management.risk.revenueAtRisk',
    subTabId: 'management-risk',
    category: 'risk',
    /* `revenueAtRisk` (`:14372`) — deferred value on subscriptions scoring
       below 50. Halalas; legacy carries it as a float of SAR and prints
       `toFixed(0)`. */
    value: 184_700,
    absenceReason: null,
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **SAR 1,624.00** of subscription revenue at risk.
     * Recorded. The value above is itself a legacy literal (Q-102, M-2), so the
     * baseline is the same kind of number and no better sourced.
     */
    comparison: {
      kind: 'previous-period',
      value: 162_400,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'subscriptions',
    drilldownRoute: '/operations/subscriptions?view=at-risk',
  },
  {
    /**
     * `redSubs` (`:14369`) — subscriptions whose `subHealthScore` is below 50.
     * Six signals feed it (`:14219`–`:14234`): behind expected pace, no backup
     * captain, the assigned captain has an open dispute or incident, prior
     * complaints, payment risk, captain suspended.
     *
     * **2**, which is what the nav badge's 6 minus `atRiskCaptains` (3) minus
     * `paymentRiskRenewals` (1) leaves. Literal, because this layer holds none
     * of the six signals as fields.
     */
    key: 'management.risk.churnPredictedSubscriptions',
    subTabId: 'management-risk',
    category: 'risk',
    value: 2,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **3**. Recorded — nothing in the subscription fixture
     * encodes a churn prediction, so neither side of this delta is derivable.
     */
    comparison: {
      kind: 'previous-period',
      value: 3,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: null,
    drilldownRoute: '/operations/subscriptions?view=at-risk',
  },
  {
    key: 'management.risk.atRiskCaptains',
    subTabId: 'management-risk',
    category: 'risk',
    /* `driverRiskScore` below 80 (`:14371`): expiring documents, suspensions,
       open incidents, cash debt. */
    value: 3,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /* Prior-window reading: **2** captains carrying a risk signal. Recorded. */
    comparison: {
      kind: 'previous-period',
      value: 2,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'drivers',
    /* T7.2 / O4 — pre-filtered to the tile's own population, not to every
       compliance row. The predicate is `complianceShape`'s own `needs-attention`
       view: anything not clean. `compliance.` scopes the parameter to the view
       (`tableScope`); the list carries suspend, so the act comes with it. */
    drilldownRoute: '/operations/people?view=compliance&compliance.filter=worstState:neq:valid',
  },
  {
    /**
     * **A phone number shared by a rider account and a captain account**
     * (`identityCollisions()` `:16461`, cross-role count `:16495`). Derived
     * across the two fixtures rather than seeded, so it cannot claim a clean
     * bill of health the data does not support.
     *
     * **It is `0` today, and `0` is the answer, not an em-dash** (AC-606).
     * Legacy says why any of them matters: *"those are the ones that break
     * dispatch, because an event keyed on an ambiguous identity can be
     * published to the wrong client"* (`:16497`).
     *
     * **Finding:** there is no colliding pair anywhere in the fixtures, so the
     * non-zero state of this tile — and the Admin integrity pane behind it —
     * cannot be reached without hand-editing. Riders carry no `email` field
     * either, so only half of legacy's predicate is even expressible.
     */
    key: 'management.risk.identityCollisions',
    subTabId: 'management-risk',
    category: 'risk',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **one** phone number was shared by a rider account
     * and a captain account at the close of 10 Jun, and it has since been
     * resolved. Zero today, so the tile reads −100 % — the one delta on this
     * board that is good news, and the case `higherIsBetter: false` exists for.
     */
    comparison: {
      kind: 'previous-period',
      value: 1,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: 'caption.phoneOnly',
    sourceResource: 'riders',
    /* Admin › Data's integrity pane. No view id exists — F-8. */
    drilldownRoute: null,
  },
  {
    key: 'management.risk.repeatIncidentCaptains',
    subTabId: 'management-risk',
    category: 'risk',
    /* `renderPredIncidents` (`:14345`): captains with 2+ incidents or disputes
       against them — *"a pattern, not a one-off"*. */
    value: 1,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-05-25',
    periodEnd: '2026-06-25',
    /**
     * Prior-window reading: **2** captains with a repeat incident in the trailing
     * thirty days. Recorded — the safety fixture holds incidents, not the rolling
     * window that was true on a past date.
     */
    comparison: {
      kind: 'previous-period',
      value: 2,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'safety',
    drilldownRoute: '/support/safety?view=open',
  },
  {
    /**
     * `DB.paymentRisk` (`:14199`) — riders whose renewal payment is flagged and
     * who still hold a non-cancelled subscription. **One:** `RDR-1041`, one
     * declined card retry. A renewal that will fail silently unless somebody
     * calls first.
     */
    key: 'management.risk.paymentRiskRenewals',
    subTabId: 'management-risk',
    category: 'risk',
    value: 1,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **4** renewals on an instrument that had already
     * failed. Recorded; the payment fixture keeps no per-renewal failure history.
     */
    comparison: {
      kind: 'previous-period',
      value: 4,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: null,
    drilldownRoute: '/operations/subscriptions?view=at-risk',
  },
  {
    key: 'management.risk.revenueAtRiskShareOfMrr',
    subTabId: 'management-risk',
    category: 'risk',
    value: null,
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /* Prior-window reading: **10.4 %** of MRR at risk. Recorded, and a rate. */
    comparison: {
      kind: 'previous-period',
      value: 10.4,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'subscriptions',
    drilldownRoute: '/operations/subscriptions?view=at-risk',
  },
  {
    key: 'management.risk.daysToRenewalAtRisk',
    subTabId: 'management-risk',
    category: 'risk',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **17 days** of median runway before the at-risk
     * subscriptions renew. Recorded. Thirteen today, which is the direction that
     * matters: less time to save them, on a tile where up is better.
     */
    comparison: {
      kind: 'previous-period',
      value: 17,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'subscriptions',
    drilldownRoute: '/operations/subscriptions?view=at-risk',
  },

  /* ── Management › Growth ─────────────────────────────────────────────────
     "Is the money we spend to acquire and keep riders producing
     subscriptions?" The promo campaigns and incentive rules are the sub-tab's
     `P1` **table** — both carry row actions — which is why §8.3 specifies no
     breakdown here.                                                          */
  {
    /**
     * `promoROI(p)` (`:13501`): attributed subscription revenue ÷ discount
     * spend, blended across all four campaigns. 219 new subscriptions × SAR
     * 86.50 = SAR 18,943.50 against SAR 14,340 spent = **1.3×**.
     *
     * **R4-12:** a `ratio` renders `1.3×` and the operands live in the label,
     * never in the value. Legacy writes `2.4× demand/supply` into the value
     * itself (`:6953`) and that cannot be right-aligned or translated.
     *
     * Below 1.0× the business is paying more in discount than the
     * subscriptions are worth; legacy colours the per-campaign figure red
     * there (`:13520`). **Q7 moves this tile.**
     */
    key: 'management.growth.promoROI',
    subTabId: 'management-growth',
    category: 'revenue',
    value: 1.3,
    absenceReason: null,
    unit: 'ratio',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-01-01',
    periodEnd: '2026-06-25',
    /**
     * Prior-window reading: **1.1x**. Recorded — there is no promotions store, so
     * the value above is a legacy literal and the baseline is one too. Both go if
     * product-owner rules the tile out under §11.2.
     */
    comparison: {
      kind: 'previous-period',
      value: 1.1,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: 'caption.attributedAtPlanPrice',
    sourceResource: null,
    drilldownRoute: null,
  },
  {
    /**
     * Spend ÷ budget across **active** campaigns (`:13510`): EYVAR30 at
     * 4,180/5,000 and MONTHLY10 at 1,240/8,000 — SAR 5,420 of 13,000, **42 %**.
     * BACK2WORK is exhausted and RAMADAN25 expired, and folding either in would
     * report a burn rate for money nobody can still spend.
     *
     * **`no-target`, and that is M-1 rather than an oversight.** Legacy warns
     * at 80 % and auto-pauses the campaign at 100 % (`:13516`, `:13548`) — so
     * acquisition stops without anyone deciding it should — but nobody has set
     * a *board* target, and a target with no owner drifts.
     */
    key: 'management.growth.promoBudgetConsumed',
    subTabId: 'management-growth',
    category: 'revenue',
    value: 42,
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-01-01',
    periodEnd: '2026-06-25',
    comparison: { kind: 'none', reason: 'no-target' },
    higherIsBetter: false,
    caption: 'caption.activeCampaignsOnly',
    sourceResource: null,
    drilldownRoute: null,
  },
  {
    key: 'management.growth.subscriptionsFromPromos',
    subTabId: 'management-growth',
    category: 'subscriptions',
    /* `DB.promos[].newSubs`: 61 + 32 + 38 + 88. */
    value: 219,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-01-01',
    periodEnd: '2026-06-25',
    /* Prior-window reading: **168**. Recorded, same store, same caveat. */
    comparison: {
      kind: 'previous-period',
      value: 168,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: null,
    drilldownRoute: null,
  },
  {
    key: 'management.growth.newRiders',
    subTabId: 'management-growth',
    category: 'demand',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-06-23',
    periodEnd: '2026-06-25',
    /**
     * **The measured-zero case (AC-606).** Nobody joined in the three days to
     * 25 Jun; one rider joined on the 22nd, in the three days before. So the
     * tile reads `0` — not an em-dash — with a real `−100 %` beside it.
     *
     * Its window is three days rather than the snapshot fortnight because the
     * value's window is three days, and a delta between a 3-day count and a
     * 15-day one is the L-3 defect (`:6969`) with different numbers.
     */
    comparison: {
      kind: 'previous-period',
      value: 1,
      periodStart: '2026-06-20',
      periodEnd: '2026-06-22',
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'riders',
    drilldownRoute: '/operations/people?view=riders',
  },
  {
    /**
     * **Moved here from Overview** (§5.4: *"a cumulative census is an
     * acquisition number, not a board number"*), and the key moved with it —
     * `Metric.key` is namespaced by sub-tab, so a tile that changes board
     * changes key. Q-103: one number, one board.
     */
    key: 'management.growth.registeredRiders',
    subTabId: 'management-growth',
    category: 'demand',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * **54** riders had joined on or before 10 Jun; the fifty-fifth joined
     * 22 Jun.
     *
     * **This is a derived fact stored as a literal, and it is the reason this
     * line moved.** `value` is computed (`riderFixtures.length`) while the
     * baseline beside it is typed in, so the two drift the moment the rider
     * population changes — which it did when `RDR-1042` … `RDR-1049` were
     * added as real records and `fillerRiders` took the population past the
     * page size. `clients/metrics.test.ts` re-derives it from
     * `riderFixtures`, which is what caught the drift.
     *
     * **Finding for the metrics owner:** this baseline should be computed the
     * same way its numerator is — `riderFixtures.filter(r => r.joinedAt <=
     * SNAPSHOT_PREVIOUS.end).length` — rather than maintained by hand. It is
     * the only cross-file coupling that makes growing a fixture population a
     * two-file change.
     */
    comparison: {
      kind: 'previous-period',
      value: 54,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'riders',
    drilldownRoute: '/operations/people?view=riders',
  },
  {
    /**
     * Legacy defines dormancy as *"no recorded trip and no subscription"* and
     * immediately warns that *"this dataset has no precise 'last app open'
     * timestamp per rider, so treat this as a proxy, not an exact figure"*
     * (`:6968`). **That caveat is now renderable — AC-641, and it is one of the
     * three tiles F-2 said could not ship without a caption.**
     *
     * **Derived, not the old literal 19.** One rider of thirteen qualifies —
     * `RDR-4002`, the account with the 46-character Arabic name, zero trips,
     * zero subscriptions and a high churn risk — so the honest figure is 8 %.
     * Legacy's own watch threshold is 25 % (`:6967`).
     */
    key: 'management.growth.dormantRiderShare',
    subTabId: 'management-growth',
    category: 'demand',
    value: null,
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **4 %** of riders with no trip and no subscription.
     * Recorded — `joinedAt` exists but dormancy is evaluated against today only.
     */
    comparison: {
      kind: 'previous-period',
      value: 4,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: 'caption.dormancyProxy',
    sourceResource: 'riders',
    drilldownRoute: '/operations/people?view=riders',
  },
  {
    /**
     * `DB.referralLog` referrer + referee bonuses (`:13888`) plus
     * `DB.driverBonusLog` amounts (`:13895`): (20 + 10) + (40 + 25) = **SAR
     * 95.00**.
     *
     * A four-digit halala figure beside a seven-digit one, which is the point —
     * this is the other half of the giveback Overview's contribution margin
     * subtracts, and it is invisible until it is a tile. Spec §8.1 tile 6: bad
     * is *"growing faster than tiles 3 and 4 combined"*.
     */
    key: 'management.growth.referralAndIncentiveSpend',
    subTabId: 'management-growth',
    category: 'revenue',
    value: 9_500,
    absenceReason: null,
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    periodStart: '2026-01-01',
    periodEnd: '2026-06-25',
    /* Prior-window reading: **SAR 82.00**. Recorded; no referrals store. */
    comparison: {
      kind: 'previous-period',
      value: 8_200,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: null,
    drilldownRoute: null,
  },
  {
    key: 'management.growth.activationRate7d',
    subTabId: 'management-growth',
    category: 'demand',
    value: null,
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **1.5 %** of riders took a first trip inside seven
     * days of joining. Recorded, and a rate.
     */
    comparison: {
      kind: 'previous-period',
      value: 1.5,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'riders',
    drilldownRoute: '/operations/people?view=riders',
  },
  {
    key: 'management.growth.qrToSubConversionRate',
    subTabId: 'management-growth',
    category: 'subscriptions',
    value: null,
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **8.6 %** of quick-ride riders held a subscription.
     * Recorded, and a rate.
     */
    comparison: {
      kind: 'previous-period',
      value: 8.6,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'riders',
    drilldownRoute: '/operations/people?view=riders',
  },
  {
    key: 'management.growth.cacPerSubscription',
    subTabId: 'management-growth',
    category: 'revenue',
    value: null,
    absenceReason: null,
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **SAR 159.00** per subscription. Recorded. Falling,
     * which on a cost is the good direction — hence `higherIsBetter: false`.
     */
    comparison: {
      kind: 'previous-period',
      value: 15_900,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'subscriptions',
    drilldownRoute: '/financials/revenue',
  },
  {
    key: 'management.growth.ltvCacRatio',
    subTabId: 'management-growth',
    category: 'revenue',
    value: null,
    absenceReason: null,
    unit: 'ratio',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /* Prior-window reading: **4.4x**. Recorded. */
    comparison: {
      kind: 'previous-period',
      value: 4.4,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'riders',
    drilldownRoute: '/operations/people?view=riders',
  },

  /* ── Management › Market & Zones ─────────────────────────────────────────
     "Where is demand going unserved, and where does the next captain need to
     be?" Every value below is arithmetic over `DB.zones` (`:13952`) and
     `DB.cities` (`:13946`), which this layer does **not** yet hold as a
     resource — see the finding on `boardBreakdowns` below.

     **`management.zones.trackedZones` is deleted — AC-650.** Six is a constant
     of the seed: a count that changes only when somebody adds a zone is a
     setting, not a metric.                                                   */
  {
    /**
     * `Math.max(0, ceil(demand ÷ 3) − supply)` summed over zones (`:14156`);
     * three active requests per available captain is legacy's stated healthy
     * target. Only Al Narjis is short — 14 demand against 2 captains needs 5 —
     * so the answer is **3**.
     *
     * Spec §9.1 calls this *"the most actionable figure on any of the eight
     * boards"*, because it turns a ratio nobody can act on into a recruitment
     * target somebody can, and it is on no board today.
     */
    key: 'management.zones.captainsNeeded',
    subTabId: 'management-zones',
    category: 'supply',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **5** captains short across every starved zone.
     * Recorded — `fixtures/zones.ts` holds one demand/supply reading per zone,
     * with no dated series behind it.
     */
    comparison: {
      kind: 'previous-period',
      value: 5,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: 'caption.healthyRatio',
    sourceResource: 'zones',
    drilldownRoute: null,
  },
  {
    /**
     * Zones where `demand ÷ supply ≥ 3` (`:14133`): **Al Narjis 14 : 2** and
     * **Al Sahafa 9 : 3**. Two.
     *
     * **AC-724 — this is the tile the `management-zones` nav badge must equal**,
     * and `navCounts.ts` carries the same 2 for the same reason.
     *
     * **The criterion names the wrong tile.** AC-724 says *"the first tile on
     * Market & Zones"*; §9.1 ranks captains-needed first and supply-starved
     * second. The badge is legacy's own `starved` count (`:14140`), so it is
     * this tile — **tile 2** — that must agree. Carried as a spec error rather
     * than resolved by re-ranking the board to fit the sentence.
     */
    key: 'management.zones.starvedZones',
    subTabId: 'management-zones',
    category: 'supply',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **3** zones at or past 3.0x demand-to-supply.
     * Recorded, same fixture.
     */
    comparison: {
      kind: 'previous-period',
      value: 3,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: 'caption.demandThreeTimesSupply',
    sourceResource: 'zones',
    drilldownRoute: null,
  },
  {
    /* `DB.zones[].failures30d` summed (`:14139`): 11 + 6 + 4 + 2 + 1 + 7 = 31.
       Demand that found no captain. **Never called "failed"** — AC-718, and
       "unserved" is the truer word anyway: the request did not fail, it found
       nobody. */
    key: 'management.zones.unservedRequests30d',
    subTabId: 'management-zones',
    category: 'demand',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-05-26',
    periodEnd: '2026-06-25',
    /**
     * Prior-window reading: **24** unserved requests in the trailing thirty days.
     * Recorded.
     */
    comparison: {
      kind: 'previous-period',
      value: 24,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'zones',
    drilldownRoute: null,
  },
  {
    /**
     * `zoneFailRate` averaged across the six zones (`:13974`): 79, 67, 18, 25,
     * 17, 64 → **45 %**.
     *
     * **Corrected from 42, which did not reproduce.** Recomputed from
     * `DB.zones` this pass. Legacy's own city-level average (`:6940`) is worse
     * than wrong — defect **L-6** computes it for Riyadh only, by string
     * equality on the city name, so every other city renders an em-dash
     * forever.
     */
    key: 'management.zones.avgFailureRate',
    subTabId: 'management-zones',
    category: 'service',
    value: null,
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-05-26',
    periodEnd: '2026-06-25',
    /**
     * Prior-window reading: **39 %** mean zone failure rate. Recorded, and a
     * rate.
     */
    comparison: {
      kind: 'previous-period',
      value: 39,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'zones',
    drilldownRoute: null,
  },
  {
    /**
     * `DB.steerOffers` with `status === 'active'` (`:14140`). Seeded empty, so
     * **`0` — a measured zero, not an em-dash.**
     *
     * Bad is not the number: it is *an offer live past half its window with no
     * acceptances*, which is the incentive being too small while the budget
     * burns (`:14107`). Nothing on this board can say that yet; the offer's own
     * window is not a field this layer holds.
     */
    key: 'management.zones.steerOffersLive',
    subTabId: 'management-zones',
    category: 'supply',
    value: 0,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * **A zero baseline, deliberately kept.** No steer offer was live at the
     * close of 10 Jun and none is live now. `clients/metrics.ts` refuses to
     * divide by a zero *period* baseline and re-states the comparison as
     * `insufficient-data`, so this tile is what keeps that guard — and the third
     * `NoComparisonReason` — reachable from real fixture data.
     */
    comparison: {
      kind: 'previous-period',
      value: 0,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: null,
    drilldownRoute: null,
  },
  {
    /**
     * Al Narjis: 14 demand against 2 captains (`:13953`) — **7.0×**.
     *
     * **R4-12 rules on this exact tile**, so it stays even though §9.1's list
     * of six omits it: the value is the bare number, the `×` is the UI's, and
     * the operands live in the label (`Worst demand-to-supply ratio`). Deleting
     * the one tile a fresh ruling names would leave the ruling with no referent
     * and the only `ratio`-unit tile on any board unexercised.
     */
    key: 'management.zones.worstDemandSupplyRatio',
    subTabId: 'management-zones',
    category: 'supply',
    value: null,
    absenceReason: null,
    unit: 'ratio',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: the worst zone ran at **5.2x**. Recorded. 7.0x today
     * — the board’s worst movement, and the condition its notice is raised on.
     */
    comparison: {
      kind: 'previous-period',
      value: 5.2,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'zones',
    drilldownRoute: null,
  },
  {
    /**
     * `DB.cities` (`:13946`) — four seeded, **one live**. The tile that reads
     * `1` against a denominator of 4 and needs the denominator to make sense; a
     * bare `1` is meaningless and a `25 %` is worse. **R4-4's own worked
     * example of a legal caption**, now that there is a field to put it in.
     */
    key: 'management.zones.liveCities',
    subTabId: 'management-zones',
    category: 'supply',
    value: 1,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'target', value: 4, setByUserId: 'USR-1', effectiveFrom: '2026-01-01' },
    higherIsBetter: true,
    caption: 'caption.citiesLive',
    sourceResource: null,
    drilldownRoute: null,
  },
  {
    key: 'management.zones.unservedDemandCities',
    subTabId: 'management-zones',
    category: 'demand',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **12** riders in a city we have supply signal in and
     * no service. Recorded — a rider's home city is current state and carries
     * no date to reconstruct from.
     *
     * **The value itself was `0` until this pass, and that was the fixture, not
     * the measure.** Every one of the 55 riders and all 57 captains were seeded
     * in Riyadh, so a tile defined as *"riders in cities other than Riyadh where
     * captains exist"* had an empty candidate set by construction and could only
     * ever report zero. It reads **18** now. See `FILLER_RIDER_CITIES` in
     * `fixtures/riders.ts`.
     */
    comparison: {
      kind: 'previous-period',
      value: 12,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'riders',
    drilldownRoute: '/operations/people?view=riders',
  },
  {
    key: 'management.zones.applicantPipelinePerCity',
    subTabId: 'management-zones',
    category: 'supply',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **3** applications in flight. Recorded; the derived
     * count above is a live pipeline depth with no dated equivalent.
     */
    comparison: {
      kind: 'previous-period',
      value: 3,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'applicants',
    drilldownRoute: '/operations/people?view=applicants',
  },
  {
    key: 'management.zones.steerOfferAcceptanceRate',
    subTabId: 'management-zones',
    category: 'supply',
    value: null,
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /* Prior-window reading: **71.2 %** of steer offers accepted. Recorded. */
    comparison: {
      kind: 'previous-period',
      value: 71.2,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'zones',
    drilldownRoute: '/management/zones',
  },

  /* ── Operations › Overview ───────────────────────────────────────────────
     "What must this shift deal with before it ends?" Eight tiles, and every
     one of them is derived from a queue this layer already serves — so the
     board cannot drift away from the screens it points at.                   */
  {
    /**
     * **Spec §10.1 tile 1, and the half of `Pending approvals` that decides
     * anything.** Legacy puts the waiting count on the dashboard (`:10374`) and
     * never says how many are past their window. Two are: `APP-2204` (due
     * 2026-06-24 13:05) and `APP-2205` (due 2026-06-23 16:30).
     *
     * The 48-hour window is a decision, not a placeholder — `02-work-queues`
     * §4.3 ratifies it against T3 `resolveMin: 2880` (`:14654`) and closes Q8.
     */
    key: 'operations.overview.applicationsPastWindow',
    subTabId: 'operations-overview',
    category: 'supply',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **5** applications sat past the 48-hour window at the
     * close of 10 Jun against 2 today. Recorded, not reconstructible — the
     * applicant fixture stamps `slaBreachedAt` as current state and keeps no
     * record of who was breaching a fortnight ago.
     */
    comparison: {
      kind: 'previous-period',
      value: 5,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: 'caption.window48h',
    /* The breached filter on the applications view does not exist — F-8. */
    drilldownRoute: '/operations/people?view=applications',
    sourceResource: 'applications',
  },
  {
    key: 'operations.overview.pendingApplications',
    subTabId: 'operations-overview',
    category: 'supply',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * **Reconstructed, and asserted in `metrics.test.ts`:** two applications had
     * been submitted by 10 Jun and were still undecided on it — `appliedAt` on or
     * before the window close, `decidedAt` null or after it. Five are pending
     * today, so the pipeline more than doubled in a fortnight.
     */
    comparison: {
      kind: 'previous-period',
      value: 2,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    /* Legacy's own sub-line is *"Awaiting review"* (`:10374`) — a status, which
       R4-4 forbids a caption from carrying. The scope is what was worth
       keeping: this counts two statuses, and the `operations-people` badge of
       7 counts these five plus two lapsed documents (AC-721). */
    caption: 'caption.pendingAndInReview',
    sourceResource: 'applications',
    drilldownRoute: '/operations/people?view=applications',
  },
  {
    key: 'operations.overview.breachedWorkItems',
    subTabId: 'operations-overview',
    category: 'service',
    /* Derived across every wave-2 queue through the same builder `listWorkItems`
       uses. The one tile that answers "is anything on fire" without naming a
       queue — and **AC-723**: it is the *breached* count, where the
       `operations-my-work` badge is the *backlog*. Both labels say which. */
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **9** breached items across every wave-2 queue.
     * Recorded — `workBacklogByQueue()` reads current state and no queue fixture
     * carries the depth it had a fortnight ago.
     */
    comparison: {
      kind: 'previous-period',
      value: 9,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: 'caption.acrossFiveQueues',
    sourceResource: 'work-items',
    /**
     * **AC-658 — corrected from `?view=everything`, which sent the operator to
     * the whole inbox and made them find the breaches themselves.**
     *
     * `clients/myWork.ts` serves `view=breached`; the **route table does
     * not declare it** (`fixtures/routeTable.ts:242` lists `mine`,
     * `unassigned`, `everything`). That row is the route-table owner's and is
     * requested, not taken.
     */
    drilldownRoute: '/operations/my-work?view=breached',
  },
  {
    /**
     * **Spec §10.1 tile 4, and it was missing entirely.** Items routed to a
     * role and in nobody's name. *"It says the rota is short before the SLA
     * does"* — legacy's `inbox` carried two ownership counters and neither
     * survived the rebuild.
     */
    key: 'operations.overview.unclaimedWork',
    subTabId: 'operations-overview',
    category: 'service',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **17** items routed to a role and in nobody’s name.
     * Recorded, for the reason above.
     */
    comparison: {
      kind: 'previous-period',
      value: 17,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'work-items',
    drilldownRoute: '/operations/my-work?view=unassigned',
  },
  {
    key: 'operations.overview.legsUncovered',
    subTabId: 'operations-overview',
    category: 'supply',
    /* Assurance legs where the backup is ineligible **or** absent (`:13150`).
       *Registered but ineligible counts as exposed, because that is what
       happens in practice* (`:13149`). */
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **6** legs with no backup captain eligible. Recorded
     * — `backupEligible` is a current-state flag with no history behind it.
     */
    comparison: {
      kind: 'previous-period',
      value: 6,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'assurance',
    drilldownRoute: '/operations/assurance?view=no-backup-captain',
  },
  {
    key: 'operations.overview.openRequests',
    subTabId: 'operations-overview',
    category: 'demand',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **6** requests searching, offered or with no drivers.
     * Recorded rather than reconstructed: every seeded request was raised on or
     * after 20 Jun, so the fixture cannot see 10 Jun at all.
     */
    comparison: {
      kind: 'previous-period',
      value: 6,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'requests',
    drilldownRoute: '/operations/requests?view=pending',
  },
  {
    /**
     * Captains whose worst document has already lapsed — off dispatch —
     * `complianceScan()` (`:13296`), `worst === 0` (`:13322`). **Two**, and one
     * of them is `DRV-0104`, a gold captain with 524 trips on a national ID
     * that expired on 2026-06-20.
     */
    key: 'operations.overview.complianceExpired',
    subTabId: 'operations-overview',
    category: 'risk',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **3** captains legally off dispatch. Recorded — the
     * compliance fixture holds each document’s current worst state, not the state
     * it was in on a past date.
     */
    comparison: {
      kind: 'previous-period',
      value: 3,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'compliance',
    drilldownRoute: '/operations/people?view=compliance',
  },
  {
    /**
     * Captains not currently on a trip (`driverLiveState` `:7283`, counted
     * `:10358`). **50 of 52** — `DRV-0101` and `DRV-0102` are mid-trip.
     *
     * Spec §10.1 tile 8: bad is *"below the open-request count"*. That
     * comparison — this tile against tile 6 — is the supply question, and
     * neither number means much alone. **No tile can state it**: `Metric`
     * compares against a period or a target, never against another metric.
     * Recorded as a finding rather than faked with a literal.
     */
    key: 'operations.overview.captainsAvailable',
    subTabId: 'operations-overview',
    category: 'supply',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **46** active captains not on a trip. Recorded, and
     * it carries the same approximation the Overview’s captain census does:
     * `status` is current, so a captain suspended yesterday was not counted
     * active a fortnight ago either.
     */
    comparison: {
      kind: 'previous-period',
      value: 46,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: 'caption.notOnATrip',
    sourceResource: 'drivers',
    drilldownRoute: '/operations/people?view=captains',
  },
  {
    key: 'operations.overview.oldestItemWaitingMinutes',
    subTabId: 'operations-overview',
    category: 'service',
    value: null,
    absenceReason: null,
    unit: 'minutes',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: the oldest waiting item was **four days** (5,760
     * minutes) at the close of 10 Jun. Recorded — request timestamps start on
     * 20 Jun and cannot see the window.
     */
    comparison: {
      kind: 'previous-period',
      value: 5_760,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'requests',
    drilldownRoute: '/operations/ride-requests',
  },
  {
    key: 'operations.overview.medianTimeToAssign',
    subTabId: 'operations-overview',
    category: 'service',
    value: null,
    absenceReason: null,
    unit: 'minutes',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: a **52-minute** median time to assign. Recorded, for
     * the same reason.
     */
    comparison: {
      kind: 'previous-period',
      value: 52,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'requests',
    drilldownRoute: '/operations/ride-requests',
  },
  {
    key: 'operations.overview.slaAttainmentPercent',
    subTabId: 'operations-overview',
    category: 'service',
    value: null,
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **86.2 %** of items resolved inside their promise.
     * Recorded. A rate, so it is level-independent, and the fall to 80.4 % is the
     * movement this tile exists to show.
     */
    comparison: {
      kind: 'previous-period',
      value: 86.2,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'requests',
    drilldownRoute: '/operations/ride-requests',
  },
  {
    key: 'operations.overview.riderAbandonmentRate',
    subTabId: 'operations-overview',
    category: 'demand',
    value: null,
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **4.9 %** of requests cancelled or unserved.
     * Recorded, and also a rate.
     */
    comparison: {
      kind: 'previous-period',
      value: 4.9,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'requests',
    drilldownRoute: '/operations/ride-requests',
  },

  /* ── Customer Support › Overview ─────────────────────────────────────────
     "Are we answering people inside the time we promised, and what are they
     calling about?"

     **Six tiles, not eight — R5-1 applied R4-11 §11.2 and two left.** The
     board used to carry four `null`s and treat them as one class. They are two
     classes and the difference decides whether a tile renders at all:

       - **`ticketsBreaching` and `promiseKept` have no store.** There is no
         `fixtures/tickets.ts`, no `types/ticket.ts` and no ticket client — the
         measure is not one this layer performs. An em-dash is a claim that the
         number exists somewhere, so **they do not render.** Both are listed in
         the spec's *deliberately not here* table against the store they wait
         on, and they return the day it does.
       - **`contactsPerThousandTrips` and `uncodedContactShare` have a store
         and it is empty.** `DB.contacts` is seeded `[]` (`:14718`) and the
         reason-code registry beside it is a full 26 entries (`:14690`+). This
         layer models that log in three places at once and they agree: a tile
         with no value, a chart with `points: []`, and a breakdown with zero
         rows. **They render, with `absenceReason`.**

     Under Q-101 neither class ships a plausible literal. That gap is still the
     single largest in the product; what changed is that the board no longer
     tells an operator four times that it cannot tell them anything.          */
  {
    /**
     * Open incidents of severity `critical` whose first-response clock has
     * breached — `INC-014` and `INC-015`, neither with a single protocol step
     * ticked. **Two.**
     *
     * `DB.slaPolicy.tiers.T1.firstResponseMin` is `0` (`:14652`) and
     * `02-work-queues` §4.3 raises it to five minutes because zero cannot be
     * displayed or met. **This is the one number in the product whose bad value
     * is `1`**, and it is the condition behind this board's notice.
     */
    key: 'support.overview.unacknowledgedCriticalIncidents',
    subTabId: 'support-overview',
    category: 'risk',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **1**. Recorded — every incident opened before 10 Jun
     * in `fixtures/safety.ts` was closed the same day, so a reconstruction reads
     * zero, and a zero baseline has no percentage to take.
     */
    comparison: {
      kind: 'previous-period',
      value: 1,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'safety',
    drilldownRoute: '/support/safety?view=critical-sos',
  },
  {
    key: 'support.overview.openIncidents',
    subTabId: 'support-overview',
    category: 'risk',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **4** incidents open at the close of 10 Jun.
     * Recorded, for the reason above.
     */
    comparison: {
      kind: 'previous-period',
      value: 4,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'safety',
    drilldownRoute: '/support/safety?view=open',
  },
  {
    key: 'support.overview.contactsPerThousandTrips',
    subTabId: 'support-overview',
    category: 'service',
    /**
     * CPT — *"the one number that…"* (`:14980`). **`null`**: `DB.contacts` is
     * seeded empty (`:14718`) and every contact is written at runtime, so the
     * numerator does not exist on a fresh load. Zero would claim a perfect
     * support record; `null` says we have not measured it.
     *
     * **`not-captured`, and this tile is R5-1 §10's worked example — the
     * ruling draws it by name.** The contact log is a store this product
     * declares and has written nothing into; *yet* is the whole content of the
     * word. The chart of the same key carries `points: []` and the breakdown
     * below carries zero rows, so three surfaces say one thing and none of them
     * says zero.
     *
     * **Its caption is `null` and stays `null`.** Nothing about this number is
     * mis-readable once it exists; there is no scope to limit and no direction
     * to state.
     */
    value: null,
    absenceReason: 'not-captured',
    unit: 'ratio',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: CURRENT_PERIOD.start,
    periodEnd: CURRENT_PERIOD.end,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    caption: null,
    sourceResource: null,
    drilldownRoute: '/support/contact-centre',
  },
  {
    /**
     * Contacts with no reason code, as a share of all contacts (`st.uncodedPct`
     * `:15024`), against **a real target with a real source**:
     * `DB.slaPolicy.uncodedCeilingPct = 3` (`:14659`). One of very few targets
     * on any board that somebody actually set.
     *
     * **AC-674** — this is the second of the three tiles F-2 said could not
     * ship without a caption. The caption is load-bearing rather than
     * decorative: the tile *gates the breakdown below it*. If a tenth of
     * contacts are uncoded, the reason-code ranking is not trustworthy and no
     * product fix should be prioritised from it.
     *
     * **`not-computable`, not `not-captured`, and the pair with CPT is what
     * makes the distinction earn its keep.** Both read the same empty log. CPT
     * is a count over a denominator that exists (trips), so its absence is that
     * nothing has been captured. This one is *uncoded contacts ÷ all contacts*
     * — **a rate over a zero denominator**, which is the type's own worked
     * example of the second member. Same store, two honest and different
     * answers.
     *
     * **Two consequences of R5-1 that land on this tile specifically**, stated
     * so they are not discovered: while the value is absent, the caption does
     * not render and neither does `vs 3 target`. So the ceiling that AC-674
     * calls load-bearing is invisible for exactly as long as there is no number
     * to read against it — which is correct, because it is the number that
     * makes the ceiling worth stating. **Raised for product-designer** rather
     * than worked around: the one tile whose caption gates a breakdown is the
     * one tile where suppressing the caption removes an operator's warning, and
     * the empty breakdown's own sentence is what carries the load meanwhile.
     */
    key: 'support.overview.uncodedContactShare',
    subTabId: 'support-overview',
    category: 'service',
    value: null,
    absenceReason: 'not-computable',
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'target', value: 3, setByUserId: null, effectiveFrom: '2026-01-01' },
    higherIsBetter: false,
    caption: 'caption.uncodedCeiling',
    sourceResource: null,
    drilldownRoute: '/support/contact-centre',
  },
  {
    key: 'support.overview.openFairnessCases',
    subTabId: 'support-overview',
    category: 'service',
    /* Any past its reason code's target (`rcTargets(code).res`, `:14730`).
       `FC-0004` is four and a half days past a 24-hour window **with no first
       response at all**. */
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * **Reconstructed, and asserted in `metrics.test.ts`:** two fairness cases
     * had been opened by 10 Jun and were still undecided on it. **Fourteen** are
     * open today, because ten of the filler cases stopped being archive rows —
     * see `fixtures/fairness.ts` for why, and `fixtures/navCounts.ts` for the
     * badge that moved with them.
     */
    comparison: {
      kind: 'previous-period',
      value: 2,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'fairness',
    drilldownRoute: '/support/fairness?view=suspension-appeals',
  },
  {
    key: 'support.overview.overturnRate',
    subTabId: 'support-overview',
    category: 'service',
    /**
     * Decided fairness cases that were overturned (`:15641`). **Higher is not
     * worse**: *"A high overturn rate on this page is not a failure — it means
     * the appeal route is doing its job and catching bad calls before they cost
     * you a captain"* (`:15690`).
     *
     * So `higherIsBetter: true` on a metric every instinct says to colour red.
     * This is precisely the field a screen cannot derive — and under R4-5 it is
     * spent on the screen-reader phrase, not on a colour. **AC-675**: the
     * reasoning finally has somewhere to render.
     */
    value: null,
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * **`insufficient-data`, not `no-history` — and the distinction is the
     * point of having three reasons.** Three fairness cases have been decided
     * in total (`FC-0005` and `FC-0006` overturned, `FC-0007` upheld). One more
     * decision either way swings the rate by 25 points, so a delta on it would
     * be noise wearing a caret.
     */
    /**
     * **Reconstructed, and it replaces a `reason: insufficient-data` that had
     * gone stale.** That reason was written when three fairness cases had been
     * decided and one more either way moved the rate 25 points;
     * `fixtures/fairness.ts` now holds **32** decided cases and the claim is no
     * longer true of the data.
     *
     * The tile is a **cumulative** rate — `periodStart` and `periodEnd` are
     * both null — so the baseline is the same cumulative rate **as at the close
     * of 10 Jun**: 16 cases decided by then, 10 of them overturned, **63 %**.
     * Not the rate *within* the window, which is a different population and
     * would be the L-3 shape with better manners.
     *
     * **It comes out at 63 % on both sides, and `0.0 %` is the answer.** A rate
     * that has not moved in a fortnight is a measurement, and §3.7 is explicit
     * that a measured zero is never an em-dash.
     */
    comparison: {
      kind: 'previous-period',
      value: 63,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: 'caption.overturnIsNotFailure',
    sourceResource: 'fairness',
    drilldownRoute: '/support/fairness',
  },
  {
    key: 'support.overview.medianTimeToFirstResponse',
    subTabId: 'support-overview',
    category: 'service',
    value: null,
    absenceReason: null,
    unit: 'minutes',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /* Prior-window reading: an **11-minute** median first response. Recorded. */
    comparison: {
      kind: 'previous-period',
      value: 11,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'safety',
    drilldownRoute: '/support/safety',
  },
  {
    key: 'support.overview.repeatContactRate',
    subTabId: 'support-overview',
    category: 'service',
    value: null,
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **2.4 %** of riders contacted us more than once.
     * Recorded, and a rate.
     */
    comparison: {
      kind: 'previous-period',
      value: 2.4,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'riders',
    drilldownRoute: '/support/contacts',
  },

  /* ── Admin › Overview ────────────────────────────────────────────────────
     "Is the console itself safe, staffed, and inside its statutory
     obligations?" No legacy page contributes wholesale — the route-table row's
     `legacyPageIds` is empty and says so.

     **`admin.overview.activityEvents` is deleted — AC-685, AC-722.** A count of
     log rows measures how busy the log was, and there is no value of it that
     changes what anybody does. The **chart** stays (§12.2) with its purpose
     restated: it is an anomaly detector, not a volume report.

     **Four tiles, not seven — R5-1 applied R4-11 §11.2 and three left.** This
     is the board the ruling changes most, and every removal was re-derived from
     the sources rather than taken from the ruling's table on trust:

       - **`integrityOrphans`.** `reconcileEntity` (`:18515`) needs four inputs:
         a stored lifetime total, the trips behind it, the *payments* behind it
         (`entityDerived` `:18495` reads `DB.payments` keyed by entity), and a
         **data window** (`DB.dataWindow.months = 13`, `:20403`). This layer
         holds the first two — riders carry `totalTrips` and
         `lifetimeValueHalalas`, and `fixtures/trips.ts` is real — and holds
         **neither** of the last two. `fixtures/ledger.ts` is journal entries and
         subject postings, not a per-entity payments ledger, and no data window
         exists anywhere in `src/data`. Half a reconciliation is not the
         measure; it is a different, smaller measure wearing its name.
       - **`impersonationSessions`.** The events are logged and the join is not.
         `clients/audit.ts` is *session-only and empty at boot* by design, and
         carries no `impersonation_started` / `impersonation_ended` pair to join.
         There is no session store.
       - **`legalDocsUnaccepted`.** Nothing in `src/data` holds a legal document,
         a version, or an acceptance — no fixture, no type, no client. The
         `NEW DATA` note was written about the missing *grace period*; the
         re-derivation found the documents missing too.

     All three are listed in the spec's *deliberately not here* table. **A
     board's tile count is never a surprise to the person reading the spec**
     (R4-11 §11.2, addendum).                                                 */
  {
    /**
     * Pending PDPL erasure requests whose due instant has passed —
     * `ERASURE_SLA_DAYS = 30` (`:15962`), queue at `:16057`.
     *
     * **Was `openErasureRequests: 1, inside its window`. It is now overdue**,
     * and that is a deliberate fixture change with two consequences that make
     * the seed coherent rather than decorative:
     *
     *   - it is the condition behind this board's **notice** (R4-4 §4.3), which
     *     otherwise had no data to fire on;
     *   - it is the third `attention`-toned queue R4-10b raised the nav cap from
     *     2 to 3 for — *"three queues legitimately qualified and the cap was
     *     silencing one"*. `fixtures/navCounts.ts` already predicted this in
     *     writing before the cap moved.
     *
     * A statutory clock is the one deadline that is not ours to move, which is
     * clause 2 of R4-10b passing on its own terms.
     *
     * **L-8 still applies:** `DB.erasureRequests` is seeded *empty* in legacy
     * (`:15961`). The one request is this layer's invention, deliberately, and
     * is flagged so it stays a choice rather than drift.
     */
    key: 'admin.overview.erasureOverdue',
    subTabId: 'admin-overview',
    category: 'risk',
    value: 1,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **2** erasure requests past their statutory deadline.
     * Recorded — there is no erasure-request store, so both numbers are literals
     * and both go together if the tile does.
     */
    comparison: {
      kind: 'previous-period',
      value: 2,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: 'caption.statutoryThirtyDays',
    sourceResource: null,
    drilldownRoute: '/admin/data',
  },
  {
    /**
     * Day × block × tier slots with nobody assigned — `rotaGaps()`
     * (`:19650`), `rotaStats()` (`:19663`). 7 days × 3 blocks × 2 tiers = **42
     * slots**, and `DB.onCallSchedule.assign` is seeded `{}` (`:19604`), so
     * **all 42 are gaps and nobody is on call at any hour** (defect **L-9**,
     * AC-682). That is the number this board exists to surface.
     *
     * **Not a notice, a tile** (R4-4 §4.3): it is severe, it is visible, and it
     * is *recoverable* — somebody can be assigned at any moment. A notice is
     * for a condition where the delay itself does the damage.
     */
    key: 'admin.overview.rotaGaps',
    subTabId: 'admin-overview',
    category: 'supply',
    value: 42,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * **42 then, 42 now, and the flat delta is the finding.** All forty-two rota
     * slots are empty and have been for a fortnight: nobody is on call at any
     * hour of any day, and nothing has moved. `0.0 %` with `direction: flat` says
     * that. The em-dash said only that we had not looked. This is the one tile in
     * the product that exercises the flat arm.
     */
    comparison: {
      kind: 'previous-period',
      value: 42,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: 'caption.rotaSlots',
    sourceResource: null,
    drilldownRoute: '/admin/team',
  },
  {
    /**
     * Team users with two-factor off. Derived: **3 of 5**, and `USR-2` —
     * Finance, five permissions, moves real money — is one of them.
     *
     * **The only owned target on any board**, and until this pass it was being
     * thrown away: `resolve()` collapsed *any* zero baseline to
     * `insufficient-data` to dodge a division by zero, which is right for a
     * previous-period baseline and wrong for a target. **A target of zero is
     * the most meaningful target there is.** See `clients/metrics.ts`.
     */
    key: 'admin.overview.operatorsWithoutTwoFactor',
    subTabId: 'admin-overview',
    category: 'risk',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'target', value: 0, setByUserId: 'USR-1', effectiveFrom: '2026-01-01' },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'team-users',
    drilldownRoute: '/admin/team',
  },
  {
    /* A census, ranked last for that reason — spec §12.1: *"it is the tile I
       would cut first."* Four of five operators are Active. */
    key: 'admin.overview.activeOperators',
    subTabId: 'admin-overview',
    category: 'supply',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **3** operators with an active account. Recorded —
     * `TeamUser` carries no created-at, so a fourth operator joining cannot be
     * dated from the fixture.
     */
    comparison: {
      kind: 'previous-period',
      value: 3,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'team-users',
    drilldownRoute: '/admin/team',
  },
  {
    key: 'admin.overview.itemsResolvedPerOperatorHour',
    subTabId: 'admin-overview',
    category: 'service',
    value: null,
    absenceReason: null,
    unit: 'ratio',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /* Prior-window reading: **4.1** items an operator-hour. Recorded. */
    comparison: {
      kind: 'previous-period',
      value: 4.1,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'team-users',
    drilldownRoute: '/admin/team',
  },
  {
    key: 'admin.overview.workloadBalance',
    subTabId: 'admin-overview',
    category: 'service',
    value: null,
    absenceReason: null,
    unit: 'ratio',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **1.2x** between the busiest and the quietest
     * operator. Recorded.
     */
    comparison: {
      kind: 'previous-period',
      value: 1.2,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'team-users',
    drilldownRoute: '/admin/team',
  },

  /* ── Customer Support › Captain Fairness, view captain-economics ─────── */
  {
    key: 'support.fairness.earningsPerEngagedHour',
    subTabId: 'support-fairness',
    category: 'supply',
    /**
     * `renderCaptainEconomics` — earnings per *engaged* hour, not per shift.
     * The number that decides whether a captain stays, and the reason
     * `captain-economics` is a reading surface inside a queue-shaped sub-tab.
     */
    value: 4_180,
    absenceReason: null,
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    periodStart: CURRENT_PERIOD.start,
    periodEnd: CURRENT_PERIOD.end,
    comparison: {
      kind: 'previous-period',
      value: 4_620,
      periodStart: PREVIOUS_PERIOD.start,
      periodEnd: PREVIOUS_PERIOD.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: null,
    drilldownRoute: null,
  },
  {
    key: 'support.fairness.earningsP10',
    subTabId: 'support-fairness',
    category: 'supply',
    value: null,
    absenceReason: null,
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **SAR 3.92** an hour at the 10th percentile.
     * Recorded — `monthEarningsHalalas` is a running month total, not a series.
     */
    comparison: {
      kind: 'previous-period',
      value: 392,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'drivers',
    drilldownRoute: '/support/fairness',
  },
  {
    key: 'support.fairness.earningsP90',
    subTabId: 'support-fairness',
    category: 'supply',
    value: null,
    absenceReason: null,
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **SAR 15.18** an hour at the 90th percentile.
     * Recorded. Falling while P10 rises: the spread is narrowing, which is what
     * this pair of tiles is read for.
     */
    comparison: {
      kind: 'previous-period',
      value: 1_518,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'drivers',
    drilldownRoute: '/support/fairness',
  },
  {
    key: 'support.fairness.suspensionRatePer100',
    subTabId: 'support-fairness',
    category: 'supply',
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **3.5** suspensions per 100 active captains.
     * Recorded, and a rate.
     */
    comparison: {
      kind: 'previous-period',
      value: 3.5,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'drivers',
    drilldownRoute: '/support/fairness',
  },
  {
    key: 'support.fairness.overturnRate',
    subTabId: 'support-fairness',
    category: 'service',
    value: null,
    absenceReason: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * **Reconstructed — the same population, the same definition and the same
     * baseline as the Support Overview tile of this name.** Two boards may not
     * disagree about one number; Q-103 will eventually keep it on one board, and
     * until then they agree by construction and `metrics.test.ts` asserts it.
     */
    comparison: {
      kind: 'previous-period',
      value: 63,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: true,
    caption: 'caption.overturnIsNotFailure',
    sourceResource: 'fairness',
    drilldownRoute: '/support/fairness',
  },
  {
    key: 'support.fairness.suspendedCaptains',
    subTabId: 'support-fairness',
    category: 'supply',
    /* `renderFairnessPage`'s third tile (`:15694`) — *"each may appeal"*. */
    value: null,
    absenceReason: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * Prior-window reading: **2** captains suspended. Recorded — `suspended` is a
     * flag with no stamp, so no date can be reconstructed from it.
     */
    comparison: {
      kind: 'previous-period',
      value: 2,
      periodStart: SNAPSHOT_PREVIOUS.start,
      periodEnd: SNAPSHOT_PREVIOUS.end,
    },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'drivers',
    drilldownRoute: '/operations/people?view=captains',
  },
]

/* ═══════════════════════════════ charts ════════════════════════════════ */

/**
 * Five of these exist to be the **no-data cases**, because "no data" is not one
 * state and an empty array standing in for all of them produces one screen
 * where four are needed:
 *
 *   `management.growth.newSubscriptions`   **no comparison period yet** —
 *      `comparison: null`. The line draws; the legend has one chip, not two;
 *      the tile's delta is an em-dash.
 *   `management.performance.onTimePickup`  **a gap in the middle** — 21 Jun is
 *      `null`. The line breaks and resumes. It does **not** dip to zero, and a
 *      chart that renders it as zero reports an outage as a collapse.
 *   `management.zones.unservedRequests`    **the whole range is zero.** Every
 *      point is `0`, which is a real and good answer. It draws a flat line on
 *      the axis and must **not** show the no-data sentence.
 *   `support.overview.contactsPerThousandTrips`  **genuinely no data** —
 *      `points: []`. §3.7's centred sentence, card and title retained.
 *   `management.risk.openSignals`          a reading surface's series: current
 *      only, small integers, no comparison.
 *
 * **Three are now backed by real snapshot rows** rather than by hand-written
 * seven-point arrays — Overview's two revenue cards and Performance's
 * cancellation rate. Those carry fifteen points a window, because that is how
 * much history exists.
 */
export const timeSeriesFixtures: TimeSeries[] = [
  {
    /**
     * **Spec §5.2, chart 1.** `dailySnapshots[].quickRideRevenueHalalas` — both
     * windows populated, which is §3.7's complete case: solid current, dotted
     * comparison, same hue.
     *
     * Legacy renders exactly this pair — `renderExecTrendChart` (`:6765`) — and
     * the two cards sum to the gross-revenue tile above them, so a reader can
     * check the board against itself.
     */
    key: 'management.overview.quickRideRevenue',
    windowTotal: 'sum',
    subTabId: 'management-overview',
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    current: snapshotWindow(SNAPSHOT_CURRENT, (s) => s.quickRideRevenueHalalas),
    comparison: snapshotWindow(SNAPSHOT_PREVIOUS, (s) => s.quickRideRevenueHalalas),
    higherIsBetter: true,
    awaitingStore: null,
  },
  {
    /**
     * **Spec §5.2, chart 2, and the half the product exists to sell.** If
     * subscription revenue is flat while quick-ride revenue grows, the
     * subscription product is not landing and Growth's spend is aimed at the
     * wrong thing.
     *
     * It is not flat: SAR 2,056 over the previous fortnight, SAR 4,048 over
     * this one.
     */
    key: 'management.overview.subscriptionRevenue',
    windowTotal: 'sum',
    subTabId: 'management-overview',
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    current: snapshotWindow(SNAPSHOT_CURRENT, (s) => s.subRevenueHalalas),
    comparison: snapshotWindow(SNAPSHOT_PREVIOUS, (s) => s.subRevenueHalalas),
    higherIsBetter: true,
    awaitingStore: null,
  },
  {
    /**
     * **The gap.** 21 Jun is `null` — the telemetry pipeline dropped a day. A
     * break in the line, not a dip to the axis.
     *
     * Kept on the seven-day window rather than moved to the snapshot pair,
     * because it is the only gap fixture in the product and its shape is what
     * it is for. Its window differing from the tiles beside it is **F-7**, the
     * missing board-level period, and that finding is still open.
     */
    key: 'management.performance.onTimePickup',
    windowTotal: 'last',
    subTabId: 'management-performance',
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    current: {
      periodStart: CURRENT_PERIOD.start,
      periodEnd: CURRENT_PERIOD.end,
      points: points(CURRENT_DAYS, [93, 91, null, 88, 90, 92, 91]),
    },
    comparison: {
      periodStart: PREVIOUS_PERIOD.start,
      periodEnd: PREVIOUS_PERIOD.end,
      points: points(PREVIOUS_DAYS, [90, 89, 91, 92, 90, 88, 89]),
    },
    higherIsBetter: true,
    awaitingStore: null,
  },
  {
    /**
     * **The cancellation-rate chart. Spec §6.2, and the shape behind the tile
     * the business owner asked for.**
     *
     * *"The rate is noisy day to day and means nothing except against its own
     * recent spread"* — which is exactly what these thirty real readings show:
     * the previous fortnight wanders 3–9 % around a mean of 5.2 and the current
     * one wanders 5–9 % around 6.7. The rise is in the floor, not in the peaks,
     * and no tile can say that.
     *
     * Every point is `cancelRatePct` off a snapshot row ported verbatim from
     * `:13803`–`:13832`. Nothing here was drawn.
     */
    key: 'management.performance.cancellationRate',
    subTabId: 'management-performance',
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    current: snapshotWindow(SNAPSHOT_CURRENT, (s) => s.cancelRatePct),
    comparison: snapshotWindow(SNAPSHOT_PREVIOUS, (s) => s.cancelRatePct),
    higherIsBetter: false,
    awaitingStore: null,
  },
  {
    /** **No comparison period yet** — the first week of a metric's life. */
    key: 'management.growth.newSubscriptions',
    windowTotal: 'sum',
    subTabId: 'management-growth',
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    current: {
      periodStart: CURRENT_PERIOD.start,
      periodEnd: CURRENT_PERIOD.end,
      points: points(CURRENT_DAYS, [4, 6, 3, 7, 5, 8, 2]),
    },
    comparison: null,
    higherIsBetter: true,
    awaitingStore: null,
  },
  {
    /**
     * **The whole range is zero, and that is the good news.** No request went
     * unserved for want of a captain all week. A flat line on the axis —
     * emphatically *not* the no-data sentence, which would tell an operator we
     * stopped measuring.
     *
     * **`NEW DATA` for the shape.** `failures30d` is a rolling *total* on the
     * zone record (`:13952`), not a series; until a daily failed-match count is
     * captured this ships flat, and never as a curve somebody drew.
     *
     * **Named `unservedRequests`, not `failedRequests`.** AC-39 and AC-718 ban
     * *failed* from board copy, and a screen naturally labels a chart from its
     * key — `src/screens/metrics/copy.ts` did exactly that and tripped the
     * rule. "Unserved" is also the truer word.
     */
    key: 'management.zones.unservedRequests',
    windowTotal: 'sum',
    subTabId: 'management-zones',
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    current: {
      periodStart: CURRENT_PERIOD.start,
      periodEnd: CURRENT_PERIOD.end,
      points: points(CURRENT_DAYS, [0, 0, 0, 0, 0, 0, 0]),
    },
    comparison: {
      periodStart: PREVIOUS_PERIOD.start,
      periodEnd: PREVIOUS_PERIOD.end,
      points: points(PREVIOUS_DAYS, [0, 1, 0, 0, 2, 0, 0]),
    },
    higherIsBetter: false,
    awaitingStore: null,
  },
  {
    /**
     * **Genuinely no data — and R5-11 says *which kind*.** `DB.contacts` is
     * seeded empty (`:14718`), so there is nothing to plot for any day in the
     * range. §3.7: keep the card, the title and the report link; one centred
     * sentence in the plot area.
     *
     * > **The only fixture in this file that is `awaitingStore`, and it is the
     * > same call already made one level down.** The tile
     * > `contactsPerThousandTrips` is **`not-captured`** — the store is declared
     * > and empty — while `uncodedContactShare` is **`not-computable`**, a rate
     * > over a zero denominator. The series inherits the first: the contact log
     * > exists as a declaration and holds nothing, so the sentence owed is
     * > *nothing is captured* and not *this range returned nothing*. Every
     * > other series here queried a real store and got an answer, zeros
     * > included — `management.zones.unservedRequests` is seven true zeros and
     * > carries `null` for exactly that reason.
     */
    key: 'support.overview.contactsPerThousandTrips',
    subTabId: 'support-overview',
    unit: 'ratio',
    currency: null,
    asOf: EYVAR_NOW,
    current: { periodStart: CURRENT_PERIOD.start, periodEnd: CURRENT_PERIOD.end, points: [] },
    comparison: null,
    higherIsBetter: false,
    awaitingStore: 'contact-log',
  },
  {
    /**
     * Risk & Signals reads; it does not queue (M1). Small integers, current
     * only — the shape of a watchlist over time.
     *
     * **Spec §7.2 says this board should carry no chart at all** and the
     * argument is sound: no operator acts on the shape of a signal count, and
     * Q-105 permits a board with none. It stays for a mechanical reason worth
     * recording — `src/components/metrics/metrics.test.tsx` builds its
     * `TimeSeries` fixture on this key and renders it through the real
     * dictionary, so deleting the seed *and* its copy key (which `copy.test.ts`
     * requires be deleted together) takes another role's test down. A finding
     * for frontend-engineer, not something to fix inside their file.
     */
    key: 'management.risk.openSignals',
    windowTotal: 'last',
    subTabId: 'management-risk',
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    current: {
      periodStart: CURRENT_PERIOD.start,
      periodEnd: CURRENT_PERIOD.end,
      points: points(CURRENT_DAYS, [4, 5, 5, 7, 6, 6, 6]),
    },
    comparison: null,
    higherIsBetter: false,
    awaitingStore: null,
  },
  {
    /* Volume context for the six backlog tiles above it: eleven breaches on a
       record day and eleven on a quiet one are different problems. */
    key: 'operations.overview.completedTrips',
    windowTotal: 'sum',
    subTabId: 'operations-overview',
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    current: {
      periodStart: CURRENT_PERIOD.start,
      periodEnd: CURRENT_PERIOD.end,
      points: points(CURRENT_DAYS, [58, 61, 47, 66, 59, 63, 21]),
    },
    comparison: {
      periodStart: PREVIOUS_PERIOD.start,
      periodEnd: PREVIOUS_PERIOD.end,
      points: points(PREVIOUS_DAYS, [54, 57, 50, 60, 55, 58, 44]),
    },
    higherIsBetter: true,
    awaitingStore: null,
  },
  {
    /**
     * **The count is not a metric; its shape is.** The tile was deleted
     * (AC-685) and this card kept, with its purpose restated: an off-hours
     * spike is either a busy night or a script, and only the shape distinguishes
     * them. Read against the rota tile — if nobody was on call at 02:00 and 300
     * events landed, that is an incident.
     */
    key: 'admin.overview.activityEvents',
    windowTotal: 'sum',
    subTabId: 'admin-overview',
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    current: {
      periodStart: CURRENT_PERIOD.start,
      periodEnd: CURRENT_PERIOD.end,
      points: points(CURRENT_DAYS, [184, 201, 152, 199, 176, 188, 147]),
    },
    comparison: {
      periodStart: PREVIOUS_PERIOD.start,
      periodEnd: PREVIOUS_PERIOD.end,
      points: points(PREVIOUS_DAYS, [170, 192, 148, 187, 165, 179, 149]),
    },
    higherIsBetter: true,
    awaitingStore: null,
  },
  {
    /* Captain economics over time — the trend that decides whether supply
       stays. Halalas per engaged hour. */
    key: 'support.fairness.earningsPerEngagedHour',
    subTabId: 'support-fairness',
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    current: {
      periodStart: CURRENT_PERIOD.start,
      periodEnd: CURRENT_PERIOD.end,
      points: points(CURRENT_DAYS, [4_410, 4_260, 4_050, 4_190, 4_120, 4_230, 3_980]),
    },
    comparison: {
      periodStart: PREVIOUS_PERIOD.start,
      periodEnd: PREVIOUS_PERIOD.end,
      points: points(PREVIOUS_DAYS, [4_700, 4_640, 4_520, 4_610, 4_580, 4_660, 4_430]),
    },
    higherIsBetter: true,
    awaitingStore: null,
  },
  /* ═════════ the five §E4 series — a lead figure that charts something ═════
     `BoardHero`'s lead row becomes a `radiogroup` when a board carries two or
     more `rank: 'lead'` metrics whose keys a `TimeSeries` also carries, because
     that join — `charts.find(c => c.key === metric.key)` — is the whole of what
     selecting does. Before these four, `management-performance` and
     `support-fairness` had exactly one such lead each and the other seven boards
     had none, so the mechanism was built, correct and unreachable. Four of these
     five make a board a CHOICE; the fifth gives `management-overview` its single
     charted lead, which is the middle of §E4's three states and was otherwise
     reachable only from a constructed board.

     **The join was not loosened to reach it, and these are not invented to reach
     it either.** Every one is a reconstruction over rows this layer already
     serves, and every one is pinned against the tile it sits under in
     `clients/metrics.test.ts` §14: the window's own last point or sum IS the
     number the tile prints. A series that shares a key with a metric and
     disagrees with it is worse than no series, because the operator has two
     numbers for one measure and no way to tell which is the measure.

     **None declares a `windowTotal`, and that is the rule rather than an
     omission.** `types/metrics.ts`: a chart whose key matches a metric shows
     THAT metric, which is the number the board already owns. The eight
     declarations above are exactly the eight charts owning no tile, and the
     biconditional is asserted over the real fixtures rather than left as a
     count that is right by coincidence.                                       */
  {
    /**
     * **The board's headline figure, given its shape — and the one new series
     * that makes no radiogroup, deliberately.**
     *
     * Management › Overview's other two leads cannot honestly be charted:
     * `contributionMargin` is a seeded literal with Q7 open under it, and
     * `activeSubscriptions` has three definitions that disagree (pinned in
     * `clients/metrics.test.ts` §14). So this board carries **exactly one**
     * charted lead, which is the case the screen handles by hoisting the chart
     * under the band and leaving the row the plain list it always was. That case
     * is worth having in the real fixtures rather than only in a constructed
     * board: it is what six of the nine boards would look like the day they gain
     * a first chartable lead.
     *
     * **Every point is `totalRevenueHalalas` off a snapshot row ported verbatim
     * from `:13803`–`:13832`**, so the fifteen current days sum to the tile and
     * the fifteen previous to its baseline, exactly — the best-reconciled series
     * in this file.
     *
     * **It is the sum of the two cards below it, and that is the point rather
     * than a duplication.** `quickRideRevenue` and `subscriptionRevenue` are its
     * two halves from the same rows, and the note on the first of them says the
     * two *"sum to the gross-revenue tile above them, so a reader can check the
     * board against itself"*. Hoisted full width above them, the total's line
     * sits over its own two components and that check becomes something a reader
     * does by looking rather than by adding.
     */
    key: 'management.overview.grossRevenue',
    subTabId: 'management-overview',
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    current: snapshotWindow(SNAPSHOT_CURRENT, (s) => s.totalRevenueHalalas),
    comparison: snapshotWindow(SNAPSHOT_PREVIOUS, (s) => s.totalRevenueHalalas),
    higherIsBetter: true,
    awaitingStore: null,
  },
  {
    /**
     * **Management › Performance's second joinable lead, and the cleanest of the
     * four.**
     *
     * A FLOW — each day's reading is work that happened that day — counted off
     * `endedAt` on the same trip rows `completedIn()` counts. Both windows
     * reconcile exactly: the fifteen current days sum to the **40** the tile
     * prints and the fifteen previous days to the **35** it compares against, so
     * the line under the figure is the figure, arithmetically.
     *
     * **4 June is a `0` and not a gap.** The trip store covers 12 May to 25
     * June, so that day was queried and nothing finished on it — a real answer,
     * and the same call `management.zones.unservedRequests` makes seven times
     * over. A `null` there would claim we stopped measuring on a day we did not.
     *
     * It shares the snapshot pair with `cancellationRate` beside it, which is
     * what makes the two selectable in one row honest: a radiogroup that
     * redraws between two different windows would move the x-axis under an
     * operator who only asked to change the measure.
     */
    key: 'management.performance.tripsCompleted',
    subTabId: 'management-performance',
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    current: reconstructedWindow(SNAPSHOT_CURRENT, tripsCompletedOn),
    comparison: reconstructedWindow(SNAPSHOT_PREVIOUS, tripsCompletedOn),
    higherIsBetter: true,
    awaitingStore: null,
  },
  {
    /**
     * **Support › Fairness's second joinable lead — the board's reason to
     * exist, over time.**
     *
     * The tile's own definition evaluated at each date: overturned as a share of
     * decided, cumulative. So the last point of a window is not *close to* the
     * tile, it **is** the tile — 63 % on 25 June, and 63 % on 10 June, which is
     * the baseline the tile names. Both ends land, which is the strongest
     * reconciliation available to any series in this file.
     *
     * **The fifteen-day snapshot pair, not the seven-day chart pair its
     * board-mate uses.** On the seven-day pair the comparison window closes at
     * 62 against a recorded 63, and a dotted line ending one point away from the
     * number the tile names as its baseline is a contradiction an operator can
     * see. That leaves this board charting two windows —
     * `earningsPerEngagedHour` is on the seven-day pair — which is **F-7**, the
     * missing board-level period, and not a new finding. Correctness of the
     * number wins over tidiness of the axis until F-7 is closed.
     *
     * It is not a flat line, which is what makes it worth charting rather than
     * printing: the rate falls four points on 19 June, when three appeals are
     * decided and only one is overturned.
     */
    key: 'support.fairness.overturnRate',
    subTabId: 'support-fairness',
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    current: reconstructedWindow(SNAPSHOT_CURRENT, overturnRateThrough),
    comparison: reconstructedWindow(SNAPSHOT_PREVIOUS, overturnRateThrough),
    /* Higher is *better* — "a high overturn rate on this page is not a failure,
       it means the appeal route is doing its job" (`:15690`). Mirrored off the
       tile so the card cannot tint a trend the figure above it calls good. */
    higherIsBetter: true,
    awaitingStore: null,
  },
  {
    /**
     * **Support › Overview, first of a pair — and the one board of the three
     * that ships with NO comparison line.**
     *
     * A STOCK: incidents open at the close of each day, reconstructed from
     * `openedAt` and `closedAt` on the rows the Safety queue serves. The last
     * point is **6**, which is the tile. The shape is the board's news — nothing
     * open for most of the fortnight, then 1, 3, 6 across the last three days.
     *
     * **`comparison: null`, and it is a refusal rather than an absence.** The
     * tile's baseline is **4 open at the close of 10 June**, and the seed says
     * where that came from: it is *recorded*, because *"every incident opened
     * before 10 Jun in `fixtures/safety.ts` was closed the same day, so a
     * reconstruction reads zero"*. Plotting that reconstruction would put a
     * dotted line closing at 0 beside a figure naming 4 — two claims about one
     * fortnight, on one card, with no way for a reader to tell which is the
     * measurement. The tile keeps its recorded baseline and its delta; the chart
     * plots only what can honestly be rebuilt. `clients/metrics.test.ts` §14
     * pins the disagreement, so this cannot be quietly "fixed" later by seeding
     * the zeros.
     *
     * The zeros that ARE here are measured: the store holds rows across this
     * range and none of them was open on those days.
     */
    key: 'support.overview.openIncidents',
    subTabId: 'support-overview',
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    current: reconstructedWindow(SNAPSHOT_CURRENT, (day) => incidentsOpenOn(day).length),
    comparison: null,
    higherIsBetter: false,
    awaitingStore: null,
  },
  {
    /**
     * **Support › Overview, second of the pair — fourteen measured zeros and
     * then two, which is the news and not a defect in the seed.**
     *
     * Safety outranks load on this board, so this is its first figure even when
     * it reads zero — *"a board whose headline is a zero is a board reporting
     * the thing it most wants to be zero"*. The chart is what turns that from a
     * number into a statement: **it was zero for a fortnight and it is two this
     * morning**, which no tile and no delta can say.
     *
     * Same construction and same refusal as `openIncidents` above — the recorded
     * baseline is 1 and a reconstruction of that fortnight reads 0, so there is
     * no comparison window to plot.
     */
    key: 'support.overview.unacknowledgedCriticalIncidents',
    subTabId: 'support-overview',
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    current: reconstructedWindow(SNAPSHOT_CURRENT, unacknowledgedCriticalOn),
    comparison: null,
    higherIsBetter: false,
    awaitingStore: null,
  },
]

/* ════════════════════════════ breakdowns ═══════════════════════════════ */

/**
 * A row whose label is an **entity name** rather than a term from a closed set.
 *
 * **The fig leaf is gone — R5-7 granted it.** This used to pass a name through
 * `breakdown.row.entity`, a pass-through key whose entire English string was
 * `{name}`. It satisfied AC-697 and AC-713 and it was a workaround, and the
 * finding recorded here is the one the ruling granted: a person's name is data,
 * not copy, and it is not in any dictionary.
 *
 * `BreakdownLabel` now says so in the type, and the win is not tidiness — it is
 * **V-4**. `kind: 'text'` takes the run's own direction, so
 * `Abdulaziz Al-Suwailem` in an Arabic console truncates at its tail rather
 * than its head; `kind: 'key'` stays on the page direction, where a translated
 * label belongs. One treatment could never have been right for both.
 *
 * **`breakdown.row.entity` is retired** and `src/screens/metrics/copy.ts` drops
 * the key. It is not kept alive as a fallback, deliberately: a fallback is how
 * the fig leaf grows back.
 *
 * **C-2 — the union needs a carve-out in AC-713 and has not got one.** AC-713
 * requires every rendered string to be a translation key, and the comment this
 * one replaces said in as many words that `breakdown.row.entity` *"satisfies
 * the type and AC-713"*. That criterion, unamended, is exactly what forced the
 * workaround, so shipping `kind: 'text'` against it puts the fixture in
 * technical breach of a criterion the ruling intends to allow. **The union is
 * built as ruled and the criterion is flagged**, because the alternative —
 * keeping a pass-through key so the letter of AC-713 is met — is the thing
 * R5-7 exists to stop. AC-697's replacement text in R5 §12 covers the row
 * label; AC-713 needs the matching clause and it is product-owner's.
 */
const entityRow = (
  id: string,
  name: string,
  rest: Omit<MetricBreakdownRow, 'id' | 'label'>,
): MetricBreakdownRow => ({ id, label: { kind: 'text', text: name }, ...rest })

/**
 * `value / max(value over rows shown)`, to three decimals — **R5-6's
 * share-of-max, written once so no row can be hand-edited out of step.**
 *
 * Share-of-**max**, never share-of-total: a ranked list asks *how far behind
 * the leader?*, and share-of-total answers a composition question that a
 * `Top 5 of 14` cut-off has already broken. Before R5-6 three breakdowns used
 * three different denominators — largest row, total, and a literal 42 — all
 * legal under *"one denominator"*, which only ever constrained them within a
 * list. The top bar is now always full, on every board.
 *
 * Returns `null` on every row when `max === min` or there are no rows, because
 * a bar is illegal then (R5-6): seven identical bars are 140px of row height
 * carrying nothing. `clients/metrics.ts` calls the same function on the two
 * breakdowns whose rows it computes, so there is exactly one implementation of
 * the denominator in the product.
 */
export const withShareOfMax = (rows: MetricBreakdownRow[]): MetricBreakdownRow[] => {
  const values = rows.map((r) => r.value)
  const legal = rows.length > 0 && Math.max(...values) > Math.min(...values)
  const max = legal ? Math.max(...values) : 0
  return rows.map((row) => ({
    ...row,
    barFraction: legal ? Math.round((row.value / max) * 1000) / 1000 : null,
  }))
}

/** `bar` is legal only if `withShareOfMax` would draw one. Same predicate, one definition. */
export const barIsLegal = (rows: readonly MetricBreakdownRow[]): boolean =>
  rows.length > 0 && Math.max(...rows.map((r) => r.value)) > Math.min(...rows.map((r) => r.value))

/**
 * Ranked lists, by sub-tab. **Six of the eight boards declare one**, which is
 * the number spec F-1 predicted.
 *
 * Two declare none, on the spec's own instruction: **Overview** is six tiles
 * and two charts and that is the whole board (§5.3), and **Growth**'s two
 * ranked lists — campaigns by ROI (`:13506`) and incentive rules by total paid
 * (`:13663`) — carry row actions and are the sub-tab's `P1` table (§8.3). A
 * read-only top five above a table of the same rows is the duplication this
 * spec exists to prevent.
 *
 * **`management-zones` is the interesting one.** §9.3 specifies three
 * breakdowns and R4-6 §6.4 overrules the first two: Market & Zones is an index
 * table with a metric strip, the strip's tiles are *filters into the table*,
 * and *"a ranked top-5 above a full table of the same rows is the same data
 * twice"*. So the zone-dimension lists do not ship. **Cities do** — a different
 * dimension, four rows, not the zone table's rows, and the reason for the
 * prohibition does not reach them.
 *
 * The consequence is worth stating plainly rather than discovering: **"zones by
 * failure rate" — named in R4-4 §4.1's own worked example and in the brief as
 * one of the two most valuable lists in the product — now has no surface at
 * all**, because the `P1` zone-health table R4-6 assigns it to is not built and
 * zones are not yet a resource in `src/data`. That is a finding, not a fixture
 * decision.
 */
/**
 * **What each board is ABOUT** — the three numbers that get the headline
 * weight, per board (`Metric.rank`, §H4).
 *
 * This table is the whole ranking feature. Everything else — a size step, a
 * grid that runs three across instead of four — is the rendering of a decision
 * that is taken here, in one place, where it can be read end to end and argued
 * with. Eighty-nine `rank: 'supporting'` literals scattered through the seeds
 * above would encode the same thing and could not be reviewed.
 *
 * **Read down the right-hand column and you are reading the product's
 * priorities.** That is the test this shape is chosen for: a Finance lead, a
 * dispatcher and an on-call engineer should each be able to look at their own
 * row and say whether those are the three numbers they open the console for.
 *
 * ## The choices, and why each board's three
 *
 * `operations-overview` — a dispatch board answers *are we keeping our
 *   promises, what is already broken, and what has nobody picked up*. SLA
 *   attainment is the promise; breached work items is the failure; unclaimed
 *   work is the one an operator can act on in the next minute. Captains
 *   available is supply CONTEXT and reads as such — it is the denominator of
 *   the other three, not a fourth headline.
 *
 * `management-overview` — the exec board is money and scale: what came in,
 *   what was left after the cost of serving it, and how big the recurring base
 *   is. ARPA and revenue mix explain those three; they do not replace them.
 *
 * `management-performance` — service quality, as volume / failure / quality.
 *   Trips completed is the work the period actually did, cancellation rate is
 *   the way it most visibly failed, and captain rating is what riders said
 *   about the trips that did happen. (An on-time-pickup lead would have been
 *   the obvious fourth — this board does not carry that metric; Management ›
 *   Overview does, and leads with money instead.)
 *
 * `management-risk` — exposure in MONEY first, then the two populations it is
 *   exposed through: subscriptions predicted to churn, and captains at risk of
 *   leaving. Money first is deliberate — a board that leads with a COUNT
 *   invites triage by count, and the items behind it are not worth the same.
 *
 * `management-growth` — the funnel in the order it happens: riders acquired,
 *   the share that actually started within 7 days, and whether the acquisition
 *   paid for itself. Promo and referral spend are the INPUTS to those three and
 *   sit below them; a growth board that leads with what it spent is reporting
 *   its effort rather than its result.
 *
 * `management-zones` — coverage: demand nobody served over 30 days, zones that
 *   starved, and how many cities are live to serve them at all.
 *
 * `support-overview` — safety outranks load, so an unacknowledged critical
 *   incident leads even when the count is zero: a board whose headline is a
 *   zero is a board reporting the thing it most wants to be zero.
 *
 * `support-fairness` — the overturn rate is the board's reason to exist: it is
 *   how often the console decided wrongly against a captain. Suspensions is the
 *   population it decided over; earnings per engaged hour is the consequence.
 *
 * `admin-overview` — console integrity. Operators without two-factor is the
 *   only owned TARGET in the product (`USR-1`, target `0`); overdue erasures
 *   are statutory; rota gaps are why the first two go unattended.
 *
 * **A key here that no longer exists is a defect, not a no-op**, and
 * `board.test.ts` fails on it rather than silently rendering a board with two
 * leads — which would degrade quietly and look like a design choice.
 */
export const BOARD_LEADS: Record<string, readonly string[]> = {
  'operations-overview': [
    'operations.overview.slaAttainmentPercent',
    'operations.overview.breachedWorkItems',
    'operations.overview.unclaimedWork',
  ],
  'management-overview': [
    'management.overview.grossRevenue',
    'management.overview.contributionMargin',
    'management.overview.activeSubscriptions',
  ],
  'management-performance': [
    'management.performance.tripsCompleted',
    'management.performance.cancellationRate',
    'management.performance.avgCaptainRating',
  ],
  'management-risk': [
    'management.risk.revenueAtRisk',
    'management.risk.churnPredictedSubscriptions',
    'management.risk.atRiskCaptains',
  ],
  'management-growth': [
    'management.growth.newRiders',
    'management.growth.activationRate7d',
    'management.growth.ltvCacRatio',
  ],
  'management-zones': [
    'management.zones.unservedRequests30d',
    'management.zones.starvedZones',
    'management.zones.liveCities',
  ],
  'support-overview': [
    'support.overview.unacknowledgedCriticalIncidents',
    'support.overview.openIncidents',
    'support.overview.medianTimeToFirstResponse',
  ],
  'support-fairness': [
    'support.fairness.overturnRate',
    'support.fairness.suspendedCaptains',
    'support.fairness.earningsPerEngagedHour',
  ],
  'admin-overview': [
    'admin.overview.operatorsWithoutTwoFactor',
    'admin.overview.erasureOverdue',
    'admin.overview.rotaGaps',
  ],
}

export const boardBreakdowns: Record<string, MetricBreakdown[]> = {
  /**
   * **Spec §6.3 breakdown 1.** Captains ranked by the share of their finished
   * trips that ran late, worst first, over the whole trips fixture.
   *
   * **`bar: false`, and this is the rule doing work rather than being quoted.**
   * R4-4 permits a bar *"only when every row of the breakdown shares one unit
   * and one denominator"*. These are five percentages over five different trip
   * counts — 4 of 20, 3 of 18, 3 of 19, 3 of 20, 2 of 19 — so a bar would draw
   * a shared scale that does not exist.
   *
   * **The count behind the rate is now a noun phrase in the sub-label** —
   * `4 of 20 trips ran late` — not a second numeric column (R5-5). It is the
   * reference's own construction: `Online store conversion rate` in
   * `analytics-dashboard-today-no-data.webp` writes `0 sessions` under
   * `Added to cart 0.00%`. Every number carries its own noun, so there is no
   * left-to-right convention to learn and none to get wrong in Arabic.
   *
   * **§6.3's second breakdown, renewal rate by plan tier, does not ship** — see
   * `management.performance.avgRenewalRate` above. Three rated subscriptions
   * across three tiers is not a ranking.
   */
  'management-performance': [
    {
      key: 'performance.captainsByLateShare',
      dimension: 'captain',
      rowsShown: 5,
      rowsTotal: 6,
      bar: false,
      /* R5-9 §18.1 / §20.2 — no caveat. The only key in the vocabulary is
         `breakdown.caveat.uncodedRanking`; its gate is
         `support.uncodedContactShare`, whose value is `not-computable`, so
         there is no threshold to have crossed. R5-11 — every one of these
         cards has its store; the two absences that lack one are tiles. */
      caveat: null,
      awaitingStore: null,
      rows: [
        entityRow('DRV-0103', 'Khalid Mansour', {
          subLabelKey: 'breakdown.sub.lateOfTrips',
          subLabelParams: { late: 4, total: 20 },
          value: 20,
          unit: 'percent',
          currency: null,
          barFraction: null,
          drilldownRoute: '/operations/people?view=captains',
        }),
        entityRow('DRV-0105', 'Youssef Nouri', {
          subLabelKey: 'breakdown.sub.lateOfTrips',
          subLabelParams: { late: 3, total: 18 },
          value: 17,
          unit: 'percent',
          currency: null,
          barFraction: null,
          drilldownRoute: '/operations/people?view=captains',
        }),
        entityRow('DRV-0104', 'Hassan Al-Ghamdi', {
          /* The gold captain driving on a lapsed national ID. Two
             different problems on one row is what a board is for, and R5-5's
             middot join is what lets one sub-label carry both:
             `Document expired · 3 of 19 trips ran late`. */
          subLabelKey: 'breakdown.sub.lateOfTripsExpired',
          subLabelParams: { late: 3, total: 19 },
          value: 16,
          unit: 'percent',
          currency: null,
          barFraction: null,
          drilldownRoute: '/operations/people?view=compliance',
        }),
        entityRow('DRV-0102', 'Omar Farouk', {
          subLabelKey: 'breakdown.sub.lateOfTrips',
          subLabelParams: { late: 3, total: 20 },
          value: 15,
          unit: 'percent',
          currency: null,
          barFraction: null,
          drilldownRoute: '/operations/people?view=captains',
        }),
        entityRow('DRV-0101', 'Ahmed Salem', {
          subLabelKey: 'breakdown.sub.lateOfTrips',
          subLabelParams: { late: 2, total: 19 },
          value: 11,
          unit: 'percent',
          currency: null,
          barFraction: null,
          drilldownRoute: '/operations/people?view=captains',
        }),
      ],
    },
  ],

  'management-risk': [
    {
      /**
       * **Spec §7.3 breakdown 2**, and the one legacy renders with a *"Send
       * retention offer"* button on every row (`:6980`–`:7002`). **The button
       * does not come across** — a board is a read surface (AC-694), and legacy
       * fires an email and a toast straight from the overview with no
       * confirmation and no undo. The action lives on the rider's profile.
       *
       * Riders whose churn risk is not `low`, by lifetime value descending.
       * **`bar: true`** — one unit, one currency, one measurement, and
       * `max > min` (884.00 SAR against 122.50), which is R5-6's third
       * condition. The bar is a share of the **largest row**, so the top one is
       * full and every other reads as *how far behind the leader*.
       *
       * **`barFraction` is not seeded here.** `withShareOfMax` computes it from
       * the `value` beside it, so a hand-edited value moves its own bar and a
       * bar cannot drift from the number it is drawn for. The literals it
       * replaces were 1 / 0.24 / 0.2 / 0.15 / 0.14, rounded by hand; the
       * computed set is 1 / 0.242 / 0.196 / 0.149 / 0.139.
       *
       * **The trip count moved into the sub-label** — `High churn risk · 63
       * trips` (R5-5). Each figure agrees with `fixtures/riders.ts`
       * `totalTrips`.
       *
       * `RDR-4002` is deliberately below the cut: zero lifetime value, zero
       * trips, a 46-character Arabic name and a high churn risk. A high-risk
       * rider worth nothing is not a retention target, and a list that ranked
       * by risk rather than by value would put her first.
       */
      key: 'risk.highValueRidersAtRisk',
      dimension: 'rider',
      rowsShown: 5,
      rowsTotal: 7,
      bar: true,
      /* R5-9 §18.1 / §20.2 — no caveat. The only key in the vocabulary is
         `breakdown.caveat.uncodedRanking`; its gate is
         `support.uncodedContactShare`, whose value is `not-computable`, so
         there is no threshold to have crossed. R5-11 — every one of these
         cards has its store; the two absences that lack one are tiles. */
      caveat: null,
      awaitingStore: null,
      rows: withShareOfMax([
        entityRow('RDR-4001', 'Abdulaziz Al-Suwailem', {
          subLabelKey: 'breakdown.sub.churnHighTrips',
          subLabelParams: { trips: 63 },
          value: 88_400,
          unit: 'money',
          currency: 'SAR',
          barFraction: null,
          drilldownRoute: '/operations/people?view=riders',
        }),
        entityRow('RDR-2087', 'Layla Al-Faraj', {
          subLabelKey: 'breakdown.sub.churnHighTrips',
          subLabelParams: { trips: 11 },
          value: 21_400,
          unit: 'money',
          currency: 'SAR',
          barFraction: null,
          drilldownRoute: '/operations/people?view=riders',
        }),
        entityRow('RDR-1075', 'Sara Al-Ghamdi', {
          subLabelKey: 'breakdown.sub.churnHighTrips',
          subLabelParams: { trips: 13 },
          value: 17_300,
          unit: 'money',
          currency: 'SAR',
          barFraction: null,
          drilldownRoute: '/operations/people?view=riders',
        }),
        entityRow('RDR-2055', 'Bandar Al-Harbi', {
          subLabelKey: 'breakdown.sub.churnHighTrips',
          subLabelParams: { trips: 7 },
          value: 13_200,
          unit: 'money',
          currency: 'SAR',
          barFraction: null,
          drilldownRoute: '/operations/people?view=riders',
        }),
        entityRow('RDR-1052', 'Omar Al-Shehri', {
          subLabelKey: 'breakdown.sub.churnMediumTrips',
          subLabelParams: { trips: 8 },
          value: 12_250,
          unit: 'money',
          currency: 'SAR',
          barFraction: null,
          drilldownRoute: '/operations/people?view=riders',
        }),
      ]),
    },
    {
      /**
       * **Spec §7.3 breakdown 1 asks for subscriptions ranked by
       * `subHealthScore` ascending, and this layer cannot compute that score.**
       * Its six signals (`:14219`–`:14234`) are not fields here.
       *
       * What *is* a real field on every subscription is
       * `renewalLikelihoodPercent`, which answers the same question — which
       * contracts are about to end — from data the Subscriptions table already
       * serves. Ranked ascending, five worst, all non-null and none cancelled.
       *
       * `bar: false`: each row is its own probability, and five probabilities
       * do not share a denominator.
       *
       * **Recorded as a substitution, not a translation.** If `subHealthScore`
       * is ever built, this breakdown changes measure and its heading with it.
       */
      key: 'risk.subscriptionsByRenewalLikelihood',
      dimension: 'subscription',
      rowsShown: 5,
      rowsTotal: 54,
      bar: false,
      /* R5-9 §18.1 / §20.2 — no caveat. The only key in the vocabulary is
         `breakdown.caveat.uncodedRanking`; its gate is
         `support.uncodedContactShare`, whose value is `not-computable`, so
         there is no threshold to have crossed. R5-11 — every one of these
         cards has its store; the two absences that lack one are tiles. */
      caveat: null,
      awaitingStore: null,
      rows: [
        entityRow('SUB-2001', 'Abdulaziz Al-Suwailem', {
          subLabelKey: 'breakdown.sub.planMonthly',
          subLabelParams: null,
          value: 11,
          unit: 'percent',
          currency: null,
          barFraction: null,
          drilldownRoute: '/operations/subscriptions?view=at-risk',
        }),
        entityRow('SUB-1075', 'Sara Al-Ghamdi', {
          subLabelKey: 'breakdown.sub.planWeekly',
          subLabelParams: null,
          value: 25,
          unit: 'percent',
          currency: null,
          barFraction: null,
          drilldownRoute: '/operations/subscriptions?view=at-risk',
        }),
        entityRow('SUB-3129', 'Nora Al-Harbi', {
          subLabelKey: 'breakdown.sub.planBiweekly',
          subLabelParams: null,
          value: 31,
          unit: 'percent',
          currency: null,
          barFraction: null,
          drilldownRoute: '/operations/subscriptions?view=at-risk',
        }),
        entityRow('SUB-3157', 'Nora Al-Harbi', {
          subLabelKey: 'breakdown.sub.planMonthly',
          subLabelParams: null,
          value: 32,
          unit: 'percent',
          currency: null,
          barFraction: null,
          drilldownRoute: '/operations/subscriptions?view=at-risk',
        }),
        entityRow('SUB-3120', 'Reem Al-Dosari', {
          subLabelKey: 'breakdown.sub.planBiweekly',
          subLabelParams: null,
          value: 33,
          unit: 'percent',
          currency: null,
          barFraction: null,
          drilldownRoute: '/operations/subscriptions?view=at-risk',
        }),
      ],
    },
  ],

  /**
   * **Spec §9.3 breakdown 3, and the only one of the three R4-6 leaves
   * standing.** Columns from `:6937`–`:6947`: live, zones, captains, riders,
   * average failure rate.
   *
   * The row **value is the zone count**, not the failure rate, precisely
   * because of defect **L-6**: legacy computes a per-city failure rate for
   * Riyadh only, by string equality on the city name, so the other three would
   * be em-dashes forever — and `MetricBreakdownRow.value` is `number`, not
   * `number | null`. Ranking on a field three of four rows cannot fill is not a
   * ranking.
   *
   * **The finding this fixture raised is closed by R5-5, and the ruling says
   * this list is what closed it.** The rate used to ride in `secondaryValue`
   * because that field was nullable and `value` is not. The secondary column is
   * withdrawn, and the rate is now a **noun phrase in the sub-label** —
   * `Live · 45% of requests unserved`. Three cities do not state a rate at all
   * and `Not launched` says why, which is a thing a column could only have
   * spelled as an em dash. *"A city with no reading and a city with a reading
   * of zero are different facts"*, and only one of the two forms can render the
   * difference.
   *
   * **`unserved`, not `fail`** — AC-718 keeps `failed` out of tile labels,
   * chart titles and breakdown headings and names the zones chart `Unserved
   * requests`. The sub-label uses the same noun so one board does not call one
   * thing two names.
   *
   * **`bar: false` is now a choice rather than a consequence, and it is left
   * alone.** Under R5-6 the three conditions are met — one unit (`count`), one
   * denominator, and `6 > 0` — so a bar would be *legal* here for the first
   * time. Turning it on is a new decision this ruling does not ask for, and
   * three empty tracks under one full one says less than the four numbers do.
   * Raised, not taken.
   */
  'management-zones': [
    {
      key: 'zones.citiesHealth',
      dimension: 'city',
      rowsShown: 4,
      rowsTotal: 4,
      bar: false,
      /* R5-9 §18.1 / §20.2 — no caveat. The only key in the vocabulary is
         `breakdown.caveat.uncodedRanking`; its gate is
         `support.uncodedContactShare`, whose value is `not-computable`, so
         there is no threshold to have crossed. R5-11 — every one of these
         cards has its store; the two absences that lack one are tiles. */
      caveat: null,
      awaitingStore: null,
      rows: [
        entityRow('CITY-RUH', 'Riyadh', {
          subLabelKey: 'breakdown.sub.cityLiveUnserved',
          /* The failure rate, which used to be the second numeric column.
             `{rate}` is a percent and the component formats it — see
             `MetricBreakdownRow.subLabelParams`. */
          subLabelParams: { rate: 45 },
          value: 6,
          unit: 'count',
          currency: null,
          barFraction: null,
          drilldownRoute: null,
        }),
        entityRow('CITY-JED', 'Jeddah', {
          /* **R5-5's strongest argument, and it arrived from this fixture.** As
             a column, a city with no reading is an em dash — the same mark V-2
             is about. As a phrase, a city with no reading simply does not state
             one, and `Not launched` says why. A city with no reading and a city
             with a reading of zero are different facts, and only the phrase
             form can render the difference. */
          subLabelKey: 'breakdown.sub.cityNotLive',
          subLabelParams: null,
          value: 0,
          unit: 'count',
          currency: null,
          barFraction: null,
          drilldownRoute: null,
        }),
        entityRow('CITY-DMM', 'Dammam', {
          subLabelKey: 'breakdown.sub.cityNotLive',
          subLabelParams: null,
          value: 0,
          unit: 'count',
          currency: null,
          barFraction: null,
          drilldownRoute: null,
        }),
        entityRow('CITY-MAK', 'Makkah', {
          subLabelKey: 'breakdown.sub.cityNotLive',
          subLabelParams: null,
          value: 0,
          unit: 'count',
          currency: null,
          barFraction: null,
          drilldownRoute: null,
        }),
      ],
    },
  ],

  /**
   * **Spec §10.3, and it is a routing table rather than a list of records.** It
   * tells an operator *which screen to open*, which is what an overview owes a
   * shift and what re-listing rows does not (Q-106).
   *
   * **The rows are computed, not seeded** — `clients/metrics.ts` builds them
   * from `workBacklogByQueue()`, the same builder `listWorkItems` uses, so
   * **AC-695 holds by construction**: the breached column sums to the breached
   * tile and the unclaimed column sums to the unclaimed tile. The entry below
   * is the declaration; the rows arrive at request time.
   *
   * **The bar is decided by the client, not declared here**, because the rows
   * are. Two of R5-6's three conditions are properties of the list and hold by
   * construction — five counts of work items, one unit, one denominator — and
   * the third, `max > min`, is a property of rows that do not exist until the
   * request. `bar: false` below is the honest value of the declaration as it
   * stands: **zero rows shown cannot satisfy `max > min`.** `clients/metrics.ts`
   * recomputes both `bar` and every `barFraction` with `withShareOfMax`, which
   * is the same function the seeded lists use.
   *
   * **The denominator changed with R5-6**: it was the sum of the open column,
   * and it is now the largest queue. The busiest queue's bar is full and the
   * rest read as *how far behind*, which is the question a routing table is
   * asked.
   */
  'operations-overview': [
    {
      key: 'operations.backlogByQueue',
      dimension: 'queue',
      /* Overwritten by `backlogByQueueRows` with the live count: this list is
         every queue and has no cut-off (AC-695). Seven since T1.6. */
      rowsShown: 7,
      rowsTotal: 7,
      bar: false,
      /* R5-9 §18.1 / §20.2 — no caveat. The only key in the vocabulary is
         `breakdown.caveat.uncodedRanking`; its gate is
         `support.uncodedContactShare`, whose value is `not-computable`, so
         there is no threshold to have crossed. R5-11 — every one of these
         cards has its store; the two absences that lack one are tiles. */
      caveat: null,
      awaitingStore: null,
      rows: [],
    },
  ],

  /**
   * **Spec §11.3 — *"the most valuable list in the product"* — and it ships
   * with zero rows.**
   *
   * `:15044` says why it matters: *"Read this top-down, not left-to-right: the
   * top row is the contact you should be trying to eliminate, and the owner
   * column says whose backlog that fix belongs in."* The `Root-cause owner`
   * column routes a support symptom to the team that caused it, and nothing
   * else in the product does that.
   *
   * **The dimension is real and the volume is not.** `DB.reasonCodes`
   * (`:14690`+) is a full registry — 26 codes, each with a category, an SLA
   * tier, an English and an Arabic label and a root-cause owner. `DB.contacts`
   * is `[]` (`:14718`) and every contact is written at runtime, so
   * `cptStats().rows` is empty and legacy itself renders *"No coded contacts
   * yet."*
   *
   * So this is **AC-692's fixture**: a breakdown with zero rows, which renders
   * one grey sentence and never the first-run illustration, because the section
   * is empty and the page is not. Seeding plausible volumes here would put a
   * ranking of made-up product problems in front of the person who has to act
   * on it, which is the one thing Q-101 forbids.
   *
   * **This is the highest-value data capture left in the product.** A contact
   * log — one row per contact, with a reason code — turns three `null` tiles,
   * one empty chart and this list into the board Support actually needs.
   */
  'support-overview': [
    {
      key: 'support.contactReasons',
      dimension: 'reason-code',
      rowsShown: 5,
      rowsTotal: 0,
      /* **`false`, and it is not a prediction about the day rows arrive.**
         R5-6 makes `max > min` across *the rows shown* a condition of the bar,
         and zero rows cannot meet it. Whoever seeds the contact log re-decides
         this against the rows they seed. */
      bar: false,
      /**
       * **No caveat — R5-9 §20.2 — on the one card R5-9 was written for.**
       *
       * AC-674's caveat is gated by `support.uncodedContactShare`, and that
       * tile's value is **`not-computable`**: an uncoded *share* is a rate over
       * a count of contacts, and there are none. §18.6 makes this arithmetic
       * rather than judgement — `gate.value === null` → no answer → no
       * threshold to have crossed → `caveat: null`. Seeding a share to
       * demonstrate the slot would be **AC-453**'s invented SLA window in a new
       * place.
       */
      caveat: null,
      /**
       * **R5-11, and this is the card the field exists for.**
       *
       * `support.contactReasons` has zero rows **and** no store, so both
       * readings are true at once and only provenance can say which sentence it
       * gets. *We ranked and this window had nothing* would be a lie: **no
       * ranking happened.** `DB.reasonCodes` is a full 26-code registry
       * (`:14690`+) and `DB.contacts` is `[]` (`:14718`) — the dimension is
       * real and the volume was never captured. Legacy says as much in its own
       * words at `:15044`: *"No coded contacts yet."*
       *
       * It is also the list the spec calls the most valuable capture left in
       * the product, so it is the one people will look at, and the one where
       * getting the sentence wrong costs most.
       *
       * The rows stay `[]` rather than being back-filled: seeding plausible
       * volumes would put a ranking of made-up product problems in front of the
       * person who has to act on it, which is exactly what Q-101 forbids.
       */
      awaitingStore: 'contact-log',
      rows: [],
    },
  ],

  /**
   * **Spec §12.3 breakdown 1, with its dimension changed, and the change is a
   * finding.**
   *
   * §12.3 asks for *"rota gaps, high-risk first, dimension day × block × tier,
   * 5 rows"*, and says the row *"states day, block label, tier, and whether it
   * is night or weekend"* — **four categorical facts and no number**.
   * `MetricBreakdownRow.value` is `number` and a breakdown ranks, so a
   * slot-level list is not representable: every row's value would be the same
   * `0` and the ranking would be alphabetical.
   *
   * By **day** it works, ranks, and agrees with the tile: seven rows, six gaps
   * each — 3 blocks × 2 tiers — summing to the 42 the tile reports (**AC-695**),
   * with the high-risk count in the sub-label. `WEEKEND` is `['fri','sat']`
   * (`:19596`) and the night block is high-risk on every day (`:19655`), so
   * Friday and Saturday are 6 of 6 and the rest are 2 of 6 — **22 high-risk
   * gaps**, which is `rotaStats().highRisk`.
   *
   * **`bar: false` — V-13, closed by rule and not by taste.** Seven rows all
   * valued 6 means `max === min`, and R5-6 makes `max > min` a condition of the
   * bar. Its old denominator was 42 — all the rota's slots — which was neither
   * the largest row nor the total of the rows shown, and was a third meaning of
   * *"share"* on a third board. It also stops paying 20px a row for seven
   * identical bands.
   *
   * **The finding the seven equal numbers encode survives, and it is the whole
   * point of the list**: *nobody is on call at any hour of any day*. Seven
   * sixes say that. Seven identical bars only said it twice.
   *
   * **§12.3's second breakdown — accounts failing the integrity scan — does not
   * ship**, for the same reason its tile is `null`: `integrityScan()`
   * (`:18565`) reads a payments ledger this layer does not hold.
   */
  'admin-overview': [
    {
      key: 'admin.rotaGapsByDay',
      dimension: 'rota-day',
      rowsShown: 7,
      rowsTotal: 7,
      bar: false,
      /* R5-9 §18.1 / §20.2 — no caveat. The only key in the vocabulary is
         `breakdown.caveat.uncodedRanking`; its gate is
         `support.uncodedContactShare`, whose value is `not-computable`, so
         there is no threshold to have crossed. R5-11 — every one of these
         cards has its store; the two absences that lack one are tiles. */
      caveat: null,
      awaitingStore: null,
      rows: [
        rotaDay('fri', 6, 6),
        rotaDay('sat', 6, 6),
        rotaDay('sun', 6, 2),
        rotaDay('mon', 6, 2),
        rotaDay('tue', 6, 2),
        rotaDay('wed', 6, 2),
        rotaDay('thu', 6, 2),
      ],
    },
  ],
}

/**
 * One day of the on-call rota. `DAY_KEYS` (`:19594`) is a closed set, so unlike
 * a captain or a city this row's label really is a translation **key** — this
 * is the `kind: 'key'` half of `BreakdownLabel`, and the one that must lay out
 * RTL in an Arabic console.
 */
function rotaDay(day: string, gaps: number, highRisk: number): MetricBreakdownRow {
  return {
    id: `ROTA-${day}`,
    label: { kind: 'key', key: `breakdown.rotaDay.${day}`, params: null },
    /* The high-risk count is a noun phrase now, not a second column — R5-5.
       `Weekend · all 6 are high-risk` on Friday and Saturday, where every gap
       is high-risk; `Night block · 2 are high-risk` on the other five, where
       only the night block is. */
    subLabelKey: highRisk === gaps ? 'breakdown.sub.rotaWeekend' : 'breakdown.sub.rotaNightBlock',
    subLabelParams: { count: highRisk },
    value: gaps,
    unit: 'count',
    currency: null,
    /* `null`: seven rows all valued 6, so `max === min`, so `bar` is false and
       a row may not draw one (R5-6, V-13). */
    barFraction: null,
    drilldownRoute: '/admin/team',
  }
}

/* ═════════════════════════════ board notices ═══════════════════════════ */

/**
 * Conditions a board **declares**. The page renders at most one (R4-4 §4.3).
 *
 * Both of these are `critical` and both pass the ruling's own test — *a notice
 * may only exist for a condition the board already shows a number for*:
 * Support's is `unacknowledgedCriticalIncidents` (2) and Admin's is
 * `erasureOverdue` (1). Both also pass R4-10b's two clauses, which is why their
 * sub-tabs carry the nav's `attention` tone.
 *
 * **Three conditions do not become notices, deliberately:**
 *
 *   - **On-call rota gaps**, all 42 of them, because they are *recoverable* —
 *     somebody can be assigned at any moment — and a notice is for a condition
 *     where the delay itself does the damage (R4-4 §4.3, agreeing with R4-10b
 *     one level up).
 *   - **Legal documents with unaccepted versions**, because the grace period
 *     that would make it overdue is a field nobody has defined (R4-11 §12).
 *   - **The trial balance not balancing** — `03-financials.md` AC-351, the third
 *     of the ruling's three known notices — because `financials-overview` has
 *     no board at all (**F-9b**). The *shape* is modelled for it; the board is
 *     not mine to invent.
 *
 * ## The two-notice board — `operations-overview` (**R4-4 §4.3's tie-break, on real data**)
 *
 * Until this pass no board declared two, so every multi-notice case in
 * `src/screens/metrics/board.test.ts` was marked `SYNTHETIC` and the selection
 * rule had never run against a real condition. **Operations › Overview declares
 * two, and both were already true of this dataset before a notice existed for
 * them.**
 *
 * | # | Condition | Tile it corroborates | Tone | Severity |
 * |---|---|---|---|---:|
 * | 1 | 2 applications past their 48-hour window | `operations.overview.applicationsPastWindow` | `warning` | 70 |
 * | 2 | 2 captains dispatchable on a lapsed document | `operations.overview.complianceExpired` | `critical` | 95 |
 *
 * **Why this pairing is operationally real and not contrived.** They are the
 * two halves of the *same seven* on the People sub-tab — `navCounts.ts` spells
 * it out: *"five applications awaiting a decision plus two lapsed compliance
 * documents"*, and both halves are named there with dates. `APP-2204` went past
 * its window 20 hours ago; `DRV-0104` is a gold captain with 524 trips on an
 * national ID that expired on 2026-06-20. An Ops Manager opening the
 * console on Thursday morning has both on their plate at once, and the count of
 * each is on the board above.
 *
 * That is also **why the badge underneath them is one neutral `7`** and why the
 * fixture there calls it *"the D-L8 failure in miniature — the chip cannot tell
 * an operator which of the seven is the emergency."* The notices are what the
 * chip cannot say.
 *
 * **Why the tones differ, and it is the same clause that tones the badge.**
 * R4-10b's second clause: *"the deadline that makes it irreversible is not one
 * we set."*
 *
 *   - The **document expiry** is set by the issuing authority. Nothing in Admin
 *     › Operational Policy moves it, the captain is off dispatch until it is
 *     renewed, and every hour they are not is a legal exposure. **`critical`.**
 *   - The **48-hour application window** is *ours*, `slaSource` on every
 *     applicant row is `'unset'`, and **Q8 has not been answered**. The delay
 *     still does real damage — an applicant who waits four days signs with
 *     somebody else, and deciding later does not get them back — so it is a
 *     notice. But a criticality resting on a number nobody has ratified would
 *     move when the number does. **`warning`.**
 *
 * The demotion is the honest form of the same reasoning that made
 * `operations-people`'s badge neutral. Neither notice was written to make a
 * test pass; the tones fell out of a rule that already existed.
 *
 * **What this fixture proves, and what it still does not.** They are declared
 * in **board tile order** — `applicationsPastWindow` is tile 1 and
 * `complianceExpired` is tile 7 — so the `warning` is declared **first**. An
 * implementation that took declaration order, or that stopped at the first
 * notice, renders the wrong banner and the test fails. **The tone clause now
 * bites on real data.**
 *
 * The **severity** clause still does not, and is not manufactured here:
 * severity is a tie-break *within* a tone (see `BoardNotice.severity`) and no
 * board has two conditions of one tone. `board.test.ts`'s severity cases stay
 * `SYNTHETIC` and should stay labelled as such.
 *
 * **Three copy keys are owed by `src/screens/metrics/copy.ts`, which is not
 * this layer's file** — handed to frontend-engineer:
 *
 * ```
 * notice.operations.applicationsPastWindow.one   An application is past its 48-hour window.
 * notice.operations.applicationsPastWindow.many  {count} applications are past their 48-hour window.
 * notice.operations.complianceExpired.one        A captain has a lapsed document and cannot be dispatched.
 * notice.operations.complianceExpired.many       {count} captains have lapsed documents and cannot be dispatched.
 * notice.action.openApplications                 Open applications
 * notice.action.openCompliance                   Open compliance
 * ```
 *
 * Full sentences take a period (R6); the two actions are verb-first fragments
 * and do not (R6, §5.7). Two keys per count, never a pluralisation built by
 * concatenation (AC-713).
 *
 * **Three conditions on this same board were considered and refused**, because
 * a notice list is only worth reading if things were kept out of it:
 *
 *   - **`legsUncovered` (4).** `navCounts.ts` already ruled on it: *"the harm is
 *     still avoidable right up to departure, which is the whole point of the
 *     screen."* Recoverable, therefore a tile.
 *   - **`breachedWorkItems`.** A mixed count across five queues with five
 *     different SLA provenances. A banner over it could not say what is on fire,
 *     which is the D-L8 failure the notice exists to avoid.
 *   - **`unclaimedWork`.** A rota signal, not a deadline.
 */
export const boardNotices: Record<string, BoardNotice[]> = {
  /**
   * **Declared in board tile order, warning first.** That ordering is not a
   * flourish — it is what makes the tone clause of R4-4 §4.3's selection rule
   * fail loudly if it is dropped. Do not reorder these to "put the critical
   * first"; the screen chooses, the board declares.
   */
  'operations-overview': [
    {
      key: 'notice.operations.applicationsPastWindow',
      /* `APP-2204` (due 2026-06-24 13:05) and `APP-2205` (due 2026-06-23
         16:30). Equal to `operations.overview.applicationsPastWindow`, which is
         derived in `clients/metrics.ts` from the same applicant rows. */
      params: { count: 2 },
      /* `warning`, not `critical`: the 48-hour window is ours and **Q8** has not
         ratified it (`slaSource: 'unset'` on every applicant row). R4-10b
         clause 2. */
      tone: 'warning',
      action: {
        labelKey: 'notice.action.openApplications',
        route: '/operations/people?view=applications',
      },
      severity: 70,
    },
    {
      key: 'notice.operations.complianceExpired',
      /* `complianceScan()` `worst === 0` (`:13322`) — off dispatch. One is
         `DRV-0104`, 524 trips, national ID expired 2026-06-20. */
      params: { count: 2 },
      /* Statutory, and the deadline is the issuing authority's. R4-10b clauses
         1 and 2 both pass on their own terms. */
      tone: 'critical',
      action: {
        labelKey: 'notice.action.openCompliance',
        route: '/operations/people?view=compliance',
      },
      severity: 95,
    },
  ],
  'support-overview': [
    {
      key: 'notice.support.unacknowledgedSos',
      /* `count` chooses between the `.one` and `.many` keys. Two keys, never a
         pluralisation built by concatenation — AC-713. */
      params: { count: 2 },
      tone: 'critical',
      action: { labelKey: 'notice.action.openSafety', route: '/support/safety?view=critical-sos' },
      severity: 100,
    },
  ],
  'admin-overview': [
    {
      key: 'notice.admin.erasureOverdue',
      params: { count: 1 },
      tone: 'critical',
      action: { labelKey: 'notice.action.openData', route: '/admin/data' },
      severity: 90,
    },
  ],
}
