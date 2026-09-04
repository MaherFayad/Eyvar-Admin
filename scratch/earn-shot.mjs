import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1600 } })
await p.goto('http://localhost:5199/entity/DRV-0201?view=earnings', { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)
const h = await p.evaluate(() => {
  const d = [...document.querySelectorAll('h2,h3')].find(x => /Deductions/.test(x.textContent))
  return d ? Math.round(d.getBoundingClientRect().top) : 0
})
await p.screenshot({ path: 'scratch/earnings-final.png', clip: { x: 110, y: Math.max(0, h - 30), width: 1330, height: 380 } })
console.log('ok')
await b.close()
