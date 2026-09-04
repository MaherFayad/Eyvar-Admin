import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1300 } })
for (const [view, y, h] of [['activity', 370, 260], ['earnings', 370, 260]]) {
  await p.goto(`http://localhost:5199/entity/DRV-0201?view=${view}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)
  await p.screenshot({ path: `scratch/fig-${view}.png`, clip: { x: 110, y, width: 1330, height: h } })
}
await b.close()
