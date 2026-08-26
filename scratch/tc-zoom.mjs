import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 3 })
await p.goto('http://localhost:5199/operations/people', { waitUntil: 'networkidle' })
await p.waitForTimeout(2200)
await p.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.lang = 'ar' })
await p.getByRole('button', { name: 'Column options for Status' }).click()
await p.waitForTimeout(400)
await p.getByRole('menuitem', { name: 'Pin column' }).click()
await p.waitForTimeout(600)
await p.keyboard.press('Escape')
await p.locator('[data-slot=table-container]').first().evaluate((el) => el.scrollBy({ left: -320 }))
await p.waitForTimeout(500)
const box = await p.evaluate(() => {
  const cells = [...document.querySelectorAll('tbody tr:nth-child(2) td')]
  const r = cells.map((c) => { const b = c.getBoundingClientRect(); return { x: b.x, w: b.width, pos: getComputedStyle(c).position, text: c.textContent.slice(0,14) } })
  return r
})
console.log(JSON.stringify(box.slice(0,5)))
await p.screenshot({ path: './scratch/shots/tc-rtl-seam-zoom.png', clip: { x: 630, y: 200, width: 260, height: 160 } })
await b.close()
