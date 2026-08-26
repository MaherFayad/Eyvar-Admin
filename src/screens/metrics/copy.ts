/**
 * Every operator-facing string the eight metric-tile screens can render, as
 * keys (**AC-74**), with no concatenation anywhere (**AC-75**).
 *
 * **Why the strings live here.** `src/i18n/dictionaries.ts` has a single owner
 * and thirty-three more screens are coming; a screen owns its copy, exports it
 * as a `Dictionary`, and the dictionary module merges it in one line — the
 * pattern `src/screens/operations/people/copy.ts` set. `dictionaries.ts`
 * carries exactly one import and one spread for this file, which is the whole
 * change to a file this role does not own.
 *
 * **One dictionary for all eight screens, not eight.** These are one family and
 * `overview.noData` in particular MUST be byte-identical everywhere — §3.7:
 * *"No-data copy MUST be identical everywhere, punctuation included"*, and it
 * names the products index strip dropping the trailing period as the
 * inconsistency to avoid. One key, one string, one place.
 *
 * Rules applied (`docs/ref/copy.md`)
 *   1   sentence case everywhere; only proper nouns capitalised mid-string.
 *   6   "you" / "your": the operator is addressed directly.
 *   8   no period on a badge, chip or menu item; a full SENTENCE takes one
 *       (R6). `overview.noData` and `overview.allZero` are sentences and take
 *       one; `overview.compare.noPeriod` is a fragment in a chip and does not.
 *  10   end-of-list and no-data are stated in words, never left blank.
 */

import type { Dictionary } from '@/lib'

