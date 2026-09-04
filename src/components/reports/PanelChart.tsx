/**
 * One panel's plot — **one panel is one y-axis, and that is the whole of R4-1.**
 *
 * ```
 *  ╭ current     ── solid, --chart-series, pale --chart-fill beneath
 *  ╰ comparison  ── SAME HUE, dashed. Never a second colour.
 * ```
 *
 * `ReportResult` carries no `yAxis` and no `sharedScale` flag. Every series
 * names a `panelId`, and **two series share a y-axis if and only if they share
 * a panel** — the only pair that ever does is a measure and its own period
 * comparison, which is the same number at the same scale and which §3.7 already
 * rules is one hue with the comparison dashed. So this component receives one
 * panel and cannot be handed two measures to overlay; small multiples are not a
 * rendering it selects, they are what the result already is.
 *
 * R4-1 §1.2(c) is why that matters more than colour: *drivers vs passengers*
 * differ by an order of magnitude by construction, so on a shared axis the
 * captains line is a flat trace and its trend — the thing the owner asked to
 * see — is invisible. **Two hues would make it a coloured flat trace.**
 *
 * Rules applied
 *   §3.7        single-hue line, thin, very pale area fill beneath; the
 *               comparison is the SAME hue dashed; **no gridlines beyond the
 *               axis baseline**; axis labels carry their own formatting.
 *
 *               The two `<CartesianGrid horizontal={false} vertical={false} />`
 *               that used to say so are **deleted**, not kept: both axes were
 *               off, so the element painted nothing while reading as a grid
 *               that had been configured. §3.7 is the rule and this comment is
 *               where it is recorded. `TrendChart`'s 2026-09-02 amendment
 *               restoring horizontal rules is **not** extended here, and that
 *               is deliberate rather than an oversight: its argument is a
 *               ~300px board plot *"where the number is the page"*, and a
 *               report panel is a 176px small multiple that already carries a
 *               four-tick y-axis in a 56px gutter. Widening the amendment to a
 *               second chart family is a design decision, not a cleanup, and it
 *               belongs to whoever owns §3.7.
 *   §3.7        there is no `--chart-3`. shadcn's `--chart-1…5` ramp is DELETED
 *               in `globals.css`, not remapped, and this file mints nothing.
 *   **Q5**      Recharts ships ~30 colour literals as prop defaults, which pass
 *               a source audit because they live in `node_modules`. Every
 *               stroke and fill below is set explicitly on top of the defence
 *               block `globals.css` keys on the chart slot.
 *   §9.2        **the plot area does not mirror.** The plot is pinned one
 *               direction while the card around it mirrors normally; a reversed
 *               time axis makes the axis and its numerals run opposite ways.
 *   §9.2        **the TOOLTIP is the exception, and it is chrome.** See
 *               `PanelTooltip`.
 *   §A10        the tooltip is a CARD — series name, the bucket's own date, the
 *               value, and a footer naming a real destination. See below.
 *   §7.5        a **gap** is not a zero. Nulls break the line, and the panel
 *               states the reading count in words. A zero inside coverage is a
 *               real zero and draws on the baseline.
 *   §3.5        a **partial** bucket is drawn and marked, never dropped and
 *               never extrapolated — the pale band over it is that mark. See
 *               `PartialMarks`, and the measurement that rewrote it.
 *   §P4/§A10    a datapoint is a JUMPING-OFF POINT — the destination the
 *               tooltip names is also a real anchor, and a click on the bucket
 *               under the cursor follows it. See `datapointProps`.
 *               **The anchor itself moved to `PanelCard`'s foot** and this
 *               component now takes a ref to it: it used to render one row
 *               under the plot, so the one panel in a row whose measure named a
 *               board pushed its legend 24px lower than its neighbour's and the
 *               row stopped reading as a set. One slot, on every panel, at the
 *               card foot — see `PanelCard.BoardAction`.
 *               **Verified in Chromium, not inferred.** jsdom gives recharts a
 *               zero box and renders no SVG at all (measured: `0` svg elements
 *               in `render(<PanelChart/>)`), so nothing about a plotted mark is
 *               assertable in this repository. `scratch/rb-datapoint2.mjs`
 *               reports the anchor, its `href`, the Tab count that reaches it
 *               and the URL either side of both a keyboard Enter and a real
 *               mouse press on the plot.
 *   R18         no animation, ever.
 */

