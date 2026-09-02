/**
 * Metric tiles and chart cards — the eight table-less sub-tabs:
 * Management × 5 (Overview, Performance, Risk & Signals, Growth, Market &
 * Zones) plus the Operations, Support and Admin overviews.
 *
 * Governed by `DESIGN.md` §3.7.
 *
 * ## The three fields the legacy app does not have, and needs
 *
 * **`asOf`.** No KPI anywhere in `eyvar_ops_panel_v40_fixed.html` records when
 * it was computed — every tile is `Object.keys(DB.x).filter(...).length`
 * evaluated during the render (`renderExecOverview`, `:6901`). An overview that
 * cannot say when it was computed is one an operator cannot trust, and the
 * first question on any escalation is *"is this number from before or after the
 * incident?"*. Required on every metric and every series.
 *
 * **An explicit comparison.** §3.7 requires a delta and requires an em-dash
 * when no comparison is possible — *never `0%` and never blank*. A screen that
 * subtracts two numbers cannot tell "no change" from "no comparison". So
 * `comparison` is a tagged union with a `none` arm carrying a **reason**, and
 * `deltaPercent` is `null` exactly when that arm is taken.
 *
 * The legacy app is candid about why so many of these are `none`: it holds one
 * point in time and says so — *"The Data Export → Daily Snapshots tool builds a
 * real historical trend the longer it's used… this section will show true
 * month-over-month growth instead of a single-point read"* (`:6979`).
 * `reason: 'no-history'` is that sentence, as data.
 *
 * **`higherIsBetter`.** A delta's colour is not a property of the arrow. Churn
 * up is bad; renewal up is good; a cancellation-fee total going up is neither.
 * No screen can derive this and every screen needs it, so it is on the metric.
 *
 * ## Two series maximum, by construction
 *
 * §3.7: *"the comparison series MUST be dotted/dashed and MUST use the same hue
 * as the primary series, never a second colour"*, and `globals.css:919` records
 * that there is therefore **no categorical chart palette and no `--chart-3`**.
 *
 * `TimeSeries` has two named fields — `current` and `comparison` — not a
 * `series: Series[]`. A screen literally cannot ask for a third, because there
 * is no third to ask for. That is the cheapest possible enforcement of the
 * rule and it costs nothing: no chart in the product wants one.
 *
 * ## Three fields added by ruling R4-4 (`design/07-rulings-r4.md` §4)
 *
 * **`MetricBoard.breakdowns`** — a ranked list. Six of the eight boards specify
 * one and the contract had no shape for it (spec **F-1**). The shape is not
 * invented here: `DESIGN.md` §3.7 describes it `[observed]` twice, and R4-4
 * §4.1 fuses the two variants into one anatomy. There is **no `BreakdownList`
 * component** — the brief that commissioned this work said one shipped in wave
 * 4 and it did not; `src/components/metrics/` holds `ChartCard`, `MetricTile`,
 * `MetricTileRow`, `TrendChart` and `formatMetric`, and R4-4 §4 says the same.
 * The contract lands first; the component is frontend-engineer's.
 *
 * **`MetricBoard.notices`** — a board *declares conditions*; the page renders
 * **at most one** banner (R10 forbids two page-level banners). So this is a
 * declaration list, not a banner, and the name says so. The selection rule
 * lives on the screen: **highest tone, then highest `severity`, and that is
 * all** — R5-3 deleted the *"then declaration order"* clause it used to carry.
 * `03-financials.md` **AC-351** needs the same shape from a different
 * direction, which is why it is modelled for both.
 *
 * **`Metric.caption`** — a scope limit or a denominator, under a hard scope so
 * it does not become a slop field (R4-4 §4.2). Three tiles cannot ship without
 * one: AC-641, AC-674, AC-675.
 *
 * **F-12 is closed by `breakdowns`, not by a new grain.** *"Zone demand by
 * hour"* is a **profile** — 24 buckets that repeat — not a trend, so it is a
 * breakdown on an `hour-of-day` dimension. `SeriesPoint.at` stays an `IsoDate`
 * and there is no hourly grain in this contract; the genuine hourly *trend*
 * belongs to the report builder, where grain is a control (R4-4 §4.4).
 */

import type { CurrencyCode, IsoDate, IsoDateTime } from './common'

