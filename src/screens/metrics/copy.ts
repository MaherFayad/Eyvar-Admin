/**
 * Every operator-facing string the eight metric boards can render, as keys
 * (**AC-74**), with no concatenation anywhere (**AC-75**).
 *
 * **Why the strings live here.** `src/i18n/dictionaries.ts` has a single owner
 * and thirty-three more screens are coming; a screen owns its copy, exports it
 * as a `Dictionary`, and the dictionary module merges it in one line — the
 * pattern `src/screens/operations/people/copy.ts` set. `dictionaries.ts`
 * carries exactly one import and one spread for this file, which is the whole
 * change to a file this role does not own.
 *
 * **One dictionary for all eight boards, not eight.** They are one family and
 * `overview.noData` in particular MUST be byte-identical everywhere — §3.7:
 * *"No-data copy MUST be identical everywhere, punctuation included"*, and it
 * names the products index strip dropping the trailing period as the
 * inconsistency to avoid. One key, one string, one place.
 *
 * ## `metric.*` and `chart.*` mirror the data layer's keys exactly
 *
 * `Metric.key` is *"stable, dotted, namespaced by sub-tab"* and carries no
 * label — deliberately, because a label is copy and copy is translated. So the
 * tile renders `t('metric.' + metric.key)` and this file is the other end of
 * that. **The two lists below must stay in step with `fixtures/metrics.ts`:**
 * `createTranslator` throws on a missing key in dev (AC-74), so a new metric
 * seed with no entry here fails loudly on the board rather than rendering a raw
 * key to an operator. That is the intended failure mode, and the wave-4 handoff
 * asks mock-data-engineer to add the key here in the same commit as the seed.
 *
 * Rules applied (`docs/ref/copy.md`)
 *   1   sentence case everywhere; only proper nouns capitalised mid-string.
 *   6   "you" / "your": the operator is addressed directly.
 *   8   no period on a badge, chip or tile label; a full SENTENCE takes one
 *       (R6). `overview.noData` and `overview.allZero` are sentences and take
 *       one; `overview.noCompare.*` are fragments in a chip line and do not.
 *  10   end-of-list and no-data are stated in words, never left blank.
 */

import type { Dictionary } from '@/lib'

