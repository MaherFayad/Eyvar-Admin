import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1400 } })
await p.goto('http://localhost:5199/entity/DRV-0101?view=documents', { waitUntil: 'networkidle' })
await p.waitForTimeout(2200)
const rows = p.locator('[role="tabpanel"] button[aria-expanded]')
await rows.nth(4).click()          // Licence — a JPG
await p.waitForTimeout(1800)
const img = p.locator('img[src^="blob:"]').first()
await img.scrollIntoViewIfNeeded()
const box = await img.boundingBox()
console.log('preview box:', box)
await p.screenshot({ path: 'scratch/scan-licence.png',
  clip: { x: 110, y: Math.max(0, box.y - 90), width: 1330, height: 300 } })
await b.close()