/**
 * What the number is, so `formatMoney` / `formatPercent` are chosen from data
 * rather than guessed from the key's name.
 *
 * `money` is **always halalas** (`Halalas`), never a float and never a
 * pre-formatted string — same rule as everywhere else in this layer.
 *
 * **`ratio` renders as `{value}×`** with the multiplication sign U+00D7, and
 * **the operands belong in the label, never in the value** (R4-12, closing
 * W4-F7). So the tile reads `7.0×` over the label `Worst demand-to-supply
 * ratio`. Legacy writes `2.4× demand/supply` into the value itself (`:6953`)
 * and that value cannot be right-aligned against another number (R4) and
 * cannot be translated (AC-713). The `×` is the UI's to add — `formatRatio`
 * in `src/lib/format/number.ts`, W4-F5's fifth call site — and this layer
 * sends the bare number, as it does for every other unit.
 */
export type MetricUnit = 'count' | 'money' | 'percent' | 'ratio' | 'minutes' | 'rating'

/**
 * Why a metric has no comparison. Three genuinely different situations, and
 * they read differently to an operator:
 *
 *   `no-history`         the period exists but we have no data from it — the
 *                        legacy app's whole position (`:6979`). "First month."
 *   `no-target`          a target-comparison metric nobody has set a target
 *                        for. Q-open, not a data gap.
 *   `insufficient-data`  the comparison period exists and has data, but too
 *                        little for the delta to mean anything (a renewal rate
 *                        over 3 subscriptions). Suppressing it is the honest
 *                        move; §3.7's em-dash is what it renders as.
 */
export type NoComparisonReason = 'no-history' | 'no-target' | 'insufficient-data'

/**
 * The comparison a delta is computed against, named explicitly.
 *
 * §3.7's legend requires the comparison period to be *named with dates*, which
 * is only possible if the comparison carries them. A bare `previousValue:
 * number` cannot fill in `Dec 26, 2023–Jan 1, 2024`.
 */
export type MetricComparison =
  | {
      kind: 'previous-period'
      value: number
      periodStart: IsoDate
      periodEnd: IsoDate
    }
  | {
      kind: 'target'
      value: number
      /** Who set it and when it applies from. A target with no owner drifts. */
      setByUserId: string | null
      effectiveFrom: IsoDate
    }
  | { kind: 'none'; reason: NoComparisonReason }

/** Which way the value moved. `null` when there is nothing to compare against. */
export type MetricDirection = 'up' | 'down' | 'flat'

/**
 * Why the value is absent. **Non-null if and only if `value === null`** (R5-1,
 * `design/09-rulings-r5.md` §1.3).
 *
 *   `not-captured`    we do not record the data this number is computed from
 *                     **yet** — the store exists and nothing has been written
 *                     into it. `DB.contacts` is `[]` (`:14718`).
 *   `not-computable`  the inputs exist; the calculation has no answer — a rate
 *                     over a zero denominator, a mean of an empty set.
 *
 * **Two members, and a third is added by a spec that needs one.** Not
 * pre-invented, and never guessed at a call site: a null with an invented
 * explanation is worse than a null with none.
 *
 * **Two situations that are deliberately *not* members**, because neither ends
 * with a rendered tile:
 *
 *   - **A measure the operator may not see** is **absent**, not em-dashed
 *     (`05-metrics-content.md` §11.2 / AC-705).
 *   - **A measure with no store at all** does not render as a tile
 *     (R4-11 §11.2, applied by R5-1 §1.2). An em-dash is a claim that the
 *     number exists somewhere. Five tiles left this file under that clause and
 *     the removals are recorded at the top of `fixtures/metrics.ts`.
 *
 * **Where it renders: the delta line, not a new one.** When the value is absent
 * the delta is *entailed* to be absent — you cannot compute a change from
 * nothing — so the tile has exactly one line on which to say one thing, and
 * without this field it says the less important of the two. Two consequences
 * the ruling states so they are not discovered: the **caption does not render**
 * while the value is absent (a denominator with no numerator is noise), and
 * `comparison.reason` is **not shown** on such a tile — it is not deleted, it
 * is still the right thing to say when a value exists and a comparison does
 * not.
 */
export type ValueAbsenceReason = 'not-captured' | 'not-computable'

export interface Metric {
  /** Stable, dotted, namespaced by sub-tab: `management.overview.activeSubscriptions`. */
  key: string
  /**
   * The sub-tab this tile belongs to — a `SubTabRoute['subTabId']`. Lets the
   * metrics library sidebar (§3.7 customise mode) group and filter without a
   * second table.
   */
  subTabId: string
  /**
   * §3.7's metrics-library grouping. Legacy has no such taxonomy; these are the
   * five categories the reference sidebar uses, mapped onto this product.
   */
  category: MetricCategory

