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
 * | `grain: 'none'` | ONE distribution — the window is one bucket, the parts sum to a whole, and there is no axis to share (`DistributionCard`) |
 * | otherwise | **small multiples**, one card per panel |
 * | beneath either, when the caller asks (`withTable`) | ONE table over every series (`ResultTable`) — a table has no axis, so nothing is distorted by putting the numbers together, and **a value you can read exactly is not a different chart type** |
 * | chart type `table`, and the caller did NOT ask | the table alone, which is what a dashboard tile pinned as a table has always been |
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

import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/EmptyState'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ChevronDownIcon, MoreIcon } from '@/components/icons'
import type {
  ChartType,
  CurrencyCode,
  Measure,
  MetricUnit,
  QueryViolation,
  ReportPanel,
  ReportResult,
  ReportSeries,
} from '@/data/types'
import type { Annotation, AnnotationKind } from '@/data/types/annotation'
import { serialiseReportQuery } from '@/data/clients'
import { formatDate, type Language, type Translator } from '@/lib'
import { useChartView } from '@/hooks/useChartView'
import { AnnotationForm } from './AnnotationForm'
import { DistributionCard } from './DistributionCard'
import { KpiCard } from './KpiCard'
import {
  PanelCard,
  PanelFrame,
  RelatedBoards,
  panelTitle,
  relatedBoards,
  type RelatedBoard,
} from './PanelCard'
import {
  COMPARISON_SERIES_ID,
  SeriesChart,
  type SeriesChartKind,
  seriesColor,
  seriesDash,
} from './SeriesChart'
import { SeriesHeadlines } from './SeriesHeadlines'
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
  /** The shape the planner actually draws — every v2 `ChartType` is legal here now. */
  effectiveChartType: ChartType
  /**
   * §2's chart-view cache key — the saved report id, or `serialiseReportQuery`
   * of the draft when unsaved. Defaults to the latter so a caller that has not
   * been updated for v2 keeps working; a saved report should pass its own id
   * so the view survives a query edit that does not change the report.
   */
  viewKey?: string
  /** §2.4 — the window's annotations, already fetched by the caller (dumb about fetching, per this module's rule). */
  annotations?: readonly Annotation[]
  /** `manage_analytics` is not yet a minted `PermissionKey` (D17); the caller resolves it (BUILD-LOG F-V2-28) and passes the outcome. */
  canAnnotate?: boolean
  onSaveAnnotation?: (input: { date: string; label: string; kind: AnnotationKind; note: string }) => Promise<void>
  /**
   * Re-runs the whole result. Reached from three places, all of them real: the
   * error state's `Run again`, `Meta`'s refresh beside the freshness line, and
   * — on the builder, which renders neither — `ChartToolbar`'s own refresh.
   */
  onRetry: () => void
  onRetrySeries: (measureKey: string) => void
  /**
   * **The builder's chrome, opted into rather than assumed — because this
   * component has a second caller.**
   *
   * `DashboardTile` renders this exact component, which is what makes *"a tile
   * is the same composer as the builder"* (AC-873) checkable rather than
   * aspirational. It also means anything added here lands on a dashboard.
   *
   * A per-bucket table is thirty columns wide on a thirty-day report, so it
   * does not belong inside a tile — the tile is a *reading*, the builder is a
   * *workspace*. Off by default: the caller that wants the workspace says so,
   * and a tile inherits nothing it did not ask for.
   */
  withTable?: boolean
  /**
   * **The freshness sentence AND its refresh, together — which is the whole of
   * principle 3.**
   *
   * `Meta` — *"Computed 25 Jun 09:14"* / *"Showing the previous run…"* plus the
   * button that acts on it — moved to `ChartToolbar` for the builder, because
   * §A7 puts freshness and the way to act on it in the row above the plot
   * rather than between the plot and its chrome. The builder therefore passes
   * `false` and gets exactly one of each.
   *
   * A **dashboard tile has no toolbar** and still owes its reader the instant
   * its numbers were computed, so the default is `true`.
   *
   * **There is no second prop for the button.** There was one — `withRefresh`,
   * defaulting `false` — and no caller ever passed it, so every dashboard tile
   * stated a freshness with no way to act on it and P3 was false on every board
   * in the product. The two are one decision: *does this caller draw the
   * freshness line here?* A caller that does has a reader who can read *"Showing
   * the previous run"* and no way to change it, which is the state the sentence
   * exists to let them leave. `DashboardTile` passes `onRetry={tileData.refetch}`
   * — a real refetch that was already wired for the error branch — so the
   * control was one flag away from working the whole time.
   */
  withMeta?: boolean
  /**
   * **Writes the CSV for the table beneath the picture.**
   *
   * Only ever reached when `withTable` is on, and only ever passed by the
   * builder — `ReportBuilder.exportCsv`, the same call the page overflow's
   * `Export CSV` makes, so the file the header-row button writes and the file
   * the menu writes are one function rather than two that agree today. Absent
   * by default: §A11 puts the export **beside the thing it exports**, and an
   * `Export CSV` button with no exporter behind it is a dead affordance.
   */
  onExport?: (() => void) | undefined
  /**
   * **Whether the panels draw their own frames.** `true` by default, because a
   * panel is the outermost surface wherever this canvas is the page.
   *
   * `DashboardTile` is itself a `Card`, so it passes `false` and the panels
   * render flush inside the tile's one frame. This replaces a structural
   * selector the tile used to carry (`[&_[data-slot=card]]:border-0` and
   * friends), which reached into `PanelCard`'s internals from the outside and
   * would have broken silently the day that markup moved.
   */
  framed?: boolean
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
  viewKey,
  annotations = [],
  canAnnotate = false,
  onSaveAnnotation,
  onRetry,
  onRetrySeries,
  withTable = false,
  withMeta = true,
  onExport,
  framed = true,
  noDataSentence,
  t,
  language,
}: ResultCanvasProps) {
  return (
    /* The canvas scrolls, the panel does not move. A split by district is
       twelve panels; without this the ninth is below the fold with no way to
       reach it, because the shell's content region is height-constrained.

       `@container` — the small-multiples grid below asks THIS box how wide it
       is, because nothing else can know. See `Body`. */
    <section
      aria-label={t('rb.canvas.heading')}
      className="@container flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto"
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
          {withMeta && (
            <Meta result={result} stale={stale} onRetry={onRetry} t={t} language={language} />
          )}
          <Conditions result={result} t={t} />
          <Body
            result={result}
            measuresByKey={measuresByKey}
            coercedFrom={coercedFrom}
            effectiveChartType={effectiveChartType}
            viewKey={viewKey ?? serialiseReportQuery(result.query)}
            annotations={annotations}
            canAnnotate={canAnnotate}
            onSaveAnnotation={onSaveAnnotation}
            onRetrySeries={onRetrySeries}
            combinedTable={withTable}
            framed={framed}
            noDataSentence={noDataSentence}
            t={t}
            language={language}
          />
          {/* **A picture and its numbers, never one or the other.** The table
              used to be a *chart type* — asking for it replaced the panels, so
              reading an exact value meant giving up the shape and reading the
              shape meant giving up the value. Both are the same run, from the
              same `ReportResult`, so nothing is re-requested and the two cannot
              disagree.

              **No row checkboxes.** Series membership is decided by `panelId`
              on the wire; letting the table hide a series would make the
              picture disagree with the question that produced it. */}
          {withTable && result.panels.length > 0 && (
            <NumbersBehind
              result={result}
              onExport={onExport}
              measuresByKey={measuresByKey}
              t={t}
              language={language}
            />
          )}
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
  onRetry,
  t,
  language,
}: {
  result: ReportResult
  stale: boolean
  /**
   * The caller's re-run. Not optional and not nullable: this block renders only
   * under `withMeta`, and `withMeta` is the caller saying *I draw the freshness
   * here* — which is the same caller that owes the reader a way to act on it.
   */
  onRetry: () => void
  t: Translator
  language: Language
}) {
  const time = formatDate(result.asOf, { style: 'day-month-time', language })
  return (
    /* **Freshness and the way to change it, in one control.** Reading *when*
       this was computed and deciding it is too old are one thought; sending
       the operator back to the rail's `Run` to act on it puts the answer and
       the remedy on opposite sides of the screen.

       The sentence keeps its own `role="status"` — the live region is the
       claim about the numbers, and wrapping the button in it would announce a
       button label every time the query goes dirty. Ghost, `xs`: R3 leaves the
       one primary on the rail.

       **Unconditional.** The button used to be gated on a second prop that
       nothing passed, so the sentence shipped alone on every dashboard tile in
       the product. A freshness line with no refresh is P3 stated and not kept:
       it tells a reader the number may be old and leaves them nothing to do
       about it. The two render together or neither does. */
    <div className="flex flex-wrap items-center gap-2">
      <p role={stale ? 'status' : undefined} className="text-xs text-muted-foreground">
        {stale ? t('rb.canvas.stale', { time }) : t('rb.canvas.asOf', { time })}
      </p>
      <Button type="button" variant="ghost" size="xs" onClick={onRetry}>
        {t('rb.canvas.error.retry')}
      </Button>
    </div>
  )
}

