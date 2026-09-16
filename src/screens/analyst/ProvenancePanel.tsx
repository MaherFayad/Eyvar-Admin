/**
 * The provenance rail (AC-1258/AC-1259): every run the study cites, by
 * runId (F-V2-90 — never derived from the page's report blocks). A
 * citation `getRun` can't find still renders, marked missing, not dropped.
 */

import { Link } from 'react-router-dom'
import { REPORT_QUERY_PARAM, serialiseReportQuery } from '@/data/clients'
import type { ReportQuery } from '@/data/types/report'
import { formatDate, type Language, type Translator } from '@/lib'

export type ProvenanceRun =
  | { runId: string; status: 'ok'; query: ReportQuery; asOf: string }
  /** F-V2-90 — a cited `runId` `getRun` could not resolve. */
  | { runId: string; status: 'missing' }

export interface ProvenancePanelProps {
  status: 'loading' | 'content' | 'empty' | 'error'
  runs: readonly ProvenanceRun[]
  onRetry?: () => void
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

export function ProvenancePanel({ status, runs, onRetry, t, language }: ProvenancePanelProps) {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-card-border bg-card p-3">
      <h2 className="text-sm font-semibold">{t('an.provenance')}</h2>

      {status === 'loading' && <p className="text-xs text-muted-foreground">{t('an.provenance.loading')}</p>}

      {status === 'error' && (
        <div className="flex flex-col items-start gap-1.5">
          <p className="text-xs text-muted-foreground">{t('an.provenance.error')}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-xs text-info-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t('an.index.error.retry')}
            </button>
          )}
        </div>
      )}

      {status === 'empty' && <p className="text-xs text-muted-foreground">{t('an.provenance.none')}</p>}

      {status === 'content' && (
        <ul className="flex flex-col">
          {runs.map((run, index) => (
            <li key={run.runId} className={index === 0 ? 'py-2' : 'border-t border-border py-2'}>
              {/* The bare id, matching a finding's own "(run RUN-1)" text
                  literally — the whole point of citing by run rather than by
                  report. */}
              <p className="min-w-0 truncate font-mono text-sm">{run.runId}</p>
              {run.status === 'missing' ? (
                <p className="text-xs text-muted-foreground">{t('an.provenance.missing')}</p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    {windowText(run.query, t, language)}
                    {' · '}
                    {t('an.provenance.asOf', { time: formatDate(run.asOf, { style: 'day-month-time', language }) })}
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
