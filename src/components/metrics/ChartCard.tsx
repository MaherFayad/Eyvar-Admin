/**
 * The §3.7 chart card, and **the place the kinds of "no data" are kept apart**.
 *
 * ```
 *  ┌──────────────────────────────────────────────────────┐
 *  │ Revenue                                           ↗  │  title + report link
 *  │ Computed 25 Jun 09:14                                │  fact 2 — this card's asOf
 *  │ ─────────────────────────────────────────────────    │
 *  │ No reading on 2 of 7 days.                            │  a GAP, said in words
 *  │            ╱╲      ╱                                  │
 *  │  ╱╲    ╱╲╱   ╲   ╱                                    │
 *  │ ─────────────────────────────────────────────────    │
 *  │ ▬ 19 – 25 Jun    ┄ 12 – 18 Jun                        │  legend, both periods
 *  └──────────────────────────────────────────────────────┘
 * ```
 *
 * ## The four states of a window, and why none may borrow another's rendering
 *
 * `SeriesWindow`'s own doc comment draws the line and this component is where
 * it becomes pixels:
 *
 * | Window | Means | Renders as |
 * |---|---|---|
 * | `points: []` | **no data for this range at all** | §3.7's one centred grey sentence; card, title and report link kept |
 * | some `value: null` | **a gap** — the day is in the range and has no reading | the line BREAKS, and the gaps are counted in a sentence |
 * | every `value: null` | we know the days and have no readings for any of them | the same gap sentence, at full count — not the no-data sentence, because we know which days are missing |
 * | every `value: 0` | the measurement ran and the answer was **zero** | a flat baseline plus "every value in this range is zero" |
 *
 * and a fifth, on the comparison side: `comparison: null` — there is no
 * comparison period. The legend chip does not disappear; it says so.
 *
 * **Collapsing all-zero into no-data is the defect this table exists to
 * prevent.** A week with zero incidents is the best week Support has had;
 * telling them the data is missing hides a good result behind an error-shaped
 * sentence, and they will go looking for a broken pipeline that is working.
 *
 * Rules applied
 *   §3.7        title, report link, plot, legend — in that order. The legend
 *               names BOTH periods explicitly with dates.
 *   §3.7        the no-data sentence is identical everywhere including its
 *               trailing period; it is one copy key, used once.
 *   R8          an empty card gets **one grey sentence**, never the first-run
 *               illustration — a chart with no data does not mean the resource
 *               has never existed.
 *   §11.2/V8    a card that FAILED is not this component's job: `ErrorState`
 *               `scope="card"` renders that, with a required retry. Empty is
 *               not error and they do not share a shape.
 *   §7.2        the report link is an `<a>` with a visible ring and an
 *               accessible name; the `↗` is a mark and is hidden.
 *   §9.2        the card mirrors. The PLOT does not — see `TrendChart`.
 */

import { ArrowUpRightIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { TrendChart } from './TrendChart'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PLAIN_FRAME, PLAIN_FRAME_SLOT } from './Chapter'
import { formatDate, type Language, type Translate } from '@/lib'
import type { Metric, SeriesWindow, TimeSeries } from '@/data/types'
import { seriesWindowTotal, splitMetricValue } from './formatMetric'

