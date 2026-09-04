/**
 * **The 268px panel floor, measured rather than assumed** (R4-1 §1.4).
 *
 * §3.7's analytics grid is three columns at a ~19–20px gutter and R4-1 states a
 * 268px floor per panel. The two agree only above `--ev-bp-wide`, so
 * `MetricBoardScreen.panelColumns` buys the third column there and not before.
 * This walks six widths on the boards that carry the most panels and fails on
 * anything under the floor.
 *
 *     node scratch/board-density.mjs
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:4325'
const FLOOR = 268
const WIDTHS = [800, 1024, 1280, 1344, 1440, 1920]
const BOARDS = ['/management/performance', '/management/risk', '/management/overview']

const browser = await chromium.launch()
let failures = 0

for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 1000 } })
  const page = await ctx.newPage()
  for (const board of BOARDS) {
    await page.goto(BASE + board, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    const out = await page.evaluate(() => {
      const round = (n) => Math.round(n)
      /* The panel row: the grid INSIDE the `@container` section. */
      const section = [...document.querySelectorAll('section > div')].find(
        (el) => getComputedStyle(el).display === 'grid' && el.children.length > 0,
      )
      const cards = [...document.querySelectorAll('[data-slot="card"]')]
      const panels = section ? [...section.children] : []
      const grid = section ? getComputedStyle(section) : null
      const figures = document.querySelector('ul[data-numeric]')
      const band = document.querySelector('[role="radiogroup"], section ul[data-numeric]')
      return {
        cards: cards.length,
        panels: panels.map((el) => round(el.getBoundingClientRect().width)),
        columnGap: grid ? grid.columnGap : null,
        rowGap: grid ? grid.rowGap : null,
        columns: grid ? grid.gridTemplateColumns.split(' ').length : 0,
        chapterGap: figures ? getComputedStyle(figures).columnGap : null,
        bandGap: band ? getComputedStyle(band).columnGap : null,
      }
    })
    const worst = out.panels.length ? Math.min(...out.panels) : Infinity
    const bad = worst < FLOOR
    if (bad) failures += 1
    console.log(
      `${String(width).padStart(4)}  ${board.padEnd(26)} cols=${out.columns} ` +
        `gap=${out.columnGap}/${out.rowGap} panels=[${out.panels.join(', ')}] ` +
        `cards=${out.cards} chapterGap=${out.chapterGap} bandGap=${out.bandGap}` +
        (bad ? `  <-- UNDER ${FLOOR}` : ''),
    )
  }
  await ctx.close()
}

await browser.close()
console.log(failures === 0 ? `\nOK - no panel under ${FLOOR}px` : `\nFAIL - ${failures} rows`)
process.exit(failures === 0 ? 0 : 1)
