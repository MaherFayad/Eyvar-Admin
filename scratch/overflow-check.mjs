import { chromium } from 'playwright'
const b = await chromium.launch()
for (const w of [1440, 1344, 1280]) {
  const p = await b.newPage({ viewport: { width: w, height: 1600 } })
  await p.goto('http://localhost:5199/entity/DRV-0201?view=activity', { waitUntil: 'networkidle' })
  await p.waitForTimeout(2200)
  console.log(`\n--- ${w} ---`, await p.evaluate(() => {
    const h = [...document.querySelectorAll('h2,h3')].find(e => /^Trips$/.test(e.textContent.trim()))
    const bar = h.closest('div')
    const card = document.querySelector('table')?.closest('div[class*=rounded]')
    const cluster = bar.querySelector('.ms-auto')
    const last = cluster?.lastElementChild
    const inp = document.querySelector('input[placeholder="Search trips"]')
    const cr = card.getBoundingClientRect(), lr = last?.getBoundingClientRect()
    return {
      barOverflow: bar.scrollWidth - bar.clientWidth,
      lastControl: last?.textContent.trim().slice(0, 12),
      lastRightVsCard: lr ? Math.round(cr.right - lr.right) : null,
      searchW: inp ? Math.round(inp.getBoundingClientRect().width) : null,
      headingClipped: h.scrollWidth > h.clientWidth,
      sameLine: Math.abs(h.getBoundingClientRect().top - (inp?.getBoundingClientRect().top ?? 0)) < 20,
    }
  }))
  await p.close()
}
await b.close()
