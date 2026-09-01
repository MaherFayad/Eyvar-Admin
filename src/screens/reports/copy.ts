/**
 * Every operator-facing string the Report Builder can render, as keys
 * (**AC-894**), with no concatenation anywhere (**AC-895**).
 *
 * ## Why the strings live here and not in `src/i18n/dictionaries.ts`
 *
 * A screen owns its copy and exports it as a `Dictionary`; the dictionary
 * module merges it in one line. That is the pattern `screens/operations/people`
 * set, and it is the only change this module makes to a file it does not own.
 *
 * ## The 60 keys the DATA layer emits
 *
 * The semantic layer under `src/data/` never holds a display string: a measure
 * carries `labelKey`, a population carries `predicateKey`, a violation carries
 * `reasonKey` plus `reasonParams`, and a panel carries `titleKey` plus
 * `titleParams`. **This file is the other end of all of them.** A seeded
 * measure with no entry here throws in dev rather than rendering a raw key at
 * an operator — the intended failure mode, and `copy.test.ts` asserts the set
 * is complete **against the fixtures**, not against a list typed twice.
 *
 * ## R5-15 is a copy requirement as much as a data one
 *
 * > *an aggregate declares its population, and one that cannot name a
 * > population does not render.*
 *
 * The catalogue makes the population **present**; these keys make it
 * **visible**. `rb.pop.*` is a sentence naming which rows are counted;
 * `rb.panel.population` puts it under the panel title; `rb.panel.readings`
 * states the base — how many of the window's buckets carry a reading — so a
 * number never travels without the count it was computed over. Four people
 * computed one metric carefully and got four populations seven points apart;
 * the sentence under the chart is what stops the fifth.
 *
 * ## Two sentences that must not drift
 *
 * §3.7's no-data sentence is byte-identical everywhere including its trailing
 * period, and it is **deliberately not restated here** — the canvas calls the
 * metric board's own key, which is what "identical everywhere" means (AC-844).
 * `rb.alert.sentence` is AC-878's single key with named parameters; there is no
 * `a + ' vs ' + b` in this module and no fragment assembly.
 *
 * Rules applied (`docs/ref/copy.md`)
 *   1   sentence case; only proper nouns capitalised mid-string.
 *   4   imperative, naming the fix. No `please`, no `invalid`, no blame.
 *   6   a full sentence takes a period; a label, badge or chip does not.
 *  10   end-of-list, no-data and "unset" are stated in words, never left blank.
 */

import type { Dictionary } from '@/lib'

