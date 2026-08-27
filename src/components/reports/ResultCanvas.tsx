/**
 * The canvas — **the four base states, plus every condition the result is
 * required to state out loud.**
 *
 * ```
 *  Result                                  Computed 25 Jun 09:14   [Copy link]
 *  · Part of this range is outside what is recorded…      ← stated, not silent
 *  · The smallest 4 groups are folded into Other.
 *  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
 *  │ panel         │ │ panel         │ │ panel         │  ← small multiples
 *  └───────────────┘ └───────────────┘ └───────────────┘
 * ```
 *
 * ## Which shape gets drawn, and why it is not a preference
 *
 * | Result | Rendering |
 * |---|---|
 * | chart type is `table` | ONE table over every series (`ResultTable`) — a table has no axis, so nothing is distorted by putting the numbers together |
 * | `grain: 'none'` | ONE distribution — the window is one bucket, the parts sum to a whole, and there is no axis to share (`DistributionCard`) |
 * | otherwise | **small multiples**, one card per panel |
 *
 * The third row is R4-1 and it is structural rather than chosen: every series
 * carries a `panelId`, `ReportResult.panels[]` is the list of y-axes, and two
 * series share an axis **if and only if** they share a panel. The only pair
 * that ever does is a measure and its own period comparison — same number, same
 * scale, and §3.7 already rules that pair is one hue with the comparison
 * dashed. **This component cannot overlay two measures, because nothing here
 * decides what goes in a panel.**
 *
 * ## Every warning is a sentence, and none of them is a banner
 *
 * `ReportResult.warnings` and `truncated` are conditions of **this result**, not
 * of the page. R10 forbids two page-level banners and R5 reserves the page
 * banner for critical state; a dashboard can hold several results at once, each
 * with its own gaps. So they render as a list attached to the result they
 * describe. The chart-type coercion is narrower still and renders inside the
 * card it changed (§7.3).
 *
 * Rules applied
 *   `states.md` content · empty · loading · error, none a TODO, plus the
 *               domain states §8.3 names.
 *   R8          an unstarted report gets **one grey sentence**, never the
 *               first-run illustration: the data exists, the question has not
 *               been asked (AC-843).
 *   AC-844      a run that returned nothing shows §3.7's sentence, byte
 *               identical, inside a card that keeps its title and frame.
 *   AC-845      the loading state is shaped like the result it will become and
 *               the panel stays interactive — it is inside the canvas, not
 *               over the screen.
 *   AC-846      an error renders **inside the canvas** with a retry, and the
 *               composed query is not lost.
 *   AC-810      a dirty query keeps the previous result, visibly marked with
 *               its own `asOf`. Never blanked, never silently stale.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import type { Measure, QueryViolation, ReportResult } from '@/data/types'
import { formatDate, type Language, type Translator } from '@/lib'
import { DistributionCard } from './DistributionCard'
import { PanelCard } from './PanelCard'
import { ResultTable } from './ResultTable'

export type CanvasStatus = 'unstarted' | 'loading' | 'error' | 'invalid' | 'content'

export interface ResultCanvasProps {
  status: CanvasStatus
  /** Retained across a re-run and across an error, so the operator never loses the picture. */
  result: ReportResult | null
  /** True when the panel has been edited since `result` was computed (§8.3 state 2). */
  stale: boolean
  violations: readonly QueryViolation[]
  measuresByKey: Readonly<Record<string, Measure>>
  /** The chart type the operator asked for, when the planner coerced it (§7.3). */
  coercedFrom: string | null
  /** `line` or `bar` for a small-multiple; `pie` / `bar` for a distribution; `table` for the table. */
  effectiveChartType: 'line' | 'bar' | 'pie' | 'table'
  onRetry: () => void
  onRetrySeries: (measureKey: string) => void
  /** §3.7's sentence, passed in so it stays byte-identical with every board. */
  noDataSentence: string
  t: Translator
  language: Language
}

