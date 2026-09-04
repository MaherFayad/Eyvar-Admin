/**
 * A part-of-whole read — **the one shape that is a distribution rather than a
 * set of small multiples.**
 *
 * ```
 *  ┌──────────────────────────────────────────────────────┐
 *  │ Subscriptions started                         ◔  ⋯   │  title · chrome (§A12/§1.5)
 *  │ 70                                                   │  THE ANSWER — 28/20px (§A8)
 *  │            ╭──────╮                                  │
 *  │           ╱        ╲                                 │
 *  │          │    ◔     │                                │
 *  │           ╲        ╱                                 │
 *  │ ────────────────────────────────────────────────     │
 *  │  ▪ weekly                                      26    │  the parts — this card's
 *  │  ▪ biweekly                                    22    │  legend (§A9/§7.5)
 *  │  ▪ monthly                                     22    │
 *  │ ────────────────────────────────────────────────     │
 *  │  Counts every subscription record.                   │  THE POPULATION (R5-15)
 *  │  3 of 3 groups have a reading.                       │  caption · base
 *  └──────────────────────────────────────────────────────┘
 * ```
 *
 * ## A pie tile and a line tile are the same object, or the board is two products
 *
 * This card drew the **old** panel anatomy after `PanelCard` had moved to
 * Amplitude's: a 16px title, then two or three lines of catalogue prose, then
 * the figure — and no headline numeral at all. On `DSH-1` that is not a
 * private inconsistency. Positions 2 and 3 are a line tile and a pie tile,
 * side by side at the same width, and one of them led with a 20px number while
 * the other led with a paragraph. Measured before, at 1440 (`scratch/dist-ladder.mjs`):
 *
 * | | line tile | pie tile |
 * |---|---|---|
 * | tile heading | 16 | 16 |
 * | panel title | 16 | 16 |
 * | **headline** | **20** | **none** |
 * | prose | 12, at the card FOOT | 12, in the HEADER |
 *
 * So the order is now `PanelCard`'s order, from the same components: title,
 * numeral, plot, this card's legend, the catalogue prose at the foot.
 * `PanelNumeral` and `PanelProse` are **imported, not re-implemented** — the
 * rung, the slot, the isolation and the step are decided once, in the file that
 * decided them, and the two cards cannot drift by a class.
 *
 * ## What a parts chart cannot take from `PanelCard`, and why
 *
 * **The period delta and the derived read sentence.** Not an omission and not a
 * simplification — two independent refusals:
 *
 *   1. A distribution is `grain: 'none'`, which collapses the window to **one
 *      bucket**, so `ReportResult.buckets` holds a single date and the result
 *      carries no resolved window END. `comparisonWindow` over `{from: b, to:
 *      b}` returns a ONE-DAY baseline — a date range nobody measured. Every
 *      form of §3.7's read sentence names its baseline by date
 *      (`overview.chart.read.up` / `.down` / `.flat`), so stating one here
 *      means printing a window that does not exist.
 *   2. A delta is a statement about movement along an axis this chart does not
 *      draw. A caret beside a pie asks the reader to trust a comparison the
 *      picture cannot corroborate, and `overview.chart.read.noBaseline` beside
 *      a rendered delta would contradict the delta on the same line.
 *
 * The slot is therefore empty rather than approximated. A "largest part is X at
 * N %" sentence would be the honest derived read for this shape and it needs a
 * key that does not exist; that is a request, not a licence.
 *
 * ## Why this exists beside `PanelCard` instead of inside it
 *
 * A panel is a y-axis. Over time, one measure split three ways is three
 * independent series at three scales, so it is three panels and three axes —
 * R4-1, and `PanelCard` renders each. At `grain: 'none'` the window collapses
 * to **one bucket** and those three panels hold three numbers that sum to a
 * whole. There is no axis to share and no scale to distort, so the honest
 * rendering is one figure, not three cards with one number each.
 *
 * That is not a loophole in R4-1. R4-1's finding is about **scale** —
 * *"drivers vs passengers differ by an order of magnitude, so on a shared axis
 * the captains line is a flat trace"* — and a part-of-whole has no shared axis
 * to flatten anything against. The planner already guarantees the case: a pie
 * needs one measure, a split, `grain: 'none'`, an **additive** measure and six
 * or fewer parts, and every one of those five gates is checked in
 * `planReportQuery` before this component is chosen.
 *
 * ## No categorical palette, and none is minted here
 *
 * `globals.css` **deletes** shadcn's five-colour ramp rather than remapping it,
 * and §3.7 forbids a second hue. So the slices are **one hue at descending
 * opacity** — an ordered ramp over a ranked part-of-whole, which is what the
 * data already is, not a categorical scheme. Zero new tokens.
 *
 * Colour is never the sole carrier (§7.5): every part is named and valued in
 * the list beside the figure, which is also what makes it readable at all when
 * the sixth slice is 2 %.
 *
 * ## The headline is the total, and it is stated only where it can be
 *
 * `PanelCard` leads with a numeral because a panel's answer is a quantity. A
 * part-of-whole's equivalent is the **whole** — the sum across the parts — and
 * it is the number the list under the figure already adds up to, so stating it
 * makes the card's own arithmetic legible rather than adding a claim.
 *
 * **It is rendered only where the catalogue licences the sum.**
 * `Measure.additive` is not a hint; its own doc defines it as *"whether values
 * may be summed across buckets **or across groups**"*, which is precisely this
 * question, and §7.2 calls a pie of a non-additive measure *"arithmetic
 * nonsense wearing a chart"*. The planner already refuses a PIE on that ground
 * (`plan.ts:748`) — but **this component also draws the `bar` distribution, and
 * that branch has no additivity gate**, so a rate split by city at `grain:
 * 'none'` arrives here legally with a total that means nothing. Where the sum
 * cannot be stated honestly there is **no numeral**, not a plausible one.
 *
 * Three conditions, each of them a refusal rather than a fallback:
 *
 *   - **no catalogue entry** (`measure === null`) — nothing declared anything,
 *     and an undeclared rollup is indistinguishable from a declared one once it
 *     is set at 28px;
 *   - **not additive** — the catalogue has said these do not sum;
 *   - **the entry is not about these numbers** — `declaredAggregate`'s test,
 *     the one `ResultTable` and `PanelCard`'s headline both run. A resolver
 *     that re-declares `unit`, `currency` or `temporality` has changed what the
 *     series counts, and `additive` describes what it used to count.
 *
 * What is NOT a condition: a part with no reading. Those are excluded from the
 * sum and counted in the base line at the foot (`rb.panel.parts`, *"2 of 3
 * groups have a reading"*), which is the same guarantee `rb.panel.readings`
 * gives the trend panel. A total over a stated denominator is a measurement; a
 * total over a silent one is the defect R5-15 exists for.
 *
 * The single bucket needs no rollup rule of its own, and that is arithmetic
 * rather than a choice: `partialBucketIndexes` is empty at `grain: 'none'` by
 * construction (`buckets.ts:269`), so the bucket's own aggregate has already
 * been applied server-side and the only combination left to do here is the one
 * across groups.
 *
 * Rules applied
 *   §7.2/§7.4  `Other` is last and **renders even at zero**, so it is visible
 *              that something was folded.
 *   §A9        the parts list opens with a `Top {n}` pill when — and only when
 *              — the split actually was capped. See `PanelCard.topGroupCount`
 *              for the argument; the count is read from the same
 *              `foldedGroupCount` the canvas states in words.
 *   §A10       the hover tooltip is a CARD carrying the part's name and its
 *              value, and it mirrors while the figure it sits over does not.
 *   §1.5       one icon set (lucide), 16px, `currentColor`, `aria-hidden`.
 *   §3.7       **no gridlines.** The `<CartesianGrid horizontal={false}
 *              vertical={false} />` that used to state that is deleted rather
 *              than kept: both axes were off, so it painted nothing while
 *              reading as a grid somebody had configured. `PanelChart`'s header
 *              carries the same note, and the reason `TrendChart`'s 2026-09-02
 *              gridline amendment is not extended to this chart family.
 *   §9.2       the plot does not mirror; the card and the list do.
 *   §A8        the numeral leads, at the rung `framed` picks — 28 on the
 *              builder, 20 on a tile. `PanelNumeral` owns both, so this card
 *              and the panel beside it cannot disagree about either.
 *   R5-15      the population, the caption and the base are DEMOTED to the card
 *              foot and none of them is deleted or put behind a disclosure.
 *   R18        no animation.
 */