export const OVERVIEW_EN: Dictionary = {
  /* ── freshness (contract fact 2) ─────────────────────────────────────
     One string, used by the page header, every chart card and any tile that
     is staler than the page. `time` is already formatted by the caller —
     `formatDate` owns the calendar and the numbering system (§18). */
  'overview.asOf': 'Computed {time}',
  /* Labels the busy region while the tiles are skeletons (§11.3). There is no
     shell-wide loading key yet; when one lands this defers to it. */
  'overview.loading': 'Loading {resource}',

  /* ── the three kinds of no data, and the fourth case ─────────────────
     These four strings are the whole of the contract's fact 3, and they are
     deliberately worded so that no two of them could be mistaken for each
     other by an operator reading quickly. */

  /* §3.7, verbatim, trailing period included. The range returned nothing. */
  'overview.noData': 'There was no data found for this date range.',
  /* A distribution with no rows is not the same fact as a range with no
     readings — one means "nothing has happened here", the other means "we did
     not measure". */
  'overview.noBreakdown': 'Nothing has been recorded here yet.',
  /* Fact 3 row 3. Zero is a number and often the good answer; this says the
     measurement RAN. */
  'overview.allZero': 'Every value in this range is zero.',
  /* Fact 3 row 2. Counted, not implied by a broken line. */
  'overview.gaps': 'No reading on {gaps} of {total} days.',
  /* Fact 3 row 1. A fragment in a chip — no period (R6). */
  'overview.compare.noPeriod': 'No comparison period yet',
  'overview.compare.notComparable': 'Not comparable across periods',

  /* ── deltas and targets ──────────────────────────────────────────────
     The direction word exists for anyone who cannot see the caret (§7.5).
     It is never rendered visually — the caret and the sign carry it there. */
  'overview.delta.up': 'up',
  'overview.delta.down': 'down',
  'overview.delta.flat': 'unchanged',
  'overview.target.met': 'target met',
  'overview.target.missed': 'below target',

  /* ── periods ─────────────────────────────────────────────────────────
     Two shapes, because the same period is named differently in the two
     places it appears: after a delta chip it is a comparison ("vs …"), and in
     a chart's accessible description it is a range ("last 14 days"). */
  'overview.period.last7d': 'last 7 days',
  'overview.period.last14d': 'last 14 days',
  'overview.period.previous14d': 'vs previous 14 days',

  /* ── chart chrome ────────────────────────────────────────────────────
     §3.7: the legend names BOTH periods explicitly with dates. */
  'overview.legend.range': '{from} – {to}',
  'overview.legend.current': 'This period',
  'overview.legend.comparison': 'Previous period',
  /* The plot's text alternative. A chart is an image and needs one (§7.5). */
  'overview.chart.description': '{title}, {period}',
  /* §3.7's report icon at top right. An imperative naming the destination. */
  'overview.report.open': 'Open the {report} report',

  /* ── page-level ──────────────────────────────────────────────────────
     §8's `meta` line is data-derived only (V4). A computation time is exactly
     that: it changes when the data changes. */
  'overview.empty.heading': 'Nothing to report yet',
  'overview.empty.body':
    'This overview reports on captains, riders, trips and subscriptions. Numbers appear here as soon as there is activity to count.',
  'overview.empty.action': 'Go to Trips',

  /* ── metric labels ───────────────────────────────────────────────────
     A tile label is a fragment and takes no period (R6). It names WHAT the
     number is, never how it was derived. */
  'overview.metric.grossFares': 'Gross fares, settled trips',
  'overview.metric.activeSubscriptions': 'Active subscriptions',
  'overview.metric.activeCaptains': 'Active captains',
  'overview.metric.trips14d': 'Trips, last 14 days',
  'overview.metric.onTime': 'On-time pickups',
  'overview.metric.averageRating': 'Average captain rating',
  'overview.metric.medianTrip': 'Median trip length',
  'overview.metric.sameCaptainKept': 'Plans keeping the same captain',
  'overview.metric.standingSignals': 'Standing signals',
  'overview.metric.flaggedTrips': 'Flagged trips',
  'overview.metric.desyncedTrips': 'Trips out of sync',
  'overview.metric.highChurnRiders': 'Riders at high churn risk',
  'overview.metric.riderBase': 'Riders',
  'overview.metric.subscribedRiders': 'Subscribed riders',
  'overview.metric.activePromos': 'Active promotions',
  'overview.metric.referralSignups': 'Referral sign-ups',
  'overview.metric.zoneWatchlist': 'Zones on the watchlist',
  'overview.metric.citiesLive': 'Cities with captains',
  'overview.metric.captainSupply': 'Captains available',
  'overview.metric.expansionReady': 'Zones ready to expand',
  'overview.metric.liveTrips': 'Trips in progress',
  'overview.metric.myWork': 'Work assigned to you',
  'overview.metric.requests': 'Open requests',
  'overview.metric.applications': 'Captain applications',
  'overview.metric.openTickets': 'Open tickets',
  'overview.metric.openDisputes': 'Open disputes',
  'overview.metric.safetyCases': 'Safety cases',
  'overview.metric.fairnessCases': 'Fairness cases',
  'overview.metric.teamMembers': 'Team members',
  'overview.metric.auditEvents': 'Audit events',
  'overview.metric.dataRequests': 'Data requests',
  'overview.metric.recordsManaged': 'Captain records',

  /* ── chart titles ────────────────────────────────────────────────────
     A card title is a fragment (R6) and says what is plotted, not what to
     conclude from it. */
  'overview.chart.tripsPerDay': 'Trips started',
  'overview.chart.ratingPerDay': 'Captain rating',
  'overview.chart.noShows': 'No-shows',
  'overview.chart.financialPosition': 'Where the fares went',
  'overview.chart.subscriptionMix': 'Subscriptions by status',
  'overview.chart.riderBase': 'Riders by tier',
  'overview.chart.captainsByCity': 'Captains by city',
  'overview.chart.riderEngagement': 'Riders by type',
  'overview.chart.retentionCohorts': 'Retention by cohort',
  'overview.chart.churnRiskMix': 'Riders by churn risk',
  'overview.chart.complianceState': 'Captain documents by state',
  'overview.chart.fraudScoreTrend': 'Fraud score',
  'overview.chart.planMix': 'Subscriptions by plan',
  'overview.chart.promoRedemptions': 'Promotion redemptions',
  'overview.chart.referralFunnel': 'Referral funnel',
  'overview.chart.supplyByCity': 'Captain supply by city',
  'overview.chart.demandByCity': 'Rider demand by city',
  'overview.chart.zoneFailRate': 'Zone failure rate',
  'overview.chart.operationsBacklog': 'Operations backlog',
  'overview.chart.applicationPipeline': 'Applications by stage',
  'overview.chart.supportBacklog': 'Support backlog',
  'overview.chart.riderLanguages': 'Riders by app language',
  'overview.chart.ticketVolume': 'Ticket volume',
  'overview.chart.firstResponse': 'First response time',
  'overview.chart.adminBacklog': 'Admin backlog',
  'overview.chart.auditVolume': 'Audit events over time',
  'overview.chart.integrityChecks': 'Data integrity checks',

  /* ── breakdown rows the product owns ─────────────────────────────── */
  'overview.row.captainEarnings': 'Captain earnings',
  'overview.row.platformCut': 'Eyvar cut',

  /* ── closed unions, from `src/data/types` ────────────────────────────
     Every member of every union a breakdown can render. A value NOT in this
     list falls back to the server's own word rather than throwing — see
     `enumLabel` in `source.ts`. City and plan names are deliberately absent:
     those are data, not copy (finding F-6). */
  'overview.value.subscriptionStatus.active': 'Active',
  'overview.value.subscriptionStatus.expiring': 'Expiring soon',
  'overview.value.subscriptionStatus.at-risk': 'At risk',
  'overview.value.subscriptionStatus.frozen': 'Frozen',
  'overview.value.subscriptionStatus.cancelled': 'Cancelled',
  'overview.value.subscriptionStatus.expired': 'Expired',

  'overview.value.riderStatus.subscriber': 'Subscribers',
  'overview.value.riderStatus.on-demand': 'On-demand riders',

  'overview.value.tier.gold': 'Gold',
  'overview.value.tier.silver': 'Silver',
  'overview.value.tier.bronze': 'Bronze',
  'overview.value.tier.new': 'New',

  'overview.value.churnRisk.low': 'Low risk',
  'overview.value.churnRisk.medium': 'Medium risk',
  'overview.value.churnRisk.high': 'High risk',

  'overview.value.applicantStatus.pending': 'Pending',
  'overview.value.applicantStatus.in-review': 'In review',
  'overview.value.applicantStatus.approved': 'Approved',
  'overview.value.applicantStatus.rejected': 'Rejected',
  'overview.value.applicantStatus.withdrawn': 'Withdrawn',

  'overview.value.complianceState.valid': 'Valid',
  'overview.value.complianceState.expiring': 'Expiring',
  'overview.value.complianceState.critical': 'Critical',
  'overview.value.complianceState.expired': 'Expired',

  'overview.value.language.Arabic': 'Arabic',
  'overview.value.language.English': 'English',
}
