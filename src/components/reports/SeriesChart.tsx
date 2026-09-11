/**
 * One compound plot, every series sharing one axis — R4-1: a `ReportPanel` is
 * the unit two series may share a scale, and `ResultCanvas` groups by
 * `(unit, currency)` before calling this once per group. §3.7: colour is
 * series identity (`--chart-s1…s8`), the comparison differs by dash, never
 * hue. `INERT` (see below) on every mark except the brush handles (§2.5).
 */

import { useEffect, useId, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  LabelList,
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
import type { Annotation } from '@/data/types/annotation'
import { AnnotationMarks } from './AnnotationMarks'

/**
 * **Do not remove.** See the header — with marks hit-testable, the click that
 * opens a board never fires in Chromium and every test still passes.
 */
const INERT = { pointerEvents: 'none' } as const

/** The trend-family kinds this component draws. `kpi` is `KpiCard`, not a plot (§4.1). */
export type SeriesChartKind =
  | 'line'
  | 'area'
  | 'bar'
  | 'stacked-bar'
  | 'stacked-100'
  | 'horizontal-bar'

/**
 * The six categorical stops, in draw order, plus v2's `--chart-s7`/`-s8`
 * (`docs/09-analytics-v2/02-report-builder-v2.md` §4.8). Eight rather than
 * more because a ninth hue that separates from the other eight under
 * deuteranopia does not exist at this lightness.
 */
const SERIES_STOPS = [
  'var(--chart-s1)',
  'var(--chart-s2)',
  'var(--chart-s3)',
  'var(--chart-s4)',
  'var(--chart-s5)',
  'var(--chart-s6)',
  'var(--chart-s7)',
  'var(--chart-s8)',
] as const

const FILL_STOPS = [
  'var(--chart-fill-s1)',
  'var(--chart-fill-s2)',
  'var(--chart-fill-s3)',
  'var(--chart-fill-s4)',
  'var(--chart-fill-s5)',
  'var(--chart-fill-s6)',
  'var(--chart-fill-s7)',
  'var(--chart-fill-s8)',
] as const

/** §4.8 — `Other` never takes a hue. */
export const OTHER_COLOR = 'var(--muted-foreground)'

/**
 * **The one lookup three surfaces share.** The dot above the number, the line
 * in the plot and the chip in the legend all call this with the same index, so
 * they cannot drift. Wraps rather than throwing past eight: a folded split can
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
 * **The ninth series onwards, and why it may take the dash.** Past the
 * eight-hue palette the second lap is dotted (`1 3`), deliberately not the
 * comparison's `4 3` long dash, so the two never resemble each other. The two
 * cases cannot co-occur: a comparison draws only at two series or fewer, and a
 * second lap only exists at nine or more.
 */
export function seriesDash(index: number): string | undefined {
  return index < SERIES_STOPS.length ? undefined : '1 3'
}

/** Recharts needs flat keys, and a panel id is not one. Index-addressed. */
const currentKey = (index: number) => `s${index}`
const comparisonKey = (index: number) => `c${index}`

/** The legend's toggle id for the comparison entry — it toggles as one unit (§2.1). */
export const COMPARISON_SERIES_ID = '__comparison__'

/** Matches `AnnotationMarks`' own positioning maths — exported so it never drifts from this file's `margin`. */
export const CHART_MARGIN = { top: 8, right: 8, bottom: 0, left: 4 } as const
export const Y_AXIS_WIDTH = 56

interface Row {
  label: string
  /** The date the DASHED reading was taken on — a different day by definition. */
  comparisonLabel: string | null
  partial: boolean
  [seriesKey: string]: string | number | null | boolean
}

export interface SeriesChartProps {
  /**
   * **Every panel drawn here shares one `(unit, currency)` pair**, and the
   * caller is what guarantees it. See the header: one axis is a claim.
   */
  panels: readonly ReportPanel[]
  result: ReportResult
  kind: SeriesChartKind
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
  /** `panelId`s excluded from the plot, the y-domain and the tooltip (§2.1). */
  hidden?: readonly string[]
  /** §2.3 — never disabled by this component; the caller (`View` menu) computes legality. */
  yScale?: 'linear' | 'log'
  yStartAtZero?: boolean
  dataLabels?: boolean
  /** §2.4 — drawn only where the date falls inside the currently visible window. */
  annotations?: readonly Annotation[]
  /** §2.5 — controlled brush domain. `null` is the full window (unzoomed). */
  brushRange?: { startIndex: number; endIndex: number } | null
  onBrushChange?: (range: { startIndex: number; endIndex: number }) => void
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
  hidden = [],
  yScale = 'linear',
  yStartAtZero,
  dataLabels = false,
  annotations = [],
  brushRange = null,
  onBrushChange,
  heightClass = 'h-72',
  t,
  language,
}: SeriesChartProps) {
  const startAtZero = yStartAtZero ?? (kind === 'bar' || kind === 'stacked-bar' || kind === 'stacked-100')
  const hiddenSet = new Set(hidden)
  const visiblePanelIndexes = panels
    .map((_, index) => index)
    .filter((index) => !hiddenSet.has(panels[index]!.panelId))

  const currents = panels.map(
    (panel) =>
      result.series.find((s) => s.panelId === panel.panelId && s.role === 'current') ?? null,
  )

  /* The comparison is drawn only where it can still be read — see the header.
     The delta above the plot carries it in every other case. */
  const withComparison = panels.length <= 2 && !hiddenSet.has(COMPARISON_SERIES_ID)
  const comparisons = withComparison
    ? panels.map(
        (panel) =>
          result.series.find((s) => s.panelId === panel.panelId && s.role === 'comparison') ?? null,
      )
    : panels.map(() => null)
  const anyComparison = comparisons.some((s) => s !== null)
  const priorBuckets = anyComparison ? comparisonBuckets(result) : []

  const partialSet = new Set(
    currents.find((s) => s !== null && s.partialBucketIndexes.length > 0)?.partialBucketIndexes ?? [],
  )

  const rows: Row[] = result.buckets.map((bucket, index) => {
    const against = priorBuckets[index]
    const row: Row = {
      label: formatDate(bucket, { style: 'day-month', language }),
      comparisonLabel:
        against === undefined ? null : formatDate(against, { style: 'day-month', language }),
      partial: partialSet.has(index),
    }
    currents.forEach((series, s) => {
      if (!hiddenSet.has(panels[s]!.panelId)) row[currentKey(s)] = series?.points[index] ?? null
    })
    comparisons.forEach((series, s) => {
      row[comparisonKey(s)] = series?.points[index] ?? null
    })
    return row
  })

  /* `stacked-100`: normalised per bucket, over the VISIBLE (non-hidden)
     series only — a hidden bar should not leave the rest under 100%. */
  const stackRows =
    kind === 'stacked-100'
      ? rows.map((row) => {
          const total = visiblePanelIndexes.reduce((sum, i) => {
            const v = row[currentKey(i)]
            return sum + (typeof v === 'number' ? v : 0)
          }, 0)
          const next: Row = { ...row }
          visiblePanelIndexes.forEach((i) => {
            const v = row[currentKey(i)]
            next[currentKey(i)] = typeof v === 'number' && total > 0 ? (v / total) * 100 : (v ?? null)
          })
          return next
        })
      : rows

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

  /* One VISIBLE series keeps §3.7's pale wash; two or more do not. `area` is
     always exactly one series by construction (legality caps it there). */
  const filled = kind === 'area' || (kind === 'line' && visiblePanelIndexes.length === 1)

  const tooltip = (
    <SeriesTooltip
      panels={panels}
      titles={titles}
      unit={kind === 'stacked-100' ? 'percent' : unit}
      hidden={hidden}
      t={t}
      language={language}
    />
  )

  const valueFormatter = (value: number) =>
    formatSeriesValue(value, kind === 'stacked-100' ? 'percent' : unit, language)

  const axes = (
    <>
      {/**
       * **Horizontal gridlines, which §3.7 rules out and the owner ruled in.**
       * See the earlier revision of this file for the derivation; unchanged.
       */}
      <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={{ stroke: 'var(--chart-axis)' }}
        tickMargin={8}
        /* §4.4 — at most one label per 64px; recharts skips a tick whose own
           label would sit closer than this to its neighbour. Text never
           rotates (unset here, and nothing in this file sets a transform). */
        minTickGap={64}
        interval="preserveStartEnd"
        tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
      />
      <YAxis
        width={Y_AXIS_WIDTH}
        tickLine={false}
        axisLine={false}
        tickCount={5}
        scale={yScale === 'log' ? 'log' : 'linear'}
        domain={yScale === 'log' ? ['auto', 'auto'] : startAtZero ? [0, 'auto'] : ['auto', 'auto']}
        allowDataOverflow={false}
        /* A count axis over a 0–2 domain rounds its ticks to `0 1 1 2`. Only counts are integral. */
        allowDecimals={unit !== 'count' || kind === 'stacked-100'}
        tickFormatter={(tick: number) => valueFormatter(tick)}
        tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
      />
      <ChartTooltip
        cursor={
          kind === 'bar' || kind === 'stacked-bar' || kind === 'stacked-100'
            ? { fill: 'var(--chart-grid)' }
            : { stroke: 'var(--chart-grid)' }
        }
        content={tooltip}
      />
      {/**
       * §3.5's partial buckets, **drawn and marked** — a scrim over the series,
       * not behind it. See the earlier revision for the `ReferenceArea` vs
       * `ReferenceLine` derivation; unchanged.
       */}
      {[...partialSet].map((index) => {
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

  const margin = CHART_MARGIN
  const bucketCount = result.buckets.length
  const withBrush = bucketCount >= 30 && kind !== 'horizontal-bar'
  const brushStart = brushRange?.startIndex ?? 0
  const brushEnd = brushRange?.endIndex ?? Math.max(0, bucketCount - 1)

  const dataLabelList = (key: string, position: 'top' | 'right' = 'top') =>
    dataLabels ? (
      <LabelList
        dataKey={key}
        position={position}
        className="fill-muted-foreground"
        fontSize={10}
        formatter={(value: unknown) => (typeof value === 'number' ? valueFormatter(value) : '')}
      />
    ) : undefined

  /* §2.2 — arrow keys move the active bucket while the region has focus; the
     description node carries the readout so a screen-reader user hears it
     without a mouse (`rtl.md`: this mapping does NOT mirror). */
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const describeId = useId()
  const activeDescription = useMemo(() => {
    if (activeIndex === null) return ''
    const row = stackRows[activeIndex]
    if (row === undefined) return ''
    const parts = visiblePanelIndexes.map((i) => {
      const v = row[currentKey(i)]
      const value = typeof v === 'number' ? valueFormatter(v) : ABSENT
      return `${titles[i] ?? ''}: ${value}`
    })
    const partial = row.partial ? `, ${t('rb.chart.tooltip.partial')}` : ''
    return `${row.label}${partial} · ${parts.join(', ')}`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, stackRows])

  useEffect(() => {
    setActiveIndex(null)
  }, [result])

  const lo = withBrush ? brushStart : 0
  const hi = withBrush ? brushEnd : bucketCount - 1

  const onRegionKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (kind === 'horizontal-bar') return
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      setActiveIndex((current) => {
        const base = current ?? lo
        const next = event.key === 'ArrowRight' ? base + 1 : base - 1
        return Math.min(hi, Math.max(lo, next))
      })
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(lo)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(hi)
    } else if (withBrush && onBrushChange && (event.key === '[' || event.key === ']')) {
      event.preventDefault()
      if (event.key === '[') {
        onBrushChange({ startIndex: Math.min(brushEnd - 1, brushStart + 1), endIndex: brushEnd })
      } else {
        onBrushChange({ startIndex: brushStart, endIndex: Math.max(brushStart + 1, brushEnd - 1) })
      }
    }
  }

  const visibleBucketStarts = result.buckets.slice(lo, hi + 1)

  return (
    /* §9.2 — the plot is pinned one direction, and the pin stops at this
       element. §2.2 — `role="group"` with a description node, not `role="img"`,
       because the region is now keyboard-navigable rather than a static
       picture. */
    <div
      dir="ltr"
      role="group"
      tabIndex={0}
      aria-label={description}
      aria-describedby={describeId}
      onKeyDown={onRegionKeyDown}
      className="relative min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span id={describeId} className="sr-only" role="status">
        {activeDescription}
      </span>
      <ChartContainer config={config} className={`aspect-auto w-full ${heightClass}`}>
        {kind === 'horizontal-bar' ? (
          <HorizontalBarLayer
            panels={panels}
            currents={currents}
            titles={titles}
            colorIndexes={colorIndexes}
            hiddenSet={hiddenSet}
            valueFormatter={valueFormatter}
            tooltip={tooltip}
          />
        ) : kind === 'bar' || kind === 'stacked-bar' || kind === 'stacked-100' ? (
          <BarChart accessibilityLayer data={stackRows} margin={margin}>
            {axes}
            {/* Comparison first, so the current window paints over it. On a
                STACKED chart the comparison is never stacked — an unfilled,
                dashed OUTLINE bar behind the stack (§4.1, AC-1132). */}
            {comparisons.map((series, index) =>
              series === null || hiddenSet.has(panels[index]!.panelId) ? null : (
                <Bar
                  key={comparisonKey(index)}
                  dataKey={comparisonKey(index)}
                  fill={kind === 'bar' ? seriesFill(colorIndexes[index] ?? index) : 'none'}
                  stroke={
                    kind === 'bar' ? undefined : `var(--color-${comparisonKey(index)})`
                  }
                  strokeDasharray={kind === 'bar' ? undefined : '4 3'}
                  isAnimationActive={false}
                  style={INERT}
                />
              ),
            )}
            {panels.map((panel, index) =>
              hiddenSet.has(panel.panelId) ? null : (
                <Bar
                  key={currentKey(index)}
                  dataKey={currentKey(index)}
                  stackId={kind === 'bar' ? undefined : 's'}
                  fill={`var(--color-${currentKey(index)})`}
                  isAnimationActive={false}
                  style={INERT}
                >
                  {dataLabelList(currentKey(index))}
                </Bar>
              ),
            )}
            {withBrush && (
              <Brush
                dataKey="label"
                height={20}
                travellerWidth={8}
                stroke="var(--chart-axis)"
                fill="var(--muted)"
                startIndex={brushStart}
                endIndex={brushEnd}
                onChange={(range) => {
                  if (onBrushChange && range.startIndex !== undefined && range.endIndex !== undefined) {
                    onBrushChange({ startIndex: range.startIndex, endIndex: range.endIndex })
                  }
                }}
              />
            )}
          </BarChart>
        ) : filled ? (
          <AreaChart accessibilityLayer data={rows} margin={margin}>
            {axes}
            {comparisons[0] && !hiddenSet.has(COMPARISON_SERIES_ID) && (
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
            >
              {dataLabelList(currentKey(0))}
            </Area>
            {withBrush && (
              <Brush
                dataKey="label"
                height={20}
                travellerWidth={8}
                stroke="var(--chart-axis)"
                fill="var(--muted)"
                startIndex={brushStart}
                endIndex={brushEnd}
                onChange={(range) => {
                  if (onBrushChange && range.startIndex !== undefined && range.endIndex !== undefined) {
                    onBrushChange({ startIndex: range.startIndex, endIndex: range.endIndex })
                  }
                }}
              />
            )}
          </AreaChart>
        ) : (
          <LineChart accessibilityLayer data={rows} margin={margin}>
            {axes}
            {comparisons.map((series, index) =>
              series === null || hiddenSet.has(panels[index]!.panelId) || hiddenSet.has(COMPARISON_SERIES_ID) ? null : (
                <Line
                  key={comparisonKey(index)}
                  dataKey={comparisonKey(index)}
                  type="monotone"
                  stroke={`var(--color-${comparisonKey(index)})`}
                  strokeWidth={1.25}
                  strokeDasharray="4 3"
                  dot={false}
                  activeDot={false}
                  style={INERT}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ),
            )}
            {panels.map((panel, index) =>
              hiddenSet.has(panel.panelId) ? null : (
                <Line
                  key={currentKey(index)}
                  dataKey={currentKey(index)}
                  type="monotone"
                  stroke={`var(--color-${currentKey(index)})`}
                  strokeWidth={2}
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
                >
                  {dataLabelList(currentKey(index))}
                </Line>
              ),
            )}
            {withBrush && (
              <Brush
                dataKey="label"
                height={20}
                travellerWidth={8}
                stroke="var(--chart-axis)"
                fill="var(--muted)"
                startIndex={brushStart}
                endIndex={brushEnd}
                onChange={(range) => {
                  if (onBrushChange && range.startIndex !== undefined && range.endIndex !== undefined) {
                    onBrushChange({ startIndex: range.startIndex, endIndex: range.endIndex })
                  }
                }}
              />
            )}
          </LineChart>
        )}
      </ChartContainer>
      {kind !== 'horizontal-bar' && annotations.length > 0 && (
        <AnnotationMarks
          annotations={annotations}
          bucketStarts={visibleBucketStarts}
          marginLeft={margin.left}
          yAxisWidth={Y_AXIS_WIDTH}
          marginRight={margin.right}
          language={language}
        />
      )}
    </div>
  )
}

/**
 * §4.1 — `horizontal-bar`: one row per panel (a split, one measure, `grain:
 * 'none'`), sorted descending by value with `'__other__'` always last, value
 * labelled at the bar's end. A separate layer rather than a branch of the
 * shared `axes` fragment: the category axis here is the SPLIT, not time.
 */
function HorizontalBarLayer({
  panels,
  currents,
  titles,
  colorIndexes,
  hiddenSet,
  valueFormatter,
  tooltip,
}: {
  panels: readonly ReportPanel[]
  currents: readonly (ReportSeries | null)[]
  titles: readonly string[]
  colorIndexes: readonly number[]
  hiddenSet: ReadonlySet<string>
  valueFormatter: (value: number) => string
  tooltip: React.ReactElement
}) {
  const entries = panels
    .map((panel, index) => {
      const isOther = currents[index]?.groupValue === '__other__'
      return {
        id: panel.panelId,
        title: titles[index] ?? '',
        value: currents[index]?.points[0] ?? null,
        color: isOther ? OTHER_COLOR : seriesColor(colorIndexes[index] ?? index),
        isOther,
      }
    })
    .filter((entry) => !hiddenSet.has(entry.id))
    .sort((a, b) => {
      if (a.isOther !== b.isOther) return a.isOther ? 1 : -1
      return (b.value ?? -Infinity) - (a.value ?? -Infinity)
    })

  return (
    <BarChart accessibilityLayer data={entries} layout="vertical" margin={{ top: 8, right: 48, bottom: 0, left: 4 }}>
      <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
      <XAxis
        type="number"
        tickLine={false}
        axisLine={{ stroke: 'var(--chart-axis)' }}
        tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
        tickFormatter={(tick: number) => valueFormatter(tick)}
      />
      <YAxis
        type="category"
        dataKey="title"
        tickLine={false}
        axisLine={false}
        width={120}
        tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
      />
      <ChartTooltip cursor={{ fill: 'var(--chart-grid)' }} content={tooltip} />
      <Bar dataKey="value" isAnimationActive={false} style={INERT}>
        {entries.map((entry) => (
          <Cell key={entry.id} fill={entry.color} />
        ))}
        <LabelList
          dataKey="value"
          position="right"
          className="fill-muted-foreground"
          fontSize={11}
          formatter={(value: unknown) => (typeof value === 'number' ? valueFormatter(value) : ABSENT)}
        />
      </Bar>
    </BarChart>
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
  panels: readonly ReportPanel[]
  titles: readonly string[]
  unit: MetricUnit
  hidden?: readonly string[]
  t: Translate
  language: Language
}

/**
 * **Every visible series at that bucket, ranked, in one card** — §2.2's v2
 * tooltip. Grouped per series (current plus its own `vs` sub-row) rather than
 * current and comparison entries mixed and re-sorted together, so the ranking
 * answers *which of these is highest* without a dashed entry outranking the
 * series it belongs to.
 */
export function SeriesTooltip({
  active,
  payload,
  panels,
  titles,
  unit,
  hidden = [],
  t,
  language,
}: SeriesTooltipProps) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const row = payload[0]?.payload
  if (row === undefined) return null
  const hiddenSet = new Set(hidden)

  const entries = panels
    .map((panel, index) => {
      const key = currentKey(index)
      const found = payload.find((p) => String(p.dataKey ?? '') === key)
      if (found === undefined || hiddenSet.has(panel.panelId)) return null
      const compFound = payload.find((p) => String(p.dataKey ?? '') === comparisonKey(index))
      const value = found.value ?? null
      const comparisonValue = compFound?.value ?? null
      const delta =
        value !== null && comparisonValue !== null && comparisonValue !== 0
          ? (value - comparisonValue) / Math.abs(comparisonValue)
          : null
      return {
        key,
        title: titles[index] ?? '',
        color: found.color,
        value,
        comparisonValue,
        delta,
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => (b.value ?? Number.NEGATIVE_INFINITY) - (a.value ?? Number.NEGATIVE_INFINITY))

  return (
    /* The card's own direction, restored from the language — never on the SVG
       and never on the axis group. */
    <div
      dir={directionFor(language)}
      data-slot="series-tooltip"
      className="grid min-w-48 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs"
    >
      <p className="font-medium text-foreground">
        <bdi>{row.label}</bdi>
        {row.partial && <span className="ms-1 text-muted-foreground">({t('rb.chart.tooltip.partial')})</span>}
      </p>

      <div className="grid gap-1">
        {entries.map((entry) => (
          <div key={entry.key} className="flex flex-col gap-0.5">
            <div className="flex w-full items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: entry.color ?? 'currentColor' }}
                />
                <span className="min-w-0 truncate">
                  <bdi>{entry.title}</bdi>
                </span>
              </span>
              <span className="shrink-0 font-medium tabular-nums text-foreground">
                <bdi>{entry.value === null ? ABSENT : formatSeriesValue(entry.value, unit, language)}</bdi>
              </span>
            </div>
            {entry.comparisonValue !== null && row.comparisonLabel !== null && (
              <div className="flex w-full items-center justify-between gap-3 ps-3.5">
                <span className="shrink-0 text-muted-foreground">
                  <bdi>{t('rb.chart.tooltip.vs', { date: row.comparisonLabel })}</bdi>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  <bdi>
                    {formatSeriesValue(entry.comparisonValue, unit, language)}
                    {entry.delta !== null &&
                      ` (${entry.delta >= 0 ? '+' : ''}${(entry.delta * 100).toFixed(1)}%)`}
                  </bdi>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Re-exported so the headline row and the legend index the same series. */
export type { ReportSeries }