  /**
   * **`null` means not computable, and it is not `0`.** An average renewal rate
   * over zero subscriptions is `null`; a renewal rate that is genuinely zero is
   * `0`. Legacy conflates them — `renewRateAvg != null ? renewRateAvg+'%' : '—'`
   * gets it right on that one tile (`:6913`) and `activeSubs.length` gets it
   * wrong on every other, because a count of an empty set and a count that
   * failed to compute look identical.
   */
  value: number | null
  /**
   * Why `value` is absent. **Non-null if and only if `value === null`** — R5-1.
   *
   * A tile that cannot state an honest reason for its absence is a tile whose
   * measure has no store, and a measure with no store **does not render**
   * (R4-11 §11.2). So this field has no `'unknown'` member and never will: the
   * case it would cover is the case that leaves the board.
   */
  absenceReason: ValueAbsenceReason | null
  unit: MetricUnit
  /** Set iff `unit === 'money'`. The product is Saudi-only; the field exists so that stays a choice. */
  currency: CurrencyCode | null

  /** **Required.** When the server computed it. There is no such field anywhere in the legacy app. */
  asOf: IsoDateTime

  /**
   * The window the value covers. **Both `null` on a point-in-time metric** —
   * "active captains right now" is not a period, and giving it one invites a
   * date-range control that would do nothing.
   */
  periodStart: IsoDate | null
  periodEnd: IsoDate | null

  comparison: MetricComparison
  /**
   * The delta, in percent, computed **server-side**. `null` if and only if
   * `comparison.kind === 'none'` — asserted in `clients/metrics.test.ts`, so a
   * screen may branch on either and get the same answer.
   *
   * Signed: `-12.5` is down 12.5 %. Rounded to one decimal at the source, so
   * two screens showing the same tile show the same number.
   */
  deltaPercent: number | null
  direction: MetricDirection | null
  /**
   * Whether `up` is the good direction.
   *
   * **Drives the delta's screen-reader valence phrase. It does NOT drive
   * colour** — the chip is neutral, always (D7 §4.9, and R5a, which enumerates
   * red's four permitted uses and a delta chip is none of them). See
   * `design/07-rulings-r4.md` R4-5, which voids §3.7's colour-coding MUST for
   * Eyvar. The field is still required: a rising cancellation rate is not a
   * win, and no screen can derive that from the key, the unit or the sign.
   */
  higherIsBetter: boolean

  /**
   * One line under the label stating **what a reader must know to read the
   * number correctly, and nothing else**, as a translation key. `null` on a
   * tile that needs none, which is most of them.
   *
   * **R4-4 §4.2 as amended by R5-4.** Three kinds and no fourth: a **scope
   * limit**, a **denominator**, or **the direction that counts as good, where
   * the label does not make it obvious**. It never states a value, never states
   * a status, never states the delta, never carries a call to action and never
   * carries a link. One line, **≤38 characters**, truncates, never wraps. It is
   * a key with parameters, never a concatenation (AC-713).
   *
   * **The third kind is R5-4 correcting a rule of the designer's own.** The
   * two-item list that preceded it was two instances mistaken for a definition;
   * the four prohibitions were always the rule. Valence is inside it because
   * R4-5 made the delta chip neutral, which spent `higherIsBetter` on a
   * screen-reader phrase and left a sighted operator no valence carrier except
   * words. On the overturn tile the intuition runs backwards and words are the
   * only instrument left. **This is also the slot AC-719's "caveat" wanted —
   * the caveat and the caption are the same slot, not two.**
   *
   * **It does not render while the tile's value is absent** (R5-1 §1.3): a
   * denominator with no numerator is noise, and a tile carries one explanation,
   * not two. AC-641 / AC-674 / AC-675's *"cannot ship without a caption"* is an
   * obligation on the tile **in its content state**, so the key stays seeded.
   *
   *   legal    `Excludes pending applicants.` · `1 of 4 cities is live.` ·
   *            `Ceiling is 3%.` · `Of decided appeals. Higher is better.`
   *   illegal  `Up 8% on last week.` (that is the delta) · `Needs attention.`
   *            (that is a status, and R7 owns those) · `Review the queue →`
   *            (that is an action, and a tile is not a banner) ·
   *            `Not captured yet` (that is an absence — `absenceReason` owns
   *            it, and it lives on the delta line)
   *
   * Legacy carries exactly this line on the tiles that need one — *"excludes
   * pending applicants"* (`:10374`), *"5 of 12 total"* (`:6916`), *"ceiling
   * 3 %"* (`:15025`) — and three tiles here cannot ship without it (AC-641,
   * AC-674, AC-675). A number whose scope is not stated is a number that gets
   * quoted wrong.
   */
  caption: string | null

