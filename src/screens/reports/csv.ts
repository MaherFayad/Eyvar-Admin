/**
 * `ReportCsv` → a file on the operator's disk — §10.1.
 *
 * The data layer already produced the rows and the header block, including
 * **§10.2's one deliberate break of the halalas rule**: money in the CSV is
 * decimal SAR with an explicit `currency` column, because a CSV's consumer is a
 * human in a spreadsheet and `29505` in a revenue column is a defect they will
 * not catch. That conversion happens in `reports.ts` with the reason attached,
 * and **nothing here converts anything** — this file serialises and downloads.
 *
 * ## The header block is not decoration
 *
 * *"A CSV of bare numbers with no window is unattributable the moment it reaches
 * a spreadsheet, and unattributable numbers are how the wrong figure ends up in
 * a deck."* So the report name, the window with explicit dates, the grain, the
 * comparison, every applied filter and the `asOf` precede the data — and
 * **AC-890**'s omitted series are named with the permission that omitted them,
 * so a redacted export cannot pass for a complete one.
 *
 * ## Quoting
 *
 * Every field is quoted and every embedded quote doubled — RFC 4180. A report
 * name is user content and this dataset contains one written in Arabic; an
 * unquoted comma or newline in a name silently shifts every column to its right,
 * and the operator finds out in the deck.
 */

import type { ReportCsv } from '@/data/types'

/** The nine columns §10.1 names, in order. */
const COLUMNS = [
  'bucket_start',
  'series',
  'measure_key',
  'group_value',
  'role',
  'value',
  'unit',
  'currency',
  'is_partial_bucket',
] as const

export function reportCsvToText(csv: ReportCsv): string {
  const lines: string[] = []

  /* The header block. Two columns — a key and its value — so a spreadsheet
     opens it as data rather than as a run of merged text. */
  lines.push(row(['report', csv.header.reportName ?? '']))
  lines.push(row(['window_from', csv.header.windowFrom]))
  lines.push(row(['window_to', csv.header.windowTo]))
  lines.push(row(['grain', csv.header.grain]))
  lines.push(row(['comparison', csv.header.periodComparison]))
  lines.push(row(['as_of', csv.header.asOf]))
  for (const filter of csv.header.filters) {
    lines.push(row(['filter', `${filter.field} ${filter.op} ${String(filter.value)}`]))
  }
  for (const omitted of csv.header.omittedSeries) {
    /* AC-890 — the header states that a series was omitted **and why**. */
    lines.push(row(['omitted_series', `${omitted.measureKey} (${omitted.permission})`]))
  }
  lines.push('')

  lines.push(row(COLUMNS))
  for (const line of csv.rows) {
    lines.push(
      row([
        line.bucket_start,
        line.series,
        line.measure_key,
        line.group_value ?? '',
        line.role,
        /* A gap is an EMPTY cell, never `0`. A spreadsheet sums a zero. */
        line.value === null ? '' : String(line.value),
        line.unit,
        line.currency ?? '',
        line.is_partial_bucket ? 'true' : 'false',
      ]),
    )
  }

  return lines.join('\r\n')
}

function row(fields: readonly string[]): string {
  return fields.map((field) => `"${field.replace(/"/gu, '""')}"`).join(',')
}

/**
 * Hand the text to the browser.
 *
 * A blob and an object URL rather than a data URI: a 400-bucket report over
 * eight series is 3,200 rows, and a data URI of that length is refused by more
 * than one browser. The URL is revoked immediately after the click — an object
 * URL that is never revoked keeps the whole blob alive for the life of the tab,
 * and an operations console is open all day.
 */
export function downloadCsv(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
