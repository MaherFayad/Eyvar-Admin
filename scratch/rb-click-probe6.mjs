import { chromium } from 'playwright'
const BASE = 'http://localhost:4325'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
await page.goto(`${BASE}/management/reports/RPT-1`, { waitUntil: 'networkidle' })
await page.waitForTimeout(3500)
const target = await page.evaluate(() => {
  window.__log = []
  document.addEventListener('mousedown', (e) => window.__log.push('down:' + (e.target.getAttribute?.('class') ?? e.target.tagName)), true)
  document.addEventListener('mouseup', (e) => window.__log.push('up:' + (e.target.getAttribute?.('class') ?? e.target.tagName)), true)
  document.addEventListener('click', (e) => window.__log.push('click:' + (e.target.getAttribute?.('class') ?? e.target.tagName)), true)
  const card = [...document.querySelectorAll('[data-slot="card"]')]
    .find((c) => c.querySelector('a[data-slot="panel-action"]') && c.querySelector('.recharts-area-area'))
  const r = card.querySelector('.recharts-area-area').getBoundingClientRect()
  return { x: Math.round(r.x + r.width * 0.45), y: Math.round(r.y + r.height - 6) }
})
await page.mouse.move(target.x, target.y)
await page.waitForTimeout(400)
await page.mouse.down()
await page.waitForTimeout(120)
await page.mouse.up()
await page.waitForTimeout(1200)
console.log(await page.evaluate(() => window.__log))
console.log('url:', page.url())
await browser.close()
