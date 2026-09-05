/**
 * **One plot, every series in it.** Amplitude §A8, and the reason it exists is
 * a single sentence from the business owner:
 *
 * > *"for charts I need numbers above the chart, and compound charts that
 * > compare those data to each other not every one in it's own chart"*
 *
 * What shipped before this file was **small multiples**: `ResultCanvas.Body`
 * mapped `result.panels` to one `PanelCard` each and laid them out two across.
 * Six districts were six charts, each with its own axis, each auto-scaled to
 * its own maximum — so the district with 40 rides and the district with 4,000
 * drew *the same shaped line at the same height*, and the comparison the split
 * exists to make was the one thing the picture could not show. A reader had to
 * do it by reading six y-axes.
 *
 * ```
 *   before                              after
 *   ┌────────┐ ┌────────┐               ┌──────────────────────────┐
 *   │ Riyadh │ │ Jeddah │               │  ╭─╮      ╭╮   Riyadh    │
 *   │  ╭─╮   │ │  ╭─╮   │               │ ╭╯ ╰╮   ╭─╯╰╮  Jeddah    │
 *   │ ╭╯ ╰╮  │ │ ╭╯ ╰╮  │      →        │╭╯   ╰───╯   ╰  Dammam    │
 *   └────────┘ └────────┘               │ ─────────────  (one axis)│
 *   ┌────────┐ ┌────────┐               └──────────────────────────┘
 *   │ Dammam │ │ Mecca  │
 *   └────────┘ └────────┘
 * ```
 *
 * ## One axis is a claim, so this component is only handed series that may share one
 *
 * A `ReportPanel` is *"a y-axis and a chart card … the reason two measures
 * cannot silently share a scale"* (`types/report.ts:352`). Putting halalas and
 * a count on one axis is the fabrication `pairRefusal` exists to refuse, and
 * drawing it prettily does not make it true.
 *
 * So the grouping decision is **not** this component's: `ResultCanvas` buckets
 * panels by `(unit, currency)` and calls this once per bucket. In the case that
 * matters — a split by district, which is one measure over N groups — every
 * panel carries the same pair and there is exactly one call, which is the
 * picture above. Two measures in different units still get two plots, and that
 * is the correct answer rather than a limitation.
 *
 * ## Colour is the series identity, and it had to be bought
 *
 * `globals.css` ruled *"there is therefore no categorical chart palette"*, on
 * DESIGN.md §3.7's single-hue line. Six lines in one plot in one hue are six
 * lines nobody can tell apart, so the compound chart and that rule cannot both
 * stand. The owner chose the compound chart — *"the priority is to make it the
 * same as amplitude not to align with design.md at the current moment"* — and
 * `--chart-s1 … --chart-s6` are the result. **`--chart-s1` is the brand**, so a
 * single-series chart is exactly what it was.
 *
 * The colour is assigned by the panel's **position in `result.panels`**, which
 * is the result's own documented draw order (*"chosen-measure order, then group
 * rank descending, `Other` last"*). It is therefore stable across a re-run of
 * the same question, and `SeriesHeadlines` and the legend index the same array
 * — the dot above the number, the line in the plot and the chip in the legend
 * are one lookup, not three that agree today.
 *
 * ## Fill only when there is one series
 *
 * A single series keeps its pale area fill. Two or more draw as bare lines,
 * because six translucent fills stacked on one plot are a wash nobody can read
 * a value out of — and Amplitude's own multi-series charts are unfilled for the
 * same reason. This is a rendering consequence of the series count, not a
 * setting: an operator who adds a second group should not have to also know to
 * turn a fill off.
 *
 * ## The comparison keeps the rule it always had
 *
 * §3.7: **the comparison differs by DASH, never by hue.** It is drawn in its
 * series' own colour, dashed, at a thinner weight. That rule survives the
 * palette intact — the palette separates *series from each other*, and the dash
 * separates *this window from the previous one*, which are different questions
 * and need different encodings. Rendered only when there are at most two
 * series: twelve lines, half of them dashed, is not a comparison anybody can
 * read, and the numbers above the plot carry the delta regardless.
 *
 * ## Every mark is inert, and removing that breaks the click with no test failing
 *
 * `PanelChart` records the measurement in full: recharts re-renders on
 * `mousedown`, so the node under the press is not the node under the release
 * and Chromium emits no `click` at all. `pointerEvents: 'none'` on the marks
 * puts both on `.recharts-surface`, which no re-render replaces. jsdom reports
 * the broken version as working, so **no test guards this** — the constant is
 * duplicated here deliberately rather than imported, with the warning attached,
 * because an import would carry the value and lose the reason.
 */

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { formatSeriesValue } from '@/components/metrics'
import { bucketStarts, comparisonWindow } from '@/data/clients'
import { ABSENT, directionFor, formatDate, type Language, type Translate } from '@/lib'
import type { MetricUnit, ReportPanel, ReportResult, ReportSeries } from '@/data/types'