export interface ChartCardProps {
  series: TimeSeries
  /**
   * §3.7's report icon target. `TimeSeries` carries no route of its own, so the
   * board passes the `drilldownRoute` of the metric with the same key — which
   * is the surface that owns the number, by definition.
   */
  reportHref: string | null
  /**
   * Whether the panel draws its own box. `card` is the default and is what
   * every surface outside a metric board wants; `plain` drops the border, the
   * fill, the shadow and the padding, and is what a board passes — see
   * `PLAIN_FRAME`.
   */
  frame?: 'card' | 'plain'
  /**
   * **The number this chart is the shape of**, stated above the plot.
   *
   * The board passes the `Metric` with the same key — the figure that owns this
   * measure, by definition, and the one whose `drilldownRoute` already fills
   * `reportHref`. So the headline and the plot cannot disagree: they are one
   * number and its history, not two reads of a series.
   *
   * `null` when the series has no figure beside it, which is a real case — a
   * board may chart something it does not tile. The header then closes up and
   * the plot is the whole panel, exactly as it was before.
   *
   * **It is NOT derived from the series' own points.** A sum, a mean and a last
   * reading are three different numbers and only the measure knows which of
   * them it is; a chart that computed one would be a second definition of the
   * metric living in a component.
   */
  headline?: Metric | null
  t: Translate
  language: Language
}

