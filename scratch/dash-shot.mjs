import { chromium } from 'playwright'
const BASE = 'http://localhost:4327'
const browser = await chromium.launch()
for (const [name, url, w] of [
  ['dsh1-1440', '/management/reports/dashboards/DSH-1', 1440],
  ['dsh3-1440', '/management/reports/dashboards/DSH-3', 1440],
  ['list-1440', '/management/reports?view=dashboards', 1440],
]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 1100 } })
  const page = await ctx.newPage()
  await page.goto(BASE + url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `scratch/shots-dash/${name}.png`, fullPage: true })
  console.log(name, 'ok')
  await ctx.close()
}
await browser.close()
