/**
 * `callout` — a highlighted note with a tone. Same markdown subset as `text`
 * (§3), inside a tone-tinted card. Tone maps to R7's four content tones
 * plus `neutral`; a callout is not a status pill, so it uses the tone's
 * background rather than `Badge`.
 */

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { renderMarkdown } from '@/lib/markdown'
import { cn } from '@/lib/utils'
import { TextBlockEditor } from '../TextBlockEditor'
import { usePageBlocks } from '../PageBlocksContext'
import type { CalloutBlock, CalloutTone } from '@/data/types/page'

const TONE_CLASS: Record<CalloutTone, string> = {
  info: 'border-info bg-info/10',
  success: 'border-success bg-success/10',
  warning: 'border-warning bg-warning/10',
  neutral: 'border-border bg-muted',
}

const TONES: readonly CalloutTone[] = ['info', 'success', 'warning', 'neutral']

export function CalloutBlockView({ block }: { block: CalloutBlock }) {
  const { editing, actions, t } = usePageBlocks()
  const [focused, setFocused] = useState(false)

  return (
    <div className={cn('flex flex-col gap-2 rounded-card border p-3', TONE_CLASS[block.tone])}>
      {editing && (
        <Select
          value={block.tone}
          onValueChange={(value) => actions?.onReplace(block.id, { ...block, tone: value as CalloutTone })}
        >
          <SelectTrigger size="sm" aria-label={t('pg.block.callout.tone')} className="w-fit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TONES.map((tone) => (
              <SelectItem key={tone} value={tone}>
                {t(`pg.block.callout.tone.${tone}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {editing && (focused || block.md === '') ? (
        <div onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setFocused(false)}>
          <TextBlockEditor
            md={block.md}
            onChange={(md) => actions?.onReplace(block.id, { ...block, md })}
            t={t}
            placeholder={t('pg.block.callout.name')}
          />
        </div>
      ) : (
        <div tabIndex={editing ? 0 : undefined} onFocus={editing ? () => setFocused(true) : undefined}>
          {renderMarkdown(block.md, { translate: t })}
        </div>
      )}
    </div>
  )
}
