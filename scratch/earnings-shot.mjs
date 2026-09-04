import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 1300 } })
await p.goto('http://localhost:5199/entity/DRV-0201?view=earnings', { waitUntil: 'networkidle' })
await p.waitForTimeout(2500)
console.log(await p.evaluate(() => {
  const out = []
  for (const el of document.querySelectorAll('div,dl')) {
    const s = getComputedStyle(el)
    if (s.display !== 'grid') continue
    const t = el.innerText.replace(/\n+/g, ' | ')
    if (/Trips this period|Earnings this month|this period/i.test(t))
      out.push({ cols: s.gridTemplateColumns, txt: t.slice(0, 110) })
  }
  return out
}))
await p.screenshot({ path: 'scratch/earnings-1440.png', clip: { x: 100, y: 350, width: 1340, height: 420 } })
await b.close()
