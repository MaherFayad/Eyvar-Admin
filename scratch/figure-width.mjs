import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1300 } })
for (const view of ['activity', 'earnings']) {
  await p.goto(`http://localhost:5199/entity/DRV-0201?view=${view}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)
  console.log(`\n--- ${view} ---`)
  console.log(await p.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll('div,dl')) {
      if (getComputedStyle(el).display !== 'grid') continue
      if (!/Rating|On time|this month|this period/.test(el.innerText)) continue
      for (const cell of el.children) {
        /* Natural width of the cell's content, measured by cloning it out of
           the grid so the 1fr track cannot stretch it. */
        const c = cell.cloneNode(true)
        c.style.cssText = 'position:absolute;visibility:hidden;width:max-content'
        document.body.append(c)
        out.push({ txt: cell.innerText.replace(/\n/g, ' ').slice(0, 28),
                   inGrid: Math.round(cell.getBoundingClientRect().width),
                   natural: Math.round(c.getBoundingClientRect().width) })
        c.remove()
      }
    }
    return out
  }))
}
await b.close()
