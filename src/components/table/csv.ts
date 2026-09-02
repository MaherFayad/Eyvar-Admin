/**
 * **P3-12 — every index table exports what the operator is looking at.**
 *
 * Twenty-two index tables could not export a single row, while `downloadCsv`
 * has served the Report Builder, Admin › Data and the export card since wave 3.
 * Finance staff on Payouts, Ledger, Cash and Wallets had no way to get a figure
 * out of the console except by retyping it.
 *
 * ## What "what the operator is looking at" means, mechanically
 *
 * Not the resource. **The current view**: the rows the table is holding, in the
 * order it is holding them, through the columns that are visible, under the
 * query and the filters that produced them. A button that dumped the raw
 * collection would answer a different question from the one on screen, and the
 * operator would not know which of the two numbers to trust.
 *
 * So the header block states the view it was taken from — the query, every
 * applied filter, the sort, the visible column set, and how many of `total` the
 * file holds. `reports/csv.ts` established that block and the reason for it:
 * *"a CSV of bare numbers with no window is unattributable the moment it
 * reaches a spreadsheet, and unattributable numbers are how the wrong figure
 * ends up in a deck."* An index export is no more attributable than a report's.
 *
 * ## Money
 *
 * **Integer halalas, and the column declares the accessor.** §8.3.1 holds all
 * the way to the file. `formatMoney` emits `1,234.00 SAR`, which a spreadsheet
 * reads as text with an embedded thousands separator — the operator gets a
 * column it cannot sum. `reports/csv.ts` breaks this rule once, deliberately and
 * with the reason attached, because its consumer is a human reading a revenue
 * report; an index export is working data.
 *
 * A `money` column that declares no `csv` accessor is exported **empty and
 * named in the header block** rather than exported wrong. That is AC-890's
 * precedent one file over: *"a redacted export cannot pass for a complete one."*
 *
 * ## Quoting
 *
 * `reports/csv.ts` owns it and this file calls it. Every field quoted, every
 * embedded quote doubled, RFC 4180 — this dataset contains company names
 * written in Arabic, and an unquoted comma in one silently shifts every column
 * to its right.
 */

import { isValidElement, type ReactNode } from 'react'
import type { FilterSpec } from '@/data/types'
import { dataTypeOf, type DataColumn } from './columns'

/** RFC 4180. Identical to `reports/csv.ts`'s, and deliberately not imported —
    that function is module-private there and the rule is four characters long. */
function row(fields: readonly string[]): string {
  return fields.map((field) => `"${field.replace(/"/gu, '""')}"`).join(',')
}

/**
 * A cell's text, for the columns that do not declare a `csv` accessor.
 *
 * Walks the rendered node rather than the row, because a text column's value
 * *is* what it renders — an id, a city, a status word. Elements contribute only
 * their children: an `<img>` avatar and a `<Link>`'s chrome carry no value, and
 * a link's text is the value the operator reads.
 *
 * Whitespace collapses to single spaces. A two-line identity cell would
 * otherwise export a literal newline inside a quoted field — legal CSV, and
 * unreadable in a spreadsheet row.
 */
export function flattenCellText(node: ReactNode): string {
  const parts: string[] = []
  const walk = (value: ReactNode): void => {
    if (value === null || value === undefined || typeof value === 'boolean') return
    if (typeof value === 'string' || typeof value === 'number') {
      parts.push(String(value))
      return
    }
    if (Array.isArray(value)) {
      for (const child of value) walk(child as ReactNode)
      return
    }
    if (isValidElement(value)) {
      walk((value.props as { children?: ReactNode }).children)
    }
  }
  walk(node)
  return parts.join(' ').replace(/\s+/gu, ' ').trim()
}

export interface TableCsvView<T> {
  /** `tableId`, and the view key beside it — the same pair the column hooks are keyed on. */
  readonly tableId: string
  readonly view: string | null
  /** Every declared column; the visible subset is what gets exported. */
  readonly columns: ReadonlyArray<DataColumn<T>>
  readonly visible: ReadonlyArray<DataColumn<T>>
  readonly rows: readonly T[]
  /** What the toolbar search held. */
  readonly query: string
  readonly filters: readonly FilterSpec[]
  readonly sort: { field: string; dir: 'asc' | 'desc' } | null
  /** How many records match the current query, so a partial file says so. */
  readonly total: number
  /** ISO instant. Passed in rather than read here — a pure function is testable. */
  readonly exportedAt: string
}

