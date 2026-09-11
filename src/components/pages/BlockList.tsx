/**
 * An ordered list of blocks — `role="list"` in view mode, a plain flow of
 * regions in edit mode (§3's renderer table). Edit mode also draws the
 * insertion affordance above every block and after the last one (§3.1/§3.2):
 * present in the DOM at rest, visible on hover or `focus-visible`.
 */

import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AddBlockPicker } from './AddBlockPicker'
import { BlockFrame } from './BlockFrame'
import { BlockRenderer } from './BlockRenderer'
import { ReportPickerPanel } from './ReportPickerPanel'
import { countBlocks } from './blockOps'
import { usePageBlocks } from './PageBlocksContext'
import type { Block } from '@/data/types/page'

export interface BlockListProps {
  blocks: readonly Block[]
  /** `null` at the page root. */
  containerId: string | null
  columnIndex: number | null
}

interface InsertPoint {
  index: number
  picking: 'type' | 'report' | 'metric'
  query: string
}

export function BlockList({ blocks, containerId, columnIndex }: BlockListProps) {
  const { editing, blocks: allBlocks, actions, t } = usePageBlocks()
  const [insertAt, setInsertAt] = useState<InsertPoint | null>(null)

  if (!editing) {
    return (
      <div role="list" className="flex flex-col gap-3">
        {blocks.map((block) => (
          <div role="listitem" key={block.id}>
            <BlockFrame block={block} containerId={containerId} columnIndex={columnIndex}>
              <BlockRenderer block={block} />
            </BlockFrame>
          </div>
        ))}
      </div>
    )
  }

  const openPicker = (index: number) => setInsertAt({ index, picking: 'type', query: '' })

  const insert = (block: Block) => {
    if (!actions) return
    if (insertAt) actions.onInsert(containerId, columnIndex, insertAt.index, block)
    setInsertAt(null)
  }

  const pickReport = (type: 'report' | 'metric') => {
    setInsertAt((current) => (current ? { ...current, picking: type } : current))
  }

  const gap = (index: number) => (
    <div key={`gap-${index}`} className="group/gap relative flex h-2 items-center justify-center">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border opacity-0 group-hover/gap:opacity-100 group-focus-within/gap:opacity-100" />
      <AddBlockPicker
        open={insertAt?.index === index && insertAt.picking === 'type'}
        onOpenChange={(open) => !open && setInsertAt(null)}
        query={insertAt?.index === index ? insertAt.query : ''}
        onQueryChange={(query) => setInsertAt((current) => (current ? { ...current, query } : current))}
        totalBlocks={countBlocks(allBlocks)}
        onInsert={insert}
        onPickReport={pickReport}
        t={t}
        anchor={
          <Button
            type="button"
            size="icon-xs"
            variant="secondary"
            aria-label={t('pg.edit.addBlock')}
            onClick={() => openPicker(index)}
            className={cn('relative z-10 opacity-0 focus-visible:opacity-100', 'group-hover/gap:opacity-100')}
          >
            <PlusIcon aria-hidden="true" className="size-3.5" />
          </Button>
        }
      />
      {insertAt?.index === index && insertAt.picking !== 'type' && (
        <div className="absolute start-0 top-full z-20 mt-1 w-96">
          <ReportPickerPanel
            kind={insertAt.picking}
            onPick={(block) => insert(block)}
            onCancel={() => setInsertAt(null)}
          />
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col">
      {gap(0)}
      {blocks.map((block, index) => (
        <div key={block.id} className="flex flex-col">
          <BlockFrame block={block} containerId={containerId} columnIndex={columnIndex}>
            <BlockRenderer block={block} />
          </BlockFrame>
          {gap(index + 1)}
        </div>
      ))}
    </div>
  )
}
