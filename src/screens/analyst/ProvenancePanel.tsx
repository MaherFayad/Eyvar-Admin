/**
 * The provenance rail (`22-analytics-v2.md` §5.3, AC-1258/AC-1259) — every
 * run the job made, each an `Open in builder` link (a real `<a>`, it
 * navigates — R3's link rule). `--ev-detail-rail-w` is the caller's
 * `DetailPage`; this component only lists what it is given.
 */

import { Link } from 'react-router-dom'
import { REPORT_QUERY_PARAM, serialiseReportQuery } from '@/data/clients'
import type { ReportQuery } from '@/data/types/report'
import { formatDate, type Language, type Translator } from '@/lib'

export type ProvenanceRun =
  | {
      reportId: string
      deleted: false
      name: string
      query: ReportQuery
      /** `SavedReport.lastRunAt` — `null` when the report has never run. */
      asOf: string | null
    }
  /** The report block cited a `reportId` `getReport` could no longer find (§5.3). */
  | { reportId: string; deleted: true }

export interface ProvenancePanelProps {
  runs: readonly ProvenanceRun[]
  t: Translator
  language: Language
}

function windowText(query: ReportQuery, t: Translator, language: Language): string {
  const window = query.window
  if (window.kind === 'preset') return t(`rb.preset.${window.preset}`)
  return t('rb.control.window.range', {
    from: formatDate(window.from, { style: 'day-month', language }),
    to: formatDate(window.to, { style: 'day-month', language }),
  })
}

export function ProvenancePanel({ runs, t, language }: ProvenancePanelProps) {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-card-border bg-card p-3">
      <h2 className="text-sm font-semibold">{t('an.provenance')}</h2>
      {runs.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('an.provenance.none')}</p>
      ) : (
        <ul className="flex flex-col">
          {runs.map((run, index) => (
            <li key={run.reportId} className={index === 0 ? 'py-2' : 'border-t border-border py-2'}>
              {run.deleted ? (
                <p className="text-xs text-muted-foreground">{t('an.provenance.reportGone')}</p>
              ) : (
                <>
                  <p className="min-w-0 truncate text-sm">
                    <bdi>{run.name}</bdi>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {windowText(run.query, t, language)}
                    {run.asOf !== null &&
                      ` · ${t('an.provenance.asOf', { time: formatDate(run.asOf, { style: 'day-month-time', language }) })}`}
                  </p>
                  <Link
                    to={`/management/reports?${REPORT_QUERY_PARAM}=${encodeURIComponent(serialiseReportQuery(run.query))}`}
                    className="text-xs text-info-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {t('an.provenance.openInBuilder')}
                  </Link>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
