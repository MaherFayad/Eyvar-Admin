/**
 * The column contract — `01-table-controls.md` §15, `DESIGN.md` §8.5.
 *
 * A column **declares** what it offers; `DataTable` renders the control. That
 * sentence is the whole point of this file: after it, no screen builds a sort
 * popover, a filter row or a frozen column again, and `filterRow?: ReactNode`
 * is gone from `DataTableProps`.
 *
 * Nothing here is a component and nothing here reads `dir`. It is the
 * declaration types plus the pure functions that turn a declaration and a
 * `FilterSpec` into the strings a header, a chip and a menu render — so the
 * same summary can never disagree between the two readouts (§6.2, **AC-95**).
 *
 * Rules applied
 *   §15         `dataType` drives the sort labels and the default filter kind;
 *               `width` is REQUIRED on a pinnable column, because a column
 *               sized `auto` has no sticky offset until layout has run.
 *   §6.1        the six filter kinds are `src/lib/columnFilter.ts`'s
 *               `ColumnFilterKind`. There is no second vocabulary for the same
 *               six things, and a seventh needs a design conversation.
 *   §6.3        a column filter IS a filter: one `FilterSpec` in
 *               `table.filters`, keyed on the column's filter field. So
 *               `table.isFiltered` is already true and **AC-37 / AC-38 need no
 *               amendment** — the `no-match` versus `first-run` choice stays
 *               mechanical.
 *   §5.4        direction labels are per `dataType`. `Oldest first` on a
 *               `Trips` column is nonsense, which is why
 *               `table.sortAscending` / `table.sortDescending` are retired.
 *   §8.4/AC-75  every string is ONE key with named placeholders. Nothing here
 *               concatenates, including `{label}: {value}`.
 *   §8.3.1      numeric bounds are integers — counts, seconds, or money in
 *               HALALAS. `toFilterSpec` throws on a decimal, so a money range
 *               control converts major units here before it emits.
 */

import type { FilterSpec, FilterValue } from '@/data/types'
import {
  formatColumnFilterBounds,
  type ColumnFilterKind,
  type ColumnFilterValue,
  type Language,
  type NumberFilterUnit,
  type Translate,
} from '@/lib'
import type { ReactNode } from 'react'

/* ─────────────────────────── the declaration ─────────────────────────── */

/**
 * What kind of value the column holds. Drives §5.4's sort labels and the
 * alignment default. `align: 'end'` implies `number` unless stated.
 */
export type ColumnDataType =
  | 'text'
  | 'enum'
  | 'number'
  | 'money'
  | 'date'
  | 'boolean'
  /**
   * `04-index-screen-redesign.md` §7.3 rule 5 — a record identifier
   * (`APP-2204`, `DRV-0104`). It sorts and filters exactly like `text`; it
   * exists as its own type because the width contract forbids it, like
   * `money`, from being the LAST visible data column. A truncated id and a
   * truncated amount are the two values a reader cannot tell are truncated.
   */
  | 'id'

export interface ColumnFilterOption {
  /**
   * The value that goes on the wire. A string, because `ColumnFilterValue`'s
   * `select` and `multi-select` carry strings — see `columnFilterValueOf` for
   * the one case this cannot express, recorded as a finding.
   */
  readonly value: string
  readonly label: string
}

export interface ColumnFilterSpec {
  readonly kind: ColumnFilterKind
  /** Defaults to the column's `sortField ?? id`. Required on an `extraFilters` entry. */
  readonly field?: string
  /** Only for an `extraFilters` entry, which has no column and therefore no header. */
  readonly label?: string
  /** `select` and `multi-select`. An empty list renders §11.6's one grey sentence. */
  readonly options?: readonly ColumnFilterOption[]
  /** `number-range`. `money` takes the `SAR` in-field prefix and converts to halalas. */
  readonly unit?: NumberFilterUnit
  /** `boolean`. Both required for that kind — `Yes` / `No` is rarely what the column means. */
  readonly trueLabel?: string
  readonly falseLabel?: string
  /**
   * §11.12 — a column whose data this role may not filter on. The item renders
   * DISABLED IN PLACE with this reason on a second line, gated at render.
   */
  readonly gatedReason?: string
}

