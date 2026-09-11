/** `agent-insight` — the analyst's own markdown, read-only, with a provenance link back to the job (AC-1190). Never offered in the add-block picker (§3.2). */

import { Link } from 'react-router-dom'
import { renderMarkdown } from '@/lib/markdown'
import { usePageBlocks } from '../PageBlocksContext'
import type { AgentInsightBlock as AgentInsightBlockData } from '@/data/types/page'

export function AgentInsightBlockView({ block }: { block: AgentInsightBlockData }) {
  const { t } = usePageBlocks()
  return (
    <div className="flex flex-col gap-2 rounded-card border border-border bg-muted/40 p-3">
      {renderMarkdown(block.md, { translate: t })}
      <Link
        to={`/management/reports/analyst/${block.jobId}`}
        className="w-fit text-xs text-info-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {t('pg.block.agentInsight.provenance')}
      </Link>
    </div>
  )
}