/**
 * The table under the picture. A heading rather than a bare table, because it
 * is a second reading of the same run and an unlabelled table below a chart
 * reads as a different result.
 */
function NumbersBehind({
  result,
  onExport,
  measuresByKey,
  t,
  language,
}: {
  result: ReportResult
  onExport: (() => void) | undefined
  /**
   * §A11's trailing summary column reads `Measure.bucketAggregate` from this —
   * the canvas already holds the catalogue for the panels, so the table gets
   * the same objects rather than a second lookup that could disagree.
   */
  measuresByKey: Readonly<Record<string, Measure>>
  t: Translator
  language: Language
}) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="text-sm font-medium text-foreground">
        {t('rb.canvas.table.heading')}
      </h3>
      {/* **`chrome` unconditionally, because this subtree IS the opt-in.**
          `NumbersBehind` renders only under `withTable`, and the only caller
          that asks for the table is the builder — the workspace §A11 describes,
          where a search, a sort and an export belong. A dashboard tile pinned as
          a table takes the other path through `Body` and gets the bare table it
          has always had, so the chrome cannot leak onto a board.

          The export is the caller's, not this component's: `ResultTable` draws
          the button only when a handler arrives, so the affordance and the thing
          behind it ship together or not at all. */}
      <ResultTable
        result={result}
        chrome
        onExport={onExport}
        measuresByKey={measuresByKey}
        t={t}
        language={language}
      />
    </section>
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
  viewKey,
  annotations,
  canAnnotate,
  onSaveAnnotation,
  onRetrySeries,
  combinedTable,
  framed,
  noDataSentence,
  t,
  language,
}: {
  result: ReportResult
  measuresByKey: Readonly<Record<string, Measure>>
  coercedFrom: string | null
  effectiveChartType: ChartType
  viewKey: string
  annotations: readonly Annotation[]
  canAnnotate: boolean
  onSaveAnnotation: ((input: { date: string; label: string; kind: AnnotationKind; note: string }) => Promise<void>) | undefined
  onRetrySeries: (measureKey: string) => void
  /**
   * The caller renders the table itself, beneath this body (see `withTable`) —
   * **and it is the builder-versus-tile signal**, which is why §A12's related
   * strip rides on it. Only the builder asks for the workspace, and a strip of
   * navigation cards under every panel of a nine-tile board is eighteen links
   * nobody asked for. One signal, so the two cannot disagree about which caller
   * this is.
   */
  combinedTable: boolean
  /** `false` inside a caller that already drew the frame. See `ResultCanvasProps`. */
  framed: boolean
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
      /* Framed like a panel, and unframed for the same caller — a tile that
         resolved to nothing draws one hairline, not two. */
      <PanelFrame framed={framed} className="w-full">
        <CardHeader>
          <CardTitle>{t('rb.canvas.heading')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-10 text-center text-sm text-muted-foreground">{noDataSentence}</p>
        </CardContent>
      </PanelFrame>
    )
  }

  /* §4.1 — `kpi` is not Recharts and is never a small multiple: legality
     (`plan.ts`) caps it at one panel, no split, no segments, so it renders
     once regardless of grain and never reaches the `grain === 'none'`
     distribution branch below or the compound-plot branch further down. */
  if (effectiveChartType === 'kpi') {
    const panel = result.panels[0]
    if (panel === undefined) {
      return (
        <PanelFrame framed={framed} className="w-full">
          <CardContent>
            <p className="py-10 text-center text-sm text-muted-foreground">{noDataSentence}</p>
          </CardContent>
        </PanelFrame>
      )
    }
    const title = panelTitle(panel, t).text
    return (
      <KpiCard
        panel={panel}
        result={result}
        measure={measureOf(panel.panelId)}
        title={title}
        unit={panel.unit}
        currency={panel.currency}
        framed={framed}
        t={t}
        language={language}
      />
    )
  }

  /* **`table` is no longer an early return for the builder.** It used to
     render `ResultTable` INSTEAD of the panels, which made the numbers and the
     picture mutually exclusive — ask for the table and you lose the shape, ask
     for the shape and you lose the value. A caller that renders the table
     itself (`withTable`) therefore falls through: `table` only decides that the
     panels are drawn as lines, and the numbers are beneath them either way.

     A caller that does NOT — a dashboard tile — keeps the old rendering
     exactly, because a tile pinned as a table is a table and thirty columns of
     numbers under a chart is not a tile. */
  if (effectiveChartType === 'table' && !combinedTable) {
    /* No `chrome` — a search box and an export button inside a 300px tile is
       chrome competing with the reading it frames. **The summary column is not
       chrome**: it is a reading, and it is the one a tile has the least room to
       work out by eye across thirty columns, so the catalogue goes in here too. */
    return (
      <ResultTable result={result} measuresByKey={measuresByKey} t={t} language={language} />
    )
  }

  /* A single bucket is a distribution, not a set of axes. See the file header.
     `horizontal-bar` is the one exception (§4.1): its own legality REQUIRES
     `grain: 'none'`, and its shape is a `SeriesChart` branch, not `DistributionCard`. */
  if (result.query.grain === 'none' && effectiveChartType !== 'horizontal-bar') {
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
            framed={framed}
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
            framed={framed}
            t={t}
            language={language}
          />
        )}
      </div>
    )
  }

  /**
   * **One plot, every series in it** — the small-multiples grid is gone.
   *
   * This used to map `result.panels` to one `PanelCard` each and lay them out
   * two across. The business owner's sentence retired it: *"compound charts
   * that compare those data to each other not every one in it's own chart"*.
   * The defect that sentence names is real and specific — six districts drew
   * six charts, each auto-scaled to its own maximum, so a district with 40
   * rides and one with 4,000 produced **the same shaped line at the same
   * height**, and the comparison the split exists to make was the one thing the
   * picture could not show.
   *
   * ## Panels still decide what may share an axis
   *
   * A `ReportPanel` is *"a y-axis … the reason two measures cannot silently
   * share a scale"*. So the grouping here is by `(unit, currency)` — two thirds
   * of the triple `pairRefusal` uses to decide whether two numbers may be
   * combined at all — and each group gets one plot with one axis.
   *
   * For the case that matters this is exactly one group: a split by district is
   * one measure over N groups, every panel carrying the same unit. Two measures
   * in different units still get two plots, and that is the correct answer
   * rather than a limitation — halalas and a count on one axis is the
   * fabrication this whole module is built to refuse.
   *
   * ## The numbers are above the plot
   *
   * `SeriesHeadlines` renders one figure per series, dot-coloured to match its
   * line. That mapping is the entire justification for a compound chart: it is
   * what lets a reader tie a number to a curve without counting legend rows.
   *
   * ## A series that cannot be drawn is not folded into the plot
   *
   * A blocked or failed series has no points and its own thing to say — a
   * permission to ask for, or a retry. Those keep their `PanelCard`, above the
   * plot, exactly as they were: dropping them into the compound chart would
   * draw a redacted series as a flat line at zero, which is §13.1's silent
   * redaction wearing a nicer picture.
   *
   * ## AC-844 — a group that resolved to nothing says so, and this was a
   * regression
   *
   * `PanelCard` carries the branch `!current || current.points.every(p => p ===
   * null)` → `noDataSentence`, and the first version of this rewrite dropped it
   * on the floor: replacing the per-panel `PanelCard` mapping with
   * `SeriesHeadlines` + `SeriesChart` left neither of them with an all-null
   * case. Measured on an absolute window outside every store's coverage, the
   * builder rendered **an em dash and an empty plot** and said nothing about
   * why — and `Body` is shared, so every dashboard tile did too.
   *
   * `result.panels.length === 0` was not the safety net it looked like: the
   * runner emits a panel for every chosen measure whether or not the window
   * holds a reading, so that branch is not the empty state an operator actually
   * reaches.
   *
   * The check is **per axis group, not per series**, and that is the one place
   * it differs from `PanelCard`. One empty series beside four full ones still
   * draws the plot — its em dash is legible *because* the others give it a
   * scale, which is the whole argument for putting them on one axis. It is only
   * when nothing in the group carries a reading that the picture is empty and
   * the sentence is the honest rendering of it.
   *
   * ## §P4's datapoint click-through is NOT here, and that is a ruling
   *
   * `PanelChart` lets a click on a plotted mark activate the anchor to the
   * board that displays the measure. It is deliberately absent from the
   * compound plot, because the question it answers has no single answer:
   * **on a plot of six series, whose board does a click open?** The tooltip is
   * axis-shared — it resolves from the pointer's x against the category axis,
   * not from hovering one mark — so the datum under the cursor is *a bucket*,
   * not *a series*, and there is nothing for the click to disambiguate on.
   *
   * §A12's strip below the plot is what replaces it: one anchor per board,
   * deduplicated across the series, in the tab order, with a real destination
   * in the status bar before the click. The affordance is kept; only the
   * shortcut is gone. It survives untouched on dashboard tiles, on blocked legs
   * and on failed legs, all of which still render a `PanelCard`.
   *
   * Named here rather than left silent so the next reader knows this was
   * decided. Restoring it for the single-series case is defensible and is the
   * open question; product-designer's ruling, not this file's.
   */
  const drawable = result.panels.filter((panel) => {
    const series = result.series.find((s) => s.panelId === panel.panelId && s.role === 'current')
    return !(series?.blocked || series?.failed)
  })
  const undrawable = result.panels.filter((panel) => !drawable.includes(panel))

  /* Grouped by what may share an axis, in first-appearance order so the first
     group is always the first measure the operator chose. The palette index is
     the panel's position in `result.panels` — the result's own documented draw
     order — so a second unit group does not restart at the brand colour and
     claim to be the first series. */
  const axisGroups = new Map<
    string,
    { unit: MetricUnit; currency: CurrencyCode | null; panels: ReportPanel[]; colorIndexes: number[] }
  >()
  drawable.forEach((panel) => {
    const key = `${panel.unit}|${panel.currency ?? ''}`
    const group = axisGroups.get(key) ?? {
      unit: panel.unit,
      currency: panel.currency,
      panels: [] as ReportPanel[],
      colorIndexes: [] as number[],
    }
    group.panels.push(panel)
    group.colorIndexes.push(result.panels.indexOf(panel))
    axisGroups.set(key, group)
  })

  return (
    <div className="flex flex-col gap-3">
      {undrawable.map((panel) => (
        <PanelCard
          key={panel.panelId}
          panel={panel}
          result={result}
          measure={measureOf(panel.panelId)}
          kind={effectiveChartType === 'bar' ? 'bar' : 'line'}
          coercedFrom={null}
          onRetrySeries={onRetrySeries}
          framed={framed}
          noDataSentence={noDataSentence}
          t={t}
          language={language}
        />
      ))}

      {[...axisGroups.entries()].map(([key, group]) => {
        const titles = group.panels.map((panel) => panelTitle(panel, t).text)

        /* **AC-844.** `0` inside coverage is a reading; `null` is a gap. A group
           where every series is gaps end to end has no picture to draw, and an
           em dash over an empty plot is not the same claim as *nothing was
           found for this range*. See the header for the regression this is. */
        const empty = !group.panels.some((panel) =>
          result.series.some(
            (series) =>
              series.panelId === panel.panelId &&
              series.role === 'current' &&
              series.points.some((point) => point !== null && point !== undefined),
          ),
        )

        /**
         * **§A12's strip, deduplicated across the plot rather than repeated per
         * series.**
         *
         * It used to hang off each `PanelCard`, which was right when a split
         * by district drew six cards — six strips, six copies of the same
         * board. One plot gets one strip, and a board named by two of its
         * series appears once.
         *
         * `relatedBoards` resolves a measure's `displayedAsMetricKeys` against
         * the real route table and drops anything that names no route, so this
         * can never offer a destination that does not exist. An empty
         * `displayedAsMetricKeys` **is a claim** (`measure.ts:281–291`) and the
         * honest rendering of it is no strip, never a dead card.
         *
         * The builder only (`combinedTable`): a strip of navigation cards under
         * every plot of a nine-tile board is links nobody asked for.
         */
        const boards: RelatedBoard[] = []
        if (combinedTable) {
          const seen = new Set<string>()
          for (const panel of group.panels) {
            for (const board of relatedBoards(measureOf(panel.panelId))) {
              if (seen.has(board.subTabId)) continue
              seen.add(board.subTabId)
              boards.push(board)
            }
          }
        }

        return (
          /* **P1-8 — one boundary per plot**, so one axis failing inside
             recharts does not take the other down with it. Carded, because the
             boundary replaces the whole card here rather than its body. */
          <ErrorBoundary key={key} scope="card" t={t}>
            <PanelFrame framed={framed} className="w-full">
              <CardContent className="flex flex-col gap-3 px-3">
                {empty ? (
                  /* §3.7's sentence, the metric boards' own string, passed in
                     so it stays byte-identical with every board. Framed like a
                     panel, because a group that resolved to nothing is still
                     one answer and draws one hairline. */
                  <>
                    <p className="text-sm font-medium text-foreground">
                      <bdi>{titles.join(', ')}</bdi>
                    </p>
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      {noDataSentence}
                    </p>
                  </>
                ) : (
                <>
                {/* **The planner refused the shape and drew another one, and
                    that is stated on the plot it changed.** It used to sit
                    inside each `PanelCard`; with one plot per axis it belongs
                    once, above that plot, rather than repeated per series. */}
                {coercedFrom !== null && (
                  <p className="text-xs text-muted-foreground">
                    {t('rb.warning.chartCoerced', {
                      chartType: t(`rb.chartType.${drawKindFor(effectiveChartType)}`),
                      requested: t(`rb.chartType.${coercedFrom}`),
                    })}
                  </p>
                )}
                <TrendPlotGroup
                  group={group}
                  result={result}
                  measuresByKey={measuresByKey}
                  titles={titles}
                  effectiveChartType={effectiveChartType}
                  combinedTable={combinedTable}
                  viewKey={viewKey}
                  annotations={annotations}
                  canAnnotate={canAnnotate}
                  onSaveAnnotation={onSaveAnnotation}
                  t={t}
                  language={language}
                />
                </>
                )}
                {boards.length > 0 && <RelatedBoards boards={boards} t={t} />}
              </CardContent>
            </PanelFrame>
          </ErrorBoundary>
        )
      })}
    </div>
  )
}

