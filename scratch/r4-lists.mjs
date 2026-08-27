/** Close-ups of the ranked lists themselves, EN and AR, 1280 and 1440. */
import { chromium } from 'playwright'

const BASE = 'http://localhost:5411'
const OUT = './scratch/shots'
const browser = await chromium.launch()

async function toArabic(page) {
  await page.getByRole('button', { name: /account|profile|menu/i }).first().click({ timeout: 4000 })
  await page.getByRole('menuitemradio', { name: /عرب|Arabic|AR/i }).first().click({ timeout: 4000 })
  await page.waitForTimeout(600)
  /* The toast covers the bottom of the page; dismiss it so it does not sit on
     top of the thing being inspected. */
  const close = page.getByRole('button', { name: /close|dismiss|إغلاق/i }).last()
  if (await close.isVisible().catch(() => false)) await close.click().catch(() => {})
  await page.waitForTimeout(400)
}

for (const width of [1280, 1440]) {
  for (const lang of ['en', 'ar']) {
    for (const [name, path] of [
      ['admin', '/admin/overview'],
      ['ops', '/operations/overview'],
      ['zones', '/management/zones'],
      ['perf', '/management/performance'],
    ]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } })
      const page = await ctx.newPage()
      await page.goto(BASE + path, { waitUntil: 'networkidle' })
      await page.waitForTimeout(600)
      if (lang === 'ar') await toArabic(page)
      const card = page.locator('main [data-slot="card"]').filter({ has: page.locator('ul[aria-labelledby], p') }).last()
      const lists = page.locator('main ul[aria-labelledby]')
      const target = (await lists.count()) > 0 ? lists.first().locator('xpath=ancestor::*[@data-slot="card"][1]') : card
      await target.scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await target.screenshot({ path: `${OUT}/r4-list-${name}-${lang}-${width}.png` })
      await ctx.close()
    }
  }
}
await browser.close()
console.log('done')
