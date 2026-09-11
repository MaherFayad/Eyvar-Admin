/** `table` — a small hand-built table, editable in place. Not a pinned report; nothing here is resolved from a query. */

import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { usePageBlocks } from '../PageBlocksContext'
import type { PageTableColumn, TableBlock as TableBlockData } from '@/data/types/page'

export function TableBlockView({ block }: { block: TableBlockData }) {
  const { editing, actions, t } = usePageBlocks()

  const setLabel = (index: number, label: string) => {
    const columns = block.columns.map((c, i) => (i === index ? { ...c, label } : c))
    actions?.onReplace(block.id, { ...block, columns })
  }

  const setCell = (row: number, col: number, value: string) => {
    const rows = block.rows.map((r, ri) => (ri === row ? r.map((v, ci) => (ci === col ? value : v)) : r))
    actions?.onReplace(block.id, { ...block, rows })
  }

  const addRow = () => {
    actions?.onReplace(block.id, { ...block, rows: [...block.rows, block.columns.map(() => '')] })
  }

  const addColumn = () => {
    const column: PageTableColumn = { key: `c${block.columns.length + 1}`, label: '', align: 'start' }
    actions?.onReplace(block.id, {
      ...block,
      columns: [...block.columns, column],
      rows: block.rows.map((r) => [...r, '']),
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {block.columns.map((column, index) => (
              <th key={column.key} className={cn('border-b border-border p-1.5 font-medium', column.align === 'end' && 'text-end')}>
                {editing ? (
                  <Input
                    value={column.label}
                    onChange={(event) => setLabel(index, event.target.value)}
                    className="h-auto border-none bg-transparent px-0 py-0 font-medium shadow-none focus-visible:ring-0"
                  />
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className={cn('border-b border-border p-1.5', block.columns[ci]?.align === 'end' && 'text-end')}>
                  {editing ? (
                    <Input
                      value={cell}
                      onChange={(event) => setCell(ri, ci, event.target.value)}
                      className="h-auto border-none bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                    />
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {editing && (
        <div className="flex items-center gap-2">
          <Button type="button" size="xs" variant="ghost" onClick={addRow} className="gap-1">
            <PlusIcon aria-hidden="true" className="size-3.5" />
            {t('pg.block.table.addRow')}
          </Button>
          <Button type="button" size="xs" variant="ghost" onClick={addColumn} className="gap-1">
            <PlusIcon aria-hidden="true" className="size-3.5" />
            {t('pg.block.table.addColumn')}
          </Button>
        </div>
      )}
    </div>
  )
}