/**
 * The view above, as an RFC 4180 file.
 *
 * Pure: no DOM, no clock, no `t`. The header block is machine vocabulary
 * (`window`, `filter`, `sort`) exactly as `reports/csv.ts`'s is — it is read by
 * a spreadsheet and by whoever receives the file, not rendered in the console,
 * so it is not translated and carries no dictionary key.
 */
export function tableCsvText<T>(view: TableCsvView<T>): string {
  const lines: string[] = []
  const omitted: DataColumn<T>[] = []

  /* Built before the header block, because the header block reports on it. */
  const matrix = view.rows.map((record) => view.visible.map((column) => valueOf(column, record)))
  /* **A column that produced nothing in any row is named, not left blank.**
     The fallback flattens a `cell`'s rendered node, and a cell whose whole
     content is a custom component — `<Identity name={…} />`, `<EntityName />`
     — has no children to flatten, so it exports as an empty field that reads
     exactly like a genuinely empty value. That is the failure mode this makes
     loud: the operator sees the column named in the header block, and whoever
     owns the screen knows to declare a `csv` accessor rather than concluding
     the records have no name. */
  const empty = view.visible.filter(
    (column, index) =>
      column.csv === undefined && matrix.length > 0 && matrix.every((cells) => cells[index] === ''),
  )

  lines.push(row(['table', view.tableId]))
  lines.push(row(['view', view.view ?? '']))
  lines.push(row(['exported_at', view.exportedAt]))
  lines.push(row(['query', view.query.trim()]))
  for (const filter of view.filters) {
    lines.push(row(['filter', `${filter.field} ${filter.op} ${String(filter.value)}`]))
  }
  lines.push(row(['sort', view.sort === null ? '' : `${view.sort.field} ${view.sort.dir}`]))
  /* The id row, not the label row: the labels below are translated and an
     Arabic export would otherwise be unmappable back to a field. */
  lines.push(row(['columns', view.visible.map((column) => column.id).join(' ')]))
  lines.push(row(['rows', String(view.rows.length)]))
  lines.push(row(['total_matching', String(view.total)]))

  for (const column of view.visible) {
    if (dataTypeOf(column) === 'money' && column.csv === undefined) omitted.push(column)
  }
  for (const column of omitted) {
    /* AC-890's precedent: the file says what it left out and why, so a partial
       export cannot pass for a complete one. */
    lines.push(row(['omitted_column', `${column.id} (money column declares no csv accessor)`]))
  }
  for (const column of empty) {
    lines.push(
      row(['empty_column', `${column.id} (cell renders a component; declare a csv accessor)`]),
    )
  }
  lines.push('')

  lines.push(row(view.visible.map((column) => column.header)))
  for (const cells of matrix) lines.push(row(cells))

  return lines.join('\r\n')
}

/** One cell's value. See `DataColumn.csv` for why money is not flattened. */
function valueOf<T>(column: DataColumn<T>, record: T): string {
  if (column.csv !== undefined) {
    const value = column.csv(record)
    /* A gap is an EMPTY cell, never `0` — `reports/csv.ts` again. A spreadsheet
       sums a zero and cannot sum a blank. */
    return value === null ? '' : String(value)
  }
  if (dataTypeOf(column) === 'money') return ''
  const primary = flattenCellText(column.cell(record))
  const secondary =
    column.secondaryLine === undefined ? '' : flattenCellText(column.secondaryLine(record))
  if (primary === '') return secondary
  return secondary === '' ? primary : `${primary} — ${secondary}`
}

/**
 * `people-captains-2026-09-02.csv`.
 *
 * The date and not the instant: two exports in one minute are the same working
 * set, and a filename carrying seconds is one an operator cannot type or
 * predict. Non-alphanumerics collapse to `-` because `view` is an operator-
 * facing tab id in some tables and a download name is not a place to discover
 * what a filesystem refuses.
 */
export function tableCsvFilename(tableId: string, view: string | null, exportedAt: string): string {
  const stem = [tableId, view ?? '', exportedAt.slice(0, 10)]
    .filter((part) => part !== '')
    .join('-')
    .replace(/[^\w.-]+/gu, '-')
  return `${stem}.csv`
}
