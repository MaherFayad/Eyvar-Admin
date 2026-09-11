import { describe, expect, it } from 'vitest'
import { linkPolicy, MAX_MARKDOWN_LENGTH, parse, type BlockNode, type InlineNode } from './parse'

describe('AC-1181 — paragraphs and line breaks', () => {
  it('parses one paragraph of plain text', () => {
    expect(parse('Fleet 12 is over its SLA.').nodes).toEqual([
      { type: 'paragraph', children: [{ type: 'text', value: 'Fleet 12 is over its SLA.' }] },
    ])
  })

  it('splits on a blank line into two paragraphs', () => {
    const { nodes } = parse('First.\n\nSecond.')
    expect(nodes).toEqual([
      { type: 'paragraph', children: [{ type: 'text', value: 'First.' }] },
      { type: 'paragraph', children: [{ type: 'text', value: 'Second.' }] },
    ])
  })

  it('keeps a single newline inside a paragraph as a `break` node', () => {
    const { nodes } = parse('Line one\nLine two')
    expect(nodes).toEqual([
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Line one' },
          { type: 'break' },
          { type: 'text', value: 'Line two' },
        ],
      },
    ])
  })
})

describe('AC-1181 — bold, italic and code', () => {
  it('parses **bold**', () => {
    const { nodes } = parse('An **urgent** trip.')
    expect(nodes).toEqual([
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'An ' },
          { type: 'bold', children: [{ type: 'text', value: 'urgent' }] },
          { type: 'text', value: ' trip.' },
        ],
      },
    ])
  })

  it('parses _italic_', () => {
    const { nodes } = parse('A _quiet_ shift.')
    expect(nodes).toEqual([
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'A ' },
          { type: 'italic', children: [{ type: 'text', value: 'quiet' }] },
          { type: 'text', value: ' shift.' },
        ],
      },
    ])
  })

  it('parses `code`, literally — no nested inline syntax inside it', () => {
    const { nodes } = parse('Run `npm run **not-bold**`.')
    expect(nodes).toEqual([
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Run ' },
          { type: 'code', value: 'npm run **not-bold**' },
          { type: 'text', value: '.' },
        ],
      },
    ])
  })

  it('leaves an unclosed ** as literal text', () => {
    const { nodes } = parse('**never closes')
    expect(nodes).toEqual([
      { type: 'paragraph', children: [{ type: 'text', value: '**never closes' }] },
    ])
  })

  it('leaves an unclosed ` as literal text', () => {
    const { nodes } = parse('`never closes')
    expect(nodes).toEqual([
      { type: 'paragraph', children: [{ type: 'text', value: '`never closes' }] },
    ])
  })
})

describe('AC-1181 — bullet and numbered lists, one level', () => {
  it('parses a bullet list', () => {
    const { nodes } = parse('- First\n- Second\n- Third')
    expect(nodes).toEqual([
      {
        type: 'bulletList',
        items: [
          { type: 'listItem', children: [{ type: 'text', value: 'First' }] },
          { type: 'listItem', children: [{ type: 'text', value: 'Second' }] },
          { type: 'listItem', children: [{ type: 'text', value: 'Third' }] },
        ],
      },
    ])
  })

  it('parses a numbered list regardless of the literal numbers used', () => {
    const { nodes } = parse('1. First\n1. Second\n1. Third')
    expect(nodes).toEqual([
      {
        type: 'numberedList',
        items: [
          { type: 'listItem', children: [{ type: 'text', value: 'First' }] },
          { type: 'listItem', children: [{ type: 'text', value: 'Second' }] },
          { type: 'listItem', children: [{ type: 'text', value: 'Third' }] },
        ],
      },
    ])
  })

  it('ends a list at a plain line and starts a new paragraph', () => {
    const { nodes } = parse('- One\nBack to prose')
    expect(nodes).toEqual([
      { type: 'bulletList', items: [{ type: 'listItem', children: [{ type: 'text', value: 'One' }] }] },
      { type: 'paragraph', children: [{ type: 'text', value: 'Back to prose' }] },
    ])
  })

  it('a numbered list interrupting a bullet list closes the bullet list', () => {
    const { nodes } = parse('- a\n1. b')
    expect(nodes).toEqual([
      { type: 'bulletList', items: [{ type: 'listItem', children: [{ type: 'text', value: 'a' }] }] },
      { type: 'numberedList', items: [{ type: 'listItem', children: [{ type: 'text', value: 'b' }] }] },
    ])
  })
})

