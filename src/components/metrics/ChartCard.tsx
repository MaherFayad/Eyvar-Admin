/**
 * The §3.7 chart card, and **the place the kinds of "no data" are kept apart**.
 *
 * ```
 *  ┌──────────────────────────────────────────────────────┐
 *  │ ▤ Revenue                                 ∿ riyals   │  measure glyph + title │ meta
 *  │ 19 Jun 2026 – 25 Jun 2026                            │  §E7's period sub-line
 *  │ 8,075.70 SAR  ↑ +57%                                 │  §3.7 value + delta
 *  │ Revenue is up 57% against 12 – 18 Jun.               │  §A8's derived read
 *  │ ─────────────────────────────────────────────────    │
 *  │ No reading on 2 of 7 days.                            │  a GAP, said in words
 *  │            ╱╲      ╱                                  │
 *  │  ╱╲    ╱╲╱   ╲   ╱                                    │
 *  │ ─────────────────────────────────────────────────    │
 *  │ ▬ 19 – 25 Jun  ┄ 12 – 18 Jun       Open analysis →   │  legend, both periods
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
 *   §3.7        title, report link, **value, delta**, plot, legend — in that
 *               order. The legend names BOTH periods explicitly with dates.
 *   §3.7        the delta is colour-coded AND carries a direction caret, and
 *               R4-5 is not contradicted — there is no badge. `MetricDelta`
 *               carries the whole argument.
 *   §A8         a number is never alone: the headline states a quantity, a
 *               delta and a derived one-sentence read of which way it went.
 *   §A9         **the legend names the unit the scale is in.** The axis has no
 *               gutter for a rotated title and §9.2 forbids giving the axis
 *               group a direction, so the measure is named in the legend row —
 *               which mirrors — rather than on the plot. See `unitNounKey`.
 *   §3.7        the no-data sentence is identical everywhere including its
 *               trailing period; it is one copy key, used once.
 *   R8          an empty card gets **one grey sentence**, never the first-run
 *               illustration — a chart with no data does not mean the resource
 *               has never existed.
 *   §11.2/V8    a card that FAILED is not this component's job: `ErrorState`
 *               `scope="card"` renders that, with a required retry. Empty is
 *               not error and they do not share a shape.
 *   §7.2        the report link is an `<a>` with a visible ring and an
 *               accessible name. **It is now NAMED rather than a corner glyph**
 *               (§E7): `Open analysis →` at the foot of the card, whose spoken
 *               name contains the visible words — see `OpenAnalysis`. The
 *               header's top-right is spent instead on the measure meta, which
 *               is what the reference puts there.
 *   §1.5        **two knowing departures, recorded rather than absorbed.** A
 *               measure glyph sits ON the card heading and a chart-type glyph
 *               sits in the card's corner meta; §1.5 forbids the first outright
 *               and does not contemplate the second. Both are lucide, one style,
 *               16px, `currentColor`, and both name the UNIT — never decoration.
 *               The owner has ruled the reference's anatomy takes priority; the
 *               amendment is on the record in the handoff.
 *   §9.5        one mark on this card mirrors and it is the `Open analysis`
 *               arrow, which points forward through reading. The delta caret
 *               does not — it encodes magnitude on the vertical axis — and
 *               neither does the plot.
 *   §9.2        the card mirrors. The PLOT does not — see `TrendChart`.
 */

