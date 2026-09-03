/**
 * The metric-tile / chart-card component set — `DESIGN.md` §3.7, dressed to
 * `design/03-navattic-language.md` §4.9.
 *
 * Composed from the primitives already in `src/components/ui/`; nothing here
 * was added with `shadcn add` and `components.json` is frozen. §3.7's shapes —
 * a stat tile, a two-role trend, a legend naming both periods with dates, and
 * R4-4 §4.1's ranked list — have no shadcn equivalent, which is expected rather
 * than a gap in the stack.
 *
 * **These components are dumb about fetching.** They render a `Metric` or a
 * `TimeSeries` and nothing else, which is what lets `getMetricBoard`'s mock
 * seam be swapped for a real endpoint without one of them changing.
 */

export {
  BoardBand,
  BoardHero,
  BoardHeroItem,
  BoardHeroRow,
  type BoardHeroProps,
} from './BoardHero'
export { BreakdownList, type BreakdownListProps } from './BreakdownList'
export {
  Chapter,
  ChapterFigures,
  chaptersOf,
  chapterSummary,
  PLAIN_FRAME,
  PLAIN_FRAME_SLOT,
  SectionHeading,
  type ChapterProps,
} from './Chapter'
export { ChartCard, type ChartCardProps } from './ChartCard'
export { MetricDelta, MetricTile, type MetricSurface, type MetricTileProps } from './MetricTile'
export { MetricTileItem } from './MetricTileRow'
export { TrendChart, type TrendChartProps } from './TrendChart'
export {
  formatDecimal,
  formatMetricValue,
  formatPercent,
  formatSeriesValue,
  formatSignedPercent,
  /* §A8 / "a number is never alone". Exported so the REPORT BUILDER's panel
     card reaches the same valence judgement and the same derived sentence as a
     metric board's chart card — one derivation, two surfaces, no chance of the
     two disagreeing about which way a measure moved. */
  metricValence,
  seriesWindowDelta,
  trendRead,
  type MetricValence,
  type TrendRead,
  type TrendReadKey,
} from './formatMetric'
