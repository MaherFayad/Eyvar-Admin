import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
await p.goto('http://localhost:5199/operations/people', { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
// open the first row kebab
const tabs = p.locator('[role="tab"]')
  console.log('tabs:', await tabs.allInnerTexts())
  for (const label of ['Captains','captains']) { const t = tabs.filter({ hasText: label }); if (await t.count()) { await t.first().click(); await p.waitForTimeout(900); break } }
  const kebabs = p.locator('table tbody button[aria-haspopup="menu"]')
const n = await kebabs.count()
console.log('kebabs found:', n)
if (n) {
  await kebabs.first().click()
  await p.waitForTimeout(500)
  const menu = p.locator('[data-slot="dropdown-menu-content"]')
  const box = await menu.boundingBox()
  console.log('menu box:', JSON.stringify(box))
  const items = p.locator('[data-slot="dropdown-menu-item"]')
  const c = await items.count()
  for (let i = 0; i < c; i++) {
    const el = items.nth(i)
    const r = await el.evaluate((n) => {
      const cs = getComputedStyle(n)
      const lh = parseFloat(cs.lineHeight)
      const inner = n.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      return { text: n.textContent, h: +n.getBoundingClientRect().height.toFixed(1), lineHeight: lh, lines: Math.round(inner / lh), ws: cs.whiteSpace, w: +n.getBoundingClientRect().width.toFixed(1) }
    })
    console.log(JSON.stringify(r))
  }
  await p.screenshot({ path: './scratch/shots/menu-onelinefix.png' })
}
await b.close()
