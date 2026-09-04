import { chromium } from 'playwright'
const BASE = process.env.BASE ?? 'http://localhost:4325'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
await page.goto(`${BASE}/management/reports/RPT-1`, { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
await page.evaluate(() => document.body.focus())
for (let i = 0; i < 160; i += 1) {
  await page.keyboard.press('Tab')
  if (await page.evaluate(() => document.activeElement?.classList.contains('recharts-surface'))) break
}
const style = await page.evaluate(() => {
  const el = document.activeElement
  if (!el) return null
  const cs = getComputedStyle(el)
  return { outline: cs.outline, outlineOffset: cs.outlineOffset, cls: el.getAttribute('class') }
})
console.log('focused element computed style:', JSON.stringify(style))
const box = await page.evaluate(() => {
  const el = document.activeElement.closest('[data-slot="card"]') ?? document.activeElement
  const r = el.getBoundingClientRect()
  return { x: r.x - 8, y: r.y - 8, width: r.width + 16, height: r.height + 16 }
})
await page.screenshot({ path: './scratch/shots-partial/run.focusring.png', clip: box })
await browser.close()