import type { RefObject } from 'react'
import { Area, AreaChart, Bar, BarChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import type { MouseHandlerDataParam } from 'recharts/types/synchronisation/types'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { formatSeriesValue } from '@/components/metrics'
import { bucketStarts, comparisonWindow } from '@/data/clients'
import { ABSENT, directionFor, formatDate, type Language, type Translate } from '@/lib'
import type { MetricUnit, ReportPanel, ReportResult, ReportSeries } from '@/data/types'

/** The two roles. Both resolve to the same hue; they differ by DASH, never by hue. */
/**
 * **Nothing painted inside the plot is its own hit target, and that is what
 * makes §P4's click work at all.**
 *
 * Recharts re-renders on `mousedown` — the pointer state moves and the active
 * dot mounts — so a press that lands on a series shape is released on a
 * different node and **Chromium emits no `click` event at all**. Measured on
 * `/management/reports/RPT-1` (`scratch/rb-click-probe7.mjs`), pressing on the
 * drawn area:
 *
 * ```
 *   mousedown: g.recharts-layer recharts-area
 *   mouseup:   path.recharts-curve recharts-area-area
 *   — no click —
 * ```
 *
 * With every mark inert the press and the release both land on
 * `.recharts-surface`, which no re-render replaces, and the click fires. The
 * same trace afterwards reads `mousedown/mouseup/click: recharts-surface`.
 *
 * **It costs nothing, because no mark here was ever individually interactive.**
 * The tooltip is axis-shared: it resolves from the pointer's x against the
 * category axis on the wrapper's `mousemove`, not from hovering a shape, so it
 * is unaffected — verified by hovering the plot and reading the card back.
 * (`DistributionCard`'s pie is the opposite case and is deliberately untouched:
 * a pie tooltip IS item-driven and its slices must stay hit targets.)
 */
const INERT = { pointerEvents: 'none' } as const

const CHART_CONFIG = {
  current: { label: 'current', color: 'var(--chart-series)' },
  comparison: { label: 'comparison', color: 'var(--chart-comparison)' },
} satisfies ChartConfig

/**
 * One x position, and **the two dates it stands for** rather than the one.
 *
 * `label` is the CURRENT window's bucket and is what the axis carries.
 * `comparisonLabel` is the bucket the dashed reading was taken in, which is a
 * different date by definition — the two windows are zipped by INDEX, not by
 * date. `TrendChart.Row` carries the identical pair for the identical reason,
 * and its header states the defect in full: without it a tooltip prints a value
 * from one day under a heading naming another, unmarked. That is not a polish
 * gap; it is the tooltip stating a fact that is false.
 *
 * `null` when there is no comparison window, or when the prior window produced
 * fewer buckets than this one and this index falls off its end.
 */
interface Row {
  label: string
  comparisonLabel: string | null
  current: number | null
  comparison: number | null
}

export interface PanelChartProps {
  panel: ReportPanel
  result: ReportResult
  /** `line` or `bar`. A pie and a table are not one panel's shape — see `DistributionChart`. */
  kind: 'line' | 'bar'
  /** Names the plot for anyone who cannot see it (§7.5). Already translated. */
  description: string
  /**
   * **§A10's first line — the series name.** Resolved by `PanelCard`, which
   * already computes it for the card title and for the read sentence, so the
   * tooltip cannot name the panel differently from the card around it. Passed
   * rather than imported: `panelTitle` lives in `PanelCard`, which imports this
   * file, and reaching back for it would close an import cycle.
   */
  title: string
  /**
   * **§A10's footer, and it is a real destination or it is nothing.** The board
   * that displays this same measure, already resolved and translated by
   * `PanelCard` from `Measure.displayedAsMetricKeys`. `null` when the measure
   * names none — an empty `displayedAsMetricKeys` **is a claim**
   * (`measure.ts:281–291`) and the honest rendering of it is no line at all,
   * never a dead `Click for Actions`.
   */
  boardLabel: string | null
  /**
   * **§P4 — the same destination, as a route rather than a sentence.**
   *
   * `boardLabel` names the board; this is the path `relatedBoards` already
   * resolved it to, which is a **real route from the route table** or nothing:
   * `PanelCard.relatedBoards` drops any key that names no route, so this can
   * never point at a destination that does not exist.
   *
   * Optional, and its absence is meaningful rather than a default: with no
   * path there is no anchor, the plot takes no click, and §A10's *Click for
   * Actions* is not offered at all. An empty `displayedAsMetricKeys` **is a
   * claim** (`measure.ts:281–291`) and the honest rendering of it is no
   * affordance, never a dead one.
   *
   * **Passed by `PanelCard` on the builder path only**, off the same `related`
   * signal that draws §A12's strip — `ResultCanvas.Body` records why that one
   * signal decides builder-versus-tile for everything. A dashboard tile is a
   * *reading*: its title is already the link out, and a per-panel action row on
   * a nine-tile board is nine more anchors nobody asked for.
   */
  boardPath?: string | null
  /**
   * **The anchor §P4's datapoint click activates, owned by the card.**
   *
   * The click is a delegation rather than a `useNavigate` for the reason
   * `openBoard` gives: one destination, one implementation of reaching it, and
   * a component that still renders outside a `<Router>` — `panelCard.test.tsx`
   * renders the card with no router at all, and a hook that throws there would
   * take the whole card down.
   *
   * The anchor used to be a sibling of the plot inside this component. It now
   * sits in the card's foot beside the legend, so the ref has to come in from
   * outside. Absent ref, absent click: `boardPath` alone never navigates.
   */
  actionRef?: RefObject<HTMLAnchorElement | null>
  t: Translate
  language: Language
}

export function seriesOfPanel(result: ReportResult, panel: ReportPanel, role: ReportSeries['role']) {
  return result.series.find((s) => s.panelId === panel.panelId && s.role === role) ?? null
}

/**
 * The prior window's buckets, **derived from the same `comparisonWindow` the
 * legend and the read sentence use** — so the date this tooltip puts under a
 * dashed value and the date the legend's chip names cannot drift.
 */
function comparisonBuckets(result: ReportResult): string[] {
  const kind = result.query.periodComparison
  const from = result.buckets[0]
  const to = result.buckets[result.buckets.length - 1]
  if (kind === 'none' || from === undefined || to === undefined) return []
  const grain = result.query.grain
  /* `bucketStarts` throws on `hour` and collapses `none` to a single bucket;
     neither shape reaches this component, and guarding costs less than relying
     on that. */
  if (grain === 'none' || grain === 'hour') return []
  const prior = comparisonWindow({ from, to }, kind)
  return bucketStarts(prior.from, prior.to, grain)
}

export function PanelChart({
  panel,
  result,
  kind,
  description,
  title,
  boardLabel,
  boardPath = null,
  actionRef,
  t,
  language,
}: PanelChartProps) {
  const current = seriesOfPanel(result, panel, 'current')
  const comparison = seriesOfPanel(result, panel, 'comparison')
  const priorBuckets = comparison ? comparisonBuckets(result) : []

  /* The two windows are zipped by INDEX, not by date: a like-for-like previous
     period has different dates by definition, so joining on the date would drop
     every comparison point. The axis carries the CURRENT window's dates, which
     is what the legend then disambiguates by naming both periods. */
  const rows: Row[] = result.buckets.map((bucket, index) => {
    const against = priorBuckets[index]
    return {
      label: formatDate(bucket, { style: 'day-month', language }),
      comparisonLabel:
        against === undefined ? null : formatDate(against, { style: 'day-month', language }),
      current: current?.points[index] ?? null,
      comparison: comparison?.points[index] ?? null,
    }
  })

  const tick = (value: number) => formatSeriesValue(value, panel.unit, language)
  const partials = current?.partialBucketIndexes ?? []
  /* One predicate for three things — the anchor, the series' click and the
     wording of the tooltip's footer — so the surface cannot promise an action
     it does not carry, or carry one it never announced. */
  const actionable = boardPath !== null && boardLabel !== null
  const tooltip = (
    <PanelTooltip
      title={title}
      unit={panel.unit}
      boardLabel={boardLabel}
      actionable={actionable}
      t={t}
      language={language}
    />
  )

  /**
   * **§P4, and the reason the click is a delegation rather than a `navigate`.**
   *
   * The anchor in the card's foot IS the navigation: it is in the tab order, it
   * carries the primitive's ring, its destination is in the status bar before
   * the click and it opens in a new tab on the modifier every operator knows.
   * The datapoint then does what §A10 promises — *"a datapoint is a jumping-off
   * point"* — by activating that same anchor, so there is **one** destination
   * and one implementation of reaching it rather than a `useNavigate` that
   * would have to be kept in step with the link beside it.
   *
   * It is also what keeps this component renderable outside a `<Router>`:
   * `useNavigate` throws there, and `panelCard.test.tsx` renders the card with
   * no router at all. A ref throws nowhere.
   */
  const openBoard =
    actionable && actionRef ? () => actionRef.current?.click() : undefined

  return (
    /* §9.2 — the plot is pinned one direction. This is the only physical
       direction in the module and it is the one the rule requires. **The pin,
       and `role="img"`, stop at this element**: a link inside a `role="img"`
       is removed from the accessibility tree, and chrome mirrors with the
       page. So §P4's action is NOT a child of the figure — it is in the card's
       foot, outside this component entirely. */
    <div dir="ltr" role="img" aria-label={description} className="min-w-0">
      <ChartContainer config={CHART_CONFIG} className="aspect-auto h-44 w-full">
        {kind === 'line' ? (
          <AreaChart
            accessibilityLayer
            data={rows}
            margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
            {...datapointProps(openBoard)}
          >
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: 'var(--chart-axis)' }}
              tickMargin={8}
              minTickGap={16}
              tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
            />
            <YAxis
              width={56}
              tickLine={false}
              axisLine={false}
              tickCount={4}
              /* A count axis over a 0–2 domain gets ticks at 0, 0.67, 1.33, 2
                 and rounds them to `0 1 1 2` — an axis showing one label
                 twice. Only counts are integral. */
              allowDecimals={panel.unit !== 'count'}
              tickFormatter={tick}
              tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
            />
            <ChartTooltip cursor={{ stroke: 'var(--chart-grid)' }} content={tooltip} />
            {/* Comparison FIRST, so the current period paints over it. */}
            {comparison && (
              <Area
                dataKey="comparison"
                type="monotone"
                stroke="var(--color-comparison)"
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
              dataKey="current"
              type="monotone"
              stroke="var(--color-current)"
              strokeWidth={1.5}
              fill="var(--chart-fill)"
              fillOpacity={1}
              style={INERT}
              /* A one-point window, and a reading with gaps either side, both
                 draw nothing without a dot. */
              dot={{ r: 2, fill: 'var(--color-current)', stroke: 'none', style: INERT }}
              activeDot={{ r: 3, fill: 'var(--color-current)', stroke: 'var(--card)', style: INERT }}
              /* A gap BREAKS the line. Joining across it would draw a value
                 that was never measured. */
              connectNulls={false}
              isAnimationActive={false}
            />
            <PartialMarks partials={partials} rows={rows} />
          </AreaChart>
        ) : (
          <BarChart
            accessibilityLayer
            data={rows}
            margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
            {...datapointProps(openBoard)}
          >
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: 'var(--chart-axis)' }}
              tickMargin={8}
              minTickGap={16}
              tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
            />
            <YAxis
              width={56}
              tickLine={false}
              axisLine={false}
              tickCount={4}
              allowDecimals={panel.unit !== 'count'}
              tickFormatter={tick}
              tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
            />
            <ChartTooltip cursor={{ fill: 'var(--chart-grid)' }} content={tooltip} />
            {comparison && (
              /* Same hue, and the comparison bar is the paler one. A second
                 hue is what §3.7 forbids; a second opacity is not a second
                 hue. */
              <Bar
                dataKey="comparison"
                fill="var(--chart-fill)"
                isAnimationActive={false}
                style={INERT}
              />
            )}
            <Bar
              dataKey="current"
              fill="var(--color-current)"
              isAnimationActive={false}
              style={INERT}
            />
            <PartialMarks partials={partials} rows={rows} />
          </BarChart>
        )}
      </ChartContainer>
    </div>
  )
}