export const REPORTS_EN: Dictionary = {
  /* ─────────────────────── the sub-tab and its views ────────────────────── */

  'rb.page.title': 'Reports',
  'rb.view.reports': 'Reports',
  'rb.view.dashboards': 'Dashboards',
  'rb.view.alerts': 'Alerts',

  /* ───────────────────────────── measures ───────────────────────────────── */

  /* Names, not descriptions. A measure name reaches a chart title, a legend, a
     CSV header and an alert sentence, so it has to read correctly in all four
     and cannot carry a clause. What the measure MEANS is `rb.pop.*`. */
  'rb.measure.captains.registered': 'Registered captains',
  'rb.measure.riders.registered': 'Registered riders',
  'rb.measure.subscriptions.active': 'Active subscriptions',
  'rb.measure.captains.joined': 'Captains who joined',
  'rb.measure.riders.joined': 'Riders who joined',
  'rb.measure.subscriptions.started': 'Subscriptions started',
  'rb.measure.subscriptions.cancelled': 'Subscriptions cancelled',
  'rb.measure.trips.completed': 'Trips completed',
  'rb.measure.trips.quickRides': 'Quick rides',
  'rb.measure.trips.fareCollected': 'Fares collected',
  'rb.measure.revenue.total': 'Gross revenue',
  'rb.measure.revenue.quickRide': 'Quick-ride revenue',
  'rb.measure.revenue.subscription': 'Subscription revenue',
  'rb.measure.trips.cancellationRate': 'Cancellation rate',
  'rb.measure.requests.timeToAssign': 'Time to assign',
  'rb.measure.riders.activated': 'Activated riders',
  'rb.measure.financials.arpa': 'Revenue per active subscription (ARPA)',

  /* ───────────────────────── populations (R5-15) ────────────────────────── */

  /* One sentence per population, naming WHICH ROWS are counted. This is the
     rule's visible half: a measure label with none of these under it is a
     number whose base lives only in its definition. */
  'rb.pop.drivers.all': 'Counts every captain record, whatever its status.',
  'rb.pop.riders.all': 'Counts every rider record, whatever its status.',
  'rb.pop.subscriptions.all': 'Counts every subscription record.',
  'rb.pop.subscriptions.cancelled': 'Counts subscriptions that carry a cancellation date.',
  'rb.pop.subscriptions.liveAtInstant':
    'Counts subscriptions that had started, and had neither been cancelled nor ended, at the end of each bucket.',
  'rb.pop.trips.completed': 'Counts trips that finished inside the bucket, by their end time.',
  'rb.pop.snapshot.daily': 'Reads one hand-captured daily snapshot row per day.',

  /* ─────────────────────────── captions (F-6) ───────────────────────────── */

  /* One line a reader must know to read the number correctly: a scope limit, a
     denominator, or which direction is good. Never a restatement of the label. */
  'rb.caption.captains.registered':
    'Registration only. A captain suspended yesterday is still counted for every earlier day.',
  'rb.caption.subscriptions.active':
    'Rebuilt from each row’s start, cancellation and end dates. There is no status history behind it.',
  'rb.caption.trips.completed': 'Bucketed by when the trip ended, never by when it started.',
  'rb.caption.trips.cancellationRate':
    'A share of that day’s requests, so it is comparable across days of very different size.',
  'rb.caption.snapshot.base':
    'Comes from the snapshot table, which is captured by hand. A day nobody captured has no reading.',
  'rb.caption.requests.timeToAssign': 'Mean time from ride request to captain assignment in minutes.',
  'rb.caption.riders.activated': 'Counts riders who completed at least one ride.',
  'rb.caption.financials.arpa': 'Subscription revenue per active subscriber in SAR.',

  /* ───────────────────────────── categories ────────────────────────────── */

  /* §3.7's metrics-library grouping, reused so the measure picker groups the
     way the board sidebar does. `MetricCategory` is the data layer's closed
     six; nothing here invents a seventh. */
  'rb.category.revenue': 'Revenue',
  'rb.category.subscriptions': 'Subscriptions',
  'rb.category.supply': 'Captains',
  'rb.category.demand': 'Riders',
  'rb.category.service': 'Service',
  'rb.category.risk': 'Risk',

  /* ──────────────────────────── dimensions ──────────────────────────────── */

  'rb.dim.subscription.plan': 'Plan',
  'rb.dim.subscription.vehicleClass': 'Vehicle class',
  'rb.dim.subscription.status': 'Subscription status',
  'rb.dim.trip.kind': 'Trip kind',
  'rb.dim.trip.status': 'Trip status',
  'rb.dim.trip.pickup': 'Pickup district',
  'rb.dim.driver.city': 'Captain city',
  'rb.dim.driver.vehicleClass': 'Captain vehicle class',
  'rb.dim.driver.status': 'Captain status',
  'rb.dim.rider.city': 'Rider city',
  'rb.dim.rider.status': 'Rider status',

  /* ───────────────────────────── the panel ──────────────────────────────── */

  'rb.panel.heading': 'Build a report',
  'rb.control.measure': 'Measure',
  'rb.control.measure.placeholder': 'Choose a measure',
  'rb.control.measure2': 'Second measure',
  'rb.control.measure2.none': 'No second measure',
  'rb.control.measure2.empty': 'No measure shares this one’s unit and period type.',
  'rb.control.groupBy': 'Split by',
  'rb.control.groupBy.none': 'No split',
  'rb.control.groupBy.empty': 'This measure has no dimension it can be split by.',
  'rb.control.groupBy.cleared': 'The split was cleared: it is not legal for {measure}.',
  'rb.control.filters': 'Filters',
  'rb.control.filters.field': 'Field',
  'rb.control.filters.value': 'Value',
  'rb.control.filters.apply': 'Add filter',
  'rb.control.filters.remove': 'Remove the {field} filter',
  'rb.control.filters.none': 'No filters',
  'rb.control.filters.empty': 'These two measures share no filterable field.',
  'rb.control.filters.noneForMeasure': 'This measure has no field it can be filtered on.',
  'rb.control.filters.unstarted': 'Choose a measure to filter it.',
  'rb.control.window': 'Date range',
  'rb.control.window.apply': 'Apply',
  'rb.control.window.from': 'From',
  'rb.control.window.to': 'To',
  'rb.control.window.custom': 'Custom range',
  'rb.control.window.range': '{from} – {to}',
  'rb.control.grain': 'Grain',
  'rb.control.compare': 'Compare to',
  'rb.control.chartType': 'Chart type',
  'rb.control.run': 'Run',
  'rb.control.disabled.unstarted': 'Choose a measure first.',

  /* Preset names are keys, never `'Last ' + n + ' days'` (AC-896). */
  'rb.preset.today': 'Today',
  'rb.preset.yesterday': 'Yesterday',
  'rb.preset.last-7d': 'Last 7 days',
  'rb.preset.last-30d': 'Last 30 days',
  'rb.preset.last-90d': 'Last 90 days',
  'rb.preset.last-365d': 'Last 365 days',
  'rb.preset.last-month': 'Last month',
  'rb.preset.last-12-months': 'Last 12 months',
  'rb.preset.last-year': 'Last year',

  'rb.grain.hour': 'Hour',
  'rb.grain.day': 'Day',
  'rb.grain.week': 'Week',
  'rb.grain.month': 'Month',
  'rb.grain.none': 'Whole range',

  /* The same five as nouns inside a sentence. `Day` is a control label and
     `day` is a word — *"read on the last complete Day"* is a control label
     wearing a sentence, and lower-casing the label at the call site would be a
     transformation Arabic cannot follow. */
  'rb.grainNoun.hour': 'hour',
  'rb.grainNoun.day': 'day',
  'rb.grainNoun.week': 'week',
  'rb.grainNoun.month': 'month',

  'rb.chartType.line': 'Line',
  'rb.chartType.bar': 'Bar',
  'rb.chartType.pie': 'Pie',
  'rb.chartType.table': 'Table',

  'rb.compare.none': 'No comparison',
  'rb.compare.previous-period': 'Previous period',
  'rb.compare.previous-year': 'Previous year',

  /* ───────────── why a control is disabled — the layer's own keys ────────── */

  'rb.grain.belowMin': '{grain} is finer than this data goes. The finest it answers is {minGrain}.',
  'rb.grain.tooManyBuckets':
    '{grain} over this range is {buckets} buckets, and {max} is the most a report draws.',

  'rb.chart.lineNeedsGrain': 'A line needs a grain. This range is collapsed to one bucket.',
  'rb.chart.lineNeedsTwoPoints': 'A line needs at least two points and this range has {buckets}.',
  'rb.chart.barNeedsGrainOrSplit': 'A bar needs either a grain or a split.',
  'rb.chart.pieOneMeasure': 'A pie shows one measure. This report has two.',
  'rb.chart.pieUnit': 'A pie of a {unit} does not add up to a whole.',
  'rb.chart.pieNotAdditive':
    'This measure cannot be added across groups, so its parts have no whole.',
  'rb.chart.pieNeedsSplit': 'A pie needs a split, so it has parts to show.',
  'rb.chart.pieNeedsSinglePeriod': 'A pie needs the whole range as one bucket.',
  'rb.chart.pieTooManyParts': 'This split has {parts} parts and a pie reads up to {max}.',

  'rb.violation.noMeasure': 'Choose a measure.',
  'rb.violation.unknownMeasure': 'There is no measure called {key}.',
  'rb.violation.tooManyMeasures': 'A report compares at most {max} measures.',
  'rb.violation.mixedTemporality':
    'A {aTemporality} and a {bTemporality} cannot share a report: one is a level and the other is a total.',
  'rb.violation.mixedUnit': 'A {a} and a {b} cannot share a report.',
  'rb.violation.illegalDimension': 'These measures cannot be split by {dimension}.',
  'rb.violation.filterFieldNotShared': 'Both measures must be filterable on {field}.',
  'rb.violation.windowInverted': '{to} is before {from}.',

  /* ────────────────────── the five modes (P7-T3) ────────────────────────── */

  /* **Five questions, not five chart types.** The label names the QUESTION the
     operator is asking, because that is what they are choosing between: a
     funnel and a trend over the same measures are not two renderings of one
     answer. Each carries one line, because *Retention* and *Journeys* are not
     self-evident to someone who has not used an analytics tool, and a mode
     entered by mistake costs a `Run`. */
  'rb.control.mode': 'Question',
  'rb.mode.trend': 'Trend',
  'rb.mode.funnel': 'Funnel',
  'rb.mode.table': 'Data table',
  'rb.mode.cohort': 'Retention',
  'rb.mode.journey': 'Journeys',
  'rb.mode.trend.hint': 'How a number moved over a range.',
  'rb.mode.funnel.hint': 'Of the people who did one thing, how many went on to do the next.',
  'rb.mode.table.hint': 'The same numbers as a trend, listed rather than drawn.',
  'rb.mode.cohort.hint': 'Of the people who arrived in one month, how many were still here later.',
  'rb.mode.journey.hint': 'What people did next, after one event.',

  /* ── why a control is disabled, per mode — the layer’s own keys ────────── */

  /* The mode decided this, and the sentence says which mode and what it
     decided. D9 CQ-3: the option stays on screen, off, carrying its reason —
     an operator who cannot see that a funnel is always bars will try to change
     it, and a control that vanishes teaches nothing. */
  'rb.chart.modeFixed': 'A {mode} is always drawn as a {chart}, so this cannot be changed here.',
  'rb.grain.modeFixed':
    'A {mode} has no calendar along the bottom, so it reads the whole range as one period.',

  'rb.funnel.needsSteps':
    'A funnel needs at least {min} steps to have a conversion between them. This one has {steps}.',
  'rb.funnel.tooManySteps':
    'A funnel reads up to {max} steps. This one has {steps}; remove some, or split it into two reports.',
  'rb.funnel.duplicateStep':
    'Step {position} repeats an earlier step. Two identical steps convert at 100 %, which measures nothing — change its measure, or give it a filter of its own.',

  'rb.cohort.needsAnchor': 'Choose the event that puts a person in a cohort and starts their clock.',
  'rb.cohort.anchorNotSubject':
    '{measure} counts days, not people, so there is nobody to follow. Choose an event that happens to a rider or a captain.',
  'rb.cohort.grainUnavailable':
    'Retention is measured a month at a time, because each person carries one last-seen date and nothing finer. Day and week need an activity history the product does not keep yet.',
  'rb.cohort.horizonOutOfRange':
    'A matrix reaches from M{min} to M{max}. This one asks for M{horizon}.',
  'rb.cohort.windowTooShort':
    'This range covers {periods} periods and the matrix needs {needed}. Widen the range, or ask for fewer columns.',

  'rb.journey.needsRoot': 'Choose the event every path starts from.',
  'rb.journey.rootNotSubject':
    '{measure} counts days, not people, so there is no path to follow. Choose an event that happens to a rider or a captain.',
  'rb.journey.depthOutOfRange':
    'A journey reads from {min} to {max} steps forward. This one asks for {depth}.',

  /* ─────────────────────── composing a funnel (P7-T3) ───────────────────── */

  'rb.funnel.steps': 'Steps',
  'rb.funnel.steps.unstarted':
    'No steps yet. Add the event people start from, then what they do next.',
  'rb.funnel.step': 'Step {position}',
  'rb.funnel.step.add': 'Add a step',
  'rb.funnel.step.removeLabel': 'Remove',
  'rb.funnel.step.remove': 'Remove step {position}',
  'rb.funnel.step.atMax': 'This funnel is at its limit of {max} steps.',
  'rb.funnel.filter.field': 'Filter field for step {position}',
  'rb.funnel.filter.value': 'Filter value for step {position}',
  'rb.funnel.filter.remove': 'Remove the {field} filter from step {position}',
  'rb.funnel.window': 'Time to convert',
  'rb.funnel.window.range': 'The whole date range',
  'rb.funnel.window.days': '{days} days',
  'rb.funnel.window.explain':
    'How long one person has to reach the last step from the first. The whole range means anyone who started inside it and finished inside it.',

  /* ────────────────────── composing a retention report ──────────────────── */

  'rb.cohort.anchor': 'Joining event',
  'rb.cohort.anchor.placeholder': 'Choose an event',
  'rb.cohort.anchor.explain': 'What puts a person in a cohort, and the month their clock starts.',
  'rb.cohort.return': 'Still here means',
  /* Rule 10 — the default is stated in words, never left blank. */
  'rb.cohort.return.own': 'Anything at all by the same person',
  'rb.cohort.grain': 'Cohorts grouped by',
  'rb.cohortGrain.day': 'Day',
  'rb.cohortGrain.week': 'Week',
  'rb.cohortGrain.month': 'Month',
  'rb.cohort.horizon': 'Columns',
  'rb.cohort.horizon.value': 'M0 to M{horizon}',
  'rb.cohort.horizon.explain':
    'How far past joining the matrix reaches. The date range has to be long enough to hold every column.',

  /* ────────────────────── composing a journey report ────────────────────── */

  'rb.journey.root': 'Starting event',
  'rb.journey.root.placeholder': 'Choose an event',
  'rb.journey.root.explain':
    'Every path starts here, and only what happened afterwards is counted.',
  'rb.journey.depth': 'Steps forward',
  'rb.journey.depth.value': '{depth} steps',
  'rb.journey.depth.explain': 'How many events after the start each path follows.',

  /* ──────────────── reading a funnel, a matrix and a tree ───────────────── */

  'rb.funnel.heading': 'Conversion funnel',
  'rb.cohort.heading': 'Retention',
  'rb.journey.heading': 'Journeys',
  /* Two different numbers, and both are labelled. A cascade that shows one of
     them unlabelled is how a funnel figure gets quoted as the wrong one. */
  'rb.funnel.conversion': '{percent} of step 1',
  'rb.funnel.conversion.none': 'No reading for this step',
  'rb.funnel.dropoff': '{percent} of the previous step did not reach this one.',
  'rb.cohort.col.cohort': 'Joined',
  /* R5-15 — the base travels with the percentage. */
  'rb.cohort.col.size': 'People',
  'rb.cohort.cell.none': 'No reading',
  'rb.cohort.survival':
    '{percent} of everyone counted here was still active a month after joining.',
  'rb.journey.entered': '{subjects} people started here.',
  'rb.journey.allStopped': 'Nobody did anything else inside this range.',
  'rb.journey.stopped': '{subjects} ({percent}) did nothing else inside this range.',
  'rb.journey.folded': '{subjects} ({percent}) are on paths outside the eight most common.',
  'rb.journey.share': '{percent} of everyone who started',

  /* The panel titles the data layer names for the three modes. Each is a
     heading, so it takes no period (rule 6). */
  'rb.panel.funnel': 'Conversion funnel',
  'rb.panel.cohort': 'Retention by joining month',
  'rb.panel.journey': 'Paths after the starting event',

  /* ──────────────────────────── the canvas ──────────────────────────────── */

  'rb.canvas.heading': 'Result',
  /* R8's SECOND kind of empty. Not the illustration: the data exists, the
     question has not been asked (AC-843). */
  'rb.canvas.unstarted': 'Choose a measure, then run the report.',
  /* The same second kind of empty, worded for a mode that has no measure
     picker: *choose a measure* is not what a funnel is waiting for. */
  'rb.canvas.unstarted.mode': 'Finish the question in the panel, then run the report.',
  'rb.canvas.stale': 'Showing the previous run, computed {time}. Run to update it.',
  'rb.canvas.asOf': 'Computed {time}',
  'rb.canvas.loading': 'Running the report',
  'rb.canvas.error': 'The report didn’t run. Your question is unchanged.',
  'rb.canvas.error.retry': 'Run again',
  'rb.canvas.invalid': 'This report can’t run yet. The panel says why.',
  'rb.canvas.link.copy': 'Copy link to this report',
  'rb.canvas.link.copied': 'Link copied',

  /* ─────────── conditions the result states out loud, never silently ─────── */

  'rb.warning.gaps':
    'Part of this range is outside what is recorded, so the chart breaks rather than reading zero.',
  'rb.warning.partial':
    'The first or last bucket is incomplete. It is drawn and marked, and left out of any comparison.',
  'rb.warning.groupsFolded': 'The smallest {count} groups are folded into Other.',
  'rb.warning.truncated':
    'This report hit the {rows}-row cap, so it is short. It is not the whole answer.',
  'rb.warning.chartCoerced': 'Showing a {chartType}: a {requested} is no longer legal here.',
  /* A funnel whose steps do not all name the same kind of person cannot follow
     anybody, so the conversion between its steps is a ratio of two totals and
     not a rate at which people progressed. Said out loud, because the picture
     is identical either way. */
  'rb.warning.funnelCounted':
    'These steps count totals rather than following the same people, because they are not all about the same kind of person. Read the percentages as a ratio between two totals.',
  'rb.warning.modeNotResolved': 'This kind of report is not available from this server yet.',
  'rb.warning.pathsFolded': 'The {count} least common paths are grouped together.',

  /* ───────────────────────────── a panel ────────────────────────────────── */

  'rb.panel.measure': '{measure}',
  'rb.panel.measureByGroup': '{measure} — {group}',
  /* The base, stated. A number whose base is only in its definition gets quoted
     without it, so the base sits on the panel and not in a tooltip. */
  'rb.panel.readings': '{readings} of {total} buckets have a reading.',
  /* A distribution's base is its PARTS, not its buckets — it has one bucket by
     construction. Two sentences because they count two different things, and
     one sentence doing both would be wrong in whichever case it was not
     written for. */
  'rb.panel.parts': '{readings} of {total} groups have a reading.',
  'rb.panel.coverage': 'Recorded from {from} to {to}.',
  'rb.panel.other': 'Other',
  'rb.panel.blocked': 'You don’t have the "{permission}" permission, so this measure isn’t shown.',
  'rb.panel.failed': 'This measure didn’t load. The rest of the report did.',
  'rb.panel.failed.retry': 'Load this measure',
  'rb.panel.axis': 'Measured in {unit}',
  'rb.panel.chart.description': '{title}, {from} to {to}',

  'rb.unit.count': 'whole numbers',
  'rb.unit.money': 'Saudi riyals',
  'rb.unit.percent': 'per cent',
  'rb.unit.ratio': 'a ratio',
  'rb.unit.rating': 'a rating',
  'rb.unit.minutes': 'minutes',
  'rb.unit.days': 'days',

  'rb.table.bucket': 'Bucket',
  'rb.table.value': 'Value',
  'rb.table.series': 'Series',
  'rb.table.partial': 'Incomplete',
  'rb.table.role.current': 'This period',
  'rb.table.role.comparison': 'Previous period',

  'rb.legend.range': '{from} – {to}',
  'rb.legend.noCompare': 'No comparison period',

  /* ───────────────────────── measure picker states ──────────────────────── */

  'rb.catalogue.loading': 'Loading the measures',
  'rb.catalogue.error': 'The measures didn’t load.',
  'rb.catalogue.retry': 'Try again',
  'rb.catalogue.empty': 'No measures match.',

  /* ────────────────────────── saving a report ───────────────────────────── */

  'rb.save': 'Save',
  'rb.saveAs': 'Save as new',
  'rb.save.title': 'Save this report',
  'rb.saveAs.title': 'Save as a new report',
  'rb.save.name': 'Name',
  'rb.save.description': 'Description',
  'rb.save.visibility': 'Who can see it',
  'rb.save.visibility.private': 'Only me',
  'rb.save.visibility.team': 'The team',
  'rb.save.confirm': 'Save report',
  'rb.save.cancel': 'Cancel',
  'rb.save.failed': 'The report wasn’t saved. Nothing was changed.',
  'rb.save.invalid.name-required': 'Enter a name.',
  'rb.save.invalid.name-too-long': 'Use {max} characters or fewer.',
  'rb.save.invalid.query-invalid': 'Fix the question in the panel first.',
  'rb.save.invalid.no-tiles': 'Add at least one report.',
  'rb.save.invalid.threshold-required': 'Enter a threshold.',
  'rb.save.invalid.series-unknown': 'Choose a series.',
  'rb.save.invalid.report-unsaved': 'Save the report first.',
  'rb.save.invalid.recipient-not-permitted': 'That person can’t see this measure.',

  'rb.export': 'Export CSV',

  /* §8.3 states 11 and 12. */
  'rb.report.changed': 'Someone else saved this report. Your edits are untouched.',
  'rb.report.changed.action': 'Reload it',
  'rb.report.deleted': 'This report was deleted. You can still save what you have as a new one.',

  /* ─────────────────────────── the library ──────────────────────────────── */

  'rb.library.new': 'New report',
  'rb.library.search': 'Search reports',
  'rb.library.tab.all': 'All',
  'rb.library.tab.mine': 'Mine',
  'rb.library.tab.team': 'Team',
  'rb.library.col.name': 'Report',
  'rb.library.col.owner': 'Owner',
  'rb.library.col.visibility': 'Visibility',
  'rb.library.col.updated': 'Updated',
  'rb.library.col.pinned': 'On dashboards',
  'rb.library.open': 'Open',
  'rb.library.delete': 'Delete',
  'rb.library.firstRun.heading': 'Ask the business a question',
  'rb.library.firstRun.body':
    'Pick a measure and a range, then compare it with a second measure or with the period before. Save what you want to keep.',
  'rb.library.firstRun.action': 'New report',
  'rb.library.noMatch': 'No report matches these filters.',
  'rb.library.noMatch.action': 'Clear filters',
  'rb.library.error': 'The reports didn’t load. The filters are unchanged.',
  'rb.library.error.retry': 'Try again',

  'rb.delete.title': 'Delete {name}?',
  'rb.delete.body': 'The report goes; nothing it counted changes.',
  'rb.delete.confirm': 'Delete report',
  'rb.delete.cancel': 'Cancel',
  /* §11.3 — the refusal NAMES the dashboards, because `deleteReport` returns
     them. A generic refusal here would throw away data the client already has. */
  'rb.delete.pinned.title': 'This report is on other dashboards',
  'rb.delete.pinned.body': 'Deleting {name} removes it from each of these:',
  'rb.delete.pinned.confirm': 'Remove from those dashboards and delete',
  'rb.delete.failed': 'The report wasn’t deleted. Nothing was changed.',

  /* ────────────────────────── dashboards (§11) ──────────────────────────── */

  'rb.dashboards.new': 'New dashboard',
  'rb.dashboards.search': 'Search dashboards',
  'rb.dashboards.col.name': 'Dashboard',
  'rb.dashboards.col.tiles': 'Reports',
  'rb.dashboards.col.updated': 'Updated',
  'rb.dashboards.open': 'Open',
  'rb.dashboards.firstRun.heading': 'Put the reports you read every morning in one place',
  'rb.dashboards.firstRun.body':
    'A dashboard is an ordered list of saved reports. It shows each one’s current definition, so editing a report updates every dashboard that holds it.',
  'rb.dashboards.firstRun.action': 'New dashboard',
  'rb.dashboards.noMatch': 'No dashboard matches this search.',
  'rb.dashboards.noMatch.action': 'Clear search',
  'rb.dashboards.error': 'The dashboards didn’t load. The filters are unchanged.',

  /* ─────────────── the dashboards view and one dashboard ───────────────── */

  'rb.dashboards.delete': 'Delete',
  'rb.dashboards.delete.title': 'Delete {name}?',
  /* The asymmetry with a report's delete, said plainly. §11: a dashboard is a
     view over reports, so losing it loses an arrangement; losing a report
     loses a definition several dashboards may be showing. */
  'rb.dashboards.delete.body':
    'The board goes and the reports on it stay. Nothing they count changes.',
  'rb.dashboards.delete.confirm': 'Delete dashboard',
  'rb.dashboards.delete.cancel': 'Cancel',
  'rb.dashboards.delete.failed': 'The dashboard wasn’t deleted. Nothing was changed.',

  'rb.dashboards.new.title': 'New dashboard',
  /* AC-865 — a dashboard with no reports is valid, and the copy says so rather
     than letting an operator think they have to choose reports first. */
  'rb.dashboards.new.body': 'Give it a name. You can add reports to it straight after.',
  'rb.dashboards.new.name': 'Name',
  'rb.dashboards.new.confirm': 'Create dashboard',
  'rb.dashboards.new.cancel': 'Cancel',
  'rb.dashboards.new.failed': 'The dashboard wasn’t created. Nothing was changed.',

  'rb.dashboard.back': 'All dashboards',
  'rb.dashboard.loading': 'Loading the dashboard',
  'rb.dashboard.error': 'The dashboard didn’t load.',
  'rb.dashboard.retry': 'Try again',
  'rb.dashboard.save.failed': 'That change wasn’t saved. The board is showing what the server holds.',

  'rb.dashboard.add': 'Add a report',
  'rb.dashboard.add.title': 'Add a report to this dashboard',
  /* AC-867 stated where the decision is made: the tile points at the report,
     so editing the report changes every board that holds it. */
  'rb.dashboard.add.body':
    'The board shows the report’s current definition, so editing the report updates every dashboard that holds it.',
  'rb.dashboard.add.loading': 'Loading the saved reports',
  'rb.dashboard.add.error': 'The reports didn’t load.',
  'rb.dashboard.add.empty': 'There are no saved reports yet. Save one, then pin it here.',
  /* §11.2 — offered and disabled with the reason, never filtered out: an
     operator looking for a report they pinned last week needs to see that it is
     already here rather than conclude it was deleted. */
  'rb.dashboard.add.already': 'Already on this dashboard.',
  'rb.dashboard.add.cancel': 'Cancel',

  'rb.dashboard.empty.heading': 'This dashboard has no reports yet',
  'rb.dashboard.empty.body': 'Add a saved report and it appears here, in the order you choose.',
  'rb.dashboard.empty.action': 'Add a report',
  'rb.dashboard.tile.moveUp': 'Move {name} up',
  'rb.dashboard.tile.moveDown': 'Move {name} down',
  /* The visible label names the ACTION; the accessible name names the tile, so
     a screen reader user moving through six tiles hears which one each button
     acts on while the lane stays readable. */
  'rb.dashboard.tile.remove': 'Remove tile',
  'rb.dashboard.tile.removeA11y': 'Remove {name}',
  'rb.dashboard.tile.missing': 'The report this tile pointed at no longer exists.',
  'rb.dashboard.tile.retry': 'Try again',
  'rb.dashboard.tile.error': 'This tile didn’t load. The rest of the dashboard did.',
  'rb.dashboard.tile.open': 'Open {name}',

  /* ──────────────────────────── alerts (§12) ────────────────────────────── */

  'rb.alerts.new': 'New alert',
  'rb.alerts.search': 'Search alerts',
  'rb.alerts.col.name': 'Alert',
  'rb.alerts.col.state': 'State',
  'rb.alerts.col.rule': 'Fires when',
  'rb.alerts.col.cadence': 'Checked',
  'rb.alerts.col.lastValue': 'Last reading',
  'rb.alerts.col.lastEvaluated': 'Last checked',
  'rb.alerts.firstRun.heading': 'Be told when a number crosses a line',
  'rb.alerts.firstRun.body':
    'An alert watches one series of one saved report and posts to the notification centre when it crosses your threshold.',
  'rb.alerts.firstRun.action': 'New alert',
  'rb.alerts.noMatch': 'No alert matches this search.',
  'rb.alerts.noMatch.action': 'Clear search',
  'rb.alerts.error': 'The alerts didn’t load. The filters are unchanged.',

  /* R5a permits red in four places and a threshold breach is none of them. The
     state is carried by the WORD plus a `warning`-tone badge from R7's closed
     five-tone set (AC-885). */
  'rb.alert.state.armed': 'Armed',
  'rb.alert.state.firing': 'Firing',
  'rb.alert.state.cooling': 'Cooling',
  'rb.alert.state.suspended': 'Suspended',
  'rb.alert.state.error': 'Not working',
  'rb.alert.disabled': 'Off',
  'rb.alert.muted': 'Muted until {time}',

  /* AC-878 — ONE key with named parameters. `higherIsBetter` rides along
     because a rising cancellation rate crossing a line is not the same news as
     a rising revenue one, and no screen can derive that from the sign. */
  'rb.alert.sentence': '{measure} {comparator} {threshold}, read on the last complete {grain}.',
  'rb.alert.comparator.gt': 'goes above',
  'rb.alert.comparator.gte': 'reaches',
  'rb.alert.comparator.lt': 'falls below',
  'rb.alert.comparator.lte': 'falls to or below',
  /* **Which of the two depends on the comparator AND on `higherIsBetter`, and
     neither alone answers it.** Revenue is a measure where higher is better, so
     revenue going ABOVE a line is good news and revenue falling BELOW one is
     not — the same measure, opposite readings. F-7 asks for the field precisely
     so the builder can *"word a comparator honestly and decide whether over the
     line is good news"*; combining the two is that, and reading either alone is
     the defect. */
  'rb.alert.direction.good': 'Crossing this line is good news.',
  'rb.alert.direction.bad': 'Crossing this line is bad news.',

  'rb.alert.suspended.ownerLostAccess':
    'It stopped because its owner can no longer see the measure. Only its owner or an admin can resolve it.',
  'rb.alert.error.runFailed':
    'It stopped after the report could not be read on five checks in a row. Its owner was told once.',

  /* The two unset fields, surfaced AS unset. AC-453: an invented window is
     indistinguishable from a measured one once it ships. */
  'rb.alert.cadence.unset': 'Not set',
  'rb.alert.cadence.explain':
    'No checking schedule has been set for this product, and nothing checks these rules while the tab is closed. Until that is decided, a rule keeps its settings and does not run.',
  'rb.alert.rearm.unset': 'Not set',
  'rb.alert.rearm.explain':
    'A rule fires once on crossing and re-arms when the value comes back inside the line. No minimum wait has been set.',

  'rb.alert.form.title': 'New alert',
  'rb.alert.form.edit': 'Edit alert',
  'rb.alert.form.name': 'Name',
  'rb.alert.form.report': 'Report',
  'rb.alert.form.report.unsaved': 'An alert watches a saved report. Save this one first.',
  'rb.alert.form.series': 'Series',
  'rb.alert.form.comparator': 'Fires when the value',
  'rb.alert.form.threshold': 'Threshold',
  'rb.alert.form.threshold.unit': 'In {unit}',
  'rb.alert.form.grain': 'Reads the last complete',
  'rb.alert.form.cadence': 'Checked',
  'rb.alert.form.recipients': 'Also tell',
  'rb.alert.form.enabled': 'On',
  'rb.alert.form.report.loading': 'Loading the saved reports',
  'rb.alert.form.report.error': 'The saved reports didn’t load.',
  'rb.alert.form.series.unstarted': 'Choose a report first.',
  'rb.alert.form.series.loading': 'Reading the report’s series',
  'rb.alert.form.series.error': 'The report didn’t run, so its series are unknown.',
  'rb.alert.form.series.empty': 'This report has no series you can read.',
  'rb.alert.form.muted': 'Muted',
  'rb.alert.form.muted.none': 'Not muted',
  'rb.alert.form.muted.clear': 'Un-mute',
  /* AC-891 is blocked on D4. The field is present and off, saying why — an
     absent field is a decision nobody can see. */
  'rb.alert.form.recipients.count': 'Currently telling {count} people',
  'rb.alert.form.recipients.blocked':
    'Who else gets told cannot be chosen yet: an operator who cannot see this measure is not allowed to receive the alert, and permissions are not yet fine-grained enough to work that out. The people already on this rule keep getting told.',
  'rb.alert.form.save': 'Save alert',
  'rb.alert.form.cancel': 'Cancel',
  'rb.alert.form.failed': 'The alert wasn’t saved. Nothing was changed.',

  /* AC-877 — it says *would have fired*, never *fired*. */
  'rb.alert.test': 'Test this rule',
  'rb.alert.test.running': 'Testing',
  'rb.alert.test.wouldFire':
    'It read {value} for the {grain} starting {bucket}. It would have fired.',
  'rb.alert.test.wouldNotFire':
    'It read {value} for the {grain} starting {bucket}. It would not have fired.',
  'rb.alert.test.noBucket': 'There is no complete bucket in this range to read.',
  'rb.alert.test.seriesMissing': 'That series is no longer in the report.',
  'rb.alert.test.seriesBlocked': 'You don’t have permission to read that series.',
  'rb.alert.test.reportMissing': 'The report this alert watches no longer exists.',
  'rb.alert.test.noChange': 'Testing changes nothing and tells nobody.',
  'rb.alert.test.failed': 'The test didn’t run.',
}