export interface DataColumn<T> {
  id: string
  /** Already translated. Rendered 12px/500 `--ev-text-2`, no uppercase (D18). */
  header: string
  /**
   * §9.1 — text and dates inline-START; numeric, currency and count
   * inline-END. The header follows the value, so the two share one edge
   * (**AC-44**), and §3.2 puts the menu caret on the far side of the label.
   */
  align?: 'start' | 'end'
  /** §15 — presence means sortable. Absent means no sort block in the menu. */
  sortField?: string
  cell: (row: T) => ReactNode
  /** §9.1 — a 12px second line INSIDE the identity cell. Never a new column. */
  secondaryLine?: (row: T) => ReactNode

  /** §5.4 / §6.1 — the sort labels, and the alignment default. */
  dataType?: ColumnDataType
  /**
   * **A2 — does this column's value need bidi isolation?**
   * (`docs/ref/i18n.md` "Bidi isolation", `docs/ref/rtl.md` "Does it mirror?".)
   *
   * Defaults from `dataType`, because the declaration already knows: `date`,
   * `money` and `number` are **numeral runs inside a translated line** and are
   * isolated; `text`, `enum`, `boolean` and `id` are not. See
   * `ISOLATED_DATA_TYPES` for why `id` is on the second list.
   *
   * Declare it for the value a data type cannot see: a plate or a phone number
   * typed `text` because it sorts and filters like text, or a bare id column
   * that carries no second line. Never from the value — a regex over
   * `row.plate` is exactly the class of defect `emphasis` and the row-click
   * intent were introduced to remove.
   *
   * **Do not declare it on a composite cell.** A `<bdi>` resolves its own
   * direction from its first strong character, so an avatar, a flex row or an
   * Arabic second line inside one can mirror to the wrong edge.
   */
  isolate?: boolean
  /** §15 — presence means filterable. */
  filter?: ColumnFilterSpec
  /**
   * §7.2 — the inline size in CSS px. **Required to be pinnable.** Also what
   * makes a wide table overflow rather than squeeze columns below legibility.
   */
  width?: number
  /**
   * `04-index-screen-redesign.md` §7.3 rule 2 — **the identity column, and
   * only the identity column, omits `width` and declares this instead.** It is
   * the one flexible column: it absorbs 100 % of the residual the fixed
   * columns leave, and it never falls below this floor.
   *
   * It is also what the width budget counts (§7.3 rule 3:
   * `Σ declared px + identity min-inline-size ≤ 910`), and what a pinned
   * offset is computed from — correct at exactly the moment pinning matters,
   * because in a table that overflows there is no residual and the identity
   * column renders at precisely this width.
   */
  minWidth?: number
  /**
   * **The CEILING on the flexible column, and the fix for a table read on a
   * 2400px monitor.**
   *
   * §7.3 rule 2 gives the flexible column 100% of the residual, which is right
   * up to the width the product was measured at and wrong past it. Measured on
   * `/financials/revenue` at 2400: `Description` rendered **1,406px wide** — a
   * measure of roughly 180 characters, three times the upper bound for
   * readable prose — while the row's own text ended around x=900 and the
   * `Debit` figure began at x=1,991. Every row carried ~1,100px of empty cell
   * between a description and the number describing it, which is the owner's
   * *"how hard it's to know that the number is related to the titles on the
   * left"* rendered once per row.
   *
   * The residual has to stop somewhere, and the only place it can stop that
   * moves the figures back TOWARD the text is the table's own width — widening
   * the money columns instead would push their end-aligned figures further
   * away, and capping the label/figure pair (`FigureRow`'s fix) does not apply
   * to a column of addends.
   *
   * So a column that declares this caps the whole table: `DataTable` sums the
   * declared widths against it and sets `max-inline-size`, and what is left
   * over is **page ground** rather than empty cell.
   *
   * **Opt-in, and deliberately so.** A column that declares no `maxWidth`
   * behaves exactly as it did — no cap, 100% of the residual, §7.3 rule 2
   * untouched. Thirty-nine screens are unaffected by this field existing.
   */
  maxWidth?: number
  /** Default true where a `width` is declared. Never exposes the `end` edge (**AC-107**). */
  pinnable?: boolean
  /** §3.1 / §7.1 — the identity column. Never hideable, never unpinnable. */
  alwaysVisible?: boolean
  /** Off on first render; `Reset columns` restores exactly this. */
  defaultHidden?: boolean
  /**
   * **H1 — which emphasis tier this column's VALUE belongs to**
   * (`design/15-hierarchy-and-scannability.md` §1).
   *
   * | tier | treatment | what belongs here |
   * |---|---|---|
   * | `primary` | ink, `font-medium` | the identity of the thing. One per row |
   * | `data` | ink, `font-normal` | **what the operator came to read** — amounts, counts, ratings, statuses, deadlines |
   * | `meta` | `--ev-text-2` | everything else: ids, cities, timestamps, provenance |
   *
   * The whole change is that **Data was merged into Meta**, so a fifteen-column
   * table gave the operator no scan path: every value was the same grey and the
   * two they came for were indistinguishable from the thirteen they did not.
   *
   * **This replaces `columnIndex === 0`, and that is the point rather than a
   * side effect.** Emphasis was keyed off the column's position in the
   * *visible* array, so hiding or reordering a column moved the row's ink onto
   * whatever landed first — the same class of defect as P0-2's label regex, one
   * directory over. A tier is a property of what the column MEANS, so it
   * travels with the declaration and nothing an operator does in the columns
   * popover can move it.
   *
   * Undeclared, it falls back to `primary` for the FIRST DECLARED column and
   * `meta` for the rest (`emphasisOf`), which is exactly today's rendering. The
   * fallback is anchored to the declaration array and never to the rendered
   * one, so it cannot move either.
   */
  emphasis?: ColumnEmphasis
  /**
   * **R2-3** — this cell carries a refused action's reason as its secondary
   * line, on the refused row only. Declare it on the state column; first
   * declared wins. Undeclared or hidden, the reason falls to `primary`, so a
   * refused row never holds a dead control with no sentence (AC-368).
   */
  carriesRefusalReason?: boolean
  /**
   * **P3-12 — what this column contributes to a CSV export.**
   *
   * `cell` returns a `ReactNode` and a `ReactNode` is not a value: a badge, a
   * link, an avatar and a formatted amount all flatten to something a
   * spreadsheet reads differently from what the operator sees. So a column that
   * exports a *value* rather than a *rendering* declares it here.
   *
   * **Money returns integer HALALAS, and this is the rule the export exists
   * for.** `formatMoney` produces `1,234.00 SAR`; a spreadsheet reads the comma
   * as a separator, the trailing `SAR` as text, and the column as unusable.
   * §8.3.1's integer-minor-unit rule holds all the way to the file — the
   * conversion belongs to whoever opens it, and `reports/csv.ts` documents the
   * one deliberate exception, which is a *reporting* surface and not this one.
   *
   * Omitted, `tableCsv` falls back to the flattened text of `cell` — correct
   * for text, ids, enums and dates. **A `money` column with no `csv` is
   * exported EMPTY and named in the file's header block** rather than exported
   * wrong, on `reports/csv.ts`'s AC-890 precedent: a partial export that cannot
   * be told from a complete one is worse than one that says what it left out.
   */
  csv?: (row: T) => string | number | null
}

