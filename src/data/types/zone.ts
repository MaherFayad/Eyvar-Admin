/**
 * Market & Zones — the zone-health row.
 *
 * Commissioned by **R4-6b** (`docs/05-restructure/design/07-rulings-r4.md`
 * §6.6), which closes gap 1: *"`zones` is not a resource in `src/data`. There is
 * no fixture, no client, no type."* §6.6.5 gives the ten-field shape and marks
 * four of them derived; this file is that table, typed.
 *
 * ## Why this resource exists at all, in one sentence
 *
 * **R4-6** ruled that Market & Zones is an Index table (§3.1–3.3) with a metric
 * strip (§3.7) above it, and that the strip's four tiles are *filters into the
 * table*. A strip that filters a table it cannot see is four hand-written
 * literals sitting above six rows that disagree with them.
 *
 * ## The rule that decides every field below (R4-6b §6.6.4)
 *
 * > **When the table lands, Market & Zones' four metric tiles MUST be derived
 * > from the table's own rows. They may not remain literals.**
 *
 * So the split here is not stylistic. **Six stored fields, and everything else
 * derived from them**, because the alternative — a stored `failureRate` beside
 * a stored `failures30d` — is two numbers that can disagree, and eventually
 * will. `DESIGN.md` §8.2: *a derived value is not a disabled input.*
 *
 * The derivation is checked against the values the board already publishes:
 *
 * | Tile | Was a literal at | Derives to |
 * |---|---|---|
 * | `management.zones.starvedZones` | `fixtures/metrics.ts:884` | `2` |
 * | `management.zones.unservedRequests30d` | `:906` | `31` |
 * | `management.zones.avgFailureRate` | `:928` | `45` |
 * | `management.zones.worstDemandSupplyRatio` | `:977` | `7` |
 *
 * **All four agree with the literal they replace.** The derivation changed no
 * published number — it removed the possibility of one drifting.
 *
 * ## What is NOT on this row, and where it went instead
 *
 * The zones strip's other two tiles are not zone-derived and stay literals with
 * their own sources: `steerOffersLive` counts `DB.steerOffers` (`:14140`,
 * seeded empty) and `liveCities` counts `DB.cities` (`:13946`). Deriving a
 * `liveCities` from a zone array would be deriving a city count from six rows
 * that are all in one city, which is **L-6**'s own mistake in a new place.
 */

import type { BadgeTone, IsoDateTime } from './common'

/* ────────────────────── recruitment priority ────────────────── */

/**
 * The row's verdict, as legacy computes it inline at `:14153`:
 *
 * ```js
 * ratio>=3||fr>=50 ? 'Recruit now' : ratio>=2||fr>=25 ? 'Watch' : 'Healthy'
 * ```
 *
 * Named as an enum rather than left as a rendered string because it is a filter
 * value, a sort key and a badge — three consumers, one vocabulary.
 */
export type RecruitmentPriority = 'recruit-now' | 'watch' | 'healthy'

/**
 * **Two priorities share one tone, and that is the ruled answer, not a gap.**
 *
 * `recruit-now` is legacy's red badge (`b-red`, `:14153`) and R5a leaves no red
 * badge to give it. **R4-10.1** already settled this exact shape one level up —
 * *"`critical` and `high` are both `warning`"* — so the severity step is
 * carried by the **label**, and `starved` carries the R5a row-level signal for
 * the rows that need one. Checked against R7's five tones before it was
 * written; no sixth tone is requested and none is needed.
 */
export const RECRUITMENT_PRIORITY_TONE: Readonly<Record<RecruitmentPriority, BadgeTone>> = {
  'recruit-now': 'warning',
  watch: 'warning',
  healthy: 'success',
}

/** `demand ÷ supply >= 3` is *starved* (`:14133`). Stated once, used by the badge, the tile and the row. */
export const STARVED_RATIO = 3

/** Legacy's healthy target inside `needed` (`:14155`): *"≤3 demand per driver"*. */
export const HEALTHY_DEMAND_PER_CAPTAIN = 3

/* ──────────────────────── steering offer ────────────────────── */

/**
 * A voluntary repositioning incentive — `DB.steerOffers` (`:13960`), written by
 * `commitSteerOffer` (`:14018`). Seeded **empty**, as legacy seeds it, so
 * `steerOffersLive` is a measured `0` rather than an em-dash.
 *
 * Money is halalas here. Legacy carries SAR floats (`amount:12`, `cap:300`) and
 * formats them with `fmtSAR` at the call site; the conversion happens once, at
 * the seam.
 */
export interface ZoneSteerOffer {
  id: string
  zoneId: string
  /** `+{amount}/trip` in this zone. Positive integer halalas. */
  bonusPerTripHalalas: number
  /** The offer auto-closes when spent (`:14026`). */
  budgetCapHalalas: number
  spentHalalas: number
  accepted: number
  /** How many available captains it was pushed to (`steerableDrivers`, `:13984`). */
  sentTo: number
  /** Server-issued deadline, **not** legacy's ticking `minutesLeft` (`:14035`). A countdown is the UI's to run off this. */
  expiresAt: IsoDateTime
  status: 'active' | 'closed'
}

/* ────────────────────────── the row ─────────────────────────── */

/**
 * One zone, as the zone-health table reads it. **Worst-first by
 * `failureRate`** — legacy's own sort (`:14132`) and the table's default.
 *
 * Ten fields from R4-6b §6.6.5, plus two that the ruling's clause 2 requires
 * and its field list does not name: `activeSteerOffer` and
 * `recruitmentQueuedAt` are what the two row actions read to decide whether to
 * render a button or a state. Both are declared here as additions rather than
 * folded in silently.
 */