  /**
   * The resource this is an aggregate **of**, when it is one — `'drivers'`,
   * `'subscriptions'`, `'trips'`. `null` for a metric with no row-level source.
   *
   * This is what stops the overview and the index table disagreeing about the
   * number of active captains: the mock derives the value from the same fixture
   * the index client serves, and this field records that it did.
   */
  sourceResource: string | null
  /** Where the rows are. §3.7's report icon target. `null` when there is nothing to drill into. */
  drilldownRoute: string | null

  /**
   * **How loudly this board says this number** — `lead` or `supporting`.
   *
   * ## The defect
   *
   * A board rendered every metric it had at one size, in one grid, in fixture
   * order. Operations Overview is thirteen of them: measured at 2400px, twelve
   * tiles at **491px wide and 28px of numeral, without exception**. The board
   * had no opinion about which of `SLA attainment 80.4%` and
   * `Rider abandonment 3.7%` an operator should read first, so it gave them
   * identical weight and left the ranking to whoever was looking — which on a
   * console read under pressure means the ranking does not happen.
   *
   * The owner's reading was that these pages are *"so hard to read and get any
   * info from"*, and the specific ask was that **more important metrics be
   * bigger than others**. This field is what makes that statable.
   *
   * ## Why it is editorial and NOT derived from the value
   *
   * The tempting rule is to promote whatever is in a bad state — biggest
   * breach, worst delta, reddest number. It is the wrong rule, and not
   * marginally:
   *
   *   1. **Rank would then change with the data.** A tile that is 36px on
   *      Monday and 28px on Tuesday teaches an operator nothing about where to
   *      look, and the muscle memory a console is read with never forms. Layout
   *      that moves under you is worse than layout with no hierarchy at all.
   *   2. **Importance and badness are different facts.** `SLA attainment` is
   *      the number this board exists to report whether it is 99% or 40%.
   *      `Identity collisions` is worth a tile and is not the headline even on
   *      the day it spikes. A board is *about* something, and what it is about
   *      does not depend on today's reading.
   *   3. **The urgent case already has its own instrument.** R4-4 §4.3's
   *      notice is how a board shouts about a condition, capped at one, chosen
   *      by tone and severity. Valence — the caret and the word beside the
   *      chip — is how a single tile says its news is bad. Neither needs the
   *      type ramp, and spending size on them would leave the board with no way
   *      to say what it is *for*.
   *
   * So the rank is declared, per board, in `BOARD_LEADS` — one legible table of
   * nine editorial decisions rather than eighty-nine scattered flags. It is a
   * data question answered in the data layer, exactly as *which* tiles a board
   * carries already is.
   *
   * **Three leads per board, and the number is a constraint rather than a
   * coincidence.** A hierarchy with six things at the top is a hierarchy with
   * none; three is what the reference's stat strip carries and what a 3-up row
   * renders at a readable width in both languages. `board.test.ts` holds every
   * board to it, so a tenth board cannot ship with eight leads and no ranking.
   */
  rank: MetricRank
}

/**
 * §H4 — the two weights a board renders a number at.
 *
 * Deliberately two and not three. A middle tier would have to be readable as
 * *neither* the headline nor the supporting detail, and at the three sizes the
 * ramp actually has between 28px and the body there is no room to draw that
 * distinction — the result would be three sizes an operator reads as noise.
 */
export type MetricRank = 'lead' | 'supporting'

/** §3.7's metrics-library categories, mapped onto this product. */
export type MetricCategory =
  | 'revenue'
  | 'subscriptions'
  | 'supply'
  | 'demand'
  | 'service'
  | 'risk'

/**
 * One point. `value: null` is a **gap** — the day exists in the range and we
 * have no reading for it. A gap is not a zero: a chart draws a break, not a dip
 * to the axis, and conflating them is how an outage looks like a collapse in
 * demand.
 */
export interface SeriesPoint {
  at: IsoDate
  value: number | null
}

export interface SeriesWindow {
  periodStart: IsoDate
  periodEnd: IsoDate
  /**
   * Ordered by `at`, ascending, no duplicates. **Empty means no data for this
   * range** — §3.7's centred sentence, card and title retained. Distinct from
   * a window of all-`null` points (we know the days and have no readings) and
   * from a window of all-zero points (we know the days and the answer is zero).
   */
  points: SeriesPoint[]
}

