/** AC-844 in the browser: a window entirely outside every store's coverage. */
import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
await page.goto('http://localhost:4327/management/reports/RPT-1', { waitUntil: 'networkidle' })
await page.waitForTimeout(2600)

/* Drive the range popover to an absolute window in 2020. */
await page.getByRole('button', { name: /Last 30 days|Date range/ }).first().click()
await page.waitForTimeout(400)
const from = page.getByLabel(/^From$/)
const to = page.getByLabel(/^To$/)
await from.fill('2020-01-01')
await to.fill('2020-01-31')
await page.getByRole('button', { name: /^Apply$/ }).click()
/* The run is debounced 350ms and the resolver walks a year of gaps. */
await page.waitForTimeout(7000)

const facts = await page.evaluate(() => {
  const canvas = document.querySelector('section[aria-label="Result"]')
  const text = canvas?.textContent?.replace(/\s+/g, ' ') ?? ''
  return {
    plots: document.querySelectorAll('.recharts-surface').length,
    noData: text.includes('There was no data found for this date range'),
    emDashOnly: /—/.test(text) && !text.includes('There was no data'),
    excerpt: text.slice(0, 220),
  }
})
console.log(JSON.stringify(facts, null, 1))
await page.screenshot({ path: 'scratch/shots-amp/nodata.png', fullPage: true })
console.log('errors', errors.length ? errors : 0)
await browser.close()
