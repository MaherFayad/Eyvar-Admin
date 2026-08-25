/**
 * One per-column filter control → **exactly one `FilterSpec`**.
 *
 * `FilterSpec` (`src/data/types/common.ts`) is the transport vocabulary and
 * `useFilters` already holds a list of them. A per-column filter must therefore
 * *produce* one, never introduce a parallel filter model that something later
 * has to translate — a second model is how `op: 'contains'` and `op: 'in'` end
 * up meaning different things on two screens.
 *
 * Three rules are encoded here because no call site can be trusted to remember
 * them:
 *
 * 1. **An empty control produces no filter at all.** `toFilterSpec` returns
 *    `null`, not `{ op: 'contains', value: '' }`. The mock engine's `contains`
 *    matches every row against `''` (`src/data/mock/query.ts` `matches`), so an
 *    empty text box would silently become a no-op chip that `isFiltered` counts —
 *    and DESIGN.md §3.2 makes `Clear all` appear *only* when something is
 *    actually applied.
 *
 * 2. **`false` is a value, not an absence.** A boolean filter set to `false`
 *    emits `{ op: 'eq', value: false }`. The falsy-check bug this closes drops
 *    every "Suspended: no" filter on the floor.
 *
 * 3. **A date range is a pair of instants, inclusive of the whole end day, in
 *    Riyadh** — DESIGN.md §9.2 and `src/lib/format/date.ts`. The picker speaks
 *    calendar days; comparison happens on instants. Emitting the bare day
 *    `2026-06-30` as an upper bound excludes every row on 30 June, because
 *    `Date.parse('2026-06-30')` is **midnight UTC** — 03:00 Riyadh — and the
 *    mock's `numeric()` compares exactly that way. `toFilterSpec` emits
 *    `2026-06-30T23:59:59.999+03:00` instead, so "to 30 June" contains 30 June.
 *
 * Formatting the endpoints for a chip goes through `formatColumnFilterBounds`,
 * which routes dates through `formatDate` and money through `formatMoney`. That
 * is the whole reason it exists: a bare `new Intl.DateTimeFormat('ar-SA')`
 * resolves to the **Hijri** calendar and Arabic-Indic digits, and a chip is the
 * one place a date gets stringified far away from `formatDate`.
 *
 * **Not here:** the column's own label, the option labels for a select, and how
 * the two ends of a range are joined into one chip. Those are copy and belong to
 * the design spec and to the column definition that already carries `options`.
 */

import type { FilterSpec, IsoDate, IsoDateTime } from '@/data/types/common'
import { formatDate, toDate } from './format/date'
import { formatMoney } from './format/money'
import { formatCount } from './format/number'
import type { Language } from './i18n/direction'
import { invariant } from './invariant'

/**
 * Riyadh is UTC+03:00 with no DST — Saudi Arabia has observed none since 1990,
 * the same fact `src/lib/format/date.ts` is built on. A fixed offset is exact
 * here, and building the bound as a *string* rather than from a local `Date`
 * keeps the output identical on a host set to a DST-observing zone.
 */
const RIYADH_UTC_OFFSET = '+03:00'

/** What the six supported column controls are. Any seventh is a design conversation. */
export type ColumnFilterKind =
  | 'text'
  | 'select'
  | 'multi-select'
  | 'number-range'
  | 'date-range'
  | 'boolean'

/**
 * Whether a numeric range's endpoints are counts or **integer minor units**.
 * Only affects `formatColumnFilterBounds`; the emitted `FilterSpec` carries the
 * raw integer either way, because the server stores halalas (§8.3.1).
 */
export type NumberFilterUnit = 'count' | 'money'

export type ColumnFilterValue =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'select'; readonly value: string | null }
  | { readonly kind: 'multi-select'; readonly values: readonly string[] }
  | {
      readonly kind: 'number-range'
      readonly min: number | null
      readonly max: number | null
      readonly unit?: NumberFilterUnit
    }
  | { readonly kind: 'date-range'; readonly from: IsoDate | null; readonly to: IsoDate | null }
  | { readonly kind: 'boolean'; readonly value: boolean | null }

/**
 * The one way a column filter can be *invalid* rather than merely empty: an
 * operator typed `500` then `100`, or picked an end date before the start.
 *
 * Returned as a **code**, not a sentence — the sentence is copy. `toFilterSpec`
 * **throws** if a control emits anyway, because `between [500, 100]` silently
 * matches nothing and reads to an operator as "no results".
 *
 * **The two range kinds get different treatments, because only one of them has a
 * primary button** — `01-table-controls.md` §11.8, and the reason this comment is
 * not one sentence:
 *
 * | Kind | Commits on | Treatment while inverted |
 * |---|---|---|
 * | `date-range` | an `Apply` button | **`Apply` disabled**, no error text. DESIGN.md §3.2: *"validate by disabling the primary button, not by showing an error after submit."* |
 * | `number-range` | debounce — there is no `Apply` | **Nothing is emitted**, the previous filter stands, and an **inline hint** renders beneath the pair (§4.4). There is no primary to disable and no submit, so §3.2 does not govern it. |
 *
 * Either way the check is the same call and the emission is refused the same way.
 * What differs is what the *control* does with a non-`null` return, and that is
 * `DataTable`'s branch, not this function's.
 */
export type ColumnFilterIssue = 'range-inverted'