describe('AC-1181 — not supported, rendered as text', () => {
  const asPlainText = (md: string): BlockNode[] => [
    { type: 'paragraph', children: [{ type: 'text', value: md }] },
  ]

  it('a raw <script> tag is text, never markup', () => {
    expect(parse('<script>alert(1)</script>').nodes).toEqual(
      asPlainText('<script>alert(1)</script>'),
    )
  })

  it('an image is not supported — the source stays literal', () => {
    expect(parse('![alt](http://example.com/x.png)').nodes).toEqual(
      asPlainText('![alt](http://example.com/x.png)'),
    )
  })

  it('a heading marker inside text is not a heading — headings are blocks', () => {
    expect(parse('# Not a heading').nodes).toEqual(asPlainText('# Not a heading'))
  })

  it('a table pipe row is not a table — tables are blocks', () => {
    expect(parse('| a | b |').nodes).toEqual(asPlainText('| a | b |'))
  })
})

describe('AC-1182 — link policy', () => {
  it.each([
    ['http://example.com', true],
    ['https://example.com/report/42', true],
    ['HTTPS://example.com', true],
    ['/management/reports/pages/42', true],
    ['javascript:alert(1)', false],
    ['JAVASCRIPT:alert(1)', false],
    ['vbscript:msgbox(1)', false],
    ['data:text/html;base64,AAAA', false],
    ['//evil.example.com', false],
    ['ftp://example.com', false],
    ['mailto:ops@eyvar.com', false],
    ['', false],
    ['   ', false],
  ] as const)('linkPolicy(%s) → allowed=%s', (href, allowed) => {
    const result = linkPolicy(href)
    expect(result.allowed).toBe(allowed)
    if (result.allowed) expect(result.href).toBe(href.trim())
  })

  it('parses an allowed http link with a mirrored internal flag of false', () => {
    const { nodes } = parse('[report](https://example.com/r)')
    expect(nodes).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'link',
            href: 'https://example.com/r',
            internal: false,
            children: [{ type: 'text', value: 'report' }],
          },
        ],
      },
    ])
  })

  it('parses an allowed internal link with internal=true', () => {
    const { nodes } = parse('[page](/management/reports/pages/42)')
    expect(nodes).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'link',
            href: '/management/reports/pages/42',
            internal: true,
            children: [{ type: 'text', value: 'page' }],
          },
        ],
      },
    ])
  })

  it('a javascript: link renders as text, not a link node', () => {
    const { nodes } = parse('[click me](javascript:alert(1))')
    expect(nodes).toEqual([
      { type: 'paragraph', children: [{ type: 'text', value: '[click me](javascript:alert(1))' }] },
    ])
  })

  it('a protocol-relative //evil link renders as text', () => {
    const { nodes } = parse('[click me](//evil.example.com)')
    expect(nodes).toEqual([
      { type: 'paragraph', children: [{ type: 'text', value: '[click me](//evil.example.com)' }] },
    ])
  })
})

