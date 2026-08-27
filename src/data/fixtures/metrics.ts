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
import { EYVAR_NOW } from '../mock/clock'
import { SNAPSHOT_CURRENT, SNAPSHOT_PREVIOUS, snapshotsBetween } from './dailySnapshots'

/** What a fixture carries. `deltaPercent` and `direction` are the client's. */
export type MetricSeed = Omit<Metric, 'deltaPercent' | 'direction'>

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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /**
     * **51** active captains had joined on or before 10 Jun; two more joined on
     * the 20th and the 24th. An approximation in one respect and it is worth
     * naming: `status` is *current*, so a captain suspended yesterday is not
     * counted as active a fortnight ago either. The driver fixture holds no
     * status history and inventing one would be worse than the approximation.
     */
    comparison: {
      kind: 'previous-period',
      value: 51,
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
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-25',
    comparison: { kind: 'target', value: 95, setByUserId: null, effectiveFrom: '2026-01-01' },
    higherIsBetter: true,
    caption: null,
    sourceResource: 'trips',
    drilldownRoute: '/operations/trips',
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
     * **`null`, and that is not zero.** Legacy gets this one right —
     * `renewRateAvg != null ? renewRateAvg+'%' : '—'` (`:6913`).
     *
     * Checked again this pass rather than assumed: of the **47 active
     * subscriptions, three** belong to a rider carrying a
     * `renewalRatePercent`, because the volume rows are riders the riders
     * fixture does not hold. A mean over three records is the type's own worked
     * example of `insufficient-data`, and `biweekly` would contribute zero
     * records to it. So the tile stays an em-dash **and §6.3's second
     * breakdown, renewal rate by plan tier, does not ship either** — it is
     * blocked on exactly the same gap, and a ranked list of means over n=2,
     * n=0 and n=1 is noise wearing a ranking.
     *
     * **L-4 / Q-107 stand:** even with volume, legacy averages a per-*rider*
     * stat string parsed with `parseInt`, not a renewal outcome measured over
     * a period. Those are different numbers and only one is a metric.
     */
    value: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-25',
    comparison: { kind: 'none', reason: 'insufficient-data' },
    higherIsBetter: true,
    caption: 'caption.storedRiderStat',
    sourceResource: null,
    drilldownRoute: '/operations/subscriptions',
  },
  {
    key: 'management.performance.avgCaptainRating',
    subTabId: 'management-performance',
    category: 'service',
    value: null,
    unit: 'rating',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
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
    drilldownRoute: '/operations/trips',
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
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'drivers',
    drilldownRoute: '/operations/people?view=compliance',
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-05-25',
    periodEnd: '2026-06-25',
    comparison: { kind: 'none', reason: 'no-history' },
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    caption: null,
    sourceResource: null,
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
    unit: 'ratio',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-01-01',
    periodEnd: '2026-06-25',
    comparison: { kind: 'none', reason: 'no-history' },
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-01-01',
    periodEnd: '2026-06-25',
    comparison: { kind: 'none', reason: 'no-history' },
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    /** **12** riders had joined on or before 10 Jun; one joined 22 Jun is the thirteenth. */
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
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
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
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    periodStart: '2026-01-01',
    periodEnd: '2026-06-25',
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    caption: null,
    sourceResource: null,
    drilldownRoute: null,
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
    value: 3,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    caption: 'caption.healthyRatio',
    sourceResource: null,
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
    value: 2,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    caption: 'caption.demandThreeTimesSupply',
    sourceResource: null,
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
    value: 31,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-05-26',
    periodEnd: '2026-06-25',
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    caption: null,
    sourceResource: null,
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
    value: 45,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-05-26',
    periodEnd: '2026-06-25',
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    caption: null,
    sourceResource: null,
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
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
    value: 7,
    unit: 'ratio',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    caption: null,
    sourceResource: null,
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'requests',
    drilldownRoute: '/operations/requests?view=pending',
  },
  {
    /**
     * Captains whose worst document has already lapsed — off dispatch —
     * `complianceScan()` (`:13296`), `worst === 0` (`:13322`). **Two**, and one
     * of them is `DRV-0104`, a gold captain with 524 trips on an inspection
     * certificate that expired on 2026-06-20.
     */
    key: 'operations.overview.complianceExpired',
    subTabId: 'operations-overview',
    category: 'risk',
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: true,
    caption: 'caption.notOnATrip',
    sourceResource: 'drivers',
    drilldownRoute: '/operations/people?view=captains',
  },

  /* ── Customer Support › Overview ─────────────────────────────────────────
     "Are we answering people inside the time we promised, and what are they
     calling about?"

     **Four of these eight are `null` and every one of them is honest.** The
     ticket store and the contact log do not exist in this layer — `DB.contacts`
     is seeded `[]` at `:14718` and there is no `fixtures/tickets.ts` — so under
     Q-101 they ship as em-dashes with a stated reason rather than as plausible
     literals. That is the single largest data gap in the product and it is
     named in the handoff, not smoothed over here.                            */
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    caption: null,
    sourceResource: 'safety',
    drilldownRoute: '/support/safety?view=critical-sos',
  },
  {
    /** `NEW DATA` — there is no ticket store in this layer. `:15017`. */
    key: 'support.overview.ticketsBreaching',
    subTabId: 'support-overview',
    category: 'service',
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    caption: null,
    sourceResource: null,
    /* The breached filter on Tickets does not exist either — F-8. */
    drilldownRoute: '/support/tickets?view=open',
  },
  {
    /**
     * Resolved tickets with no recorded SLA breach, as a share of resolved
     * (`:15020`). **The only tile on this board that measures an outcome rather
     * than a backlog, and the one a support lead is judged on.** `NEW DATA`:
     * same missing ticket store.
     */
    key: 'support.overview.promiseKept',
    subTabId: 'support-overview',
    category: 'service',
    value: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: true,
    caption: null,
    sourceResource: null,
    drilldownRoute: '/support/tickets?view=resolved',
  },
  {
    key: 'support.overview.openIncidents',
    subTabId: 'support-overview',
    category: 'risk',
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
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
     */
    value: null,
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
     */
    key: 'support.overview.uncodedContactShare',
    subTabId: 'support-overview',
    category: 'service',
    value: null,
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
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
    comparison: { kind: 'none', reason: 'insufficient-data' },
    higherIsBetter: true,
    caption: 'caption.overturnIsNotFailure',
    sourceResource: 'fairness',
    drilldownRoute: '/support/fairness',
  },

  /* ── Admin › Overview ────────────────────────────────────────────────────
     "Is the console itself safe, staffed, and inside its statutory
     obligations?" No legacy page contributes wholesale — the route-table row's
     `legacyPageIds` is empty and says so.

     **`admin.overview.activityEvents` is deleted — AC-685, AC-722.** A count of
     log rows measures how busy the log was, and there is no value of it that
     changes what anybody does. The **chart** stays (§12.2) with its purpose
     restated: it is an anomaly detector, not a volume report.                */
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
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
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
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
    /**
     * Accounts whose stored lifetime totals reconcile to nothing inside the
     * data window — `integrityScan().orphans` (`:18565`). `NEW DATA`: the scan
     * reads a payments ledger this layer does not hold.
     *
     * `:18585` is worth keeping in front of whoever builds it: such an account
     * *"cannot be investigated, refunded accurately, or defended in a dispute —
     * and it is also the signature of a duplicate profile."*
     */
    key: 'admin.overview.integrityOrphans',
    subTabId: 'admin-overview',
    category: 'risk',
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    caption: null,
    sourceResource: null,
    drilldownRoute: '/admin/data',
  },
  {
    /**
     * Audit entries with action `impersonation_started` (`:21073`) less those
     * with a matching `impersonation_ended` (`:21084`). **`NEW DATA` for the
     * pairing** — legacy logs both events and never joins them, so one operator
     * acting as another with no recorded end is the audit trail's blind spot.
     *
     * Ranked above the census because it is the closest computable proxy for
     * the tile spec §12.1 actually wants — *destructive actions in the period*
     * — which needs a severity classification `ACTION_LABELS` (`:2898`, 26
     * entries) does not carry.
     */
    key: 'admin.overview.impersonationSessions',
    subTabId: 'admin-overview',
    category: 'risk',
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: CURRENT_PERIOD.start,
    periodEnd: CURRENT_PERIOD.end,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    caption: null,
    sourceResource: null,
    drilldownRoute: '/admin/activity',
  },
  {
    /**
     * `DB.legalDocuments` entries whose current version a counted set of users
     * has not accepted (`:13867`, `hasAcceptedCurrent` `:3799`). **`NEW DATA`
     * for the grace period** — no such field exists, and R4-11 §12 item 3 is
     * explicit that this stays a **tile and not a notice** until product-owner
     * decides whether a grace period exists. No copy was written against a
     * threshold nobody has set.
     */
    key: 'admin.overview.legalDocsUnaccepted',
    subTabId: 'admin-overview',
    category: 'risk',
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    caption: null,
    sourceResource: null,
    drilldownRoute: '/admin/workspace',
  },
  {
    /* A census, ranked last for that reason — spec §12.1: *"it is the tile I
       would cut first."* Four of five operators are Active. */
    key: 'admin.overview.activeOperators',
    subTabId: 'admin-overview',
    category: 'supply',
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: true,
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
    key: 'support.fairness.suspendedCaptains',
    subTabId: 'support-fairness',
    category: 'supply',
    /* `renderFairnessPage`'s third tile (`:15694`) — *"each may appeal"*. */
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
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
    subTabId: 'management-overview',
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    current: snapshotWindow(SNAPSHOT_CURRENT, (s) => s.quickRideRevenueHalalas),
    comparison: snapshotWindow(SNAPSHOT_PREVIOUS, (s) => s.quickRideRevenueHalalas),
    higherIsBetter: true,
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
    subTabId: 'management-overview',
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    current: snapshotWindow(SNAPSHOT_CURRENT, (s) => s.subRevenueHalalas),
    comparison: snapshotWindow(SNAPSHOT_PREVIOUS, (s) => s.subRevenueHalalas),
    higherIsBetter: true,
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
  },
  {
    /** **No comparison period yet** — the first week of a metric's life. */
    key: 'management.growth.newSubscriptions',
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
  },
  {
    /**
     * **Genuinely no data.** `DB.contacts` is seeded empty (`:14718`), so there
     * is nothing to plot for any day in the range. §3.7: keep the card, the
     * title and the report link; one centred sentence in the plot area.
     */
    key: 'support.overview.contactsPerThousandTrips',
    subTabId: 'support-overview',
    unit: 'ratio',
    currency: null,
    asOf: EYVAR_NOW,
    current: { periodStart: CURRENT_PERIOD.start, periodEnd: CURRENT_PERIOD.end, points: [] },
    comparison: null,
    higherIsBetter: false,
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
  },
  {
    /* Volume context for the six backlog tiles above it: eleven breaches on a
       record day and eleven on a quiet one are different problems. */
    key: 'operations.overview.completedTrips',
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
  },
]

