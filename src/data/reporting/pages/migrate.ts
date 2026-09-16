/**
 * `dashboardToPage(dashboard)` — pure (§2, AC-1180). Consecutive `half`
 * tiles pair into a two-column `columns` block; a `full` or unpaired `half`
 * stands alone. `title` carries `pinnedName` so a dangling tile still names itself.
 */

import { tileSpan, type Dashboard, type DashboardTile } from '../../types/report'
import type { Block, ColumnsBlock, Page, ReportBlock } from '../../types/page'

function tileToReportBlock(tile: DashboardTile): ReportBlock {
  return {
    id: `blk-${tile.tileId}`,
    type: 'report',
    reportId: tile.reportId,
    view: 'chart',
    height: 'M',
    title: tile.pinnedName,
  }
}

function pairToColumns(a: DashboardTile, b: DashboardTile): ColumnsBlock {
  return {
    id: `col-${a.tileId}-${b.tileId}`,
    type: 'columns',
    columns: [
      { width: 6, blocks: [tileToReportBlock(a)] },
      { width: 6, blocks: [tileToReportBlock(b)] },
    ],
  }
}

/** Groups ordered tiles into blocks: `full` alone, consecutive `half` pairs into columns, an unpaired `half` alone. */
function tilesToBlocks(tiles: readonly DashboardTile[]): Block[] {
  const ordered = [...tiles].sort((a, b) => a.order - b.order)
  const blocks: Block[] = []
  let i = 0
  while (i < ordered.length) {
    const tile = ordered[i]!
    const next = ordered[i + 1]
    if (tileSpan(tile) === 'half' && next && tileSpan(next) === 'half') {
      blocks.push(pairToColumns(tile, next))
      i += 2
    } else {
      blocks.push(tileToReportBlock(tile))
      i += 1
    }
  }
  return blocks
}

/**
 * Converts a v1 `Dashboard` to a `Page` of kind `'dashboard'`. Reuses the
 * dashboard's own `id` so `/dashboards/:id` can alias `/pages/:id` (§2).
 * Migrated `visibility` defaults to `'team'`, the audience a v1 dashboard already had.
 */
export function dashboardToPage(dashboard: Dashboard): Page {
  return {
    id: dashboard.id,
    kind: 'dashboard',
    title: dashboard.name,
    icon: null,
    description: dashboard.description,
    ownerId: dashboard.ownerId,
    visibility: 'team',
    tags: [],
    official: false,
    scope: { range: dashboard.range, filters: [...dashboard.filters] },
    blocks: tilesToBlocks(dashboard.tiles),
    version: 1,
    publishedAt: dashboard.createdAt,
    createdAt: dashboard.createdAt,
    updatedAt: dashboard.updatedAt,
    updatedBy: dashboard.ownerId,
  }
}
