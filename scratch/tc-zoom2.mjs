import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 3 })
await p.goto('http://localhost:5199/operations/people', { waitUntil: 'networkidle' })
await p.waitForTimeout(2200)
await p.getByRole('button', { name: 'Column options for Status' }).click()
await p.waitForTimeout(400)
await p.getByRole('menuitem', { name: 'Pin column' }).click()
await p.waitForTimeout(600)
await p.keyboard.press('Escape')
await p.locator('[data-slot=table-container]').first().evaluate((el) => el.scrollBy({ left: 320 }))
await p.waitForTimeout(500)
const probe = await p.evaluate(() => {
  const at = (x, y) => { const e = document.elementFromPoint(x, y); return e ? `${e.tagName}.${e.className}`.slice(0, 60) + ' :: ' + (e.textContent||'').slice(0,12) : 'none' }
  return { p535: at(535, 300), p537: at(537, 300), p539: at(539, 300) }
})
console.log(JSON.stringify(probe, null, 1))
await p.screenshot({ path: './scratch/shots/tc-ltr-seam-zoom.png', clip: { x: 460, y: 250, width: 260, height: 160 } })
await b.close()