/**
 * §P4's click — **on the chart, gated on a bucket actually being under the
 * cursor, and that arrangement is a measurement rather than a preference.**
 *
 * The obvious version is `onClick` on the `Area` and the `Bar`, so that only
 * the drawn datum takes it. It was written that way first. **In Chromium it
 * never fires** (`scratch/rb-click-probe6.mjs`,
 * `/management/reports/RPT-1`, 2026-09-04). A document-level capture trace of
 * one real press over the plotted series:
 *
 * ```
 *   down: g.recharts-layer recharts-area
 *   up:   path.recharts-curve recharts-area-area
 *   (no click event at all)
 * ```
 *
 * Recharts re-renders on `mousedown` — the pointer state moves, the active dot
 * mounts — so the node under the press is not the node under the release, and
 * the browser emits no `click`. A synthetic `dispatchEvent(new MouseEvent(…))`
 * on the same path *did* navigate, which is exactly why a jsdom test would have
 * reported this working. **A handler that only fires when a test dispatches it
 * is the defect this module keeps shipping**, so it is not kept.
 *
 * The chart's own `onClick` is attached by `RechartsWrapper` to the wrapper
 * `<div>` (`chart/RechartsWrapper.js:337`), which is stable across those
 * re-renders, and recharts hands it the resolved pointer state. So the datum
 * still decides: `isTooltipActive` is true only where a bucket resolved under
 * the cursor, which is the same predicate that put the tooltip on screen —
 * *"the mark you are reading is the mark you are clicking"*. Outside the plot,
 * on the axis gutter and on the card's chrome, it is false and nothing happens.
 *
 * `activeIndex` is read as well as `isTooltipActive` so a resolved-but-indexless
 * state cannot navigate.
 *
 * The pointer cursor says so before the click. **`className` cannot carry it**:
 * `Area` writes `className="recharts-area-area"` *after* the caller's props are
 * spread (`cartesian/Area.js:201`), so a `cursor-pointer` handed in is silently
 * dropped — measured, the painted path's class list is exactly
 * `recharts-curve recharts-area-area`. `style` survives, and a cursor keyword is
 * not a value the token system governs: no colour, length or radius is inline.
 *
 * With no destination there is no handler, no cursor and nothing about the plot
 * changes.
 */
