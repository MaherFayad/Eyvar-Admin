/**
 * `text` — a paragraph of the markdown subset, `src/lib/markdown` (never a
 * second renderer, never `dangerouslySetInnerHTML`). AC-1203: the editor
 * shows while focused, the rendered preview otherwise.
 */

import { useState } from 'react'
import { renderMarkdown } from '@/lib/markdown'
import { TextBlockEditor } from '../TextBlockEditor'
import { usePageBlocks } from '../PageBlocksContext'
import type { TextBlock } from '@/data/types/page'

export function TextBlockView({ block }: { block: TextBlock }) {
  const { editing, actions, t } = usePageBlocks()
  const [focused, setFocused] = useState(false)

  if (editing && (focused || block.md === '')) {
    return (
      <div onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setFocused(false)}>
        <TextBlockEditor
          md={block.md}
          onChange={(md) => actions?.onReplace(block.id, { ...block, md })}
          t={t}
          placeholder={t('pg.block.text.name')}
        />
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
