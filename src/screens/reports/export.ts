/**
 * `ReportCsv` → a file on disk, and the PNG audit call beside it (AC-1160).
 * `csv.ts` is now a re-export shim for this file. Money here is decimal SAR
 * — the one deliberate break of the halalas-integer rule (§10.2); the
 * conversion happens in `reports.ts`, never here.
 */

import type { FilterSpec, IsoDate } from '@/data/types'
import type { PeriodComparison, ReportCsv } from '@/data/types'
import { track } from '@/lib/analytics'

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

/** A comparison, in the raw machine form the header block already uses for `grain` — not translated (X14: the header is data, not prose). */
function periodComparisonRaw(comparison: PeriodComparison): string {
  return typeof comparison === 'string' ? comparison : `fixed:${comparison.from}..${comparison.to}`
}

export function reportCsvToText(csv: ReportCsv): string {
  const lines: string[] = []

  /* The header block. Two columns — a key and its value — so a spreadsheet
     opens it as data rather than as a run of merged text. */
  lines.push(row(['report', csv.header.reportName ?? '']))
  lines.push(row(['window_from', csv.header.windowFrom]))
  lines.push(row(['window_to', csv.header.windowTo]))
  lines.push(row(['grain', csv.header.grain]))
  lines.push(row(['comparison', periodComparisonRaw(csv.header.periodComparison)]))
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
 * Hand the text to the browser via a blob and object URL, not a data URI —
 * a large CSV is refused as a data URI by more than one browser. The URL is
 * revoked immediately after the click: an unrevoked object URL keeps the
 * blob alive for the life of the tab, and this console stays open all day.
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

export interface ExportAuditInput {
  format: 'csv' | 'png'
  reportName: string | null
  windowFrom: IsoDate
  windowTo: IsoDate
  filters: readonly FilterSpec[]
}

/**
 * AC-1160 — one audit entry per export, whichever format. `filters` is
 * flattened to JSON because `track`'s props are flat by contract; the raw
 * `FilterSpec[]` is still recoverable from it for whoever reads the log.
 */
export function auditExport(input: ExportAuditInput): void {
  track('reports.export', {
    format: input.format,
    reportName: input.reportName ?? '',
    windowFrom: input.windowFrom,
    windowTo: input.windowTo,
    filters: JSON.stringify(input.filters),
  })
}