/** H1's three tiers. See `DataColumn.emphasis`. */
export type ColumnEmphasis = 'primary' | 'data' | 'meta'

/**
 * The tier a column renders at.
 *
 * `columns` is the **declared** set, in declaration order — never the visible
 * one. That is the whole fix: the fallback anchors to a column the operator
 * cannot move, so hiding the identity column removes the row's ink rather than
 * lending it to whatever slid into position 0.
 */
export function emphasisOf<T>(
  column: DataColumn<T>,
  columns: ReadonlyArray<DataColumn<T>>,
): ColumnEmphasis {
  if (column.emphasis !== undefined) return column.emphasis
  return columns[0]?.id === column.id ? 'primary' : 'meta'
}

/**
 * **R2-3** — which VISIBLE cell holds a refused action's reason. The declared
 * carrier, else the primary column, else the first visible one; `declared` is
 * the declaration order `emphasisOf` anchors to.
 */
export function refusalReasonColumnId<T>(
  visible: ReadonlyArray<DataColumn<T>>,
  declared: ReadonlyArray<DataColumn<T>>,
): string | null {
  const carrier =
    visible.find((column) => column.carriesRefusalReason === true) ??
    visible.find((column) => emphasisOf(column, declared) === 'primary') ??
    visible[0]
  return carrier?.id ?? null
}

