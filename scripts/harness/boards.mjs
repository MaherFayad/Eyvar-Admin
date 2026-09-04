/**
 * The four management boards at 1280 x 800: every 12px muted paragraph inside a
 * card (X15/T9.9), the chapter grids' column counts (T5.6) and the band's
 * period pill (T5.7). jsdom draws no grid and no chart, so this is the only
 * thing that measures them. Run `npx vite --port 4341` first.
 *
 *   node scripts/harness/boards.mjs [label]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4341'
const LABEL = process.argv[2] ?? 'now'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })

const ROUTES = [
  ['mgmt-overview', '/management/overview'],
  ['mgmt-performance', '/management/performance'],
  ['mgmt-risk', '/management/risk'],
  ['mgmt-growth', '/management/growth'],
]

const browser = await chromium.launch()
for (const [name, url] of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  await page.goto(BASE + url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  if (LABEL === 'ar') {
    await page.getByRole('button', { name: 'Account' }).click()
    await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
    await page.waitForTimeout(2400)
  }
  await page.screenshot({ path: `${OUT}/board-${name}-${LABEL}.png`, fullPage: true })

  const facts = await page.evaluate(() => {
    const visible = (n) => n.getBoundingClientRect().height > 0
    const cards = [...document.querySelectorAll('[data-slot="card"]')]
    /* The X15 target: a 12px muted PARAGRAPH inside a card. */
    const mutedParas = cards.flatMap((c) =>
      [...c.querySelectorAll('p.text-xs.text-muted-foreground')].filter(visible),
    )
    /* Every 12px muted node inside a card, paragraph or not, for the count. */
    const mutedNodes = cards.flatMap((c) =>
      [...c.querySelectorAll('.text-xs.text-muted-foreground')].filter(visible),
    )
    const chapters = [...document.querySelectorAll('ul[data-slot="chapter-figures"]')].map((ul) => ({
      tiles: ul.children.length,
      columns: getComputedStyle(ul).gridTemplateColumns.split(' ').length,
      widths: getComputedStyle(ul)
        .gridTemplateColumns.split(' ')
        .map((w) => Math.round(parseFloat(w))),
    }))
    const hints = [...document.querySelectorAll('[data-slot="card"] button')].filter(
      (b) => (b.getAttribute('aria-label') ?? '') === 'What this means',
    ).length
    const pill = document.querySelector('h1')?.closest('section')?.querySelector('button bdi')
    return {
      cards: cards.length,
      mutedParagraphsInCards: mutedParas.length,
      mutedParagraphText: mutedParas.map((p) => p.textContent.trim().slice(0, 60)),
      mutedNodesInCards: mutedNodes.length,
      infoHintsInCards: hints,
      chapterGrids: chapters,
      periodPill: pill ? pill.textContent.trim() : null,
      /* T1.5 — the control's own box, so RTL puts it where the band's row does. */
      refresh: (() => {
        const band = document.querySelector('h1')?.closest('section')
        const b = [...(band?.querySelectorAll('button') ?? [])].find((n) =>
          n.querySelector('svg.lucide-refresh-cw'),
        )
        if (!b) return null
        const r = b.getBoundingClientRect()
        return { label: b.textContent.trim(), x: Math.round(r.x), width: Math.round(r.width) }
      })(),
      emDashes: (document.body.innerText.match(/—/g) ?? []).length,
      dir: document.documentElement.dir,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })
  /* T5.6 — the first chapter that holds two figures, on its own. */
  const two = page.locator('ul[data-slot="chapter-figures"]').filter({ has: page.locator('> li:nth-child(2)') })
  const pair = two.first()
  if ((await pair.count()) > 0) {
    await pair.scrollIntoViewIfNeeded()
    const section = pair.locator('xpath=..')
    await section.screenshot({ path: `${OUT}/chapter-${name}-${LABEL}.png` })
  }
  console.log(`${name} ${LABEL}`, JSON.stringify(facts, null, 1))
  if (errors.length) console.log(name, 'ERRORS', errors)
  await ctx.close()
}
await browser.close()