export interface TimeSeries {
  key: string
  subTabId: string
  unit: MetricUnit
  currency: CurrencyCode | null
  /** **Required**, same as `Metric.asOf`. */
  asOf: IsoDateTime
  /** The solid line. Always present, possibly with zero points. */
  current: SeriesWindow
  /**
   * The dotted line, same hue (§3.7). `null` when there is no comparison period
   * — which is most of this dataset, for the reason `:6979` states.
   *
   * **There is no third field and there will not be one.** See the file header.
   */
  comparison: SeriesWindow | null
  /** Mirrors `Metric.higherIsBetter` so a chart can tint a trend without joining to a tile. */
  higherIsBetter: boolean
  /**
   * **R5-11, the same field as `MetricBreakdown.awaitingStore` and for the same
   * reason.** *No store* and *the query ran over this range and returned
   * nothing* are both zero points, and they are not the same sentence. The
   * chart card keeps its title either way — a tile with no store does not
   * render at all (R4-11 §11.2) and a card does, because a tile has no body and
   * a card does.
   */
  awaitingStore: AwaitedStore | null
}

/**
 * A row label. **R5-7 — a discriminated union, and it is not tidiness.**
 *
 *   `kind: 'key'`   **copy.** A closed set: a rota day, a queue, a plan tier, a
 *                   reason code. Takes the **page** direction — a translated
 *                   label in an Arabic console must lay out RTL.
 *   `kind: 'text'`  **data.** A person, a city, a subscription. Nothing
 *                   translates it and nothing may try. Its direction is
 *                   **unknown at build time** — `Abdulaziz Al-Suwailem` in an
 *                   Arabic console is the shipping case, and it is LTR — so it
 *                   takes `<bdi>`, and the truncating box takes the run's
 *                   direction, not the page's.
 *
 * That second line is **V-4**. Under `dir="rtl"` an overflowing Latin row label
 * is ellipsised at its *head* — `Abdulaziz Al-Suwailem` → `…uwailem` — because
 * the truncating span carries the page direction while a `<bdi>` inside carries
 * `ltr`. With the union the fix is *targetable*: `dir="auto"` /
 * `unicode-bidi: plaintext` on the truncating box **for `text` labels only**.
 * Without it, the same treatment would have to be applied to translated labels,
 * and that is wrong for them.
 *
 * What this replaces is `labelKey: 'breakdown.row.entity'` with
 * `labelParams: { name }` — a pass-through key whose entire English string was
 * `{name}`. It satisfied AC-697 and it was a fig leaf, and both the fixture and
 * the component said so independently before the ruling granted it.
 * **AC-697 gains the clause that would have caught it: a row label is never a
 * key whose whole string is a parameter.**
 */
export type BreakdownLabel =
  | { kind: 'key'; key: string; params: Record<string, string | number> | null }
  | { kind: 'text'; text: string }

/**
 * One row of a ranked list. **R4-4 §4.1 as amended by R5-5 and R5-7, and every
 * slot below is normative.**
 *
 * ```
 * ┌─ Top 5 riders at risk ──────────────────────────────────────────┐
 * │  Abdulaziz Al-Suwailem                        884.00 SAR        │  label / the ONE numeric column
 * │  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇                                 │  optional bar, 4px, --chart-series
 * │  High churn risk · 63 trips                                     │  optional sub-label — the second fact
 * │  Showing the top 5 of 7 riders.                                 │  AC-696
 * └─────────────────────────────────────────────────────────────────┘
 * ```
 */