export function ChartCard({
  series,
  reportHref,
  frame = 'card',
  headline = null,
  t,
  language,
}: ChartCardProps) {
  const title = t(`chart.${series.key}`)
  const plain = frame === 'plain'
  const seriesTotal = seriesWindowTotal(series)

  return (
    /* **The panel stretches and the PLOT takes the slack.** The two detail
       panels share a grid row, so the row is as tall as the taller of them —
       the ranked list — and a fixed-height plot left the chart's column ending
       160px short with page ground under it. The header and the legend keep
       their heights; everything left over goes to the plot, which is the one
       part of a chart that is better for being taller. */
    <Card className={cn('min-w-0', plain && cn(PLAIN_FRAME, 'h-full'))}>
      <CardHeader className={cn(plain && PLAIN_FRAME_SLOT)}>
        <CardTitle>{title}</CardTitle>
        {/* **The headline, between the title and the plot.** A chart's title
            says what is being drawn and its plot says how it moved; without
            this line the panel never states WHERE THE MEASURE ENDED UP, which
            is the first thing a reader wants and the reason the reference puts
            a 28px numeral here. It is the same number as the figure of the same
            key further up the page, from the same object, so a reader who
            checks the two against each other finds them equal.

            `data-slot` and no hand-written tabular class, for the reason
            `MetricTile` gives: the guarantee is pinned in `@layer base` on the
            slot, and restating it at a call site free to omit it is the
            mechanism §H4 declines to rely on. `<bdi>` because a money value is
            two LTR runs the UBA reorders in an Arabic line. */}
        {!headline && seriesTotal !== null && (
          /* **The series' own window total**, for the eight charts no metric on
             their board owns. Same slot, same size and same anatomy as a
             metric headline — a reader must not have to know which of the two
             produced the number in front of them. See `TimeSeries.windowTotal`
             for why the rule is declared and the number derived. */
          <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span data-slot="metric-value" className="text-kpi font-semibold text-foreground">
              <bdi>{splitMetricValue(seriesTotal, series.unit, series.currency, language).value}</bdi>
            </span>
            {splitMetricValue(seriesTotal, series.unit, series.currency, language).unit && (
              <span className="text-2xs text-muted-foreground">
                {splitMetricValue(seriesTotal, series.unit, series.currency, language).unit}
              </span>
            )}
          </span>
        )}
        {headline && (
          <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span data-slot="metric-value" className="text-kpi font-semibold text-foreground">
              <bdi>
                {splitMetricValue(headline.value, headline.unit, headline.currency, language).value}
              </bdi>
            </span>
            {splitMetricValue(headline.value, headline.unit, headline.currency, language).unit && (
              <span className="text-2xs text-muted-foreground">
                {splitMetricValue(headline.value, headline.unit, headline.currency, language).unit}
              </span>
            )}
            {headline.value !== null && headline.caption && (
              <span className="text-2xs text-muted-foreground">
                <bdi>{t(headline.caption)}</bdi>
              </span>
            )}
          </span>
        )}
        {/* Fact 2 — this card's own computation time, not the board's.
            **Not on a board.** The band at the top of the page already states
            when the board was computed, in the same words; repeating it under
            every chart title put a grey timestamp between the panel's number
            and its plot, which is the one place a reader's eye travels. A
            chart whose own `asOf` differs from the board's is the case this
            line exists for, and `MetricTile` already draws exactly that on the
            figure that owns the measure. */}
        {!plain && (
          <CardDescription>
            {t('overview.asOf', {
              time: formatDate(series.asOf, { style: 'day-month-time', language }),
            })}
          </CardDescription>
        )}
        {reportHref && (
          /* `CardAction`, not a bare div carrying the slot attribute: the slot
             is what switches `CardHeader` to `1fr auto`, and the COMPONENT also
             carries the grid placement — second column, spanning both rows —
             that puts the link beside the title instead of under it.

             **That placement used to be spelled out here, in backticks, and
             Tailwind emitted both rules into `dist` for no reason but this
             sentence.** v4 scans comments as plain text and has no idea what a
             comment is. Describe a utility; never spell it, and verify in
             `dist` rather than in `src`. `scratch/prose-class-leak.mjs` is the
             check that found these two. */
          <CardAction>
            <Link
              to={reportHref}
              aria-label={t('overview.report.open', { report: title })}
              className="inline-flex size-6 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {/* A mark. It points out of the card, not forwards through
                  prose, so it does not mirror (§9.5). */}
              <ArrowUpRightIcon aria-hidden="true" className="size-4" />
            </Link>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className={cn('min-w-0', plain && cn(PLAIN_FRAME_SLOT, 'flex min-h-0 flex-1 flex-col'))}>
        {/* **P1-8 — the panel-level boundary.** A plot is the pane most likely
            to throw on its own: recharts reaches into point shapes at render
            time, and a series that is legal to the type checker can still be
            illegal to a scale. The boundary is around the BODY only, so the
            card keeps its title, its as-of line and its report link — which is
            the difference between "this measure could not be drawn" and a
            board that lost eight cards to one bad point.

            `card={false}` because this already sits inside `Card`; the state
            owns the body, not a second box. */}
        <ErrorBoundary scope="card" card={false} t={t} name={title}>
          <Body series={series} fill={plain} t={t} language={language} />
        </ErrorBoundary>
      </CardContent>

      {series.current.points.length > 0 && (
        <CardFooter
          className={cn(
            'flex-wrap gap-x-4 gap-y-1.5',
            /* The footer's rule goes with the box. It divided the legend from
               the plot INSIDE a panel; with no panel it would be a hairline
               floating across the page under a chart, which reads as a section
               break rather than as part of the chart. The legend keeps its
               block padding so it does not sit on the axis labels. */
            plain && 'border-t-0 px-0 pt-1',
          )}
        >
          <Legend series={series} t={t} language={language} />
        </CardFooter>
      )}
    </Card>
  )
}

function Body({
  series,
  fill = false,
  t,
  language,
}: {
  series: TimeSeries
  /** Take the height the panel was given rather than a declared one. */
  fill?: boolean
  t: Translate
  language: Language
}) {
  const points = series.current.points

  /* No data for this range at all. §3.7 is exact: *"a chart with no data MUST
     keep its card, title, and report link, and MUST show one centred sentence
     — never an empty plot or a spinner"*, and the copy is identical
     everywhere, punctuation included. Not the first-run illustration (R8). */
  /**
   * **R5-11a §19.1 — the third absence, and it comes FIRST because it is the
   * strongest claim.**
   *
   * Three sentences, and conflating any two of them is the V-2 defect in a new
   * slot:
   *
   *   we queried; this range returned nothing      → `overview.noData`
   *   we plotted; every reading is a real zero     → `overview.allZero`
   *   **nothing is captured, so no query is possible** → `overview.notRecorded`
   *
   * All three arrive at a card with no line to draw, and which one is true is
   * **provenance** — which is why it takes a field rather than an inference.
   * `awaitingStore` is a **named store and a closed union**: a chart cannot
   * claim to be awaiting one without saying which, and `''` or `'TODO'` cannot
   * satisfy it. The store name is deliberately **not rendered** — it is an
   * engineering fact in an operator's register, nobody can act on it, and
   * R5-11's sentence is byte-identical wherever it appears, on AC-714's
   * footing, which interpolating a store name would break.
   *
   * **The card keeps its title.** A tile with no store does not render at all
   * (R4-11 §11.2) and a card does, and the asymmetry is structural: a tile has
   * no body and a card does. The heading names the measure truthfully whether
   * or not the data exists.
   */
  if (series.awaitingStore !== null) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">{t('overview.notRecorded')}</p>
    )
  }

  /* No data for THIS RANGE — the query ran and returned nothing. */
  if (points.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">{t('overview.noData')}</p>
  }

  /* The remaining states all draw a plot, because in all of them the
     measurement RAN. What differs is the sentence above it. */
  const gaps = points.filter((point) => point.value === null).length
  const allZero = points.every((point) => point.value === 0)

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', fill && 'min-h-0 flex-1')}>
      {allZero && <p className="text-xs text-muted-foreground">{t('overview.allZero')}</p>}
      {gaps > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('overview.gaps', { gaps: String(gaps), total: String(points.length) })}
        </p>
      )}
      <TrendChart
        series={series}
        fill={fill}
        t={t}
        language={language}
        description={t('overview.chart.description', {
          title: t(`chart.${series.key}`),
          from: formatDate(series.current.periodStart, { style: 'day-month', language }),
          to: formatDate(series.current.periodEnd, { style: 'day-month', language }),
        })}
      />
    </div>
  )
}

