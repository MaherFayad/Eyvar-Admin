import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
await p.goto('http://localhost:5199/operations/people', { waitUntil: 'networkidle' })
await p.waitForTimeout(2200)
await p.getByRole('button', { name: 'Column options for Status' }).click()
await p.waitForTimeout(400)
await p.getByRole('menuitem', { name: 'Pin column' }).click()
await p.waitForTimeout(600)
await p.keyboard.press('Escape')
await p.locator('[data-slot=table-container]').first().evaluate((el) => el.scrollBy({ left: 320 }))
await p.waitForTimeout(500)
const r = await p.evaluate(() => {
  const row = document.querySelector('tbody tr')
  return [...row.querySelectorAll('td')].slice(0, 5).map((c) => {
    const b = c.getBoundingClientRect()
    return { x: Math.round(b.x * 100) / 100, w: Math.round(b.width * 100) / 100, pos: getComputedStyle(c).position }
  })
})
console.log(JSON.stringify(r))
await b.close()
