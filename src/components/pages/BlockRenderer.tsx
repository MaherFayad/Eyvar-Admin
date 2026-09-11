/** Dispatches one `Block` to its component — the renderer table in `03-pages-and-dashboards.md` §3. */

import { AgentInsightBlockView } from './blocks/AgentInsightBlockView'
import { AlertStatusBlockView } from './blocks/AlertStatusBlockView'
import { BookmarkBlockView } from './blocks/BookmarkBlockView'
import { CalloutBlockView } from './blocks/CalloutBlockView'
import { ColumnsBlockView } from './blocks/ColumnsBlockView'
import { DividerBlockView } from './blocks/DividerBlockView'
import { HeadingBlockView } from './blocks/HeadingBlockView'
import { MetricBlockView } from './blocks/MetricBlockView'
import { ReportBlockView } from './blocks/ReportBlockView'
import { TableBlockView } from './blocks/TableBlockView'
import { TextBlockView } from './blocks/TextBlockView'
import { ToggleBlockView } from './blocks/ToggleBlockView'
import type { Block } from '@/data/types/page'

export function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading':
      return <HeadingBlockView block={block} />
    case 'text':
      return <TextBlockView block={block} />
    case 'callout':
      return <CalloutBlockView block={block} />
    case 'divider':
      return <DividerBlockView />
    case 'toggle':
      return <ToggleBlockView block={block} />
    case 'columns':
      return <ColumnsBlockView block={block} />
    case 'report':
      return <ReportBlockView block={block} />
    case 'metric':
      return <MetricBlockView block={block} />
    case 'table':
      return <TableBlockView block={block} />
    case 'alert-status':
      return <AlertStatusBlockView block={block} />
    case 'agent-insight':
      return <AgentInsightBlockView block={block} />
    case 'bookmark':
      return <BookmarkBlockView block={block} />
  }
}