export interface MetricBreakdownRow {
  id: string
  /** A key for a closed set, text for an entity — R5-7. Truncates, never wraps. */
  label: BreakdownLabel
  /**
   * The row's second fact — **categorical, numeric, or both joined by a
   * middot**. `Document expired` · `63 trips` · `Document expired · 3 of 19
   * trips ran late`. Optional.
   *
   * A key with `subLabelParams`, never a concatenation (AC-713).
   */
  subLabelKey: string | null
  /**
   * **NEW — R5-5.** The parameters a numeric sub-label interpolates.
   *
   * **These are bare numbers and the component formats them**, which is the
   * `overview.compare.target` precedent §11.4 cites: `MetricComparison.value`
   * is a `number` and `MetricTile` calls `formatMetricValue` before handing it
   * to `t()`. A `%` assembled in the component *by concatenation* is what
   * AC-713 forbids; a `%` produced by `formatPercent` and interpolated into a
   * key is not, and it is the only form that survives translation — a
   * pre-formatted `'45%'` stored here could never render Arabic-Indic digits.
   *
   * The unit of each param is a property of the **key**, and every key in use
   * is listed in `fixtures/metrics.ts`. `{rate}` is a percent; `{late}`,
   * `{total}`, `{trips}`, `{past}` and `{count}` are counts.
   */
  subLabelParams: Record<string, string | number> | null
  /**
   * **The only numeric column** (R5-5). Right-aligned, tabular figures, and it
   * does not flip in Arabic (R4). Formatted from this row's own `unit`.
   *
   * `secondaryValue` / `secondaryUnit` are **withdrawn**. Two right-aligned
   * numbers with no header row is a table without a table's affordances, and
   * R4-6 already ruled that a board's list wanting columns becomes a table. A
   * second numeric fact is a **noun phrase in the sub-label**, which is the
   * reference's own construction (`analytics-dashboard-today-no-data.webp`,
   * `Online store conversion rate`: `Added to cart / 0.00% / 0 sessions`) and
   * the only shape that names it.
   */
  value: number
  unit: MetricUnit
  currency: CurrencyCode | null
  /**
   * `0..1`, **share of the largest row shown** — `value / max(value over rows
   * shown)`, so the top bar is always full (R5-6).
   *
   * Share-of-**max**, not share-of-total. A ranked list's question is *"how far
   * behind the leader?"*; share-of-total answers a composition question that a
   * `Top 5 of 14` cut-off has already broken. Before this ruling three
   * breakdowns used three different denominators — largest row, total, and 42 —
   * all legal by the letter of *"one denominator"*, which only ever constrained
   * them *within* a list.
   *
   * **`null` whenever the breakdown's `bar` is false**, so a row cannot draw a
   * bar the list forbids.
   */
  barFraction: number | null
  /**
   * **`null` renders plain text, never a link** (AC-693, AC-653). A row links
   * only to a destination *already filtered to that row*; a link to an
   * unfiltered list is worse than no link, because it looks like it worked.
   */
  drilldownRoute: string | null
}

/**
 * A ranked list on a board. One construction, not three (R4-4 §4.1).
 *
 * Four rules the type cannot express and the fixtures obey:
 *
 *   - **No mutating control, ever** (AC-694). A breakdown is a reading surface.
 *     A row that can be acted on is a work-queue row and belongs on a queue.
 *   - **Fewer rows than the cut-off renders all of them** (AC-691) — no
 *     padding, no `and 0 more`.
 *   - **Zero rows is R8's second kind** (AC-692): one grey sentence, never the
 *     first-run illustration, because the section is empty and the page is not.
 *   - **The total agrees with the tile above it** when both measure the same
 *     set (AC-695). If they disagree the board is worse than having neither.
 */
export interface MetricBreakdown {
  /** Stable. The translation-key root for the heading (AC-690). */
  key: string
  /** `'zone' | 'reason-code' | 'queue' | 'hour-of-day' | …` — stated above the rows in words. */
  dimension: string
  /** The cut-off, `n`. */
  rowsShown: number
  /** So AC-696's `Showing the top {n} of {total}` needs no second request. */
  rowsTotal: number
  /**
   * **Three conditions, all required — R4-4 §4.1 as amended by R5-6.** Every
   * row shares **one unit**, every row shares **one denominator**, and
   * **`max > min` across the rows shown**.
   *
   * Where rows are rates over their own bases, or counts of different things,
   * the bar is a lie about a shared scale — omit it. Where every row is the
   * same height the bar is 20px of row height per row carrying no information;
   * `admin.rotaGapsByDay` is seven rows all valued 6, so `max === min`, so
   * `bar: false` **by rule and not by taste** (V-13). The finding those seven
   * equal numbers encode survives — *nobody is on call at any hour of any day*
   * — because the numbers say it.
   *
   * **Zero rows shown cannot satisfy `max > min`**, so an empty breakdown
   * carries `false`. It is a statement about the rows there are, not a promise
   * about rows that might arrive.
   *
   * The bar is `--chart-series` at 4px on an unpainted track, `aria-hidden`, and
   * every bar sits beside its own number in text. Not `--chart-fill`: a pale
   * area fill is what sits *under a line*, where the line does the delimiting; a
   * ranked bar is the quantity mark itself, and the reference draws it
   * saturated (`analytics-live-view-globe-map.webp`, `Top locations`).
   */
  bar: boolean
  /**
   * **R5-9, §18.1, in the §20.2 shape.** One sentence stating a reason the
   * ranking below may not be trusted, rendered **under the heading and above
   * the first row** — *"a gate that appears after the thing it gates is not a
   * gate."*
   *
   * **`null` is the normal value**, and it is `null` on all seven fixtures
   * today. See `MetricCaveat` for why the one card the ruling was written for
   * still does not carry one.
   */
  caveat: MetricCaveat | null
  /** **R5-11.** The third absence: no store, as opposed to nothing to rank. */
  awaitingStore: AwaitedStore | null
  rows: MetricBreakdownRow[]
}

