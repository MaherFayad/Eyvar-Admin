import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4327'
mkdirSync('scripts/harness/shots', { recursive: true })

const browser = await chromium.launch()
const shots = [
  ['builder-rpt1', '/management/reports/RPT-1', 1440],
  ['builder-rpt7', '/management/reports/RPT-7', 1440],
  ['builder-1280', '/management/reports/RPT-1', 1280],
]

for (const [name, url, w] of shots) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 1000 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e).slice(0, 300)))
  await page.goto(BASE + url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `scripts/harness/shots/${name}.png`, fullPage: true })

  /* What actually drew: one plot per axis group, and every line's stroke. */
  const facts = await page.evaluate(() => {
    const surfaces = [...document.querySelectorAll('.recharts-surface')]
    const strokes = [...document.querySelectorAll('.recharts-curve')]
      .map((n) => getComputedStyle(n).stroke)
      .filter((v) => v && v !== 'none')
    const numerals = [...document.querySelectorAll('[data-slot="metric-value"]')].map(
      (n) => n.textContent,
    )
    return {
      plots: surfaces.length,
      strokes: [...new Set(strokes)],
      numerals: numerals.slice(0, 8),
      toolbarCombos: [...document.querySelectorAll('[data-slot="select-trigger"]')].map(
        (n) => n.textContent?.trim().slice(0, 24),
      ),
    }
  })
  console.log(name, JSON.stringify(facts, null, 1))
  if (errors.length) console.log(name, 'CONSOLE:', errors.slice(0, 5))
  await ctx.close()
}
await browser.close()
