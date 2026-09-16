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
/* `InfoHint` and `hintLines` moved to `@/components/InfoHint` (T9.5): the rails
   were the first caller, not the only one, and the accessible name is now the
   shell's `shell.hint.show`. Import them from there. */
export { LegalityOptions, type LegalityOptionsProps } from './LegalityOptions'
export { QueryPanel, type QueryPanelProps } from './QueryPanel'
export { ResultCanvas, type CanvasStatus, type ResultCanvasProps } from './ResultCanvas'
export { WindowControl, type WindowControlProps } from './WindowControl'
export { declaredAggregate, periodDelta, rollUpSeries, type Rollup } from './rollup'
/* WP-8.4 §5 boundary exception, disclosed in the handoff: dropped the
   `DistributionCard`/`PanelCard`/`PanelChart`/`SeriesChart` re-exports.
   Nothing imports them via this barrel (checked); a static `export … from`
   forced `recharts` into every reachable chunk regardless. Import each
   file directly, as `SeriesHeadlines.tsx` now does. */
export { ResultTable, type ResultTableProps } from './ResultTable'
export { SeriesHeadlines, type SeriesHeadlinesProps } from './SeriesHeadlines'
