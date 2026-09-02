/**
 * The builder — **a persistent query panel beside a canvas that re-renders on
 * `Run`.**
 *
 * ```
 *  Reports                                    [Export CSV] [Save]
 *  ┌────────────┐  ┌──────────────────────────────────────────┐
 *  │ Measure    │  │ Computed 25 Jun 09:14                     │
 *  │ Second     │  │ · Part of this range is outside…          │
 *  │ Split by   │  │ ┌──────────┐ ┌──────────┐                 │
 *  │ Filters    │  │ │ panel    │ │ panel    │                 │
 *  │ Range      │  │ └──────────┘ └──────────┘                 │
 *  │ Grain      │  └──────────────────────────────────────────┘
 *  │ Compare    │
 *  │ Chart      │
 *  │ [Run]      │
 *  └────────────┘
 * ```
 *
 * ## The URL is the storage adapter, and that is an acceptance criterion
 *
 * **Q1 is open and there is no storage adapter.** `lib/persistence.ts` is
 * explicit that shipping a `localStorage` one would be *"answering Q1 by
 * writing code"*. §9.2's answer is that the URL stores the question, and
 * **AC-853** makes it binding: reload does not lose it, `Back` steps through
 * previous questions (**AC-854**), and sharing works with no share feature
 * because pasting a link into a chat is how every analytics tool is actually
 * used (**AC-855**). `serialiseReportQuery` is lossless by construction and
 * lives in the data layer, so an alert notification's `route` and this screen's
 * address bar are produced by one function.
 *
 * The push happens on **`Run`**, not on every keystroke: one history entry per
 * question asked, which is what makes `Back` mean anything.
 *
 * ## Nothing runs until `Run`
 *
 * **AC-809.** Changing a control issues no request; it re-plans, synchronously
 * and purely, and the plan re-disables whatever is now illegal. **AC-810**: the
 * canvas keeps the previous result, marked with the instant it was computed,
 * until `Run` is pressed again. A blanked canvas loses the operator's place and
 * a silently stale one is a wrong number in a confident frame.
 *
 * ## Retrying one failed series does not re-request the others
 *
 * **AC-851.** A failed leg re-runs as a **single-measure query** and its panels
 * and series are spliced into the result that already succeeded. Buckets are
 * identical because the window and grain are, and `panelId` is derived from the
 * measure and group rather than from an index, so the splice is by key and not
 * by position.
 *
 * Rules applied
 *   §5.1        NOT full-bleed. The rail and the sub-tab list stay, because the
 *               one screen whose job is comparison must not be the one screen
 *               you cannot leave.
 *   R3          `Run` is the panel's primary; the page header carries
 *               secondaries only, so there is one primary on screen.
 *   §8 slot 4c  no page-level primary. `Save` and `Export CSV` are secondaries.
 *   `states.md` all four base states live in `ResultCanvas`; none is a TODO.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { QueryPanel, ResultCanvas, type CanvasStatus } from '@/components/reports'
import { useAsync } from '@/hooks'
import { useNowIso } from '@/screens/queues'
import {
  EYVAR_TODAY,
  REPORT_QUERY_PARAM,
  deserialiseReportQuery,
  exportReport,
  listDimensions,
  listMeasures,
  localDayOf,
  planReportQuery,
  runReport,
  serialiseReportQuery,
} from '@/data/clients'
import type {
  Dimension,
  Measure,
  QueryViolation,
  ReportQuery,
  ReportResult,
  SavedReport,
} from '@/data/types'
import { applyReportMode } from '@/data/clients/reports'
import { reportMode, type ReportMode } from '@/data/types'
import { isDeepEqual, type Language, type Translator } from '@/lib'
import { downloadCsv, reportCsvToText } from './csv'
import { SaveReportDialog } from './SaveReportDialog'
import { ModeField, ReportModePanel } from './ReportModePanel'
import { ReportModeCanvas } from './ReportModeCanvas'

/**
 * The empty question. **Not a first-run illustration** (R8's first kind claims
 * the data does not exist); the data exists and the question has not been
 * asked, so the canvas carries one grey sentence and every control but the
 * measure picker is disabled in place (§5.3, AC-807, AC-843).
 */
