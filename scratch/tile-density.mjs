/**
 * **R4-1's 268px panel floor, on a DASHBOARD TILE** — measured, not predicted.
 *
 * `board-density.mjs` walks the metric boards. This walks the board that holds
 * a TWO-PANEL tile (DSH-1 / TIL-1 → RPT-1, two measures → two panels), because
 * `ResultCanvas` splits a multi-panel run across the width it is given and a
 * tile is half a content region wide.
 *
 *     node scratch/tile-density.mjs
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:4327'
const FLOOR = 268
const WIDTHS = [1280, 1344, 1440, 1920]
const BOARD = '/management/reports/dashboards/DSH-1'

const browser = await chromium.launch()
let failures = 0

for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 1200 } })
  const page = await ctx.newPage()
  await page.goto(BASE + BOARD, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const out = await page.evaluate(() => {
    const round = (n) => Math.round(n)
    const tiles = [...document.querySelectorAll('li')].filter((li) =>
      li.querySelector('[data-slot="card"]'),
    )
    return tiles.map((li) => {
      /* The small-multiples grid inside this tile, if it has one. */
      const grid = [...li.querySelectorAll('ul[role="list"]')].find(
        (el) => getComputedStyle(el).display === 'grid',
      )
      const panels = grid ? [...grid.children].map((el) => round(el.getBoundingClientRect().width)) : []
      return {
        title: (li.querySelector('[data-slot="card-title"]')?.textContent ?? '').trim().slice(0, 40),
        tile: round(li.getBoundingClientRect().width),
        cards: li.querySelectorAll('[data-slot="card"]').length,
        columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
        panels,
      }
    })
  })
  for (const tile of out) {
    const worst = tile.panels.length ? Math.min(...tile.panels) : Infinity
    const bad = worst < FLOOR
    if (bad) failures += 1
    console.log(
      `${String(width).padStart(4)}  ${tile.title.padEnd(42)} tileW=${String(tile.tile).padStart(4)} ` +
        `cards=${tile.cards} cols=${tile.columns} panels=[${tile.panels.join(', ')}]` +
        (bad ? `  <-- UNDER ${FLOOR}` : ''),
    )
  }
  await ctx.close()
}

await browser.close()
console.log(failures === 0 ? `\nOK - no panel under ${FLOOR}px` : `\nFAIL - ${failures} tiles`)
process.exit(failures === 0 ? 0 : 1)