/** §6.4 — a filter bound to no visible column. Same shape, no header. */
export interface ExtraFilterSpec extends ColumnFilterSpec {
  readonly field: string
  readonly label: string
}

/* ───────────────────────────── field + kind ───────────────────────────── */

/** §15 — `filter.field` defaults to `sortField ?? id`. */
export function filterFieldOf<T>(column: DataColumn<T>): string | null {
  if (!column.filter) return null
  return column.filter.field ?? column.sortField ?? column.id
}

/** §3.2 — a column with no declared control renders no button and no caret. */
export function hasMenu<T>(
  column: DataColumn<T>,
  offers: { sort: boolean; hide: boolean; pin: boolean },
): boolean {
  return (
    (offers.sort && column.sortField !== undefined) ||
    column.filter !== undefined ||
    offers.hide ||
    offers.pin
  )
}

/**
 * §6.3 / §6.4 — one flat list of everything that can be filtered: the columns
 * that declare a filter, then the `extraFilters` bound to no visible column.
 *
 * This is what `Add filter +` lists and what the chip strip resolves a live
 * `FilterSpec` back against, so a chip, a header and the picker can never
 * disagree about what a field is called or how its value reads (**AC-102**).
 * Hidden columns keep their entry: a filter on a hidden column still has a chip
 * (§6.4's logic applied to §7.5's third case).
 */
export interface FilterEntry {
  readonly field: string
  readonly label: string
  readonly filter: ColumnFilterSpec
}

export function filterEntries<T>(
  columns: ReadonlyArray<DataColumn<T>>,
  extras: readonly ExtraFilterSpec[] = [],
): FilterEntry[] {
  const entries: FilterEntry[] = []
  for (const column of columns) {
    const field = filterFieldOf(column)
    if (field === null || !column.filter) continue
    entries.push({ field, label: column.header, filter: column.filter })
  }
  for (const extra of extras) {
    entries.push({ field: extra.field, label: extra.label, filter: extra })
  }
  return entries
}

/* ───────────────────────────── sort labels ───────────────────────────── */

const SORT_KEYS: Readonly<Record<ColumnDataType, { asc: string; desc: string }>> = {
  text: { asc: 'table.sort.textAsc', desc: 'table.sort.textDesc' },
  enum: { asc: 'table.sort.textAsc', desc: 'table.sort.textDesc' },
  id: { asc: 'table.sort.textAsc', desc: 'table.sort.textDesc' },
  number: { asc: 'table.sort.numberAsc', desc: 'table.sort.numberDesc' },
  money: { asc: 'table.sort.numberAsc', desc: 'table.sort.numberDesc' },
  date: { asc: 'table.sort.dateAsc', desc: 'table.sort.dateDesc' },
  boolean: { asc: 'table.sort.booleanAsc', desc: 'table.sort.booleanDesc' },
}

