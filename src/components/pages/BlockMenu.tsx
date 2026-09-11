/**
 * The block's kebab menu, and `Shift+F10` on a focused frame — §3.1.
 * `Move up`/`Move down`/`Move to column…`/`Duplicate`/`Turn into…`/`Height`/
 * `View`/`Delete`, each disabled in place with a reason when inapplicable
 * (AC-1198), never hidden.
 */

import type { ReactNode } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { findBlock, listColumnsBlocks } from './blockOps'
import { usePageBlocks } from './PageBlocksContext'
import type { Block, ReportBlockHeight, ReportBlockView } from '@/data/types/page'

const HEIGHTS: readonly ReportBlockHeight[] = ['S', 'M', 'L', 'XL']
const VIEWS: readonly ReportBlockView[] = ['chart', 'table', 'headline']
const TURN_INTO: readonly Block['type'][] = ['text', 'heading', 'callout', 'report', 'metric']

function canTurnInto(from: Block['type'], to: Block['type']): boolean {
  const prose: readonly Block['type'][] = ['text', 'heading', 'callout']
  const pinned: readonly Block['type'][] = ['report', 'metric']
  if (prose.includes(from) && prose.includes(to)) return true
  if (pinned.includes(from) && pinned.includes(to)) return true
  return false
}

/** The block's own sibling list — the page root, or the container `findBlock` finds it in. */
function siblingsOf(blocks: readonly Block[], containerId: string | null, columnIndex: number | null): readonly Block[] {
  if (containerId === null) return blocks
  const container = findBlock(blocks, containerId)
  if (container?.type === 'toggle') return container.blocks
  if (container?.type === 'columns' && columnIndex !== null) return container.columns[columnIndex]?.blocks ?? blocks
  return blocks
}

export interface BlockMenuProps {
  block: Block
  containerId: string | null
  columnIndex: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactNode
}

export function BlockMenu({ block, containerId, columnIndex, open, onOpenChange, trigger }: BlockMenuProps) {
  const { blocks, actions, t } = usePageBlocks()
  if (!actions) return null

  const columnsBlocks = listColumnsBlocks(blocks).filter((c) => c.id !== containerId)
  const isReport = block.type === 'report'
  const turnable = TURN_INTO.filter((to) => to !== block.type && canTurnInto(block.type, to))
  const siblings = siblingsOf(blocks, containerId, columnIndex)
  const ownIndex = siblings.findIndex((b) => b.id === block.id)
  const isFirst = ownIndex <= 0
  const isLast = ownIndex === siblings.length - 1

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* `moveBlock` is a documented no-op at either end (AC-1199) — disabled in place, with the reason, rather than silently doing nothing. */}
        <DropdownMenuItem
          disabled={isFirst}
          aria-label={t('pg.edit.moveUp')}
          onSelect={() => actions.onMove(block.id, -1)}
        >
          <span className="flex flex-col">
            <span>{t('pg.edit.moveUp')}</span>
            {isFirst && <span className="text-xs text-muted-foreground">{t('pg.edit.moveUp.first')}</span>}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isLast}
          aria-label={t('pg.edit.moveDown')}
          onSelect={() => actions.onMove(block.id, 1)}
        >
          <span className="flex flex-col">
            <span>{t('pg.edit.moveDown')}</span>
            {isLast && <span className="text-xs text-muted-foreground">{t('pg.edit.moveDown.last')}</span>}
          </span>
        </DropdownMenuItem>

        {/* Radix will not open a `DropdownMenuSub` whose trigger is disabled
            (AC-1198), so with no legal target this is a plain disabled item
            carrying its reason in place — never a submenu nobody can open. */}
        {columnsBlocks.length === 0 ? (
          <DropdownMenuItem disabled aria-label={t('pg.edit.moveToColumn')}>
            <span className="flex flex-col">
              <span>{t('pg.edit.moveToColumn')}</span>
              <span className="text-xs text-muted-foreground">{t('pg.edit.moveToColumn.none')}</span>
            </span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t('pg.edit.moveToColumn')}</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {columnsBlocks.map((columnsBlock) =>
                  columnsBlock.columns
                    .map((_column, index) => index)
                    /* The block's own current column is not offered as a target — moving a block into the column it is already in is not a move. */
                    .filter((index) => !(columnsBlock.id === containerId && index === columnIndex))
                    .map((index) => (
                      <DropdownMenuItem
                        key={`${columnsBlock.id}-${index}`}
                        onSelect={() => actions.onMoveToColumn(block.id, columnsBlock.id, index)}
                      >
                        {t('pg.edit.moveToColumn.target', { position: index + 1 })}
                      </DropdownMenuItem>
                    )),
                )}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        )}

        <DropdownMenuItem onSelect={() => actions.onDuplicate(block.id)}>{t('pg.edit.duplicate')}</DropdownMenuItem>

        {turnable.length === 0 ? (
          <DropdownMenuItem disabled aria-label={t('pg.edit.turnInto')}>
            <span className="flex flex-col">
              <span>{t('pg.edit.turnInto')}</span>
              <span className="text-xs text-muted-foreground">{t('pg.edit.turnInto.none')}</span>
            </span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t('pg.edit.turnInto')}</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {turnable.map((to) => (
                  <DropdownMenuItem key={to} onSelect={() => actions.onTurnInto(block.id, to)}>
                    {t(`pg.block.${to}.name`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        )}

        {isReport && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t('pg.edit.height')}</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={block.height}
                  onValueChange={(value) => actions.onSetHeight(block.id, value as ReportBlockHeight)}
                >
                  {HEIGHTS.map((height) => (
                    <DropdownMenuRadioItem key={height} value={height}>
                      {t(`pg.edit.height.${height.toLowerCase()}`)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        )}

        {isReport && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t('pg.edit.view')}</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={block.view}
                  onValueChange={(value) => actions.onSetView(block.id, value as ReportBlockView)}
                >
                  {VIEWS.map((view) => (
                    <DropdownMenuRadioItem key={view} value={view}>
                      {t(`pg.edit.view.${view}`)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => actions.onDelete(block.id)}>
          {t('pg.edit.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
