/**
 * `heading` — a section title, level 1–3. Editable in place in edit mode:
 * an `<input>` while focused, the real heading element otherwise (§3, AC-1203's
 * rule applied to a single-line field).
 */

import { createElement, useState } from 'react'
import { Input } from '@/components/ui/input'
import { PAGE_HEADING_MAX, type HeadingBlock } from '@/data/types/page'
import { isolatedRunProps } from '@/lib'
import { usePageBlocks } from '../PageBlocksContext'

const HEADING_CLASS: Record<HeadingBlock['level'], string> = {
  1: 'text-xl font-semibold',
  2: 'text-lg font-semibold',
  3: 'text-base font-semibold',
}

export function HeadingBlockView({ block }: { block: HeadingBlock }) {
  const { editing, actions, t } = usePageBlocks()
  const [focused, setFocused] = useState(false)
  const tag = `h${block.level}` as 'h1' | 'h2' | 'h3'

  if (editing && (focused || block.text === '')) {
    return (
      <Input
        autoFocus={focused}
        value={block.text}
        maxLength={PAGE_HEADING_MAX}
        placeholder={t('pg.block.heading.name')}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => actions?.onReplace(block.id, { ...block, text: event.target.value })}
        className={HEADING_CLASS[block.level]}
      />
    )
  }

  return createElement(
    tag,
    {
      className: HEADING_CLASS[block.level],
      tabIndex: editing ? 0 : undefined,
      onFocus: editing ? () => setFocused(true) : undefined,
    },
    <bdi key="text" {...isolatedRunProps().run}>
      {block.text || (editing ? t('pg.block.heading.name') : '')}
    </bdi>,
  )
}
