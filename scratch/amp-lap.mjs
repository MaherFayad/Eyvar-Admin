/** Nine series, six hues — the seventh onwards must be dotted, not a twin. */
import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } })
const page = await ctx.newPage()
await page.goto('http://localhost:4327/management/reports/RPT-2', { waitUntil: 'networkidle' })
await page.waitForTimeout(2800)
const marks = await page.evaluate(() =>
  [...document.querySelectorAll('.recharts-curve')].map((n) => {
    const cs = getComputedStyle(n)
    return `${cs.stroke} / ${cs.strokeDasharray}`
  }),
)
console.log('series marks (hue / dash):')
marks.forEach((m, i) => console.log(' ', i, m))
console.log('unique:', new Set(marks).size, 'of', marks.length)
await page.screenshot({ path: 'scratch/shots-amp/split-lap.png', fullPage: true })
await browser.close()