import { Cell, Pie, PieChart, Bar, BarChart, XAxis, YAxis } from 'recharts'
import { ChartPieIcon, BarChart3Icon } from 'lucide-react'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import {
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatMetricValue, formatSeriesValue } from '@/components/metrics'
import type { Measure, MetricUnit, ReportPanel, ReportResult } from '@/data/types'
import { ABSENT, directionFor, isolatedRunProps, type Language, type Translator } from '@/lib'
import { cn } from '@/lib/utils'
import { PanelFrame, PanelNumeral, PanelProse, panelTitle } from './PanelCard'
import { seriesOfPanel } from './PanelChart'
import { declaredAggregate } from './rollup'

const CHART_CONFIG = {
  value: { label: 'value', color: 'var(--chart-series)' },
} satisfies ChartConfig

/** One hue, descending. An ordered ramp over a ranked whole, not a categorical scheme. */
const RAMP = [1, 0.82, 0.64, 0.46, 0.3, 0.16]

export interface DistributionCardProps {
  panels: readonly ReportPanel[]
  result: ReportResult
  measure: Measure | null
  kind: 'pie' | 'bar'
  title: string
  /**
   * **Whether this card draws its own frame.** `true` by default. A dashboard
   * tile is already a `Card`, so it passes `false` and the distribution renders
   * flush inside the tile's one frame rather than nesting a second hairline,
   * radius and shadow 12px in. Same prop, same reasoning and the same
   * `PanelFrame` as `PanelCard`; see its file header.
   */
  framed?: boolean
  t: Translator
  language: Language
}