function datapointProps(openBoard: (() => void) | undefined) {
  if (openBoard === undefined) return {}
  return {
    onClick: (state: MouseHandlerDataParam) => {
      if (state.isTooltipActive && state.activeIndex !== undefined && state.activeIndex !== null) {
        openBoard()
      }
    },
    style: { cursor: 'pointer' },
  }
}

/**
 * **§A10 — the tooltip is a CARD, and the one place in this file that MIRRORS.**
 *
 * ```
 *  ┌──────────────────────────────────────┐
 *  │ Registered captains                  │  the series
 *  │ 21 Jun                               │  the bucket's own date
 *  │ This period                    312   │
 *  │ Previous period                287   │
 *  │   on 14 Jun                          │  ← the bucket that value came from
 *  │ ──────────────────────────────────── │
 *  │ See this measure on the Growth board │  a REAL destination, or nothing
 *  └──────────────────────────────────────┘
 * ```
 *
 * Amplitude's card carries a line reading `Dec 16: Anomaly` and ends
 * `Click for Actions`. **Neither is reproduced, and both refusals are load
 * bearing.**
 *
 * *No anomaly.* Nothing in this product computes one. A mark saying a reading
 * is anomalous when no model decided that is a fabricated claim inside a
 * confident frame, and it is the same objection `ChartToolbar` records against
 * Amplitude's `Anomaly + Forecast ✨`.
 *
 * *No `Click for Actions` as a LINK.* It is an instruction a Recharts tooltip
 * cannot keep: the wrapper is not a pointer-events target, so a link inside it
 * would be unclickable with a mouse and unreachable by keyboard — §7.2's exact
 * failure, dressed as an affordance.
 *
 * **The sentence, though, is kept — because Amplitude's own is not a link
 * either.** `Click for Actions` is a line of text that tells the reader the
 * mark under the cursor does something. So when the click IS live
 * (`actionable`) the footer states it in those terms and names where it goes;
 * when it is not, the footer stays a statement about the catalogue. The thing
 * that actually goes there is `BoardAction`, one row under the plot, which is a
 * real anchor in the tab order — so the announcement and the affordance are two
 * elements and neither is pretending to be the other.
 *
 * `directionFor(language)` restores the document direction on this card and on
 * nothing else. Recharts renders the tooltip INSIDE `ChartContainer`'s div
 * rather than in a portal, so it inherits the `dir="ltr"` correctly pinned on
 * the plot and lays Arabic copy out left-to-right. §9.2's prohibition names
 * *the plot area and the SVG axis group*; a tooltip is chrome and mirrors with
 * the page. `TrendChart.TrendTooltip` solved this first and this follows it
 * rather than re-solving it.
 *
 * **Why this is not `ChartTooltipContent`.** That component destructures
 * `className` and spreads nothing, so there is no way to hand it a `dir` — and
 * a direction is not a class, so no wrapper class can supply one either. It is
 * also unrenderable outside a `ChartContainer`, which puts every assertion
 * above out of reach of a test.
 *
 * Exported because these facts are testable only by rendering it.
 */