export const EMPTY_QUERY: ReportQuery = {
  measures: [],
  groupBy: null,
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

export interface ReportBuilderProps {
  /** The saved report being edited, when one is open. `null` is an unsaved question. */
  report: SavedReport | null
  /** §8.3 state 12 — the report was deleted while open; `Save` becomes `Save as new`. */
  deleted?: boolean
  /** §3.7's no-data sentence, passed down so it stays byte-identical with every board. */
  noDataSentence: string
  title: string
  t: Translator
  language: Language
  dir: 'ltr' | 'rtl'
  onSaved?: (report: SavedReport) => void
}

export function ReportBuilder({
  report,
  deleted = false,
  noDataSentence,
  title,
  t,
  language,
  dir,
  onSaved,
}: ReportBuilderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const now = useNowIso()
  const today = useMemo(() => (now ? localDayOf(now) : EYVAR_TODAY), [now])

  /* The question, restored from the URL when there is one, then from the saved
     report, then empty. Reading the URL FIRST is what makes a link to a
     modified version of a saved report reproduce the modification. */
  const initial = useMemo(() => {
    const encoded = new URLSearchParams(location.search).get(REPORT_QUERY_PARAM)
    const fromUrl = encoded ? deserialiseReportQuery(encoded) : null
    return fromUrl ?? report?.query ?? EMPTY_QUERY
    /* Deliberately keyed on the report id and the encoded param only: this is a
       seed, and re-seeding it on every navigation would discard edits. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id])

  const [query, setQuery] = useState<ReportQuery>(initial)
  const [ranQuery, setRanQuery] = useState<ReportQuery | null>(null)
  const [result, setResult] = useState<ReportResult | null>(null)
  const [violations, setViolations] = useState<readonly QueryViolation[]>([])
  const [status, setStatus] = useState<CanvasStatus>('unstarted')
  const [saveOpen, setSaveOpen] = useState(false)

  /* §8.3 state 10 — one leg failed while the rest resolved. The data layer
     exposes `failMeasureKeys` as the seam and defines no transport for it, so
     the screen reads one search param and passes it through. Named in the
     handoff: without it AC-852 ("every state reachable with no code change")
     is not true of the partial-failure state. */
  const failMeasureKeys = useMemo(() => {
    const raw = new URLSearchParams(location.search).get('failSeries')
    return raw ? raw.split(',').filter(Boolean) : undefined
  }, [location.search])

  const catalogue = useAsync<{ measures: Measure[]; dimensions: Dimension[] }>(
    async (signal) => {
      const [measures, dimensions] = await Promise.all([
        listMeasures({ pageSize: 100 }, signal),
        listDimensions({ pageSize: 100 }, signal),
      ])
      return { measures: measures.items, dimensions: dimensions.items }
    },
    {
      deps: [],
      /* Parameterless catalogue read, shared by key with
         `DashboardDetailScreen`'s identical fetcher. `failMeasureKeys` is a
         parameter of the RUN, not of this read, so it is correctly absent. */
      cacheKey: 'catalogue.measures',
      isEmpty: (data) => data.measures.length === 0,
    },
  )

  const measures = catalogue.data?.measures ?? []
  const dimensions = catalogue.data?.dimensions ?? []
  const measuresByKey = useMemo(
    () => Object.fromEntries(measures.map((m) => [m.key, m])),
    [measures],
  )

  /* Synchronous, pure, and the SAME function `reports.run` calls. AC-809 and
     AC-817 both require the answer before a request exists. */
  const plan = useMemo(
    () => planReportQuery(query, { measures, dimensions }, today),
    [query, measures, dimensions, today],
  )

  const runToken = useRef(0)

  const run = useCallback(
    async (next: ReportQuery, pushHistory: boolean) => {
      const token = (runToken.current += 1)
      setStatus('loading')
      try {
        const outcome = await runReport(next, { today, failMeasureKeys })
        if (token !== runToken.current) return
        if (outcome.status === 'invalid-query') {
          /* A DOMAIN answer, returned. The previous result is kept; the
             violations say what to fix (AC-825). */
          setViolations(outcome.violations)
          setStatus('invalid')
          return
        }
        setViolations([])
        setResult(outcome.result)
        setRanQuery(next)
        setStatus('content')
        if (pushHistory) {
          navigate(
            { pathname: location.pathname, search: `?${REPORT_QUERY_PARAM}=${serialiseReportQuery(next)}` },
            { replace: false },
          )
        }
      } catch {
        if (token !== runToken.current) return
        /* AC-846 — the error is IN the canvas, the query is not lost, and the
           panel stays usable. */
        setStatus('error')
      }
    },
    [today, failMeasureKeys, navigate, location.pathname],
  )

  /* A question that arrives already composed — from a link, from a saved
     report, from an alert notification — runs itself once. A question the
     operator is still composing does not (AC-809).

     **"Composed" is the planner's answer, not `measures.length`.** A funnel,
     a cohort and a journey carry no `measures` by construction (P7-T1 put
     their configuration in `funnel` / `cohort` / `journey`), so keying the
     seed on that array meant a shared link to any of the three landed on an
     unstarted canvas and the operator had to press `Run` to see the report
     they were sent — which is AC-855 not holding for four of the five
     modes. The planner already answers "is this question answerable", it is
     the same function `reports.run` calls, and it says no for the empty
     query. */
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) return
    if (catalogue.status !== 'content') return
    seeded.current = true
    const seedPlan = planReportQuery(initial, { measures, dimensions }, today)
    if (seedPlan.violations.length === 0) void run(initial, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogue.status, initial, run])

  /* AC-854 — Back steps through previous questions, and the panel follows.
     The URL is the source of truth for what has been RUN, so a popstate
     re-seeds the panel and re-runs. */
  useEffect(() => {
    const encoded = new URLSearchParams(location.search).get(REPORT_QUERY_PARAM)
    if (!encoded) return
    const fromUrl = deserialiseReportQuery(encoded)
    if (!fromUrl) return
    if (ranQuery && isDeepEqual(fromUrl, ranQuery)) return
    if (catalogue.status !== 'content') return
    setQuery(fromUrl)
    void run(fromUrl, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, catalogue.status])

  /**
   * **AC-851** — retry one leg without re-requesting the others.
   *
   * The retry is a single-measure query, so the resolved series is never asked
   * for again. Merging is by `panelId` and `measureKey`, never by index: the
   * buckets are identical because the window and grain are, and a positional
   * merge would silently mis-file a group if the fold changed.
   */
  const retrySeries = useCallback(
    async (measureKey: string) => {
      if (!ranQuery || !result) return
      const outcome = await runReport({ ...ranQuery, measures: [{ key: measureKey }] }, { today })
      if (outcome.status !== 'ok') return
      setResult((current) => {
        if (!current) return current
        return {
          ...current,
          panels: [
            ...current.panels.filter(
              (panel) =>
                !current.series.some((s) => s.panelId === panel.panelId && s.measureKey === measureKey),
            ),
            ...outcome.result.panels,
          ],
          series: [
            ...current.series.filter((s) => s.measureKey !== measureKey),
            ...outcome.result.series,
          ],
        }
      })
    },
    [ranQuery, result, today],
  )

  const exportCsv = useCallback(async () => {
    const target = ranQuery ?? query
    const csv = await exportReport(target, { reportName: report?.name ?? null, today })
    downloadCsv(`${report?.name ?? 'report'}.csv`, reportCsvToText(csv))
  }, [ranQuery, query, report, today])

  const stale = ranQuery !== null && !isDeepEqual(query, ranQuery)


  const header = (
    <PageHeader
      title={title}
      meta={null}
      secondaryActions={[
        {
          /* `Save as new` is what a DELETED report's save becomes (§8.3 state
             12). A report that has simply never been saved is `Save`; calling
             it "save as new" would imply an original it is diverging from. */
          label: deleted ? t('rb.saveAs') : t('rb.save'),
          onClick: () => setSaveOpen(true),
          /* Nothing to save until something has been asked — and *asked* is
             mode-shaped: a funnel has no `measures` and never will, so keying
             this on `measures.length` alone made `Save` permanently off in
             three of the five modes. The planner already knows whether the
             question is answerable, and that is the same test `saveReport`
             applies (`query-invalid`). */
          disabled: plan.violations.length > 0,
        },
        {
          label: t('rb.export'),
          onClick: () => void exportCsv(),
          disabled: result === null,
        },
      ]}
      t={t}
      dir={dir}
    />
  )

  /**
   * **P7-T4 — the `isDirectSerializedQuery` fallback is gone, and with it
   * `ReportStudio`.**
   *
   * It used to render the Studio whenever the URL carried no `?q=`, which made
   * the ungoverned editor the front door and left the governed one reachable
   * only from a link the governed one had produced — a closed loop where the
   * shareable half could only be entered by someone who already had a share
   * (`REMEDIATION-PLAN.md` §3.3). The Studio's five modes are now on this
   * builder, behind `mode`, so there is nothing left to fall back to.
   */
  const mode = reportMode(query)
  /* `trend` and `table` are the two modes `QueryPanel` was written for: a
     measure, a split, a grain, a chart. The other three configure a different
     shape and get the rail built for it. */
  const seriesMode = mode === 'trend' || mode === 'table'

  const switchMode = useCallback(
    (next: ReportMode) => setQuery((current) => applyReportMode(current, next)),
    [],
  )

  /**
   * **A retained result belongs to the question that produced it, and changing
   * mode changes the question.**
   *
   * §8.3 state 2 keeps the previous answer on screen while the panel is edited,
   * and that is right for every edit except this one: a trend's series drawn
   * under a funnel's chrome is not a stale answer, it is a picture of a
   * different question — `rb.trend.heading` does not exist because a trend is
   * not one of the three shapes this canvas draws. So a result from another
   * mode is withheld and the canvas falls back to its unstarted sentence,
   * which is honest: this question has not been asked yet.
   *
   * The previous result is **not discarded** — switching back restores it,
   * because `result` is untouched and only what is handed to the canvas
   * changes.
   */
  const resultInMode = result !== null && reportMode(result.query) === mode
  const shownResult = resultInMode ? result : null
  const shownStatus: CanvasStatus = status === 'content' && !resultInMode ? 'unstarted' : status

  return (
    <div className="flex h-full min-h-0 w-full flex-col px-page-pad py-6 wide:px-page-pad-wide">
      <div className="shrink-0">{header}</div>

      {/* §8.3 state 12 — read-only with a stated notice, and `Save` becomes
          `Save as new`. Not a page banner: R5 reserves that for critical state
          and this is a condition of one record. */}
      {deleted && (
        <p role="status" className="shrink-0 pb-3 text-sm text-muted-foreground">
          {t('rb.report.deleted')}
        </p>
      )}

      <div className="flex min-h-0 flex-1 gap-4">
        {/* The rail: the mode switcher, then the panel that mode is asked in.
            One `Run`, one primary, whichever panel is below it (R3). */}
        <div className="flex min-h-0 w-72 shrink-0 flex-col gap-3 overflow-y-auto">
          <ModeField query={query} onChange={switchMode} t={t} />

          {seriesMode ? (
            <QueryPanel
              query={query}
              onChange={setQuery}
              onRun={() => void run(query, true)}
              plan={plan}
              measures={measures}
              dimensions={dimensions}
              catalogueStatus={catalogue.status}
              onRetryCatalogue={catalogue.refetch}
              today={today}
              running={status === 'loading'}
              t={t}
              language={language}
            />
          ) : (
            <ReportModePanel
              query={query}
              onChange={setQuery}
              onRun={() => void run(query, true)}
              plan={plan}
              measures={measures}
              dimensions={dimensions}
              catalogueStatus={catalogue.status}
              onRetryCatalogue={catalogue.refetch}
              today={today}
              running={status === 'loading'}
              t={t}
              language={language}
            />
          )}
        </div>

        {/* The canvas the mode's answer has a shape for. Both take the same
            `status`, so loading, error and empty look identical in all five. */}
        {seriesMode ? (
          <ResultCanvas
            status={shownStatus}
            result={shownResult}
            stale={stale}
            violations={violations}
            measuresByKey={measuresByKey}
            coercedFrom={plan.chartTypeCoerced ? query.chartType : null}
            effectiveChartType={plan.effectiveChartType}
            onRetry={() => void run(ranQuery ?? query, false)}
            onRetrySeries={(key) => void retrySeries(key)}
            noDataSentence={noDataSentence}
            t={t}
            language={language}
          />
        ) : (
          <ReportModeCanvas
            status={shownStatus}
            result={shownResult}
            stale={stale}
            violations={violations}
            measuresByKey={measuresByKey}
            onRetry={() => void run(ranQuery ?? query, false)}
            noDataSentence={noDataSentence}
            t={t}
            language={language}
          />
        )}
      </div>

      <SaveReportDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        /* A deleted report has no id to update, so the dialog can only create
           — which is what makes `Save as new` honest rather than decorative. */
        report={deleted ? null : report}
        query={query}
        onSaved={(saved) => {
          setSaveOpen(false)
          onSaved?.(saved)
        }}
        t={t}
      />
    </div>
  )
}
