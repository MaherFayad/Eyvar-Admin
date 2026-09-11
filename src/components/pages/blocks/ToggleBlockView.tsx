/**
 * `toggle` — a section that opens and closes. `<button aria-expanded>` and
 * `hidden` on the content when closed, so it leaves the accessibility tree
 * rather than merely hiding visually (AC-1192). One level of nesting only
 * (`page.ts`'s own comment on `ToggleBlock`).
 */

import { ChevronRightIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { BlockList } from '../BlockList'
import { usePageBlocks } from '../PageBlocksContext'
import type { ToggleBlock } from '@/data/types/page'

export function ToggleBlockView({ block }: { block: ToggleBlock }) {
  const { editing, actions, t } = usePageBlocks()

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-expanded={block.open}
          onClick={() => actions?.onToggleOpen(block.id, !block.open)}
          className="flex items-center gap-1 rounded-control text-start outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ChevronRightIcon
            aria-hidden="true"
            className={cn('size-4 shrink-0 text-muted-foreground transition-transform', block.open && 'rotate-90')}
          />
          {!editing && <span className="font-medium">{block.title || t('pg.block.toggle.name')}</span>}
        </button>
        {editing && (
          <Input
            value={block.title}
            placeholder={t('pg.block.toggle.name')}
            onChange={(event) => actions?.onReplace(block.id, { ...block, title: event.target.value })}
            className="h-auto flex-1 border-none bg-transparent px-1 py-0 font-medium shadow-none focus-visible:ring-0"
          />
        )}
      </div>
      <div hidden={!block.open} className="ps-5">
        <BlockList blocks={block.blocks} containerId={block.id} columnIndex={null} />
      </div>
    </div>
  )
}