export interface PanelTooltipProps {
  /** Recharts injects these two by cloning the element. */
  active?: boolean
  payload?: ReadonlyArray<{ dataKey?: string | number; value?: number | null; payload?: Row }>
  title: string
  unit: MetricUnit
  boardLabel: string | null
  /**
   * **Whether the mark under the cursor actually does something** — §A10's
   * `Click for Actions`, as a fact rather than a slogan. `false` by default, so
   * a surface that draws no action (a dashboard tile) cannot announce one; the
   * caller sets it from the *same* predicate that renders `BoardAction`.
   */
  actionable?: boolean
  t: Translate
  language: Language
}

export function PanelTooltip({
  active,
  payload,
  title,
  unit,
  boardLabel,
  actionable = false,
  t,
  language,
}: PanelTooltipProps) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const row = payload[0]?.payload
  if (row === undefined) return null

  return (
    /* The card's own direction, restored from the language. Never on the SVG,
       never on the axis group — see the note above. */
    <div
      dir={directionFor(language)}
      data-slot="panel-tooltip"
      className="grid min-w-40 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-2"
    >
      <div className="grid gap-0.5">
        {/* The series, then the bucket. A panel title may carry a group value,
            which is user content and carries its own direction. */}
        <p className="font-medium text-foreground">
          <bdi>{title}</bdi>
        </p>
        <p className="text-muted-foreground">
          <bdi>{row.label}</bdi>
        </p>
      </div>

      <div className="grid gap-1.5">
        {payload.map((entry) => {
          const comparison = entry.dataKey === 'comparison'
          const on = comparison ? row.comparisonLabel : null
          return (
            <div
              key={String(entry.dataKey)}
              className="flex w-full items-start justify-between gap-2"
            >
              <span className="flex min-w-0 flex-col text-muted-foreground">
                <span>
                  {comparison ? t('rb.table.role.comparison') : t('rb.table.role.current')}
                </span>
                {on !== null && (
                  <span className="text-2xs">
                    <bdi>{t('rb.panel.tooltip.on', { date: on })}</bdi>
                  </span>
                )}
              </span>
              {/* A gap reads as an em dash, never as a zero — the rule
                  `connectNulls={false}` enforces in the plot, said in text. */}
              <span className="font-medium tabular-nums text-foreground">
                <bdi>
                  {typeof entry.value === 'number'
                    ? formatSeriesValue(entry.value, unit, language)
                    : ABSENT}
                </bdi>
              </span>
            </div>
          )
        })}
      </div>

      {boardLabel !== null && (
        /* A hairline on the block itself rather than a `Separator`: it is
           presentational, it has no side of its own, and it therefore needs
           neither a role nor mirroring. */
        <p className="border-t border-border/50 pt-1.5 text-muted-foreground">
          <bdi>
            {actionable
              ? t('rb.panel.tooltip.action', { board: boardLabel })
              : t('rb.panel.tooltip.board', { board: boardLabel })}
          </bdi>
        </p>
      )}
    </div>
  )
}