export const OVERVIEW_EN: Dictionary = {
  /* ── freshness ───────────────────────────────────────────────────────
     `types/metrics.ts` makes `asOf` required on every metric and every series
     precisely so this line can exist: *"an overview that cannot say when it was
     computed is one an operator cannot trust, and the first question on any
     escalation is 'is this number from before or after the incident?'"*.
     `time` is already formatted by the caller — `formatDate` owns the calendar
     and the numbering system (§18). */
  'overview.asOf': 'Computed {time}',
  /* Labels the busy region while the tiles are skeletons (§11.3). There is no
     shell-wide loading key yet; when one lands this defers to it. */
  'overview.loading': 'Loading {resource}',

  /* ── the states of a window, kept apart ──────────────────────────────
     `SeriesWindow`'s doc comment draws the distinctions; these are them in
     words. No two of them could be mistaken for each other by an operator
     reading quickly, which is the whole requirement. */

  /* §3.7, verbatim, trailing period included. The range returned nothing. */
  'overview.noData': 'There was no data found for this date range.',
  /* Every reading is a real, measured zero. Zero is a number, and on a safety
     or no-show chart it is the good answer — saying "no data" here would hide
     a good result behind an error-shaped sentence. */
  'overview.allZero': 'Every value in this range is zero.',
  /* A gap: the day is in the range and has no reading. Counted, not implied by
     a broken line. `SeriesPoint`: *"conflating them is how an outage looks like
     a collapse in demand."* */
  'overview.gaps': 'No reading on {gaps} of {total} days.',

  /* ── why there is no comparison ──────────────────────────────────────
     `NoComparisonReason`'s three arms. They read very differently to an
     operator: one resolves itself next month, one is a setting nobody has
     filled in, and one will not resolve until the volume is there. Fragments,
     no period (R6). */
  'overview.noCompare.no-history': 'No comparison period yet',
  'overview.noCompare.no-target': 'No target set',
  'overview.noCompare.insufficient-data': 'Too little data to compare',

  /* ── what a delta is measured against ──────────────────────────────── */
  'overview.compare.period': 'vs {from} – {to}',
  'overview.compare.target': 'vs {target} target',

  /* ── the direction, in words ─────────────────────────────────────────
     Never rendered visually — the caret and the sign carry it there (§7.5).
     This is what a screen reader hears, and it is where `higherIsBetter` is
     spent: D7 §4.9 forbids toning the chip, so "better" and "worse" cannot be
     a colour and become a word instead. */
  'overview.delta.flat': 'unchanged',
  'overview.delta.upBetter': 'up, which is better',
  'overview.delta.upWorse': 'up, which is worse',
  'overview.delta.downBetter': 'down, which is better',
  'overview.delta.downWorse': 'down, which is worse',

  /* ── chart chrome ────────────────────────────────────────────────────
     §3.7: the legend names BOTH periods explicitly with dates. */
  'overview.legend.range': '{from} – {to}',
  'overview.legend.current': 'This period',
  'overview.legend.comparison': 'Previous period',
  /* The plot's text alternative. A chart is an image and needs one (§7.5). */
  'overview.chart.description': '{title}, {from} to {to}',
  /* §3.7's report icon at top right. An imperative naming the destination. */
  'overview.report.open': 'Open the {report} report',

  /* ── the whole-board empty state (R8, AC-38) ─────────────────────────
     The heading names what the section is FOR, never the absence of data. */
  'overview.empty.heading': 'Nothing to report yet',
  'overview.empty.body':
    'This board reports on captains, riders, trips and subscriptions. Numbers appear here as soon as there is activity to count.',
  'overview.empty.action': 'Go to Trips',

  /* ══════════════════ metric labels — one per `Metric.key` ═════════════
     A tile label is a fragment and takes no period (R6). It names WHAT the
     number is, never how it was derived, and never repeats the workspace it
     already sits in.

     **AC-718: no label anywhere here uses `failed`, `invalid` or `error`.**
     Zones' unserved requests is the one that keeps trying to. */

  /* Management › Overview — "Is the business growing, and is it keeping the
     two promises it sells?" */
  'metric.management.overview.contributionMargin': 'Contribution margin',
  'metric.management.overview.grossRevenue': 'Gross revenue',
  'metric.management.overview.activeSubscriptions': 'Active subscriptions',
  'metric.management.overview.activeCaptains': 'Active captains',
  'metric.management.overview.netSubscriptionMovement': 'Net subscription movement',
  'metric.management.overview.sameCaptainKept': 'Plans keeping the same captain',
  'metric.management.overview.onTimePickup': 'On-time pickups',

  /* Management › Performance — "Is the service getting worse for the people
     who already pay us?" */
  'metric.management.performance.cancellationRate': 'Quick-ride cancellation rate',
  'metric.management.performance.avgRenewalRate': 'Average renewal rate',
  'metric.management.performance.avgCaptainRating': 'Average captain rating',
  'metric.management.performance.tripsCompleted': 'Trips completed',

  /* Management › Risk & Signals — "What is about to fail that nobody has been
     told about yet?" `openSignals` was deleted as a tile (AC-720): it summed
     the three counts around it and restated the nav badge. The `chart.` key
     below is a different string for a different thing and stays. */
  'metric.management.risk.revenueAtRisk': 'Revenue at risk',
  'metric.management.risk.churnPredictedSubscriptions': 'Subscriptions predicted to churn',
  'metric.management.risk.atRiskCaptains': 'Captains at risk of unavailability',
  'metric.management.risk.identityCollisions': 'Rider and captain accounts sharing a number',
  'metric.management.risk.repeatIncidentCaptains': 'Captains with repeat incidents',
  'metric.management.risk.paymentRiskRenewals': 'Renewal payments flagged',

  /* Management › Growth — "Is the money we spend to acquire and keep riders
     producing subscriptions?" */
  'metric.management.growth.promoROI': 'Blended promotion ROI',
  'metric.management.growth.promoBudgetConsumed': 'Promotion budget consumed',
  'metric.management.growth.subscriptionsFromPromos': 'Subscriptions from promotions',
  'metric.management.growth.newRiders': 'New riders',
  'metric.management.growth.registeredRiders': 'Registered riders',
  'metric.management.growth.dormantRiderShare': 'Dormant riders',
  'metric.management.growth.referralAndIncentiveSpend': 'Referral and incentive spend',

  /* Management › Market & Zones — "Where is demand going unserved, and where
     does the next captain need to be?" `Zones tracked` was deleted (AC-650):
     six is a constant of the seed, which makes it a setting, not a metric.

     **R4-12** — `worstDemandSupplyRatio` renders `7.0×` and this label is where
     the operands live. A value that reads `2.4× demand/supply` cannot be
     right-aligned against another number and cannot be translated. */
  'metric.management.zones.captainsNeeded': 'Captains needed for a healthy ratio',
  'metric.management.zones.starvedZones': 'Supply-starved zones',
  'metric.management.zones.unservedRequests30d': 'Unserved requests',
  'metric.management.zones.avgFailureRate': 'Average request failure rate',
  'metric.management.zones.steerOffersLive': 'Steering offers live',
  'metric.management.zones.worstDemandSupplyRatio': 'Worst demand-to-supply ratio',
  'metric.management.zones.liveCities': 'Cities live',

  /* Operations › Overview — "What must this shift deal with before it ends?"
     **AC-721 and AC-723 are both label rules and both land here**: the
     applications tile names applications, never people, and the SLA tile names
     its predicate — past their SLA, not "work items". */
  'metric.operations.overview.applicationsPastWindow': 'Applications past their window',
  'metric.operations.overview.pendingApplications': 'Applications waiting',
  'metric.operations.overview.breachedWorkItems': 'Work items past their SLA',
  'metric.operations.overview.unclaimedWork': 'Unclaimed work',
  'metric.operations.overview.legsUncovered': 'Legs without a backup captain',
  'metric.operations.overview.openRequests': 'Open requests',
  'metric.operations.overview.complianceExpired': 'Captains with an expired document',
  'metric.operations.overview.captainsAvailable': 'Captains available now',

  /* Customer Support › Overview — "Are we answering people inside the time we
     promised, and what are they calling about?" */
  'metric.support.overview.unacknowledgedCriticalIncidents': 'Unacknowledged critical incidents',
  'metric.support.overview.ticketsBreaching': 'Tickets breaching now',
  'metric.support.overview.promiseKept': 'Promise kept',
  'metric.support.overview.openIncidents': 'Open safety incidents',
  'metric.support.overview.contactsPerThousandTrips': 'Contacts per 1,000 trips',
  'metric.support.overview.uncodedContactShare': 'Uncoded contacts',
  'metric.support.overview.openFairnessCases': 'Open fairness cases',
  'metric.support.overview.overturnRate': 'Appeals overturned',

  /* Admin › Overview — "Is the console itself safe, staffed, and inside its
     statutory obligations?" `Activity events` was deleted as a tile (AC-685):
     a count of log rows measures how busy the log was. */
  'metric.admin.overview.erasureOverdue': 'Erasure requests past their deadline',
  'metric.admin.overview.rotaGaps': 'On-call slots with nobody assigned',
  'metric.admin.overview.operatorsWithoutTwoFactor': 'Operators without two-factor',
  'metric.admin.overview.integrityOrphans': 'Accounts with no records behind their totals',
  'metric.admin.overview.impersonationSessions': 'Impersonation sessions',
  'metric.admin.overview.legalDocsUnaccepted': 'Legal documents not accepted',
  'metric.admin.overview.activeOperators': 'Active operators',

  /* Customer Support › Captain Fairness — a board on a QUEUE sub-tab, so it
     does not render through `MetricBoardScreen` today. Keyed anyway: the seeds
     exist, and a missing key is a crash rather than a blank the day the
     `captain-economics` view is built. */
  'metric.support.fairness.earningsPerEngagedHour': 'Earnings per engaged hour',
  'metric.support.fairness.suspendedCaptains': 'Suspended captains',

  /* ══════════════════ tile captions — `Metric.caption` (R4-4 §4.2) ══════
     One line under the label stating a **scope limit or a denominator**, and
     nothing else. Never a value, never a status, never an action, never a
     link. Sixty characters at most, and a full sentence takes a period (R6).

     Three of these are the tiles F-2 said could not ship without one:
     `dormancyProxy` (AC-641), `uncodedCeiling` (AC-674) and
     `overturnIsNotFailure` (AC-675). */
  'caption.afterGivebacks': 'After promos, bonuses, refunds and cover.',
  'caption.startedLessCancelled': 'Started less cancelled, in the period.',
  'caption.quickRidesOnly': 'Quick rides only.',
  'caption.storedRiderStat': 'A mean of a stored rider statistic.',
  'caption.phoneOnly': 'Matched on phone number only.',
  'caption.attributedAtPlanPrice': 'Attributed at the weekly plan price.',
  'caption.activeCampaignsOnly': '2 of 4 campaigns are active.',
  /* AC-641, and legacy's own words (`:6968`): the dataset has no "last app
     open" timestamp per rider, so this is a proxy. The caveat is the reason
     the tile is safe to read. */
  'caption.dormancyProxy': 'A proxy: no trip and no subscription.',
  'caption.healthyRatio': 'Healthy is 3 requests per captain.',
  'caption.demandThreeTimesSupply': 'Demand is 3 times supply or worse.',
  'caption.citiesLive': '1 of 4 cities is live.',
  'caption.window48h': 'The window is 48 hours.',
  'caption.pendingAndInReview': 'Pending and in review.',
  'caption.acrossFiveQueues': 'Across all five queues.',
  'caption.notOnATrip': 'Active captains not on a trip.',
  /* AC-674. The ceiling is real and so is its source — `uncodedCeilingPct` is
     3 (`:14659`). It gates the ranked list below it: above the ceiling, the
     ranking is not trustworthy. */
  'caption.uncodedCeiling': 'The ceiling is 3%.',
  /* AC-675. `higherIsBetter` is true on this tile and every instinct says
     otherwise, so the tile has to say why. */
  'caption.overturnIsNotFailure': 'Of decided appeals. Higher is better here.',
  'caption.statutoryThirtyDays': 'The statutory deadline is 30 days.',
  'caption.rotaSlots': '7 days, 3 blocks, 2 tiers.',

  /* ══════════════════ chart titles — one per `TimeSeries.key` ══════════
     A card title is a fragment (R6) and says what is plotted, not what to
     conclude from it. Some series share a key with a tile and some do not; the
     namespace is separate so a chart can be titled differently from the tile
     beside it without either borrowing the other's string. */
  'chart.management.overview.quickRideRevenue': 'Quick-ride revenue',
  'chart.management.overview.subscriptionRevenue': 'Subscription revenue',
  'chart.management.performance.onTimePickup': 'On-time pickups',
  'chart.management.performance.cancellationRate': 'Quick-ride cancellation rate',
  'chart.management.risk.openSignals': 'Open signals',
  'chart.management.growth.newSubscriptions': 'New subscriptions',
  'chart.management.zones.unservedRequests': 'Unserved requests',
  'chart.operations.overview.completedTrips': 'Trips completed',
  'chart.support.overview.contactsPerThousandTrips': 'Contacts per 1,000 trips',
  'chart.admin.overview.activityEvents': 'Activity events',
  'chart.support.fairness.earningsPerEngagedHour': 'Earnings per engaged hour',

  /* ══════════════════ breakdowns — R4-4 §4.1 ═══════════════════════════
     A heading is a fragment stating **dimension, ranking and cut-off**
     (AC-690), so an operator can tell "top five zones by failure rate" from
     "all zones" without counting. No period — R6.

     The cut-off line beneath the rows IS a sentence and takes one (AC-696). */
  'breakdown.performance.captainsByLateShare': 'Top 5 captains by late-trip share',
  'breakdown.risk.highValueRidersAtRisk': 'Top 5 riders at risk, by lifetime value',
  'breakdown.risk.subscriptionsByRenewalLikelihood': 'Top 5 subscriptions least likely to renew',
  'breakdown.zones.citiesHealth': 'All 4 cities, by zones live',
  'breakdown.operations.backlogByQueue': 'All 5 queues, by open items',
  'breakdown.support.contactReasons': 'Top 5 contact reasons, per 1,000 trips',
  'breakdown.admin.rotaGapsByDay': 'All 7 days, by on-call slots unassigned',

  /* AC-696, one key, one sentence, every breakdown. */
  'breakdown.cutOff': 'Showing the top {shown} of {total}.',
  /* AC-692 — a section with nothing to rank. R8's SECOND kind of empty: one
     grey sentence, never the first-run illustration, because the section is
     empty and the page is not. */
  'breakdown.empty': 'Nothing to rank for this period.',

  /**
   * The pass-through label for a row whose name is **data, not copy** — a
   * captain, a rider, a city, a subscription. R4-4 makes `labelKey` *"a key,
   * never a string"*, which is right for a closed set and impossible for a
   * person's name. One key, one parameter, no concatenation (AC-713).
   *
   * Raised in the wave-4 handoff: `MetricBreakdownRow.label` wants to be a
   * union of a key and a text, so the two kinds of row differ in the type
   * rather than by convention.
   */
  'breakdown.row.entity': '{name}',

  /* Row sub-labels. Each carries one **categorical** fact, one line, and is a
     closed term rather than a name. */
  'breakdown.sub.documentExpired': 'Document expired',
  'breakdown.sub.churnHigh': 'High churn risk',
  'breakdown.sub.churnMedium': 'Medium churn risk',
  'breakdown.sub.planWeekly': 'Weekly plan',
  'breakdown.sub.planBiweekly': 'Bi-weekly plan',
  'breakdown.sub.planMonthly': 'Monthly plan',
  'breakdown.sub.cityLive': 'Live',
  'breakdown.sub.cityNotLive': 'Not launched',
  'breakdown.sub.queueStanding': '{secondary} past their SLA',
  'breakdown.sub.weekend': 'Weekend, so every block is high risk',
  'breakdown.sub.nightBlock': 'The night block is high risk',

  /* The five wave-2 queues, named as the operator sees them in the nav. */
  'breakdown.queue.application': 'Applications',
  'breakdown.queue.request': 'Requests',
  'breakdown.queue.assurance': 'Trip Assurance',
  'breakdown.queue.incident': 'Safety & Incidents',
  'breakdown.queue.fairness': 'Captain Fairness',

  /* `DAY_KEYS` (`:19594`), Sunday-first — the Saudi working week. */
  'breakdown.rotaDay.sun': 'Sunday',
  'breakdown.rotaDay.mon': 'Monday',
  'breakdown.rotaDay.tue': 'Tuesday',
  'breakdown.rotaDay.wed': 'Wednesday',
  'breakdown.rotaDay.thu': 'Thursday',
  'breakdown.rotaDay.fri': 'Friday',
  'breakdown.rotaDay.sat': 'Saturday',

  /* ══════════════════ board notices — R4-4 §4.3 ════════════════════════
     A board DECLARES conditions; the page renders **at most one** banner. Full
     sentences, so they take periods (R6). Actions are verb-first fragments, so
     they do not.

     **Two keys per count, never a pluralisation built by concatenation**
     (AC-713). One and many read differently and both are written out. */
  'notice.support.unacknowledgedSos.one': 'An SOS incident is unacknowledged.',
  'notice.support.unacknowledgedSos.many': '{count} SOS incidents are unacknowledged.',
  'notice.admin.erasureOverdue.one': 'An erasure request is past its statutory deadline.',
  'notice.admin.erasureOverdue.many':
    '{count} erasure requests are past their statutory deadline.',
  'notice.action.openSafety': 'Open Safety & Incidents',
  'notice.action.openData': 'Open Data',
}
