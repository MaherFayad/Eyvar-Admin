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
  /* D46 — the pre-rename id `dashboards` is kept below so any leftover call
     site still resolves; `pages` is what `views.ts` names now. */
  'rb.view.dashboards': 'Dashboards',
  'rb.view.pages': 'Pages',
  'rb.view.alerts': 'Alerts',
  /* D46 — the fourth view; the screen behind it is WP-7.4's, not built yet. */
  'rb.view.analyst': 'Analyst',
  'rb.view.analyst.unbuilt': 'The analyst isn’t built yet.',

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
  'rb.pop.requests.assigned': 'Counts ride requests that reached a captain assignment, timed from the request.',

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
  /* WP-2.6b, gap 2 (G1). Shown only when `Measure.bucketAggregateOptions` has
     more than one entry — the catalogue stays the authority otherwise. */
  'rb.control.measuredAs': 'Measured as',
  'rb.control.measuredAs.count': 'Count',
  'rb.control.measuredAs.sum': 'Sum',
  'rb.control.measuredAs.mean': 'Average',
  'rb.control.measuredAs.endOfPeriod': 'Latest reading',
  'rb.control.measuredAs.cumulativeCount': 'Running count',
  'rb.control.groupBy': 'Split by',
  'rb.control.groupBy.none': 'No split',
  'rb.control.groupBy.empty': 'This measure has no dimension it can be split by.',
  'rb.control.groupBy.cleared': 'The split was cleared: it is not legal for {measure}.',
  /* WP-2.6b, gap 3 (G4). The second level; `rb.violation.tooManyGroupLevels`
     is the one reason both the plan's refusal and this row's "add a third"
     affordance read, so the two sentences cannot drift. */
  'rb.control.groupBy2': 'Then split by',
  'rb.control.groupBy2.none': 'No second split',
  'rb.control.groupBy2.needsFirst': 'Choose a first split.',
  'rb.control.groupBy3.add': 'Add a third split',
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
  /* WP-2.6, §1.4 — the fixed-comparison popover. It is the custom-range HALF
     of this same control's own shape, so it shares these keys' neighbourhood. */
  'rb.control.window.fixedCompare.heading': 'Fixed comparison range',
  'rb.control.window.fixedCompare.length': 'This range needs {count} buckets to match the current window.',
  'rb.control.grain': 'Grain',
  'rb.control.compare': 'Compare to',
  /* WP-2.6, §1.5. */
  'rb.control.comparisonDisplay': 'Show as',
  'rb.comparisonDisplay.series': 'Series',
  'rb.comparisonDisplay.difference': 'Difference',
  'rb.comparisonDisplay.percentChange': '% change',
  'rb.comparisonDisplay.series.full': 'Draw the comparison as a second, dashed line',
  'rb.comparisonDisplay.difference.full': 'Draw the difference between the two periods',
  'rb.comparisonDisplay.percentChange.full': 'Draw the percent change between the two periods',
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

  /* ────────────────────── formula, transform, segments (WP-2.6, §1.1-§1.3) ─ */

  'rb.control.formula': 'Formula',
  'rb.control.formula.placeholder': 'A / B × 100',
  'rb.control.formula.hint': 'Combine measures A and B. Use ROLLAVG, CUMSUM, DELTA or PCT to shape one.',
  'rb.control.formula.refA': 'A is {measure}',
  'rb.control.formula.refB': 'B is {measure}',
  'rb.control.formula.refB.unset': 'B is not set',
  'rb.control.formula.showParts': 'Show A and B too',
  'rb.control.formula.unit': 'Result in {unit}.',
  'rb.violation.formulaParse': 'Position {position}: expected {expected}.',
  'rb.violation.formulaUnknownRef': 'Add a second measure to use B in this formula.',
  'rb.violation.formulaUnit': 'A and B use different units and cannot combine this way.',
  'rb.violation.formulaNeedsAdditive': 'CUMSUM needs a measure that adds up, like a count or a total.',
  'rb.violation.formulaNeedsSplit': 'PCT needs a split, so there is a group to take a share of.',

  'rb.control.transform': 'Transform',
  'rb.control.transform.hint': 'Reshape the answer without changing the question.',
  'rb.control.transform.cumulative': 'Cumulative total',
  'rb.control.transform.cumulative.disabled':
    'This measure does not add up, so a running total would not be meaningful.',
  'rb.control.transform.rollingAverage': 'Rolling average over',
  'rb.control.transform.rollingAverage.unit': 'buckets',
  'rb.control.transform.rollingAverage.disabled':
    'This range has {count} complete buckets. Widen it to average over more.',
  'rb.control.transform.percentOfTotal': 'Percent of total',
  'rb.control.transform.percentOfTotal.disabled': 'Add a split so there is a group to take a share of.',

  'rb.control.segments': 'Segments',
  'rb.control.segments.hint': 'Compare up to four populations side by side. Leave empty to include everyone.',
  'rb.control.segments.add': 'Add segment',
  'rb.control.segments.max': 'Segments are capped at 4. Remove one to add another.',
  'rb.control.segments.none': 'No saved segments yet.',
  'rb.control.segments.search': 'Search…',
  'rb.control.segments.new.name': 'Segment name',
  'rb.control.segments.new.cancel': 'Cancel',
  'rb.control.segments.new.add': 'Add segment',
  'rb.control.segments.performed.label': 'Performed',
  'rb.control.segments.performed.unsupported': 'This population has no per-person activity to count against.',
  'rb.control.segments.performed.eachBucket': 'in each bucket',
  'rb.control.segments.performed.rollingDays': 'in the last {days} days',
  'rb.control.segments.performed.timesUnit': 'times',
  'rb.control.segments.performed.op.gte': 'at least',
  'rb.control.segments.performed.op.lte': 'at most',
  'rb.control.segments.performed.op.eq': 'exactly',
  'rb.control.segments.remove': 'Remove segment {name}',
  'rb.control.segments.overCeiling': 'over the series limit',
  'rb.violation.tooManySeries': 'This asks for {count} series. The limit is {max}. Remove a segment or a split.',
  'rb.catalogue.segments.loading': 'Loading segments…',
  'rb.catalogue.segments.error': 'Couldn’t load segments. Try again.',

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
  /* G15 — the bell. Disabled with the plan's own reason when the question is
     illegal (AC-1161); ChartToolbar renders it beside the refresh action. */
  'rb.toolbar.createAlert': 'Create alert from this chart',

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
  'rb.viz.area': 'Area chart',
  'rb.viz.bar': 'Bar chart',
  'rb.viz.stacked-bar': 'Stacked bar chart',
  'rb.viz.stacked-100': '100% stacked bar chart',
  'rb.viz.horizontal-bar': 'Horizontal bar chart',
  'rb.viz.pie': 'Pie chart',
  'rb.viz.kpi': 'KPI tile',
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
  /* 02 §2.7 — matches Amplitude's list without a custom range. */
  'rb.preset.this-quarter': 'This quarter',
  'rb.preset.last-quarter': 'Last quarter',
  'rb.preset.this-year': 'This year',
  'rb.preset.year-to-date': 'Year to date',

  'rb.grain.hour': 'Hour',
  'rb.grain.day': 'Day',
  'rb.grain.week': 'Week',
  'rb.grain.month': 'Month',
  'rb.grain.quarter': 'Quarter',
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
  /* G8, `02-report-builder-v2.md` §2.8 — the five v2 shapes the library's own
     `Type` filter must name, even before every one draws (WP-2.7/2.8). */
  'rb.chartType.area': 'Area',
  'rb.chartType.stacked-bar': 'Stacked bar',
  'rb.chartType.stacked-100': '100% stacked',
  'rb.chartType.horizontal-bar': 'Horizontal bar',
  'rb.chartType.kpi': 'KPI',

  'rb.compare.none': 'No comparison',
  'rb.compare.previous-period': 'Previous period',
  'rb.compare.previous-quarter': 'Previous quarter',
  'rb.compare.previous-year': 'Previous year',
  /* G6 — a fixed range compares against explicit dates rather than a rolling one. */
  'rb.compare.fixed': 'Fixed range ({from} – {to})',

  /* ───────────── why a control is disabled — the layer's own keys ────────── */

  'rb.grain.belowMin': '{grain} is finer than this data goes. The finest it answers is {minGrain}.',
  'rb.grain.tooManyBuckets':
    '{grain} over this range is {buckets} buckets, and {max} is the most a report draws.',

  'rb.chart.lineNeedsGrain': 'A line needs a grain. This range is collapsed to one bucket.',
  'rb.chart.lineNeedsTwoPoints': 'A line needs at least two points and this range has {buckets}.',
  'rb.chart.barNeedsGrainOrSplit': 'A bar needs either a grain or a split.',
  /* G8, `02-report-builder-v2.md` §3 — the five v2 chart types' legality reasons. */
  'rb.chart.twoLevelsNeedStack': 'A two-level split draws as a stacked bar or a table, not this shape.',
  'rb.chart.areaOneMeasure': 'An area shows one measure. This report has two.',
  'rb.chart.stackNeedsAdditive': 'A stacked bar needs a measure that adds up, like a count or a total.',
  'rb.chart.stackNeedsParts': 'A stacked bar needs a split or two measures of the same unit, so it has parts to stack.',
  'rb.chart.stackUnit': 'A stacked bar of a {unit} does not add up to a whole.',
  'rb.chart.stack100NeedsParts': 'A 100% stacked bar needs at least two parts and this split has {parts}.',
  'rb.chart.hbarNeedsSplit': 'A horizontal bar needs a split, so it has bars to draw.',
  'rb.chart.hbarSinglePeriod': 'A horizontal bar needs the whole range as one bucket.',
  'rb.chart.kpiOneSeries': 'A KPI shows one measure with no split and no segments.',
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
  /* G1 (§2.1). Referenced by `plan.ts` since `illegal-aggregate` first landed; missing here until WP-2.6b. */
  'rb.violation.illegalAggregate': 'This measure cannot be measured as {aggregate}.',
  /* G5 / AC-1122 (plan.ts `segment-performed-unsupported`): the server has no per-person activity for this measure. */
  'rb.violation.segmentPerformedUnsupported': 'This server has no per-person activity for {measure} to count against.',
  /* WP-2.6b, gap 3 (G4). Shared by the plan's refusal and the rail's disabled "add a third split" row. */
  'rb.violation.tooManyGroupLevels': 'A split is capped at {max} levels. Remove one to add another.',
  'rb.violation.filterFieldNotShared': 'Both measures must be filterable on {field}.',
  'rb.violation.windowInverted': '{to} is before {from}.',
  'rb.violation.comparisonLength': 'The comparison range has {got} buckets. The current window needs {required}.',

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
    'Step {position} repeats an earlier step. Two identical steps convert at 100 %, which measures nothing. Change its measure, or give it a filter of its own.',

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
  /* §5 (v2) — the same control now offers week-length windows too. */
  'rb.funnel.window.weeks': '{weeks} weeks',
  'rb.funnel.window.explain':
    'How long one person has to reach the last step from the first. The whole range means anyone who started inside it and finished inside it.',

  /* ─────────────────────────── funnel v2 (§5, G10) ───────────────────────── */

  'rb.funnel.mode': 'Order',
  'rb.funnel.mode.ordered': 'In order',
  'rb.funnel.mode.unordered': 'In any order',
  'rb.funnel.mode.sequential': 'Strictly in sequence',
  /* D9 CQ-3 — the shared reason for `sequential`, `holdConstant` and
     `exclude`: none of them is computable without event-level data no source
     here has, and the sentence says the server, not this option, is what is
     missing. */
  'rb.funnel.needsServer':
    'This needs a history of individual events, which this server does not have yet. It will run once the server supports it.',
  'rb.funnel.measuredAs': 'Measured as',
  'rb.funnel.measuredAs.conversion': 'Conversion',
  'rb.funnel.measuredAs.conversion-over-time': 'Conversion over time',
  'rb.funnel.measuredAs.time-to-convert': 'Time to convert',
  'rb.funnel.groupBy': 'Split drop-off by',
  'rb.funnel.groupBy.none': "Don't split",
  'rb.funnel.groupBy.explain': 'Opens a breakdown of who dropped off at each step, by this field.',
  'rb.funnel.holdConstant': 'Hold constant',
  'rb.funnel.holdConstant.none': 'Nothing',
  'rb.funnel.exclude': 'Exclude',
  'rb.funnel.exclude.add': 'Add an exclusion',
  'rb.funnel.timeToConvert.percentile': 'P{percentile}',
  'rb.funnel.dropoff.region': 'Drop-off by group',
  'rb.funnel.dropoff.col.group': 'Group',
  'rb.funnel.dropoff.col.count': 'People',
  'rb.funnel.dropoff.empty': 'Nobody dropped off at this step.',

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
  'rb.cohort.horizon.notUsedForBracket': 'The windows above decide the columns; this is not used.',

  /* ───────────────────────── retention v2 (§6, G11) ──────────────────────── */

  'rb.cohort.return.add': 'Add a return event',
  'rb.cohort.return.remove': 'Remove {measure}',
  'rb.cohort.method': 'Method',
  'rb.cohort.method.rolling': 'Still active at or after',
  'rb.cohort.method.nday': 'Returned on exactly',
  'rb.cohort.method.bracket': 'Returned within a window',
  'rb.cohort.brackets': 'Windows',
  'rb.cohort.brackets.explain': 'Custom periods after joining, in the grain chosen above. For example, 0 to 7, then 7 to 14.',
  'rb.cohort.brackets.unstarted': 'No windows yet. Add one to measure retention within it.',
  'rb.cohort.brackets.lo': 'From',
  'rb.cohort.brackets.hi': 'To',
  'rb.cohort.brackets.add': 'Add a window',
  'rb.cohort.brackets.remove': 'Remove the {lo}–{hi} window',
  'rb.cohort.brackets.overlap': 'This window overlaps one already added. Windows cannot share a period.',
  'rb.cohort.view': 'View',
  'rb.cohort.view.matrix': 'Matrix',
  'rb.cohort.view.curve': 'Curve',
  'rb.cohort.curve.folded': 'The {count} oldest cohorts are left out of the curve, but still count toward the average.',
  'rb.cohort.curve.label': 'Retention curve, one line per cohort, average in bold',

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
  'rb.funnel.step.median': 'Median {days} days to the next step.',
  'rb.funnel.step.median.none': 'No reading for the next step.',
  /* AC-1169's refusal: a rung's bar and its "of step 1" sentence are
     conversion-only maths, so a result measured any other way is stated
     as unreadable here rather than divided through them anyway. */
  'rb.funnel.cascade.wrongShape': "This result isn't a set of funnel steps, and can't be shown as one.",
  'rb.cohort.col.cohort': 'Joined',
  /* R5-15 — the base travels with the percentage. */
  'rb.cohort.col.size': 'People',
  'rb.cohort.cell.none': 'No reading',
  /* v2: grain-generic — {unit} is `rb.grainNoun.*`, never a raw enum (AC-1171). */
  'rb.cohort.survival':
    '{percent} of everyone counted here was still active one {unit} after joining.',
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
  'rb.canvas.table.heading': 'Numbers behind this chart',

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
  /* X14 — the product's own qualifier separator, never an em dash. */
  'rb.panel.measureByGroup': '{measure} · {group}',
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
  'rb.panel.action.open': 'Open {board}',

  /* ── §A12 — the closing strip ──────────────────────────────────────────
     Amplitude's `Related Charts` is a similarity model. This is not: it is
     F-9's back-reference, naming the boards that display THIS measure over THIS
     population. The heading says exactly that and claims nothing more. */
  'rb.related.heading': 'Also appears on',

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

  /* §7 (v2) — the columns mode: measures across, a row dimension down. */
  'rb.table.columns.empty': 'No columns to show.',
  'rb.table.columns.rowTime': 'Date',
  'rb.table.columns.rowLabel': 'Group',
  'rb.table.columns.totals': 'Total',
  /* Above `VIRTUALISE_ABOVE` only a window of rows mounts, so Ctrl+F cannot
     see the rest — the same search `rb.table.search` gives the classic
     table, over the row dimension instead of the series list. */
  'rb.table.columns.search': 'Search rows',
  'rb.table.columns.search.empty': 'No rows match that search.',

  /* WP-3.5, F-V2-47 — the rail's columns editor, `mode: "table"` only. */
  'rb.control.table.columns': 'Columns',
  'rb.control.table.columns.hint': 'Each column is one of the measures or the formula already asked for above.',
  'rb.control.table.rows': 'Rows',
  'rb.control.table.rows.none': 'One row',
  'rb.control.table.rows.time': 'Date',
  'rb.control.table.totals': 'Totals row',

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
  'rb.saveAs.title': 'Save a new report',
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
  /* AC-1205 — the builder opened with `?pinTo=`; the one primary names both halves of what it now does. */
  'rb.save.pin.confirm': 'Save and pin',
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

  /* §8 — the library's own filter facet. `Enter` or a comma commits a chip. */
  'rb.save.tags': 'Tags',
  'rb.save.tags.placeholder': 'Add a tag',
  'rb.save.tags.remove': 'Remove tag {tag}',

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

  /* §A6 / B4 — the overflow's export submenu. §11.2: gate at RENDER. PDF is
     listed, off, and says why; hiding it would leave an operator hunting for
     an export this product does not have. AC-1159 — PNG works now. */
  'rb.export.menu': 'Export',
  'rb.export.png': 'Export PNG',
  'rb.export.pdf': 'Export PDF',
  'rb.export.blocked': 'Image export isn’t built. Export CSV instead.',
  'rb.export.pdf.blocked': 'PDF export isn’t built. Export PNG or CSV instead.',

  /* §8 — the overflow's five new actions. Pin, duplicate and version history
     still need a saved report; the alert action no longer does (WP-5.5, G15)
     — `saveToAlert` names and saves a draft first. */
  'rb.overflow.pin': 'Pin to a page…',
  'rb.overflow.pin.loading': 'Loading the pages',
  'rb.overflow.pin.error': 'The pages didn’t load.',
  'rb.overflow.pin.empty': 'There are no dashboard pages yet.',
  'rb.overflow.pin.toast': 'Pinned to “{page}”.',
  'rb.overflow.pin.failed': 'Wasn’t pinned. Try again.',
  'rb.overflow.createAlert': 'Create alert…',
  'rb.overflow.saveToAlert': 'Save to alert…',
  'rb.overflow.ask': 'Ask the analyst',
  /* AC-1262 — a draft has no report yet for the analyst to point at, same
     reason `Duplicate`/`Pin`/`Create alert`/`Version history` disable above. */
  'rb.overflow.ask.needsSaved': 'Save the report first.',
  'rb.overflow.versions': 'Version history',
  'rb.overflow.versions.heading': 'Version history',
  'rb.overflow.versions.close': 'Close',
  'rb.overflow.versions.loading': 'Loading the version history',
  'rb.overflow.versions.error': 'The version history didn’t load.',
  'rb.overflow.versions.empty': 'No earlier versions yet.',
  'rb.overflow.versions.restore': 'Restore',
  /* AC-1162 — restoring loads the query into the DRAFT; nothing is saved. */
  'rb.overflow.versions.restored': 'Loaded the {time} version into the draft. Nothing is saved yet.',
  'rb.overflow.versions.savedBy': '{by} · {at}',

  /* §8.3 states 11 and 12. */
  'rb.report.deleted': 'This report was deleted. You can still save what you have as a new one.',

  /* ─────────────────────────── the library ──────────────────────────────── */

  'rb.library.new': 'New report',
  'rb.library.search': 'Search reports',
  /* §8 / AC-1163 — the library's own view strip, distinct from the outer
     `reports · pages · alerts` switcher. `all` is the default. */
  'rb.library.view.all': 'All',
  'rb.library.view.mine': 'Mine',
  'rb.library.view.team': 'Team',
  'rb.library.view.starred': 'Starred',
  'rb.library.view.official': 'Official',
  'rb.library.view.recent': 'Recent',
  'rb.library.col.star': 'Star',
  'rb.library.star.add': 'Star {name}',
  'rb.library.star.remove': 'Unstar {name}',
  /* R7/R5a — a neutral fact, not a warning; there is no red badge. */
  'rb.library.official': 'Official',
  'rb.library.col.tags': 'Tags',
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
  'rb.library.duplicate': 'Duplicate',
  'rb.library.delete': 'Delete',
  'rb.library.firstRun.heading': 'Ask a question',
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
  'rb.delete.pinned.title': 'Pinned to other dashboards',
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
  'rb.dashboards.firstRun.heading': 'Boards for daily reading',
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
  'rb.dashboard.add.title': 'Add a report',
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
  'rb.dashboard.empty.heading': 'No reports pinned yet',
  'rb.dashboard.empty.body': 'Add a saved report and it appears here.',
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
  'rb.dashboard.tile.filterRefused': 'Not filtered by {field}. This report can’t be.',

  /* §C5 — the tile size, as a menu item rather than a drag. §11.2 rejected a
     drag grid on keyboard-operability grounds and that ruling has not moved. */
  'rb.dashboard.tile.span.full': 'Make full width',
  'rb.dashboard.tile.span.half': 'Make half width',
  'rb.dashboard.tile.span.fullA11y': 'Make {name} full width',
  'rb.dashboard.tile.span.halfA11y': 'Make {name} half width',
  'rb.dashboard.tile.span.toast': 'Layout saved',

  'rb.dashboards.col.range': 'Range',
  /* T9.14 — two words in a 150px column. `Each report's own range` wrapped on
     every row; the sentence it lost is the header's `InfoHint` below. */
  'rb.dashboards.range.perReport': 'Per report',
  'rb.dashboards.range.hint':
    'Range is the window a board imposes on every tile. Per report leaves each tile the one it was saved with.',
  'rb.dashboards.duplicate': 'Duplicate',
  'rb.dashboards.duplicate.name': '{name} (copy)',
  'rb.dashboards.duplicate.failed': '{name} wasn’t duplicated. Nothing was changed.',

  /* ──────────────────────────── alerts (§12) ────────────────────────────── */

  'rb.alerts.new': 'New alert',
  'rb.alerts.search': 'Search alerts',
  'rb.alerts.col.name': 'Alert',
  'rb.alerts.col.state': 'State',
  /* v2 renames this column from the display it inherited from `lastEvaluated`
     (`Checked`) to what it actually shows now that `cadence` is a real,
     settable schedule (`Hourly`/`Daily`/`Not scheduled`) rather than always
     `null` — `rb.alerts.col.lastEvaluated` carries the "when" this column
     used to stand in for. */
  'rb.alerts.col.cadence': 'Cadence',
  /* The line the rule watches, beside the reading that is tested against it.
     Amplitude §H's principle — what needs attention reads at a glance — needs
     both numbers in view; one of them was only ever inside the rule sentence. */
  'rb.alerts.col.threshold': 'Threshold',
  'rb.alerts.col.lastValue': 'Last reading',
  'rb.alerts.col.lastEvaluated': 'Last checked',
  /* v2 (`04-alerting-v2.md` §4) — the condition summary column, one sentence
     per kind from `rb.alert.sentence.<kind>`, and the schedule/channels/labels
     columns the extended table adds. */
  'rb.alerts.col.condition': 'Condition',
  'rb.alerts.col.channels': 'Channels',
  'rb.alerts.col.labels': 'Labels',
  'rb.alerts.col.mute': 'Mute',
  'rb.alerts.tab.rules': 'Rules',
  'rb.alerts.tab.firings': 'Firings',
  'rb.alerts.firstRun.heading': 'Alerts on crossed thresholds',
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

  'rb.alert.form.name': 'Name',
  'rb.alert.form.report': 'Report',
  'rb.alert.form.report.unsaved': 'An alert watches a saved report. Save this one first.',
  /* **The preselected report, NAMED.** `rb.alert.form.report.unsaved` used to do
     double duty as this dialog's description until a series and a threshold
     existed — so an operator who pressed `Create alert` on a perfectly well
     saved report was told to save it first. `alerts.corrections.test.tsx` reported
     that as a copy defect rather than working around it; this is the key it
     asked for, and it says which report the rule will watch. */
  'rb.alert.form.preset': 'Watching “{name}”. Choose a series and a threshold.',
  'rb.alert.form.series': 'Series',
  /* Reused as the static condition's sr-only labels (§4.2's `[ > ▾ ] [ 400 ] SAR`
     row carries no visible label of its own — these name the two controls for
     assistive tech). */
  'rb.alert.form.comparator': 'Fires when the value',
  'rb.alert.form.threshold': 'Threshold',
  'rb.alert.form.threshold.unit': 'In {unit}',
  'rb.alert.form.recipients': 'Also tell',
  'rb.alert.form.enabled': 'On',
  'rb.alert.form.report.loading': 'Loading the saved reports',
  'rb.alert.form.report.error': 'The saved reports didn’t load.',
  'rb.alert.form.series.unstarted': 'Choose a report first.',
  'rb.alert.form.series.loading': 'Reading the report’s series',
  'rb.alert.form.series.error': 'The report didn’t run, so its series are unknown.',
  /* **D4 is no longer fully open — `listTeamUsers` + `effectivePermissions`
     answer "can user X see measure M" well enough to filter a picker.** v1's
     blocked field and its explanation are replaced by a real multi-select
     (§4.4) filtered the same way the email channel's picker is; see
     `rb.alert.channel.email.empty` for the parallel empty case on recipients. */
  'rb.alert.form.recipients.empty': 'No team member holds access to this measure.',
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
  /* AC-1262 — the row action `01-analyst-agent.md` §4 names "Explain this
     firing"; the one act a ledger row does still get (§8.3's own comment
     above, amended). */
  'rb.alert.history.explain': 'Explain this firing',
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
  /* v2 (`04-alerting-v2.md` §5) — the band a firing evaluated against, and its
     per-channel deliveries. A failed delivery states the channel and the error
     without touching the firing's own row (state 24, AC-1237). */
  'rb.alert.history.col.band': 'Band',
  'rb.alert.history.band': '{low} – {high}',
  'rb.alert.history.col.deliveries': 'Deliveries',
  'rb.alert.history.delivery.sent': '{channel} sent',
  'rb.alert.history.delivery.failed': '{channel} failed',
  /* The `Changes` tab — every save, as `field: old → new`. */
  'rb.alert.history.tab.firings': 'Firings',
  'rb.alert.history.tab.changes': 'Changes',
  'rb.alert.history.changes.empty': 'This rule has not been changed since it was created.',
  'rb.alert.history.changes.error': 'The change history didn’t load.',
  'rb.alert.history.changes.entry': '{field}: {from} → {to}',
  'rb.alert.history.changes.by': 'Changed by {who}',
  'rb.alert.history.changes.field.name': 'Name',
  'rb.alert.history.changes.field.evaluationGrain': 'Evaluation grain',
  'rb.alert.history.changes.field.cadence': 'Cadence',
  'rb.alert.history.changes.field.severity': 'Severity',
  'rb.alert.history.changes.field.enabled': 'On',
  'rb.alert.history.changes.field.mutedUntil': 'Muted until',
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

  /* ── v2: the composer as an inline panel, four condition kinds, channels,
     mute, lag (`04-alerting-v2.md` §4, `docs/05-restructure/design/
     22-analytics-v2.md` §4) — final copy, carried over verbatim from the
     design spec's own tables. ─────────────────────────────────────────── */

  'rb.alert.panel.heading.new': 'New alert rule',
  'rb.alert.panel.heading.edit': 'Edit alert rule',
  'rb.alert.series.empty': 'This report has no series to watch.',
  'rb.alert.form.condition': 'Condition',
  'rb.alert.form.evaluationGrain': 'Evaluation grain',
  'rb.alert.form.cadence': 'Cadence',
  'rb.alert.cadence.hourly': 'Hourly',
  'rb.alert.cadence.daily': 'Daily',
  'rb.alert.cadence.none': 'Not scheduled',
  'rb.alert.form.reArm': 'Re-arm after',
  'rb.alert.form.reArm.unit': 'minutes',
  'rb.alert.form.severity': 'Severity',
  'rb.alert.severity.high': 'High',
  'rb.alert.severity.critical': 'Critical',
  'rb.alert.severity.critical.blocked': 'Critical severity needs a recipient rule that is not decided yet.',
  'rb.alert.form.labels': 'Labels',
  'rb.alert.form.labels.placeholder': 'Add a label',
  'rb.alert.form.labels.remove': 'Remove label {name}',
  'rb.alert.action.test': 'Test now',
  'rb.alert.action.save': 'Save rule',

  /* §4.2 — each condition kind's own fields. */
  'rb.alert.kind.static.name': 'Threshold',
  'rb.alert.kind.static.desc': 'Fires when a value crosses a fixed line',
  'rb.alert.kind.relative.name': 'Change',
  'rb.alert.kind.relative.desc': 'Fires when a value moves against a past bucket',
  'rb.alert.kind.anomaly.name': 'Anomaly',
  'rb.alert.kind.anomaly.desc': 'Fires when a value leaves its normal range',
  'rb.alert.kind.missing.name': 'Missing data',
  'rb.alert.kind.missing.desc': 'Fires when the pipeline stops delivering',
  'rb.alert.relative.direction': 'Direction',
  'rb.alert.relative.direction.up': 'Up',
  'rb.alert.relative.direction.down': 'Down',
  'rb.alert.relative.direction.either': 'Either',
  'rb.alert.relative.measure': 'Measure',
  'rb.alert.relative.measure.delta': 'Amount changed',
  'rb.alert.relative.measure.percent': 'Percent changed',
  'rb.alert.relative.amount': 'Amount',
  'rb.alert.relative.against': 'Against',
  'rb.alert.relative.against.previousBucket': 'Previous bucket',
  'rb.alert.relative.against.sameWeekday': 'Same bucket, previous week',
  'rb.alert.relative.against.previousPeriod': 'Previous period',
  'rb.alert.against.weekOnlyAtDay': 'This comparison needs a daily evaluation grain.',
  'rb.alert.anomaly.direction': 'Direction',
  'rb.alert.anomaly.direction.above': 'Above',
  'rb.alert.anomaly.direction.below': 'Below',
  'rb.alert.anomaly.direction.either': 'Either',
  'rb.alert.anomaly.confidence': 'Confidence',
  'rb.alert.anomaly.confidence.95': '95%',
  'rb.alert.anomaly.confidence.99': '99%',
  'rb.alert.anomaly.lookback': 'Lookback',
  'rb.alert.anomaly.lookback.placeholder': 'Uses the last {count} buckets',
  'rb.alert.anomaly.method':
    'This estimates a normal range from recent history. It is a simple statistical band, not a learned model.',
  'rb.alert.missing.count': 'Fires when',
  'rb.alert.missing.count.suffix': 'complete buckets in a row are missing',

  /* §4.3 — the preview chart. */
  'rb.alert.preview.heading': 'Would this have fired?',
  'rb.alert.preview.incomplete': 'Fill in the condition to see when this would have fired.',
  'rb.alert.anomaly.noBaseline': 'Needs 8 complete buckets to estimate a range. This series has {count}.',
  'rb.alert.preview.summary': '{count} of the last {window} buckets would have fired',

  /* §4.4 — channels. */
  'rb.alert.channel.inApp': 'In-app',
  'rb.alert.channel.inApp.always': 'always on',
  'rb.alert.channel.email': 'Email',
  'rb.alert.channel.email.empty': 'No team member with access to this measure can receive email.',
  'rb.alert.channel.slack': 'Slack',
  'rb.alert.channel.slack.empty': 'No Slack webhook is connected.',
  'rb.alert.channel.slack.addLink': 'Add one in Admin › Integrations',
  'rb.alert.channel.recipientDropped': 'Lost access to this measure',
  'rb.alert.channel.email.add': 'Add recipient',
  'rb.alert.channel.email.remove': 'Remove {name}',
  'rb.alert.channel.email.search': 'Search team members…',
  'rb.alert.channel.email.noMatch': 'No team member matches.',

  /* §4.5 — the mute menu, shared by the Rules table and the composer. */
  'rb.alert.mute.menu': 'Mute for…',
  'rb.alert.mute.1h': '1 hour',
  'rb.alert.mute.8h': '8 hours',
  'rb.alert.mute.24h': '24 hours',
  'rb.alert.mute.untilMonday': 'Until Monday',
  'rb.alert.mute.custom': 'Custom date…',
  'rb.alert.mute.custom.apply': 'Apply',
  'rb.alert.mute.custom.cancel': 'Cancel',
  'rb.alert.mute.unmute': 'Unmute',
  'rb.alert.mute.rowState': 'Muted until {time}',
  'rb.alert.mute.failed': 'The rule wasn’t muted. Nothing was changed.',
  'rb.alert.mute.action': 'Mute {name} for…',

  /* §4.6 — the lag state, row-level. D41 built the scheduler, so the
     no-cadence banner `04-alerting-v2.md:123` promised to retire is gone. */
  'rb.alert.state.lag': 'Last evaluated {duration} ago · expected {cadence}',
  'rb.alert.state.notScheduled': 'Not scheduled',

  /* The condition summary column (AC-1232) — one short sentence per kind, built
     from words rather than the raw `>`/`↓` shorthand the doc's example uses,
     matching this product's no-symbol convention (`copy.md` rule 1). */
  'rb.alert.sentence.static': '{comparator} {threshold}',
  'rb.alert.sentence.relative': '{direction} by {amount} vs {against}',
  'rb.alert.sentence.anomaly': '{direction} its {confidence}% band',
  'rb.alert.sentence.missing': 'misses {count} buckets in a row',
  'rb.alert.relative.directionWord.up': 'rises',
  'rb.alert.relative.directionWord.down': 'falls',
  'rb.alert.relative.directionWord.either': 'changes',
  'rb.alert.relative.against.previousBucket.inline': 'the previous bucket',
  'rb.alert.relative.against.sameWeekday.inline': 'the same day last week',
  'rb.alert.relative.against.previousPeriod.inline': 'the previous period',
  'rb.alert.anomaly.directionWord.above': 'rises above',
  'rb.alert.anomaly.directionWord.below': 'falls below',
  'rb.alert.anomaly.directionWord.either': 'leaves',

  /* ── the firings feed (`?view=alerts`, Firings tab) — a cross-rule ledger,
     `04-alerting-v2.md` §4. ─────────────────────────────────────────────── */

  'rb.alert.feed.search': 'Search firings',
  'rb.alert.feed.col.firedAt': 'Fired',
  'rb.alert.feed.col.rule': 'Rule',
  'rb.alert.feed.col.value': 'Value',
  'rb.alert.feed.col.bucket': 'Reading for',
  'rb.alert.feed.col.severity': 'Severity',
  'rb.alert.feed.col.acknowledged': 'Acknowledged',
  'rb.alert.feed.col.deliveries': 'Deliveries',
  'rb.alert.feed.col.actions': 'Actions',
  'rb.alert.feed.filter.rule': 'Rule',
  'rb.alert.feed.filter.acknowledged': 'Acknowledged',
  'rb.alert.feed.filter.severity': 'Severity',
  'rb.alert.feed.filter.acknowledged.yes': 'Acknowledged',
  'rb.alert.feed.filter.acknowledged.no': 'Not acknowledged',
  'rb.alert.feed.acknowledge': 'Acknowledge',
  'rb.alert.feed.acknowledged.by': 'By {who}, {time}',
  'rb.alert.feed.explain': 'Explain',
  'rb.alert.feed.firstRun.heading': 'A feed of firings',
  'rb.alert.feed.firstRun.body':
    'Once a rule fires, it lands here. Every rule you can see, newest first.',
  'rb.alert.feed.empty': 'Nothing has fired yet.',
  'rb.alert.feed.noMatch': 'No firing matches this search.',
  'rb.alert.feed.noMatch.action': 'Clear filters',
  'rb.alert.feed.error': 'The firings didn’t load.',
  'rb.alert.feed.acknowledged.toast': 'Firing acknowledged',
  'rb.alert.feed.acknowledge.failed': 'The firing wasn’t acknowledged. Nothing was changed.',

  /* ── WP-2.1…2.5 — the chart surface, `22-analytics-v2.md` §2 ──────────── */
  'rb.chart.controlsRow': 'Chart controls',
  'rb.chart.addAnnotation': 'Add annotation',
  /* AC-1149 — disabled-in-place reason, not a removal. */
  'rb.chart.addAnnotation.needsPermission': 'You don’t have permission to add annotations.',
  'rb.chart.zoomed.reset': 'Zoomed · reset',
  'rb.chart.kpi.sparkline': '{title} over the window',
  'rb.chart.tooltip.partial': 'partial',
  'rb.chart.tooltip.vs': 'vs {date}',
  'rb.chart.tooltip.share': 'share of total',
  'rb.legend.isolate': 'Isolate',
  'rb.legend.showAll': 'Show all',
  'rb.view.menu': 'View',
  'rb.view.log': 'Log scale',
  'rb.view.logNeedsPositive': 'Log scale needs every value above zero.',
  'rb.view.startAtZero': 'Start at zero',
  'rb.view.dataLabels': 'Data labels',
  'rb.view.dataLabels.disabled': 'Too many points to label · {count} would overlap.',
  'rb.view.showTable': 'Show table',
  'rb.annotation.form.date': 'Date',
  'rb.annotation.form.label': 'Label',
  'rb.annotation.form.kind': 'Kind',
  'rb.annotation.form.note': 'Note (optional)',
  'rb.annotation.form.cancel': 'Cancel',
  'rb.annotation.form.submit': 'Add annotation',
  'rb.annotation.form.failed': 'The annotation wasn’t saved. Nothing was changed.',
  'rb.annotation.kind.launch': 'Launch',
  'rb.annotation.kind.price': 'Price change',
  'rb.annotation.kind.incident': 'Incident',
  'rb.annotation.kind.campaign': 'Campaign',
  'rb.annotation.kind.other': 'Other',
}