/** The v2 shape (`SeriesChart.tsx`) each `ChartType` draws as — `kpi` is `KpiCard`'s alone (§4.1). */
function drawKindFor(chartType: ChartType): SeriesChartKind {
  switch (chartType) {
    case 'area':
      return 'area'
    case 'stacked-bar':
      return 'stacked-bar'
    case 'stacked-100':
      return 'stacked-100'
    case 'horizontal-bar':
      return 'horizontal-bar'
    case 'bar':
      return 'bar'
    default:
      return 'line'
  }
}

/**
 * §2 — one axis group's plot, owning the hooks a `.map` callback cannot
 * (`useChartView`, the brush's local zoom). Composes the controls row
 * (§2's slim row: zoom chip, `Add annotation`, `View` menu), the headline
 * row, the plot itself, the button legend and the inline annotation form.
 */
function TrendPlotGroup({
  group,
  result,
  measuresByKey,
  titles,
  effectiveChartType,
  combinedTable,
  viewKey,
  annotations,
  canAnnotate,
  onSaveAnnotation,
  t,
  language,
}: {
  group: { unit: MetricUnit; currency: CurrencyCode | null; panels: ReportPanel[]; colorIndexes: number[] }
  result: ReportResult
  measuresByKey: Readonly<Record<string, Measure>>
  titles: readonly string[]
  effectiveChartType: ChartType
  combinedTable: boolean
  viewKey: string
  annotations: readonly Annotation[]
  canAnnotate: boolean
  onSaveAnnotation: ((input: { date: string; label: string; kind: AnnotationKind; note: string }) => Promise<void>) | undefined
  t: Translator
  language: Language
}) {
  const drawKind = drawKindFor(effectiveChartType)
  const groupKey = `${viewKey}#${group.unit}|${group.currency ?? ''}`
  const { view, setYScale, setYStartAtZero, setDataLabels, setShowTable, toggleHidden, isolate, showAll } =
    useChartView(groupKey, effectiveChartType)
  const [brushRange, setBrushRange] = useState<{ startIndex: number; endIndex: number } | null>(null)
  const [addingAnnotation, setAddingAnnotation] = useState(false)

  const hasComparison = result.query.periodComparison !== 'none' && group.panels.length <= 2
  const everyDrawnId = [...group.panels.map((p) => p.panelId), ...(hasComparison ? [COMPARISON_SERIES_ID] : [])]

  /* §2.3 — the log-axis refusal is computed HERE, against resolved values,
     over the currently VISIBLE (non-hidden) series only. */
  const visibleSeries = group.panels
    .filter((p) => !view.hidden.includes(p.panelId))
    .flatMap((p) => {
      const current = result.series.find((s) => s.panelId === p.panelId && s.role === 'current')
      const comparison =
        hasComparison && !view.hidden.includes(COMPARISON_SERIES_ID)
          ? result.series.find((s) => s.panelId === p.panelId && s.role === 'comparison')
          : undefined
      return [current, comparison].filter((s): s is ReportSeries => s !== undefined)
    })
  const hasNonPositive = visibleSeries.some((s) => s.points.some((v) => v !== null && v <= 0))
  const allGaps = visibleSeries.length > 0 && visibleSeries.every((s) => s.points.every((v) => v === null))
  const logDisabled = visibleSeries.length === 0 || hasNonPositive || allGaps

  const visibleSeriesCount = group.panels.filter((p) => !view.hidden.includes(p.panelId)).length
  const dataLabelsDisabled = result.buckets.length * visibleSeriesCount > 60

  const zoomed = brushRange !== null

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label={t('rb.chart.controlsRow')} className="flex flex-wrap items-center justify-end gap-2">
        {zoomed && (
          <Button
            type="button"
            variant="secondary"
            size="xs"
            className="me-auto"
            onClick={() => setBrushRange(null)}
          >
            {t('rb.chart.zoomed.reset')}
          </Button>
        )}
        {canAnnotate && onSaveAnnotation && (
          <Button type="button" variant="ghost" size="xs" onClick={() => setAddingAnnotation((v) => !v)}>
            {t('rb.chart.addAnnotation')}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="secondary" size="xs">
              {t('rb.view.menu')}
              <ChevronDownIcon aria-hidden="true" className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              checked={view.yScale === 'log'}
              disabled={logDisabled}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) => setYScale(checked ? 'log' : 'linear')}
            >
              <span className="flex flex-col items-start gap-0.5">
                <span>{t('rb.view.log')}</span>
                {logDisabled && (
                  <span className="text-xs text-muted-foreground">{t('rb.view.logNeedsPositive')}</span>
                )}
              </span>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={view.yStartAtZero}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) => setYStartAtZero(checked)}
            >
              {t('rb.view.startAtZero')}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={view.dataLabels}
              disabled={dataLabelsDisabled}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) => setDataLabels(checked)}
            >
              <span className="flex flex-col items-start gap-0.5">
                <span>{t('rb.view.dataLabels')}</span>
                {dataLabelsDisabled && (
                  <span className="text-xs text-muted-foreground">
                    {t('rb.view.dataLabels.disabled', { count: result.buckets.length * visibleSeriesCount })}
                  </span>
                )}
              </span>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={view.showTable}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(checked) => setShowTable(checked)}
            >
              {t('rb.view.showTable')}
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SeriesHeadlines
        panels={group.panels}
        result={result}
        titles={titles}
        colorIndexes={group.colorIndexes}
        measuresByKey={measuresByKey}
        unit={group.unit}
        currency={group.currency}
        t={t}
        language={language}
      />
      <SeriesChart
        panels={group.panels}
        result={result}
        kind={drawKind}
        unit={group.unit}
        description={titles.join(', ')}
        titles={titles}
        colorIndexes={group.colorIndexes}
        hidden={view.hidden}
        yScale={logDisabled ? 'linear' : view.yScale}
        yStartAtZero={view.yStartAtZero}
        dataLabels={!dataLabelsDisabled && view.dataLabels}
        annotations={annotations}
        brushRange={brushRange}
        onBrushChange={setBrushRange}
        heightClass={combinedTable ? 'h-80' : 'h-56'}
        t={t}
        language={language}
      />
      <SeriesLegend
        panels={group.panels}
        titles={titles}
        colorIndexes={group.colorIndexes}
        hasComparison={hasComparison}
        hidden={view.hidden}
        onToggle={(id) => toggleHidden(id)}
        onToggleComparison={() => toggleHidden(COMPARISON_SERIES_ID)}
        onIsolate={(id) => isolate([id], everyDrawnId)}
        onShowAll={showAll}
        t={t}
      />
      {addingAnnotation && onSaveAnnotation && (
        <AnnotationForm
          t={t}
          onCancel={() => setAddingAnnotation(false)}
          onSubmit={async (input) => {
            await onSaveAnnotation(input)
            setAddingAnnotation(false)
          }}
        />
      )}
      {view.showTable && (
        <ResultTable result={result} measuresByKey={measuresByKey} t={t} language={language} />
      )}
    </div>
  )
}

