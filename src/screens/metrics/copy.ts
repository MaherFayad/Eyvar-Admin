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

  /* ══════════════════ the board band ══════════════════════════════════
     `BoardHero`'s three strings. The band carries the board's name (which
     is a route title and lives in the shell dictionary), its period, its
     freshness and its lede — so only the last two are new here. */

  /* The window the board's numbers cover, on the band's mono pill. A FACT
     and not a control: `getMetricBoard` takes a sub-tab and nothing else,
     so there is no range to change and the pill carries no chevron. Both
     dates arrive formatted — `formatDate` owns the calendar and the
     numbering system (§18) — and the dash between them is an EN DASH,
     which is the range dash R1 uses everywhere else. */
  'overview.period': '{from} – {to}',

  /* ── THE WINDOW PICKER. ────────────────────────────────────────────────
     Rolling windows ending today, named for the span rather than for a
     calendar unit: `Last 7 days` and not `This week`, because the window does
     not start on a Monday and a reader who assumes it does will read the
     Monday column as the first one. `periods.ts` carries the same distinction
     in code. */
  'overview.period.label': 'Change the period',
  /* Two jobs, one string, and they are the same claim: the FIRST entry in the
     picker's list, and the trigger's own label on a board that has not been
     asked for a window. Both say the one thing — nothing is filtered out. */
  'overview.period.none': 'All time',
  'overview.period.presets': 'Periods',
  'overview.period.preset.day': 'Today',
  'overview.period.preset.week': 'Last 7 days',
  'overview.period.preset.twoWeeks': 'Last 14 days',
  'overview.period.preset.month': 'Last 30 days',
  'overview.period.preset.quarter': 'Last 90 days',
  'overview.period.preset.year': 'Last 365 days',
  'overview.period.active': 'Current period',
  'overview.period.from': 'From',
  'overview.period.to': 'To',
  'overview.period.apply': 'Apply',
  'overview.period.cancel': 'Cancel',
  /* Rule 4 — the state, and the fix for it, in one fragment on a disabled
     control. */
  'overview.period.inverted': 'The start is after the end',

  /* **The mock's own limit, said out loud.** `clients/metrics.ts`'s `windowed()`
     slices a chart to the range the operator picked and cannot recompute a
     tile: a seeded scalar was written down and a derived one counts a whole
     population with no date to filter on. It used to move each tile's declared
     period onto the picked range anyway, which put a one-day label on a
     fifteen-day figure — the relabel WAS the lie, and this sentence is what
     replaced it.

     It arrives as an `info` `BoardNotice` from the client, so the page banner
     carries it and no second surface exists (R10). No dates in it: a notice's
     `params` reach `t()` unformatted and `formatDate` owns the calendar and the
     numbering system (§18), so an interpolated `2026-06-25` would print
     Gregorian Latin digits inside an Arabic sentence. The tiles state their own
     dates; this states why they differ. */
  /* Not "the figures above": the banner sits under the band, so the lead tiles
     are above it and the chapters are below it. A sentence naming a position
     would be wrong for two thirds of what it describes. */
  'overview.period.figuresUnchanged':
    'These figures cover the periods they were computed for, not the range you picked. The charts follow your range.',

  /* ── THE BOARD LEDES. ONE SENTENCE, AND IT ANSWERS "A BOARD OF WHAT?" ──
     Beneath the board's name on the band. It is not a summary of the
     numbers — those move, and a sentence that described them would be
     wrong by the next fetch — and it is not a description of the screen.
     It states the QUESTION the board exists to answer, so an operator who
     opened the wrong sub-tab knows before reading a single figure.

     R6: full sentences, so all nine take a terminal period. R5-4's
     prohibitions apply as they do to a caption — never a value, never a
     status, never an action, never a link. They are keyed by `subTabId`,
     so a tenth board with no lede renders the band without one rather
     than printing a missing key. */
  'overview.lede.management-overview':
    'Whether the business is growing, and whether it is keeping the two promises it sells.',
  'overview.lede.management-performance':
    'How the service actually ran: trips delivered, cancellations, punctuality, and the captains behind them.',
  'overview.lede.management-risk':
    'Money and supply exposed in the next renewal cycle, with the accounts and captains driving it.',
  'overview.lede.management-growth':
    'Where new riders come from, what they cost, and whether the promotions are paying for themselves.',
  'overview.lede.management-zones':
    'Which districts are asking for more than their captains can serve, and how many captains would close the gap.',
  'overview.lede.operations-overview':
    'What the console owes right now: work claimed, work unclaimed, and the clocks running against it.',
  'overview.lede.support-overview':
    'Everything open in front of a person — incidents, tickets and the response times on them.',
  'overview.lede.support-fairness':
    'Whether decisions taken about captains hold up when someone appeals them.',
  'overview.lede.admin-overview':
    'The console itself: who can reach it, what is overdue on it, and where the gaps are.',

  /* ── CHAPTER HEADINGS. `Metric.category`, in words. ────────────────────
     A fragment naming a KIND of number, so no terminal period (R6). It is
     the same taxonomy §3.7's metrics library groups by, which is why these
     are not invented here: a seventh heading would need a seventh
     category, and `MetricCategory` is a closed union. */
  'overview.category.revenue': 'Money',
  'overview.category.subscriptions': 'Subscriptions',
  'overview.category.supply': 'Captains',
  'overview.category.team': 'Operators',
  'overview.category.demand': 'Demand',
  'overview.category.service': 'Service',
  'overview.category.risk': 'Risk',

  /* ── THE CHAPTER SUB-LINE, AND IT IS COMPUTED EVERY RENDER. ────────────
     Not a hand-written sentence about the data — those are true until the
     data moves. `chapterSummary` counts the figures below the heading
     whose delta is a change for the WORSE, using the same `metricValence`
     the deltas themselves use, so the line and the marks under it cannot
     disagree.

     Full sentences (R6). `worse` and `total` arrive formatted, so the
     numerals follow §18's numbering system rather than JavaScript's.
     A chapter with nothing comparable in it borrows
     `overview.noCompare.no-history` instead of taking a fourth string —
     the board should say that fact in one voice wherever it says it. */
  'overview.chapter.worse': '{worse} of {total} moved the wrong way.',
  'overview.chapter.steady': 'Nothing here moved the wrong way.',

  /* The heading over the charts and the ranked lists — the last section of
     every board. A fragment naming a KIND of content, so no period (R6), and
     GENERIC on purpose: the reference titles this per screen, which is a
     sentence about a chart set that goes stale the moment one is added or
     removed. What is true of the section on every board is what it is FOR. */
  'overview.section.detail': 'Behind the numbers',
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

  /* ── why there is no VALUE ─ R5-1 §11.1 ──────────────────────────────
     A different question from the three above, answered on the same line.
     `ValueAbsenceReason`'s two arms. **Two members, and a third is added by a
     spec that needs one** — not pre-invented: a tile the operator may not see
     is absent rather than em-dashed (AC-705), so permission is not a member,
     and a measure with no store does not render at all (R4-11 §11.2), so that
     is not one either.

     These are the strings V-2 was missing. A tile carried two em dashes and
     one sentence, and the sentence explained the LOWER dash — the upper one,
     larger and first in reading order, had nothing. Fragments on the chip
     line, so no period (R6). */
  'overview.absent.not-captured': 'Not captured yet',
  'overview.absent.not-computable': 'Nothing to measure yet',

  /* ── what a delta is measured against ──────────────────────────────── */
  'overview.compare.period': 'vs {from} – {to}',
  'overview.compare.target': 'vs {target} target',
  /* **V-8 / R5-2 — never rendered visually.** `— vs 0 target` hides its em dash
     from a screen reader and puts nothing in its place, so the tile announced
     the target and said nothing at all about the delta. The other two absence
     branches carry their reason as visible text and need no companion; this
     one is the hole, and AC-605 as rewritten names closing it as an obligation
     rather than leaving it a gap. */
  'overview.compare.targetNoDelta.sr': 'No percentage change to state',

  /* ── the direction, in words ─────────────────────────────────────────
     The LONG form, and it is still what a screen reader hears — a full clause
     reads better in a list of announced tiles than a bare adjective does.
     Sighted readers get `overview.valence.*` below instead, which is the same
     judgement in one word beside the chip. Both are driven by the same
     `higherIsBetter`, so the two can never disagree. */
  'overview.delta.flat': 'unchanged',
  'overview.delta.upBetter': 'up, which is better',
  'overview.delta.upWorse': 'up, which is worse',
  'overview.delta.downBetter': 'down, which is better',
  'overview.delta.downWorse': 'down, which is worse',

  /* ── the VISIBLE valence word. R4-5 amended, 2026-09-02. ──────────────
     D7 §4.9 forbids TONING THE CHIP, and the chip is still `tone="neutral"` —
     R7's five tones are untouched and R5a's "there is no red badge" holds,
     because this is not a badge. What §4.9 could not have intended is the
     state the visual research measured: `higherIsBetter` is carried on every
     metric, is announced to a screen reader, and reached a sighted operator
     not at all — so on an eight-tile risk board nothing said which numbers
     were bad news. The file's own comment records the same complaint: the
     rule "left a sighted operator no valence carrier except words".

     So it becomes a word. One adjective, next to the delta, plus the caret
     tinted to match. §7.5 is satisfied by construction rather than by review:
     the WORD is the carrier and the colour is the redundancy, which is the
     opposite of a colour-only signal and is why this needs no new tone.

     A metric whose movement is genuinely neither good nor bad — a
     cancellation-fee total, the file's own example — reads `unchanged` at zero
     and otherwise shows no word at all. See `metricValence`. */
  'overview.valence.better': 'better',
  'overview.valence.worse': 'worse',

  /* ── chart chrome ────────────────────────────────────────────────────
     §3.7: the legend names BOTH periods explicitly with dates. */
  'overview.legend.range': '{from} – {to}',
  'overview.legend.current': 'This period',
  'overview.legend.comparison': 'Previous period',
  /* §A10 — **the comparison row names its own day.** The two windows are
     zipped by index, because a like-for-like previous period has different
     dates by definition and joining on the date would drop every comparison
     point. So the tooltip's heading is the CURRENT window's date and the
     dashed reading beneath it was taken on another one; until this key the
     card printed both under one date and said nothing.

     A fragment on its own line, never appended to `overview.legend.comparison`
     — `Previous period` + ` on 14 Jun` is a sentence assembled by
     concatenation (AC-713) and no translation survives it. */
  'overview.tooltip.on': 'on {date}',

  /* ── THE UNIT THE SCALE IS IN — §A9, off the axis ───────────────────
     A9 labels the y-axis with the measure. This axis is a 0px gutter carrying
     two in-plot marks and §9.2 forbids giving the SVG axis group a direction,
     so the noun goes in the legend row — which mirrors — instead. It is
     load-bearing on a money chart: `TrendChart` divides money marks by 100, so
     a revenue plot reads `300 / 200` with no riyals named anywhere on it.

     `{unit}` is another key's value interpolated into a named placeholder,
     which is `breakdown.cutOff`'s `{dimension}` precedent exactly — not the
     concatenation AC-713 forbids.

     **The nouns name what the SCALE is in, never what the series counts.** The
     title above the plot already names that, and the six `count` charts count
     six different things (signals, subscriptions, requests, trips, pickups,
     events) — so `events` would be false on five of them. `counts` is true of
     all six and says the one thing the marks do not: that they are whole,
     unscaled counts, unlike money's. */
  'overview.legend.unit': 'Measured in {unit}',
  'overview.unit.money': 'riyals',
  'overview.unit.count': 'counts',
  'overview.unit.percent': 'per cent',
  'overview.unit.minutes': 'minutes',
  /* A CSAT/NPS scale is read in points on a fixed range; `Measured in rating`
     is not a sentence in English. */
  'overview.unit.rating': 'rating points',
  /* `formatRatio` renders `2.4×` — a multiple of a base, not a percentage and
     not a bare count. `multiples` is what the × means, said in a word. */
  'overview.unit.ratio': 'multiples',
  /* The plot's text alternative. A chart is an image and needs one (§7.5). */
  'overview.chart.description': '{title}, {from} to {to}',

  /* ── THE PLAIN-ENGLISH READ, AND IT IS DERIVED EVERY RENDER ───────────
     §A8's last line and Amplitude's second principle: a number is never
     alone. A headline figure, a caret and a legend are three things a reader
     assembles into a claim; this is the claim, said once.

     **Not a sentence anybody wrote about the data.** `trendRead` picks which
     of these four is true from the same delta the caret is drawn from, so the
     mark and the sentence cannot disagree — the reason `overview.chapter.*`
     above is computed rather than authored, in a smaller slot.

     Full sentences, so a terminal period (R6). `{delta}` is a MAGNITUDE and
     the direction is in the verb: *"is up −4%"* makes a reader un-negate a
     number to read a fall. One key per branch with named placeholders, never
     a stem plus a joined direction word (AC-75/AC-713) — Arabic agrees its
     verb with the subject and cannot take an English sentence's seams.

     `noBaseline` is the branch a card must not skip. Dropping the line when
     there is nothing to compare leaves the number bare and gives a reader no
     way to tell a missing sentence from a missing comparison. It is a
     SENTENCE rather than `overview.noCompare.no-history`'s fragment because
     it stands on its own line under a plot rather than in a chip beside a
     figure — and because it says the consequence, not just the condition. */
  'overview.chart.read.up': '{title} is up {delta} against {from} – {to}.',
  'overview.chart.read.down': '{title} is down {delta} against {from} – {to}.',
  'overview.chart.read.flat': '{title} is unchanged against {from} – {to}.',
  'overview.chart.read.noBaseline': 'No comparison period yet, so there is no trend to state.',
  /* §3.7's report icon at top right. An imperative naming the destination.
     **Kept, and no longer rendered by a metric board.** The icon-only corner
     link it labelled became the named action below; other surfaces that draw a
     bare `↗` still want a name that says what it opens. */
  'overview.report.open': 'Open the {report} report',

  /* ── §E4 / §E7 — Amplitude's `Open Analysis →`, as a NAMED action ──────
     The tile used to be a link and cannot be one any more: a lead figure is
     now a radio choosing which chart the band draws, and a control cannot be
     both a link and a radio. So the destination left the figure and took an
     affordance of its own, which is the reference's own shape.

     **Two keys rather than an `aria-label`, and that is §7.2's label-in-name.**
     The visible label is short because it repeats under every figure on the
     page; the accessible name still has to say WHICH analysis, so the report
     title arrives as a trailing run a screen reader hears and the eye does
     not. An `aria-label` naming the report would have REPLACED the visible
     words, leaving a control whose spoken name does not contain the label a
     voice user can see and would say.

     A fragment, so no terminal period (R6). `analysisFor` is a trailing
     prepositional phrase and takes none either — it is half of one name. */
  'overview.report.analysis': 'Open analysis',
  'overview.report.analysisFor': 'for {report}',

  /* ── §E4 — the lead row is a CHOICE, and this names the group ──────────
     Three figures that redraw one chart beneath them are one control, not
     three. A radiogroup with no accessible name is three unrelated buttons to
     anyone who cannot see that they share a band. */
  'overview.hero.group': 'Lead metrics — pick one to chart',

  /* ── the whole-board empty state (R8, AC-38) ─────────────────────────
     The heading names what the section is FOR, never the absence of data. */
  'overview.empty.heading': 'Captains, riders, trips and subscriptions, on one board',
  'overview.empty.body':
    'This board reports on captains, riders, trips and subscriptions. Numbers appear here as soon as there is activity to count.',
  /* D1b — `Trips` is no longer a destination; it split into `Quick rides` and
     `Subscription trips`. This button navigates to `/operations/quick-rides`,
     so it now names where it actually goes. Caught by the copy audit, not by
     a test: a label naming a sub-tab that no longer exists still compiles,
     still renders, and is the first control a new operator is offered. */
  'overview.empty.action': 'Go to quick rides',

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
  'metric.management.overview.arpa': 'Revenue per active subscription',
  'metric.management.overview.revenueMix': 'Subscription share of gross',
  'metric.management.overview.revenuePerActiveCaptain': 'Revenue per active captain',
  'metric.management.overview.tripMix': 'Subscription-to-quick-ride trip mix',

  /* Management › Performance — "Is the service getting worse for the people
     who already pay us?" */
  'metric.management.performance.cancellationRate': 'Quick-ride cancellation rate',
  'metric.management.performance.avgRenewalRate': 'Average renewal rate',
  'metric.management.performance.avgCaptainRating': 'Average captain rating',
  'metric.management.performance.tripsCompleted': 'Trips completed',
  'metric.management.performance.complaintRatePer100Trips': 'Complaints per 100 trips',
  'metric.management.performance.repeatLatenessConcentration': 'Repeat lateness concentration',

  /* Management › Risk & Signals — "What is about to fail that nobody has been
     told about yet?" */
  'metric.management.risk.revenueAtRisk': 'Revenue at risk',
  'metric.management.risk.churnPredictedSubscriptions': 'Subscriptions predicted to churn',
  'metric.management.risk.atRiskCaptains': 'Captains at risk of unavailability',
  'metric.management.risk.identityCollisions': 'Rider and captain accounts sharing a number',
  'metric.management.risk.repeatIncidentCaptains': 'Captains with repeat incidents',
  'metric.management.risk.paymentRiskRenewals': 'Renewal payments flagged',
  'metric.management.risk.revenueAtRiskShareOfMrr': 'Revenue at risk as share of MRR',
  'metric.management.risk.daysToRenewalAtRisk': 'Median days to renewal on at-risk rows',

  /* Management › Growth — "Is the money we spend to acquire and keep riders
     producing subscriptions?" */
  'metric.management.growth.promoROI': 'Blended promotion ROI',
  'metric.management.growth.promoBudgetConsumed': 'Promotion budget consumed',
  'metric.management.growth.subscriptionsFromPromos': 'Subscriptions from promotions',
  'metric.management.growth.newRiders': 'New riders',
  'metric.management.growth.registeredRiders': 'Registered riders',
  'metric.management.growth.dormantRiderShare': 'Dormant riders',
  'metric.management.growth.referralAndIncentiveSpend': 'Referral and incentive spend',
  'metric.management.growth.activationRate7d': '7-day rider activation rate',
  'metric.management.growth.qrToSubConversionRate': 'Quick-ride to subscription conversion',
  'metric.management.growth.cacPerSubscription': 'CAC per subscription',
  'metric.management.growth.ltvCacRatio': 'LTV-to-CAC ratio',

  /* Management › Market & Zones — "Where is demand going unserved, and where
     does the next captain need to be?" */
  'metric.management.zones.captainsNeeded': 'Captains needed for a healthy ratio',
  'metric.management.zones.starvedZones': 'Supply-starved zones',
  'metric.management.zones.unservedRequests30d': 'Unserved requests',
  'metric.management.zones.avgFailureRate': 'Average request failure rate',
  'metric.management.zones.steerOffersLive': 'Steering offers live',
  'metric.management.zones.worstDemandSupplyRatio': 'Worst demand-to-supply ratio',
  'metric.management.zones.liveCities': 'Cities live',
  'metric.management.zones.unservedDemandCities': 'Registered riders in unserved candidate cities',
  'metric.management.zones.applicantPipelinePerCity': 'Applicant supply in pipeline',
  'metric.management.zones.steerOfferAcceptanceRate': 'Steer-offer acceptance rate',

  /* Operations › Overview — "What must this shift deal with before it ends?" */
  'metric.operations.overview.applicationsPastWindow': 'Applications past their window',
  'metric.operations.overview.pendingApplications': 'Applications waiting',
  'metric.operations.overview.breachedWorkItems': 'Work items past their SLA',
  'metric.operations.overview.unclaimedWork': 'Unclaimed work',
  'metric.operations.overview.legsUncovered': 'Legs without a backup captain',
  'metric.operations.overview.openRequests': 'Open requests',
  'metric.operations.overview.complianceExpired': 'Captains with an expired document',
  'metric.operations.overview.captainsAvailable': 'Captains available now',
  'metric.operations.overview.oldestItemWaitingMinutes': 'Oldest item waiting',
  'metric.operations.overview.medianTimeToAssign': 'Median time to assign',
  'metric.operations.overview.slaAttainmentPercent': 'SLA attainment',
  'metric.operations.overview.riderAbandonmentRate': 'Rider abandonment rate',

  /* Customer Support › Overview — "Are we answering people inside the time we
     promised, and what are they calling about?" */
  'metric.support.overview.unacknowledgedCriticalIncidents': 'Unacknowledged critical incidents',
  'metric.support.overview.openIncidents': 'Open safety incidents',
  'metric.support.overview.contactsPerThousandTrips': 'Contacts per 1,000 trips',
  'metric.support.overview.uncodedContactShare': 'Uncoded contacts',
  'metric.support.overview.openFairnessCases': 'Open fairness cases',
  'metric.support.overview.overturnRate': 'Appeals overturned',
  'metric.support.overview.medianTimeToFirstResponse': 'Median time to first response',
  'metric.support.overview.repeatContactRate': 'Repeat-contact rate',

  /* Admin › Overview — "Is the console itself safe, staffed, and inside its
     statutory obligations?" */
  'metric.admin.overview.erasureOverdue': 'Erasure requests past their deadline',
  'metric.admin.overview.rotaGaps': 'On-call slots with nobody assigned',
  'metric.admin.overview.operatorsWithoutTwoFactor': 'Operators without two-factor',
  'metric.admin.overview.activeOperators': 'Active operators',
  'metric.admin.overview.itemsResolvedPerOperatorHour': 'Items resolved per operator-hour',
  'metric.admin.overview.workloadBalance': 'Workload balance ratio',

  /* Customer Support › Captain Fairness */
  'metric.support.fairness.earningsPerEngagedHour': 'Earnings per engaged hour',
  'metric.support.fairness.suspendedCaptains': 'Suspended captains',
  'metric.support.fairness.earningsP10': 'Earnings per engaged hour (P10)',
  'metric.support.fairness.earningsP90': 'Earnings per engaged hour (P90)',
  'metric.support.fairness.suspensionRatePer100': 'Suspension rate per 100 active captains',
  'metric.support.fairness.overturnRate': 'Appeals overturned',

  /* ══════════════════ tile captions — `Metric.caption` (R4-4 §4.2) ══════
     One line stating **what a reader must know to read the number correctly,
     and nothing else** — a scope limit, a denominator, or **the direction that
     counts as good where the label does not make it obvious** (R5-4 §9.2).
     Never a value, never a status, never the delta, never an action, never a
     link. A full sentence takes a period (R6).

     **The budget is 38 characters, not 60, and the 60 was a guess.** R5-4
     §4.1 measured the box a caption actually gets: 270px at 3-up (1280) and
     **225px at 4-up (1440)**, which is ~46 and ~38 characters at the caption's
     13px step.
     The 60 came from R9's toast budget by analogy without measuring anything,
     and the result was that the one caption whose content matters clipped on
     the WIDE viewport and survived the narrow one. The count is a drafting
     aid; **the rule is that the caption fits its 4-up box in both languages
     without truncating**, and Arabic at 13px is checked per string, not per
     rule. Two of the nineteen exceeded 38 and are rewritten below.

     **A caption does not render at all while the tile's value is absent**
     (R5-1 §1.3). It is not a slot for an absence — `Not captured yet` is
     illegal here and lives on the delta line, because a slot that sometimes
     qualifies a number and sometimes explains that there is no number has to
     be read to find out which.

     Three of these are the tiles F-2 said could not ship without one:
     `dormancyProxy` (AC-641), `uncodedCeiling` (AC-674) and
     `overturnIsNotFailure` (AC-675). */
  /* **Rewritten — R5-4 §11.3.** Was `After promos, bonuses, refunds and
     cover.`, 41 characters and over budget — and it fixed a second thing on
     the way: the old string named three of the six deductions AC-613 lists and
     read as exhaustive. This states the RELATION, which is what a scope limit
     is, and leaves the enumeration to AC-613 where it belongs. 34. */
  'caption.afterGivebacks': 'Gross revenue less all deductions.',
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
     otherwise, so the tile has to say why.

     **This is the string B-3 was raised about, and R5-4 resolved it in the
     caption's favour rather than the spec's.** §4.2 used to permit *only* a
     scope limit or a denominator, and `Higher is better.` is neither — but
     the four prohibitions were the rule, and the two-item list in front of
     them was two instances mistaken for a definition. It states no value, no
     status, no action and no link, and it does exactly the job the caption
     exists for: **a number whose scope is not stated gets quoted wrong; a
     number whose direction is not stated gets read wrong.**

     There is a second reason and it is a consequence of R4-5. Making the delta
     chip neutral was right, but it spent `higherIsBetter` on a screen-reader
     phrase — so a SIGHTED operator has no valence carrier at all except
     words. On fifty-five of fifty-six tiles that costs nothing, because
     `Tickets breaching now` rising is obviously bad. Here the intuition runs
     backwards and words are the only instrument left.

     Trimmed from `… Higher is better here.`, 42 characters, to 37. */
  'caption.overturnIsNotFailure': 'Of decided appeals. Higher is better.',
  'caption.statutoryThirtyDays': 'The statutory deadline is 30 days.',
  'caption.rotaSlots': 'Primary and secondary on the rota.',

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

  /* ── §E4 — the four titles that make the lead row a CHOICE ─────────────
     Each of these charts shares its key with a metric on the same board, which
     is what `BoardHeroRow`'s radiogroup joins on. They are titled here rather
     than borrowed from `metric.*` because that namespace separation is
     deliberate and live — `chart.management.performance.cancellationRate` says
     `Quick-ride cancellation rate` where its tile says something else, and a
     fallback would silently collapse the distinction.

     Where a chart and its tile genuinely want the same words, they say the same
     words, twice. That is the cost of the separation and it is the right one:
     the alternative is a title that changes when somebody edits a tile. */
  'chart.management.overview.grossRevenue': 'Gross revenue',
  'chart.management.performance.tripsCompleted': 'Trips completed',
  'chart.support.fairness.overturnRate': 'Appeals overturned',
  'chart.support.overview.openIncidents': 'Open safety incidents',
  'chart.support.overview.unacknowledgedCriticalIncidents': 'Unacknowledged critical incidents',

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

  /* AC-696, one key, one sentence, every breakdown. R4-4 §4.1 writes it out:
     `Showing the top {n} of {total} {dimension}.` — the dimension is named
     because the heading above the rows and the sentence below them are read
     minutes apart on a board an operator scans. The noun is a key of its own
     (below), never a raw `MetricBreakdown.dimension` string: `reason-code` is
     an identifier and `contact reasons` is copy. */
  'breakdown.cutOff': 'Showing the top {shown} of {total} {dimension}.',

  /* The dimension nouns, PLURAL, lower case, for the cut-off sentence only.
     One per `MetricBreakdown.dimension` in the fixtures; `copy.test.ts` fails
     if a board ever declares a dimension with no noun here, because
     `createTranslator` throws on a missing key in dev and that would take the
     board down rather than the suite. */
  'breakdown.dimension.captain': 'captains',
  'breakdown.dimension.rider': 'riders',
  'breakdown.dimension.subscription': 'subscriptions',
  'breakdown.dimension.city': 'cities',
  'breakdown.dimension.queue': 'queues',
  'breakdown.dimension.reason-code': 'contact reasons',
  'breakdown.dimension.rota-day': 'days',
  /* AC-692 — a section with nothing to rank. R8's SECOND kind of empty: one
     grey sentence, never the first-run illustration, because the section is
     empty and the page is not. */
  'breakdown.empty': 'Nothing to rank for this period.',
  /* **Principle 5's exportable half.** AC-694 forbids a *mutating* control on a
     breakdown; an export mutates nothing and is the alternative to an operator
     retyping five rows into a spreadsheet.

     `CSV` stays Latin in both languages — it is a file format, not a word, and
     it is what the download is called on disk. §13.6: the outcome is
     ANNOUNCED, never toasted, so `done` is written as a finished sentence a
     screen reader can read on its own. */
  'breakdown.export': 'Export CSV',
  'breakdown.export.done': 'Exported {rows} rows',
  /**
   * **R5-9 §18.1 — the caveat line, and it is a THIRD slot rather than a
   * reuse of one of the two that exist.**
   *
   * AC-674: when uncoded contacts exceeds its ceiling, the contact-reasons
   * breakdown states that its ranking is incomplete. Neither existing slot
   * could take it. **The caption is a TILE slot and R5-1 suppresses it exactly
   * when the tile's value is absent** — so the one caveat that must render
   * while a number is missing sat on the one slot that switches off then. And a
   * banner is page-scoped and capped at one per board, and Support's is spoken
   * for by the SOS critical.
   *
   * It renders **under the heading and above the first row**, and the position
   * is the ruling: *a gate that appears after the thing it gates is not a
   * gate.* A reader who scans five rows and forms a conclusion before reaching
   * a footer has already been misled, which is the failure AC-674 exists to
   * prevent.
   *
   * `{share}` is a percent and is formatted before interpolation (AC-713), the
   * same discipline as `subLabelParams`. `uncoded` rather than a word about
   * failure — AC-718, and it is the product's own term.
   */
  'breakdown.caveat.uncodedRanking':
    '{share} of contacts are uncoded, so this ranking is incomplete.',
  /**
   * **R5-11 §18.3 — the third absence, and conflating any two of the three is
   * the V-2 defect in a new slot.**
   *
   * | Situation | Sentence |
   * |---|---|
   * | We ranked; this window had nothing to rank | `breakdown.empty` |
   * | We queried; this date range returned nothing | `overview.noData` |
   * | **Nothing is captured, so no ranking or query is possible** | **this** |
   *
   * Byte-identical wherever it renders, on the same footing as AC-714's no-data
   * sentence — which is why it is one key for both card types and not two.
   *
   * **A card, unlike a tile, renders in this state rather than vanishing**, and
   * the reason is structural: a tile's entire content is its number, so there
   * is nowhere to put a sentence and an em dash cannot be made honest. A
   * breakdown card and a chart card each have a heading and a body; the heading
   * names the measure truthfully whether or not the data exists, so the body
   * can carry the truth and there is no reason to throw the heading away with
   * it. `Top 5 contact reasons, per 1,000 trips` over this sentence is what
   * gets the contact log built. An absent card is not.
   */
  'overview.notRecorded': 'Nothing is recorded here yet.',

  /**
   * **`breakdown.row.entity` is DELETED — R5-7, and it is deleted rather than
   * left unused.**
   *
   * It was a pass-through key whose entire English string was `{name}`. It
   * satisfied the type and AC-697 and it was a fig leaf, and both the fixture
   * and the component said so independently. `BreakdownLabel` replaces it:
   * `kind: 'key'` is copy — a rota day, a queue, a plan tier, a reason code —
   * and `kind: 'text'` is data — a person, a city, a subscription. **Nothing
   * translates a `text` and nothing may try**, so the component does not call
   * `t` for one at all.
   *
   * Leaving the key here would leave the fig leaf reachable. Removing it makes
   * `createTranslator` throw by name on anything still seeding it, which is the
   * loud failure this dictionary is built around. AC-697 as redrafted carries
   * the clause that would have caught it: *a row label is never a key whose
   * whole string is a parameter.*
   */

  /* Row sub-labels — **R5-5 §11.4, and this block was rewritten whole.**

     A sub-label carries the row's second fact, **categorical, numeric, or both
     joined by a middot**. A numeric one is a **noun phrase**, and that is the
     change: the secondary numeric COLUMN is withdrawn (R5-5), so the second
     number moves to the only slot that can name it.

     The reference is what settled it. `Online store conversion rate` on
     `analytics-dashboard-today-no-data`:

         Added to cart                         0.00%    —
         0 sessions

     `0 sessions` is the second number and it is a noun phrase in the
     sub-label. The reference carries exactly one numeric column — the measure
     the list is ranked by — and puts the second number where it can be named.

     **Every value is FORMATTED before it is interpolated, and the component is
     what formats it.** `{rate}` renders `45%`, not `45`; `{late}` renders a
     formatted count. `MetricBreakdownRow.subLabelParams` carries **bare
     numbers**, on the precedent `overview.compare.target` sets —
     `MetricComparison.value` is a `number` and `MetricTile` runs it through a
     formatter before handing it to `t()`.

     R5-5 §11.4 note 1 reads as though the FIXTURE should pre-format, and the
     data contract went the other way for a reason that decides it: a stored
     `'45%'` can never render Arabic-Indic digits, because formatting is a
     function of the language and the language is not known where the data is
     seeded. Both readings agree on the thing the rule exists for — **a per-cent
     sign assembled by CONCATENATION is what AC-713 forbids**, and one produced
     by `formatPercent` is not that. `BreakdownList` holds the table of which
     parameter takes which unit, because the unit is a property of the KEY:
     `zones.citiesHealth` ranks on a count of zones and states a percentage.

     **`unserved`, not `fail`.** AC-718 keeps `failed` out of tile labels,
     chart titles and breakdown headings and names the zones chart
     `Unserved requests`; the sub-label uses the same noun so a board does not
     call one thing two names.

     **Seven keys retired here, and B-6 is reversed deliberately.**
     `breakdown.sub.queueStanding` was `{secondary} past their SLA` and was
     changed last pass to `Open · past their SLA` — a column legend repeated
     identically on every row, which is what a header row exists to avoid. The
     original was right and the rule was wrong. It goes back. Also gone:
     `weekend`, `nightBlock`, `churnHigh`, `churnMedium`, `cityLive`,
     `documentExpired`. Nothing is kept behind a flag. */
  'breakdown.sub.lateOfTrips': '{late} of {total} trips ran late',
  'breakdown.sub.lateOfTripsExpired': 'Document expired · {late} of {total} trips ran late',
  'breakdown.sub.churnHighTrips': 'High churn risk · {trips} trips',
  'breakdown.sub.churnMediumTrips': 'Medium churn risk · {trips} trips',
  'breakdown.sub.cityLiveUnserved': 'Live · {rate} of requests unserved',
  /* Unchanged, and it is the one that proves the phrase form was right.
     `zones.citiesHealth` ranks four cities; three have no failure-rate reading
     at all. As a numeric column that is an em dash — the same mark V-2 is
     about. As a phrase, a city with no reading simply does not state one, and
     this says why. A city with no reading and a city with a reading of zero
     are different facts, and only one of the two forms can render that. */
  'breakdown.sub.cityNotLive': 'Not launched',
  /**
   * **Reinstated — R5-9 §18.7.** §11.4 retired this on the assumption that
   * every live city carries a rate. It does not, and the retirement was the
   * designer's own.
   *
   * The state is a **live city with no reading**. Refusing to fabricate `0%`
   * was right — a live city with no zones tracked has no failure rate and a
   * zero would claim a perfect one. Refusing to call it `Not launched` was
   * right — it is launched. But rendering **nothing** reproduces V-2 one level
   * down: a blank in a column where every other row carries a phrase, and the
   * reader cannot tell *nothing to say* from *something we forgot*.
   *
   *     Riyadh      6    Live · 45% of requests unserved
   *     Jeddah      2    Live
   *     Dammam      0    Not launched
   *     Makkah      0    Not launched
   *
   * `Live` on its own says *launched, no reading yet* by contrast with the row
   * above it, and says it without a number nobody has. Unreachable today and
   * reachable the day a second city launches before its zones are tracked — a
   * state the product will pass through, not a hypothetical.
   */
  'breakdown.sub.cityLive': 'Live',
  'breakdown.sub.queuePastSla': '{past} past their SLA',
  'breakdown.sub.rotaWeekend': 'Weekend · all {count} are high-risk',
  'breakdown.sub.rotaNightBlock': 'Night block · {count} are high-risk',
  /* Purely categorical, and unchanged by R5-5 — a plan tier is a closed term
     with no number behind it. */
  'breakdown.sub.planWeekly': 'Weekly plan',
  'breakdown.sub.planBiweekly': 'Bi-weekly plan',
  'breakdown.sub.planMonthly': 'Monthly plan',

  /* The five wave-2 queues, named as the operator sees them in the nav. */
  'breakdown.queue.application': 'Applications',
  'breakdown.queue.request': 'Requests',
  'breakdown.queue.assurance': 'Trip Assurance',
  'breakdown.queue.incident': 'Safety & Incidents',
  'breakdown.queue.fairness': 'Captain Fairness',
  /* T1.6 â the two queues My Work gained. */
  'breakdown.queue.ticket': 'Tickets',
  'breakdown.queue.dispute': 'Disputes',

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

  /* OPERATIONS DECLARES TWO, AND ALL SIX KEYS WERE OWED AND NEVER WRITTEN.
     `fixtures/metrics.ts` hands them over in a comment block that names each
     string exactly (`:2477`–`:2486`), and the handoff was never picked up — so
     `t('notice.operations.complianceExpired.many')` threw
     `Missing translation key` and **the Operations Overview board crashed for
     any operator whose data raised the condition**. It surfaced as one failing
     shell test (`qa.shell.test.tsx`, USR-5 landing on `/operations/overview`),
     which is a board-level crash wearing a routing test's name.

     The consequence is bigger than the crash. Two passes concluded that **no
     board declares two notices**, so R4-4 §4.3's tie-break was recorded as
     testable only on synthetic values. It is not: this board declares a
     `warning` at severity 70 and a `critical` at severity 95, which exercises
     the tone clause on real fixture data. Both passes reached that conclusion
     honestly — the board they needed to look at threw before it rendered. */
  'notice.operations.applicationsPastWindow.one': 'An application is past its 48-hour window.',
  'notice.operations.applicationsPastWindow.many':
    '{count} applications are past their 48-hour window.',
  'notice.operations.complianceExpired.one':
    'A captain has a lapsed document and cannot be dispatched.',
  'notice.operations.complianceExpired.many':
    '{count} captains have lapsed documents and cannot be dispatched.',
  'notice.action.openApplications': 'Open applications',
  'notice.action.openCompliance': 'Open compliance',
}