/* ════════════════════════════ breakdowns ═══════════════════════════════ */

/**
 * A row whose label is an **entity name** rather than a term from a closed set.
 *
 * **This is a workaround and it should not survive contact with a real API.**
 * R4-4 makes `labelKey` *"a key, never a string — AC-697"*, which is exactly
 * right for queues, reason codes, plan tiers, blocks and hours of the day, and
 * impossible for a captain called Khalid Mansour or a city called Jeddah. A
 * person's name is data, not copy, and it is not in any dictionary.
 *
 * So an entity row passes its name through a single pass-through key whose
 * whole English string is `{name}`. It satisfies AC-713 (no concatenation) and
 * it satisfies the type, and it is a fig leaf over a contract gap.
 *
 * **Finding, for product-designer:** `MetricBreakdownRow.label` wants to be a
 * union — `{ key, params }` for a closed set, `{ text }` for an entity — so
 * that a translated row and a named row are different things in the type
 * rather than different conventions in a comment.
 */
const ENTITY_LABEL = 'breakdown.row.entity'

const entityRow = (
  id: string,
  name: string,
  rest: Omit<MetricBreakdownRow, 'id' | 'labelKey' | 'labelParams'>,
): MetricBreakdownRow => ({ id, labelKey: ENTITY_LABEL, labelParams: { name }, ...rest })

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
export const boardBreakdowns: Record<string, MetricBreakdown[]> = {
  /**
   * **Spec §6.3 breakdown 1.** Captains ranked by the share of their finished
   * trips that ran late, worst first, over the whole trips fixture.
   *
   * **`bar: false`, and this is the rule doing work rather than being quoted.**
   * R4-4 permits a bar *"only when every row of the breakdown shares one unit
   * and one denominator"*. These are five percentages over five different trip
   * counts — 4 of 20, 3 of 18, 3 of 19, 3 of 20, 2 of 19 — so a bar would draw
   * a shared scale that does not exist. The `secondaryValue` carries the count
   * behind the rate instead, which is the honest way to show the same thing.
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
      rows: [
        entityRow('DRV-0103', 'Khalid Mansour', {
          subLabelKey: null,
          value: 20,
          unit: 'percent',
          currency: null,
          secondaryValue: 4,
          secondaryUnit: 'count',
          barFraction: null,
          drilldownRoute: '/operations/people?view=captains',
        }),
        entityRow('DRV-0105', 'Youssef Nouri', {
          subLabelKey: null,
          value: 17,
          unit: 'percent',
          currency: null,
          secondaryValue: 3,
          secondaryUnit: 'count',
          barFraction: null,
          drilldownRoute: '/operations/people?view=captains',
        }),
        entityRow('DRV-0104', 'Hassan Al-Ghamdi', {
          /* The gold captain driving on a lapsed inspection certificate. Two
             different problems on one row is what a board is for. */
          subLabelKey: 'breakdown.sub.documentExpired',
          value: 16,
          unit: 'percent',
          currency: null,
          secondaryValue: 3,
          secondaryUnit: 'count',
          barFraction: null,
          drilldownRoute: '/operations/people?view=compliance',
        }),
        entityRow('DRV-0102', 'Omar Farouk', {
          subLabelKey: null,
          value: 15,
          unit: 'percent',
          currency: null,
          secondaryValue: 3,
          secondaryUnit: 'count',
          barFraction: null,
          drilldownRoute: '/operations/people?view=captains',
        }),
        entityRow('DRV-0101', 'Ahmed Salem', {
          subLabelKey: null,
          value: 11,
          unit: 'percent',
          currency: null,
          secondaryValue: 2,
          secondaryUnit: 'count',
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
       * **`bar: true`** — one unit, one currency, one measurement, so the bar is
       * a share of the largest row and reads as a ranking rather than a
       * proportion of a total that does not exist.
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
      rows: [
        entityRow('RDR-4001', 'Abdulaziz Al-Suwailem', {
          subLabelKey: 'breakdown.sub.churnHigh',
          value: 88_400,
          unit: 'money',
          currency: 'SAR',
          secondaryValue: 63,
          secondaryUnit: 'count',
          barFraction: 1,
          drilldownRoute: '/operations/people?view=riders',
        }),
        entityRow('RDR-2087', 'Layla Al-Faraj', {
          subLabelKey: 'breakdown.sub.churnHigh',
          value: 21_400,
          unit: 'money',
          currency: 'SAR',
          secondaryValue: 11,
          secondaryUnit: 'count',
          barFraction: 0.24,
          drilldownRoute: '/operations/people?view=riders',
        }),
        entityRow('RDR-1075', 'Sara Al-Ghamdi', {
          subLabelKey: 'breakdown.sub.churnHigh',
          value: 17_300,
          unit: 'money',
          currency: 'SAR',
          secondaryValue: 13,
          secondaryUnit: 'count',
          barFraction: 0.2,
          drilldownRoute: '/operations/people?view=riders',
        }),
        entityRow('RDR-2055', 'Bandar Al-Harbi', {
          subLabelKey: 'breakdown.sub.churnHigh',
          value: 13_200,
          unit: 'money',
          currency: 'SAR',
          secondaryValue: 7,
          secondaryUnit: 'count',
          barFraction: 0.15,
          drilldownRoute: '/operations/people?view=riders',
        }),
        entityRow('RDR-1052', 'Omar Al-Shehri', {
          subLabelKey: 'breakdown.sub.churnMedium',
          value: 12_250,
          unit: 'money',
          currency: 'SAR',
          secondaryValue: 8,
          secondaryUnit: 'count',
          barFraction: 0.14,
          drilldownRoute: '/operations/people?view=riders',
        }),
      ],
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
      rows: [
        entityRow('SUB-2001', 'Abdulaziz Al-Suwailem', {
          subLabelKey: 'breakdown.sub.planMonthly',
          value: 11,
          unit: 'percent',
          currency: null,
          secondaryValue: null,
          secondaryUnit: null,
          barFraction: null,
          drilldownRoute: '/operations/subscriptions?view=at-risk',
        }),
        entityRow('SUB-1075', 'Sara Al-Ghamdi', {
          subLabelKey: 'breakdown.sub.planWeekly',
          value: 25,
          unit: 'percent',
          currency: null,
          secondaryValue: null,
          secondaryUnit: null,
          barFraction: null,
          drilldownRoute: '/operations/subscriptions?view=at-risk',
        }),
        entityRow('SUB-3129', 'Nora Al-Harbi', {
          subLabelKey: 'breakdown.sub.planBiweekly',
          value: 31,
          unit: 'percent',
          currency: null,
          secondaryValue: null,
          secondaryUnit: null,
          barFraction: null,
          drilldownRoute: '/operations/subscriptions?view=at-risk',
        }),
        entityRow('SUB-3157', 'Nora Al-Harbi', {
          subLabelKey: 'breakdown.sub.planMonthly',
          value: 32,
          unit: 'percent',
          currency: null,
          secondaryValue: null,
          secondaryUnit: null,
          barFraction: null,
          drilldownRoute: '/operations/subscriptions?view=at-risk',
        }),
        entityRow('SUB-3120', 'Reem Al-Dosari', {
          subLabelKey: 'breakdown.sub.planBiweekly',
          value: 33,
          unit: 'percent',
          currency: null,
          secondaryValue: null,
          secondaryUnit: null,
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
   * ranking. So the rate rides in `secondaryValue`, which **is** nullable, and
   * the three unlaunched cities carry a genuine `null` there.
   *
   * **Finding for product-designer:** a breakdown whose primary measure is
   * absent for some rows has no shape. Either `value` becomes nullable or the
   * rule is that it may not be — but it should be a decision.
   */
  'management-zones': [
    {
      key: 'zones.citiesHealth',
      dimension: 'city',
      rowsShown: 4,
      rowsTotal: 4,
      bar: false,
      rows: [
        entityRow('CITY-RUH', 'Riyadh', {
          subLabelKey: 'breakdown.sub.cityLive',
          value: 6,
          unit: 'count',
          currency: null,
          secondaryValue: 45,
          secondaryUnit: 'percent',
          barFraction: null,
          drilldownRoute: null,
        }),
        entityRow('CITY-JED', 'Jeddah', {
          subLabelKey: 'breakdown.sub.cityNotLive',
          value: 0,
          unit: 'count',
          currency: null,
          secondaryValue: null,
          secondaryUnit: null,
          barFraction: null,
          drilldownRoute: null,
        }),
        entityRow('CITY-DMM', 'Dammam', {
          subLabelKey: 'breakdown.sub.cityNotLive',
          value: 0,
          unit: 'count',
          currency: null,
          secondaryValue: null,
          secondaryUnit: null,
          barFraction: null,
          drilldownRoute: null,
        }),
        entityRow('CITY-MAK', 'Makkah', {
          subLabelKey: 'breakdown.sub.cityNotLive',
          value: 0,
          unit: 'count',
          currency: null,
          secondaryValue: null,
          secondaryUnit: null,
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
   * **`bar: true`** — five counts of work items, one unit, one denominator (the
   * whole backlog). This is the case the bar rule exists to permit.
   */
  'operations-overview': [
    {
      key: 'operations.backlogByQueue',
      dimension: 'queue',
      rowsShown: 5,
      rowsTotal: 5,
      bar: true,
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
      bar: true,
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
   * with the high-risk count as the secondary. `WEEKEND` is `['fri','sat']`
   * (`:19596`) and the night block is high-risk on every day (`:19655`), so
   * Friday and Saturday are 6 of 6 and the rest are 2 of 6 — **22 high-risk
   * gaps**, which is `rotaStats().highRisk`.
   *
   * **`bar: true`**: one unit, one denominator, 42.
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
      bar: true,
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
 * a captain or a city this row's label really is a translation key.
 */
function rotaDay(day: string, gaps: number, highRisk: number): MetricBreakdownRow {
  return {
    id: `ROTA-${day}`,
    labelKey: `breakdown.rotaDay.${day}`,
    labelParams: null,
    subLabelKey: highRisk === gaps ? 'breakdown.sub.weekend' : 'breakdown.sub.nightBlock',
    value: gaps,
    unit: 'count',
    currency: null,
    secondaryValue: highRisk,
    secondaryUnit: 'count',
    /* Six of forty-two. Every day is the same height, which is itself the
       finding: nobody is on call at any hour of any day. */
    barFraction: gaps / 42,
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
 * **A gap for qa-engineer, stated rather than manufactured:** no board declares
 * **two** notices, so the selection rule — highest tone, then `severity`, then
 * declaration order — has no fixture that exercises it. Inventing a second
 * condition to make a test possible would put a banner on screen that no tile
 * corroborates, which is the exact thing the ruling forbids.
 */
export const boardNotices: Record<string, BoardNotice[]> = {
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