export function ResultCanvas({
  status,
  result,
  stale,
  violations,
  measuresByKey,
  coercedFrom,
  effectiveChartType,
  onRetry,
  onRetrySeries,
  noDataSentence,
  t,
  language,
}: ResultCanvasProps) {
  return (
    /* The canvas scrolls, the panel does not move. A split by district is
       twelve panels; without this the ninth is below the fold with no way to
       reach it, because the shell's content region is height-constrained. */
    <section
      aria-label={t('rb.canvas.heading')}
      className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto"
    >
      {status === 'unstarted' ? (
        /* R8's SECOND kind. One grey sentence — an illustration would claim the
           data does not exist, and it does; the question has not been asked. */
        <EmptyState kind="no-match" message={t('rb.canvas.unstarted')} />
      ) : status === 'loading' ? (
        /* Shaped like what it becomes, inside the canvas. The panel's controls
           are outside this subtree and stay interactive (AC-845). */
        <LoadingSkeleton pattern="P5" label={t('rb.canvas.loading')} />
      ) : status === 'error' ? (
        <ErrorState
          scope="card"
          message={t('rb.canvas.error')}
          action={{ label: t('rb.canvas.error.retry'), onClick: onRetry }}
        />
      ) : status === 'invalid' ? (
        <InvalidQuery violations={violations} t={t} />
      ) : result ? (
        <>
          <Meta result={result} stale={stale} t={t} language={language} />
          <Conditions result={result} t={t} />
          <Body
            result={result}
            measuresByKey={measuresByKey}
            coercedFrom={coercedFrom}
            effectiveChartType={effectiveChartType}
            onRetrySeries={onRetrySeries}
            noDataSentence={noDataSentence}
            t={t}
            language={language}
          />
        </>
      ) : null}
    </section>
  )
}

/**
 * §8.3 state 2 — **Dirty.** The canvas keeps the previous result and says so,
 * with the instant it was computed. Never a blanked canvas (which loses the
 * operator's place) and never a silently stale one (which is a wrong number
 * with a confident frame).
 */
function Meta({
  result,
  stale,
  t,
  language,
}: {
  result: ReportResult
  stale: boolean
  t: Translator
  language: Language
}) {
  const time = formatDate(result.asOf, { style: 'day-month-time', language })
  return (
    <p role={stale ? 'status' : undefined} className="text-xs text-muted-foreground">
      {stale ? t('rb.canvas.stale', { time }) : t('rb.canvas.asOf', { time })}
    </p>
  )
}

/**
 * Everything the result is required to admit. Each is a fact about **this
 * result**, so it renders beside it — not as a page banner (R10 permits one and
 * a dashboard can hold several results) and not as a toast (R10: a toast is a
 * transient confirmation and every one of these is a standing condition).
 */
function Conditions({ result, t }: { result: ReportResult; t: Translator }) {
  const lines: string[] = []

  if (result.warnings.includes('gaps-outside-fixture-range')) lines.push(t('rb.warning.gaps'))
  if (result.warnings.includes('partial-first') || result.warnings.includes('partial-last')) {
    lines.push(t('rb.warning.partial'))
  }
  if (result.foldedGroupCount !== null) {
    lines.push(t('rb.warning.groupsFolded', { count: result.foldedGroupCount }))
  }
  if (result.truncated) {
    /* AC-849 — the chart renders WITH a stated caveat naming the cap. It never
       renders as if it were complete. */
    lines.push(t('rb.warning.truncated', { rows: result.truncatedAtRows ?? 0 }))
  }

  if (lines.length === 0) return null
  return (
    <ul className="flex list-none flex-col gap-0.5">
      {lines.map((line) => (
        <li key={line} className="text-xs text-muted-foreground">
          {line}
        </li>
      ))}
    </ul>
  )
}

/**
 * A hand-edited URL, or a saved report whose measure changed underneath it.
 *
 * The violations are the **same objects** the panel uses to disable a control,
 * from the same pure function `reports.run` calls — so the sentence here and
 * the sentence beside the greyed-out option are one string, not two that agree
 * today (AC-825).
 */
