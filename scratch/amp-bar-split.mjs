/** Nine grouped series as BARS — the path with the most marks on one axis. */
import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
await page.goto('http://localhost:4327/management/reports/RPT-2', { waitUntil: 'networkidle' })
await page.waitForTimeout(2600)
await page.getByRole('combobox', { name: 'Chart type' }).click()
await page.getByRole('option', { name: /^Bar chart/ }).click()
await page.waitForTimeout(2000)
await page.screenshot({ path: 'scratch/shots-amp/split-bar.png', fullPage: true })
console.log(JSON.stringify(await page.evaluate(() => ({
  plots: document.querySelectorAll('.recharts-surface').length,
  bars: document.querySelectorAll('.recharts-rectangle').length,
  fills: [...new Set([...document.querySelectorAll('.recharts-rectangle')].map((n) => getComputedStyle(n).fill))].length,
  overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
}))), errors.length ? errors : '')
await browser.close()
