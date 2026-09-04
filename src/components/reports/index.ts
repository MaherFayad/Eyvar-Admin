/**
 * The Report Builder's component set — `06-report-builder.md` §5, §7, §8.
 *
 * Composed from the primitives already in `src/components/ui/` and from the
 * §3.7 metric layer. **Nothing here was added with `shadcn add`** and
 * `components.json` is untouched: a query panel, a legality-aware option group,
 * a small-multiple panel and a part-of-whole card have no shadcn equivalent,
 * which is expected rather than a gap in the stack (§8 of the brief).
 *
 * **These components are dumb about fetching.** They render a `ReportResult`, a
 * `QueryPlan` and a `Measure` and nothing else — which is what lets
 * `reports.run`'s mock seam be swapped for a real endpoint without one of them
 * changing, and what lets a dashboard tile reuse the same panel as the builder.
 */

export {
  ChartToolbar,
  visualisationOf,
  type ChartToolbarProps,
  type VisualisationId,
} from './ChartToolbar'
export { DashboardTile, type DashboardTileProps } from './DashboardTile'
export { DistributionCard, type DistributionCardProps } from './DistributionCard'
/* `hintLines` ships beside `InfoHint` rather than being re-implemented per rail:
   both `QueryPanel` and `ReportModePanel` stack an explanation and a violation
   in one hint, and two copies of that would drift. */
export { InfoHint, hintLines, type InfoHintProps } from './InfoHint'
export { LegalityOptions, type LegalityOptionsProps } from './LegalityOptions'
export {
  PanelCard,
  RelatedBoards,
  panelTitle,
  relatedBoards,
  type PanelCardProps,
  type RelatedBoard,
} from './PanelCard'
export { PanelChart, seriesOfPanel, type PanelChartProps } from './PanelChart'
export { QueryPanel, type QueryPanelProps } from './QueryPanel'
export { ResultCanvas, type CanvasStatus, type ResultCanvasProps } from './ResultCanvas'
export { ResultTable, type ResultTableProps } from './ResultTable'
export {
  SeriesChart,
  seriesColor,
  seriesDash,
  seriesFill,
  type SeriesChartProps,
} from './SeriesChart'
export { SeriesHeadlines, type SeriesHeadlinesProps } from './SeriesHeadlines'
export { WindowControl, type WindowControlProps } from './WindowControl'
export { declaredAggregate, periodDelta, rollUpSeries, type Rollup } from './rollup'
