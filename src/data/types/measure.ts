/**
 * The **measure catalogue** — what can be measured, and over which population.
 *
 * `06-report-builder.md` §3.1 and D13 split ownership: this layer models *how a
 * question is composed*; `05-metrics-content.md` owns *what each number means*.
 * This file is the shape the two agree on, and the catalogue's nine findings
 * (§4.1 **F-1 … F-9**) are each a field below rather than a note.
 *
 * ## The one rule this file exists to enforce — R5-15
 *
 * > **Every measure declares its population. A measure that cannot name one
 * > does not enter the catalogue.**
 *
 * `design/09-rulings-r5.md` §25.2 states the general form and states why it is
 * a *field* and not a check: *"a rule about whether a measure exists cannot be
 * implemented as a test on what the fixture happens to contain."* That
 * predicate has failed twice here — once keyed on `value: null`, once on a
 * seeded literal.
 *
 * So `Measure.population` is **required and non-nullable**. There is no `null`
 * arm, no optional marker, and no `'unknown'` member. A measure whose
 * population cannot be named is not representable in this type, which is what
 * makes the rule an invariant instead of a convention. `Metric.sourceResource`
 * on a board tile is the same rule one level down, where `null` is legal
 * because a tile may be a formula rather than an aggregate (R5-15's
 * `contributionMargin` exemption); a *report* measure is an aggregate by
 * construction, so no exemption applies and none is modelled.
 *
 * A report builder is where the failure R5-15 closes would multiply: every
 * ad-hoc measure an operator composes is a new aggregate, and one that cannot
 * name its population is one that cannot be trusted or compared.
 *
 * ## Why a population is four fields and not one
 *
 * `sourceResource: 'drivers'` says which table. It does not say *which rows*,
 * *which date decides the bucket*, or *how far back the store actually goes* —
 * and those are where four people counting one metric carefully got four
 * answers. So:
 *
 *   `resource`      which store            — `'drivers'`, `'daily-snapshots'`
 *   `predicate`     which rows of it       — `[]` means every row, explicitly
 *   `timeField`     which date buckets it  — `endedAt`, never `startedAt`
 *   `coverage`      how far back it runs   — outside it, points are `null`
 *
 * `timeField` is the one most often left implicit and it changes every number:
 * `clients/metrics.ts` already carries the comment *"Trips that **finished**
 * inside the window. `endedAt`, never `startedAt`."* That sentence is a field
 * here.
 *
 * `coverage` is what makes a gap honest. §4.4.1: the mock must emit `null`
 * outside the fixture range, **not zeros and not synthetic noise** — a mock
 * that invents a smooth 90-day trend produces a screen that is a lie.
 */

import type { CurrencyCode, FilterSpec, IsoDate } from './common'
import type { MetricCategory, MetricUnit } from './metrics'
import type { PermissionRef } from './navigation'

/* ───────────────────────────── identity ────────────────────────────────── */

/**
 * A measure's identity, **independent of where it is displayed** — §4.1 **F-9**,
 * and the spec calls it the sharpest of the nine.
 *
 * `Metric.key` is namespaced by sub-tab (`management.overview.activeCaptains`).
 * If the same figure appears on two boards it gets two keys, and a saved report
 * pinned to one of them carries a foreign key into a *display decision*: moving
 * a tile between boards would break every report and every alert that named it.
 *
 * So a `MeasureKey` is `<domain>.<measure>` — `subscriptions.started`,
 * `revenue.total` — and no board name appears in it. Which tiles happen to show
 * the same measure is recorded in `displayedAsMetricKeys`, pointing the other
 * way, where a rename is cheap.
 */
export type MeasureKey = string

/** A dimension's key, `<resource>.<field>` — `trip.pickup`, `driver.city`. */
export type DimensionKey = string

/* ──────────────────────────── population ───────────────────────────────── */

/**
 * The window a store actually covers, inclusive on both bounds.
 *
 * **Both bounds are declared, never derived from the rows present.** Deriving
 * them would be the seed-shaped predicate again: a store with a three-day hole
 * in the middle and a store that ends three days early are different facts, and
 * `max(row.date)` cannot tell them apart.
 */
export interface MeasureCoverage {
  from: IsoDate
  to: IsoDate
}

/**
 * **The population — required on every measure. R5-15.**
 *
 * Read it as one sentence: *"count the rows of `resource` matching `predicate`,
 * bucketed by `timeField`, and answer `null` outside `coverage`."*
 */
