/**
 * `DashboardTile` renders the same `ResultCanvas`, so the compound chart landed
 * on every board too. A tile is a third of the width the builder gets and has
 * no toolbar, so this is where the change is most likely to have broken
 * something nobody was looking at.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4327'
const OUT = './scripts/harness/shots'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()

for (const [name, url, w] of [
  ['dsh1-1440', '/management/reports/dashboards/DSH-1', 1440],
  ['dsh3-1440', '/management/reports/dashboards/DSH-3', 1440],
  ['dsh1-1280', '/management/reports/dashboards/DSH-1', 1280],
]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 1100 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  await page.goto(BASE + url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })

  const facts = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-slot="card"]')]
    return {
      tiles: cards.length,
      plots: document.querySelectorAll('.recharts-surface').length,
      /* A tile must NOT carry the builder's §A12 strip or its table. */
      relatedStrips: [...document.querySelectorAll('a')].filter((a) =>
        a.className.includes('rounded-lg border border-border bg-card px-2.5'),
      ).length,
      /* Nothing may scroll the page sideways. */
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      /* Every plot must be at least R4-1's 268px floor. */
      plotWidths: [...document.querySelectorAll('.recharts-surface')].map((n) =>
        Math.round(n.getBoundingClientRect().width),
      ),
      numerals: [...document.querySelectorAll('[data-slot="metric-value"]')].length,
    }
  })
  console.log(name, JSON.stringify(facts))
  if (errors.length) console.log(name, 'ERRORS', errors)
  await ctx.close()
}
await browser.close()
