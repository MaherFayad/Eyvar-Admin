/**
 * The result as a table — **legal for every query shape in §7.1, and the one
 * chart type that is never disabled** (AC-841).
 *
 * It renders *the same numbers the chart renders*, formatted from each series'
 * own `unit`. That is the criterion, and it is why the values come from
 * `formatMetricValue` — the single formatter a tile, an axis tick and a legend
 * all call — rather than from a second rounding rule written here.
 *
 * ## One table, not one per panel
 *
 * Small multiples exist because two series at different scales cannot share a
 * y-axis. A table has no axis, so the argument does not apply and splitting the
 * numbers across N tables would only make them harder to compare — which is the
 * thing the operator came for. Each row names its series, so nothing is
 * ambiguous.
 *
 * ## The three things a cell must keep apart
 *
 *   a **gap**            no reading. An em dash, never `0`.
 *   a **real zero**      the measurement ran and the answer was zero.
 *   a **blocked** series no points in the payload at all — the row states the
 *                        permission instead of showing an empty column.
 *
 * §7.5's rule, in a cell: *"a chart draws a break, not a dip to the axis, and
 * conflating them is how an outage looks like a collapse in demand."*
 *
 * Rules applied
 *   §9.1       numeric columns take the inline-end edge and the header follows
 *              the value, so the two share one edge.
 *   §3.5       a partial bucket is **marked**, never dropped.
 *   §9.2       the table mirrors; the numerals do not.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMetricValue } from '@/components/metrics'
import type { ReportPanel, ReportResult } from '@/data/types'
import { formatDate, isolatedRunProps, type Language, type Translator } from '@/lib'
import { panelTitle } from './PanelCard'

export interface ResultTableProps {
  result: ReportResult
  t: Translator
  language: Language
}

export function ResultTable({ result, t, language }: ResultTableProps) {
  const panelById = new Map<string, ReportPanel>(result.panels.map((p) => [p.panelId, p]))

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-1">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-start">{t('rb.table.series')}</TableHead>
            {result.buckets.map((bucket, index) => (
              <TableHead key={bucket} className="text-end">
                <span className="flex flex-col items-end">
                  <bdi>{formatDate(bucket, { style: 'day-month', language })}</bdi>
                  {/* §3.5 — marked, in WORDS. A superscript glyph would be a
                      mark only a sighted operator could resolve. */}
                  {isPartial(result, index) && (
                    <span className="text-xs font-normal text-muted-foreground">
                      {t('rb.table.partial')}
                    </span>
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.series.map((series) => {
            const panel = panelById.get(series.panelId)
            const label = panel ? panelTitle(panel, t) : null
            return (
              <TableRow key={series.id}>
                <TableCell className="text-start">
                  <span className="flex flex-col">
                    <span {...isolatedRunProps({ className: 'min-w-0' }).box}>
                      <bdi {...isolatedRunProps().run}>{label?.text ?? series.measureKey}</bdi>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {series.role === 'comparison'
                        ? t('rb.table.role.comparison')
                        : t('rb.table.role.current')}
                    </span>
                  </span>
                </TableCell>

                {series.blocked ? (
                  /* No points in the payload. The row says why rather than
                     rendering a run of dashes that reads as missing data. */
                  <TableCell colSpan={Math.max(1, result.buckets.length)} className="text-start text-muted-foreground">
                    {t('rb.panel.blocked', { permission: series.blocked })}
                  </TableCell>
                ) : series.failed ? (
                  <TableCell colSpan={Math.max(1, result.buckets.length)} className="text-start text-muted-foreground">
                    {t('rb.panel.failed')}
                  </TableCell>
                ) : (
                  result.buckets.map((bucket, index) => (
                    <TableCell key={bucket} className="text-end tabular-nums">
                      {/* `null` is a gap and formats to the em dash; `0` is a
                          real zero and formats to `0`. */}
                      {formatMetricValue(series.points[index] ?? null, series.unit, language)}
                    </TableCell>
                  ))
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function isPartial(result: ReportResult, index: number): boolean {
  return result.series.some(
    (series) => series.role === 'current' && series.partialBucketIndexes.includes(index),
  )
}
