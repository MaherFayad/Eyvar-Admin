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
 * ## A key with no reader is not a translation, it is a liability
 *
 * **Fifteen keys were deleted from this file and from `i18n/ar/reports.ts` in
 * one change**, after a full sweep: every `rb.*` key here was matched against
 * all of `src/` with comments stripped, both as a literal and against every
 * template that builds a key (`` `rb.grain.${g}` ``, `` `rb.${mode}.heading` ``
 * and thirty-five others). The fifteen had **no reader at all** — not in a
 * component, not in a resolver, not in a test.
 *
 * They cost more than the bytes. Each one was a string a translator had already
 * been paid to write, an entry in the count `dictionaries.ts` states, and — the
 * expensive part — a piece of *evidence for a feature that does not exist*.
 * `rb.panel.expand` outlived the prop it named by exactly the commit that
 * deleted the prop; `rb.panel.axis` described a y-axis label the plot has never
 * drawn; `rb.library.tab.all / .mine / .team` describe a three-tab filter the
 * library does not have. Reading this file, all three looked shipped.
 *
 * The deleted set, with what each one claimed:
 *
 *   `rb.panel.coverage`   `rb.panel.axis`   `rb.panel.expand`
 *   `rb.table.bucket`     `rb.report.changed`  `rb.report.changed.action`
 *   `rb.library.tab.all`  `rb.library.tab.mine`  `rb.library.tab.team`
 *   `rb.library.col.pinned`  `rb.dashboard.back`
 *   `rb.alerts.col.rule`  `rb.alert.rearm.unset`  `rb.alert.test.running`
 *
 * A deletion is reversible and a wrong claim is not, so the rule going forward
 * is the sweep's: **a key lands in the same change as its reader.** The scan
 * takes about a second and there is nothing clever in it — strip comments, then
 * look for the literal or a template whose shape it fits.
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
  'rb.control.window.cancel': 'Cancel',
  'rb.control.window.from': 'From',
  'rb.control.window.to': 'To',
  'rb.control.window.custom': 'Custom range',
  'rb.control.window.range': '{from} – {to}',
  'rb.control.grain': 'Grain',
  'rb.control.compare': 'Compare to',
  'rb.control.chartType': 'Chart type',
  /* **`Run` became `Refresh`, and the KEY did not move.**
     The canvas follows the question now — it re-runs itself 350ms after the
     last edit — so the rail's primary is no longer the thing that makes the
     report happen; it is the thing that asks the same question again, for an
     operator who wants the numbers as of now rather than as of the last edit.
     "Run" would name a commit that no longer exists.
     The key stays `rb.control.run` deliberately: it is this control's stable
     id, three suites owned by other roles resolve the button through it, and
     renaming it would orphan a key and break them for a word. Flagged in the
     handoff for i18n to rename with its call sites when it is cheap. */
  'rb.control.run': 'Refresh',
  'rb.control.disabled.unstarted': 'Choose a measure first.',

  /* ─────────────────────────── the chart toolbar ────────────────────────── */

  /* §A7 — the row above the plot. The rail is *what am I asking*; this row is
     *how am I looking at it*, and its strings are labels for controls that sit
     side by side without a stacked `<Label>` above each one. */
  'rb.toolbar.heading': 'Chart controls',
  'rb.toolbar.range': 'Quick range',
  /* The four rolling windows, short enough to sit in a segmented group. They
     name THIS product's own presets — the nine in `REPORT_PRESETS` — and the
     full nine stay one click away in the range popover. Never assembled from a
     number and a word (AC-896). */
  'rb.toolbar.range.last-7d': '7 days',
  'rb.toolbar.range.last-30d': '30 days',
  'rb.toolbar.range.last-90d': '90 days',
  'rb.toolbar.range.last-365d': '365 days',
  /* The comparison carries its own way off — a control that can only be turned
     off by finding "No comparison" in a menu is one an operator leaves on by
     accident. */
  'rb.toolbar.compare.clear': 'Clear the comparison',

  /* ── the visualisation picker — ONE control, seven shapes ──────────────
     The mode strip is gone. Amplitude's `Line chart ⌄` is the only place a
     shape is chosen, and the business owner's ruling folds the three mode
     reports into it: *"rather than funnel, or retention or journeys, make
     them chart types"*. So these seven labels name what the answer LOOKS
     like, and `(mode, chartType)` is the pair each one resolves to — the
     query type is untouched.

     They are full names — `Line chart`, not `Line` — because the trigger
     shows the chosen one on its own with no group label beside it, and a
     trigger reading `Line` names nothing. `rb.chartType.*` keeps the short
     words: they still label the legality reasons, where the sentence around
     them supplies the noun. */
  'rb.viz.label': 'Chart type',
  'rb.viz.line': 'Line chart',
  'rb.viz.bar': 'Bar chart',
  'rb.viz.pie': 'Pie chart',
  'rb.viz.table': 'Data table',
  'rb.viz.cohort': 'Retention',
  'rb.viz.funnel': 'Funnel',
  'rb.viz.journey': 'Journeys',

  /* ── the numbers above the plot (§A8) ──────────────────────────────────
     Amplitude puts one big figure per series directly above the chart, over
     two grey lines: what the number covers, and what its delta is measured
     against. Both are dates, so both are keys rather than assembled strings
     (AC-896). */
  'rb.headline.window': 'over {range}',
  'rb.headline.from': 'from {date}',

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
  /* **No longer "then run the report".** The report runs itself the moment the
     question is legal, so an instruction to press something names a step that
     does not exist and sends the operator hunting for a button. What is left is
     the one thing still owed: the measure. */
  'rb.canvas.unstarted': 'Choose a measure to see the report.',
  /* The same second kind of empty, worded for a mode that has no measure
     picker: *choose a measure* is not what a funnel is waiting for. */
  'rb.canvas.unstarted.mode': 'Finish the question in the panel to see the report.',
  /* §8.3 state 2. It used to end *"Run to update it."*; the canvas updates
     itself now, and the sentence must not promise an action that is gone. What
     is left is the fact — these numbers are the previous run's — which is true
     both in the moment before the debounce fires AND in the one case where it
     stands: a question that is currently illegal, whose reason is already on
     screen beside the control that carries it. The leading clause is unchanged
     so the claim reads identically wherever it is quoted. */
  'rb.canvas.stale': 'Showing the previous run, computed {time}.',
  'rb.canvas.asOf': 'Computed {time}',
  'rb.canvas.loading': 'Running the report',
  'rb.canvas.error': 'The report didn’t run. Your question is unchanged.',
  'rb.canvas.error.retry': 'Run again',
  'rb.canvas.invalid': 'This report can’t run yet. The panel says why.',
  'rb.canvas.link.copy': 'Copy link to this report',
  'rb.canvas.link.copied': 'Link copied',
  /* The clipboard can be refused (no permission, an insecure origin). The
     refusal names what did NOT happen and what is untouched, in the same
     shape as `rb.canvas.error` — never a silent failure. */
  'rb.canvas.link.failed': 'The link wasn’t copied. Your report is unchanged.',

  /* §A11 — the table renders WITH the chart, not instead of it, so it needs a
     heading of its own. It names what the rows are, not what the control does. */
  'rb.canvas.table.heading': 'The numbers behind this chart',

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
  'rb.panel.other': 'Other',
  'rb.panel.blocked': 'You don’t have the "{permission}" permission, so this measure isn’t shown.',
  'rb.panel.failed': 'This measure didn’t load. The rest of the report did.',
  'rb.panel.failed.retry': 'Load this measure',
  'rb.panel.chart.description': '{title}, {from} to {to}',

  /* ── §A12 / §1.5 — the card's own chrome ───────────────────────────────
     `chartKind` is the sr-only name behind the corner glyph: §7.5 says a shape
     is never the sole carrier, and a `title` on the SVG would be a name only a
     mouse could reach. `reload` is worded for a panel that loaded FINE —
     `rb.panel.failed.retry` ("Load this measure") is the failed body's button
     and reads as a first attempt, which is wrong in a standing menu. */
  'rb.panel.chartKind': 'Shown as a {chartType} chart',
  'rb.panel.actions': 'Actions for this panel',
  'rb.panel.reload': 'Reload this measure',

  /* §A9's `TOP 4` pill. It is rendered ONLY where the split was actually
     capped, so the word "top" is a fact about the picture and not a flourish. */
  'rb.panel.top': 'Top {count}',
  /* §A9's `[Previous] name` marker, in front of the dated chip rather than
     instead of it — §3.7 requires the legend to name both periods with dates
     (AC-832) and that is strictly more than the marker alone says. */
  'rb.panel.legend.previous': '[Previous]',

  /* §A10 — the tooltip card. `on {date}` names the bucket a COMPARISON reading
     was taken in: the two windows are zipped by index, so it is a different day
     from the heading's by definition, and printing the two under one date is a
     false statement rather than a missing one. */
  'rb.panel.tooltip.on': 'on {date}',
  /* The footer. A real destination, resolved from `displayedAsMetricKeys`, or
     no footer at all — never "Click for Actions" over nothing. */
  'rb.panel.tooltip.board': 'Also on the {board} board',
  /* §A10's `Click for Actions`, as a fact rather than a slogan. It replaces the
     line above ONLY where the mark under the cursor really is clickable, so the
     tooltip never promises an action the panel does not draw. Amplitude's own
     line is text, not a link — and a link here would be unreachable anyway,
     because a Recharts tooltip wrapper is not a pointer-events target. */
  'rb.panel.tooltip.action': 'Click to open the {board} board',

  /* §P4 — the thing the click actually does, as a real anchor one row under the
     plot. An imperative, because it is an action; §A12's strip below it is a
     statement about the catalogue and is worded as one. */
  'rb.panel.action.open': 'Open the {board} board',

  /* ── §A12 — the closing strip ──────────────────────────────────────────
     Amplitude's `Related Charts` is a similarity model. This is not: it is
     F-9's back-reference, naming the boards that display THIS measure over THIS
     population. The heading says exactly that and claims nothing more. */
  'rb.related.heading': 'This measure also appears on',

  'rb.unit.count': 'whole numbers',
  'rb.unit.money': 'Saudi riyals',
  'rb.unit.percent': 'per cent',
  'rb.unit.ratio': 'a ratio',
  'rb.unit.rating': 'a rating',
  'rb.unit.minutes': 'minutes',
  'rb.unit.days': 'days',

  'rb.table.value': 'Value',
  'rb.table.series': 'Series',
  'rb.table.partial': 'Incomplete',
  'rb.table.role.current': 'This period',
  'rb.table.role.comparison': 'Previous period',

  /* ── §A11 — the table's own header row ─────────────────────────────────
     The search and the export sit WITH the rows they act on, not in the page's
     overflow: a CSV button three clicks away in a menu is a button nobody
     finds, and §A11 puts `⎙ Export CSV` on the table for that reason.
     `sort` is the button's accessible name; the `<th>`'s `aria-sort` carries
     which way it is currently sorted, so the two are not one string doing two
     jobs. */
  'rb.table.search': 'Search series',
  'rb.table.search.empty': 'No series match that search.',
  'rb.table.export': 'Export CSV',
  'rb.table.sort': 'Sort by {column}',

  /* ── §A11's trailing column — and it is NOT `Row Average` ───────────────
     Amplitude closes every row with an average. An average of thirty daily
     counts is not a number anybody asked for, and an average of thirty
     end-of-period levels is not even a level. So the header names the SPAN
     ("over the window") and each cell names its own measure's declared
     aggregate, which is the only honest way one column can carry two measures.
     The note renders only where the table actually holds an incomplete bucket:
     the rollup leaves it out (§3.5 / AC-818) and a number that quietly excludes
     something is a number that misreports its base. */
  'rb.table.window': 'Over the window',
  'rb.table.window.note': 'Complete buckets only.',
  'rb.table.window.sum': 'total',
  'rb.table.window.mean': 'average',
  'rb.table.window.latest': 'latest reading',
  /* The fourth answer, and the one that stops a number being invented. A
     cohort series is retention PER CENT — the catalogue's `count` aggregate
     belongs to the measure it was anchored on, not to these numbers, and
     applying it rendered `1,200% total` on a shipped dashboard. Lowercase and
     in the same slot as the three above, because it is the same fact about the
     cell: what kind of number is this. Here, the honest answer is none. */
  'rb.table.window.undeclared': 'no stated way to combine these',

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
  /* The dialog's DESCRIPTION. It used to render `rb.save.visibility`, which is
     the visibility LEGEND — so the sentence under the title read "Who can see
     it", a label doing a description's job and saying nothing about what the
     dialog is for. */
  'rb.save.describe': 'Name this report so someone else can find it later.',
  'rb.save.name': 'Name',
  'rb.save.description': 'Description',
  'rb.save.visibility': 'Who can see it',
  'rb.save.visibility.private': 'Only me',
  'rb.save.visibility.team': 'The team',
  /* The consequence, under the control that causes it. `Only me` and `The team`
     name a setting; these name what the setting DOES. Rendered as text bound to
     the radio with `aria-describedby` — never a tooltip, which an unfocused or
     disabled control can never open. */
  'rb.save.visibility.private.consequence': 'Only you can open this report.',
  'rb.save.visibility.team.consequence': 'Anyone on the team can open and run it.',
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

  /* Pinning at save time. Optional, and the default is not-pinned — so the
     picker's own four states are the four states of an OPTIONAL control: none
     of them may block the save. */
  'rb.save.addTo': 'Add to a dashboard',
  'rb.save.addTo.none': 'Don’t add it to a dashboard',
  'rb.save.addTo.loading': 'Loading the dashboards',
  'rb.save.addTo.error': 'The dashboards didn’t load. You can still save the report.',
  'rb.save.addTo.error.retry': 'Try again',
  'rb.save.addTo.empty': 'There are no dashboards yet.',
  /* Two mutations, two outcomes, and the second one failing does not undo the
     first. The sentence says both halves in the order they happened. */
  'rb.save.addTo.failed': 'The report was saved. It wasn’t added to the dashboard.',
  'rb.save.addTo.failed.retry': 'Try adding it again',

  'rb.export': 'Export CSV',

  /* ───────────────── the title block and the header actions ─────────────── */

  /* §A5 — the report names itself and says what question it answers, in the
     header, editable in place. The name is a DRAFT until `Save` writes it:
     nothing in this module commits on a keystroke. */
  'rb.title.label': 'Report name',
  'rb.title.placeholder': 'Untitled report',
  'rb.description.label': 'Report description',
  'rb.description.placeholder': 'What question does this report answer?',
  /* R7 tones: `Draft` is `info` — not yet live. `Saved` is `neutral` — an inert
     factual outcome, and deliberately not `success`, which R7 reserves for
     money settled and work complete. */
  'rb.state.draft': 'Draft',
  'rb.state.saved': 'Saved',
  /* Derived from `pinnedToDashboardIds`, which is why it belongs in §8's meta
     slot: it changes when the data changes. A plural FAMILY, never
     `count + ' dashboards'` — Arabic marks exactly-two grammatically. */
  'rb.header.dashboards#one': 'On 1 dashboard',
  'rb.header.dashboards#other': 'On {count} dashboards',

  /* §A6 / B4 — the overflow's export submenu. §11.2: gate at RENDER. PNG and
     PDF are listed, off, and say why; hiding them would leave an operator
     hunting for an export this product does not have. */
  'rb.export.menu': 'Export',
  'rb.export.png': 'Export PNG',
  'rb.export.pdf': 'Export PDF',
  'rb.export.blocked': 'Image export isn’t built. Export CSV instead.',

  /* §8.3 states 11 and 12. */
  'rb.report.deleted': 'This report was deleted. You can still save what you have as a new one.',

  /* ─────────────────────────── the library ──────────────────────────────── */

  'rb.library.new': 'New report',
  'rb.library.search': 'Search reports',
  'rb.library.col.name': 'Report',
  /* T9.13 — Amplitude's library shape. Three facts an operator narrows on, as
     columns with filters, rather than prose under every name. */
  'rb.library.col.type': 'Type',
  'rb.library.col.owner': 'Owner',
  'rb.library.col.lastRun': 'Last run',
  'rb.library.col.visibility': 'Visibility',
  'rb.library.col.updated': 'Updated',
  'rb.library.open': 'Open',
  /* An alert is an action ON a report, not only a destination. Without this the
     only route in is the Alerts sub-tab, which then asks the operator to
     re-pick by name the report they had just left. */
  'rb.library.createAlert': 'Create alert',
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
  /* Derivable, never invented: `Dashboard.ownerId` is on the record and the
     team roster resolves it. On a shared install “whose board is this?” was
     unanswerable from the list. */
  'rb.dashboards.col.owner': 'Owner',
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
  /* The same field a saved report already carries. A report can say what
     question it answers; without this a board could not say what it is for. */
  'rb.dashboards.new.description': 'Description',
  'rb.dashboards.description.placeholder':
    'What is this board for? Say it here so the next person doesn’t have to guess.',
  'rb.dashboards.new.confirm': 'Create dashboard',
  'rb.dashboards.new.cancel': 'Cancel',
  'rb.dashboards.new.failed': 'The dashboard wasn’t created. Nothing was changed.',
  /* R9 — <object> <past-participle>, sentence case, no terminal period, and it
     echoes the name the operator typed rather than saying “Dashboard saved”. */
  'rb.dashboards.created.toast': '{name} created',
  'rb.dashboards.deleted.toast': '{name} deleted',

  'rb.dashboard.loading': 'Loading the dashboard',
  'rb.dashboard.error': 'The dashboard didn’t load.',
  'rb.dashboard.retry': 'Try again',
  'rb.dashboard.save.failed': 'That change wasn’t saved. The board is showing what the server holds.',

  /* §8's second row, and it is METADATA: both halves are on the record and
     both change when the record does. One key with two named placeholders —
     never `owner + ' · ' + time`, which Arabic does not order the same way. */
  'rb.dashboard.meta': 'Owned by {owner} · Updated {time}',

  /* DESIGN.md:2779 forbids an inline editor that collapses on blur, so a
     rename is an explicit surface with an explicit commit. */
  'rb.dashboard.rename.action': 'Rename',
  'rb.dashboard.rename': 'Rename dashboard',
  'rb.dashboard.rename.body': 'The name and the description travel with the board. The reports on it are untouched.',
  'rb.dashboard.rename.confirm': 'Save changes',
  'rb.dashboard.rename.cancel': 'Cancel',
  'rb.dashboard.rename.failed': 'The dashboard wasn’t saved. Nothing was changed.',
  'rb.dashboard.saved.toast': '{name} saved',

  /* §C4/§C2 — the header primary is `Add content`, not `Add a report`, because
     it now opens a chooser rather than the picker: a report is one of the
     things that can go on a board and the word has to leave room for the
     second. The KEY is unchanged so nothing that references it has to move. */
  'rb.dashboard.add': 'Add content',
  /* §C2's described list. Amplitude offers four — `Existing content`,
     `New chart`, `Generate with AI`, `Text`. Two of those are real here.
     `Generate with AI` has no model endpoint behind it, and §11 defines a
     dashboard as a named ordered list of saved report ids, which a `Text` tile
     reopens; both are absent rather than disabled, because there is no feature
     to enable. The hints follow §E3: a name and a one-line purpose, never a
     bare label. */
  'rb.dashboard.addContent.title': 'Add content',
  'rb.dashboard.addContent.body': 'Pick what goes on the board next.',
  'rb.dashboard.addContent.existing': 'Existing report',
  'rb.dashboard.addContent.existing.hint':
    'Pin a report someone has already saved. The board shows its current definition.',
  'rb.dashboard.addContent.new': 'New report',
  'rb.dashboard.addContent.new.hint':
    'Open the builder on an empty question. Save the report, then pin it here.',
  /* The chooser and the picker are two steps of ONE surface, so the way back is
     a step and not a dismissal — cancelling here would lose the choice as well
     as the step. */
  'rb.dashboard.addContent.back': 'Back',
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

  /* §C1's empty board: an illustration, ONE sentence, ONE primary. Amplitude's
     sentence is *"Add a chart, insert text, or use a template to get started"*
     and names two things this product does not have — a text tile and a
     template gallery. Naming them here would advertise features nobody has
     built, so the sentence names what is actually on the other side of the
     button. */
  'rb.dashboard.empty.heading': 'This dashboard has no reports yet',
  'rb.dashboard.empty.body': 'Add a saved report and it appears here, in the order you choose.',
  'rb.dashboard.empty.action': 'Add content',
  /* §C4 — the description placeholder. The field is on the record and the
     rename dialog is where it is written, so this is a real control and not a
     decorative sentence: an empty description is the commonest state of a board
     somebody else made, and it is the one that costs the next reader the most. */
  'rb.dashboard.description.add': 'Say what this board is for',
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
  /* §C5's `⊞`, in the tile's inline-end corner. The same destination as the
     title link and a DIFFERENT accessible name: two buttons in one tile both
     answering to `Open {name}` is an ambiguity a screen-reader user cannot
     resolve by listening. */
  'rb.dashboard.tile.expand': 'Open {name} in the builder',

  /* §8.3 state 12 / AC-825 — a query invalidated by a catalogue change is NOT
     a deleted report, and it must not be offered `Remove tile` as its only
     way out. The violations under it are the same objects the builder renders. */
  'rb.dashboard.tile.invalid':
    'This tile’s report can no longer run. The report was changed after it was pinned.',
  /* §11.2's coarse reorder. `Move up` / `Move down` stay — AC-871 names them
     and they are the fast path — but moving the sixth tile to the top was five
     round-trips and five saves. A `Select` is keyboard-operable by
     construction, which is the objection that rejected a drag grid. */
  'rb.dashboard.tile.moveTo': 'Move {name} to position',
  'rb.dashboard.tile.position': 'Position {position} of {total}',
  /* The tile's own overflow. The trigger names the tile, so six of them stay
     distinguishable to a screen reader (§7.3 — present, never hover-only). */
  'rb.dashboard.tile.actions': 'Actions for {name}',
  'rb.dashboard.tile.added.toast': '{name} added to this dashboard',
  'rb.dashboard.tile.removed.toast': '{name} removed from this dashboard',
  'rb.dashboard.reordered.toast': 'Order saved',

  /* ───────────── §C4 — the board range, and what it drives ─────────────── */

  /* Amplitude's dashboards carry their own period control and every tile
     answers to it. Without one a board is nine unrelated windows: two tiles
     side by side can be a week and a year and nothing says so.

     **The default is named, not blank.** `Each report’s own range` is a real
     answer and the commonest one — it is what a board holds until somebody
     decides otherwise — so the trigger says it in those words rather than
     showing a range nothing is using. */
  'rb.dashboard.range': 'Board range',
  'rb.dashboard.range.own': 'Each report’s own range',
  'rb.dashboard.range.own.hint': 'Every tile answers with the window its report was saved with.',
  'rb.dashboard.range.custom': 'Custom range',
  'rb.dashboard.range.apply': 'Apply',
  'rb.dashboard.range.cancel': 'Cancel',
  'rb.dashboard.range.from': 'From',
  'rb.dashboard.range.to': 'To',
  'rb.dashboard.range.saved.toast': 'Board range saved',
  'rb.dashboard.range.cleared.toast': 'Board range cleared',

  /* §C4's `Add Filter`, in the EXISTING vocabulary — the same `FilterSpec` an
     index table emits (AC-814). There is no second filter model. */
  'rb.dashboard.filters': 'Board filters',
  'rb.dashboard.filters.add': 'Add filter',
  'rb.dashboard.filters.field': 'Field',
  'rb.dashboard.filters.value': 'Value',
  /* Distinct from the trigger's own `Add filter`: two buttons with one name
     in one surface is an ambiguity a screen-reader user cannot resolve by
     listening, and neither can a voice-control operator. */
  'rb.dashboard.filters.apply': 'Apply filter',
  'rb.dashboard.filters.cancel': 'Cancel',
  /* The consequence, stated under the control rather than in a help doc
     (principle 6): a board does not resolve its tiles, so which tiles this
     narrows is decided per tile and said on the tile. */
  'rb.dashboard.filters.hint':
    'Applies to every tile whose report can be filtered by that field. Any that can’t will say so.',
  'rb.dashboard.filters.empty': 'No measure in the catalogue can be filtered yet.',
  /* SC 2.5.3 — the visible chip text comes FIRST and whole in the accessible
     name, so a voice-control operator can say what they can see. */
  'rb.dashboard.filters.remove': 'Remove the {field} board filter',
  'rb.dashboard.filters.chip': '{field}: {value}',
  'rb.dashboard.filter.added.toast': '{field} filter added to this dashboard',
  'rb.dashboard.filter.removed.toast': '{field} filter removed from this dashboard',

  /* The per-tile indication. A tile that quietly ignored a control the operator
     can read two inches above it is the worst outcome available here: the
     numbers are right for a question nobody asked. */
  'rb.dashboard.tile.ownRange': 'Own range',
  'rb.dashboard.tile.ownRange.why':
    'The board range doesn’t work for this report, so it keeps the one it was saved with.',
  'rb.dashboard.tile.filterRefused': 'Not filtered by {field} — this report can’t be.',

  /* §C5 — the tile size, as a menu item rather than a drag. §11.2 rejected a
     drag grid on keyboard-operability grounds and that ruling has not moved. */
  'rb.dashboard.tile.span.full': 'Make full width',
  'rb.dashboard.tile.span.half': 'Make half width',
  'rb.dashboard.tile.span.fullA11y': 'Make {name} full width',
  'rb.dashboard.tile.span.halfA11y': 'Make {name} half width',
  'rb.dashboard.tile.span.toast': 'Layout saved',

  /* §E6/§E7 — the content list carries a preview. This one draws the board's
     LAYOUT, not its numbers: tile count and each tile's width are on the
     record, and running nine reports to paint a row of a table is not. */
  'rb.dashboards.col.range': 'Range',
  /* The preview itself carries no text and is `aria-hidden`: the count it
     draws is already a column, and a second reading of the same number is a
     second thing that can disagree with the first. */
  'rb.dashboards.duplicate': 'Duplicate',
  'rb.dashboards.duplicate.name': '{name} (copy)',
  'rb.dashboards.duplicate.failed': '{name} wasn’t duplicated. Nothing was changed.',

  /* ──────────────────────────── alerts (§12) ────────────────────────────── */

  'rb.alerts.new': 'New alert',
  'rb.alerts.search': 'Search alerts',
  'rb.alerts.col.name': 'Alert',
  'rb.alerts.col.state': 'State',
  'rb.alerts.col.cadence': 'Checked',
  /* The line the rule watches, beside the reading that is tested against it.
     Amplitude §H's principle — what needs attention reads at a glance — needs
     both numbers in view; one of them was only ever inside the rule sentence. */
  'rb.alerts.col.threshold': 'Threshold',
  'rb.alerts.col.lastValue': 'Last reading',
  'rb.alerts.col.lastEvaluated': 'Last checked',
  'rb.alerts.firstRun.heading': 'Be told when a number crosses a line',
  'rb.alerts.firstRun.body':
    'An alert watches one series of one saved report and posts to the notification centre when it crosses your threshold.',
  'rb.alerts.firstRun.action': 'New alert',
  'rb.alerts.noMatch': 'No alert matches this search.',
  'rb.alerts.noMatch.action': 'Clear search',
  'rb.alerts.error': 'The alerts didn’t load. The filters are unchanged.',
  /* The State column's `select` filter. It reads `filters[state]` and never
     `?view=` — the reports sub-tab owns that parameter, so the old one could
     not fire and shared a namespace with the tab strip. */
  'rb.alerts.filter.state': 'State',

  /* **R10 — a standing condition is a banner, not a footnote**, and this one
     contradicts the most authoritative element on every row. `Armed` and
     `Cooling` are present-tense words for a running machine; with
     `cadence: null` nothing is running, and the correction used to be a 12px
     grey paragraph rendered AFTER the table and below pagination. §5.2 permits
     ONE page-level banner, so the cadence sentence and the re-arm sentence are
     merged into it rather than stacked. */
  'rb.alerts.banner.title': 'Nothing is checking these rules',
  'rb.alerts.banner.body':
    'Every state below is the last one recorded, and no schedule will change it.',
  /* T9.15 — one sentence, then the action that answers it. The row note it
     replaces said the same thing once per row (R10). */
  'rb.alerts.banner.action': 'Test a rule',

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
  'rb.alert.rearm.explain':
    'A rule fires once on crossing and re-arms when the value comes back inside the line. No minimum wait has been set.',
  /* `lastEvaluatedAt: null`. A dash cannot tell "never checked" from "no data",
     and on this list every rule is the first of those. */
  'rb.alert.lastEvaluated.never': 'Never checked',

  'rb.alert.form.title': 'New alert',
  'rb.alert.form.edit': 'Edit alert',
  'rb.alert.form.name': 'Name',
  'rb.alert.form.report': 'Report',
  'rb.alert.form.report.unsaved': 'An alert watches a saved report. Save this one first.',
  /* **The preselected report, NAMED.** `rb.alert.form.report.unsaved` used to do
     double duty as this dialog's description until a series and a threshold
     existed — so an operator who pressed `Create alert` on a perfectly well
     saved report was told to save it first. `alerts.parity.test.tsx` reported
     that as a copy defect rather than working around it; this is the key it
     asked for, and it says which report the rule will watch. */
  'rb.alert.form.preset': 'Watching “{name}”. Choose a series and a threshold.',
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
  /* Which rule a result belongs to. The banner's action and four row menus all
     write into one list, so a nameless outcome belongs to no rule. */
  'rb.alert.test.of': 'Test of “{name}”:',
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

  /* ── the firing history (§8.3 — a LEDGER, not a second index) ─────────── */

  /* `AlertFiring` was modelled, seeded and clientable and no pixel rendered it,
     so an operator could not see that a rule fired twice or that one of those
     firings is no longer in the inbox. It is append-only: no sort, no row
     actions, no selection — `mode: 'ledger'` refuses all three at compile time. */
  'rb.alert.history': 'Firing history',
  'rb.alert.history.title': 'Firings of “{name}”',
  'rb.alert.history.description':
    'Every time this rule crossed its threshold, newest first. Nothing here can be edited or re-sent.',
  'rb.alert.history.col.firedAt': 'Fired',
  'rb.alert.history.col.bucket': 'Reading for',
  'rb.alert.history.col.value': 'Value',
  'rb.alert.history.col.threshold': 'Threshold',
  'rb.alert.history.col.notification': 'Notification',
  /* **`notificationId === null` is a real seeded state and is not an error.**
     The notification was cleared from the centre; the firing still happened.
     Both readings are ordinary factual words in ordinary ink — neither is a
     `warning`, and R7 puts a terminal factual outcome in neutral. */
  'rb.alert.history.notification.present': 'In the notification centre',
  'rb.alert.history.notification.cleared': 'No longer in the notification centre',
  /* §11.1 — the heading names what the ledger is FOR, never the absence of
     rows. *No firings yet* would be the absence; this is the section. The
     sentence beneath it is the fact. */
  'rb.alert.history.empty.heading': 'A record of every crossing',
  'rb.alert.history.empty': 'This rule has not fired.',
  'rb.alert.history.error': 'The firing history didn’t load.',
  /* The toolbar's search is unconditional, so it is wired rather than left
     inert: it narrows on the bucket the firing read and on the firing's own id. */
  'rb.alert.history.search': 'Search these firings',
  'rb.alert.history.noMatch': 'No firing matches this search.',
  'rb.alert.history.noMatch.action': 'Clear search',
  'rb.alert.history.close': 'Close',

  /* ── delete, and a toast on every mutation ────────────────────────────── */

  /* R5a use #1 — destructive, in the row menu, behind a confirm that NAMES the
     rule (§5.3), and the body says what goes and what stays. */
  'rb.alert.delete': 'Delete alert',
  'rb.alert.delete.confirm.title': 'Delete “{name}”?',
  'rb.alert.delete.confirm.body':
    'The rule and its firing history go. Notifications it already sent stay.',
  'rb.alert.delete.confirm.action': 'Delete alert',
  'rb.alert.delete.failed': 'The alert wasn’t deleted. Nothing was changed.',
  /* R9 — one line, naming the object, sentence case, no terminal period. §5.1:
     a toast for every successful mutation, INCLUDING ones inside a modal. */
  'rb.alert.toast.saved': '{name} saved',
  'rb.alert.toast.deleted': '{name} deleted',
}
