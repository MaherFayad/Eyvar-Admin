/** The subscription sheet, and the ride sheet's new action row. */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const OUT = './scratch/shots-sub'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()

for (const [tag, url] of [
  ['sub', 'http://localhost:4325/operations/subscriptions?entity=SUB-1041'],
  ['trip', 'http://localhost:4325/operations/quick-rides?entity=TRP-7741'],
]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  console.log(tag, JSON.stringify(await page.evaluate(() => {
    const p = document.querySelector('[role="dialog"]')
    const footer = p?.lastElementChild
    return {
      title: p?.querySelector('h2')?.textContent,
      figures: [...(p?.querySelectorAll('[data-numeric]') ?? [])].slice(0, 5)
        .map((e) => e.textContent?.replace(/\s+/g, ' ').trim()),
      actions: [...(footer?.querySelectorAll('button') ?? [])].map((b) => ({
        label: b.textContent?.trim(),
        disabled: b.disabled,
        reason: b.getAttribute('title'),
      })),
    }
  }), null, 1))
  if (errors.length) console.log(tag, 'ERRORS', errors.slice(0, 3))
  await page.screenshot({ path: `${OUT}/${tag}.png` })
  await ctx.close()
}
await browser.close()
