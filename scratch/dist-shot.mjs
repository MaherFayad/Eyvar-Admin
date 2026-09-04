/**
 * The two tiles that must read as one object — DSH-1's line tile and its pie
 * tile — cropped side by side, plus the pie on the builder.
 *
 *     TAG=before node scratch/dist-shot.mjs
 *     TAG=after LANG_=ar node scratch/dist-shot.mjs
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:4399'
const TAG = process.env.TAG ?? 'shot'
const LANG = process.env.LANG_ ?? 'en'
const WIDTHS = (process.env.WIDTHS ?? '1280,1440,1920').split(',').map(Number)
const OUT = './scratch/shots-dist'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 1400 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/management/reports/dashboards/DSH-1`, { waitUntil: 'networkidle' })
  if (LANG === 'ar') {
    await page.evaluate(() => localStorage.setItem('eyvar.language', '"ar"'))
    await page.reload({ waitUntil: 'networkidle' })
  }
  await page.waitForTimeout(2500)
  /* The grid holding the two half tiles, so both are in one frame at one scale. */
  const grid = page.locator('ul').filter({ has: page.locator('.recharts-pie') }).last()
  await grid.screenshot({ path: `${OUT}/${TAG}.dsh1.${LANG}.${width}.png` })
  await ctx.close()
}

/* The builder, where the same pie is the page's own answer. */
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1400 } })
const page = await ctx.newPage()
await page.goto(`${BASE}/management/reports/RPT-4`, { waitUntil: 'networkidle' })
if (LANG === 'ar') {
  await page.evaluate(() => localStorage.setItem('eyvar.language', '"ar"'))
  await page.reload({ waitUntil: 'networkidle' })
}
await page.waitForTimeout(3000)
await page.screenshot({ path: `${OUT}/${TAG}.builder.${LANG}.1440.png` })
await ctx.close()
await browser.close()
console.log('wrote', OUT, TAG, LANG)