/**
 * How wide the mark is, in pixels.
 *
 * **A point scale has no bandwidth to borrow, so the width is stated.** On the
 * `bar` branch the axis is a band scale and a bucket has a measurable extent;
 * on the `line` branch it is a point scale and a bucket is a *position*. One
 * number gives both branches the same mark rather than one that silently
 * changes size with the chart type — and it is a MARK, not a measurement: it
 * says *this bucket*, it does not claim to be the bucket's exact extent.
 * Twelve is a little wider than a 30-bucket band (measured at 9px on a 480px
 * panel), so the mark stays legible where the band would be a hairline.
 */
const PARTIAL_MARK_WIDTH = 12

/**
 * §3.5's partial buckets, **rendered and marked** — and this is the second
 * attempt, because the first drew nothing at all.
 *
 * *"A flow measure's final partial bucket is what makes every trend look like a
 * collapse at the right-hand edge."* Dropping it hides a real reading; leaving
 * it unmarked hands the operator a collapse that is an artefact of the clock,
 * while `copy.ts`'s banner tells them it *"is drawn and marked"*.
 *
 * ## What was wrong: `<ReferenceArea x1={label} x2={label}>` on a point scale
 *
 * Recharts resolves that pair through the x-axis scale — `p1.x` at
 * `position:'start'`, `p2.x` at `position:'end'`, and `'end'` adds
 * `scale.bandwidth()`. The `bar` branch is a **band** scale, so the band was a
 * bucket wide and correct. The `line` branch is a **point** scale
 * (`combineRealScaleType` returns `'point'` for a `type:'category'` axis with
 * `scale:'auto'` inside an `AreaChart`), `d3.scalePoint().bandwidth()` is
 * always `0`, the rect's width was `0`, and `Rectangle` returns `null` outright.
 *
 * **Measured, not inferred** (2026-09-04, Chromium, `/management/reports/RPT-1`
 * — `last-30d`, `day`, so 25 Jun is partial): on `line`,
 * `.recharts-reference-area` existed as an empty `<g>` with **zero** child
 * shapes; on `bar`, two 9px paths. `line` is the default chart type for every
 * new report and for five of the ten seeded ones, so on most reports the mark
 * was absent while the copy above the plot asserted it.
 *
 * ## What it is now: one `ReferenceLine`, stated width, over the series
 *
 * `ReferenceLine` places itself at `position: 'middle'`, which a point scale
 * *and* a band scale both answer — the point, and the band's centre — so one
 * element marks the bucket on both branches. The width comes from
 * `strokeWidth` rather than from the scale, which is what makes it independent
 * of `bandwidth()`.
 *
 * **It paints over the series rather than behind it**, which reverses the
 * original intent and is the second thing the measurement changed. Recharts
 * 3.8 puts `ReferenceLine` at zIndex 400 and `Area`/`Bar` at 100/300, so the
 * mark is in front by construction. Behind, it was invisible twice over: the
 * area's `--chart-fill` is opaque and a bar is opaque, so the only place a
 * band showed at all was the headroom above the series — and on a chart whose
 * readings sit near the top of a `nice` axis there is barely any. A mark only
 * visible on charts with slack is not a mark.
 *
 * So it is a **scrim**: the axis tone at low opacity, wide enough to see and
 * pale enough that §3.5's *"drawn"* survives — the reading underneath stays
 * legible, which is the whole point of not dropping the bucket. No token is
 * minted; `--chart-axis` is the tone the axis already carries.
 *
 * `ifOverflow="extendDomain"` clips it to the plot, so a *first* partial bucket does
 * not bleed six pixels into the y-axis gutter.
 *
 * The panel states the same fact in words above the plot, and `ResultTable`
 * marks the column, for anyone who cannot see the scrim.
 */
function PartialMarks({ partials, rows }: { partials: readonly number[]; rows: readonly Row[] }) {
  if (partials.length === 0) return null
  return (
    <>
      {partials.map((index) => {
        const row = rows[index]
        if (!row) return null
        return (
          <ReferenceLine
            key={index}
            x={row.label}
            stroke="var(--chart-axis)"
            strokeOpacity={0.32}
            strokeWidth={PARTIAL_MARK_WIDTH}
            ifOverflow="extendDomain"
            className="recharts-partial-bucket"
            style={INERT}
          />
        )
      })}
    </>
  )
}
