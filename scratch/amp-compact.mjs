/** The builder below 768px — `compact` is one of only two breakpoints, and the
    compound chart is new here. Nothing may scroll the page sideways. */
import { chromium } from 'playwright'
const browser = await chromium.launch()
for (const w of [720, 1024]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 1000 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
  await page.goto('http://localhost:4327/management/reports/RPT-1', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2600)
  await page.screenshot({ path: `scratch/shots-amp/compact-${w}.png`, fullPage: true })
  console.log(w, JSON.stringify(await page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    plotW: Math.round(document.querySelector('.recharts-surface')?.getBoundingClientRect().width ?? 0),
    headlineRows: document.querySelectorAll('[data-slot="metric-value"]').length,
  }))), errors.length ? errors : '')
  await ctx.close()
}
await browser.close()