export interface MeasurePopulation {
  /**
   * The store the rows come from. Same vocabulary as `Metric.sourceResource`
   * (`'drivers'`, `'riders'`, `'subscriptions'`, `'trips'`, `'daily-snapshots'`),
   * so a measure and a tile claiming the same population can be checked against
   * each other rather than trusted.
   *
   * **Not nullable.** See the file header.
   */
  resource: string

  /**
   * Which rows. **`[]` is a meaningful value — "every row of the resource" —
   * and it is not the same as an unstated predicate**, which this type cannot
   * express at all.
   *
   * The same `FilterSpec` vocabulary the tables emit (§3.4, `lib/columnFilter.ts`:
   * *"never introduce a parallel filter model"*).
   */
  predicate: FilterSpec[]

  /** The predicate in words, as a translation key. Never a concatenation (AC-894). */
  predicateKey: string

  /**
   * Which date decides the bucket a row falls into. A flow measure is
   * meaningless without it and two engineers will choose differently:
   * completed trips bucket on `endedAt`, started subscriptions on `startedOn`,
   * cancellations on `cancelledAt`.
   *
   * For a `daily-snapshot`-sourced measure this is the snapshot's own `date`.
   */
  timeField: string

  /**
   * For a snapshot- or column-sourced measure, the field the value is read
   * from. `null` when the measure is a row **count** and there is no value
   * column to read.
   */
  valueField: string | null

  /** How far back the store runs. Outside it every point is `null` — a gap, never a zero. */
  coverage: MeasureCoverage
}

/* ───────────────────────────── the measure ─────────────────────────────── */

/**
 * How a bucket's rows collapse to one number — §4.1 **F-2**'s other half.
 *
 * `additive` alone answers *"may this be summed across buckets and groups?"*;
 * it does not answer *"what is the value of one bucket?"*. §6.2 rule 2 says a
 * flow is *"summed if `additive`, otherwise the catalogue's declared
 * aggregate"* — this is that declaration.
 *
 *   `count`             how many rows fell in the bucket
 *   `sum`               the sum of `valueField` over them
 *   `mean`              their mean — never additive
 *   `end-of-period`     the reading as at the bucket's last instant (§6.2 rule 1)
 *   `cumulative-count`  how many rows exist **as at** the bucket's last instant
 */
export type BucketAggregate = 'count' | 'sum' | 'mean' | 'end-of-period' | 'cumulative-count'

/**
 * §4.1 **F-1**. A stock and a flow bucketed the same way produce a chart that
 * is confidently wrong, and today the signal exists only *per instance and
 * implicitly* — `Metric.periodStart`/`periodEnd` are both `null` on a
 * point-in-time metric, which cannot be read before a query runs.
 *
 *   `stock`  how many exist as of an instant. Changing the grain changes the
 *            sampling density and never the values (AC-820).
 *   `flow`   how many happened within the bucket. Changing the grain changes
 *            every value (AC-821).
 */
export type Temporality = 'stock' | 'flow'

/**
 * Bucket sizes a measure can answer at. **`'hour'` is included** — `design/07-rulings-r4.md`
 * §4.4 (F-12) closes the hourly *board* tile and moves the hourly *trend* here:
 * *"grain is a first-class control… `ReportQuery.grain` needs `'hour'`, gated by
 * the catalogue's `minGrain` exactly as the other grains are."*
 *
 * No measure in this product declares `minGrain: 'hour'` today, because no
 * store carries sub-daily history. The member exists so the gate is a data
 * change when one does, and so `Hour` is *disabled in place with a reason*
 * rather than absent (AC-816, D9 CQ-3).
 */
export type MeasureGrain = 'hour' | 'day' | 'week' | 'month'

/** §4.1 **F-3**. A group-by the measure can legally answer, with a cardinality hint. */
export interface DimensionRef {
  key: DimensionKey
  /**
   * Roughly how many distinct values to expect. Drives §7.4's eight-group fold
   * warning **before** a query runs, so the picker can say so. A hint, not a
   * guarantee — the fold is applied on the resolved result regardless.
   */
  cardinalityHint: number
}

/** A group-by dimension, catalogued so the picker is data and not a hardcoded menu. */
export interface Dimension {
  key: DimensionKey
  labelKey: string
  /** The store it belongs to. A dimension is only legal on measures over the same resource. */
  resource: string
  /** The row field it reads. */
  field: string
  cardinalityHint: number
}

export interface Measure {
  key: MeasureKey
  /** Translation key. **Never a display string** — AC-894, and a measure name reaches a chart title. */
  labelKey: string
  /** §3.7's metrics-library grouping, reused so the picker groups the way the board sidebar does. */
  category: MetricCategory

  /** **R5-15. Required.** See the file header. */
  population: MeasurePopulation