export interface Zone {
  /** `ZONE-01` … `ZONE-06`. Legacy keys zones by `name` (`:13993`) — a display string as a primary key. */
  id: string
  /** `Al Narjis`, `KAFD / Olaya`. */
  name: string
  /**
   * **Every seeded zone is in Riyadh**, and R4-6b is explicit that the fixture
   * *"should keep it rather than hide it"* — it is the cause of **L-6**. A
   * `city` field on a six-row table where every value is the same looks
   * redundant until the moment someone asks why the executive overview's other
   * three cities render em-dashes.
   */
  city: string

  /* ── stored: the three readings the whole table is computed from ── */

  /** 30-day request count for the zone. */
  demand: number
  /** Captains active in the zone. **`0` is legal** — see `demandSupplyRatio`. */
  supply: number
  /** Requests in the last 30 days that found no captain. Legacy `failures30d` (`:13953`). */
  failures30d: number

  /* ── derived: never stored, never editable (§8.2) ── */

  /**
   * `round(failures30d ÷ demand × 100)` — `zoneFailRate` (`:13974`), which
   * returns `0` when `demand === 0`. Kept: a zone with no demand has no failed
   * demand, and that is a true `0` rather than a missing reading.
   */
  failureRate: number
  /**
   * `demand ÷ supply`, **unrounded**. The `ratio`-unit tile renders it as
   * `{value}×` with the `×` supplied by the UI (**R4-12**).
   *
   * > **`null` if and only if `supply === 0`.**
   *
   * R4-6b requires this field to *"state what it renders when `supply === 0`
   * rather than emitting `Infinity` into a `ratio`-unit tile"*. `Infinity`
   * survives neither JSON nor `formatRatio`; legacy prints the literal `'∞'`
   * into the cell (`:14159`), which is a rendering decision smuggled into a
   * value. `null` is the honest wire form — *no ratio exists* — and the UI
   * decides what an absent ratio looks like, exactly as it does for every other
   * nullable number in this layer.
   */
  demandSupplyRatio: number | null
  /**
   * **`supply > 0 && ratio >= 3` is legacy's predicate (`:14133`), and this
   * field deliberately does not use it.**
   *
   * That `supply > 0` guard excludes a zone with **zero** captains from the
   * starved count — the most starved state there is scores as not-starved, and
   * the nav badge, the tile and the red row treatment all miss it together. No
   * seeded zone has `supply: 0`, so the bug has never fired; it is one fixture
   * edit away from firing, and `useZeroSupplyZone()` is that edit.
   *
   * Here: **`demand > 0 && (supply === 0 || ratio >= STARVED_RATIO)`**.
   * Recorded as a *correction*, cited, not smuggled — the count it feeds is the
   * nav badge (§6.5) and it must not be quietly one lower than the table.
   */
  starved: boolean
  /**
   * `max(0, ceil(demand ÷ 3) − supply)` (`:14155`) — captains needed to reach
   * *"≤3 demand per driver"*. `0` on a healthy zone, and `0` renders as nothing
   * rather than as a reassurance.
   */
  captainsNeeded: number
  recruitmentPriority: RecruitmentPriority
  /**
   * Subscription-demand momentum, **in percent**, from `zoneSubMomentum()`
   * (`:14041`–`:14056`): subscription requests whose pickup maps to this zone,
   * today against the trailing daily average.
   *
   * **`null` when no subscription request maps to this zone at all** — legacy
   * simply omits such a zone from its momentum table (`:14059`), which is the
   * same statement made by absence. A `0` here would claim we measured flat
   * growth; `null` says there is nothing to measure. This is the second-most
   * valuable list on the page (R4-6b) and it must not read as flat when it is
   * unmeasured.
   */
  subMomentum: number | null

  /* ── derived, and not in §6.6.5's field list — see the interface note ── */

  /** The live steering offer, if one is running. `null` on every seeded zone (`DB.steerOffers=[]`, `:13960`). */
  activeSteerOffer: ZoneSteerOffer | null
  /** When a recruitment drive was queued (`DB.recruitmentQueue`, `:13961`). `null` = the action is available. */
  recruitmentQueuedAt: IsoDateTime | null
}

/**
 * The four tiles on the strip, computed from the rows below them.
 *
 * This is the shape that makes R4-6b §6.6.4 checkable rather than aspirational:
 * one function produces the strip and the table from one array, and a test can
 * assert that `getZoneHealth().starvedZones` equals
 * `listZones().items.filter(z => z.starved).length` without knowing how either
 * was computed.
 */
export interface ZoneHealthSummary {
  zonesTracked: number
  starvedZones: number
  /**
   * Sum of `captainsNeeded` across every zone (`:14156`). Spec §9.1 calls it
   * *"the most actionable figure on any of the eight boards"* — it turns a ratio
   * nobody can act on into a recruitment target somebody can.
   */
  captainsNeeded: number
  /** Sum of `failures30d`. **Never called "failed"** — AC-718; the request found nobody. */
  unservedRequests30d: number
  /** Mean of `failureRate` across every tracked zone, rounded. `null` with no zones. */
  avgFailureRate: number | null
  /**
   * `max(demandSupplyRatio)`. **`null` when no zone has a ratio** — i.e. every
   * zone has `supply: 0`, which is the degenerate case the tile must survive
   * rather than render as `Infinity×`.
   */
  worstDemandSupplyRatio: number | null
}