/**
 * §2.1 — the legend as real `<button>`s (AC-1138): clicking one toggles its
 * series into `ChartView.hidden`, struck through but still named — the
 * picture never lies about what was asked. A kebab per entry isolates it
 * (AC-1139); the comparison entry toggles as one unit (AC-1140).
 */
function SeriesLegend({
  panels,
  titles,
  colorIndexes,
  hasComparison,
  hidden,
  onToggle,
  onToggleComparison,
  onIsolate,
  onShowAll,
  t,
}: {
  panels: readonly ReportPanel[]
  titles: readonly string[]
  colorIndexes: readonly number[]
  hasComparison: boolean
  hidden: readonly string[]
  onToggle: (panelId: string) => void
  onToggleComparison: () => void
  onIsolate: (panelId: string) => void
  onShowAll: () => void
  t: Translator
}) {
  if (panels.length < 2 && !hasComparison) return null
  const anyHidden = hidden.length > 0

  return (
    <ul role="list" className="flex list-none flex-wrap items-center justify-center gap-x-4 gap-y-1">
      {panels.map((panel, index) => {
        const isHidden = hidden.includes(panel.panelId)
        return (
          <li key={panel.panelId} className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              aria-pressed={!isHidden}
              onClick={() => onToggle(panel.panelId)}
              className="flex min-w-0 items-center gap-1.5 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Swatch
                color={seriesColor(colorIndexes[index] ?? index)}
                dash={seriesDash(colorIndexes[index] ?? index)}
              />
              <span
                className={`min-w-0 truncate text-xs ${isHidden ? 'text-muted-foreground line-through opacity-70' : 'text-muted-foreground'}`}
              >
                <bdi>{titles[index] ?? ''}</bdi>
              </span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('rb.legend.isolate')}
                  className="text-muted-foreground"
                >
                  <MoreIcon aria-hidden="true" className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => onIsolate(panel.panelId)}>
                  {t('rb.legend.isolate')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        )
      })}
      {hasComparison && (
        <li className="flex items-center gap-1.5">
          <button
            type="button"
            aria-pressed={!hidden.includes(COMPARISON_SERIES_ID)}
            onClick={onToggleComparison}
            className="flex items-center gap-1.5 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Swatch color="var(--chart-axis)" dash="4 3" />
            <span
              className={`text-xs ${hidden.includes(COMPARISON_SERIES_ID) ? 'text-muted-foreground line-through opacity-70' : 'text-muted-foreground'}`}
            >
              <bdi>{t('rb.panel.legend.previous')}</bdi>
            </span>
          </button>
        </li>
      )}
      {anyHidden && (
        <li>
          <Button type="button" variant="link" size="xs" onClick={onShowAll}>
            {t('rb.legend.showAll')}
          </Button>
        </li>
      )}
    </ul>
  )
}

/**
 * The line swatch, drawn with **the plot's own dash array** rather than a
 * boolean — there are two different patterns in play and they mean different
 * things: `4 3` is the previous period (§3.7), `1 3` is a series on the
 * palette's second lap (`seriesDash`). A boolean could only carry one.
 *
 * SVG rather than a bordered element so the rhythm matches the plot exactly; a
 * CSS dashed border and an SVG dash array do not produce the same pattern.
 */
function Swatch({ color, dash }: { color: string; dash?: string | undefined }) {
  return (
    <svg aria-hidden="true" width="14" height="8" viewBox="0 0 14 8" className="shrink-0">
      <line x1="0" y1="4" x2="14" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dash} />
    </svg>
  )
}
