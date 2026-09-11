/**
 * The chrome around one block — §3.1. Always the accessible region
 * (`role="group"`, named), so a screen reader walks the page block by block
 * in both modes; the border, handle and kebab render only in edit mode.
 * Restyled on arrival: `border-transparent` at rest, `border-border` on
 * hover/focus-within (D19's two-step rule), focus ring survives.
 */

import { useState, type ReactNode } from 'react'
import { DragHandleIcon, MoreIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BlockMenu } from './BlockMenu'
import { usePageBlocks } from './PageBlocksContext'
import type { Block } from '@/data/types/page'

export interface BlockFrameProps {
  block: Block
  /** The parent container this block sits in — `null` at the page root. Needed by the block menu's "move to column" and by delete/duplicate. */
  containerId: string | null
  columnIndex: number | null
  children: ReactNode
}

export function BlockFrame({ block, containerId, columnIndex, children }: BlockFrameProps) {
  const { editing, t } = usePageBlocks()
  const [menuOpen, setMenuOpen] = useState(false)
  const name = t(`pg.block.${block.type}.name`)

  if (!editing) {
    return (
      <div role="group" aria-label={name} className="min-w-0">
        {children}
      </div>
    )
  }

  return (
    <div
      role="group"
      aria-label={name}
      tabIndex={0}
      data-block-id={block.id}
      data-container-id={containerId ?? ''}
      data-column-index={columnIndex ?? ''}
      className={cn(
        'group/block relative min-w-0 rounded-card border border-transparent ps-7 pe-7',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'hover:border-border focus-within:border-border',
        menuOpen && 'border-border',
      )}
    >
      <DragHandleIcon
        aria-hidden="true"
        className={cn(
          'absolute top-1 start-1 size-4 text-muted-foreground opacity-0',
          'group-hover/block:opacity-100 group-focus-within/block:opacity-100',
        )}
      />
      <div className={cn('absolute top-1 end-1 opacity-0', 'group-hover/block:opacity-100 group-focus-within/block:opacity-100', menuOpen && 'opacity-100')}>
        <BlockMenu
          block={block}
          containerId={containerId}
          columnIndex={columnIndex}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          trigger={
            <Button type="button" size="icon-xs" variant="ghost" aria-label={t('pg.edit.blockMenu', { name })}>
              <MoreIcon aria-hidden="true" className="size-4" />
            </Button>
          }
        />
      </div>
      {children}
    </div>
  )
}