  /** §4.1 **F-1**. */
  temporality: Temporality
  bucketAggregate: BucketAggregate
  /**
   * §4.1 **F-2**. Whether values may be summed across buckets **or across
   * groups**. Gates stacked bars and gates the pie entirely (§7.2): a pie of
   * averages is arithmetic nonsense wearing a chart.
   */
  additive: boolean

  /** §4.1 **F-6**. Already exists on `Metric`; recorded so it is not dropped. */
  unit: MetricUnit
  /** Set **iff** `unit === 'money'`. Money on the wire is integer halalas. */
  currency: CurrencyCode | null

  /**
   * §4.1 **F-7**. The alert builder needs it to word a comparator honestly and
   * to decide whether over the line is good news (AC-878). It does **not**
   * drive colour — R4-5 made the delta chip neutral, always.
   */
  higherIsBetter: boolean

  /** §4.1 **F-4**. The coarsest grain the store can honestly answer at. §3.5. */
  minGrain: MeasureGrain

  /** §4.1 **F-3**. Empty is a real answer: a snapshot row has no city, so it has no legal split. */
  dimensions: DimensionRef[]

  /**
   * §4.1 **F-5**. 382 filterable fields exist across the data layer and almost
   * none are meaningful against a given measure. A two-measure query offers the
   * **intersection**, and an empty intersection disables the filter control —
   * *"that is the correct behaviour, not a bug"* (§3.4).
   */
  filterableFields: string[]

  /**
   * §4.1 **F-8** — the D4 hook, and the spec calls it the single most
   * load-bearing missing field.
   *
   * `null` means **no permission gates this measure**, not "unknown". D4 is
   * open, so the only keys used here are ones that exist today in
   * `PERMISSION_KEY`s; nothing is invented to fill the gap. §13.1: redaction is
   * at the data layer, per viewer, and a blocked series comes back with
   * **no points in the payload**.
   */
  permission: PermissionRef | null

  /**
   * One line stating what a reader must know to read this number correctly, as
   * a translation key. Same slot and same three kinds as `Metric.caption`
   * (R4-4 §4.2 as amended by R5-4): a scope limit, a denominator, or the
   * direction that counts as good. `null` where none is needed.
   *
   * It is where a population that differs from a board tile's population gets
   * said out loud.
   */
  captionKey: string | null

  /**
   * The board tiles that display **this same measure** — F-9's back-reference.
   *
   * Pointing this way round is the point: a tile move is a rename here, not a
   * broken saved report. **An empty array is a claim**: it says no tile shows
   * this measure over this population. Where a tile shows a same-named figure
   * over a *different* population, it is deliberately **not** listed, because
   * naming it would make R5-14's cross-check runnable and false — *"a worse
   * failure than the one the rule closes, because it looks audited."*
   */
  displayedAsMetricKeys: string[]
}

/* ───────────────────────────── pairing ─────────────────────────────────── */

/**
 * Why two measures may not be drawn together — §6.2, AC-822 … AC-825.
 *
 * Returned, never thrown: this is a domain outcome and the panel renders the
 * reason beside a disabled control. Exceptions are for transport.
 */
export type MeasurePairRefusal = 'different-temporality' | 'different-unit' | 'different-currency'

/**
 * May these two measures appear in one query?
 *
 * **A refusal, not a warning.** §6.2: *"a warning that can be dismissed is a
 * warning that will be dismissed, and the resulting chart gets screenshotted
 * into a board deck where the warning does not travel."*
 *
 * Same `temporality` and same `unit` (and same currency where money). Returns
 * `null` when the pair is legal.
 *
 * Note what this does **not** test: scale. Two count measures an order of
 * magnitude apart are a legal pair and a dishonest overlay — that is handled by
 * giving them separate panels (`ReportPanel`), not by refusing the pair. R4-1
 * §1.2(c): the owner's own example fails on scale before it fails on hue.
 */
export function pairRefusal(a: Measure, b: Measure): MeasurePairRefusal | null {
  if (a.temporality !== b.temporality) return 'different-temporality'
  if (a.unit !== b.unit) return 'different-unit'
  if (a.currency !== b.currency) return 'different-currency'
  return null
}

/** The measures in `all` that may be paired with `first`. Empty is a real answer (R4-1 §1.3). */
export function pairableWith(first: Measure, all: readonly Measure[]): Measure[] {
  return all.filter((m) => m.key !== first.key && pairRefusal(first, m) === null)
}

/** Grain sizes, coarsest last. Used to gate a query's grain against `minGrain`. */
export const GRAIN_RANK: Record<MeasureGrain, number> = {
  hour: 0,
  day: 1,
  week: 2,
  month: 3,
}
