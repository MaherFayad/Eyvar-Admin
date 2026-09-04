import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1600 } })
await p.goto('http://localhost:5199/entity/DRV-0201?view=activity', { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)
const y = await p.evaluate(() => Math.round(
  [...document.querySelectorAll('*')].find(e => /^Rating$/.test(e.textContent.trim()))?.getBoundingClientRect().top ?? 400))
await p.screenshot({ path: 'scratch/activity-fixed.png', clip: { x: 110, y: y - 20, width: 1330, height: 560 } })
console.log('ok')
await b.close()