function InvalidQuery({ violations, t }: { violations: readonly QueryViolation[]; t: Translator }) {
  return (
    <Card className="w-full py-0">
      <div role="alert" className="flex flex-col items-center gap-2 px-3 py-8 text-center">
        <p className="text-sm text-muted-foreground">{t('rb.canvas.invalid')}</p>
        <ul className="flex list-none flex-col gap-0.5">
          {violations.map((violation) => (
            <li key={`${violation.code}-${violation.field}`} className="text-xs text-muted-foreground">
              {t(violation.reasonKey, violation.reasonParams)}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

function Body({
  result,
  measuresByKey,
  coercedFrom,
  effectiveChartType,
  onRetrySeries,
  noDataSentence,
  t,
  language,
}: {
  result: ReportResult
  measuresByKey: Readonly<Record<string, Measure>>
  coercedFrom: string | null
  effectiveChartType: 'line' | 'bar' | 'pie' | 'table'
  onRetrySeries: (measureKey: string) => void
  noDataSentence: string
  t: Translator
  language: Language
}) {
  const measureOf = (panelId: string): Measure | null => {
    const series = result.series.find((s) => s.panelId === panelId)
    return series ? (measuresByKey[series.measureKey] ?? null) : null
  }

  if (result.panels.length === 0) {
    /* The run succeeded and produced nothing at all. §3.7's sentence, inside a
       card that keeps its frame — not a spinner and not an empty plot. */
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('rb.canvas.heading')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-10 text-center text-sm text-muted-foreground">{noDataSentence}</p>
        </CardContent>
      </Card>
    )
  }

  if (effectiveChartType === 'table') {
    return <ResultTable result={result} t={t} language={language} />
  }

  /* A single bucket is a distribution, not a set of axes. See the file header. */
  if (result.query.grain === 'none') {
    const first = result.panels[0]
    const measure = first ? measureOf(first.panelId) : null
    const blockedOrFailed = result.panels.filter((panel) => {
      const series = result.series.find((s) => s.panelId === panel.panelId && s.role === 'current')
      return Boolean(series?.blocked || series?.failed)
    })
    const drawable = result.panels.filter((panel) => !blockedOrFailed.includes(panel))

    return (
      <div className="flex flex-col gap-4">
        {blockedOrFailed.map((panel) => (
          <PanelCard
            key={panel.panelId}
            panel={panel}
            result={result}
            measure={measureOf(panel.panelId)}
            kind="bar"
            coercedFrom={null}
            onRetrySeries={onRetrySeries}
            noDataSentence={noDataSentence}
            t={t}
            language={language}
          />
        ))}
        {drawable.length > 0 && (
          <DistributionCard
            panels={drawable}
            result={result}
            measure={measure}
            kind={effectiveChartType === 'pie' ? 'pie' : 'bar'}
            /* The MEASURE, not the first group. A part-of-whole is one
               measure split into parts, and titling it with whichever group
               happened to rank first reads as a chart of that group. */
            title={measure ? t(measure.labelKey) : t('rb.canvas.heading')}
            t={t}
            language={language}
          />
        )}
      </div>
    )
  }

  /* **Small multiples, two across — the metric boards' own chart grid.**
     R4-4 §4.5 puts charts and breakdowns in ONE two-column grid, each at half
     the content width, and **R5-8 settled halves rather than thirds by
     measurement**: at 13px an Eyvar label truncates in a ~320px card, and V-4
     proved truncation is destructive in Arabic. A panel is a chart card, so it
     takes a chart card's column count.
     
     **This is a deviation from R4-1 §1.4, which files panels on the metric
     TILE grid**, and it is raised in the handoff rather than absorbed: a fixed
     three-across grid inside the builder's canvas measured **237px per panel at
     1440** — below R4-1's own stated 268px floor — because the canvas is
     narrower than a full-width tile row by the width of the query panel. Two
     columns give 360px at 1440 and 280px at the 1280 floor, both above it.
     Product-designer rules which grid a panel belongs on; until then the rule
     whose floor is satisfied is the one in force.

     Static class strings both ways: a computed column count is a class
     Tailwind's scanner never sees and therefore never emits. */
  const columns = result.panels.length === 1 ? 'grid-cols-1' : 'grid-cols-2'

  return (
    <ul role="list" className={cn('grid list-none gap-3', columns)}>
      {result.panels.map((panel) => (
        <li key={panel.panelId} className="min-w-0">
          <PanelCard
            panel={panel}
            result={result}
            measure={measureOf(panel.panelId)}
            kind={effectiveChartType === 'bar' ? 'bar' : 'line'}
            coercedFrom={coercedFrom}
            onRetrySeries={onRetrySeries}
            noDataSentence={noDataSentence}
            t={t}
            language={language}
          />
        </li>
      ))}
    </ul>
  )
}
