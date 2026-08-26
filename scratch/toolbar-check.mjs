import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
const errs = []
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
await p.goto('http://localhost:5199/operations/people', { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)
const m = async (sel, label) => {
  const r = await p.locator(sel).first().boundingBox().catch(() => null)
  console.log(label.padEnd(22), r ? `x${Math.round(r.x)} y${Math.round(r.y)} w${Math.round(r.width)} h${Math.round(r.height)}` : 'MISSING')
  return r
}
const tabsRow = await m('[data-slot="tabs-list"]', 'tabs list')
const search = await m('main input[aria-label^="Search"]', 'search input')
const filter = await m('button:has-text("Filter")', 'Filter button')
const head = await m('table thead tr', 'table header row')
console.log('gap controls->header:', head && filter ? Math.round(head.y - (filter.y + filter.height)) : '?')
await p.screenshot({ path: './scratch/shots/toolbar-v2.png', clip: { x: 300, y: 40, width: 1140, height: 340 } })
// select two rows -> bulk bar
const boxes = p.locator('table tbody input[type="checkbox"], table tbody [role="checkbox"]')
console.log('row checkboxes:', await boxes.count())
if (await boxes.count() >= 2) {
  await boxes.nth(0).click(); await boxes.nth(1).click(); await p.waitForTimeout(500)
  const bar = await m('[role="group"][aria-label*="selected"]', 'bulk bar')
  if (bar) {
    const st = await p.locator('[role="group"][aria-label*="selected"]').evaluate((n) => {
      const cs = getComputedStyle(n)
      return { bg: cs.backgroundColor, color: cs.color, shadow: cs.boxShadow.slice(0, 60), pos: getComputedStyle(n.parentElement).position, bottomFromViewport: Math.round(innerHeight - n.getBoundingClientRect().bottom) }
    })
    console.log('bulk bar style:', JSON.stringify(st))
  }
  await p.screenshot({ path: './scratch/shots/bulkbar-v2.png' })
}
console.log('console errors:', errs.slice(0, 5))
await b.close()
