/**
 * `columns` — 2 to 4 side-by-side sections on a twelve-column grid, stacking
 * to one column below `wide:` (AC-1209). Widths are named classes, never an
 * arbitrary value — `COL_SPAN_CLASS` is the whole of the ten legal twelfths.
 */

import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ColumnsWidthControl } from '../ColumnsWidthControl'
import { BlockList } from '../BlockList'
import { PAGE_COLUMNS_MAX } from '@/data/types/page'
import { usePageBlocks } from '../PageBlocksContext'
import type { ColumnsBlock } from '@/data/types/page'

/** Base class always stacks to one column; `wide:` carries the real width (AC-1209). */
const COL_SPAN_CLASS: Record<number, string> = {
  3: 'col-span-12 wide:col-span-3',
  4: 'col-span-12 wide:col-span-4',
  5: 'col-span-12 wide:col-span-5',
  6: 'col-span-12 wide:col-span-6',
  7: 'col-span-12 wide:col-span-7',
  8: 'col-span-12 wide:col-span-8',
  9: 'col-span-12 wide:col-span-9',
  10: 'col-span-12 wide:col-span-10',
  11: 'col-span-12 wide:col-span-11',
  12: 'col-span-12 wide:col-span-12',
}

const EQUAL_SHARE = 12

export function ColumnsBlockView({ block }: { block: ColumnsBlock }) {
  const { editing, actions, t } = usePageBlocks()
  const count = block.columns.length
  const fallbackWidth = Math.floor(EQUAL_SHARE / count)

  const setWidth = (index: number, width: number) => {
    if (!actions) return
    const columns = block.columns.map((c, i) => (i === index ? { ...c, width } : c))
    actions.onReplace(block.id, { ...block, columns })
  }

  const addColumn = () => {
    if (!actions || count >= PAGE_COLUMNS_MAX) return
    actions.onReplace(block.id, { ...block, columns: [...block.columns, { width: 3, blocks: [] }] })
  }

  return (
    <div className="flex flex-col gap-2">
      <div role="group" className="grid grid-cols-12 gap-3">
        {block.columns.map((column, index) => {
          const width = column.width ?? fallbackWidth
          const otherColumnsWidth = block.columns.reduce(
            (sum, c, i) => (i === index ? sum : sum + (c.width ?? fallbackWidth)),
            0,
          )
          return (
            <div key={index} className={COL_SPAN_CLASS[width] ?? COL_SPAN_CLASS[12]}>
              {editing && (
                <div className="pb-2">
                  <ColumnsWidthControl
                    width={width}
                    otherColumnsWidth={otherColumnsWidth}
                    onChange={(next) => setWidth(index, next)}
                    t={t}
                  />
                </div>
              )}
              <BlockList blocks={column.blocks} containerId={block.id} columnIndex={index} />
            </div>
          )
        })}
      </div>
      {editing && count < PAGE_COLUMNS_MAX && (
        <Button type="button" size="xs" variant="ghost" onClick={addColumn} className="w-fit gap-1">
          <PlusIcon aria-hidden="true" className="size-3.5" />
          {t('pg.edit.columns.add')}
        </Button>
      )}
    </div>
  )
}
