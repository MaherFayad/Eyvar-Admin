/**
 * R4-1's 268px panel floor on the board that carries §C4's scope — DSH-3, whose
 * tiles are a half-width pie, a missing tile and a FULL-width retention matrix.
 * `tile-density.mjs` walks DSH-1; this walks the one with a `span: 'full'` tile
 * that is not the first, so the grid's reflow is measured rather than reasoned.
 *
 *     node scratch/dash-scope-density.mjs
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:4327'
const FLOOR = 268
const WIDTHS = [1280, 1344, 1440, 1920]
const BOARD = '/management/reports/dashboards/DSH-3'

const browser = await chromium.launch()
let failures = 0
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 1400 } })
  const page = await ctx.newPage()
  await page.goto(BASE + BOARD, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  const out = await page.evaluate(() => {
    const round = (n) => Math.round(n)
    const tiles = [...document.querySelectorAll('li')].filter((li) =>
      li.querySelector('[data-slot="card"]'),
    )
    return tiles.map((li) => {
      const grid = [...li.querySelectorAll('ul[role="list"]')].find(
        (el) => getComputedStyle(el).display === 'grid',
      )
      const panels = grid ? [...grid.children].map((el) => round(el.getBoundingClientRect().width)) : []
      return {
        title: (li.querySelector('[data-slot="card-title"]')?.textContent ?? '').trim().slice(0, 44),
        tile: round(li.getBoundingClientRect().width),
        span: li.className.includes('col-span-2') ? 'full' : 'half',
        ownRange: li.textContent.includes('Own range'),
        panels,
      }
    })
  })
  for (const tile of out) {
    const worst = tile.panels.length ? Math.min(...tile.panels) : Infinity
    const bad = worst < FLOOR
    if (bad) failures += 1
    console.log(
      `${String(width).padStart(4)}  ${tile.title.padEnd(46)} span=${tile.span.padEnd(4)} ` +
        `tileW=${String(tile.tile).padStart(4)} ownRange=${tile.ownRange ? 'yes' : 'no '} ` +
        `panels=[${tile.panels.join(', ')}]` + (bad ? `  <-- UNDER ${FLOOR}` : ''),
    )
  }
  await ctx.close()
}
await browser.close()
console.log(failures === 0 ? `\nOK - no panel under ${FLOOR}px` : `\nFAIL - ${failures} tiles`)
process.exit(failures === 0 ? 0 : 1)
