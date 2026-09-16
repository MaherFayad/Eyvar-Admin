/**
 * `parse`: a markdown string in, a typed node tree out — the subset
 * `03-pages-and-dashboards.md` §4 names (AC-1181). No angle bracket is ever
 * interpreted, so a raw `<tag>` is text, not syntax. Never throws — a
 * malformed construct degrades to literal characters (AC-1184) instead of blanking a page block.
 */

import { invariant } from '../invariant'

export interface TextInlineNode {
  readonly type: 'text'
  readonly value: string
}

export interface BreakInlineNode {
  readonly type: 'break'
}

export interface BoldInlineNode {
  readonly type: 'bold'
  readonly children: readonly InlineNode[]
}

export interface ItalicInlineNode {
  readonly type: 'italic'
  readonly children: readonly InlineNode[]
}

export interface CodeInlineNode {
  readonly type: 'code'
  readonly value: string
}

export interface LinkInlineNode {
  readonly type: 'link'
  /** Already passed `linkPolicy` — trimmed, and either `http(s)://…` or `/…`. */
  readonly href: string
  readonly internal: boolean
  readonly children: readonly InlineNode[]
}

export type InlineNode =
  | TextInlineNode
  | BreakInlineNode
  | BoldInlineNode
  | ItalicInlineNode
  | CodeInlineNode
  | LinkInlineNode

export interface ListItemNode {
  readonly type: 'listItem'
  readonly children: readonly InlineNode[]
}

export interface ParagraphBlockNode {
  readonly type: 'paragraph'
  readonly children: readonly InlineNode[]
}

export interface BulletListBlockNode {
  readonly type: 'bulletList'
  readonly items: readonly ListItemNode[]
}

export interface NumberedListBlockNode {
  readonly type: 'numberedList'
  readonly items: readonly ListItemNode[]
}

export type BlockNode = ParagraphBlockNode | BulletListBlockNode | NumberedListBlockNode

export interface ParseResult {
  readonly nodes: readonly BlockNode[]
  /** `true` when `md` was longer than `MAX_MARKDOWN_LENGTH` and was cut before parsing. */
  readonly truncated: boolean
}

/**
 * 03-pages-and-dashboards.md §2's `text.md` cap, also enforced on the whole
 * block by `validatePage`. Kept here too so `parse` refuses gracefully
 * (AC-1184) rather than throwing or silently dropping the tail.
 */
export const MAX_MARKDOWN_LENGTH = 8000

/** The two link shapes `render.ts` may turn into a real link — AC-1182. */
const HTTP_URL = /^https?:\/\//i

export type LinkPolicy =
  | { readonly allowed: true; readonly href: string; readonly internal: boolean }
  | { readonly allowed: false }

/**
 * An **allow-list**, not a deny-list of bad protocols: `javascript:`,
 * `data:`, `//host` and any obfuscated variant all fail the same two checks
 * rather than needing a rule of their own.
 */
export function linkPolicy(rawHref: string): LinkPolicy {
  const href = rawHref.trim()
  if (href === '') return { allowed: false }
  if (HTTP_URL.test(href)) return { allowed: true, href, internal: false }
  // A leading "/" is internal — but "//evil" is protocol-relative, not a path.
  if (href.startsWith('/') && !href.startsWith('//')) return { allowed: true, href, internal: true }
  return { allowed: false }
}

/**
 * Truncates on a `.length` boundary (matching the validator's own 8,000
 * *characters* cap) without splitting a surrogate pair in two, which would
 * otherwise hand the parser a lone high surrogate and render it as U+FFFD.
 */
function truncateToLimit(md: string): string {
  if (md.length <= MAX_MARKDOWN_LENGTH) return md
  const cut = md.slice(0, MAX_MARKDOWN_LENGTH)
  const lastUnit = cut.charCodeAt(cut.length - 1)
  const isLoneHighSurrogate = lastUnit >= 0xd800 && lastUnit <= 0xdbff
  return isLoneHighSurrogate ? cut.slice(0, -1) : cut
}

export function parse(md: string): ParseResult {
  invariant(typeof md === 'string', 'parse needs a string.')

  const truncated = md.length > MAX_MARKDOWN_LENGTH
  const input = truncated ? truncateToLimit(md) : md

  return { nodes: parseBlocks(input), truncated }
}

const BULLET_ITEM = /^-\s+(.*)$/
const NUMBERED_ITEM = /^\d+\.\s+(.*)$/

type OpenList = { readonly type: 'bulletList' | 'numberedList'; readonly items: string[] }