export function DistributionCard({
  panels,
  result,
  measure,
  kind,
  title,
  framed = true,
  t,
  language,
}: DistributionCardProps) {
  const parts = panels.map((panel, index) => {
    const series = seriesOfPanel(result, panel, 'current')
    return {
      key: panel.panelId,
      label: panelTitle(panel, t).groupValue ?? panelTitle(panel, t).text,
      /* A gap is not a zero, and a zero is not a gap. `null` keeps the part in
         the list — it is a named group with no reading — and out of the chart. */
      value: series?.points[0] ?? null,
      opacity: RAMP[Math.min(index, RAMP.length - 1)] ?? 0.16,
    }
  })

  const drawable = parts.filter((part): part is typeof part & { value: number } => part.value !== null)
  const unit = panels[0]?.unit ?? 'count'
  const currency = panels[0]?.currency ?? null
  const tooltip = <PartTooltip unit={unit} t={t} language={language} />

  /* §A9's `Top n`. True only where the split was actually capped: where
     `foldedGroupCount` is `null` every group is on screen, and a pill over
     four-of-four would claim a cap nobody applied. `Other` is the fold, not one
     of the survivors, so it is out of the count. */
  const top =
    result.foldedGroupCount === null
      ? null
      : parts.filter((part) => part.label !== t('rb.panel.other')).length

  /* **§A8's headline — or nothing.** See the file header for the three
     conditions and why each is a refusal rather than a fallback. `Other` is
     counted IN: it is the fold, so leaving it out would understate the whole by
     exactly the amount §7.4 folded away. */
  const total = totalOfParts(panels, drawable, result, measure)
  const hasParts = parts.length > 0

  return (
    <PanelFrame framed={framed} className="min-w-0">
      <CardHeader>
        {/* The tile rung, from the same prop and for the same reason as
            `PanelCard`'s title — see that file's header. The two must move
            together or a board's two half tiles rank their panels differently. */}
        <CardTitle className={framed ? undefined : 'text-sm'}>{title}</CardTitle>
        {/* §1.5 — the shape this is drawn in, in the card's own corner slot. */}
        <CardAction className="flex items-center text-muted-foreground">
          {kind === 'pie' ? (
            <ChartPieIcon aria-hidden="true" className="size-4" />
          ) : (
            <BarChart3Icon aria-hidden="true" className="size-4" />
          )}
          <span className="sr-only">
            {t('rb.panel.chartKind', { chartType: t(`rb.chartType.${kind}`) })}
          </span>
        </CardAction>
        {total !== null && (
          /* **One grid item, explicitly in the first column** — `CardHeader` is
             a two-column grid once a `CardAction` is in it, and an unplaced
             second child lands in the SECOND column, beside the glyph.
             `PanelCard.Headline` hit this first and records it.

             The column is a `flex-col` with nothing under it today because the
             derived read sentence is the one part of §A8's anatomy a parts
             chart cannot state; the file header says why. Kept as the same box
             `PanelCard` uses so the two headers are one shape. */
          <div className="col-start-1 flex min-w-0 flex-col gap-1">
            <PanelNumeral
              value={total}
              unit={unit}
              currency={currency}
              framed={framed}
              language={language}
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="flex min-w-0 flex-col gap-3">
        <div dir="ltr" role="img" aria-label={title}>
          <ChartContainer config={CHART_CONFIG} className="aspect-auto h-52 w-full">
            {kind === 'pie' ? (
              <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <ChartTooltip content={tooltip} />
                <Pie
                  data={drawable}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={0}
                  isAnimationActive={false}
                  stroke="var(--card)"
                  strokeWidth={1}
                >
                  {drawable.map((part) => (
                    <Cell key={part.key} fill="var(--chart-series)" fillOpacity={part.opacity} />
                  ))}
                </Pie>
              </PieChart>
            ) : (
              <BarChart data={drawable} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--chart-axis)' }}
                  tickMargin={8}
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                />
                <YAxis
                  width={56}
                  tickLine={false}
                  axisLine={false}
                  tickCount={4}
                  allowDecimals={unit !== 'count'}
                  tickFormatter={(value: number) => formatSeriesValue(value, unit, language)}
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                />
                <ChartTooltip cursor={{ fill: 'var(--chart-grid)' }} content={tooltip} />
                <Bar dataKey="value" fill="var(--chart-series)" isAnimationActive={false} />
              </BarChart>
            )}
          </ChartContainer>
        </div>

      </CardContent>

      {hasParts && (
        /* **This card's legend, in the slot `PanelCard` puts its legend in.**
           A trend panel closes with a hairline and a row of dated chips under
           the plot; a distribution closes with a hairline and the parts,
           because the parts ARE the legend — §7.5's requirement that colour is
           never the sole carrier, and the only thing that makes a 2 % slice
           readable at all. Same `CardFooter`, same rule, same inset, so the two
           cards break at the same place down the tile.

           `flex-col` rather than the footer's own centred row: a legend of two
           dated chips is a row and a legend of six named values with figures is
           a list, and a list that wraps mid-pair is unreadable. `Other` is last
           and present even at zero, because the fold has to be visible (§7.4). */
        <CardFooter className="flex-col items-stretch gap-2">
          {top !== null && (
            <Badge tone="neutral" className="self-start">
              {t('rb.panel.top', { count: top })}
            </Badge>
          )}
          <ul data-slot="part-list" className="flex list-none flex-col gap-1">
            {parts.map((part) => (
              <li key={part.key} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-2">
                  <svg aria-hidden="true" focusable="false" width="10" height="10" className="shrink-0">
                    <rect
                      width="10"
                      height="10"
                      rx="2"
                      fill="var(--chart-series)"
                      fillOpacity={part.opacity}
                    />
                  </svg>
                  <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
                    <bdi {...isolatedRunProps().run}>{part.label}</bdi>
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatMetricValue(part.value, unit, language)}
                </span>
              </li>
            ))}
          </ul>
        </CardFooter>
      )}

      {measure && (
        /* **R5-15, demoted and still unconditional** — the same move, the same
           slot and the same component as `PanelCard`'s foot. Under the parts,
           never behind a click. `border-t-0 pt-0` where the parts have already
           drawn the foot's hairline: a second rule 20px below the first reads
           as a section break inside one card.

           The BASE is this card's own, and it counts a different thing.
           `rb.panel.readings` counts buckets over a window; a distribution has
           one bucket and its denominator is the GROUPS the split produced, so
           it states `rb.panel.parts`. Both are the same guarantee — a share
           with no denominator is a share of nothing in particular. */
        <CardFooter className={cn('flex-col items-start gap-0.5', hasParts && 'border-t-0 pt-0')}>
          <PanelProse
            predicate={t(measure.population.predicateKey)}
            caption={measure.captionKey ? t(measure.captionKey) : null}
            base={t('rb.panel.parts', { readings: drawable.length, total: parts.length })}
          />
        </CardFooter>
      )}
    </PanelFrame>
  )
}

