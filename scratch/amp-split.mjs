/** The split-by report — the case the small-multiples grid could not draw. */
import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
await page.goto('http://localhost:4327/management/reports/RPT-2', { waitUntil: 'networkidle' })
await page.waitForTimeout(2800)
await page.screenshot({ path: 'scratch/shots-amp/split-rpt2.png', fullPage: true })
console.log(JSON.stringify(await page.evaluate(() => ({
  plots: document.querySelectorAll('.recharts-surface').length,
  strokes: [...new Set([...document.querySelectorAll('.recharts-curve')].map((n) => getComputedStyle(n).stroke))],
  headlines: [...document.querySelectorAll('[data-slot="metric-value"]')].map((n) => n.textContent),
  legend: [...document.querySelectorAll('ul[role="list"] bdi')].map((n) => n.textContent).slice(0, 12),
})), null, 1), errors.length ? errors : '')
await browser.close()
