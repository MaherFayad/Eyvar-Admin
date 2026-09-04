import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4325'
const OUT = 'scratch/shots-amp'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
for (const [lang, dir] of [
  ['en', 'ltr'],
  ['ar', 'rtl'],
]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } })
  const page = await ctx.newPage()
  await page.goto(BASE + '/management/performance', { waitUntil: 'networkidle' })
  if (lang === 'ar') {
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        /عرب|Arabic|العربية/i.test(b.textContent || ''),
      )
      btn?.click()
    })
    await page.evaluate(() => {
      document.documentElement.setAttribute('dir', 'rtl')
      document.documentElement.setAttribute('lang', 'ar')
    })
    await page.waitForTimeout(500)
  }
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/performance-${dir}.png`, fullPage: true })
  await page.goto(BASE + '/management/risk', { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/risk-${dir}.png`, fullPage: true })
  await ctx.close()
}
await browser.close()
console.log('shots in', OUT)