/** §15 — `align: 'end'` implies `number` unless the column says otherwise. */
export function dataTypeOf<T>(column: DataColumn<T>): ColumnDataType {
  return column.dataType ?? (column.align === 'end' ? 'number' : 'text')
}

/**
 * **A2 — the three data types whose value is a numeral run, and nothing else.**
 *
 * `number` is here for `4 / 5`: UBA rule N1 treats a European number as R, so
 * the neutral between two digit runs takes the paragraph direction and the
 * pair renders `5 / 4` inside an Arabic line. `money` and `date` are here for
 * the same class of reason — a value made of digits and neutrals has no strong
 * character of its own to hold it together, so anything else in the cell
 * decides its order.
 *
 * **`id` is NOT here, and that is a measured decision rather than an
 * oversight.** A record identifier begins with a strong Latin character
 * (`TRP-9104`, `EYV-CN-2026-000012`), so the bidi algorithm already keeps it
 * contiguous and correct inside an Arabic line — it is the one item on
 * `i18n.md`'s list that needs no help. Meanwhile `id` is overwhelmingly the
 * IDENTITY column, whose cell is a composite: an avatar, a link and a prose
 * second line. Isolating that composite resolves the whole cell's direction
 * from its first strong character, which moved the Trips avatar from x=816 to
 * x=709 under `dir="rtl"` — off the inline-start edge — and took an Arabic
 * route with it. Measured at 1280 before it shipped. A bare id column that
 * wants isolation declares `isolate: true`.
 *
 * `text`, `enum` and `boolean` are absent for the opposite reason: they hold
 * prose and translated labels, and isolating Arabic prose from the line it
 * belongs to is the same bug with the sign flipped.
 */
const ISOLATED_DATA_TYPES: ReadonlySet<ColumnDataType> = new Set<ColumnDataType>([
  'date',
  'money',
  'number',
])

/**
 * **A2 — whether `DataTable` wraps this column's value in an LTR `<bdi>`.**
 *
 * Declared meaning only: the column's own `isolate`, else its `dataType`. The
 * value is never inspected.
 */
export function isolatesValue<T>(column: DataColumn<T>): boolean {
  return column.isolate ?? ISOLATED_DATA_TYPES.has(dataTypeOf(column))
}

/**
 * §5.4 — the direction pair, per data type. A `number` column never renders
 * `Oldest first`; a `date` column never renders `Sort A to Z` (**AC-88**).
 */
export function sortLabel<T>(t: Translate, column: DataColumn<T>, dir: 'asc' | 'desc'): string {
  const type = dataTypeOf(column)
  const key = SORT_KEYS[type][dir]
  if (type !== 'boolean') return t(key)
  return t(key, {
    trueLabel: column.filter?.trueLabel ?? column.header,
    falseLabel: column.filter?.falseLabel ?? column.header,
  })
}

/* ──────────────────── FilterSpec ⇄ ColumnFilterValue ──────────────────── */

/** The empty value for a kind — what `Any`, a cleared field and "no chip" all mean. */
export function emptyColumnFilterValue(filter: ColumnFilterSpec): ColumnFilterValue {
  switch (filter.kind) {
    case 'text':
      return { kind: 'text', value: '' }
    case 'select':
      return { kind: 'select', value: null }
    case 'multi-select':
      return { kind: 'multi-select', values: [] }
    case 'number-range':
      return { kind: 'number-range', min: null, max: null, unit: filter.unit ?? 'count' }
    case 'date-range':
      return { kind: 'date-range', from: null, to: null }
    case 'boolean':
      return { kind: 'boolean', value: null }
  }
}

/** A `date-range` bound is stored as a Riyadh instant; the control edits the day. */
function isoDay(value: FilterValue): string | null {
  return typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : null
}

function toInteger(value: FilterValue): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null
}