import type { ReactNode } from 'react'
import {
  ChartIcon,
  CountIcon,
  DurationIcon,
  MoneyIcon,
  PercentIcon,
  RatingIcon,
  RatioIcon,
} from '@/components/icons'
import { TrendChart } from './TrendChart'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { InfoHint, hintLines } from '@/components/InfoHint'
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
import { MetricDelta, OpenAnalysis } from './MetricTile'
import { formatDate, isolatedRunProps, type Language, type Translate } from '@/lib'
import type { CurrencyCode, Metric, MetricUnit, SeriesWindow, TimeSeries } from '@/data/types'
import {
  seriesWindowDelta,
  seriesWindowTotal,
  splitMetricValue,
  trendRead,
} from './formatMetric'

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
  const facts = headlineFacts(series, headline)
  /* Whether this card draws a line at all — which decides whether the legend
     below exists, and so which end of the card names the scale. */
  const hasPlot = series.current.points.length > 0

  return (
    /* **The panel stretches and the PLOT takes the slack.** The two detail
       panels share a grid row, so the row is as tall as the taller of them —
       the ranked list — and a fixed-height plot left the chart's column ending
       160px short with page ground under it. The header and the legend keep
       their heights; everything left over goes to the plot, which is the one
       part of a chart that is better for being taller. */
    <Card className={cn('min-w-0', plain && cn(PLAIN_FRAME, 'h-full'))}>
      <CardHeader className={cn(plain && PLAIN_FRAME_SLOT)}>
        {/* **§E7 — the measure glyph beside the heading, and it is a knowing
            departure from §1.5.**

            §1.5's rule is *"MUST NOT put icons on table column headers, form
            labels, card headings, or page-header buttons"*, observed off a
            reference whose card headings are `Pricing`, `Notes`, `Customer` —
            nouns a reader already knows the shape of. An analytics board is the
            case that rule was not measured on: eight cards whose headings are
            all measures, differing in WHAT IS BEING COUNTED and in nothing
            else, and the glyph is the only mark that says *this one is money*
            before the numeral is read. The reference this board is now dressed
            from puts it here.

            **Recorded as a §1.5 amendment, not absorbed.** It is one set
            (lucide), one style, 16px, `currentColor`, and it is the unit —
            never decoration and never a second meaning. */}
        <CardTitle className="flex min-w-0 items-center gap-2">
          <MeasureIcon unit={series.unit} />
          <span className="min-w-0 truncate">{title}</span>
          {/* T9.9 / X15 — what the plot needs EXPLAINING sits beside its title
              and opens on demand: the scale's noun, and the days that carry no
              reading. What the plot needs SAYING stays under it — the derived
              read, and `overview.allZero`, which is a fact about the data. */}
          <InfoHint t={t}>{hintLines(chartNotes(series, t))}</InfoHint>
        </CardTitle>
        {/* **§E7's period sub-line, directly beneath the title.**

            The reference writes `Last 30 Days` — a PRESET, which is a name for
            a window rather than the window. This card has the resolved range
            and prints that instead: a preset goes stale against a board whose
            read was given explicit dates, and *"last 30 days"* under a plot
            covering seven is the kind of caption a reader trusts and should
            not. `overview.period` is the same key the band's own pill states
            its window with, so the two cannot word it differently.

            `<bdi>`: `19 – 25 Jun` is a numeral run around a bidi-neutral en
            dash and reorders in an Arabic line without isolation. */}
        <CardDescription>
          <bdi>
            {t('overview.period', {
              from: formatDate(series.current.periodStart, {
                style: 'day-month-year',
                language,
              }),
              to: formatDate(series.current.periodEnd, { style: 'day-month-year', language }),
            })}
          </bdi>
        </CardDescription>
        {/* **The headline, between the title and the plot — and it never
            stands alone.** A chart's title says what is being drawn and its
            plot says how it moved; without this line the panel never states
            WHERE THE MEASURE ENDED UP, which is the first thing a reader
            wants and the reason the reference puts a 28px numeral here.

            §3.7's anatomy is title, report link, **value, delta**, chart,
            legend — so the delta belongs on this baseline, not in the footer,
            and every branch below carries one or says in words why it cannot
            (AC-834). Under it, the derived read: the one sentence that turns
            a figure, a caret and a legend into a claim. See `headlineFacts`
            for where the two branches' numbers come from. */}
        {facts && <Headline facts={facts} title={title} t={t} language={language} />}
        {/* **The card's own `Computed …` line is GONE, and §E7's period sub-line
            above is what took its place.**

            It was already suppressed on a board — *"the band at the top of the
            page already states when the board was computed, in the same words;
            repeating it under every chart title put a grey timestamp between
            the panel's number and its plot, which is the one place a reader's
            eye travels"* — and the condition it was suppressed by was `plain`.
            §E7 gave the board's panels their card frames back, so that
            condition silently inverted and every board card grew the line the
            note exists to forbid.

            Rather than find a second flag for the same fact: the reference's
            card anatomy is title, period, content, and the slot under the title
            is the PERIOD's. A card that needs to state its own freshness has
            `MetricTile`'s rule available — a figure states its `asOf` only when
            it is STALER than the surface's own — and no caller wants an
            unconditional third grey line. */}
        {/* **§E7 / §C5 — the quiet meta at the card's top-right, naming the
            measure the scale is in.**

            The reference draws two labels here, the project and the measure
            (`📈 Uniques`). This product has one project, so it draws one thing:
            the chart type as a glyph and the unit as a word. It is the fact a
            reader needs before the plot means anything and it is currently only
            available at the FOOT of the card, in the legend, past the picture it
            explains.

            `CardAction`, not a bare div carrying the slot attribute: the slot
            is what switches `CardHeader` to two columns, and the COMPONENT also
            carries the grid placement — second column, spanning both rows —
            that puts this beside the title instead of under it.

            **That placement used to be spelled out here, in backticks, and
            Tailwind emitted both rules into `dist` for no reason but this
            sentence.** v4 scans comments as plain text and has no idea what a
            comment is. Describe a utility; never spell it, and verify in
            `dist` rather than in `src`. `scratch/prose-class-leak.mjs` is the
            check that found those two.

            The glyph is hidden and the noun is drawn, but what a screen reader
            gets is the whole sentence the legend already carries — `Measured in
            riyals`, not the bare word `riyals`, which on its own says nothing
            about what it is doing at the corner of a card. */}
        <CardAction>
          {/* **Hidden from a reader, in both of the two cases, and for two
              different reasons — which is why it is unconditional.**

              With a plot: the legend at the foot already carries the full
              sentence, `Measured in riyals`. This corner is a VISUAL
              restatement of it for someone scanning a grid of cards, and two
              announcements of one fact a dozen words apart is noise rather than
              redundancy.

              Without a plot: **there is no scale to name.** §A9's own test is
              that the card *"says nothing when there is no plot to put a scale
              under"*, and an empty card that announced its unit would be
              claiming a measurement it does not have. The word stays on screen
              because the reference's card keeps its meta through the empty
              state and because a sighted reader is reading it as a LABEL for
              the card, not as a claim about data.

              A visible run hidden from a reader is normally a smell. It is the
              right call here on both branches, and it is written down so the
              next person does not have to re-derive it. */}
          <span
            aria-hidden="true"
            className="flex items-center gap-1.5 text-2xs text-muted-foreground"
          >
            <ChartIcon className="size-4 shrink-0" />
            {t(unitNounKey(series.unit))}
          </span>
        </CardAction>
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

      {/* **The footer renders whenever there is anything to put in it, and
          `Open analysis` is one of those things — which is what closes a real
          §3.7 defect.**

          It used to render only when the plot had points, and the report link
          lived in the header. Moving the link here to the reference's own
          corner (§E7: `⊟ Open Analysis` bottom-right) would have deleted it
          from every empty card — and §3.7 is explicit that *a chart with no
          data MUST keep its card, title, AND REPORT LINK*. So the condition is
          the union: a card with no points and a destination still draws its
          footer, carrying the action alone. */}
      {(hasPlot || reportHref !== null) && (
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
          {hasPlot && <Legend series={series} t={t} language={language} />}
          {reportHref && (
            /* Pushed to the inline END — the reference's bottom-right, which
               under `dir="rtl"` is the bottom-left without a second rule. */
            <span className="ms-auto">
              <OpenAnalysis href={reportHref} report={title} t={t} language={language} />
            </span>
          )}
        </CardFooter>
      )}
    </Card>
  )
}