/**
 * **Do not remove.** See the header — with marks hit-testable, the click that
 * opens a board never fires in Chromium and every test still passes.
 */
const INERT = { pointerEvents: 'none' } as const

/**
 * The six categorical stops, in draw order. Six rather than more because a
 * seventh hue that separates from the other six under deuteranopia does not
 * exist at this lightness; §7.4's fold already caps a split at a readable
 * number of groups and `Other` takes the last stop.
 */
const SERIES_STOPS = [
  'var(--chart-s1)',
  'var(--chart-s2)',
  'var(--chart-s3)',
  'var(--chart-s4)',
  'var(--chart-s5)',
  'var(--chart-s6)',
] as const

const FILL_STOPS = [
  'var(--chart-fill-s1)',
  'var(--chart-fill-s2)',
  'var(--chart-fill-s3)',
  'var(--chart-fill-s4)',
  'var(--chart-fill-s5)',
  'var(--chart-fill-s6)',
] as const

/**
 * **The one lookup three surfaces share.** The dot above the number, the line
 * in the plot and the chip in the legend all call this with the same index, so
 * they cannot drift. Wraps rather than throwing past six: a folded split can
 * exceed the palette, and a repeated hue is a worse picture than a crash is a
 * screen, but only just — `foldedGroupCount` already keeps this rare.
 */
export function seriesColor(index: number): string {
  return SERIES_STOPS[index % SERIES_STOPS.length] ?? SERIES_STOPS[0]
}

export function seriesFill(index: number): string {
  return FILL_STOPS[index % FILL_STOPS.length] ?? FILL_STOPS[0]
}

/**
 * **The seventh series onwards, and why it may take the dash.**
 *
 * Six hues is where the palette stops — a seventh that separates from the other
 * six under deuteranopia does not exist at this lightness, which is measured
 * and recorded in `globals.css`. So `seriesColor` wraps, and a split by
 * district that survives §7.4's fold with nine groups drew **District 6 and
 * Other in the same ochre**, District 1 and District 7 in the same green.
 * Measured on `/management/reports/RPT-2`: nine series, six strokes.
 *
 * The hue is not the only identifier — the legend and the headline both put the
 * name next to the mark — but on the plot itself it is, and *which line is
 * spiking* is the question a compound chart exists to answer.
 *
 * So the second lap is **dotted**, and §3.7's *"the comparison differs by DASH,
 * never by hue"* survives intact, because the two cases **cannot co-occur**:
 * `SeriesChart` draws a comparison only at two series or fewer, and a second lap
 * only exists at seven or more. There is no plot on which a dotted line could
 * be read as either. The pattern is `1 3` — a fine dot, deliberately not the
 * comparison's `4 3` long dash, so the two do not resemble each other even in
 * a screenshot taken out of context.
 *
 * Past twelve, both are exhausted; the fold makes that vanishingly rare and a
 * third pattern would be three ways of saying *this is a different series*.
 */
export function seriesDash(index: number): string | undefined {
  return index < SERIES_STOPS.length ? undefined : '1 3'
}

/** Recharts needs flat keys, and a panel id is not one. Index-addressed. */
const currentKey = (index: number) => `s${index}`
const comparisonKey = (index: number) => `c${index}`

interface Row {
  label: string
  /** The date the DASHED reading was taken on — a different day by definition. */
  comparisonLabel: string | null
  [seriesKey: string]: string | number | null
}