/**
 * The reverse of `toFilterSpec`: the live `FilterSpec` in `table.filters` is the
 * one source of truth, so a control opened from a chip, from `Add filter` and
 * from the header all read the same value out of it.
 *
 * A spec whose operator does not belong to the declared kind is treated as
 * absent rather than coerced — a mismatch means the column declaration and the
 * client disagree, and rendering a half-parsed value would hide that.
 */
export function columnFilterValueOf(
  filter: ColumnFilterSpec,
  spec: FilterSpec | undefined,
): ColumnFilterValue {
  const empty = emptyColumnFilterValue(filter)
  if (!spec) return empty

  switch (filter.kind) {
    case 'text':
      return spec.op === 'contains' && typeof spec.value === 'string'
        ? { kind: 'text', value: spec.value }
        : empty

    case 'select':
      return spec.op === 'eq' && typeof spec.value === 'string'
        ? { kind: 'select', value: spec.value }
        : empty

    case 'multi-select':
      return spec.op === 'in' && Array.isArray(spec.value)
        ? { kind: 'multi-select', values: spec.value.map(String) }
        : empty

    case 'number-range': {
      const unit = filter.unit ?? 'count'
      if (spec.op === 'between' && Array.isArray(spec.value)) {
        return {
          kind: 'number-range',
          min: toInteger(spec.value[0] ?? null),
          max: toInteger(spec.value[1] ?? null),
          unit,
        }
      }
      if (spec.op === 'gte') return { kind: 'number-range', min: toInteger(spec.value), max: null, unit }
      if (spec.op === 'lte') return { kind: 'number-range', min: null, max: toInteger(spec.value), unit }
      return empty
    }

    case 'date-range': {
      if (spec.op === 'between' && Array.isArray(spec.value)) {
        return {
          kind: 'date-range',
          from: isoDay(spec.value[0] ?? null),
          to: isoDay(spec.value[1] ?? null),
        }
      }
      if (spec.op === 'gte') return { kind: 'date-range', from: isoDay(spec.value), to: null }
      if (spec.op === 'lte') return { kind: 'date-range', from: null, to: isoDay(spec.value) }
      return empty
    }

    case 'boolean':
      return spec.op === 'eq' && typeof spec.value === 'boolean'
        ? { kind: 'boolean', value: spec.value }
        : empty
  }
}

/* ─────────────────────────── the value summary ─────────────────────────── */

/**
 * §6.2 — how an active filter reads, in the header and in the chip, from one
 * function so the two can never diverge (**AC-95**).
 *
 * Returns the VALUE half only. The `{label}: {value}` join is one key
 * (`table.column.filtered`, **AC-75**) and the caller wraps the value in
 * `<bdi>` (§8.4) — a Latin city name inside an Arabic label jumps sides
 * without it.
 */
export function summariseColumnFilter(
  t: Translate,
  filter: ColumnFilterSpec,
  value: ColumnFilterValue,
  language: Language,
): string | null {
  const labelFor = (option: string): string =>
    filter.options?.find((o) => o.value === option)?.label ?? option

  switch (value.kind) {
    case 'text':
      return value.value.trim() === '' ? null : value.value.trim()

    case 'select':
      return value.value === null ? null : labelFor(value.value)

    case 'multi-select': {
      const [first, ...rest] = value.values
      if (first === undefined) return null
      return rest.length === 0
        ? labelFor(first)
        : t('table.filter.summary.multi', { value: labelFor(first), count: String(rest.length) })
    }

    case 'number-range':
    case 'date-range': {
      const bounds = formatColumnFilterBounds(value, language)
      if (!bounds) return null
      if (bounds.from !== null && bounds.to !== null) {
        return t('table.filter.summary.range', { from: bounds.from, to: bounds.to })
      }
      if (bounds.from !== null) return t('table.filter.summary.rangeFrom', { from: bounds.from })
      if (bounds.to !== null) return t('table.filter.summary.rangeTo', { to: bounds.to })
      return null
    }

    case 'boolean':
      if (value.value === null) return null
      return value.value
        ? (filter.trueLabel ?? t('table.filter.yes'))
        : (filter.falseLabel ?? t('table.filter.no'))
  }
}

