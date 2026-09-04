import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await ctx.newPage()
for (const [name, url] of [
  ['rider  ', 'http://localhost:4325/operations/people?entity=RDR-4002'],
  ['request', 'http://localhost:4325/operations/ride-requests?entity=REQ-503'],
]) {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)
  const w = await page.evaluate(() => {
    const p = document.querySelector('[role="dialog"]')
    return p ? Math.round(p.getBoundingClientRect().width) : null
  })
  console.log(name, 'panel width at a 390 viewport:', w)
}
await browser.close()
