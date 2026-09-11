/**
 * The public entry point. `renderMarkdown` is the one call a text block
 * needs; `parse` and `render` are exported separately for a caller that
 * wants the tree itself (an editor preview, a word count) without paying
 * for a second parse. 03-pages-and-dashboards.md §4, AC-1181 … AC-1184.
 */

import { createElement, type ReactNode } from 'react'
import type { Translate } from '../i18n/translate'
import { parse } from './parse'
import { render } from './render'

export {
  linkPolicy,
  MAX_MARKDOWN_LENGTH,
  parse,
  type BlockNode,
  type BoldInlineNode,
  type BreakInlineNode,
  type BulletListBlockNode,
  type CodeInlineNode,
  type InlineNode,
  type ItalicInlineNode,
  type LinkInlineNode,
  type LinkPolicy,
  type ListItemNode,
  type NumberedListBlockNode,
  type ParagraphBlockNode,
  type ParseResult,
  type TextInlineNode,
} from './parse'

export { render } from './render'

/**
 * The one string this module owns. `src/i18n/dictionaries.ts` and the
 * Arabic dictionary register it exactly as `SLA_MESSAGES_EN` and
 * `FILE_SIZE_MESSAGES_EN` already are — that registration is outside
 * `src/lib/markdown/**` and is not done here.
 */
export const MARKDOWN_MESSAGES_EN = Object.freeze({
  'markdown.truncated': 'Some of this text was too long to show and has been shortened.',
})

export type MarkdownMessageKey = keyof typeof MARKDOWN_MESSAGES_EN

export interface RenderMarkdownOptions {
  readonly translate: Translate
}

/**
 * `parse` then `render` in one call, with the AC-1184 notice appended when
 * `md` was cut. The notice is its own paragraph, not folded into the last
 * block, so it reads as a system message rather than as something the
 * operator wrote.
 */
export function renderMarkdown(md: string, options: RenderMarkdownOptions): ReactNode[] {
  const result = parse(md)
  const nodes = render(result.nodes)
  if (!result.truncated) return nodes

  return [
    ...nodes,
    createElement(
      'p',
      { key: 'markdown-truncated-notice', className: 'text-xs text-muted-foreground' },
      options.translate('markdown.truncated'),
    ),
  ]
}
