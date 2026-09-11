import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactElement } from 'react'
import { render as renderDom, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '../i18n/translate'
import { MARKDOWN_MESSAGES_EN, parse, render, renderMarkdown } from './index'

const t = createTranslator({ dictionary: MARKDOWN_MESSAGES_EN })

function Host({ md }: { md: string }): ReactElement {
  const { nodes } = parse(md)
  return <>{render(nodes)}</>
}

function renderMd(md: string): ReturnType<typeof renderDom> {
  return renderDom(
    <MemoryRouter>
      <Host md={md} />
    </MemoryRouter>,
  )
}

describe('no dangerouslySetInnerHTML anywhere in this module', () => {
  it('render.ts contains no dangerouslySetInnerHTML', () => {
    const source = readFileSync(join(process.cwd(), 'src/lib/markdown/render.ts'), 'utf8')
    expect(source).not.toMatch(/dangerouslySetInnerHTML\s*[:=]/)
  })

  it('index.ts contains no dangerouslySetInnerHTML', () => {
    const source = readFileSync(join(process.cwd(), 'src/lib/markdown/index.ts'), 'utf8')
    expect(source).not.toMatch(/dangerouslySetInnerHTML\s*[:=]/)
  })
})

describe('AC-1181 — round trip, every supported construct', () => {
  it('a paragraph renders as <p>', () => {
    const { container } = renderMd('Fleet 12 is over its SLA.')
    const p = container.querySelector('p')
    expect(p).not.toBeNull()
    expect(p?.textContent).toBe('Fleet 12 is over its SLA.')
  })

  it('two paragraphs from a blank-line split render as two <p>', () => {
    const { container } = renderMd('First.\n\nSecond.')
    expect(container.querySelectorAll('p')).toHaveLength(2)
  })

  it('a single newline renders a <br> inside one paragraph', () => {
    const { container } = renderMd('Line one\nLine two')
    expect(container.querySelectorAll('p')).toHaveLength(1)
    expect(container.querySelector('br')).not.toBeNull()
  })

  it('**bold** renders <strong>', () => {
    const { container } = renderMd('An **urgent** trip.')
    const strong = container.querySelector('strong')
    expect(strong?.textContent).toBe('urgent')
  })

  it('_italic_ renders <em>', () => {
    const { container } = renderMd('A _quiet_ shift.')
    const em = container.querySelector('em')
    expect(em?.textContent).toBe('quiet')
  })

  it('`code` renders <code>, and its content is never re-parsed', () => {
    const { container } = renderMd('Run `npm run **not-bold**`.')
    const code = container.querySelector('code')
    expect(code?.textContent).toBe('npm run **not-bold**')
    expect(code?.querySelector('strong')).toBeNull()
  })

  it('a bullet list renders <ul><li>', () => {
    const { container } = renderMd('- First\n- Second')
    const ul = container.querySelector('ul')
    expect(ul).not.toBeNull()
    expect(ul?.querySelectorAll('li')).toHaveLength(2)
    expect(ul?.className).toContain('list-disc')
  })

  it('a numbered list renders <ol><li>', () => {
    const { container } = renderMd('1. First\n1. Second')
    const ol = container.querySelector('ol')
    expect(ol).not.toBeNull()
    expect(ol?.querySelectorAll('li')).toHaveLength(2)
    expect(ol?.className).toContain('list-decimal')
  })

  it('an http link renders <a target="_blank" rel="noreferrer noopener"> with the external glyph', () => {
    const { container } = renderMd('[report](https://example.com/r)')
    const a = container.querySelector('a')
    expect(a).not.toBeNull()
    expect(a?.getAttribute('href')).toBe('https://example.com/r')
    expect(a?.getAttribute('target')).toBe('_blank')
    expect(a?.getAttribute('rel')).toBe('noreferrer noopener')
    expect(a?.textContent).toContain('↗')
  })

  it('an internal /path link renders a router <a> with no target and no glyph', () => {
    const { container } = renderMd('[page](/management/reports/pages/42)')
    const a = container.querySelector('a')
    expect(a).not.toBeNull()
    expect(a?.getAttribute('href')).toBe('/management/reports/pages/42')
    expect(a?.getAttribute('target')).toBeNull()
    expect(a?.textContent).not.toContain('↗')
  })
})

describe('AC-1181 — not supported, rendered as text', () => {
  it('a raw <script> tag never becomes a script element', () => {
    const { container } = renderMd('<script>alert(1)</script>')
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toContain('<script>alert(1)</script>')
  })

  it('an image marker never becomes an <img>', () => {
    const { container } = renderMd('![alt](http://example.com/x.png)')
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('![alt](http://example.com/x.png)')
  })
})

describe('AC-1182 — link policy at render time', () => {
  it.each([
    'javascript:alert(1)',
    'JAVASCRIPT:alert(1)',
    'vbscript:msgbox(1)',
    'data:text/html;base64,AAAA',
    '//evil.example.com',
  ])('a %s link renders as text — no <a> element at all', (href) => {
    const { container } = renderMd(`[click me](${href})`)
    expect(container.querySelector('a')).toBeNull()
    expect(container.textContent).toContain(`[click me](${href})`)
  })

  it.each(['http://example.com', 'https://example.com/r', '/management/overview'])(
    'a %s link renders exactly one <a>',
    (href) => {
      const { container } = renderMd(`[go](${href})`)
      expect(container.querySelectorAll('a')).toHaveLength(1)
      expect(container.querySelector('a')?.getAttribute('href')).toBe(href)
    },
  )
})

describe('AC-1183 — bidi isolation, a DOM assertion on the bdi wrapper', () => {
  it('wraps a text run in <bdi>', () => {
    const { container } = renderMd('Fleet 12 is over its SLA.')
    const bdi = container.querySelector('bdi')
    expect(bdi).not.toBeNull()
    expect(bdi?.textContent).toBe('Fleet 12 is over its SLA.')
  })

  it('a Latin measure name inside Arabic prose is inside its own <bdi>, not the paragraph itself', () => {
    const { container } = renderMd('عدد الرحلات المتأخرة عن SLA اليوم كبير.')
    const p = container.querySelector('p')
    const bdi = container.querySelector('bdi')
    expect(p).not.toBeNull()
    expect(bdi).not.toBeNull()
    // The bdi is a descendant of the paragraph, carrying the run — never the
    // paragraph itself, which is §5.4's whole finding: a stretched bdi
    // reorders. The paragraph is the box; the bdi is only ever inside it.
    expect(p?.contains(bdi as Node)).toBe(true)
    expect(bdi).not.toBe(p)
    expect(bdi?.textContent).toContain('SLA')
  })

  it('a link label is also bdi-wrapped, one level inside the <a>', () => {
    const { container } = renderMd('[Open scan](https://example.com/x)')
    const a = container.querySelector('a')
    const bdi = a?.querySelector('bdi')
    expect(bdi?.textContent).toBe('Open scan')
  })
})

describe('AC-1184 — size cap, truncated and noticed, never dropped', () => {
  it('renders the retained text plus a stated notice when the input is over the cap', () => {
    const retained = 'x'.repeat(8000)
    const md = `${retained}\n\nnever seen`
    const nodes = renderMarkdown(md, { translate: t })
    expect(nodes.length).toBeGreaterThan(0)

    const { container } = renderDom(
      <MemoryRouter>
        <>{nodes}</>
      </MemoryRouter>,
    )
    expect(container.textContent).toContain(retained.slice(0, 100))
    expect(container.textContent).not.toContain('never seen')
    expect(screen.getByText(t('markdown.truncated'))).toBeInTheDocument()
  })

  it('renders no notice when the input is at or under the cap', () => {
    const md = 'a'.repeat(8000)
    const nodes = renderMarkdown(md, { translate: t })
    const { container } = renderDom(
      <MemoryRouter>
        <>{nodes}</>
      </MemoryRouter>,
    )
    expect(container.textContent).not.toContain(t('markdown.truncated'))
  })
})

describe('XSS corpus (render) — inputs that must never become markup', () => {
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
    '[click](jav ascript:alert(1))',
  ]

  it('has at least 25 hostile inputs', () => {
    expect(corpus.length).toBeGreaterThanOrEqual(25)
  })

  it.each(corpus.map((md) => [md] as const))(
    'renders %j as inert text: no dangerous element, no event attribute, no javascript/vbscript/data href',
    (md) => {
      const { container } = renderMd(md)
      expect(
        container.querySelector('script, img, iframe, svg, style, object, embed, video, audio, form, input'),
      ).toBeNull()
      expect(
        container.querySelectorAll('[onerror], [onload], [onclick], [onmouseover]').length,
      ).toBe(0)
      for (const a of Array.from(container.querySelectorAll('a'))) {
        const href = a.getAttribute('href') ?? ''
        expect(/^(javascript|vbscript|data):/i.test(href)).toBe(false)
        expect(href.startsWith('//')).toBe(false)
      }
    },
  )
})
