/**
 * The text block's edit surface — a growing `<textarea>` plus a four-button
 * formatting bar that wraps the selection with markdown syntax (AC-1203).
 * Preview (`Markdown`) renders once the block loses focus; this component
 * never renders the parsed tree itself.
 */

import { useRef, type ChangeEvent } from 'react'
import { BoldIcon, ItalicIcon, LinkIcon, ListIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MAX_MARKDOWN_LENGTH } from '@/lib/markdown'
import type { Translator } from '@/lib'

export interface TextBlockEditorProps {
  md: string
  onChange: (md: string) => void
  onBlur?: () => void
  placeholder?: string
  /** AC-1197 — `null` when the caret is not at a `/` starting a line; the text after the slash otherwise. */
  onSlashQuery?: (query: string | null) => void
  /** While the slash picker is open, this field doubles as its search box (its name changes to say so). */
  slashActive?: boolean
  t: Translator
}

function wrapSelection(value: string, start: number, end: number, mark: string): { next: string; start: number; end: number } {
  const before = value.slice(0, start)
  const selected = value.slice(start, end)
  const after = value.slice(end)
  return {
    next: `${before}${mark}${selected}${mark}${after}`,
    start: start + mark.length,
    end: end + mark.length,
  }
}

function prefixLine(value: string, start: number, end: number, prefix: string): { next: string; start: number; end: number } {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  return {
    next: `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`,
    start: start + prefix.length,
    end: end + prefix.length,
  }
}

export function TextBlockEditor({ md, onChange, onBlur, placeholder, onSlashQuery, slashActive, t }: TextBlockEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  /** A line starting with `/` opens the picker (AC-1197); anything else keeps it closed. */
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value
    onChange(value)
    if (!onSlashQuery) return
    const caret = event.target.selectionStart ?? value.length
    const lineStart = value.lastIndexOf('\n', caret - 1) + 1
    const linePrefix = value.slice(lineStart, caret)
    onSlashQuery(linePrefix.startsWith('/') ? linePrefix.slice(1) : null)
  }

  const applyMark = (kind: 'bold' | 'italic' | 'link' | 'list') => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const result =
      kind === 'bold'
        ? wrapSelection(md, start, end, '**')
        : kind === 'italic'
          ? wrapSelection(md, start, end, '_')
          : kind === 'link'
            ? (() => {
                const before = md.slice(0, start)
                const selected = md.slice(start, end) || t('pg.editor.link.placeholder')
                const after = md.slice(end)
                const next = `${before}[${selected}](https://)`
                return { next: `${next}${after}`, start: next.length - 1, end: next.length - 1 }
              })()
            : prefixLine(md, start, end, '- ')
    onChange(result.next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(result.start, result.end)
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div role="group" aria-label={t('pg.editor.formatBar')} className="flex items-center gap-0.5">
        <Button type="button" size="icon-xs" variant="ghost" aria-label={t('pg.editor.bold')} onClick={() => applyMark('bold')}>
          <BoldIcon aria-hidden="true" className="size-4" />
        </Button>
        <Button type="button" size="icon-xs" variant="ghost" aria-label={t('pg.editor.italic')} onClick={() => applyMark('italic')}>
          <ItalicIcon aria-hidden="true" className="size-4" />
        </Button>
        <Button type="button" size="icon-xs" variant="ghost" aria-label={t('pg.editor.link')} onClick={() => applyMark('link')}>
          <LinkIcon aria-hidden="true" className="size-4" />
        </Button>
        <Button type="button" size="icon-xs" variant="ghost" aria-label={t('pg.editor.list')} onClick={() => applyMark('list')}>
          <ListIcon aria-hidden="true" className="size-4" />
        </Button>
      </div>
      <Textarea
        ref={ref}
        value={md}
        maxLength={MAX_MARKDOWN_LENGTH}
        placeholder={placeholder}
        aria-label={slashActive ? t('pg.picker.search') : placeholder}
        onChange={handleChange}
        onBlur={onBlur}
        className="field-sizing-content min-h-16 font-sans text-sm"
      />
    </div>
  )
}
