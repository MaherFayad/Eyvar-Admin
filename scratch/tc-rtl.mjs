/* Arabic capture. There is no `setLanguage` call site in production (see the
   handoff — the shell exposes no language control), so `dir`/`lang` are applied
   to the document directly. That exercises every logical property, which is
   what §8.2 promises about pinning; it does not exercise the dictionary. */
import { chromium } from 'playwright'

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })
await p.goto('http://localhost:5199/operations/people', { waitUntil: 'networkidle' })
await p.waitForTimeout(2200)
await p.evaluate(() => {
  document.documentElement.dir = 'rtl'
  document.documentElement.lang = 'ar'
})
await p.waitForTimeout(600)
await p.screenshot({ path: './scratch/shots/tc-rtl-1280.png' })

await p.getByRole('button', { name: 'Column options for Status' }).click()
await p.waitForTimeout(400)
await p.getByRole('menuitem', { name: 'Pin column' }).click()
await p.waitForTimeout(600)
await p.keyboard.press('Escape')
await p.waitForTimeout(300)

const before = await p.locator('[data-slot=table-container]').first().evaluate((el) => ({
  scrollLeft: el.scrollLeft,
  scrollWidth: el.scrollWidth,
  clientWidth: el.clientWidth,
}))
await p.locator('[data-slot=table-container]').first().evaluate((el) => el.scrollBy({ left: -320 }))
await p.waitForTimeout(500)
const after = await p.locator('[data-slot=table-container]').first().evaluate((el) => {
  const cells = [...el.querySelectorAll('tbody tr:first-child td')].map((c) => {
    const s = getComputedStyle(c)
    return { pos: s.position, left: s.left, right: s.right, be: s.borderInlineEndWidth }
  })
  return { scrollLeft: el.scrollLeft, cells: cells.slice(0, 4) }
})
await p.screenshot({ path: './scratch/shots/tc-rtl-scrolled-1280.png' })
console.log('before', JSON.stringify(before))
console.log('after ', JSON.stringify(after))
await b.close()