export function columnFilterIssue(value: ColumnFilterValue): ColumnFilterIssue | null {
  if (value.kind === 'number-range') {
    if (value.min === null || value.max === null) return null
    return value.min > value.max ? 'range-inverted' : null
  }
  if (value.kind === 'date-range') {
    if (value.from === null || value.to === null) return null
    return toDate(value.from).getTime() > toDate(value.to).getTime() ? 'range-inverted' : null
  }
  return null
}

/**
 * `null` means **no chip**: the control is empty and nothing should reach
 * `useFilters.setFilter`. A caller that wants the chip gone calls
 * `removeFilter(field)` on `null`; that pairing is the whole contract.
 *
 * Throws on an inverted range (see `columnFilterIssue`) and on a non-integer
 * numeric bound: every numeric column in this product is a count, a duration in
 * seconds, or money in halalas. A decimal bound means someone passed major
 * units, which is the `formatMoney(12.34)` bug one layer up.
 */
export function toFilterSpec(field: string, value: ColumnFilterValue): FilterSpec | null {
  invariant(field.trim() !== '', 'toFilterSpec needs a non-empty field name.')

  const issue = columnFilterIssue(value)
  invariant(issue === null, `Column filter "${field}" is invalid: ${issue}.`)

  switch (value.kind) {
    case 'text': {
      const trimmed = value.value.trim()
      return trimmed === '' ? null : { field, op: 'contains', value: trimmed }
    }

    case 'select':
      return value.value === null ? null : { field, op: 'eq', value: value.value }

    case 'multi-select': {
      // Deduplicated, first occurrence wins, order preserved — a repeated option
      // can only arrive from restored state, and `in [a, a]` is noise on the wire.
      const unique = [...new Set(value.values)]
      // Stays `in` even for one selection. The operator ticking a second box must
      // not change the *operator* of the query: a server may index `eq` and `in`
      // differently, and a chip whose shape changes mid-edit is two queries.
      return unique.length === 0 ? null : { field, op: 'in', value: unique }
    }

    case 'number-range': {
      const { min, max } = value
      assertIntegerBound(field, min)
      assertIntegerBound(field, max)
      if (min !== null && max !== null) return { field, op: 'between', value: [min, max] }
      if (min !== null) return { field, op: 'gte', value: min }
      if (max !== null) return { field, op: 'lte', value: max }
      return null
    }

    case 'date-range': {
      const from = value.from === null ? null : startOfRiyadhDay(value.from)
      const to = value.to === null ? null : endOfRiyadhDay(value.to)
      if (from !== null && to !== null) return { field, op: 'between', value: [from, to] }
      if (from !== null) return { field, op: 'gte', value: from }
      if (to !== null) return { field, op: 'lte', value: to }
      return null
    }

    case 'boolean':
      // `value === null` is "not set". `false` is a filter.
      return value.value === null ? null : { field, op: 'eq', value: value.value }
  }
}

/**
 * The two ends of a range, formatted for a chip. `null` for a kind that has no
 * range, and a `null` end for an open-ended one — how an open end reads
 * (`from 25 Jun`, `≥ 100`) is copy, and belongs to the design spec.
 *
 * This is one call site plus a rule that must be enforced centrally (DESIGN.md
 * §9.2): the chip is the one place a date and a money amount get stringified
 * outside a table cell, and a hand-rolled `toLocaleDateString` here brings back
 * the Hijri calendar the rest of the app spent a module closing.
 */
export function formatColumnFilterBounds(
  value: ColumnFilterValue,
  language: Language = 'en',
): { from: string | null; to: string | null } | null {
  if (value.kind === 'number-range') {
    const unit = value.unit ?? 'count'
    const render = (n: number): string =>
      unit === 'money' ? formatMoney(n) : formatCount(n, language)
    return {
      from: value.min === null ? null : render(value.min),
      to: value.max === null ? null : render(value.max),
    }
  }

  if (value.kind === 'date-range') {
    const render = (d: IsoDate): string => formatDate(d, { style: 'day-month-year', language })
    return {
      from: value.from === null ? null : render(value.from),
      to: value.to === null ? null : render(value.to),
    }
  }

  return null
}

/**
 * A calendar day and nothing else. `toDate` also accepts a full instant, which
 * would concatenate into `2026-06-25T09:14:00+03:00T00:00:00+03:00`, so the
 * bare-day shape is checked here before it is used as a prefix.
 */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

function assertDay(day: IsoDate): void {
  invariant(
    ISO_DAY.test(day),
    `A date-range filter takes calendar days (2026-06-25), got ${JSON.stringify(day)}.`,
  )
  toDate(day)
}

/** `2026-06-25` → `2026-06-25T00:00:00+03:00`. */
function startOfRiyadhDay(day: IsoDate): IsoDateTime {
  assertDay(day)
  return `${day}T00:00:00${RIYADH_UTC_OFFSET}`
}

/**
 * `2026-06-30` → `2026-06-30T23:59:59.999+03:00`.
 *
 * The last representable millisecond of the day rather than the next day's
 * midnight, so the bound stays **inclusive** and can be used with `lte` and
 * `between` without the caller knowing whether the operator is exclusive.
 */
function endOfRiyadhDay(day: IsoDate): IsoDateTime {
  assertDay(day)
  return `${day}T23:59:59.999${RIYADH_UTC_OFFSET}`
}

function assertIntegerBound(field: string, bound: number | null): void {
  if (bound === null) return
  invariant(
    Number.isInteger(bound),
    `Column filter "${field}" needs integer bounds (counts, seconds, or halalas), got ${bound}.`,
  )
}