/**
 * **The whole, across the parts — or `null`, which is the answer more often
 * than it looks.**
 *
 * The file header carries the argument. What is here is the three conditions,
 * in one place, so a reader can see that none of them is a fallback:
 *
 *   `measure === null`            nothing declared anything.
 *   `!measure.additive`           the catalogue has said these do not sum.
 *                                 §7.2's *"arithmetic nonsense wearing a
 *                                 chart"*, and the gate the BAR branch of this
 *                                 component does not get from the planner.
 *   `declaredAggregate === null`  the catalogue entry is not about these
 *                                 numbers — a resolver re-declared `unit`,
 *                                 `currency` or `temporality`, so `additive`
 *                                 describes what the series used to count.
 *                                 Tested on EVERY drawable part, because one
 *                                 re-declared series poisons the sum of all of
 *                                 them.
 *
 * And one that is not a condition: a part with no reading. It is skipped and
 * the foot states how many were skipped, which is the base R5-15 asks for.
 * `drawable` is empty — every group a gap — returns `null` too: a sum over no
 * readings is not zero, it is unknown (`rollup.ts` makes the same distinction
 * for the same reason).
 */
function totalOfParts(
  panels: readonly ReportPanel[],
  drawable: readonly { key: string; value: number }[],
  result: ReportResult,
  measure: Measure | null,
): number | null {
  if (measure === null || !measure.additive || drawable.length === 0) return null
  const drawn = new Set(drawable.map((part) => part.key))
  for (const panel of panels) {
    if (!drawn.has(panel.panelId)) continue
    const series = seriesOfPanel(result, panel, 'current')
    if (series === null || declaredAggregate(series, measure) === null) return null
  }
  return drawable.reduce((sum, part) => sum + part.value, 0)
}

