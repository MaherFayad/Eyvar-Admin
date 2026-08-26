/**
 * The metric-tile / chart-card screen family — wave 4.
 *
 * Eight sub-tabs, one composer, one data contract. What a screen file contains
 * is its **surface id and nothing else**; see `OverviewScreen.tsx` for why that
 * is the point rather than an economy.
 *
 * `source.ts` is deliberately NOT exported. It is a temporary stand-in for a
 * client that does not exist yet and no screen may reach it directly — when
 * `@/data/clients` grows `getOverview`, exactly one import changes.
 */

export { OverviewScreen, type OverviewScreenProps } from './OverviewScreen'
export { OVERVIEW_EN } from './copy'
export type {
  BreakdownRow,
  BucketSize,
  ChartBody,
  ChartCardData,
  Comparison,
  Metric,
  MetricValue,
  Overview,
  OverviewSurfaceId,
  Period,
  RowLabel,
  SeriesPoint,
} from './contract'