/**
 * **R5-9 as §20.2 re-shaped it: three fields that exist only together.**
 *
 * `caveatKey` and `caveatParams` as two independent nullables were withdrawn
 * because they permit three states and only one is meaningful — a key with no
 * params, params with no key, and the pair. A single nullable object has two.
 *
 * ## `gatedBy` is the ruling, not decoration
 *
 * §18.1's guard was *a caveat exists only where a spec criterion names the
 * condition that raises it and the threshold that clears it*. **A guard phrased
 * as a sentence can only be enforced in fixture review**, which is how §4.2
 * rotted. `gatedBy` enforces it by construction: the field cannot be filled
 * without naming the metric that carries the condition, and that metric is on
 * the same board, already showing its own number and its own target.
 *
 * It is **R4-4 §4.3's own test one level down** — *a notice may only exist for
 * a condition the board already shows a number for.*
 *
 * And it makes §18.6 arithmetic instead of judgement: look up `gatedBy` on the
 * board; if its `value` is `null` there is no answer, so there is no threshold
 * to have crossed, so **the caveat is `null`**.
 *
 * > **Which is why `support.contactReasons` carries no caveat**, though it is
 * > the card AC-674 was written for. Its gate is `support.uncodedContactShare`,
 * > which is **`not-computable`** — a rate over a zero denominator, because
 * > `DB.contacts` is `[]`. There is no share to state. Seeding one to
 * > demonstrate the slot would be the same defect as an invented SLA window
 * > (**AC-453**): a plausible number standing in for a measurement nobody took.
 */
export interface MetricCaveat {
  /** `breakdown.caveat.uncodedRanking` — the only key in the vocabulary today. */
  key: string
  /**
   * **Bare numbers; the component formats them before interpolation** — the
   * same contract as `subLabelParams`, and the same reason: a pre-formatted
   * `'12%'` stored here could never render Arabic-Indic digits. `{share}` is a
   * percent.
   */
  params: Record<string, string | number> | null
  /**
   * **The `MetricTile.key` on this board that raises the caveat.**
   *
   * A free string, deliberately, and note the asymmetry with `AwaitedStore`
   * below: **a metric key has referential integrity** — something can check it
   * points at a real tile on the same board — **so the check is used. A store
   * name has nothing to check it against, so the set is closed instead.**
   * Where a check exists, use it; where none does, close the set.
   */
  gatedBy: string
}

/**
 * **R5-11 — the store a measure is waiting on, as a closed union.**
 *
 * The third absence. Two zero-row cards are not the same card:
 *
 *   - *we ranked and this window had nothing* → `awaitingStore: null`, rows
 *     empty. R8's second kind, one grey sentence.
 *   - *nothing is captured, so no ranking happened* → this field set.
 *
 * Conflating them is **V-2 at card scale**, which is the defect this whole
 * round exists to close. Only the data layer knows which it is, so provenance
 * is the seam's to state and not the component's to infer.
 *
 * **A closed union rather than `string | null`, and the reason is worth
 * carrying: a free string can be a placeholder and pass.** That is
 * `breakdown.row.entity`'s exact failure mode — the fig leaf R5-7 exists to
 * delete. A union member cannot be invented at a call site.
 *
 * This is the same distinction already drawn one level down, at tile scale, and
 * the classification follows the same evidence:
 *
 *   - `contactsPerThousandTrips` is **`not-captured`** — the store is declared
 *     and empty (`DB.contacts = []`).
 *   - `uncodedContactShare` is **`not-computable`** — a rate over a zero
 *     denominator.
 *
 * `'contact-log'` is the store the first of those waits on; `'payments-by-entity'`
 * is the keyed-by-entity payment store an integrity scan needs and the legacy
 * app has never had.
 *
 * **A card awaiting a store does not count as content for `isBoardEmpty`** —
 * same reasoning as §4.3's notice: a surface that is only telling you it has
 * nothing is not something.
 */
export type AwaitedStore = 'contact-log' | 'payments-by-entity'

/** R7's five-tone palette, less `neutral`, which is not a banner tone. */
export type BoardNoticeTone = 'critical' | 'warning' | 'info' | 'success'