/**
 * §3.7's legend: *"two chips: a solid line swatch + the current period and a
 * dotted line swatch + the comparison period"*, each naming its period **with
 * dates**. Bottom of the card.
 *
 * When there is no comparison period the chip does not disappear — it says so.
 * A missing chip reads as a chart that forgot; a chip that says "no comparison
 * period yet" reads as a chart that knows. `TimeSeries.comparison` is `null`
 * for most of this dataset and the reason is on the record: the legacy app
 * holds one point in time (`:6979`).
 */
function Legend({
  series,
  t,
  language,
}: {
  series: TimeSeries
  t: Translate
  language: Language
}) {
  const range = (window: SeriesWindow) =>
    t('overview.legend.range', {
      from: formatDate(window.periodStart, { style: 'day-month', language }),
      to: formatDate(window.periodEnd, { style: 'day-month', language }),
    })

  return (
    <>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Swatch dashed={false} />
        {/* `<bdi>`: `19 Jun – 25 Jun` is a numeral run around a neutral en
            dash, and it reorders to `Jun – 25 Jun 19` in an Arabic paragraph
            without isolation. §9.2 — the numeral run does not mirror. */}
        <bdi>{range(series.current)}</bdi>
      </span>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Swatch dashed />
        <bdi>
          {series.comparison ? range(series.comparison) : t('overview.noCompare.no-history')}
        </bdi>
      </span>
    </>
  )
}

/**
 * The line swatch. **Same hue for both; the dash is the whole difference**
 * (§3.7). Drawn as an SVG rather than a bordered `<span>` so the dash pattern
 * matches the plot's `strokeDasharray` exactly — a CSS dashed border and an SVG
 * dash array do not produce the same rhythm, and a legend that does not match
 * its own line is worse than no legend.
 */
function Swatch({ dashed }: { dashed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="16"
      height="2"
      viewBox="0 0 16 2"
      className="shrink-0 overflow-visible"
    >
      <line
        x1="0"
        y1="1"
        x2="16"
        y2="1"
        stroke={dashed ? 'var(--chart-comparison)' : 'var(--chart-series)'}
        strokeWidth="1.5"
        strokeDasharray={dashed ? '4 3' : undefined}
      />
    </svg>
  )
}