export interface SeriesChartProps {
  /**
   * **Every panel drawn here shares one `(unit, currency)` pair**, and the
   * caller is what guarantees it. See the header: one axis is a claim.
   */
  panels: readonly ReportPanel[]
  result: ReportResult
  kind: 'line' | 'bar'
  /** The unit of the axis. Every panel's, because they are all the same one. */
  unit: MetricUnit
  /** Names the plot for anyone who cannot see it (§7.5). Already translated. */
  description: string
  /** Resolved by the caller from `panelTitle`, so plot and legend agree. */
  titles: readonly string[]
  /**
   * The palette index each panel takes. Passed rather than derived from this
   * component's own array position, because the caller may draw a subset —
   * a second unit group must not restart at the brand colour and claim to be
   * the first series.
   */
  colorIndexes: readonly number[]
  /** Taller in the builder than in a tile. Tailwind class, so the scanner sees it. */
  heightClass?: string
  t: Translate
  language: Language
}

export function SeriesChart({
  panels,
  result,
  kind,
  unit,
  description,
  titles,
  colorIndexes,
  heightClass = 'h-72',
  t,
  language,
}: SeriesChartProps) {
  const currents = panels.map(
    (panel) =>
      result.series.find((s) => s.panelId === panel.panelId && s.role === 'current') ?? null,
  )

  /* The comparison is drawn only where it can still be read — see the header.
     The delta above the plot carries it in every other case. */
  const withComparison = panels.length <= 2
  const comparisons = withComparison
    ? panels.map(
        (panel) =>
          result.series.find((s) => s.panelId === panel.panelId && s.role === 'comparison') ?? null,
      )
    : panels.map(() => null)
  const anyComparison = comparisons.some((s) => s !== null)
  const priorBuckets = anyComparison ? comparisonBuckets(result) : []

  const rows: Row[] = result.buckets.map((bucket, index) => {
    const against = priorBuckets[index]
    const row: Row = {
      label: formatDate(bucket, { style: 'day-month', language }),
      comparisonLabel:
        against === undefined ? null : formatDate(against, { style: 'day-month', language }),
    }
    currents.forEach((series, s) => {
      row[currentKey(s)] = series?.points[index] ?? null
    })
    comparisons.forEach((series, s) => {
      row[comparisonKey(s)] = series?.points[index] ?? null
    })
    return row
  })

  /* `ChartContainer` emits `--color-<key>` per entry, which is what lets the
     marks below name a colour without inlining one. The keys are the same
     index-addressed strings the rows carry. */
  const config: ChartConfig = {}
  panels.forEach((_, index) => {
    config[currentKey(index)] = {
      label: titles[index] ?? '',
      color: seriesColor(colorIndexes[index] ?? index),
    }
    config[comparisonKey(index)] = {
      label: titles[index] ?? '',
      color: seriesColor(colorIndexes[index] ?? index),
    }
  })

  /* One series keeps §3.7's pale wash; two or more do not. See the header. */
  const filled = panels.length === 1

  const tooltip = <SeriesTooltip titles={titles} unit={unit} t={t} language={language} />

  /* §3.5 — a partial bucket is a property of the WINDOW, so every series in
     this plot shares the same set. Read off the first series that has one
     rather than unioned: they are identical by construction, and a union would
     quietly paper over a resolver that disagreed with itself. */
  const partials = currents.find((s) => s !== null && s.partialBucketIndexes.length > 0)
    ?.partialBucketIndexes ?? []

  const axes = (
    <>
      {/**
       * **Horizontal gridlines, which §3.7 rules out and the owner ruled in.**
       *
       * DESIGN.md §3.7 says *"no gridlines beyond the axis baseline"*, and for
       * a single line in a 176px tile that was right — the rules were noise
       * over a shape a reader takes in at a glance.
       *
       * This plot is not that plot. It is 320px tall, carries up to six series,
       * and the reading task it exists for is *which of these is higher at this
       * date, and by roughly how much* — which is read by tracing across to a
       * value. Amplitude draws them for the same reason, and the owner's
       * ruling is explicit that Amplitude wins where the two disagree.
       *
       * Horizontal only. A vertical rule per bucket over a 30-day window is 30
       * rules, and the x positions are already marked by the axis ticks.
       * `--chart-grid` is the hairline tone the token layer already carries; no
       * token is minted for this.
       */}
      <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={{ stroke: 'var(--chart-axis)' }}
        tickMargin={8}
        minTickGap={24}
        tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
      />
      <YAxis
        width={56}
        tickLine={false}
        axisLine={false}
        tickCount={5}
        /* A count axis over a 0–2 domain rounds its ticks to `0 1 1 2` — an
           axis showing one label twice. Only counts are integral. */
        allowDecimals={unit !== 'count'}
        tickFormatter={(tick: number) => formatSeriesValue(tick, unit, language)}
        tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
      />
      <ChartTooltip
        cursor={kind === 'bar' ? { fill: 'var(--chart-grid)' } : { stroke: 'var(--chart-grid)' }}
        content={tooltip}
      />
      {/**
       * §3.5's partial buckets, **drawn and marked** — a scrim over the series,
       * not behind it.
       *
       * `PanelChart` records the measurement that settled the shape: a
       * `ReferenceArea` draws nothing at all on a point scale, because
       * `d3.scalePoint().bandwidth()` is `0` and `Rectangle` returns `null`,
       * which is every line chart. A `ReferenceLine` places itself at
       * `position: 'middle'`, which point and band scales both answer, and takes
       * its width from `strokeWidth` rather than from the scale.
       *
       * In front, because recharts puts `ReferenceLine` at zIndex 400 and the
       * marks at 100–300 — behind, an opaque bar or fill hid it everywhere
       * except the headroom above the readings, and a mark only visible on
       * charts with slack is not a mark.
       */}
      {partials.map((index) => {
        const row = rows[index]
        if (row === undefined) return null
        return (
          <ReferenceLine
            key={index}
            x={row.label}
            stroke="var(--chart-axis)"
            strokeOpacity={0.32}
            strokeWidth={12}
            ifOverflow="extendDomain"
            className="recharts-partial-bucket"
            style={INERT}
          />
        )
      })}
    </>
  )

  const margin = { top: 8, right: 8, bottom: 0, left: 4 }

  return (
    /* §9.2 — the plot is pinned one direction, and the pin stops at this
       element. `role="img"` with a name, because the marks inside are inert
       and carry no text of their own. */
    <div dir="ltr" role="img" aria-label={description} className="min-w-0">
      <ChartContainer config={config} className={`aspect-auto w-full ${heightClass}`}>
        {kind === 'bar' ? (
          <BarChart accessibilityLayer data={rows} margin={margin}>
            {axes}
            {/* Comparison first, so the current window paints over it. */}
            {comparisons.map((series, index) =>
              series === null ? null : (
                <Bar
                  key={comparisonKey(index)}
                  dataKey={comparisonKey(index)}
                  fill={seriesFill(colorIndexes[index] ?? index)}
                  isAnimationActive={false}
                  style={INERT}
                />
              ),
            )}
            {/* **Bars take no second-lap pattern, and do not need one.**
                `seriesDash` disambiguates the seventh series onwards for LINES,
                which overlap and are told apart only by their mark. Bars are
                grouped side by side inside each bucket in a fixed order, so
                position already separates two series that share a hue — the
                ambiguity the dash exists to remove is not present here. An SVG
                pattern fill would be a second mechanism for a problem this
                branch does not have. */}
            {panels.map((_, index) => (
              <Bar
                key={currentKey(index)}
                dataKey={currentKey(index)}
                fill={`var(--color-${currentKey(index)})`}
                isAnimationActive={false}
                style={INERT}
              />
            ))}
          </BarChart>
        ) : filled ? (
          <AreaChart accessibilityLayer data={rows} margin={margin}>
            {axes}
            {comparisons[0] && (
              <Area
                dataKey={comparisonKey(0)}
                type="monotone"
                stroke={`var(--color-${comparisonKey(0)})`}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                fill="none"
                fillOpacity={0}
                style={INERT}
                dot={false}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            <Area
              dataKey={currentKey(0)}
              type="monotone"
              stroke={`var(--color-${currentKey(0)})`}
              strokeWidth={2}
              fill={seriesFill(colorIndexes[0] ?? 0)}
              fillOpacity={1}
              style={INERT}
              /* A one-point window, and a reading with gaps either side, both
                 draw nothing without a dot. */
              dot={{ r: 2, fill: `var(--color-${currentKey(0)})`, stroke: 'none', style: INERT }}
              activeDot={{ r: 4, fill: `var(--color-${currentKey(0)})`, stroke: 'var(--card)', style: INERT }}
              /* A gap BREAKS the line. Joining across it would draw a value
                 that was never measured. */
              connectNulls={false}
              isAnimationActive={false}
            />
          </AreaChart>
        ) : (
          <LineChart accessibilityLayer data={rows} margin={margin}>
            {axes}
            {comparisons.map((series, index) =>
              series === null ? null : (
                <Line
                  key={comparisonKey(index)}
                  dataKey={comparisonKey(index)}
                  type="monotone"
                  stroke={`var(--color-${comparisonKey(index)})`}
                  strokeWidth={1.25}
                  /* §3.7 — the previous window differs by DASH, never by hue.
                     The palette separates series from each other; this
                     separates one window from another. Different questions,
                     different encodings, and the two compose. */
                  strokeDasharray="4 3"
                  dot={false}
                  activeDot={false}
                  style={INERT}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ),
            )}
            {panels.map((_, index) => (
              <Line
                key={currentKey(index)}
                dataKey={currentKey(index)}
                type="monotone"
                stroke={`var(--color-${currentKey(index)})`}
                strokeWidth={2}
                /* The second lap through the palette. See `seriesDash`. */
                strokeDasharray={seriesDash(colorIndexes[index] ?? index)}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: `var(--color-${currentKey(index)})`,
                  stroke: 'var(--card)',
                  style: INERT,
                }}
                style={INERT}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        )}
      </ChartContainer>
    </div>
  )
}

/**
 * The prior window's buckets, from the same `comparisonWindow` the headline
 * and the legend use — so the date under a dashed value and the date in the
 * sentence beside it cannot drift.
 */
function comparisonBuckets(result: ReportResult): string[] {
  const kind = result.query.periodComparison
  const from = result.buckets[0]
  const to = result.buckets[result.buckets.length - 1]
  if (kind === 'none' || from === undefined || to === undefined) return []
  const grain = result.query.grain
  if (grain === 'none' || grain === 'hour') return []
  const prior = comparisonWindow({ from, to }, kind)
  return bucketStarts(prior.from, prior.to, grain)
}

export interface SeriesTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{
    dataKey?: string | number
    value?: number | null
    color?: string
    payload?: Row
  }>
  titles: readonly string[]
  unit: MetricUnit
  t: Translate
  language: Language
}

/**
 * **Every series at that bucket, ranked, in one card.**
 *
 * This is the whole reason a compound chart is worth building: the reading task
 * is *which of these is highest here, and by how much*, and a tooltip that
 * names one series answers a question nobody asked. Sorted descending by value,
 * so the ranking is the reading rather than something to work out — and gaps
 * sort last, because an absent reading is not a low one.
 *
 * A gap renders as an em dash. `connectNulls={false}` says the same thing in
 * the plot; this says it in text.
 */
export function SeriesTooltip({
  active,
  payload,
  titles,
  unit,
  t,
  language,
}: SeriesTooltipProps) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const row = payload[0]?.payload
  if (row === undefined) return null

  const entries = payload
    .map((entry) => {
      const key = String(entry.dataKey ?? '')
      const comparison = key.startsWith('c')
      const index = Number(key.slice(1))
      return {
        key,
        comparison,
        title: titles[index] ?? '',
        color: entry.color,
        value: entry.value ?? null,
      }
    })
    .sort((a, b) => (b.value ?? Number.NEGATIVE_INFINITY) - (a.value ?? Number.NEGATIVE_INFINITY))

  return (
    /* The card's own direction, restored from the language — never on the SVG
       and never on the axis group. */
    <div
      dir={directionFor(language)}
      data-slot="series-tooltip"
      className="grid min-w-48 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-2"
    >
      <p className="font-medium text-foreground">
        <bdi>{row.label}</bdi>
      </p>

      <div className="grid gap-1">
        {entries.map((entry) => (
          <div key={entry.key} className="flex w-full items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              {/* The same hue as the line it names. A dashed entry keeps the
                  hue and loses the fill, which is the legend's rule too. */}
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={
                  entry.comparison
                    ? { border: `1.5px dashed ${entry.color ?? 'currentColor'}` }
                    : { background: entry.color ?? 'currentColor' }
                }
              />
              <span className="min-w-0 truncate">
                <bdi>{entry.title}</bdi>
              </span>
              {entry.comparison && row.comparisonLabel !== null && (
                <span className="shrink-0 text-xs">
                  <bdi>{t('rb.panel.tooltip.on', { date: row.comparisonLabel })}</bdi>
                </span>
              )}
            </span>
            <span className="shrink-0 font-medium tabular-nums text-foreground">
              <bdi>
                {entry.value === null ? ABSENT : formatSeriesValue(entry.value, unit, language)}
              </bdi>
            </span>
          </div>
        ))}
      </div>

    </div>
  )
}

/** Re-exported so the headline row and the legend index the same series. */
export type { ReportSeries }