/**
 * **§A10 — the tooltip is a card, and it is the one thing here that MIRRORS.**
 *
 * A part-of-whole has one bucket, so there is no date to name and no comparison
 * row: the card is the part's name over its value, which is the whole of what a
 * slice knows. It carries no footer — `displayedAsMetricKeys` names a board for
 * the *measure*, and a distribution's hovered object is one **group** of it, so
 * a "see this on its board" line here would point at a board that does not show
 * this slice.
 *
 * `ChartTooltipContent` was here and could not stay: it destructures
 * `className` and spreads nothing, so it cannot be handed a `dir`, and Recharts
 * renders the tooltip **inside** `ChartContainer`'s div rather than in a portal
 * — so it inherited the `dir="ltr"` correctly pinned on the figure and laid
 * Arabic copy out left-to-right with the label pinned to the physical left.
 * §9.2's prohibition names *the plot area and the SVG axis group*; a tooltip is
 * chrome and mirrors with the page. `TrendChart.TrendTooltip` established the
 * fix and `PanelChart.PanelTooltip` follows it; this is the third and last.
 */
interface Part {
  label: string
  value: number | null
}

export function PartTooltip({
  active,
  payload,
  unit,
  t,
  language,
}: {
  /** Recharts injects these two by cloning the element. */
  active?: boolean
  payload?: ReadonlyArray<{ value?: number | null; payload?: Part }>
  unit: MetricUnit
  t: Translator
  language: Language
}) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const part = payload[0]?.payload
  if (part === undefined) return null

  return (
    <div
      dir={directionFor(language)}
      data-slot="part-tooltip"
      className="grid min-w-32 items-start gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-2"
    >
      {/* A group value is user content and carries its own direction. */}
      <p className="font-medium text-foreground">
        <bdi>{part.label}</bdi>
      </p>
      <p className="flex items-center justify-between gap-2 text-muted-foreground">
        <span>{t('rb.table.value')}</span>
        {/* A gap reads as an em dash, never as a zero. */}
        <span className="font-medium tabular-nums text-foreground">
          <bdi>
            {typeof part.value === 'number' ? formatSeriesValue(part.value, unit, language) : ABSENT}
          </bdi>
        </span>
      </p>
    </div>
  )
}
