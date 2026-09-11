/**
 * `render`: a `BlockNode[]` in, React elements out — never a string of HTML.
 * There is no `dangerouslySetInnerHTML` in this module; every element is
 * built with `createElement` from the typed tree `parse.ts` produced, so a
 * `<script>` that survived as a `text` node can only ever become a text
 * node here too (AC-1181).
 */

import { createElement, type Key, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { isolatedRunProps } from '../i18n/isolate'
import type {
  BlockNode,
  InlineNode,
  LinkInlineNode,
  ListItemNode,
} from './parse'

const PARAGRAPH_CLASS = 'text-sm leading-relaxed text-foreground'
const LIST_CLASS = 'flex flex-col gap-1 ms-4 text-sm leading-relaxed text-foreground'
const LINK_CLASS =
  'text-info-foreground underline underline-offset-4 outline-none hover:no-underline ' +
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
const CODE_CLASS = 'rounded-sm bg-muted px-1 font-mono text-foreground'

/**
 * `text.md` → React elements, in document order. Wraps every text run in a
 * `<bdi>` through the shared `isolatedRunProps` (AC-1183) rather than a
 * second isolation helper, and turns each `link` node into an external `<a>`
 * or an internal router `Link` per the policy `parse.ts` already applied.
 */
export function render(nodes: readonly BlockNode[]): ReactNode[] {
  return nodes.map((block, index) => renderBlock(block, index))
}

function renderBlock(block: BlockNode, key: Key): ReactNode {
  switch (block.type) {
    case 'paragraph':
      return createElement('p', { key, className: PARAGRAPH_CLASS }, renderInlineChildren(block.children))
    case 'bulletList':
      return createElement(
        'ul',
        { key, className: `list-disc ${LIST_CLASS}` },
        block.items.map(renderListItem),
      )
    case 'numberedList':
      return createElement(
        'ol',
        { key, className: `list-decimal ${LIST_CLASS}` },
        block.items.map(renderListItem),
      )
  }
}

function renderListItem(item: ListItemNode, key: Key): ReactNode {
  return createElement('li', { key }, renderInlineChildren(item.children))
}

function renderInlineChildren(children: readonly InlineNode[]): ReactNode[] {
  return children.map((child, index) => renderInline(child, index))
}

/** A text run is always a `<bdi>` and never carries a class — §5.4, `isolate.ts`. */
function renderTextRun(value: string, key: Key): ReactNode {
  return createElement('bdi', { key, ...isolatedRunProps().run }, value)
}

function renderInline(node: InlineNode, key: Key): ReactNode {
  switch (node.type) {
    case 'text':
      return renderTextRun(node.value, key)
    case 'break':
      return createElement('br', { key })
    case 'bold':
      return createElement(
        'strong',
        { key, className: 'font-semibold' },
        renderInlineChildren(node.children),
      )
    case 'italic':
      return createElement('em', { key, className: 'italic' }, renderInlineChildren(node.children))
    case 'code':
      return createElement(
        'code',
        { key, className: CODE_CLASS },
        renderTextRun(node.value, 'value'),
      )
    case 'link':
      return renderLink(node, key)
  }
}

/**
 * External opens in a new tab behind `rel="noreferrer noopener"` with the
 * fixed, non-mirroring `↗` mark (`DriverDocuments.tsx`'s convention, §9.5).
 * Internal is a router `Link` so a click never reloads the shell.
 */
function renderLink(node: LinkInlineNode, key: Key): ReactNode {
  const children = renderInlineChildren(node.children)

  if (node.internal) {
    return createElement(Link, { key, to: node.href, className: LINK_CLASS }, children)
  }

  return createElement(
    'a',
    { key, href: node.href, target: '_blank', rel: 'noreferrer noopener', className: LINK_CLASS },
    ...children,
    createElement('span', { key: 'external-glyph', 'aria-hidden': true }, ' ↗'),
  )
}