/**
 * §8.4 / **AC-75** — `{label}: {value}` is ONE key, and the value half still
 * gets a `<bdi>` around it.
 *
 * The key is interpolated with a sentinel in the `value` slot and the result is
 * split on it, so the translator keeps the whole sentence — including whether
 * Arabic puts the separator somewhere else — while the isolation stays MARKUP.
 * The alternative, U+2068 / U+2069 inside the string, is what `formatMoney`'s
 * header rejects: it poisons copy-paste, export and every test assertion.
 *
 * Used by the header summary and by the chip, so the two cannot drift.
 */
const BIDI_SLOT = '\u0000'

export function filteredLabelParts(
  t: Translate,
  label: string,
  value: string,
): { before: string; value: string; after: string } {
  const [before = '', after = ''] = t('table.column.filtered', {
    label,
    value: BIDI_SLOT,
  }).split(BIDI_SLOT)
  return { before, value, after }
}

/* ───────────────────────── money, major ⇄ minor ───────────────────────── */

/**
 * §8.3.1 — integer halalas to the major-unit string an operator edits.
 *
 * The inverse of `parseMoneyInput`, done on digits rather than by `n / 100`,
 * for the same reason that function gives: IEEE-754 turns `1999 / 100` into
 * something that renders differently once in a while, and a filter bound that
 * changes when it round-trips is a bug nobody reproduces.
 *
 * Not `formatMoney`: that is OUTPUT (grouping separators, trailing `SAR`) and
 * §4.2's prefix rule governs INPUTS. Feeding a grouped string back into an
 * `<input>` is how `1,234.00` becomes `1`.
 */
export function halalasToMajorInput(halalas: number): string {
  const negative = halalas < 0
  const magnitude = Math.abs(halalas)
  const major = Math.trunc(magnitude / 100)
  const minor = magnitude % 100
  return `${negative ? '-' : ''}${major}.${String(minor).padStart(2, '0')}`
}

/**
 * §9.2 — one ledger boundary row: `Opening balance` / `Closing balance`.
 *
 * Three parts rather than one node, because the wide table renders the figure
 * **in the column it totals** and the compact card list renders it beside its
 * label — two layouts over the same three pieces. `DataTable`'s
 * `ledgerBoundaryRows` carries the reasoning and the 1,828px measurement that
 * produced it.
 *
 * It lives here rather than in `DataTable` so `NarrowRowCards` can import it
 * without the cycle that `DataTable` -> `NarrowRowCards` -> `DataTable` would
 * otherwise make.
 */
export interface LedgerBoundary {
  label: ReactNode
  /** Beside the LABEL, never beside the figure — a second number in the balance
   *  column would break the column the figure was just aligned into. */
  note?: ReactNode
  value: ReactNode
}

/**
 * **The width at which a table stops growing**, or `undefined` when it never
 * does — the shared derivation behind `DataTable`'s `max-inline-size` and any
 * chrome that has to line up with it.
 *
 * It exists because two different files need the same number and neither may
 * compute it separately: `DataTable` caps the `<table>` and its bordered band,
 * and a ledger's own header — an account name at the inline-start and its
 * balance at the inline-end — has to end where the table ends, or the balance
 * floats 600px past the last column it belongs over.
 *
 * `undefined` unless some column declares a `maxWidth`, which is what keeps
 * every table that has not opted in exactly as it was.
 */
export function tableCeiling(
  columns: readonly { width?: number; minWidth?: number; maxWidth?: number }[],
): number | undefined {
  if (!columns.some((column) => typeof column.maxWidth === 'number')) return undefined
  return columns.reduce(
    (total, column) => total + (column.maxWidth ?? column.width ?? column.minWidth ?? 0),
    0,
  )
}
