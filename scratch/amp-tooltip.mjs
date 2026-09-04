/** The shared tooltip — the reason a compound chart is worth building is that
    one hover ranks every series at that bucket. jsdom cannot see this. */
import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
await page.goto('http://localhost:4327/management/reports/RPT-2', { waitUntil: 'networkidle' })
await page.waitForTimeout(2800)

const plot = await page.locator('.recharts-surface').first().boundingBox()
await page.mouse.move(plot.x + plot.width * 0.55, plot.y + plot.height * 0.5)
await page.waitForTimeout(600)

const tip = await page.evaluate(() => {
  const el = document.querySelector('[data-slot="series-tooltip"]')
  if (!el) return null
  return {
    rows: [...el.querySelectorAll('div > div')].map((n) =>
      n.textContent?.replace(/\s+/g, ' ').trim(),
    ),
    heading: el.querySelector('p')?.textContent,
  }
})
console.log(JSON.stringify(tip, null, 1))
await page.screenshot({ path: 'scratch/shots-amp/tooltip.png' })
console.log('errors', errors.length ? errors : 0)
await browser.close()