/**
 * A condition a board **declares**. It is not a banner.
 *
 * > **A board declares conditions; the page renders at most one banner**
 * > (R4-4 §4.3). R10 forbids two page-level banners on one page, and R5a
 * > permits exactly one page-level critical banner — so "render at most one"
 * > is mandatory rather than tidy. If `MetricBoard` rendered one and the shell
 * > rendered one, the product would have two and the second is the one nobody
 * > reads.
 *
 * The screen renders **the highest tone, then the highest `severity`**, in the
 * page banner slot between the header and the tile grid. The selection is total
 * because **`severity` is unique among a board's notices of the same tone**;
 * two notices sharing a tone and a severity is a **fixture defect**, not a
 * rendering question, and it is enforced by a test over these fixtures rather
 * than by a synthetic case.
 *
 * **R5-3 deleted the third clause, and the designer named it as their own
 * error.** *"A tie-break decided by the order somebody typed an array is not a
 * tie-break. It is a coin flip with a stable seed."* Two conditions equally
 * severe and equally urgent is a real editorial problem on a board and it
 * should surface as a defect, not be resolved silently by a line number and
 * `Array.prototype.sort` happening to be stable in this runtime.
 *
 * A board declares **at most three**. The suppressed conditions are not
 * lost: each is independently visible in the tile or breakdown it came from,
 * and **that is the test — a notice may only exist for a condition the board
 * already shows a number for.** A banner nothing on the page corroborates is a
 * banner the operator cannot act on.
 */
export interface BoardNotice {
  /** Translation-key root. Two keys per count — `.one` / `.many` — never a pluralisation by concatenation (AC-713). */
  key: string
  params: Record<string, string | number> | null
  tone: BoardNoticeTone
  /** Verb-first fragment plus a route. No period (R6, §5.7). `null` when there is nowhere to send them. */
  action: { labelKey: string; route: string } | null
  /**
   * Tie-break **within** a tone. Higher wins.
   *
   * **Unique among a board's notices of the same tone** — R5-3. That uniqueness
   * is what makes the selection total, so it is an invariant of this fixture and
   * not a convention: a duplicate `(tone, severity)` pair is a fixture defect.
   */
  severity: number
}

/**
 * Everything one table-less sub-tab renders, in one response.
 *
 * One request per screen rather than one per tile: eight overviews × six tiles
 * is 48 round trips, and §3.7's grid is laid out as a unit — a page that
 * resolves tile-by-tile reflows six times before it settles.
 */
export interface MetricBoard {
  subTabId: string
  /** The board's own computation instant. Individual metrics may be older; each carries its own. */
  asOf: IsoDateTime
  metrics: Metric[]
  charts: TimeSeries[]
  /** Ranked lists, in the order the board declares them. Empty on a board that specifies none. */
  breakdowns: MetricBreakdown[]
  /** Declared conditions, **at most three**. The page renders at most one. */
  notices: BoardNotice[]
}

/**
 * One row of `DB.dailySnapshots` (`eyvar_ops_panel_v40_fixed.html:13803`–`:13832`),
 * the only real history the legacy app holds.
 *
 * `captureDailySnapshot` (`:7645`–`:7653`) writes nine fields once a day. The
 * legacy comment above the array is candid about what it is — *"a point-in-time
 * rollup captured on demand (this file has no server to run a real midnight
 * cron)"* (`:13796`–`:13800`) — and `renderTrendChart` (`:6769`) already plots
 * two of them and computes a first-to-last change percentage at `:6776`.
 *
 * **Money is halalas here, not the SAR strings legacy stores.** The legacy rows
 * carry `totalRevenue:'295.05'` and the app `toFixed(0)`s them at render
 * (`:14383`). The conversion happens once, at this fixture, per §4.3.
 *
 * **`date` is an `IsoDate`, not legacy's `'26 Jun 09:00'`.** The capture instant
 * is always 09:00 Riyadh and carrying it in a display string is how a series
 * ends up sorted lexically.
 */
export interface DailySnapshot {
  /** `SNAP-0001` … `SNAP-0030`, ascending with `date`. */
  id: string
  /** The day the rollup covers. Legacy captures at 09:00 Riyadh (`:13803`). */
  date: IsoDate
  /** Total riders on the platform that day — a census, not a period count. */
  riders: number
  /** Captains **excluding `pending`** — legacy's own exclusion (`:7649`). */
  drivers: number
  /** Subscriptions whose status does not match `/cancel/i` (`:7648`). */
  activeSubs: number
  /** Quick-ride trips that day (`:7648`). */
  quickRides: number
  /** Cancelled ÷ quick rides, rounded to a whole percent (`:7650`). */
  cancelRatePct: number
  /** All paid payments that day (`:7650`). */
  totalRevenueHalalas: number
  /** Paid payments of type `Quick ride fare` (`:7651`). */
  quickRideRevenueHalalas: number
  /** Paid payments of type `Subscription charge` (`:7651`). */
  subRevenueHalalas: number
}