/**
 * **The two ways a chart card can know its own number, reduced to one shape.**
 *
 * A chart whose key matches a metric on the same board shows THAT metric —
 * the figure the board already owns, so the headline and the tile further up
 * the page cannot disagree. Eight charts have no such metric, and for those
 * `TimeSeries.windowTotal` declares how the plotted points collapse to one.
 *
 * Both branches produce the same five facts, so the anatomy below does not
 * know which produced them — which is the requirement: *a reader must not have
 * to know which of the two produced the number in front of them.*
 *
 * **Neither branch invents a delta.** A metric's arrives signed from the data
 * layer; a series' is the declared window rule applied to BOTH windows
 * (`seriesWindowDelta`), which is the same rule twice rather than a component
 * deciding what a total is. `TimeSeries.higherIsBetter` exists for exactly this
 * — *"so a chart can tint a trend without joining to a tile"* — and until now
 * no chart component read it.
 */
interface HeadlineFacts {
  value: number | null
  unit: MetricUnit
  currency: CurrencyCode | null
  /** A translation key, or `null`. Only a metric carries one. */
  captionKey: string | null
  /** Signed, in percentage points. `null` when there is nothing to compare. */
  deltaPercent: number | null
  higherIsBetter: boolean
  /**
   * The window the delta is measured against. `null` for a **target**
   * comparison as well as for no comparison at all: a target is a level, not a
   * stretch of dates, so there is no period to name and `trendRead` says so
   * rather than naming one that does not exist. The tile that owns the target
   * states it in full; this card states the trend it can state.
   */
  baseline: { from: string; to: string } | null
}

