/**
 * `text` — a paragraph of the markdown subset, `src/lib/markdown` (never a
 * second renderer, never `dangerouslySetInnerHTML`). AC-1203: the editor
 * shows while focused, the rendered preview otherwise. AC-1197: `/` at the
 * start of a line opens the same `AddBlockPicker` the `+` affordance does,
 * and the chosen type replaces this (typically still-empty) block.
 */

import { useState } from 'react'
import { renderMarkdown } from '@/lib/markdown'
import { AddBlockPicker } from '../AddBlockPicker'
import { ReportPickerPanel } from '../ReportPickerPanel'
import { TextBlockEditor } from '../TextBlockEditor'
import { countBlocks } from '../blockOps'
import { usePageBlocks } from '../PageBlocksContext'
import type { Block, TextBlock } from '@/data/types/page'

interface SlashState {
  query: string
  picking: 'type' | 'report' | 'metric'
}

export function TextBlockView({ block }: { block: TextBlock }) {
  const { editing, actions, blocks, t } = usePageBlocks()
  const [focused, setFocused] = useState(false)
  const [slash, setSlash] = useState<SlashState | null>(null)

  /* `slash !== null` keeps the editor (and the open picker) mounted once
     typing `/` makes `block.md` non-empty (AC-1197) — otherwise the
     `focused || md === ''` check alone flips this block back to its
     preview branch mid-keystroke and the picker vanishes with it. */
  if (editing && (focused || block.md === '' || slash !== null)) {
    const insert = (next: Block) => {
      actions?.onReplace(block.id, next)
      setSlash(null)
    }
    return (
      <div
        onBlur={(event) => {
          /* The picker's own content portals outside this wrapper, so a click
             into it would otherwise read as focus leaving the block entirely
             and unmount the editor mid-selection. */
          if (slash) return
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
        }}
      >
        <AddBlockPicker
          open={slash?.picking === 'type'}
          onOpenChange={(open) => !open && setSlash(null)}
          query={slash?.query ?? ''}
          onQueryChange={(query) => setSlash((current) => (current ? { ...current, query } : current))}
          totalBlocks={countBlocks(blocks)}
          onInsert={insert}
          onPickReport={(type) => setSlash((current) => (current ? { ...current, picking: type } : current))}
          autoFocusSearch={false}
          t={t}
          anchor={
            /* A plain `<div>` rather than `TextBlockEditor` itself — the
               popover anchor needs a ref, and a function component without
               `forwardRef` cannot take one. */
            <div>
              <TextBlockEditor
                md={block.md}
                onChange={(md) => actions?.onReplace(block.id, { ...block, md })}
                onSlashQuery={(query) => setSlash(query === null ? null : { query, picking: 'type' })}
                slashActive={slash !== null}
                t={t}
                placeholder={t('pg.block.text.name')}
              />
            </div>
          }
        />
        {slash && slash.picking !== 'type' && (
          <div className="relative">
            <div className="absolute start-0 top-full z-20 mt-1 w-96">
              <ReportPickerPanel kind={slash.picking} onPick={insert} onCancel={() => setSlash(null)} />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      tabIndex={editing ? 0 : undefined}
      onFocus={editing ? () => setFocused(true) : undefined}
      className="flex flex-col gap-2"
    >
      {renderMarkdown(block.md, { translate: t })}
    </div>
  )
}
