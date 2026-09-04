import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const OUT = './scratch/shots-rider'
mkdirSync(OUT, { recursive: true })
const BASE = 'http://localhost:5310'
const browser = await chromium.launch()
for (const [lang, label] of [['en','en'], ['ar','ar']]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await page.goto(BASE + '/operations/people', { waitUntil: 'networkidle' })
  if (lang === 'ar') {
    await page.locator('header button').last().click()
    await page.getByRole('menuitemradio', { name: 'Arabic' }).click()
    await page.waitForTimeout(1200)
  }
  await page.goto(BASE + '/operations/people?entity=RDR-4002', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1600)
  await page.screenshot({ path: `${OUT}/sheet.${label}.png` })
  await page.goto(BASE + '/entity/RDR-4002', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `${OUT}/page.${label}.png`, fullPage: true })
  await ctx.close()
}
await browser.close()
console.log('ok')
