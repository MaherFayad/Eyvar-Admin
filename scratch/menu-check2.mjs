import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
await p.goto('http://localhost:5199/operations/people', { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
for (const tab of ['Applications', 'Compliance', 'Riders']) {
  await p.locator('[role="tab"]').filter({ hasText: tab }).first().click()
  await p.waitForTimeout(900)
  const kebabs = p.locator('table tbody button[aria-haspopup="menu"]')
  if (!(await kebabs.count())) { console.log(tab, '- no kebab'); continue }
  await kebabs.first().click(); await p.waitForTimeout(400)
  const box = await p.locator('[data-slot="dropdown-menu-content"]').boundingBox()
  const items = await p.locator('[data-slot="dropdown-menu-item"]').evaluateAll((ns) =>
    ns.map((n) => { const cs = getComputedStyle(n); const lh = parseFloat(cs.lineHeight)
      const inner = n.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      return `${Math.round(inner / lh)}L "${n.textContent}"` }))
  console.log(tab, '| menu w=' + Math.round(box.width), '|', items.join(' · '))
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
}
// account menu (top bar)
const am = p.locator('header button[aria-haspopup="menu"], [data-slot="dropdown-menu-trigger"]').last()
await am.click(); await p.waitForTimeout(400)
const box = await p.locator('[data-slot="dropdown-menu-content"]').boundingBox()
const items = await p.locator('[data-slot="dropdown-menu-item"]').evaluateAll((ns) =>
  ns.map((n) => { const cs = getComputedStyle(n); const lh = parseFloat(cs.lineHeight)
    const inner = n.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    return `${Math.round(inner / lh)}L "${n.textContent}"` }))
console.log('AccountMenu | menu w=' + Math.round(box?.width ?? 0), '|', items.join(' · '))
await b.close()
