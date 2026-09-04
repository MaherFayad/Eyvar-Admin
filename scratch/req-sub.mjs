/** A subscription request — the hold, the plan block, and the two-hour clock. */
import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page.goto('http://localhost:4325/operations/subscription-requests?entity=SREQ-006', {
  waitUntil: 'networkidle',
})
await page.waitForTimeout(2200)
console.log(await page.evaluate(() => {
  const p = document.querySelector('[role="dialog"]')
  return {
    title: p?.querySelector('h2')?.textContent,
    blocks: [...(p?.querySelectorAll('[data-numeric]') ?? [])].map((e) =>
      e.textContent?.replace(/\s+/g, ' ').trim(),
    ),
  }
}))
console.log('errors', errors.length, errors.slice(0, 3))
await page.screenshot({ path: './scratch/shots-req/sub.png' })
await browser.close()
