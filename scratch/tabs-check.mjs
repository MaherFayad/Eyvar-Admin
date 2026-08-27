import { chromium } from 'playwright'
const b = await chromium.launch()
for (const route of ['/operations/assurance','/support/fairness','/operations/people']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  await p.goto('http://localhost:5199'+route, { waitUntil: 'networkidle' })
  await p.waitForTimeout(600)
  const r = await p.evaluate(() => {
    const l = document.querySelector('[data-slot="tabs-list"]')
    if (!l) return null
    const active = l.querySelector('[data-state="active"],[data-active]')
    const lb = l.getBoundingClientRect(), ab = active?.getBoundingClientRect()
    return { scrollW: l.scrollWidth, clientW: l.clientWidth,
      scrollable: l.scrollWidth > l.clientWidth,
      activeVisible: ab ? (ab.left >= lb.left-1 && ab.right <= lb.right+1) : null,
      tabs: l.querySelectorAll('[role="tab"]').length }
  })
  console.log(route.padEnd(24), JSON.stringify(r))
  await p.close()
}
await b.close()
