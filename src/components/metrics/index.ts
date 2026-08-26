/**
 * The metric-tile / chart-card component set — `DESIGN.md` §3.7, dressed to
 * `design/03-navattic-language.md` §4.9.
 *
 * Composed from the primitives already in `src/components/ui/`; nothing here
 * was added with `shadcn add` and `components.json` is frozen. §3.7's shapes —
 * a stat tile, a breakdown row, a two-role trend, a legend naming both periods
 * — have no shadcn equivalent, which is expected rather than a gap in the
 * stack.
 *
 * **These components are dumb about fetching.** They render what they are
 * given. That is what lets the temporary `@/screens/metrics/source` be swapped
 * for a real `@/data/clients` read without touching one of them.
 */

export { BreakdownList, type BreakdownListProps } from './BreakdownList'
export { ChartCard, type ChartCardProps } from './ChartCard'
export { MetricTile, type MetricTileProps } from './MetricTile'
export { MetricTileItem, MetricTileRow } from './MetricTileRow'
export { TrendChart, type TrendChartProps } from './TrendChart'
export {
  formatDecimal,
  formatMetricValue,
  formatPercent,
  formatSeriesValue,
  formatSignedPercent,
} from './formatMetric'