describe('AC-1184 — size cap', () => {
  it('does not truncate at exactly the cap', () => {
    const md = 'a'.repeat(MAX_MARKDOWN_LENGTH)
    const { truncated, nodes } = parse(md)
    expect(truncated).toBe(false)
    expect(nodes).toEqual([{ type: 'paragraph', children: [{ type: 'text', value: md }] }])
  })

  it('truncates one character over the cap and says so, rather than throwing', () => {
    const md = 'a'.repeat(MAX_MARKDOWN_LENGTH + 1)
    expect(() => parse(md)).not.toThrow()
    const { truncated, nodes } = parse(md)
    expect(truncated).toBe(true)
    expect(nodes).toEqual([
      { type: 'paragraph', children: [{ type: 'text', value: 'a'.repeat(MAX_MARKDOWN_LENGTH) }] },
    ])
  })

  it('never drops content under the cap — a very large input still parses the retained portion', () => {
    const md = `${'x'.repeat(MAX_MARKDOWN_LENGTH - 5)}\n\n${'y'.repeat(50)}`
    const { truncated, nodes } = parse(md)
    expect(truncated).toBe(true)
    expect(nodes.length).toBeGreaterThan(0)
    expect(nodes[0]).toEqual({
      type: 'paragraph',
      children: [{ type: 'text', value: 'x'.repeat(MAX_MARKDOWN_LENGTH - 5) }],
    })
  })

  it('does not split a surrogate pair at the cut, leaving no lone surrogate behind', () => {
    // An emoji (two UTF-16 code units) straddling the exact cap boundary.
    const md = `${'a'.repeat(MAX_MARKDOWN_LENGTH - 1)}\u{1F600}`
    const { nodes } = parse(md)
    const first = nodes[0]
    expect(first?.type).toBe('paragraph')
    const text = first?.type === 'paragraph' ? first.children[0] : undefined
    expect(text?.type).toBe('text')
    const value = text?.type === 'text' ? text.value : ''
    // Either the whole emoji made it in, or neither surrogate did.
    expect(/[\uD800-\uDBFF]$/.test(value)).toBe(false)
  })

  it('rejects a non-string input rather than parsing garbage', () => {
    // @ts-expect-error — deliberately wrong shape, asserting the runtime guard
    expect(() => parse(null)).toThrow()
  })
})

describe('XSS corpus — inputs that must never become markup', () => {
  const corpus: readonly string[] = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<svg onload=alert(1)>',
    '<a href="javascript:alert(1)">click</a>',
    '[click](javascript:alert(1))',
    '[click](  javascript:alert(1))',
    '[click](JavaScript:alert(1))',
    '[click](java\tscript:alert(1))',
    '[click](javascript&#58;alert(1))',
    '[click](javascript&colon;alert(1))',
    '[click](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)',
    '[click](//evil.example.com/x)',
    '[click](vbscript:msgbox(1))',
    '[[inner](javascript:alert(1))](http://good.example)',
    '[click](http://evil.example)javascript:alert(1))',
    '[a](http://good.example"onmouseover="alert(1))',
    '**bold <script>alert(1)</script>**',
    '_italic <img src=x onerror=alert(1)> _',
    '`<script>alert(1)</script>`',
    '<div onclick="alert(1)">unclosed',
    '<b>unterminated bold tag',
    'text with a null byte \0 <script>alert(1)</script>',
    '‮evil<script>alert(1)</script>‬',
    '⁦<script>alert(1)</script>⁩',
    '<style>*{background:url("javascript:alert(1)")}</style>',
    '<object data="javascript:alert(1)">',
    '[click](jav ascript:alert(1))',
  ]

  it('has at least 25 hostile inputs', () => {
    expect(corpus.length).toBeGreaterThanOrEqual(25)
  })

  it.each(corpus.map((md) => [md] as const))('produces no `link` node with a disallowed href for %j', (md) => {
    const { nodes } = parse(md)
    const disallowedLinks = collectLinks(nodes).filter((link) => !linkPolicy(link.href).allowed)
    expect(disallowedLinks).toEqual([])
  })

  it.each(corpus.map((md) => [md] as const))('never produces a node type outside the closed set for %j', (md) => {
    const { nodes } = parse(md)
    for (const block of nodes) {
      expect(['paragraph', 'bulletList', 'numberedList']).toContain(block.type)
    }
  })
})

function collectLinks(nodes: readonly BlockNode[]): { href: string }[] {
  const links: { href: string }[] = []
  const walkInline = (children: readonly InlineNode[]): void => {
    for (const child of children) {
      switch (child.type) {
        case 'link':
          links.push({ href: child.href })
          walkInline(child.children)
          break
        case 'bold':
        case 'italic':
          walkInline(child.children)
          break
        case 'text':
        case 'code':
        case 'break':
          break
      }
    }
  }
  for (const block of nodes) {
    if (block.type === 'paragraph') walkInline(block.children)
    if (block.type === 'bulletList' || block.type === 'numberedList') {
      for (const item of block.items) walkInline(item.children)
    }
  }
  return links
}