function parseBlocks(md: string): BlockNode[] {
  const lines = md.split(/\r\n|\r|\n/)
  const blocks: BlockNode[] = []

  let paragraphLines: string[] = []
  let openList: OpenList | null = null

  const flushParagraph = (): void => {
    if (paragraphLines.length === 0) return
    blocks.push({ type: 'paragraph', children: parseInline(paragraphLines.join('\n')) })
    paragraphLines = []
  }

  const flushList = (): void => {
    if (openList === null) return
    const list = openList
    blocks.push({
      type: list.type,
      items: list.items.map((content) => ({ type: 'listItem', children: parseInline(content) })),
    })
    openList = null
  }

  for (const line of lines) {
    if (line.trim() === '') {
      flushParagraph()
      flushList()
      continue
    }

    const bullet = BULLET_ITEM.exec(line)
    if (bullet !== null) {
      flushParagraph()
      if (openList === null || openList.type !== 'bulletList') {
        flushList()
        openList = { type: 'bulletList', items: [] }
      }
      openList.items.push(bullet[1] ?? '')
      continue
    }

    const numbered = NUMBERED_ITEM.exec(line)
    if (numbered !== null) {
      flushParagraph()
      if (openList === null || openList.type !== 'numberedList') {
        flushList()
        openList = { type: 'numberedList', items: [] }
      }
      openList.items.push(numbered[1] ?? '')
      continue
    }

    // A plain line ends a list — this subset has no continuation lines — and
    // joins whatever paragraph is open, becoming a `break` at render time.
    flushList()
    paragraphLines.push(line)
  }

  flushParagraph()
  flushList()

  return blocks
}

/**
 * One pass, left to right, `.charAt` throughout so a read is always a
 * `string` under `noUncheckedIndexedAccess`. Every delimiter falls back to
 * a literal character the moment its close is missing — an unclosed tag or malformed link becomes inert text.
 */
function parseInline(raw: string): InlineNode[] {
  const nodes: InlineNode[] = []
  let buffer = ''
  let i = 0

  const flushBuffer = (): void => {
    if (buffer !== '') nodes.push({ type: 'text', value: buffer })
    buffer = ''
  }

  while (i < raw.length) {
    const ch = raw.charAt(i)

    if (ch === '\n') {
      flushBuffer()
      nodes.push({ type: 'break' })
      i += 1
      continue
    }

    if (ch === '`') {
      const end = raw.indexOf('`', i + 1)
      if (end !== -1) {
        flushBuffer()
        nodes.push({ type: 'code', value: raw.slice(i + 1, end) })
        i = end + 1
        continue
      }
    }

    if (ch === '*' && raw.charAt(i + 1) === '*') {
      const end = raw.indexOf('**', i + 2)
      if (end !== -1 && end > i + 2) {
        flushBuffer()
        nodes.push({ type: 'bold', children: parseInline(raw.slice(i + 2, end)) })
        i = end + 2
        continue
      }
    }

    if (ch === '_') {
      const end = raw.indexOf('_', i + 1)
      if (end !== -1 && end > i + 1) {
        flushBuffer()
        nodes.push({ type: 'italic', children: parseInline(raw.slice(i + 1, end)) })
        i = end + 1
        continue
      }
    }

    // `![…](…)` is image syntax — unsupported, so a `[` preceded by `!` never
    // opens a link (AC-1181: an image is text, not a link to its own URL).
    if (ch === '[' && raw.charAt(i - 1) !== '!') {
      const link = tryParseLink(raw, i)
      if (link !== null) {
        flushBuffer()
        nodes.push(link.node)
        i = link.next
        continue
      }
    }

    buffer += ch
    i += 1
  }

  flushBuffer()
  return nodes
}

/**
 * `[label](href)` at index `start`. `null` on anything else — nested `[`,
 * a multi-line label/href, a missing `(`/`)`, or a refused `href` — so the
 * caller's literal-character fallback reproduces the source untouched. The
 * whole defence against a nested markdown-link payload.
 */
function tryParseLink(raw: string, start: number): { node: LinkInlineNode; next: number } | null {
  let labelEnd = -1
  for (let j = start + 1; j < raw.length; j += 1) {
    const c = raw.charAt(j)
    if (c === '[' || c === '\n') return null
    if (c === ']') {
      labelEnd = j
      break
    }
  }
  if (labelEnd === -1 || raw.charAt(labelEnd + 1) !== '(') return null

  let hrefEnd = -1
  for (let j = labelEnd + 2; j < raw.length; j += 1) {
    const c = raw.charAt(j)
    if (c === '(' || c === '\n') return null
    if (c === ')') {
      hrefEnd = j
      break
    }
  }
  if (hrefEnd === -1) return null

  const policy = linkPolicy(raw.slice(labelEnd + 2, hrefEnd))
  if (!policy.allowed) return null

  return {
    node: {
      type: 'link',
      href: policy.href,
      internal: policy.internal,
      children: parseInline(raw.slice(start + 1, labelEnd)),
    },
    next: hrefEnd + 1,
  }
}