function headlineFacts(series: TimeSeries, headline: Metric | null): HeadlineFacts | null {
  if (headline) {
    return {
      value: headline.value,
      unit: headline.unit,
      currency: headline.currency,
      captionKey: headline.caption,
      deltaPercent: headline.deltaPercent,
      higherIsBetter: headline.higherIsBetter,
      baseline:
        headline.comparison.kind === 'previous-period'
          ? { from: headline.comparison.periodStart, to: headline.comparison.periodEnd }
          : null,
    }
  }
  const total = seriesWindowTotal(series)
  if (total === null) return null
  return {
    value: total,
    unit: series.unit,
    currency: series.currency,
    captionKey: null,
    deltaPercent: seriesWindowDelta(series),
    higherIsBetter: series.higherIsBetter,
    baseline: series.comparison
      ? { from: series.comparison.periodStart, to: series.comparison.periodEnd }
      : null,
  }
}

/**
 * §3.7's anatomy, rows three and four: **value, delta**, then the read.
 *
 * `data-slot` and no hand-written tabular class, for the reason `MetricTile`
 * gives: the guarantee is pinned in `@layer base` on the slot, and restating it
 * at a call site free to omit it is the mechanism §H4 declines to rely on.
 * `<bdi>` because a money value is two LTR runs the UBA reorders in an Arabic
 * line.
 *
 * The read sentence is a paragraph of its own rather than a fourth item on the
 * baseline: it interpolates a title, a percentage and a date range — three
 * isolated runs in one sentence — so it takes `isolatedRunProps` and wraps
 * rather than truncates, following `BreakdownList`'s `Caveat`.
 *
 * **The baseline is not restated as a `vs 12 – 18 Jun` chip.** The sentence
 * already names it, and §3.7 requires the legend at the foot of the card to
 * name both periods with dates — a third copy on one card is noise, not
 * redundancy.
 */
function Headline({
  facts,
  title,
  t,
  language,
}: {
  facts: HeadlineFacts
  title: string
  t: Translate
  language: Language
}) {
  const split = splitMetricValue(facts.value, facts.unit, facts.currency, language)
  const read = trendRead({
    title,
    deltaPercent: facts.deltaPercent,
    baseline: facts.baseline,
    language,
  })
  const sentence = isolatedRunProps({ className: 'text-xs text-muted-foreground' })

  return (
    /* **One grid item, not two, and that is a placement fix rather than a
       wrapper.** `CardHeader` is a two-column grid once a `CardAction` is in it,
       and a fragment put the quantity in the first column and the derived
       sentence in the SECOND — so the card's own read of itself rendered
       right-aligned beside the numeral instead of under it. One box, explicitly
       in the first column, and the two lines stack the way §A8 states them. */
    <div className="col-start-1 flex min-w-0 flex-col gap-1">
      <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span data-slot="metric-value" className="text-kpi font-semibold text-foreground">
          <bdi>{split.value}</bdi>
        </span>
        {split.unit && <span className="text-2xs text-muted-foreground">{split.unit}</span>}
        {facts.value !== null && (
          <MetricDelta
            deltaPercent={facts.deltaPercent}
            higherIsBetter={facts.higherIsBetter}
            t={t}
            language={language}
          />
        )}
        {facts.value !== null && facts.captionKey && (
          <span className="text-2xs text-muted-foreground">
            <bdi>{t(facts.captionKey)}</bdi>
          </span>
        )}
      </span>
      {/* **Never omitted.** A card that drops this line when it has nothing to
          compare leaves a bare number and no way to tell a missing sentence
          from a missing comparison — which is the state §A8's second principle
          exists to prevent. `noBaseline` is what the em dash beside the numeral
          means, in words. */}
      <p {...sentence.box}>
        <bdi {...sentence.run}>{t(read.key, read.params)}</bdi>
      </p>
    </div>
  )
}

/**
 * **§3.7's one centred sentence, inside the card frame** — §E7's *"cards carry
 * their own empty state"*.
 *
 * The three absences below differ in what they SAY and in nothing else, so they
 * share one box and there is no way for one of them to acquire a spinner, an
 * illustration or a different height by drifting.
 *
 * **Not an illustration.** §1.5 requires one for an empty state and R8 narrows
 * it to whole-page, zero-records-ever states: a chart with no data does not mean
 * the resource has never existed, and a first-run drawing inside a card would
 * claim it had.
 *
 * `min-h-40` keeps a card with nothing to draw the height of a card with
 * something to draw, which is what stops a row of three going ragged around the
 * one that came back empty. It is a floor on the BODY and does not touch the
 * panel's width — the 268px floor is a column-width rule and is settled by the
 * board's grid, not here.
 */
function CardEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="flex min-h-40 items-center justify-center text-center text-sm text-muted-foreground">
      {children}
    </p>
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
    return <CardEmpty>{t('overview.notRecorded')}</CardEmpty>
  }

  /* No data for THIS RANGE — the query ran and returned nothing. */
  if (points.length === 0) {
    return <CardEmpty>{t('overview.noData')}</CardEmpty>
  }

  /* The remaining states all draw a plot, because in all of them the
     measurement RAN. What differs is the sentence above it. */
  const allZero = points.every((point) => point.value === 0)

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', fill && 'min-h-0 flex-1')}>
      {/* A fact about the readings, not an explanation of the chrome: zero is
          the good answer on a no-show plot and must not be behind a tooltip
          (T9.9, X15). The gap count moved to the title's hint. */}
      {allZero && <p className="text-xs text-muted-foreground">{t('overview.allZero')}</p>}
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
 * T9.9 — the sentences that explain the plot rather than report it, for the
 * hint beside the title. §A9's scale noun (load-bearing: `TrendChart` rescales
 * money marks by 100), then the days inside the range that carry no reading —
 * `SeriesPoint`: *"conflating them is how an outage looks like a collapse"*.
 */
function chartNotes(series: TimeSeries, t: Translate): string[] {
  const points = series.current.points
  /* §A9's own test: a card with no plot has no scale to name, and a hint that
     opened on an empty card would claim a measurement it does not have. */
  if (series.awaitingStore !== null || points.length === 0) return []
  const notes = [t('overview.legend.unit', { unit: t(unitNounKey(series.unit)) })]
  const gaps = points.filter((point) => point.value === null).length
  if (gaps > 0) {
    notes.push(t('overview.gaps', { gaps: String(gaps), total: String(points.length) }))
  }
  return notes
}

/**
 * **The measure's glyph, one per `MetricUnit`** — §E7's card-heading mark.
 *
 * A `switch` with no `default`, for the same reason `unitNounKey` has none: a
 * seventh unit makes this fall off its end without returning an element, which
 * is a compile error, where a `default` would ship a wrong glyph on a real
 * chart and nobody would notice for a quarter.
 *
 * It says WHAT THE SCALE IS IN and never what the series counts — the title
 * beside it already names that. `aria-hidden`, because the unit is stated in
 * words at the card's corner and again in the legend; a third announcement of
 * the same fact is noise, and a glyph that repeats an adjacent word is exactly
 * what §7.5 asks to be hidden.
 *
 * 16px, monochrome, inheriting `currentColor` from the heading (§1.5).
 */
function MeasureIcon({ unit }: { unit: MetricUnit }) {
  const shared = 'size-4 shrink-0 text-muted-foreground'
  switch (unit) {
    case 'money':
      return <MoneyIcon aria-hidden="true" className={shared} />
    case 'count':
      return <CountIcon aria-hidden="true" className={shared} />
    case 'percent':
      return <PercentIcon aria-hidden="true" className={shared} />
    case 'minutes':
      return <DurationIcon aria-hidden="true" className={shared} />
    case 'rating':
      return <RatingIcon aria-hidden="true" className={shared} />
    case 'ratio':
      return <RatioIcon aria-hidden="true" className={shared} />
  }
}

/**
 * The noun for a scale, one per `MetricUnit`.
 *
 * **A `switch` with no `default`, and that is the whole of the design.** A
 * seventh unit added to the union makes this function fall off its end without
 * returning a `string`, which is a compile error — where a `default` would ship
 * a wrong noun, and a `?? ''` would ship a blank line under a plot nobody would
 * notice for a quarter.
 *
 * The nouns name **what the scale is in**, never what the series counts: the
 * title above the plot already names that, and six of the eight `count` series
 * count different things (signals, trips, subscriptions, pickups, requests,
 * events), so any one of those nouns would be false on five charts.
 */
function unitNounKey(unit: MetricUnit): string {
  switch (unit) {
    case 'money':
      return 'overview.unit.money'
    case 'count':
      return 'overview.unit.count'
    case 'percent':
      return 'overview.unit.percent'
    case 'minutes':
      return 'overview.unit.minutes'
    case 'rating':
      return 'overview.unit.rating'
    case 'ratio':
      return 'overview.unit.ratio'
  }
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
