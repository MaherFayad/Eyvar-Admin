/**
 * The metric-tile / chart-card screen family — `DESIGN.md` §3.7.
 *
 * **One screen, eight sub-tabs.** `routes.tsx` mounts `MetricBoardScreen` for
 * every id in `METRIC_BOARD_SUB_TABS` (`@/data/clients`), so which sub-tabs
 * have a board is a data question answered in the data layer — adding a ninth
 * is a fixture change and not a code change.
 *
 * Its data is `getMetricBoard(subTabId)`. There is no private stand-in here:
 * an earlier cut of this directory carried a `contract.ts` and a `source.ts`
 * written against the shape the screens needed while the metrics resource was
 * still being built. `src/data/types/metrics.ts` and `src/data/clients/metrics.ts`
 * landed, they are richer than the stand-in was, and the stand-in was deleted
 * rather than left to drift beside the real thing.
 */

export { MetricBoardScreen } from './MetricBoardScreen'
export { OVERVIEW_EN } from './copy'
