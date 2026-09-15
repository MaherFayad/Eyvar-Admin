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
import { findBlock } from './blockOps'
import { usePageBlocks } from './PageBlocksContext'
import type { Block } from '@/data/types/page'

export interface BlockFrameProps {
  block: Block
  /** The parent container this block sits in — `null` at the page root. Needed by the block menu's "move to column" and by delete/duplicate. */
  containerId: string | null
  columnIndex: number | null
  children: ReactNode
}

/**
 * F-V2-87 — two blocks of the same type must not share one accessible name
 * (a screen-reader operator navigating by name could not tell which block's
 * menu they opened). Prefer the block's own title; blocks with no title
 * field always fall back.
 */
function blockOwnTitle(block: Block): string | null {
  switch (block.type) {
    case 'heading':
      return block.text.trim() || null
    case 'toggle':
      return block.title.trim() || null
    case 'report':
      return block.title && block.title.trim() ? block.title : null
    default:
      return null
  }
}

/** 1-indexed position of `id` within its own sibling list, for the type+position fallback name. */
function siblingPosition(blocks: readonly Block[], containerId: string | null, columnIndex: number | null, id: string): number {
  let siblings = blocks
  if (containerId !== null) {
    const container = findBlock(blocks, containerId)
    if (container?.type === 'toggle') siblings = container.blocks
    else if (container?.type === 'columns' && columnIndex !== null) siblings = container.columns[columnIndex]?.blocks ?? blocks
  }
  const index = siblings.findIndex((b) => b.id === id)
  return index === -1 ? 1 : index + 1
}

export function BlockFrame({ block, containerId, columnIndex, children }: BlockFrameProps) {
  const { editing, t, blocks } = usePageBlocks()
  const [menuOpen, setMenuOpen] = useState(false)
  const ownTitle = blockOwnTitle(block)
  const name =
    ownTitle ??
    t('pg.block.positionalName', {
      type: t(`pg.block.${block.type}.name`),
      position: siblingPosition(blocks, containerId, columnIndex, block.id),
    })

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
        'group/block relative min-w-0 rounded-card border border-transparent ps-7 pe-7 print:border-transparent print:ps-0 print:pe-0',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'hover:border-border focus-within:border-border',
        menuOpen && 'border-border',
      )}
    >
      {/* AC-1217 — printing while still in edit mode is an edge case, not the flow; the frame's chrome is still edit-only and does not print. */}
      <DragHandleIcon
        aria-hidden="true"
        className={cn(
          'absolute top-1 start-1 size-4 text-muted-foreground opacity-0 print:hidden',
          'group-hover/block:opacity-100 group-focus-within/block:opacity-100',
        )}
      />
      <div className={cn('absolute top-1 end-1 opacity-0 print:hidden', 'group-hover/block:opacity-100 group-focus-within/block:opacity-100', menuOpen && 'opacity-100')}>
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
